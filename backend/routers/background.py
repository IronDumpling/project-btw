"""
Background Engine router.

  POST /v1/background/chat

Serves: Conversation Compressor, User Persona Updater,
        Contact Persona Updater, Relationship Updater.
Priority: output quality, long-context handling, cost gradient.
Model list: BACKGROUND_MODELS (gpt-5.1 → gpt-4o-mini → claude → deepseek fallback).
"""

import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import BACKGROUND_MODELS
from utils import complete_with_fallback, stream_with_fallback

log = logging.getLogger("backend.background")
router = APIRouter(prefix="/v1/background", tags=["background"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    stream: bool = False
    temperature: float = 0.3   # lower default — background tasks need deterministic output
    max_tokens: int = 4096     # higher default — compressor/updater outputs can be long
    metadata: dict[str, Any] = {}


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, int] = {}


def _to_litellm(req: ChatRequest) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in req.messages]


@router.post("/chat")
async def background_chat(req: ChatRequest):
    """
    Background Engine endpoint.
    Used by: Conversation Compressor, Persona Updater, Relationship Updater.
    Tries BACKGROUND_MODELS in order; falls back on auth/rate-limit/not-found errors.
    """
    messages = _to_litellm(req)
    kwargs = dict(temperature=req.temperature, max_tokens=req.max_tokens)

    if req.stream:
        return StreamingResponse(
            stream_with_fallback(BACKGROUND_MODELS, messages, **kwargs),
            media_type="text/event-stream",
        )

    response = await complete_with_fallback(BACKGROUND_MODELS, messages, **kwargs)
    content = response.choices[0].message.content or ""
    usage = {}
    if response.usage:
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
    return ChatResponse(content=content, model=response.model, usage=usage)
