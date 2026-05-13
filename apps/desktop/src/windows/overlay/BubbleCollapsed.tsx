import type { CaptureStatus } from "../../lib/captureStore";

interface Props {
  status: CaptureStatus;
  contactName: string | null;
  onExpand: () => void;
  onClose: () => void;
}

export default function BubbleCollapsed({ status, contactName, onExpand, onClose }: Props) {
  return (
    <div className="bubble-collapsed" data-status={status}>
      {/* Drag + click-to-expand region */}
      <div
        className="bubble-drag"
        data-tauri-drag-region
        onClick={onExpand}
        style={{ cursor: "pointer" }}
      >
        <div className="bubble-dot" data-status={status} />

        <div className="bubble-content">
          {status === "idle" && (
            <span className="bubble-hint">project-btw</span>
          )}

          {(status === "analyzing" || status === "reasoning") && (
            <>
              <span className="bubble-spinner" />
              <span className="bubble-status-text">
                {status === "analyzing" ? "Reading screenshot…" : "Thinking…"}
              </span>
            </>
          )}

          {status === "done" && (
            <span className="bubble-contact">
              {contactName ?? "Unknown"}
            </span>
          )}

          {status === "error" && (
            <span className="bubble-error-hint">Error · click for details</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="bubble-actions">
        <button
          className="bubble-expand-btn"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          aria-label="expand"
          title="Open dashboard"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.5 1.5H10.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.5 1.5L6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M4.5 10.5H1.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.5 10.5L5.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          className="bubble-close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="hide overlay"
        >
          ×
        </button>
      </div>
    </div>
  );
}
