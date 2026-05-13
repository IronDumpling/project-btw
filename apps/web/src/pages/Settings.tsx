import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { backendHealthy } from "../lib/gateway";

export default function Settings() {
  const navigate = useNavigate();
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    backendHealthy()
      .then(setHealthy)
      .catch(() => setHealthy(false));
  }, []);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", color: "var(--btw-text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          ← 返回
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--btw-text)" }}>Settings</h2>
      </div>

      <div style={{ background: "var(--btw-surface)", border: "1px solid var(--btw-border)", borderRadius: 10, padding: "14px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--btw-text-muted)", marginBottom: 10 }}>Backend Status</p>
        <p style={{ fontSize: 13, color: "var(--btw-text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            background: healthy === true ? "var(--btw-success)" : healthy === false ? "var(--btw-danger)" : "var(--btw-text-muted)",
          }} />
          {healthy === null
            ? "Checking…"
            : healthy
            ? "Connected (port 8765)"
            : "Not reachable — run python backend/main.py"}
        </p>
      </div>
    </div>
  );
}
