from dotenv import load_dotenv
import os

load_dotenv()


def parse_models(env_key: str, default: str) -> list[str]:
    """Parse a comma-separated model list from an env var."""
    return [m.strip() for m in os.getenv(env_key, default).split(",") if m.strip()]


# Capture Layer — screenshot OCR + parsing (must support image input)
CAPTURE_MODELS: list[str] = parse_models(
    "CAPTURE_MODELS",
    "gpt-4o,claude-3-5-sonnet-20241022",
)

# Real-time Engine — Subtext Analyzer, Reply Generator (latency < 1s, streaming)
REALTIME_MODELS: list[str] = parse_models(
    "REALTIME_MODELS",
    "groq/llama-3.3-70b-versatile,gpt-4o-mini",
)

# Background Engine — Compressor, Persona/Relationship Updaters (quality + cost gradient)
BACKGROUND_MODELS: list[str] = parse_models(
    "BACKGROUND_MODELS",
    "gpt-5.1,gpt-4o-mini,claude-3-5-sonnet-20241022,deepseek/deepseek-chat",
)

BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8765"))
