/**
 * LiteLLM Gateway client
 *
 * Talks to the local Python backend at http://127.0.0.1:8765
 *
 * Two tiers:
 *   chatFast    → Subtext Analyzer, Reply Generator       (low latency)
 *   chatCapable → Persona/Relationship/Conversation jobs  (deep reasoning)
 */

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

// ── Public API ────────────────────────────────────────────────────────────────

/** Fast tier — real-time, for Subtext Analyzer and Reply Generator */
export const chatFast = (req: ChatRequest) => post("/v1/chat/fast", req);
export const streamFast = (req: ChatRequest, onToken: (t: string) => void) =>
  stream("/v1/chat/fast", req, onToken);

/** Capable tier — background, for Persona / Relationship / Conversation jobs */
export const chatCapable = (req: ChatRequest) => post("/v1/chat/capable", req);
export const streamCapable = (req: ChatRequest, onToken: (t: string) => void) =>
  stream("/v1/chat/capable", req, onToken);

/** Health check — true if backend is reachable */
export async function backendHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
