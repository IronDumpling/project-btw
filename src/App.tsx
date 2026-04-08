import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import "./App.css";

/**
 * Main application shell.
 *
 * On mount: reads user/persona.md from the app data directory.
 * If the file is missing or empty, redirects to /onboarding so the user
 * fills in their profile before using the app.
 */
export default function App() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const content: string = await invoke("read_file", {
          relativePath: "user/persona.md",
        });
        if (!content || content.trim().length === 0) {
          navigate("/onboarding");
        }
      } catch {
        navigate("/onboarding");
      } finally {
        setChecking(false);
      }
    })();
  }, [navigate]);

  if (checking) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="app-logo">project-btw</span>
        <span className="app-tagline">Your relationship intelligence layer</span>
      </header>

      <section className="app-body">
        <p className="app-placeholder">
          主界面 — Contact Browser 和 Settings 将在 Phase 5 / 6 实现
        </p>
        <p className="app-hint">
          按 <kbd>Ctrl+Shift+B</kbd> 触发截图分析，查看浮窗
        </p>
      </section>
    </main>
  );
}
