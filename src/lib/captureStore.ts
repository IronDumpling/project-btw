/**
 * Shared capture state — persists across Overlay collapsed/expanded transitions.
 *
 * Uses a module-level singleton (not React Context) so both the Overlay window
 * and the main window can access the same in-memory state within the same
 * Tauri webview session.
 *
 * H3 — Persona update count tracking:
 *   After each successful analysis for a contact, increment personaUpdateCount[name].
 *   When count >= PERSONA_UPDATE_THRESHOLD, show the "Update Persona" badge in UI.
 *   After a successful persona patch, reset the count to 0.
 */

import type { AnalyzeResponse, CaptureEvent } from "./gateway";

export const PERSONA_UPDATE_THRESHOLD = 3;

export type CaptureStatus =
  | "idle"
  | "analyzing"        // Perception layer in progress
  | "reasoning"        // Reasoning layer (subtext + reply) in progress
  | "done"
  | "error";

export type PersonaPatchStatus =
  | "idle"
  | "pending_confirm"  // badge shown, waiting for user click
  | "patching"         // Learning layer in progress
  | "done"
  | "error";

export interface CaptureState {
  status: CaptureStatus;
  lastCapture: CaptureEvent | null;
  analyzeResult: AnalyzeResponse | null;
  subtextResult: string | null;
  replyDrafts: string[];
  error: string | null;

  // H3: persona update tracking per contact
  personaUpdateCount: Record<string, number>;
  personaPatchStatus: PersonaPatchStatus;
  personaPatchError: string | null;
}

type Listener = (state: CaptureState) => void;

const initialState: CaptureState = {
  status: "idle",
  lastCapture: null,
  analyzeResult: null,
  subtextResult: null,
  replyDrafts: [],
  error: null,
  personaUpdateCount: {},
  personaPatchStatus: "idle",
  personaPatchError: null,
};

let _state: CaptureState = { ...initialState };
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn({ ..._state }));
}

export const captureStore = {
  getState(): CaptureState {
    return { ..._state };
  },

  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  setStatus(status: CaptureStatus) {
    _state = { ..._state, status };
    notify();
  },

  setCaptureResult(capture: CaptureEvent, result: AnalyzeResponse) {
    const contactName = result.contact_name ?? "__unknown__";
    const prevCount = _state.personaUpdateCount[contactName] ?? 0;
    const newCount = prevCount + 1;
    _state = {
      ..._state,
      status: "done",
      lastCapture: capture,
      analyzeResult: result,
      subtextResult: null,
      replyDrafts: [],
      error: null,
      personaUpdateCount: {
        ..._state.personaUpdateCount,
        [contactName]: newCount,
      },
    };
    notify();
  },

  setReasoningResult(subtext: string, replyDrafts: string[]) {
    _state = { ..._state, subtextResult: subtext, replyDrafts, status: "done" };
    notify();
  },

  setError(error: string) {
    _state = { ..._state, status: "error", error };
    notify();
  },

  /** H3: mark that the user has acknowledged the persona update badge */
  requestPersonaPatch(contactName: string) {
    const count = _state.personaUpdateCount[contactName] ?? 0;
    if (count < PERSONA_UPDATE_THRESHOLD) return;
    _state = { ..._state, personaPatchStatus: "pending_confirm" };
    notify();
  },

  setPersonaPatchStatus(status: PersonaPatchStatus, error?: string) {
    _state = {
      ..._state,
      personaPatchStatus: status,
      personaPatchError: error ?? null,
    };
    notify();
  },

  /** Called after a successful persona patch — resets the count for that contact */
  onPersonaPatchSuccess(contactName: string) {
    const counts = { ..._state.personaUpdateCount };
    counts[contactName] = 0;
    _state = {
      ..._state,
      personaUpdateCount: counts,
      personaPatchStatus: "done",
      personaPatchError: null,
    };
    notify();
  },

  reset() {
    _state = { ...initialState };
    notify();
  },
};

/** React hook — re-renders the component whenever the store changes. */
import { useEffect, useState } from "react";

export function useCaptureStore(): CaptureState {
  const [state, setState] = useState<CaptureState>(captureStore.getState());
  useEffect(() => captureStore.subscribe(setState), []);
  return state;
}
