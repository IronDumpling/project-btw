/**
 * Capture Layer client
 *
 * Listens for the `btw-capture` Tauri event (fired when Ctrl+Shift+B is pressed)
 * and provides functions to send screenshots to the backend for analysis.
 */

import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

const BASE_URL = "http://127.0.0.1:8765";

// ── Types ────────────────────────────────────────────────────────────────────

/** Payload from the Rust `btw-capture` event */
export interface CaptureEvent {
  screenshot: string;    // "data:image/png;base64,..."
  window_title: string;
  timestamp: number;     // Unix seconds
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

// ── Event listener ────────────────────────────────────────────────────────────

/**
 * Subscribe to capture events emitted by the Rust hotkey handler.
 * Returns an unlisten function — call it on component unmount.
 */
export async function onCaptureTriggered(
  callback: (event: CaptureEvent) => void,
): Promise<UnlistenFn> {
  return listen<CaptureEvent>("btw-capture", (e) => callback(e.payload));
}

// ── Backend API ───────────────────────────────────────────────────────────────

/**
 * Send a screenshot to the backend vision model for analysis.
 * Returns platform, contact name, and extracted messages.
 */
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
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`Analyze failed (${res.status}): ${JSON.stringify(err.detail)}`);
  }
  return res.json();
}
