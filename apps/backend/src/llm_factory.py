import os
from typing import Literal
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_core.language_models import BaseChatModel

# Supported Providers
Provider = Literal["openai", "anthropic", "groq", "perplexity", "deepseek", "openai_compatible"]

def get_llm(
    provider: Provider = "openai", 
    model_name: str = None, 
    temperature: float = 0
) -> BaseChatModel:
    """
    Factory to get the appropriate LLM based on configuration.
    """
    
    # 1. DEEPSEEK (Great for Coding)
    if provider == "deepseek":
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY not found")
        return ChatOpenAI(
            base_url="https://api.deepseek.com",
            api_key=api_key,
            model=model_name or "deepseek-coder", # or deepseek-chat
            temperature=temperature
        )

    # 2. OPENAI COMPATIBLE (For Qwen, Ollama, Local vLLM)
    if provider == "openai_compatible":
        api_key = os.getenv("Compatible_API_KEY", "empty") 
        base_url = os.getenv("Compatible_BASE_URL")
        if not base_url:
            raise ValueError("Compatible_BASE_URL must be set for openai_compatible provider")
        
        return ChatOpenAI(
            base_url=base_url,
            api_key=api_key,
            model=model_name or "qwen2.5-72b-instruct",
            temperature=temperature
        )

    # 3. GROQ (Llama 3)
    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found")
        
        # UPDATED MODEL NAME: llama-3.3-70b-versatile (Latest stable)
        target_model = model_name or "llama-3.3-70b-versatile"
        
        # Force update old names if user has them in .env
        if target_model in ["llama3-70b-8192", "llama-3.1-70b-versatile"]:
            target_model = "llama-3.3-70b-versatile"

        return ChatGroq(
            temperature=temperature,
            model_name=target_model,
            api_key=api_key
        )

    # 4. PERPLEXITY
    if provider == "perplexity":
        api_key = os.getenv("PERPLEXITY_API_KEY")
        return ChatOpenAI(
            base_url="https://api.perplexity.ai",
            api_key=api_key,
            model=model_name or "sonar-medium-online",
            temperature=temperature
        )

    # 5. ANTHROPIC
    if provider == "anthropic":
        return ChatAnthropic(
            model=model_name or "claude-3-sonnet-20240229",
            temperature=temperature
        )

    # 6. OPENAI (Default)
    return ChatOpenAI(
        model=model_name or "gpt-4-turbo-preview", 
        temperature=temperature
    )

def get_main_brain() -> BaseChatModel:
    """Reads env vars to determine the main orchestrator model"""
    # HARDCODED OVERRIDE FOR DEBUGGING
    preferred = "groq" 
    model = os.getenv("MAIN_LLM_MODEL") 
    return get_llm(provider=preferred, model_name=model)
