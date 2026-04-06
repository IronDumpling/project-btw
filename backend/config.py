from dotenv import load_dotenv
import os

load_dotenv()

FAST_MODEL: str = os.getenv("FAST_MODEL", "groq/llama-3.3-70b-versatile")
CAPABLE_MODEL: str = os.getenv("CAPABLE_MODEL", "deepseek/deepseek-chat")
# Vision model for screenshot analysis (must support image input).
# groq/llama-3.2-11b-vision-preview works with your existing GROQ_API_KEY.
VISION_MODEL: str = os.getenv("VISION_MODEL", "groq/llama-3.2-11b-vision-preview")

BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8765"))
