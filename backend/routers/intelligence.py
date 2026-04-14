"""
Intelligence Layer composite endpoints.

  POST /v1/intelligence/analyze
    Run Subtext Analyzer on a conversation.
    Uses Reasoning Layer (stateless, auto-triggered).

  POST /v1/intelligence/pipeline
    Run Subtext Analyzer + Reply Generator in parallel.
    Uses Reasoning Layer (stateless).

Both endpoints expect the caller to have already assembled context via the
frontend's contextAssembler.ts — the `user_context` and `contact_context`
fields arrive pre-budgeted.
"""

import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from config import REASONING_MODELS
from utils import complete_with_fallback

log = logging.getLogger("backend.intelligence")
router = APIRouter(prefix="/v1/intelligence", tags=["intelligence"])

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_prompt(relative_path: str) -> str:
    path = _PROMPTS_DIR / relative_path
    if path.exists():
        return path.read_text(encoding="utf-8")
    log.warning("Prompt file not found: %s", path)
    return ""


class ExtractedMessage(BaseModel):
    role: str
    text: str


class AnalyzeRequest(BaseModel):
    contact_name: str
    messages: list[ExtractedMessage]
    user_context: str = ""      # pre-assembled by contextAssembler.ts
    contact_context: str = ""   # pre-assembled by contextAssembler.ts


class SubtextResult(BaseModel):
    subtext: str
    tone: str
    intent: str
    confidence: float
    reasoning: str


class AnalyzeResponse(BaseModel):
    subtext: SubtextResult
    model: str


class PipelineRequest(BaseModel):
    contact_name: str
    messages: list[ExtractedMessage]
    user_context: str = ""
    contact_context: str = ""


class PipelineResponse(BaseModel):
    subtext: SubtextResult
    reply_drafts: list[dict]
    model: str


def _build_subtext_messages(req: AnalyzeRequest) -> list[dict]:
    subtext_prompt = _load_prompt("conversation/subtext.md")

    # Build the pre-assembled system context
    context_parts = []
    if req.user_context:
        context_parts.append(req.user_context)
    if req.contact_context:
        context_parts.append(req.contact_context)

    system = subtext_prompt
    if context_parts:
        system = "\n\n---\n\n".join(context_parts) + "\n\n---\n\n" + subtext_prompt

    conv_text = "\n".join(
        f"[{'You' if m.role == 'user' else req.contact_name}] {m.text}"
        for m in req.messages
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Analyze this conversation:\n\n{conv_text}"},
    ]


def _build_reply_messages(
    req: PipelineRequest,
    subtext: SubtextResult,
) -> list[dict]:
    reply_prompt = _load_prompt("conversation/reply.md")

    system = reply_prompt
    if req.user_context:
        system = req.user_context + "\n\n---\n\n" + reply_prompt

    conv_text = "\n".join(
        f"[{'You' if m.role == 'user' else req.contact_name}] {m.text}"
        for m in req.messages
    )

    user_content = (
        f"Conversation:\n{conv_text}\n\n"
        f"Subtext analysis:\n"
        f"- What they mean: {subtext.subtext}\n"
        f"- Tone: {subtext.tone}\n"
        f"- Intent: {subtext.intent}\n\n"
        "Generate 2-3 reply drafts."
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]


def _parse_json_field(content: str, field: str, default):
    """Extract a field from a JSON response, returning default on parse failure."""
    import json
    raw = content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        data = json.loads(raw)
        return data.get(field, default)
    except Exception:
        return default


def _parse_subtext(content: str) -> SubtextResult:
    import json
    raw = content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        data = json.loads(raw)
        return SubtextResult(
            subtext=data.get("subtext", ""),
            tone=data.get("tone", ""),
            intent=data.get("intent", ""),
            confidence=float(data.get("confidence", 0.5)),
            reasoning=data.get("reasoning", ""),
        )
    except Exception:
        return SubtextResult(
            subtext=content[:200],
            tone="unknown",
            intent="unknown",
            confidence=0.3,
            reasoning="Failed to parse structured response",
        )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_intelligence(req: AnalyzeRequest):
    """
    Subtext Analyzer — Reasoning Layer.
    Stateless, auto-triggered after Perception.
    """
    messages = _build_subtext_messages(req)
    response = await complete_with_fallback(
        REASONING_MODELS,
        messages,
        endpoint="reasoning",
        temperature=0.4,
        max_tokens=512,
    )
    content = response.choices[0].message.content or ""
    return AnalyzeResponse(
        subtext=_parse_subtext(content),
        model=response.model,
    )


@router.post("/pipeline", response_model=PipelineResponse)
async def run_pipeline(req: PipelineRequest):
    """
    Subtext + Reply pipeline — Reasoning Layer.
    Runs subtext analysis first, then reply generation using the subtext result.
    Both calls are Reasoning Layer (stateless).
    """
    # Step 1: subtext
    subtext_msgs = _build_subtext_messages(
        AnalyzeRequest(
            contact_name=req.contact_name,
            messages=req.messages,
            user_context=req.user_context,
            contact_context=req.contact_context,
        )
    )
    subtext_response = await complete_with_fallback(
        REASONING_MODELS,
        subtext_msgs,
        endpoint="reasoning",
        temperature=0.4,
        max_tokens=512,
    )
    subtext = _parse_subtext(subtext_response.choices[0].message.content or "")

    # Step 2: replies (using subtext result as additional context)
    reply_msgs = _build_reply_messages(req, subtext)
    reply_response = await complete_with_fallback(
        REASONING_MODELS,
        reply_msgs,
        endpoint="reasoning",
        temperature=0.7,
        max_tokens=768,
    )
    import json
    reply_raw = (reply_response.choices[0].message.content or "{}").strip()
    if reply_raw.startswith("```"):
        reply_raw = reply_raw.split("```")[1]
        if reply_raw.startswith("json"):
            reply_raw = reply_raw[4:]
        reply_raw = reply_raw.strip()
    try:
        reply_data = json.loads(reply_raw)
        drafts = reply_data.get("drafts", [])
    except Exception:
        drafts = [{"text": reply_raw[:200], "approach": "direct", "note": "parse error"}]

    return PipelineResponse(
        subtext=subtext,
        reply_drafts=drafts,
        model=reply_response.model,
    )
