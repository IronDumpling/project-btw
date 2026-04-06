"""
Capture Layer endpoints.

  POST /v1/capture/analyze
    Input : screenshot (base64 data-URL) + window_title
    Output: platform, contact_name, extracted messages

The analysis is done in a single LLM vision call — no separate OCR library
required. The vision model reads the screenshot image directly and returns
structured JSON.

Supported vision models (set VISION_MODEL in .env):
  groq/llama-3.2-11b-vision-preview   (default, uses existing GROQ_API_KEY)
  gpt-4o                               (needs OPENAI_API_KEY)
  claude-3-5-sonnet-20241022           (needs ANTHROPIC_API_KEY)
"""

import json
import logging

import litellm
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import VISION_MODEL

log = logging.getLogger("backend.capture")
router = APIRouter(prefix="/v1/capture", tags=["capture"])

_SYSTEM_PROMPT = """\
You are a chat screenshot analyzer. Given a screenshot of a messaging app, extract:
1. platform  — the app name (WeChat, WhatsApp, Telegram, LINE, iMessage, Discord, Slack, etc.)
2. contact_name — the person or group the user is chatting with
3. messages — all visible chat messages in order

Rules:
- Label each message as "user" (the device owner) or "contact".
- Include the full message text verbatim.
- If you cannot identify a chat interface, return null for platform and contact_name and an empty messages list.
- Respond ONLY with valid JSON — no markdown fences, no explanation.

JSON schema:
{
  "platform": "string | null",
  "contact_name": "string | null",
  "messages": [{"role": "user"|"contact", "text": "string"}],
  "confidence": 0.0-1.0
}
"""


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
    vision_model: str


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_screenshot(req: AnalyzeRequest):
    """
    Send a screenshot to the vision LLM.
    Returns structured platform / contact / message data.
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

    try:
        response = await litellm.acompletion(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=1024,
            temperature=0.1,
        )
    except litellm.AuthenticationError as e:
        raise HTTPException(status_code=401, detail={"error": "invalid_api_key", "message": str(e)})
    except litellm.BadRequestError as e:
        raise HTTPException(status_code=400, detail={"error": "bad_request", "message": str(e)})
    except Exception as e:
        log.exception("Vision model error")
        raise HTTPException(status_code=500, detail={"error": "vision_error", "message": str(e)})

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
        log.warning("Vision model returned non-JSON: %s", raw[:300])
        raise HTTPException(
            status_code=500,
            detail={"error": "parse_error", "message": f"Model returned non-JSON: {raw[:200]}"},
        )

    return AnalyzeResponse(
        platform=data.get("platform"),
        contact_name=data.get("contact_name"),
        messages=[ExtractedMessage(**m) for m in data.get("messages", [])],
        confidence=float(data.get("confidence", 0.0)),
        vision_model=VISION_MODEL,
    )
