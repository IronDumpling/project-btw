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
}

export default function BubbleCollapsed({ status, contactName, onExpand }: Props) {
  return (
    <div
      className="bubble-collapsed"
      onClick={status !== "idle" ? onExpand : undefined}
      data-status={status}
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
  );
}
