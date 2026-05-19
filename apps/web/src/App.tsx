import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readFile } from "./lib/storage";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const persona = readFile("user/persona.md");
    if (!persona || persona.trim().length === 0) {
      navigate("/onboarding");
    } else {
      navigate("/dashboard");
    }
    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  return null;
}
