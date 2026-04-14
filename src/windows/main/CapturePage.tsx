import NavSidebar from "../../components/NavSidebar";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../../lib/captureStore";
import { useNavigate } from "react-router-dom";

export default function CapturePage() {
  const navigate = useNavigate();
  const state = useCaptureStore();
  const result = state.analyzeResult;
  const contactName = result?.contact_name ?? null;
  const updateCount = contactName ? (state.personaUpdateCount[contactName] ?? 0) : 0;
  const showPersonaBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  return (
    <div className="main-layout">
      <NavSidebar />
      <main className="main-content">
        <h1 className="main-heading">Capture Analysis</h1>

        {!result && (
          <p className="main-empty">
            No capture yet. Press <kbd>Ctrl+Shift+B</kbd> to analyze a chat screenshot.
          </p>
        )}

        {result && (
          <div className="capture-result">
            <div className="capture-meta">
              <span className="capture-platform">{result.platform ?? "Unknown platform"}</span>
              <span className="capture-contact">{contactName ?? "Unknown contact"}</span>
              <span className="capture-confidence">
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>

            {/* Messages */}
            <div className="capture-messages">
              <h2 className="capture-section-title">Messages</h2>
              {result.messages.map((msg, i) => (
                <div key={i} className={`capture-msg capture-msg-${msg.role}`}>
                  <span className="capture-msg-role">
                    {msg.role === "user" ? "You" : contactName ?? "Contact"}
                  </span>
                  <span className="capture-msg-text">{msg.text}</span>
                </div>
              ))}
            </div>

            {/* Subtext */}
            {state.subtextResult && (
              <div className="capture-subtext">
                <h2 className="capture-section-title">Subtext</h2>
                <p>{state.subtextResult}</p>
              </div>
            )}

            {/* Reply drafts */}
            {state.replyDrafts.length > 0 && (
              <div className="capture-replies">
                <h2 className="capture-section-title">Reply Drafts</h2>
                {state.replyDrafts.map((draft, i) => (
                  <div key={i} className="capture-draft">
                    <p>{draft}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Persona update badge */}
            {showPersonaBadge && contactName && (
              <div className="persona-badge">
                <span>
                  {updateCount} captures for {contactName} — consider updating their persona
                </span>
                <button
                  className="persona-update-btn"
                  onClick={() => {
                    captureStore.requestPersonaPatch(contactName);
                    navigate(`/contacts/${encodeURIComponent(contactName)}`);
                  }}
                >
                  Go to Contact →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
