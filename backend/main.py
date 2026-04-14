"""
project-btw Backend
FastAPI server: LLM Gateway + Intelligence Layer routing.

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

from config import (
    BACKEND_HOST,
    BACKEND_PORT,
    PERCEPTION_MODELS,
    REASONING_MODELS,
    LEARNING_MODELS,
)
from routers import perception, reasoning, learning, intelligence

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("project-btw backend starting")
    log.info(f"  perception -> {PERCEPTION_MODELS}")
    log.info(f"  reasoning  -> {REASONING_MODELS}")
    log.info(f"  learning   -> {LEARNING_MODELS}")
    log.info(f"  listening on http://{BACKEND_HOST}:{BACKEND_PORT}")
    yield


app = FastAPI(
    title="project-btw Backend",
    description="Intelligence Layer + LLM Gateway — Perception / Reasoning / Learning routing",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(perception.router)
app.include_router(reasoning.router)
app.include_router(learning.router)
app.include_router(intelligence.router)


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
    log.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"error": "internal_error", "detail": str(exc)})


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "perception_models": PERCEPTION_MODELS,
        "reasoning_models": REASONING_MODELS,
        "learning_models": LEARNING_MODELS,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=False)
