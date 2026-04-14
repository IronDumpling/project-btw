/**
 * BubbleExpanded — 420×520 panel shown after capture analysis.
 *
 * Sections:
 * 1. Capture meta (platform, contact, confidence)
 * 2. Extracted messages
 * 3. Subtext analysis (auto-runs after capture)
 * 4. Reply drafts
 */

import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../../lib/captureStore";
import { runIntelligencePipeline } from "../../lib/gateway";
import { buildContext } from "../../lib/contextAssembler";

interface Props {
  onCollapse: () => void;
}

export default function BubbleExpanded({ onCollapse }: Props) {
  const state = useCaptureStore();

  // Auto-run intelligence pipeline when we have a capture result but no reasoning yet
  useEffect(() => {
    if (
      state.status === "done" &&
      state.analyzeResult &&
      state.subtextResult === null &&
      state.replyDrafts.length === 0 &&
      state.lastCapture
    ) {
      runReasoning();
    }
  }, [state.status, state.analyzeResult]);

  async function runReasoning() {
    const result = state.analyzeResult;
    if (!result) return;

    captureStore.setStatus("reasoning");

    try {
      // Load persona files for context assembly
      let userPersona = "";
      let contactPersona = "";
      try {
        userPersona = await invoke<string>("read_file", { relativePath: "user/persona.md" });
      } catch { /* no persona yet */ }

      if (result.contact_name) {
        try {
          contactPersona = await invoke<string>("read_file", {
            relativePath: `contacts/${result.contact_name}.md`,
          });
        } catch { /* no contact persona yet */ }
      }

      const { systemPrompt } = buildContext(userPersona, contactPersona || null, result.messages);

      const pipeline = await runIntelligencePipeline({
        contact_name: result.contact_name ?? "unknown",
        messages: result.messages,
        user_context: systemPrompt,
      });

      captureStore.setReasoningResult(
        pipeline.subtext.subtext,
        pipeline.reply_drafts.map((d) => d.text),
      );
    } catch (e) {
      captureStore.setError(e instanceof Error ? e.message : String(e));
    }
  }

  const result = state.analyzeResult;
  const capture = state.lastCapture;
  const contactName = result?.contact_name ?? null;
  const updateCount = contactName ? (state.personaUpdateCount[contactName] ?? 0) : 0;
  const showPersonaBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  return (
    <div className="bubble-expanded">
      {/* Header */}
      <div className="bubble-exp-header">
        <span className="bubble-exp-title">project-btw</span>
        <button className="bubble-exp-collapse" onClick={onCollapse} aria-label="collapse">
          ↓
        </button>
      </div>

      {/* Error state */}
      {state.status === "error" && (
        <div className="bubble-exp-error">
          <p className="bubble-exp-error-title">Analysis failed</p>
          <p className="bubble-exp-error-detail">{state.error}</p>
        </div>
      )}

      {/* Capture meta */}
      {result && (
        <div className="bubble-exp-meta">
          <span className="bubble-exp-platform">{result.platform ?? "Unknown"}</span>
          <span className="bubble-exp-contact">{contactName ?? "Unknown contact"}</span>
          <span className="bubble-exp-confidence">
            {Math.round(result.confidence * 100)}%
          </span>
          {capture?.window_title && (
            <span className="bubble-exp-window">{capture.window_title}</span>
          )}
        </div>
      )}

      {/* Messages */}
      {result && result.messages.length > 0 && (
        <div className="bubble-exp-messages">
          {result.messages.map((msg, i) => (
            <div key={i} className={`bubble-msg bubble-msg-${msg.role}`}>
              <span className="bubble-msg-role">
                {msg.role === "user" ? "You" : contactName ?? "Contact"}
              </span>
              <span className="bubble-msg-text">{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning results */}
      {state.status === "reasoning" && (
        <div className="bubble-exp-reasoning-loading">
          <span className="bubble-spinner" /> Analyzing subtext…
        </div>
      )}

      {state.subtextResult && (
        <div className="bubble-exp-subtext">
          <p className="bubble-exp-section-label">Subtext</p>
          <p className="bubble-exp-subtext-text">{state.subtextResult}</p>
        </div>
      )}

      {state.replyDrafts.length > 0 && (
        <div className="bubble-exp-replies">
          <p className="bubble-exp-section-label">Reply drafts</p>
          {state.replyDrafts.map((draft, i) => (
            <div key={i} className="bubble-exp-draft">
              <p className="bubble-exp-draft-text">{draft}</p>
            </div>
          ))}
        </div>
      )}

      {/* Persona update badge */}
      {showPersonaBadge && contactName && (
        <div className="bubble-exp-persona-badge">
          <span>
            {updateCount} new captures for {contactName} — update persona?
          </span>
          <button
            className="bubble-exp-persona-btn"
            onClick={() => captureStore.requestPersonaPatch(contactName)}
          >
            Update
          </button>
        </div>
      )}
    </div>
  );
}
