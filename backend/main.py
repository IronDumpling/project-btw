"""
project-btw LLM Gateway
FastAPI server wrapping LiteLLM for fast / capable model routing.

Start:
    python main.py
or:
    uvicorn main:app --host 127.0.0.1 --port 8765 --reload
"""

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import litellm

from config import BACKEND_HOST, BACKEND_PORT, FAST_MODEL, CAPABLE_MODEL
from routers import chat

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("gateway")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("project-btw LLM Gateway starting")
    log.info(f"  fast    -> {FAST_MODEL}")
    log.info(f"  capable -> {CAPABLE_MODEL}")
    log.info(f"  listening on http://{BACKEND_HOST}:{BACKEND_PORT}")
    yield


app = FastAPI(
    title="project-btw LLM Gateway",
    description="Fast (real-time) and capable (background) model routing via LiteLLM",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)


@app.exception_handler(litellm.AuthenticationError)
async def auth_error_handler(_: Request, exc: litellm.AuthenticationError):
    return JSONResponse(status_code=401, content={"error": "invalid_api_key", "detail": str(exc)})


@app.exception_handler(litellm.RateLimitError)
async def rate_limit_handler(_: Request, exc: litellm.RateLimitError):
    return JSONResponse(status_code=429, content={"error": "rate_limit", "detail": str(exc)})


@app.exception_handler(litellm.BadRequestError)
async def bad_request_handler(_: Request, exc: litellm.BadRequestError):
    return JSONResponse(status_code=400, content={"error": "bad_request", "detail": str(exc)})


@app.exception_handler(Exception)
async def generic_handler(_: Request, exc: Exception):
    log.exception("Unhandled gateway error")
    return JSONResponse(status_code=500, content={"error": "internal_error", "detail": str(exc)})


@app.get("/health")
async def health():
    return {"status": "ok", "fast_model": FAST_MODEL, "capable_model": CAPABLE_MODEL}


if __name__ == "__main__":
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=False)
