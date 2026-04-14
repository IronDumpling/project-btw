from dotenv import load_dotenv
import os

load_dotenv()


def parse_models(env_key: str, default: str) -> list[str]:
    """Parse a comma-separated model list from an env var."""
    return [m.strip() for m in os.getenv(env_key, default).split(",") if m.strip()]


# ── Governance-based routing (Perception / Reasoning / Learning) ──────────────
#
# Three layers differ in *governance needs*, not speed:
#   Perception — stateless, vision-capable, auto-triggered by hotkey
#   Reasoning  — stateless, low-latency, auto-triggered after perception
#   Learning   — stateful (writes Storage), requires explicit user confirm

# Perception Layer — screenshot OCR + parsing (must support image input)
PERCEPTION_MODELS: list[str] = parse_models(
    "PERCEPTION_MODELS",
    "gpt-4o,claude-3-5-sonnet-20241022",
)

# Reasoning Layer — Subtext Analyzer, Reply Generator (stateless, low-latency)
REASONING_MODELS: list[str] = parse_models(
    "REASONING_MODELS",
    "groq/llama-3.3-70b-versatile,gpt-4o-mini",
)

# Learning Layer — Persona/Relationship Updaters (stateful writes, quality-first)
LEARNING_MODELS: list[str] = parse_models(
    "LEARNING_MODELS",
    "gpt-4.1,gpt-4o-mini,claude-3-5-sonnet-20241022,deepseek/deepseek-chat",
)

# ── Backward-compat aliases (old routers still import these) ──────────────────
CAPTURE_MODELS = PERCEPTION_MODELS
REALTIME_MODELS = REASONING_MODELS
BACKGROUND_MODELS = LEARNING_MODELS

# ── Context Budget (tokens per section injected into each LLM call) ───────────
# Prevents context rot as persona files grow over time.
# Priority order: Hard Rules (never cut) > Identity > Communication Style >
#                 Contact persona > Conversation messages
CONTEXT_BUDGETS: dict[str, int] = {
    "user_core": 500,          # Hard Rules + Identity sections combined
    "contact_relevant": 300,   # contact persona relevant sections
    "conversation_max": 1000,  # current conversation messages
}

BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8765"))
