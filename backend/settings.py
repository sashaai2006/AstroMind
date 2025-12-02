from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    projects_root: Path = Field(default=Path("./projects"), env="PROJECTS_ROOT")
    llm_mode: Literal["mock", "ollama", "groq"] = Field(default="mock", env="LLM_MODE")
    ollama_model: str = Field(default="llama3.2:3b", env="OLLAMA_MODEL")
    groq_model: str = Field(default="llama-3.1-8b-instant", env="GROQ_MODEL")
    llm_semaphore: int = Field(default=10, env="LLM_SEMAPHORE")  # Increased for parallelism
    github_api_url: str = Field(
        default="https://api.github.com", env="GITHUB_API_URL"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.projects_root.mkdir(parents=True, exist_ok=True)
    return settings
