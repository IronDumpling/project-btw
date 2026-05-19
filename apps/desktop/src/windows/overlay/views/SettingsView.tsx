import { useEffect, useState } from "react";
import { backendHealthy } from "../../../lib/gateway";

export default function SettingsView() {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    backendHealthy()
      .then(setHealthy)
      .catch(() => setHealthy(false));
  }, []);

  return (
    <div>
      <p className="view-heading">Settings</p>

      <div className="view-section">
        <p className="view-section-label">Backend Status</p>
        <p style={{ fontSize: 13, color: "var(--btw-text)" }}>
          <span
            className={`view-health-dot ${healthy === true ? "ok" : healthy === false ? "err" : ""}`}
          />
          {healthy === null ? "Checking…" : healthy ? "Connected (port 8765)" : "Not reachable — start the backend"}
        </p>
      </div>

      <div className="view-section">
        <p className="view-section-label">Hotkey</p>
        <p style={{ fontSize: 13, color: "var(--btw-text-muted)" }}>Ctrl+Shift+B — capture active window</p>
      </div>
    </div>
  );
}
