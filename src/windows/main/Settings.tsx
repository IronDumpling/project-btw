import { useEffect, useState } from "react";
import NavSidebar from "../../components/NavSidebar";
import { backendHealthy } from "../../lib/gateway";

interface HealthData {
  status: string;
  perception_models: string[];
  reasoning_models: string[];
  learning_models: string[];
}

export default function Settings() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8765/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className="main-layout">
      <NavSidebar />
      <main className="main-content">
        <h1 className="main-heading">Settings</h1>

        <section className="settings-section">
          <h2 className="settings-section-title">Backend Status</h2>
          {checking && <p className="main-loading">Checking…</p>}
          {!checking && !health && (
            <p className="settings-offline">
              Backend offline — start with <code>cd backend &amp;&amp; python main.py</code>
            </p>
          )}
          {health && (
            <div className="settings-health">
              <p className="settings-health-ok">Backend running</p>
              <div className="settings-model-group">
                <span className="settings-model-label">Perception</span>
                <span className="settings-model-list">{health.perception_models.join(", ")}</span>
              </div>
              <div className="settings-model-group">
                <span className="settings-model-label">Reasoning</span>
                <span className="settings-model-list">{health.reasoning_models.join(", ")}</span>
              </div>
              <div className="settings-model-group">
                <span className="settings-model-label">Learning</span>
                <span className="settings-model-list">{health.learning_models.join(", ")}</span>
              </div>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Model Configuration</h2>
          <p className="settings-hint">
            Edit <code>backend/.env</code> to change model lists. Use{" "}
            <code>PERCEPTION_MODELS</code>, <code>REASONING_MODELS</code>,{" "}
            <code>LEARNING_MODELS</code> keys (comma-separated).
          </p>
        </section>
      </main>
    </div>
  );
}
