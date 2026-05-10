"""
Intelligence Layer composite endpoints.

  POST /v1/intelligence/analyze
    Run Subtext Analyzer on a conversation.
    Uses Reasoning Layer (stateless, auto-triggered).

  POST /v1/intelligence/pipeline
    Run Subtext Analyzer + Reply Generator in parallel.
    Uses Reasoning Layer (stateless).

  POST /v1/intelligence/compress
    Compress conversation history → structured evidence JSON.
    Uses Reasoning Layer (stateless).

  POST /v1/intelligence/merge
    Merge existing contact persona with compressed evidence.
    Uses Learning Layer models (quality-priority, stateless on the backend —
    the actual file write happens on the frontend).

  POST /v1/intelligence/relationship
    Update relationship state JSON based on compressed evidence.
    Uses Reasoning Layer (stateless).

Both subtext endpoints expect the caller to have already assembled context via
the frontend's contextAssembler.ts — the `user_context` and `contact_context`
fields arrive pre-budgeted.
"""

import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from config import LEARNING_MODELS, REASONING_MODELS
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


def _strip_fences(content: str) -> str:
    """Strip ``` code fences from LLM output."""
    raw = content.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


def _parse_json_field(content: str, field: str, default):
    """Extract a field from a JSON response, returning default on parse failure."""
    raw = _strip_fences(content)
    try:
        data = json.loads(raw)
        return data.get(field, default)
    except Exception:
        return default


def _parse_json(content: str) -> dict:
    """Parse full JSON from LLM output, returning empty dict on failure."""
    raw = _strip_fences(content)
    try:
        return json.loads(raw)
    except Exception:
        return {}


def _parse_subtext(content: str) -> SubtextResult:
    raw = _strip_fences(content)
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
    reply_raw = _strip_fences(reply_response.choices[0].message.content or "{}")
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


# ── Persona update pipeline endpoints ─────────────────────────────────────────

class CompressRequest(BaseModel):
    conversation: str
    contact_id: str = ""


class CompressedEvidence(BaseModel):
    observed_patterns: list[str] = []
    emotional_signals: list[str] = []
    style_observations: list[str] = []
    relationship_indicators: list[str] = []
    memory_updates: list[str] = []
    confidence: float = 0.5
    model: str = ""


@router.post("/compress", response_model=CompressedEvidence)
async def compress_conversation(req: CompressRequest):
    """
    Compress accumulated conversation history into structured evidence JSON.
    Uses Reasoning Layer (stateless). Output is passed to /merge and /relationship.
    """
    updater_prompt = _load_prompt("conversation/updater.md")
    messages = [
        {"role": "system", "content": updater_prompt},
        {"role": "user", "content": req.conversation},
    ]
    response = await complete_with_fallback(
        REASONING_MODELS,
        messages,
        endpoint="reasoning",
        temperature=0.3,
        max_tokens=1024,
    )
    data = _parse_json(response.choices[0].message.content or "")
    return CompressedEvidence(
        observed_patterns=data.get("observed_patterns", []),
        emotional_signals=data.get("emotional_signals", []),
        style_observations=data.get("style_observations", []),
        relationship_indicators=data.get("relationship_indicators", []),
        memory_updates=data.get("memory_updates", []),
        confidence=float(data.get("confidence", 0.5)),
        model=response.model,
    )


class MergeRequest(BaseModel):
    existing_persona: str
    compressed_evidence: dict
    patch_mode: str = "dynamic_only"


class MergeResponse(BaseModel):
    persona: str
    model: str


@router.post("/merge", response_model=MergeResponse)
async def merge_persona(req: MergeRequest):
    """
    Merge existing contact/user persona with compressed evidence.
    Uses Learning Layer models (quality-priority). The actual file write
    happens on the frontend — this endpoint is stateless on the backend.
    """
    merge_prompt = _load_prompt("persona/merge.md")
    schema_prompt = _load_prompt("persona/schema.md")
    system = merge_prompt + "\n\n---\n\n" + schema_prompt

    evidence_str = json.dumps(req.compressed_evidence, ensure_ascii=False, indent=2)
    user_content = "\n".join([
        "=== EXISTING PERSONA ===",
        req.existing_persona,
        "",
        "=== NEW EVIDENCE ===",
        evidence_str,
        "",
        "=== PATCH MODE ===",
        req.patch_mode,
    ])

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    response = await complete_with_fallback(
        LEARNING_MODELS,
        messages,
        endpoint="learning",
        temperature=0.3,
        max_tokens=2000,
    )
    return MergeResponse(
        persona=response.choices[0].message.content or "",
        model=response.model,
    )


class RelationshipBuildRequest(BaseModel):
    compressed_evidence: dict        # output from /compress
    persona_summary: str = ""        # Hard Rules + Relationship Behavior from persona


class RelationshipRequest(BaseModel):
    current_state: str = ""          # current relationship.json content, or ""
    compressed_evidence: dict        # output from /compress
    persona_summary: str = ""        # Hard Rules + Relationship Behavior from persona


class RelationshipState(BaseModel):
    state: str = "getting_acquainted"
    state_changed: bool = False
    previous_state: str | None = None
    evidence: list[str] = []
    trajectory: str = "unclear"
    coaching_note: str = ""
    confidence: float = 0.5
    updated_date: str = ""
    model: str = ""


@router.post("/relationship", response_model=RelationshipState)
async def update_relationship(req: RelationshipRequest):
    """
    Update relationship state based on compressed conversation evidence.
    Uses Reasoning Layer (stateless). Output is written to relationship.json by frontend.
    """
    from datetime import date

    updater_prompt = _load_prompt("relationship/updater.md")
    evidence_str = json.dumps(req.compressed_evidence, ensure_ascii=False, indent=2)
    user_content = "\n".join([
        "=== CURRENT RELATIONSHIP STATE ===",
        req.current_state or "none",
        "",
        "=== RECENT CONVERSATION EVIDENCE ===",
        evidence_str,
        "",
        "=== CONTACT PERSONA SUMMARY ===",
        req.persona_summary or "none",
    ])

    messages = [
        {"role": "system", "content": updater_prompt},
        {"role": "user", "content": user_content},
    ]
    response = await complete_with_fallback(
        REASONING_MODELS,
        messages,
        endpoint="reasoning",
        temperature=0.3,
        max_tokens=512,
    )
    data = _parse_json(response.choices[0].message.content or "")
    return RelationshipState(
        state=data.get("state", "getting_acquainted"),
        state_changed=bool(data.get("state_changed", False)),
        previous_state=data.get("previous_state"),
        evidence=data.get("evidence", []),
        trajectory=data.get("trajectory", "unclear"),
        coaching_note=data.get("coaching_note", ""),
        confidence=float(data.get("confidence", 0.5)),
        updated_date=data.get("updated_date", date.today().isoformat()),
        model=response.model,
    )


@router.post("/relationship_build", response_model=RelationshipState)
async def build_relationship(req: RelationshipBuildRequest):
    """
    Initialize relationship state for a new contact (no prior relationship.json).
    Uses relationship/builder.md instead of updater.md.
    Uses Reasoning Layer (stateless). Output is written to relationship.json by frontend.
    """
    from datetime import date

    builder_prompt = _load_prompt("relationship/builder.md")
    evidence_str = json.dumps(req.compressed_evidence, ensure_ascii=False, indent=2)
    user_content = "\n".join([
        "=== CONVERSATION EVIDENCE ===",
        evidence_str,
        "",
        "=== CONTACT PERSONA SUMMARY ===",
        req.persona_summary or "none",
    ])

    messages = [
        {"role": "system", "content": builder_prompt},
        {"role": "user", "content": user_content},
    ]
    response = await complete_with_fallback(
        REASONING_MODELS,
        messages,
        endpoint="reasoning",
        temperature=0.3,
        max_tokens=512,
    )
    data = _parse_json(response.choices[0].message.content or "")
    return RelationshipState(
        state=data.get("state", "getting_acquainted"),
        state_changed=False,
        previous_state=None,
        evidence=data.get("evidence", []),
        trajectory=data.get("trajectory", "unclear"),
        coaching_note=data.get("coaching_note", ""),
        confidence=float(data.get("confidence", 0.5)),
        updated_date=data.get("updated_date", date.today().isoformat()),
        model=response.model,
    )
