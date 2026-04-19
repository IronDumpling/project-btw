"""
Perception Layer router.

  POST /v1/perception/analyze

Governance: stateless, idempotent, auto-triggered by hotkey.
Vision-capable models only (image input required).
Model list: PERCEPTION_MODELS (gpt-4o → claude-3-5-sonnet fallback).
Prompt: backend/prompts/perception/analyze.md
"""

import json
import logging
import time
from pathlib import Path

import litellm
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import PERCEPTION_MODELS

log = logging.getLogger("backend.perception")
router = APIRouter(prefix="/v1/perception", tags=["perception"])

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "perception" / "analyze.md"
if not _PROMPT_PATH.exists():
    raise FileNotFoundError(f"Perception prompt not found: {_PROMPT_PATH}")
_SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")

_RETRYABLE = (
    litellm.AuthenticationError,
    litellm.RateLimitError,
    litellm.NotFoundError,
)


class AnalyzeRequest(BaseModel):
    screenshot: str       # "data:image/png;base64,..." or raw base64
    window_title: str = ""


class ExtractedMessage(BaseModel):
    role: str             # "user" or "contact"
    text: str


class AnalyzeResponse(BaseModel):
    platform: str | None
    contact_name: str | None
    messages: list[ExtractedMessage]
    confidence: float
    vision_model: str     # which model actually responded


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_screenshot(req: AnalyzeRequest):
    """
    Perception Layer: send screenshot to vision LLM.
    Governance: stateless, idempotent, safe to auto-retry.
    Tries PERCEPTION_MODELS in order; falls back on auth/rate-limit/not-found errors.
    """
    image_url = (
        req.screenshot
        if req.screenshot.startswith("data:")
        else f"data:image/png;base64,{req.screenshot}"
    )

    user_content = [
        {"type": "image_url", "image_url": {"url": image_url}},
        {
            "type": "text",
            "text": (
                f"Window title: \"{req.window_title}\"\n\n"
                "Analyze this chat screenshot and return JSON only."
            ),
        },
    ]

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    last_err: Exception | None = None
    used_model: str = PERCEPTION_MODELS[0] if PERCEPTION_MODELS else "unknown"
    response = None

    for model in PERCEPTION_MODELS:
        t0 = time.monotonic()
        try:
            log.debug("perception/analyze: trying %s", model)
            response = await litellm.acompletion(
                model=model,
                messages=messages,
                max_tokens=1024,
                temperature=0.1,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            usage = response.usage or {}
            log.info(
                "[LLM] endpoint=perception model=%s tokens_in=%s tokens_out=%s latency_ms=%d ok=true",
                response.model or model,
                getattr(usage, "prompt_tokens", "?"),
                getattr(usage, "completion_tokens", "?"),
                latency_ms,
            )
            used_model = model
            break
        except litellm.BadRequestError as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=perception model=%s latency_ms=%d ok=false error=BadRequestError",
                model, latency_ms,
            )
            raise HTTPException(
                status_code=400,
                detail={"error": "bad_request", "model": model, "message": str(e)},
            )
        except _RETRYABLE as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=perception model=%s latency_ms=%d ok=false error=%s → fallback",
                model, latency_ms, type(e).__name__,
            )
            last_err = e
        except Exception as e:
            latency_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "[LLM] endpoint=perception model=%s latency_ms=%d ok=false error=%s → fallback",
                model, latency_ms, type(e).__name__,
            )
            log.exception("perception/analyze: unexpected error from %s", model)
            last_err = e
    else:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "all_models_failed",
                "models_tried": PERCEPTION_MODELS,
                "last_error": str(last_err),
            },
        )

    raw = (response.choices[0].message.content or "{}").strip()

    # Strip markdown code fences if the model wrapped the JSON anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("perception/analyze: %s returned non-JSON: %s", used_model, raw[:300])
        raise HTTPException(
            status_code=500,
            detail={"error": "parse_error", "message": f"Model returned non-JSON: {raw[:200]}"},
        )

    return AnalyzeResponse(
        platform=data.get("platform"),
        contact_name=data.get("contact_name"),
        messages=[ExtractedMessage(**m) for m in data.get("messages", [])],
        confidence=float(data.get("confidence", 0.0)),
        vision_model=used_model,
    )
