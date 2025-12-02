from __future__ import annotations

import os
from typing import Optional

import logging
from groq import AsyncGroq, RateLimitError, APIError, BadRequestError, AuthenticationError, PermissionDeniedError, InternalServerError, APIConnectionError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from backend.utils.logging import get_logger
from backend.llm.cache import get_cached, set_cached, get_cached_by_key, set_cached_by_key

from .adapter import BaseLLMAdapter

LOGGER = get_logger(__name__)


class GroqLLMAdapter(BaseLLMAdapter):
    """Adapter for Groq API (fast inference) with caching."""

    def __init__(self, model: str = "llama-3.1-8b-instant"):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            LOGGER.warning("GROQ_API_KEY not found. Groq adapter will fail.")
        self.client = AsyncGroq(api_key=api_key)
        self.model = model

    @retry(
        retry=retry_if_exception_type((RateLimitError, InternalServerError, APIConnectionError)),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        stop=stop_after_attempt(5),
        before_sleep=before_sleep_log(LOGGER, logging.INFO),
    )
    async def acomplete(self, prompt: str, json_mode: bool = False, cache_key: Optional[str] = None) -> str:
        # Check cache first
        cached = None
        if cache_key:
            cached = get_cached_by_key(cache_key)
        else:
            cached = get_cached(prompt, json_mode)
            
        if cached:
            LOGGER.info("Returning cached response")
            return cached
        
        try:
            result = await self._invoke(prompt, json_mode=json_mode)
            if cache_key:
                set_cached_by_key(cache_key, result)
            else:
                set_cached(prompt, result, json_mode)
            return result
        except BadRequestError as exc:
            LOGGER.error("Groq bad request (json_mode=%s): %s", json_mode, exc)
            if json_mode:
                LOGGER.warning("Falling back to text mode (json_mode=False) due to bad request.")
                result = await self._invoke(prompt, json_mode=False)
                if cache_key:
                    set_cached_by_key(cache_key, result)
                else:
                    set_cached(prompt, result, json_mode)
                return result
            raise
        except (AuthenticationError, PermissionDeniedError) as exc:
            LOGGER.critical("Groq authentication/permission error: %s. Check your GROQ_API_KEY.", exc)
            raise  # Do not retry
        except Exception as exc:
            LOGGER.error("Groq request failed: %s", exc)
            raise

    async def _invoke(self, prompt: str, json_mode: bool) -> str:
        LOGGER.info("Calling Groq with model '%s' (json_mode=%s)", self.model, json_mode)
        response_format = {"type": "json_object"} if json_mode else None
        system_prompt = "You are a helpful assistant that generates code."
        if json_mode:
            system_prompt += (
                " You MUST output valid JSON. "
                "When outputting file content, the 'content' field MUST be a STRING, not an object. "
                "Escape newlines as \\n and quotes as \\\"."
            )

        chat_completion = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            model=self.model,
            temperature=0.1,  # Low temperature for code
            response_format=response_format,
            max_tokens=8192,
        )
        choice = chat_completion.choices[0]
        finish_reason = getattr(choice, "finish_reason", None)
        if finish_reason == "length":
            LOGGER.error("Groq response truncated due to token limit (finish_reason=length)")
            raise RuntimeError("Groq response truncated (finish_reason=length)")

        content = choice.message.content
        LOGGER.info("Groq response received (length=%d)", len(content or ""))
        return content or ""
