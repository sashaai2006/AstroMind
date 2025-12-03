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
            "Your task: Break the project into logical, independent steps that can run in parallel.\n"
            "\n"
            "Output a JSON object with the following structure:\n"
            "{\n"
            '  "_thought": "Explain your reasoning for the plan and parallelization strategy...",\n'
            '  "steps": [\n'
            '    {\n'
            '      "name": "string (e.g. \'scaffold_frontend\', \'setup_database\', \'implement_auth\')",\n'
            '      "agent": "developer",\n'
            '      "parallel_group": "string or null (steps with same group run in parallel)",\n'
            '      "payload": {\n'
            '        "files": [\n'
            '          {"path": "path/to/file", "content": "DETAILED INSTRUCTIONS for what this file should do and contain"}\n'
            '        ]\n'
            '      }\n'
            '    }\n'
            '  ]\n'
            "}\n"
            "\n"
            "RULES:\n"
            "1. MAXIMIZE PARALLELISM: Put independent tasks (frontend, backend, database) in the SAME 'parallel_group' (e.g., 'phase_1').\n"
            "2. SEQUENTIAL DEPENDENCIES: If a task depends on another, use different parallel_group or null.\n"
            "3. DETAILED SPECS: In 'payload.files[].content', write DETAILED natural language instructions.\n"
            "   Example: 'Create a React component for user authentication with login form, validation, and error handling'\n"
            "4. FILE GRANULARITY: Each step should create 2-5 files. Don't put everything in one step.\n"
            "5. QUALITY OVER SPEED: It's better to have 3-5 well-defined steps than 1 vague step.\n"
            "6. Return ONLY valid JSON. No markdown code blocks.\n"
            "\n"
            "EXAMPLE FOR WEB PROJECT:\n"
            '[\n'
            '  {"name": "scaffold_frontend", "parallel_group": "build", "payload": {"files": [...]}},\n'
            '  {"name": "setup_backend", "parallel_group": "build", "payload": {"files": [...]}},\n'
            '  {"name": "implement_auth", "parallel_group": "features", "payload": {"files": [...]}}\n'
            ']\n'
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

            # Ensure IDs
            for step in steps:
                if "id" not in step:
                    step["id"] = str(uuid4())
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
        """Balanced mock plan: quality + speed through parallelization."""
        parallel_group = "build"
        return [
            {
                "id": str(uuid4()),
                "name": "generate_frontend",
                "agent": "developer",
                "parallel_group": parallel_group,
                "payload": {
                    "files": [
                        {"path": "index.html", "content": f"Create frontend for: {description}. Target: {target}"},
                        {"path": "style.css", "content": "Modern, responsive styling"},
                    ]
                },
            },
            {
                "id": str(uuid4()),
                "name": "generate_backend",
                "agent": "developer",
                "parallel_group": parallel_group,  # Same group = parallel execution
                "payload": {
                    "files": [
                        {"path": "main.py", "content": f"Backend logic for: {description}"},
                        {"path": "requirements.txt", "content": "fastapi\nuvicorn\npydantic"},
                    ]
                },
            },
            {
                "id": str(uuid4()),
                "name": "finalize",
                "agent": "developer",
                "parallel_group": None,  # Runs after build group
                "payload": {
                    "files": [
                        {"path": "README.md", "content": f"# {description}\n\nTarget: {target}\n\nHow to run: see docs"},
                        {"path": "meta.json", "content": json.dumps({"description": description, "target": target}, indent=2)},
                    ]
                },
            },
        ]
