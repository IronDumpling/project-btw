import { useCaptureStore } from "../../../lib/captureStore";

export default function CapturesView() {
  const state = useCaptureStore();
  const result = state.analyzeResult;

  return (
    <div>
      <p className="view-heading">Captures</p>
      {result ? (
        <div className="home-last-capture">
          <div className="home-capture-meta">
            <span className="home-capture-contact">{result.contact_name ?? "Unknown"}</span>
            <span>{result.platform ?? "—"}</span>
            <span>{Math.round(result.confidence * 100)}%</span>
          </div>
          {state.subtextResult && (
            <p className="home-subtext">"{state.subtextResult}"</p>
          )}
          <div className="home-capture-meta" style={{ marginTop: 8 }}>
            <span>{result.messages.length} messages extracted</span>
          </div>
        </div>
      ) : (
        <p className="view-empty">No captures yet. Press Ctrl+Shift+B to start.</p>
      )}
    </div>
  );
}
