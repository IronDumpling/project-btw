"""
LiteLLM Gateway router.

Two tiers:
  POST /v1/chat/fast     → fast model  (Subtext Analyzer, Reply Generator)
  POST /v1/chat/capable  → capable model (Persona/Relationship/Conversation Updaters)

Both support streaming via SSE when `stream=true` in the request body.
"""

import json
import logging

import litellm
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any

from config import FAST_MODEL, CAPABLE_MODEL

log = logging.getLogger("gateway.chat")
router = APIRouter(prefix="/v1/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    stream: bool = False
    temperature: float = 0.7
    max_tokens: int = 2048
    metadata: dict[str, Any] = {}


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, int] = {}


def _to_litellm(req: ChatRequest) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in req.messages]


async def _stream(model: str, messages: list[dict], temperature: float, max_tokens: int):
    try:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=True,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'content': delta})}\n\n"
        yield "data: [DONE]\n\n"
    except litellm.AuthenticationError as e:
        yield f"data: {json.dumps({'error': 'invalid_api_key', 'detail': str(e)})}\n\n"
    except litellm.RateLimitError as e:
        yield f"data: {json.dumps({'error': 'rate_limit', 'detail': str(e)})}\n\n"
    except Exception as e:
        log.exception("Stream error")
        yield f"data: {json.dumps({'error': 'internal_error', 'detail': str(e)})}\n\n"


async def _complete(model: str, messages: list[dict], temperature: float, max_tokens: int) -> ChatResponse:
    try:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=False,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except litellm.AuthenticationError as e:
        raise HTTPException(status_code=401, detail={"error": "invalid_api_key", "message": str(e)})
    except litellm.RateLimitError as e:
        raise HTTPException(status_code=429, detail={"error": "rate_limit", "message": str(e)})
    except litellm.BadRequestError as e:
        raise HTTPException(status_code=400, detail={"error": "bad_request", "message": str(e)})
    except Exception as e:
        log.exception("Completion error")
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": str(e)})

    content = response.choices[0].message.content or ""
    usage = {}
    if response.usage:
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
    return ChatResponse(content=content, model=response.model, usage=usage)


@router.post("/fast")
async def chat_fast(req: ChatRequest):
    """Real-time endpoint — Subtext Analyzer, Reply Generator."""
    messages = _to_litellm(req)
    if req.stream:
        return StreamingResponse(
            _stream(FAST_MODEL, messages, req.temperature, req.max_tokens),
            media_type="text/event-stream",
        )
    return await _complete(FAST_MODEL, messages, req.temperature, req.max_tokens)


@router.post("/capable")
async def chat_capable(req: ChatRequest):
    """Background endpoint — Persona/Relationship/Conversation Updaters."""
    messages = _to_litellm(req)
    if req.stream:
        return StreamingResponse(
            _stream(CAPABLE_MODEL, messages, req.temperature, req.max_tokens),
            media_type="text/event-stream",
        )
    return await _complete(CAPABLE_MODEL, messages, req.temperature, req.max_tokens)
