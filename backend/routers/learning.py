"""
Learning Layer router.

  POST /v1/learning/chat

Governance: STATEFUL — this layer writes to Storage (persona files).
  - Requires `confirm: true` in the request body.
    Callers must explicitly declare they have user confirmation before writing.
  - Streaming is disabled (atomic write requires complete response).
  - On failure, caller is responsible for preserving the old file.

Model list: LEARNING_MODELS (gpt-4.1 → gpt-4o-mini → claude → deepseek fallback).

Used by: User Persona Updater, Contact Persona Updater, Relationship Updater.
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import LEARNING_MODELS
from utils import complete_with_fallback

log = logging.getLogger("backend.learning")
router = APIRouter(prefix="/v1/learning", tags=["learning"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    confirm: bool = False      # MUST be True — caller declares user has confirmed the write
    temperature: float = 0.3   # lower default — persona updates need deterministic output
    max_tokens: int = 4096     # higher default — full persona documents can be long
    metadata: dict[str, Any] = {}


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, int] = {}


def _to_litellm(req: ChatRequest) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in req.messages]


@router.post("/chat")
async def learning_chat(req: ChatRequest):
    """
    Learning Layer endpoint.
    Governance: stateful — writes persona/relationship files.
    REQUIRES confirm=true in request body (user must have explicitly confirmed).
    Streaming disabled — complete response needed for atomic Storage write.
    Tries LEARNING_MODELS in order; falls back on auth/rate-limit/not-found errors.
    """
    if not req.confirm:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "confirm_required",
                "message": (
                    "Learning layer writes to Storage and requires explicit user confirmation. "
                    "Set confirm=true in the request body after the user has approved the update."
                ),
            },
        )

    messages = _to_litellm(req)
    kwargs = dict(temperature=req.temperature, max_tokens=req.max_tokens)

    response = await complete_with_fallback(LEARNING_MODELS, messages, endpoint="learning", **kwargs)
    content = response.choices[0].message.content or ""
    usage = {}
    if response.usage:
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
    return ChatResponse(content=content, model=response.model, usage=usage)
