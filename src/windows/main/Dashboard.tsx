import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import NavSidebar from "../../components/NavSidebar";
import { useCaptureStore } from "../../lib/captureStore";
import { extractSection } from "../../lib/contextAssembler";

export default function Dashboard() {
  const navigate = useNavigate();
  const [hardRules, setHardRules] = useState<string>("");
  const [identity, setIdentity] = useState<string>("");
  const captureState = useCaptureStore();

  useEffect(() => {
    (async () => {
      try {
        const persona = await invoke<string>("read_file", { relativePath: "user/persona.md" });
        setHardRules(extractSection(persona, "Hard Rules"));
        setIdentity(extractSection(persona, "Identity"));
      } catch { /* no persona yet */ }
    })();
  }, []);

  const lastResult = captureState.analyzeResult;

  return (
    <div className="main-layout">
      <NavSidebar />
      <main className="main-content">
        <h1 className="main-heading">Dashboard</h1>

        {/* User persona summary */}
        {(hardRules || identity) && (
          <section className="dashboard-card">
            <h2 className="dashboard-card-title">Your Profile</h2>
            {identity && (
              <div className="dashboard-persona-section">
                <pre className="dashboard-persona-text">{identity}</pre>
              </div>
            )}
            {hardRules && (
              <div className="dashboard-persona-section">
                <p className="dashboard-persona-label">Hard Rules</p>
                <pre className="dashboard-persona-text">{hardRules}</pre>
              </div>
            )}
          </section>
        )}

        {/* Last capture summary */}
        {lastResult && (
          <section className="dashboard-card">
            <h2 className="dashboard-card-title">Last Capture</h2>
            <p>
              <strong>{lastResult.contact_name ?? "Unknown"}</strong>{" "}
              on {lastResult.platform ?? "unknown platform"}
            </p>
            {captureState.subtextResult && (
              <p className="dashboard-subtext">{captureState.subtextResult}</p>
            )}
            <button
              className="dashboard-link-btn"
              onClick={() => navigate("/capture")}
            >
              View full analysis →
            </button>
          </section>
        )}

        {/* Quick links */}
        <section className="dashboard-card">
          <h2 className="dashboard-card-title">Quick Access</h2>
          <div className="dashboard-quick-links">
            <button className="dashboard-link-btn" onClick={() => navigate("/contacts")}>
              Contacts →
            </button>
            <button className="dashboard-link-btn" onClick={() => navigate("/capture")}>
              Capture History →
            </button>
          </div>
          <p className="dashboard-hint">Press Ctrl+Shift+B to capture a screenshot</p>
        </section>
      </main>
    </div>
  );
}
