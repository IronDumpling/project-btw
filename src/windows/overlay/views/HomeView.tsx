import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
// invoke used for persona check below
import { useCaptureStore } from "../../../lib/captureStore";

interface Props {
  onGoToContacts: () => void;
  activeContactName: string | null;
}

export default function HomeView({ onGoToContacts, activeContactName }: Props) {
  const state = useCaptureStore();
  const [hasPersona, setHasPersona] = useState(true);

  useEffect(() => {
    invoke<string>("read_file", { relativePath: "user/persona.md" })
      .then((c) => setHasPersona(!!c && c.trim().length > 0))
      .catch(() => setHasPersona(false));
  }, []);

  async function openSetup() {
    const main = await Window.getByLabel("main");
    if (main) { await main.show(); await main.setFocus(); }
  }

  const result = state.analyzeResult;

  return (
    <div>
      {!hasPersona && (
        <div className="home-setup-banner">
          <span>Profile not set up yet</span>
          <button className="home-setup-btn" onClick={openSetup}>
            Open Setup →
          </button>
        </div>
      )}

      <div className="home-active-contact-row">
        <span className="home-active-contact-label">Capturing as:</span>
        <span className="home-active-contact-name">
          {activeContactName ?? "Auto-detect"}
        </span>
        <button className="home-change-btn" onClick={onGoToContacts}>
          Change →
        </button>
      </div>

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
          {state.replyDrafts.length > 0 && (
            <div className="home-drafts">
              {state.replyDrafts.map((d, i) => (
                <button
                  key={i}
                  className="home-draft-chip"
                  onClick={() => navigator.clipboard.writeText(d)}
                  title="Copy"
                >
                  {d.length > 40 ? d.slice(0, 40) + "…" : d}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="home-hint">Press Ctrl+Shift+B to capture a conversation</p>
      )}
    </div>
  );
}
