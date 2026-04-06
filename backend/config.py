from dotenv import load_dotenv
import os

load_dotenv()

FAST_MODEL: str = os.getenv("FAST_MODEL", "groq/llama-3.3-70b-versatile")
CAPABLE_MODEL: str = os.getenv("CAPABLE_MODEL", "deepseek/deepseek-chat")

BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8765"))
