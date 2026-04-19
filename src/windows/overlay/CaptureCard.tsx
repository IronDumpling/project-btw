import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore } from "../../lib/captureStore";
import { runIntelligencePipeline } from "../../lib/gateway";
import { buildContext } from "../../lib/contextAssembler";

export default function CaptureCard() {
  const state = useCaptureStore();
  const result = state.analyzeResult;
  const isAnalyzing = state.status === "analyzing" || state.status === "reasoning";

  // Auto-run intelligence pipeline when perception is done but reasoning hasn't run yet
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
      let userPersona = "";
      let contactPersona = "";

      try {
        userPersona = await invoke<string>("read_file", { relativePath: "user/persona.md" });
      } catch { /* no persona yet */ }

      if (result.contact_name) {
        const contactId = result.contact_name.trim().replace(/[/\\:*?"<>|\x00\s]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 64) || "unknown";
        try {
          contactPersona = await invoke<string>("read_file", { relativePath: `contacts/${contactId}/persona.md` });
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

  return (
    <div className="capture-card">
      <div className="capture-card-header">
        <span className="capture-card-platform">{result?.platform ?? "—"}</span>
        <span className="capture-card-contact">
          {result?.contact_name ?? (isAnalyzing ? "Analyzing…" : "Unknown")}
        </span>
        {result && (
          <span className="capture-card-conf">{Math.round(result.confidence * 100)}%</span>
        )}
        <button
          className="capture-card-dismiss"
          onClick={() => captureStore.dismissCaptureCard()}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {state.status === "error" && (
        <p style={{ color: "var(--btw-error)", fontSize: 13 }}>{state.error}</p>
      )}

      {result && result.messages.length > 0 && (
        <div className="capture-card-messages">
          {result.messages.map((msg, i) => (
            <div key={i} className={`capture-msg capture-msg-${msg.role}`}>
              <span className="capture-msg-role">
                {msg.role === "user" ? "You" : (result.contact_name ?? "Contact")}
              </span>
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {isAnalyzing && (
        <div className="capture-card-analyzing">
          <span className="bubble-spinner" />
          {state.status === "analyzing" ? "Analyzing screenshot…" : "Reading subtext…"}
        </div>
      )}

      {state.subtextResult && (
        <div>
          <p className="capture-card-section-label">Subtext</p>
          <div className="capture-card-subtext">{state.subtextResult}</div>
        </div>
      )}

      {state.replyDrafts.length > 0 && (
        <div>
          <p className="capture-card-section-label">Reply drafts</p>
          <div className="capture-card-drafts">
            {state.replyDrafts.map((draft, i) => (
              <button
                key={i}
                className="capture-draft-btn"
                onClick={() => navigator.clipboard.writeText(draft)}
                title="Click to copy"
              >
                {draft}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
