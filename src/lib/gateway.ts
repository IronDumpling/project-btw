/**
 * project-btw backend client
 *
 * Talks to the local Python backend at http://127.0.0.1:8765
 *
 * Routing is governance-based, not speed-based:
 *
 *   analyzePerception  → Perception Layer (/v1/perception/analyze)
 *                        Stateless, vision LLM, auto-triggered by hotkey.
 *
 *   chatReasoning      → Reasoning Layer (/v1/reasoning/chat)
 *                        Stateless, low-latency, Subtext Analyzer + Reply Generator.
 *                        Safe to auto-retry on failure.
 *
 *   chatLearning       → Learning Layer (/v1/learning/chat)
 *                        STATEFUL — writes persona/relationship files.
 *                        Requires explicit user confirmation (confirm: true).
 *                        Use buildContext() from contextAssembler before calling.
 */

import { listen } from "@tauri-apps/api/event";

const BASE_URL = "http://127.0.0.1:8765";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Capture types (mirrors Rust CaptureResult + backend AnalyzeResponse)
export interface CaptureEvent {
  screenshot: string;   // base64-encoded PNG
  window_title: string;
  timestamp: string;    // ISO-8601
}

export interface ExtractedMessage {
  role: "user" | "contact";
  text: string;
}

export interface AnalyzeResponse {
  platform: string | null;
  contact_name: string | null;
  messages: ExtractedMessage[];
  confidence: number;
  vision_model: string;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

async function post(endpoint: string, body: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Stream SSE tokens. Calls onToken for each chunk, returns full text. */
async function stream(
  endpoint: string,
  body: ChatRequest,
  onToken: (token: string) => void,
): Promise<string> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok) throw new Error(`Gateway stream error ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const { content } = JSON.parse(data) as { content: string };
        full += content;
        onToken(content);
      } catch {
        // ignore malformed chunks
      }
    }
  }
  return full;
}

// ── Governance-based API (canonical) ──────────────────────────────────────────

/** Perception Layer — send screenshot to vision LLM. Stateless, auto-triggered. */
export async function analyzePerception(
  screenshot: string,
  windowTitle: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/v1/perception/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ screenshot, window_title: windowTitle }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perception error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Reasoning Layer — Subtext Analyzer, Reply Generator. Stateless, safe to retry. */
export const chatReasoning = (req: ChatRequest) => post("/v1/reasoning/chat", req);
export const streamReasoning = (req: ChatRequest, onToken: (t: string) => void) =>
  stream("/v1/reasoning/chat", req, onToken);

/** Learning Layer — Persona/Relationship Updaters. STATEFUL — writes Storage.
 *  Requires confirm: true in request metadata to enforce explicit user confirmation.
 *  Always use buildContext() from contextAssembler.ts before calling. */
export async function chatLearning(req: ChatRequest): Promise<ChatResponse> {
  const body = { ...req, confirm: true };
  const res = await fetch(`${BASE_URL}/v1/learning/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Learning error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Intelligence Layer calls ───────────────────────────────────────────────────

export interface IntelligenceRequest {
  contact_name: string;
  messages: ExtractedMessage[];
  user_context?: string;    // assembled by contextAssembler.buildContext()
  contact_context?: string;
}

export interface SubtextResult {
  subtext: string;
  tone: string;
  intent: string;
  confidence: number;
  reasoning: string;
}

export interface IntelligenceResponse {
  subtext: SubtextResult;
  model: string;
}

export interface PipelineResponse {
  subtext: SubtextResult;
  reply_drafts: Array<{ text: string; approach: string; note?: string }>;
  model: string;
}

/** Run subtext analysis only (Reasoning Layer) */
export async function analyzeIntelligence(
  req: IntelligenceRequest,
): Promise<IntelligenceResponse> {
  const res = await fetch(`${BASE_URL}/v1/intelligence/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intelligence analyze error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Run subtext + reply drafts in sequence (Reasoning Layer) */
export async function runIntelligencePipeline(
  req: IntelligenceRequest,
): Promise<PipelineResponse> {
  const res = await fetch(`${BASE_URL}/v1/intelligence/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intelligence pipeline error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Listen for Ctrl+Shift+B capture events emitted by Rust */
export function onCaptureTriggered(
  callback: (event: CaptureEvent) => void,
): Promise<() => void> {
  return listen<CaptureEvent>("btw-capture", (e) => callback(e.payload));
}

/** Health check — true if backend is reachable */
export async function backendHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
