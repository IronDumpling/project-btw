import { useEffect, useState } from "react";
import { onCaptureTriggered, analyzeScreenshot } from "../../lib/capture";
import type { AnalyzeResponse, CaptureEvent } from "../../lib/capture";
import "./Overlay.css";

type Status = "idle" | "capturing" | "analyzing" | "done" | "error";

interface State {
  status: Status;
  capture: CaptureEvent | null;
  result: AnalyzeResponse | null;
  error: string | null;
}

export default function Overlay() {
  const [state, setState] = useState<State>({
    status: "idle",
    capture: null,
    result: null,
    error: null,
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    onCaptureTriggered(async (event) => {
      setState({ status: "analyzing", capture: event, result: null, error: null });
      try {
        const result = await analyzeScreenshot(event.screenshot, event.window_title);
        setState((s) => ({ ...s, status: "done", result }));
      } catch (e) {
        setState((s) => ({
          ...s,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        }));
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  return (
    <div className="overlay-root">
      <div className="overlay-header">
        <span className="overlay-title">project-btw</span>
        <span className="overlay-status-dot" data-status={state.status} />
      </div>

      <div className="overlay-body">
        {state.status === "idle" && (
          <p className="overlay-hint">Press Ctrl+Shift+B to analyze your chat</p>
        )}

        {state.status === "analyzing" && (
          <div className="overlay-loading">
            <span className="spinner" />
            <span>Analyzing screenshot…</span>
            {state.capture && (
              <p className="overlay-window-title">{state.capture.window_title}</p>
            )}
          </div>
        )}

        {state.status === "error" && (
          <div className="overlay-error">
            <p className="overlay-error-title">Analysis failed</p>
            <p className="overlay-error-detail">{state.error}</p>
            <p className="overlay-hint">Check that the backend is running and VISION_MODEL key is set.</p>
          </div>
        )}

        {state.status === "done" && state.result && (
          <AnalysisResult result={state.result} windowTitle={state.capture?.window_title ?? ""} />
        )}
      </div>
    </div>
  );
}

function AnalysisResult({
  result,
  windowTitle,
}: {
  result: AnalyzeResponse;
  windowTitle: string;
}) {
  return (
    <div className="overlay-result">
      <div className="overlay-meta">
        <span className="overlay-platform">{result.platform ?? "Unknown platform"}</span>
        <span className="overlay-contact">{result.contact_name ?? "Unknown contact"}</span>
        <span className="overlay-confidence">
          {Math.round(result.confidence * 100)}% confidence
        </span>
      </div>

      {windowTitle && <p className="overlay-window-title">{windowTitle}</p>}

      <div className="overlay-messages">
        {result.messages.length === 0 ? (
          <p className="overlay-hint">No messages extracted</p>
        ) : (
          result.messages.map((msg, i) => (
            <div key={i} className={`message message-${msg.role}`}>
              <span className="message-role">{msg.role === "user" ? "You" : result.contact_name ?? "Contact"}</span>
              <span className="message-text">{msg.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
