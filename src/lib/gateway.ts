/**
 * project-btw backend client
 *
 * Talks to the local Python backend at http://127.0.0.1:8765
 *
 * Three routing scenarios aligned with Intelligence Layer:
 *   chatRealtime   → Real-time Engine: Subtext Analyzer, Reply Generator  (latency < 1s)
 *   chatBackground → Background Engine: Compressor, Persona/Relationship  (quality first)
 *   analyzeScreenshot → Capture Layer: screenshot OCR + parsing           (vision models)
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

// ── Public API ─────────────────────────────────────────────────────────────────

/** Real-time Engine — Subtext Analyzer and Reply Generator (low latency) */
export const chatRealtime = (req: ChatRequest) => post("/v1/realtime/chat", req);
export const streamRealtime = (req: ChatRequest, onToken: (t: string) => void) =>
  stream("/v1/realtime/chat", req, onToken);

/** Background Engine — Compressor, Persona / Relationship Updaters (quality first) */
export const chatBackground = (req: ChatRequest) => post("/v1/background/chat", req);
export const streamBackground = (req: ChatRequest, onToken: (t: string) => void) =>
  stream("/v1/background/chat", req, onToken);

/** Capture Layer — send screenshot to vision LLM for OCR + parsing */
export async function analyzeScreenshot(
  screenshot: string,
  windowTitle: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/v1/capture/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ screenshot, window_title: windowTitle }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Capture error ${res.status}: ${text}`);
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
