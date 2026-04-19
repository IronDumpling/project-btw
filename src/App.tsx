import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
          // No persona — reveal the main window for onboarding
          await getCurrentWindow().show();
          navigate("/onboarding");
        }
        // Persona exists — main window stays hidden; overlay is the UI
      } catch {
        await getCurrentWindow().show();
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

  // Should not render — navigate() fires before setChecking(false) resolves
  return null;
}
