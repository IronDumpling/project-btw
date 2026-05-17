import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

import supabase_mobile_store
from config import LEARNING_MODELS, REASONING_MODELS
from utils import complete_with_fallback
from routers.perception import AnalyzeRequest as PerceptionAnalyzeRequest
from routers.perception import analyze_screenshot

router = APIRouter(prefix="/v1/mobile", tags=["mobile"])
bearer = HTTPBearer(auto_error=False)


class AuthRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    display_name: str = ""


class UserProfile(BaseModel):
    id: str
    email: str
    email_verified: bool = False
    display_name: str = ""
    onboarding: dict[str, Any] = {}
    persona_summary: str = ""
    persona_markdown: str = ""
    memory_markdown: str = ""
    created_at: str
    updated_at: str


class AuthResponse(BaseModel):
    token: str
    expires_at: str
    user: UserProfile


class ProfilePatch(BaseModel):
    display_name: str | None = None


class IdentityData(BaseModel):
    nicknames: list[str] = []
    age_range: str = ""
    occupation: str = ""
    mbti: str = ""
    zodiac: str = ""


class CommunicationData(BaseModel):
    mode: str = "simple"
    materials: str = ""
    message_format: str = ""
    emoji_usage: str = ""
    punctuation_habits: list[str] = []
    reply_speed: str = ""
    catchphrases: list[str] = []


class EmotionalData(BaseModel):
    attachment_style: str = ""
    love_languages: list[str] = []
    conflict_response: str = ""
    when_interested: str = ""


class RelationshipData(BaseModel):
    role: str = ""
    valued_traits: list[str] = []
    dealbreakers: str = ""


class OnboardingForm(BaseModel):
    identity: IdentityData = Field(default_factory=IdentityData)
    communication: CommunicationData = Field(default_factory=CommunicationData)
    emotional: EmotionalData = Field(default_factory=EmotionalData)
    relationship: RelationshipData = Field(default_factory=RelationshipData)


class OnboardingRequest(BaseModel):
    form: OnboardingForm
    locale: str = "en"
    display_labels: dict[str, Any] = {}


class OnboardingResponse(BaseModel):
    personaMarkdown: str
    memoryMarkdown: str
    model: str
    updatedAt: str
    usage: dict[str, int] = {}


class ImportedConversation(BaseModel):
    id: str
    sourceType: str
    sourceTimestamp: str
    contactId: str | None = None
    messages: list[dict[str, str]]
    rawText: str | None = None
    localScreenshotUri: str | None = None
    confidence: float = 0.5


class AnalysisResult(BaseModel):
    id: str
    conversationId: str
    tone: str
    intent: str
    subtext: str
    relationshipSignal: str
    confidence: float
    riskFlags: list[str] = []
    reasoningSummary: str


class MemoryPatch(BaseModel):
    id: str
    contactId: str
    proposedAdditions: list[str]
    evidence: list[str]
    status: str = "pending"
    createdAt: str


class Contact(BaseModel):
    id: str
    displayName: str
    aliases: list[str] = []
    relationshipType: str = ""
    notes: str = ""
    localMemorySummary: str = ""
    lastAnalysisAt: str = ""
    syncStatus: str = "synced"
    createdAt: str = ""
    updatedAt: str = ""


class ContactRequest(BaseModel):
    displayName: str = Field(min_length=1)
    aliases: list[str] = []
    relationshipType: str = ""
    notes: str = ""
    localMemorySummary: str = ""


class ContactPatch(BaseModel):
    displayName: str | None = None
    aliases: list[str] | None = None
    relationshipType: str | None = None
    notes: str | None = None
    localMemorySummary: str | None = None


class ImportAnalyzeRequest(BaseModel):
    sourceType: str = "text"
    rawText: str | None = None
    screenshotDataUri: str | None = None
    localScreenshotUri: str | None = None
    contactId: str | None = None
    contactName: str | None = None
    locale: str = "en"


class ImportAnalyzeResponse(BaseModel):
    conversation: ImportedConversation
    analysis: AnalysisResult
    memoryPatch: MemoryPatch | None = None
    model: str


class ReplyGenerateRequest(BaseModel):
    style: str
    locale: str = "en"
    conversation: dict[str, Any] | None = None
    analysis: dict[str, Any] | None = None
    userPersona: str = ""


class ReplyDraft(BaseModel):
    id: str
    analysisId: str
    style: str
    text: str
    rationale: str
    cautionLevel: str = "low"


class ReplyGenerateResponse(BaseModel):
    drafts: list[ReplyDraft]
    model: str


class MemoryCommitRequest(BaseModel):
    patch: MemoryPatch
    confirm: bool = False
    locale: str = "en"


class MemoryPatchUpdateRequest(BaseModel):
    status: str
    proposedAdditions: list[str] | None = None


class PrivacyExportResponse(BaseModel):
    profile: dict[str, Any]
    contacts: list[dict[str, Any]]
    memoryPatches: list[dict[str, Any]]
    savedReplies: list[dict[str, Any]] = []


def current_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail={"error": "missing_token"})
    return credentials.credentials


async def current_context(token: Annotated[str, Depends(current_token)]) -> dict[str, Any]:
    try:
        auth_user = await supabase_mobile_store.get_auth_user(token)
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "auth_service_unavailable", "message": str(exc)}) from exc
    if auth_user is None:
        raise HTTPException(status_code=401, detail={"error": "invalid_or_expired_token"})
    if not supabase_mobile_store.is_email_verified(auth_user):
        raise HTTPException(status_code=401, detail={"error": "email_not_verified"})
    try:
        user = await supabase_mobile_store.get_profile(token, auth_user)
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "profile_service_unavailable", "message": str(exc)}) from exc
    return {"token": token, "auth_user": auth_user, "user": user}


@router.post("/auth/register", response_model=AuthResponse)
async def register(_: AuthRequest):
    raise HTTPException(status_code=410, detail={"error": "managed_auth_required"})


@router.post("/auth/login", response_model=AuthResponse)
async def login(_: AuthRequest):
    raise HTTPException(status_code=410, detail={"error": "managed_auth_required"})


@router.get("/auth/me", response_model=UserProfile)
async def me(context: Annotated[dict[str, Any], Depends(current_context)]):
    return context["user"]


@router.patch("/auth/me", response_model=UserProfile)
async def update_me(req: ProfilePatch, context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        return await supabase_mobile_store.update_profile(
            context["token"],
            context["auth_user"],
            display_name=req.display_name,
        )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "profile_update_failed", "message": str(exc)}) from exc


@router.post("/auth/logout")
async def logout(_: Annotated[str, Depends(current_token)]):
    return {"status": "ok"}


@router.get("/privacy/export", response_model=PrivacyExportResponse)
async def export_privacy_data(context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        return await supabase_mobile_store.export_user_data(context["token"], context["auth_user"])
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "privacy_export_failed", "message": str(exc)}) from exc


@router.delete("/account")
async def delete_account(context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        await supabase_mobile_store.delete_account(context["token"], context["auth_user"])
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "account_delete_failed", "message": str(exc)}) from exc
    return {"status": "deleted"}


def _prompt_text(relative_path: str) -> str:
    return (Path(__file__).resolve().parents[1] / relative_path).read_text(encoding="utf-8")


PERSONA_BUILD_SYSTEM_PROMPT = (
    _prompt_text("prompts/persona/user_builder.md")
    + "\n\n"
    + _prompt_text("prompts/persona/schema.md")
    + """

Output a single raw Markdown document — no code fences, no explanation. Start directly with the heading.

Produce exactly these five sections:

# User Persona

> Self-report onboarding data. Used by Real-time Engine to calibrate reply tone and subtext analysis.

## Hard Rules
3-5 specific behavioral rules derived from the attachment style, conflict response, and dealbreakers. Phrased as direct imperatives ("Does not...", "Never...", "Always...").

## Identity
- Nicknames (all of them, comma-separated — these are the names by which the system will recognize this user in captured screenshots)
- Age range, occupation, MBTI, zodiac
- A one-sentence summary of who this person is

## Communication Style
- Message format, emoji usage, punctuation habits, reply speed, catchphrases — mark each as [self-reported] or [from materials]
- What each reveals about personality
- An overall style note (1-2 sentences)

## Emotional Pattern
- Attachment style with concrete behavioral manifestations in messaging
- Love languages and what they mean for digital communication
- Conflict response pattern (triggers, duration, resolution signals)
- When interested in someone
- Inferred emotional triggers

## Relationship Behavior
- Relational role (who texts first, who sets emotional tone)
- Core values in others and how violations manifest
- Dealbreakers and behavioral response when triggered
- Coaching note: how the reply generator should adapt (tone, approaches to avoid)

Rules:
1. Write in third person ("They send messages in short bursts")
2. Every field must be actionable for a reply generator
3. Hard Rules must be direct imperatives
4. Total 400-600 words. Dense, not padded.
5. Output raw Markdown only — no fences, no JSON
6. MBTI "不知道" / "unknown" / "Not sure" → omit MBTI. Zodiac "跳过" / "skip" / "Skip" → omit zodiac.
7. Mark form-derived fields as [self-reported]; fields extracted from materials as [from materials].

## When Materials Are Provided

If the input contains "Additional materials:", extract communication patterns from them.
Materials take priority over form selections for Communication Style (Layer 2).

Extract from materials:
- Catchphrases: actual repeated phrases observed (minimum 2 required if materials are long enough)
- Message format: burst vs. long-form, observed across messages
- Emoji usage: frequency and specific emojis actually used
- Punctuation signature: what their punctuation choices reveal
- Reply energy: engagement level observable from patterns

Fields not derivable from materials (attachment style, love languages, conflict response)
come from the form data and remain marked [self-reported].
"""
)

USER_MEMORY_BUILD_PROMPT = """You are building a factual self-knowledge file for the user. Read the onboarding data and produce user/memory.md.

Output raw Markdown only — no code fences, no explanation. Start directly with the heading.

Structure:

# User Memory
> Source: onboarding self-report[+ materials analysis if applicable].

## Core Identity
Name/aliases (all nicknames), age range, occupation, MBTI, zodiac — from form. Omit fields the user skipped.

## Values & Philosophy
Valued traits in others, dealbreakers, love languages — from form.

## Communication Facts
Factual communication habits — from form or materials if provided. Include specific catchphrases and emoji actually observed in materials.

## Relationship Role
Role in relationships, how they initiate or respond — from form.

## Life Context
ONLY if materials contain life context clues (locations, relationships, events, names). Otherwise write exactly: [insufficient data — to be enriched over time]

Rules:
1. Write in first person ("I prefer...", "My nickname is...")
2. Only write facts derivable from the input — no invention
3. When materials are provided, prefer material evidence over form selections for Communication Facts
4. Keep each section under 60 words
5. Output raw Markdown only"""


async def _generate_markdown(system_prompt: str, user_message: str, max_tokens: int, temperature: float):
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]
    return await complete_with_fallback(
        LEARNING_MODELS,
        messages,
        endpoint="mobile_onboarding",
        max_tokens=max_tokens,
        temperature=temperature,
    )


def _usage_dict(response) -> dict[str, int]:
    if not response.usage:
        return {}
    return {
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "total_tokens": response.usage.total_tokens,
    }


def _language_instruction(locale: str) -> str:
    return "Respond in Simplified Chinese." if locale.lower().startswith("zh") else "Respond in English."


def _mobile_text(locale: str, key: str) -> str:
    messages = {
        "text_import_only": {
            "en": "Use pasted text or choose a screenshot first.",
            "zh": "请先粘贴文本或选择截图。"
        },
        "empty_conversation": {
            "en": "Paste a conversation first.",
            "zh": "请先粘贴聊天内容。"
        },
        "empty_screenshot": {
            "en": "Choose a screenshot first.",
            "zh": "请先选择截图。"
        },
        "no_messages_found": {
            "en": "No chat messages were detected in this screenshot.",
            "zh": "这张截图中没有识别到聊天消息。"
        },
        "missing_analysis": {
            "en": "Run a conversation analysis first.",
            "zh": "请先完成一次对话分析。"
        },
        "confirmation_required": {
            "en": "Memory changes require explicit confirmation.",
            "zh": "记忆更新必须经过明确确认。"
        },
        "empty_memory_patch": {
            "en": "There is no memory to save.",
            "zh": "没有可保存的记忆。"
        },
        "unclear": {
            "en": "unclear",
            "zh": "不明确"
        },
        "generated_fallback": {
            "en": "Generated fallback.",
            "zh": "生成的备用结果。"
        },
        "memory_heading": {
            "en": "## Approved Relationship Memory",
            "zh": "## 已确认的关系记忆"
        },
        "relationship_default": {
            "en": "Relationship",
            "zh": "关系对象"
        },
    }
    lang = "zh" if locale.lower().startswith("zh") else "en"
    return messages.get(key, {}).get(lang, key)


def _strip_fences(content: str) -> str:
    raw = content.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _parse_json_object(content: str) -> dict[str, Any]:
    try:
        parsed = json.loads(_strip_fences(content))
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_pasted_messages(raw_text: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    for line in raw_text.splitlines():
        text = line.strip()
        if not text:
            continue
        lowered = text.lower()
        role = "contact"
        for prefix in ("me:", "me：", "you:", "you：", "我:", "我："):
            if lowered.startswith(prefix):
                role = "user"
                text = text[len(prefix):].strip()
                break
        for prefix in ("them:", "them：", "对方:", "对方：", "ta:", "ta："):
            if lowered.startswith(prefix):
                role = "contact"
                text = text[len(prefix):].strip()
                break
        if text:
            messages.append({"role": role, "text": text})
    if not messages and raw_text.strip():
        messages.append({"role": "contact", "text": raw_text.strip()})
    return messages


def _summary(form: OnboardingForm) -> str:
    identity = form.identity
    names = ", ".join(identity.nicknames) if identity.nicknames else "No nicknames"
    return f"{names}; {form.communication.message_format or form.communication.mode}; {form.emotional.attachment_style or 'attachment unknown'}"


@router.post("/onboarding/generate", response_model=OnboardingResponse)
async def generate_onboarding(
    req: OnboardingRequest,
    context: Annotated[dict[str, Any], Depends(current_context)],
):
    form_json = req.form.model_dump()
    has_materials = req.form.communication.mode == "complex" and req.form.communication.materials.strip()
    materials_section = (
        f"\n\nAdditional materials (chat logs / diary / notes):\n{req.form.communication.materials.strip()}"
        if has_materials
        else ""
    )
    display_labels_section = (
        f"\n\nLocalized display labels for this locale:\n{json.dumps(req.display_labels, ensure_ascii=False, indent=2)}"
        if req.display_labels
        else ""
    )
    user_message = (
        f"{_language_instruction(req.locale)}\n\n"
        f"Generate based on this onboarding data:\n{json.dumps(form_json, ensure_ascii=False, indent=2)}"
        f"{display_labels_section}{materials_section}"
    )

    persona_res, memory_res = await asyncio.gather(
        _generate_markdown(PERSONA_BUILD_SYSTEM_PROMPT, user_message, max_tokens=1200, temperature=0.4),
        _generate_markdown(USER_MEMORY_BUILD_PROMPT, user_message, max_tokens=800, temperature=0.3),
    )
    persona_markdown = (persona_res.choices[0].message.content or "").strip()
    memory_markdown = (memory_res.choices[0].message.content or "").strip()
    try:
        updated_user = await supabase_mobile_store.update_profile(
            context["token"],
            context["auth_user"],
            onboarding=form_json,
            persona_summary=_summary(req.form),
            persona_markdown=persona_markdown,
            memory_markdown=memory_markdown,
        )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "profile_update_failed", "message": str(exc)}) from exc
    usage = _usage_dict(persona_res)
    memory_usage = _usage_dict(memory_res)
    if memory_usage:
        usage = {
            "prompt_tokens": usage.get("prompt_tokens", 0) + memory_usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0) + memory_usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0) + memory_usage.get("total_tokens", 0),
        }
    return {
        "personaMarkdown": persona_markdown,
        "memoryMarkdown": memory_markdown,
        "model": persona_res.model,
        "updatedAt": updated_user["updated_at"],
        "usage": usage,
    }


@router.delete("/persona")
async def delete_persona(context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        updated_user = await supabase_mobile_store.update_profile(
            context["token"],
            context["auth_user"],
            onboarding={},
            persona_summary="",
            persona_markdown="",
            memory_markdown="",
        )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "profile_update_failed", "message": str(exc)}) from exc
    return {"status": "ok", "user": updated_user}


async def _analyze_import_messages(
    *,
    req: ImportAnalyzeRequest,
    context: dict[str, Any],
    messages: list[dict[str, str]],
    contact_id: str,
    raw_text: str | None,
    local_screenshot_uri: str | None,
    confidence: float,
    model_prefix: str = "",
) -> dict[str, Any]:
    conversation_id = str(uuid.uuid4())
    analysis_id = str(uuid.uuid4())
    conversation = ImportedConversation(
        id=conversation_id,
        sourceType=req.sourceType,
        sourceTimestamp=_now_iso(),
        contactId=contact_id,
        messages=messages,
        rawText=raw_text,
        localScreenshotUri=local_screenshot_uri,
        confidence=confidence,
    )

    prompt = f"""
You are a relationship communication coach. Analyze the conversation without diagnosing anyone.
{_language_instruction(req.locale)}

Return JSON only with these keys:
tone, intent, subtext, relationshipSignal, confidence, riskFlags, reasoningSummary,
memoryAdditions, evidence.

Rules:
- Keep riskFlags as short strings.
- memoryAdditions must include only durable relationship facts or patterns worth saving.
- If evidence is weak, return an empty memoryAdditions array.
- confidence must be between 0 and 1.
"""
    user_context = context["user"].get("persona_summary") or context["user"].get("persona_markdown")[:800]
    user_message = "\n".join([
        "User persona context:",
        user_context or "none",
        "",
        "Conversation:",
        json.dumps(messages, ensure_ascii=False, indent=2),
    ])
    response = await complete_with_fallback(
        REASONING_MODELS,
        [{"role": "system", "content": prompt}, {"role": "user", "content": user_message}],
        endpoint="mobile_import",
        temperature=0.35,
        max_tokens=900,
    )
    data = _parse_json_object(response.choices[0].message.content or "")
    analysis = AnalysisResult(
        id=analysis_id,
        conversationId=conversation_id,
        tone=data.get("tone", _mobile_text(req.locale, "unclear")),
        intent=data.get("intent", _mobile_text(req.locale, "unclear")),
        subtext=data.get("subtext", ""),
        relationshipSignal=data.get("relationshipSignal", ""),
        confidence=float(data.get("confidence", 0.5)),
        riskFlags=data.get("riskFlags", []) if isinstance(data.get("riskFlags", []), list) else [],
        reasoningSummary=data.get("reasoningSummary", ""),
    )
    additions = data.get("memoryAdditions", [])
    evidence = data.get("evidence", [])
    memory_patch = None
    if isinstance(additions, list) and additions:
        try:
            memory_patch = await supabase_mobile_store.create_memory_patch(
                context["token"],
                context["auth_user"],
                contact_id=contact_id,
                proposed_additions=[str(item) for item in additions[:5]],
                evidence=[str(item) for item in evidence[:5]] if isinstance(evidence, list) else [],
            )
        except supabase_mobile_store.SupabaseMobileError:
            memory_patch = MemoryPatch(
                id=str(uuid.uuid4()),
                contactId=contact_id,
                proposedAdditions=[str(item) for item in additions[:5]],
                evidence=[str(item) for item in evidence[:5]] if isinstance(evidence, list) else [],
                status="pending",
                createdAt=_now_iso(),
            ).model_dump()
    return {"conversation": conversation, "analysis": analysis, "memoryPatch": memory_patch, "model": f"{model_prefix}{response.model}"}


@router.post("/import/analyze", response_model=ImportAnalyzeResponse)
async def analyze_import(
    req: ImportAnalyzeRequest,
    context: Annotated[dict[str, Any], Depends(current_context)],
):
    if req.sourceType == "text":
        raw_text = (req.rawText or "").strip()
        if not raw_text:
            raise HTTPException(status_code=400, detail={"error": "empty_conversation", "message": _mobile_text(req.locale, "empty_conversation")})
        contact = await supabase_mobile_store.find_or_create_contact(
            context["token"],
            context["auth_user"],
            contact_id=req.contactId,
            display_name=req.contactName or _mobile_text(req.locale, "relationship_default"),
        )
        return await _analyze_import_messages(
            req=req,
            context=context,
            messages=_parse_pasted_messages(raw_text),
            contact_id=contact["id"],
            raw_text=raw_text,
            local_screenshot_uri=None,
            confidence=0.75,
        )

    if req.sourceType == "screenshot":
        if not req.screenshotDataUri:
            raise HTTPException(status_code=400, detail={"error": "empty_screenshot", "message": _mobile_text(req.locale, "empty_screenshot")})
        perception = await analyze_screenshot(PerceptionAnalyzeRequest(screenshot=req.screenshotDataUri, window_title=req.contactName or "mobile import"))
        messages = [message.model_dump() for message in perception.messages]
        if not messages:
            raise HTTPException(status_code=400, detail={"error": "no_messages_found", "message": _mobile_text(req.locale, "no_messages_found")})
        contact = await supabase_mobile_store.find_or_create_contact(
            context["token"],
            context["auth_user"],
            contact_id=req.contactId,
            display_name=req.contactName or perception.contact_name or _mobile_text(req.locale, "relationship_default"),
        )
        return await _analyze_import_messages(
            req=req,
            context=context,
            messages=messages,
            contact_id=contact["id"],
            raw_text=None,
            local_screenshot_uri=req.localScreenshotUri,
            confidence=perception.confidence,
            model_prefix=f"{perception.vision_model} + ",
        )

    raise HTTPException(status_code=400, detail={"error": "unsupported_import", "message": _mobile_text(req.locale, "text_import_only")})


@router.post("/reply/generate", response_model=ReplyGenerateResponse)
async def generate_replies(
    req: ReplyGenerateRequest,
    _: Annotated[dict[str, Any], Depends(current_context)],
):
    if not req.conversation or not req.analysis:
        raise HTTPException(status_code=400, detail={"error": "missing_analysis", "message": _mobile_text(req.locale, "missing_analysis")})

    prompt = f"""
You generate relationship reply drafts. Do not diagnose. Do not pressure the user to reply.
{_language_instruction(req.locale)}

Return JSON only:
{{"drafts":[{{"text":"...","rationale":"...","cautionLevel":"none|low|medium|high"}}]}}

Draft style: {req.style}
Return 2 or 3 drafts. Keep them natural and concise.
"""
    user_message = json.dumps(
        {
            "userPersona": req.userPersona,
            "conversation": req.conversation,
            "analysis": req.analysis,
        },
        ensure_ascii=False,
        indent=2,
    )
    response = await complete_with_fallback(
        REASONING_MODELS,
        [{"role": "system", "content": prompt}, {"role": "user", "content": user_message}],
        endpoint="mobile_reply",
        temperature=0.7,
        max_tokens=900,
    )
    data = _parse_json_object(response.choices[0].message.content or "")
    raw_drafts = data.get("drafts", [])
    if not isinstance(raw_drafts, list) or not raw_drafts:
        raw_drafts = [{"text": response.choices[0].message.content or "", "rationale": _mobile_text(req.locale, "generated_fallback"), "cautionLevel": "low"}]
    analysis_id = str(req.analysis.get("id") or "")
    drafts = [
        ReplyDraft(
            id=str(uuid.uuid4()),
            analysisId=analysis_id,
            style=req.style,
            text=str(item.get("text", "")) if isinstance(item, dict) else str(item),
            rationale=str(item.get("rationale", "")) if isinstance(item, dict) else "",
            cautionLevel=str(item.get("cautionLevel", "low")) if isinstance(item, dict) else "low",
        )
        for item in raw_drafts[:3]
    ]
    return {"drafts": drafts, "model": response.model}


@router.post("/memory/commit")
async def commit_memory(
    req: MemoryCommitRequest,
    context: Annotated[dict[str, Any], Depends(current_context)],
):
    if not req.confirm:
        raise HTTPException(status_code=400, detail={"error": "confirmation_required", "message": _mobile_text(req.locale, "confirmation_required")})
    additions = [item.strip() for item in req.patch.proposedAdditions if item.strip()]
    if not additions:
        raise HTTPException(status_code=400, detail={"error": "empty_memory_patch", "message": _mobile_text(req.locale, "empty_memory_patch")})
    current_memory = context["user"].get("memory_markdown") or "# User Memory\n"
    block_title = _mobile_text(req.locale, "memory_heading")
    next_memory = current_memory.rstrip() + "\n\n" + block_title + "\n" + "\n".join(f"- {item}" for item in additions) + "\n"
    try:
        updated_user = await supabase_mobile_store.update_profile(
            context["token"],
            context["auth_user"],
            memory_markdown=next_memory,
        )
        await supabase_mobile_store.update_memory_patch_status(
            context["token"],
            context["auth_user"],
            req.patch.id,
            status="approved",
            proposed_additions=additions,
        )
        if req.patch.contactId and req.patch.contactId != "default":
            await supabase_mobile_store.update_contact(
                context["token"],
                context["auth_user"],
                req.patch.contactId,
                memory_summary="\n".join(additions),
            )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "profile_update_failed", "message": str(exc)}) from exc
    return {"memorySummary": "\n".join(additions), "user": updated_user}


@router.get("/memory/patches")
async def list_memory_patches(context: Annotated[dict[str, Any], Depends(current_context)], status: str | None = None):
    try:
        patches = await supabase_mobile_store.list_memory_patches(context["token"], context["auth_user"]["id"], status=status)
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "memory_patch_list_failed", "message": str(exc)}) from exc
    return {"patches": patches}


@router.patch("/memory/patches/{patch_id}")
async def update_memory_patch(
    patch_id: str,
    req: MemoryPatchUpdateRequest,
    context: Annotated[dict[str, Any], Depends(current_context)],
):
    if req.status not in {"pending", "approved", "edited", "rejected"}:
        raise HTTPException(status_code=400, detail={"error": "invalid_status"})
    try:
        patch = await supabase_mobile_store.update_memory_patch_status(
            context["token"],
            context["auth_user"],
            patch_id,
            status=req.status,
            proposed_additions=req.proposedAdditions,
        )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "memory_patch_update_failed", "message": str(exc)}) from exc
    return {"patch": patch}


@router.get("/contacts")
async def list_contacts(context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        contacts = await supabase_mobile_store.list_contacts(context["token"], context["auth_user"]["id"])
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "contact_list_failed", "message": str(exc)}) from exc
    return {"contacts": contacts}


@router.post("/contacts", response_model=Contact)
async def create_contact(req: ContactRequest, context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        return await supabase_mobile_store.create_contact(
            context["token"],
            context["auth_user"],
            display_name=req.displayName,
            aliases=req.aliases,
            relationship_type=req.relationshipType,
            notes=req.notes,
            memory_summary=req.localMemorySummary,
        )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "contact_create_failed", "message": str(exc)}) from exc


@router.patch("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, req: ContactPatch, context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        return await supabase_mobile_store.update_contact(
            context["token"],
            context["auth_user"],
            contact_id,
            display_name=req.displayName,
            aliases=req.aliases,
            relationship_type=req.relationshipType,
            notes=req.notes,
            memory_summary=req.localMemorySummary,
        )
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "contact_update_failed", "message": str(exc)}) from exc


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, context: Annotated[dict[str, Any], Depends(current_context)]):
    try:
        await supabase_mobile_store.delete_contact(context["token"], context["auth_user"], contact_id)
    except supabase_mobile_store.SupabaseMobileError as exc:
        raise HTTPException(status_code=503, detail={"error": "contact_delete_failed", "message": str(exc)}) from exc
    return {"status": "ok"}
