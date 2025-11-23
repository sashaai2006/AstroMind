import asyncio
import re
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from src.agents.state import AgentState
from src.llm_factory import get_main_brain
from src.storage.minio_client import storage
from src.db.graph_store import db
from src.services.socket_manager import socket_manager
from src.services.sandbox import sandbox

logger = logging.getLogger(__name__)


def _detect_language(filename: str) -> str:
    if filename.endswith(".py"):
        return "python"
    if filename.endswith(".js") or filename.endswith(".ts"):
        return "javascript"
    return ""


async def process_single_task(task, agents_map, state, llm):
    project_id = state.get('project_id')
    feedback = state.get('review_feedback')
    role = task.get('assigned_to', 'Assistant')

    try:
        msg_text = f"{role} is working on: {task['description']}..."
        if feedback:
            msg_text = f"{role} is FIXING bugs in: {task['description']}..."

        await socket_manager.broadcast(project_id, {
            "type": "task_start",
            "task_id": task['id'],
            "role": role,
            "message": msg_text
        })

        agent_prompt = agents_map.get(role, "You are a helpful AI assistant.")
        base_instructions = f"""{agent_prompt}

IMPORTANT:
- Output only the final file content (no extra prose).
- Begin with '# filename: <name>' (or // filename: <name> for JS).
- Wrap code in a fenced block if multi-line."""

        base_context = f"Project Context: {state.get('user_request')}\n\nCurrent Task: {task['description']}"
        if feedback:
            base_context += f"\n\nCRITICAL FEEDBACK FROM REVIEWER:\n{feedback}"

        max_attempts = 2
        runtime_feedback = ""
        filename = f"task_{task['id']}.txt"
        file_content = ""

        for attempt in range(max_attempts):
            user_context = base_context
            if runtime_feedback:
                user_context += f"\n\nRUNTIME ERROR LOG:\n{runtime_feedback}\nFix the code and try again."

            response = await llm.ainvoke([
                SystemMessage(content=base_instructions),
                HumanMessage(content=user_context)
            ])

            content = response.content
            name_match = re.search(r"^(?:#|//)\s*filename:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
            if name_match:
                filename = name_match.group(1).strip()

            code_match = re.search(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL)
            file_content = code_match.group(1) if code_match else content

            language = _detect_language(filename)
            if language:
                exec_result = await asyncio.to_thread(sandbox.run_code, language, file_content)
                await socket_manager.broadcast(project_id, {
                    "type": "execution_log",
                    "task_id": task['id'],
                    "exit_code": exec_result["exit_code"],
                    "output": exec_result["output"],
                    "error": exec_result["error"]
                })

                if exec_result["exit_code"] != 0:
                    runtime_feedback = exec_result["output"] or exec_result["error"] or "Runtime failure."
                    logger.info(f"Task {task['id']} failed sandbox run (attempt {attempt+1}). Retrying...")
                    continue

            break

        if project_id:
            s3_path = storage.save_file(project_id, filename, file_content)
            if s3_path:
                await db.save_artifact(project_id, task['id'], filename, s3_path)
                await socket_manager.broadcast(project_id, {
                    "type": "file_created",
                    "task_id": task['id'],
                    "file": {"name": filename, "content": file_content}
                })

        await socket_manager.broadcast(project_id, {
            "type": "task_complete",
            "task_id": task['id']
        })

        return task['id'], file_content

    except Exception as e:
        logger.error(f"Failed to execute task {task['id']}: {e}")
        await socket_manager.broadcast(project_id, {
            "type": "error",
            "message": f"Task {task['id']} failed: {str(e)}"
        })
        return task['id'], None


async def worker_node(state: AgentState):
    project_id = state.get('project_id')

    print("--- WORKER START (PARALLEL) ---")

    if not state.get('plan') or not state['plan'].get('tasks'):
        return {"status": "completed"}

    tasks = state['plan']['tasks']
    agents_map = {a['role']: a['system_prompt'] for a in state['plan']['agents']}

    llm = get_main_brain()

    coroutines = [
        process_single_task(task, agents_map, state, llm)
        for task in tasks
    ]

    results = await asyncio.gather(*coroutines)

    new_artifacts = {}
    for task_id, content in results:
        if content:
            new_artifacts[task_id] = content

    await socket_manager.broadcast(project_id, {
        "type": "status",
        "message": "All tasks completed concurrently. Sending to QA..."
    })

    return {
        "generated_artifacts": new_artifacts,
    }
