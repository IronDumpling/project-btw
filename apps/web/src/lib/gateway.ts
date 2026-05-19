/**
 * project-btw backend client (web version)
 *
 * Identical to the desktop version except:
 *  - onCaptureTriggered removed (no Tauri hotkey)
 *  - uploadImageAsBase64 added (browser file picker)
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

export interface CaptureEvent {
  screenshot: string;
  window_title: string;
  timestamp: string;
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

// ── Internal helpers ──────────────────────────────────────────────────────────

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

// ── Governance-based API ──────────────────────────────────────────────────────

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

export const chatReasoning = (req: ChatRequest) => post("/v1/reasoning/chat", req);
export const streamReasoning = (req: ChatRequest, onToken: (t: string) => void) =>
  stream("/v1/reasoning/chat", req, onToken);

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

// ── Intelligence Layer ────────────────────────────────────────────────────────

export interface IntelligenceRequest {
  contact_name: string;
  messages: ExtractedMessage[];
  user_context?: string;
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

// ── Persona update pipeline ───────────────────────────────────────────────────

export interface CompressedEvidence {
  observed_patterns: string[];
  emotional_signals: string[];
  style_observations: string[];
  relationship_indicators: string[];
  memory_updates: string[];
  confidence: number;
  model: string;
}

export interface PersonaMergeResponse {
  persona: string;
  model: string;
}

export interface RelationshipState {
  state: string;
  state_changed: boolean;
  previous_state: string | null;
  evidence: string[];
  trajectory: string;
  coaching_note: string;
  confidence: number;
  updated_date: string;
  model: string;
}

export async function compressConversation(
  conversation: string,
  contactId: string = "",
): Promise<CompressedEvidence> {
  const res = await fetch(`${BASE_URL}/v1/intelligence/compress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation, contact_id: contactId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Compress error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function mergePersona(
  existingPersona: string,
  compressedEvidence: CompressedEvidence,
  patchMode: "dynamic_only" | "full" = "dynamic_only",
): Promise<PersonaMergeResponse> {
  const res = await fetch(`${BASE_URL}/v1/intelligence/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      existing_persona: existingPersona,
      compressed_evidence: compressedEvidence,
      patch_mode: patchMode,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Merge error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function updateRelationship(
  currentState: string,
  compressedEvidence: CompressedEvidence,
  personaSummary: string,
): Promise<RelationshipState> {
  const res = await fetch(`${BASE_URL}/v1/intelligence/relationship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_state: currentState,
      compressed_evidence: compressedEvidence,
      persona_summary: personaSummary,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Relationship update error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function buildRelationship(
  compressedEvidence: CompressedEvidence,
  personaSummary: string,
): Promise<RelationshipState> {
  const res = await fetch(`${BASE_URL}/v1/intelligence/relationship_build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compressed_evidence: compressedEvidence,
      persona_summary: personaSummary,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Relationship build error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Web-only: image upload (replaces Ctrl+Shift+B hotkey) ────────────────────

/** Open OS file picker and return selected image as raw base64 string. */
export function uploadImageAsBase64(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
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
