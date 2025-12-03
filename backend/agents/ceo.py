from __future__ import annotations

import json
from typing import Any, Dict, List
from uuid import uuid4

from backend.llm.adapter import get_llm_adapter
from backend.settings import get_settings
from backend.utils.logging import get_logger

LOGGER = get_logger(__name__)


class CEOAgent:
    """Generates a lightweight DAG describing required build steps."""

    async def plan(self, description: str, target: str) -> List[Dict[str, Any]]:
        settings = get_settings()
        if settings.llm_mode == "mock":
            return self._mock_plan(description, target)
        return await self._llm_plan(description, target)

    async def _llm_plan(self, description: str, target: str) -> List[Dict[str, Any]]:
        prompt = (
            "You are a technical CEO planning an MVP project. Create a DETAILED execution plan.\n"
            f"Project description: {description}\n"
            f"Target platform: {target}\n"
            "\n"
            "STRICT RULE: Create EXACTLY 4-5 steps. Count them before responding.\n"
            "Break the project into logical steps that run in parallel for speed.\n"
            "\n"
            "Output JSON:\n"
            "{\n"
            '  "_thought": "I will create 4 steps: scaffold (group A), implement core (group A parallel), add features (group B), finalize (sequential)...",\n'
            '  "steps": [\n'
            '    {\n'
            '      "name": "scaffold_frontend",\n'
            '      "agent": "developer",\n'
            '      "parallel_group": "setup",\n'
            '      "payload": {\n'
            '        "files": [\n'
            '          {"path": "index.html", "content": "Create main HTML with structure for: [description]. Include canvas/div for game, score display, controls."},\n'
            '          {"path": "style.css", "content": "Modern styling with dark theme, centered layout, responsive design"}\n'
            '        ]\n'
            '      }\n'
            '    },\n'
            '    {"name": "implement_logic", "parallel_group": "setup", "payload": {"files": [...]}},\n'
            '    {"name": "add_features", "parallel_group": "features", "payload": {"files": [...]}},\n'
            '    {"name": "finalize", "parallel_group": null, "payload": {"files": [...]}}\n'
            '  ]\n'
            "}\n"
            "\n"
            "MANDATORY:\n"
            "1. EXACTLY 4-5 steps (no more, no less - count before submitting)\n"
            "2. Use parallel_group for independent tasks (setup, features)\n"
            "3. Each step: 3-8 files with DETAILED instructions\n"
            "4. ALWAYS include index.html in first step for web projects\n"
            "5. Return ONLY JSON\n"
        )
        adapter = get_llm_adapter()
        try:
            LOGGER.info("CEO requesting plan from LLM...")
            response = await adapter.acomplete(prompt, json_mode=True)
            LOGGER.info("CEO received plan (len=%d)", len(response))
            
            # Parse response
            data = json.loads(response)
            
            # Handle Thought Streaming if present
            if "_thought" in data:
                # Ideally we would broadcast this, but CEO doesn't have WS manager context yet.
                # We'll log it for now.
                LOGGER.info("CEO Thought: %s", data["_thought"])
                
            steps = data.get("steps", [])
            if isinstance(data, list): # Fallback if LLM returned list directly
                steps = data

            # Ensure IDs and limit steps
            for step in steps:
                if "id" not in step:
                    step["id"] = str(uuid4())
            
            # Enforce 4-5 step limit
            if len(steps) > 5:
                LOGGER.warning("CEO created %d steps, limiting to 5", len(steps))
                steps = steps[:5]
            elif len(steps) < 2:
                LOGGER.warning("CEO created only %d steps, using fallback", len(steps))
                return self._mock_plan(description, target)
            
            return steps
        except Exception as exc:
            LOGGER.error("CEO plan generation failed: %s", exc)
            # Fallback to simplified plan
            return [{
                "id": str(uuid4()),
                "name": "build_project",
                "agent": "developer",
                "parallel_group": "main",
                "payload": {
                    "files": [
                        {"path": "index.html", "content": f"Create {target} project: {description}"},
                        {"path": "README.md", "content": f"# {description}"},
                    ]
                },
            }]

    def _mock_plan(self, description: str, target: str) -> List[Dict[str, Any]]:
        """4-step balanced plan: quality + speed through parallelization."""
        return [
            {
                "id": str(uuid4()),
                "name": "scaffold_frontend",
                "agent": "developer",
                "parallel_group": "setup",
                "payload": {
                    "files": [
                        {"path": "index.html", "content": f"Create main HTML for {target} project: {description}. Include structure, canvas/divs for game, UI elements."},
                        {"path": "style.css", "content": "Modern dark theme styling, centered layout, responsive design"},
                        {"path": "script.js", "content": "Initialize game, setup event listeners, prepare scene"},
                    ]
                },
            },
            {
                "id": str(uuid4()),
                "name": "implement_core_logic",
                "agent": "developer",
                "parallel_group": "setup",  # Parallel with scaffold
                "payload": {
                    "files": [
                        {"path": "game.js", "content": f"Core game logic for: {description}. Implement main game loop, state management, collision detection"},
                        {"path": "models.js", "content": "Data models: Snake, Food, Score, Grid classes"},
                    ]
                },
            },
            {
                "id": str(uuid4()),
                "name": "add_features",
                "agent": "developer",
                "parallel_group": "features",  # After setup
                "payload": {
                    "files": [
                        {"path": "features.js", "content": f"Additional features for {description}: animations, effects, sounds, controls"},
                        {"path": "utils.js", "content": "Helper functions: random position, collision check, score calculation"},
                    ]
                },
            },
            {
                "id": str(uuid4()),
                "name": "finalize",
                "agent": "developer",
                "parallel_group": None,  # Sequential
                "payload": {
                    "files": [
                        {"path": "README.md", "content": f"# {description}\n\nTarget: {target}\n\nHow to run: Open index.html in browser"},
                        {"path": "meta.json", "content": json.dumps({"description": description, "target": target, "version": "1.0"}, indent=2)},
                    ]
                },
            },
        ]
