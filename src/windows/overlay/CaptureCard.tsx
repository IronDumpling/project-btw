import { captureStore, useCaptureStore } from "../../lib/captureStore";

export default function CaptureCard() {
  const state = useCaptureStore();
  const result = state.analyzeResult;
  const isAnalyzing = state.status === "analyzing" || state.status === "reasoning";

  return (
    <div className="capture-card">
      <div className="capture-card-header">
        <span className="capture-card-platform">{result?.platform ?? "—"}</span>
        <span className="capture-card-contact">{result?.contact_name ?? (isAnalyzing ? "Analyzing…" : "Unknown")}</span>
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
              <span className="capture-msg-role">{msg.role === "user" ? "You" : (result.contact_name ?? "Contact")}</span>
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
