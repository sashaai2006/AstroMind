import json
import re
from typing import Any, Dict, Union


def clean_and_parse_json(text: str) -> Union[Dict[str, Any], list]:
    """Extract and parse JSON from raw LLM output."""
    if text.count("```") % 2 == 1:
        raise ValueError("Detected unterminated markdown fence in LLM response")

    # 1. Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Extract from Markdown code blocks ```json ... ```
    json_block_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    matches = re.findall(json_block_pattern, text)

    for match in matches:
        candidate = match.strip()
        if not _looks_complete(candidate):
            raise ValueError("Detected truncated JSON block inside markdown fence")
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            try:
                return _repair_and_parse(candidate)
            except Exception:
                continue

    # 3. Try to find the first { and last } (if no markdown blocks)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        potential_json = text[start : end + 1].strip()
        if not _looks_complete(potential_json):
            raise ValueError("Detected truncated JSON payload without closing brace")
        try:
            return json.loads(potential_json)
        except json.JSONDecodeError:
            pass

    # 4. Last resort: aggressive repair on the whole text or extracted block
    try:
        return _repair_and_parse(text)
    except Exception:
        pass

    raise ValueError("Failed to parse JSON from text")


def _repair_and_parse(json_str: str) -> Any:
    """Attempt to fix common JSON errors from LLMs."""
    if not _looks_complete(json_str):
        raise ValueError("Detected truncated JSON payload while repairing")

    try:
        return json.loads(json_str, strict=False)
    except json.JSONDecodeError:
        pass

    raise ValueError("Could not repair JSON")


def _looks_complete(json_segment: str) -> bool:
    """Lightweight heuristic to ensure JSON ends with a closing bracket."""
    stripped = json_segment.strip()
    return bool(stripped) and stripped[-1] in ("}", "]")
