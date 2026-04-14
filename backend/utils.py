"""
Shared LLM completion helpers with ordered model fallback.

Usage:
    from utils import complete_with_fallback, stream_with_fallback
    from config import REALTIME_MODELS

    # Non-streaming
    response = await complete_with_fallback(REALTIME_MODELS, messages, max_tokens=512)

    # Streaming (async generator of SSE lines)
    async for chunk in stream_with_fallback(REALTIME_MODELS, messages):
        yield chunk

Fallback triggers (move to next model in list):
    AuthenticationError  — API key missing or invalid
    RateLimitError       — provider throttling
    NotFoundError        — model ID not yet available (e.g. gpt-5.1)

No-fallback errors (propagate immediately):
    BadRequestError      — malformed prompt; switching model won't help
"""

import json
import logging
import time
from typing import AsyncIterator

import litellm
from fastapi import HTTPException

log = logging.getLogger("backend.utils")

# Errors that justify trying the next model in the list
_RETRYABLE = (
    litellm.AuthenticationError,
    litellm.RateLimitError,
    litellm.NotFoundError,
)


async def complete_with_fallback(
    models: list[str],
    messages: list[dict],
    endpoint: str = "unknown",
    **kwargs,
) -> litellm.ModelResponse:
    """
    Try each model in order. Returns the first successful response.
    Raises HTTPException if all models are exhausted.

    endpoint: logical layer name (perception/reasoning/learning) for logging.
    """
    last_err: Exception | None = None

    for model in models:
        t0 = time.monotonic()
        try:
            log.debug("complete_with_fallback: trying %s", model)
            response = await litellm.acompletion(
                model=model,
                messages=messages,
                stream=False,
                **kwargs,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            usage = response.usage or {}
            log.info(
                "[LLM] endpoint=%s model=%s tokens_in=%s tokens_out=%s latency_ms=%d ok=true",
                endpoint,
                response.model or model,
                getattr(usage, "prompt_tokens", "?"),
                getattr(usage, "completion_tokens", "?"),
                latency_ms,
            )
            return response
        except litellm.BadRequestError as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s latency_ms=%d ok=false error=BadRequestError",
                endpoint, model, latency_ms,
            )
            raise HTTPException(
                status_code=400,
                detail={"error": "bad_request", "model": model, "message": str(e)},
            )
        except _RETRYABLE as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s latency_ms=%d ok=false error=%s → fallback",
                endpoint, model, latency_ms, type(e).__name__,
            )
            last_err = e
        except Exception as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s latency_ms=%d ok=false error=%s → fallback",
                endpoint, model, latency_ms, type(e).__name__,
            )
            log.exception("complete_with_fallback: unexpected error from %s", model)
            last_err = e

    raise HTTPException(
        status_code=502,
        detail={
            "error": "all_models_failed",
            "models_tried": models,
            "last_error": str(last_err),
        },
    )


async def stream_with_fallback(
    models: list[str],
    messages: list[dict],
    endpoint: str = "unknown",
    **kwargs,
) -> AsyncIterator[str]:
    """
    Try each model in order for a streaming response.
    Yields SSE lines: `data: {"content": "..."}\\n\\n` and `data: [DONE]\\n\\n`.
    On retryable errors, emits a one-shot SSE error event and stops.

    endpoint: logical layer name (perception/reasoning/learning) for logging.
    """
    last_err: Exception | None = None

    for model in models:
        t0 = time.monotonic()
        try:
            log.debug("stream_with_fallback: trying %s", model)
            response = await litellm.acompletion(
                model=model,
                messages=messages,
                stream=True,
                **kwargs,
            )
            token_count = 0
            actual_model = model
            async for chunk in response:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    token_count += 1
                    yield f"data: {json.dumps({'content': delta})}\n\n"
                if hasattr(chunk, "model") and chunk.model:
                    actual_model = chunk.model
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s tokens_out_chunks=%d latency_ms=%d ok=true (stream)",
                endpoint, actual_model, token_count, latency_ms,
            )
            yield "data: [DONE]\n\n"
            return  # success — stop iterating models
        except litellm.BadRequestError as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s latency_ms=%d ok=false error=BadRequestError (stream)",
                endpoint, model, latency_ms,
            )
            yield f"data: {json.dumps({'error': 'bad_request', 'message': str(e)})}\n\n"
            return
        except _RETRYABLE as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s latency_ms=%d ok=false error=%s → fallback (stream)",
                endpoint, model, latency_ms, type(e).__name__,
            )
            last_err = e
        except Exception as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=%s model=%s latency_ms=%d ok=false error=%s → fallback (stream)",
                endpoint, model, latency_ms, type(e).__name__,
            )
            log.exception("stream_with_fallback: unexpected error from %s", model)
            last_err = e

    yield f"data: {json.dumps({'error': 'all_models_failed', 'models_tried': models, 'last_error': str(last_err)})}\n\n"
