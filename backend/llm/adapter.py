from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from backend.settings import get_settings


class BaseLLMAdapter(ABC):
    @abstractmethod
    async def acomplete(self, prompt: str, json_mode: bool = False, cache_key: Optional[str] = None) -> str:
        """
        Return raw completion text. 
        If json_mode=True, LLM should be forced to return JSON.
        cache_key: optional explicit key for caching
        """


_cached_adapter: Optional[BaseLLMAdapter] = None


def get_llm_adapter() -> BaseLLMAdapter:
    global _cached_adapter
    if _cached_adapter:
        return _cached_adapter

    settings = get_settings()
    if settings.llm_mode == "mock":
        from .mock_adapter import MockLLMAdapter

        _cached_adapter = MockLLMAdapter()
    elif settings.llm_mode == "groq":
        from .groq_adapter import GroqLLMAdapter

        _cached_adapter = GroqLLMAdapter(model=settings.groq_model)
    else:
        from .ollama_adapter import OllamaLLMAdapter

        _cached_adapter = OllamaLLMAdapter(model=settings.ollama_model)
    return _cached_adapter
