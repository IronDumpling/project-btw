"""
Reasoning Layer router.

  POST /v1/reasoning/chat

Governance: stateless, idempotent, auto-triggered after Perception.
Safe to retry on failure — no Storage writes occur here.
Model list: REASONING_MODELS (Groq llama → gpt-4o-mini fallback).

Used by: Subtext Analyzer, Reply Generator (via /v1/intelligence/* or directly).
"""

import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import REASONING_MODELS
from utils import complete_with_fallback, stream_with_fallback

log = logging.getLogger("backend.reasoning")
router = APIRouter(prefix="/v1/reasoning", tags=["reasoning"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    stream: bool = False
    temperature: float = 0.7
    max_tokens: int = 1024
    metadata: dict[str, Any] = {}


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, int] = {}


def _to_litellm(req: ChatRequest) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in req.messages]


@router.post("/chat")
async def reasoning_chat(req: ChatRequest):
    """
    Reasoning Layer endpoint.
    Governance: stateless, safe to auto-retry, no Storage side-effects.
    Used by: Subtext Analyzer, Reply Generator.
    Tries REASONING_MODELS in order; falls back on auth/rate-limit/not-found errors.
    """
    messages = _to_litellm(req)
    kwargs = dict(temperature=req.temperature, max_tokens=req.max_tokens)

    if req.stream:
        return StreamingResponse(
            stream_with_fallback(REASONING_MODELS, messages, endpoint="reasoning", **kwargs),
            media_type="text/event-stream",
        )

    response = await complete_with_fallback(REASONING_MODELS, messages, endpoint="reasoning", **kwargs)
    content = response.choices[0].message.content or ""
    usage = {}
    if response.usage:
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
    return ChatResponse(content=content, model=response.model, usage=usage)
