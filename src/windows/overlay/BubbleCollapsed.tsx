/**
 * BubbleCollapsed — 280×76 capsule shown when overlay is idle or done.
 *
 * Shows:
 * - Idle: "Ctrl+Shift+B to capture" hint
 * - Analyzing/Reasoning: spinner + status text
 * - Done: contact name + tap to expand
 * - Error: error indicator + tap to expand
 */

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
      {/* Drag region — fills the left portion of the capsule */}
      <div
        className="bubble-drag"
        data-tauri-drag-region
        onClick={status !== "idle" ? onExpand : undefined}
      >
        <div className="bubble-dot" data-status={status} />

        <div className="bubble-content">
          {status === "idle" && (
            <span className="bubble-hint">Ctrl+Shift+B — capture</span>
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
              {contactName ?? "Unknown"} · tap to expand
            </span>
          )}

          {status === "error" && (
            <span className="bubble-error-hint">Error · tap for details</span>
          )}
        </div>
      </div>

      {/* Close button — outside drag region so click doesn't drag */}
      <button
        className="bubble-close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="hide overlay"
      >
        ×
      </button>
    </div>
  );
}
