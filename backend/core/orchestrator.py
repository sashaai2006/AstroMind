from __future__ import annotations

import asyncio
import json
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4

from backend.agents.ceo import CEOAgent
from backend.agents.developer import DeveloperAgent
from backend.memory.db import get_session
from backend.memory import utils as db_utils
from backend.settings import get_settings
from backend.utils.logging import get_logger

from .ws_manager import ws_manager

LOGGER = get_logger(__name__)


class Orchestrator:
    """Simple async DAG runner supporting parallel groups."""

    def __init__(self) -> None:
        settings = get_settings()
        self._semaphore = asyncio.Semaphore(settings.llm_semaphore)
        self._ceo = CEOAgent()
        self._developer = DeveloperAgent(self._semaphore)
        self._stop_events: Dict[str, asyncio.Event] = {}
        self._project_tasks: Dict[str, asyncio.Task] = {}

    async def async_start(
        self, project_id: UUID, title: str, description: str, target: str
    ) -> None:
        project_str = str(project_id)
        if project_str in self._project_tasks:
            LOGGER.info("Project %s already running", project_id)
            return

        stop_event = asyncio.Event()
        self._stop_events[project_str] = stop_event
        task = asyncio.create_task(
            self._run_project(project_id, title, description, target, stop_event)
        )
        self._project_tasks[project_str] = task
        task.add_done_callback(lambda _: self._cleanup(project_str))

    def _cleanup(self, project_id: str) -> None:
        self._project_tasks.pop(project_id, None)
        self._stop_events.pop(project_id, None)

    async def request_stop(self, project_id: str) -> None:
        event = self._stop_events.get(project_id)
        if event:
            event.set()

    async def _run_project(
        self,
        project_id: UUID,
        title: str,
        description: str,
        target: str,
        stop_event: asyncio.Event,
    ) -> None:
        context = {
            "project_id": str(project_id),
            "title": title,
            "description": description,
            "target": target,
        }
        await self._emit_event(
            project_id, "Orchestration started", agent="system", level="info"
        )
        async with get_session() as session:
            await db_utils.update_project_status(session, project_id, "running")

        try:
            plan = await self._ceo.plan(description=description, target=target)
            if not plan:
                await self._emit_event(
                    project_id, "No steps returned by CEO", agent="ceo", level="error"
                )
                await self._mark_failed(project_id, "Plan generation failed")
                return

            for group_id, steps in self._group_steps(plan):
                if stop_event.is_set():
                    await self._emit_event(
                        project_id,
                        "Received stop command. Halting pipeline.",
                        agent="system",
                        level="info",
                    )
                    await self._mark_failed(project_id, "Stopped by user")
                    return

                await self._emit_event(
                    project_id,
                    f"Starting parallel group {group_id}",
                    agent="system",
                )

                await asyncio.gather(
                    *[
                        self._run_step(step, context, stop_event)
                        for step in steps
                    ],
                    return_exceptions=False,
                )

            await self._mark_done(project_id)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("Project %s failed: %s", project_id, exc)
            await self._emit_event(
                project_id, f"Pipeline failed: {exc}", agent="system", level="error"
            )
            await self._mark_failed(project_id, "internal_error")

    async def _run_step(
        self, step: Dict[str, Any], context: Dict[str, Any], stop_event: asyncio.Event
    ) -> None:
        project_id = UUID(context["project_id"])
        task_id = UUID(step.get("id") or str(uuid4()))
        
        # Optimized: Update task status and record event in ONE transaction
        async with get_session() as session:
            await db_utils.update_task_and_record_event(
                session,
                project_id=project_id,
                task_id=task_id,
                name=step.get("name", "unknown"),
                agent=step.get("agent", "developer"),
                status="running",
                parallel_group=step.get("parallel_group"),
                payload=step.get("payload", {}),
                event_message=f"Step {step.get('name')} started",
            )
        
        # Must broadcast manually since we bypassed _emit_event
        await ws_manager.broadcast(
            str(project_id),
            {
                "type": "event",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "project_id": str(project_id),
                "agent": step.get("agent", "developer"),
                "level": "info",
                "msg": f"Step {step.get('name')} started",
            },
        )

        status = "running"  # Default status in case of cancellation
        try:
            await self._developer.run(step, context, stop_event)
            status = "done"
            
            # Optimized: Update task status and record event in ONE transaction
            async with get_session() as session:
                await db_utils.update_task_and_record_event(
                    session,
                    project_id=project_id,
                    task_id=task_id,
                    name=step.get("name", "unknown"),
                    agent=step.get("agent", "developer"),
                    status=status,
                    parallel_group=step.get("parallel_group"),
                    payload=step.get("payload", {}),
                    event_message=f"Step {step.get('name')} finished",
                )
            
            await ws_manager.broadcast(
                str(project_id),
                {
                    "type": "event",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "project_id": str(project_id),
                    "agent": step.get("agent", "developer"),
                    "level": "info",
                    "msg": f"Step {step.get('name')} finished",
                },
            )
            
        except asyncio.CancelledError:
            status = "failed"
            LOGGER.warning("Step %s was cancelled", step.get("name"))
            raise
        except Exception as exc:  # noqa: BLE001
            status = "failed"
            await self._emit_event(
                project_id,
                f"Step {step.get('name')} failed: {exc}",
                agent=step.get("agent", "developer"),
                level="error",
            )
            raise
        finally:
            # Cleanup if needed (status already updated if success)
            if status == "failed":
                try:
                    async with get_session() as session:
                        await db_utils.upsert_task(
                            session,
                            project_id=project_id,
                            task_id=task_id,
                            name=step.get("name", "unknown"),
                            agent=step.get("agent", "developer"),
                            status=status,
                            parallel_group=step.get("parallel_group"),
                            payload=step.get("payload", {}),
                        )
                except Exception:
                    pass

    async def _mark_done(self, project_id: UUID) -> None:
        async with get_session() as session:
            await db_utils.update_project_status(session, project_id, "done")
        await self._emit_event(project_id, "Project completed", agent="system")

    async def _mark_failed(self, project_id: UUID, reason: str) -> None:
        async with get_session() as session:
            await db_utils.update_project_status(session, project_id, "failed")
        await self._emit_event(
            project_id, f"Project failed: {reason}", agent="system", level="error"
        )

    async def _emit_event(
        self,
        project_id: UUID,
        message: str,
        *,
        agent: str,
        level: str = "info",
        artifact_path: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Emit event to WS and record in DB asynchronously (fire-and-forget for DB)."""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # 1. Send to WS immediately
        await ws_manager.broadcast(
            str(project_id),
            {
                "type": "event",
                "timestamp": timestamp,
                "project_id": str(project_id),
                "agent": agent,
                "level": level,
                "msg": message,
                "artifact_path": artifact_path,
                "data": data or {},
            },
        )
        
        # 2. Record in DB in background (don't await)
        asyncio.create_task(self._record_event_bg(
            project_id, message, agent, level, data
        ))

    async def _record_event_bg(self, project_id: UUID, message: str, agent: str, level: str, data: Optional[Dict[str, Any]]) -> None:
        """Background task to record event in DB."""
        try:
            async with get_session() as session:
                await db_utils.record_event(
                    session,
                    project_id,
                    message,
                    agent=agent,
                    level=level,
                    data=data or {},
                )
        except Exception as e:
            LOGGER.error("Failed to record event in bg: %s", e)

    def _group_steps(self, steps: List[Dict[str, Any]]) -> List[Tuple[str, List[Dict[str, Any]]]]:
        groups: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()
        for step in steps:
            group_key = step.get("parallel_group") or step.get("id") or str(uuid4())
            groups.setdefault(group_key, []).append(step)
        return list(groups.items())


orchestrator = Orchestrator()
