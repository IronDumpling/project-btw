import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isTauriRuntime, readAppFile, showCurrentWindow } from "./lib/browserStorage";
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
        const content: string = await readAppFile("user/persona.md");
        if (!content || content.trim().length === 0) {
          // No persona — reveal the main window for onboarding
          await showCurrentWindow();
          navigate("/onboarding");
        } else if (!isTauriRuntime()) {
          navigate("/overlay");
        }
        // Persona exists — main window stays hidden; overlay is the UI
      } catch {
        await showCurrentWindow();
        navigate("/onboarding");
      } finally {
        setChecking(false);
      }
    })();
  }, [navigate]);

  // Listen for overlay-triggered onboarding request (Edit / Rebuild Profile).
  // Uses a browser CustomEvent fired via Rust eval — reliable within the same webview.
  useEffect(() => {
    const handler = () => navigate("/onboarding");
    window.addEventListener("btw-navigate-onboarding", handler);
    return () => window.removeEventListener("btw-navigate-onboarding", handler);
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
