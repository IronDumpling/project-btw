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

  const dotClass = healthy === true ? "view-health-dot ok" : healthy === false ? "view-health-dot err" : "view-health-dot";

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← 返回</button>
        <h2 className="view-heading" style={{ margin: 0 }}>Settings</h2>
      </div>

      <div className="dashboard-card">
        <p className="view-section-label">Backend Status</p>
        <p style={{ fontSize: 13, color: "var(--btw-text)", margin: 0 }}>
          <span className={dotClass} />
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
