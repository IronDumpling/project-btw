import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import NavSidebar from "../../components/NavSidebar";

export default function UserProfile() {
  const navigate = useNavigate();
  const [persona, setPersona] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<string>("read_file", { relativePath: "user/persona.md" })
      .then(setPersona)
      .catch(() => setPersona(""))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="main-layout">
      <NavSidebar />
      <main className="main-content">
        <h1 className="main-heading">My Profile</h1>

        <div className="profile-actions">
          <button
            className="profile-btn"
            onClick={() => navigate("/onboarding")}
          >
            Rebuild Profile
          </button>
        </div>

        {loading && <p className="main-loading">Loading…</p>}

        {!loading && !persona && (
          <p className="main-empty">
            No profile yet.{" "}
            <button className="inline-link" onClick={() => navigate("/onboarding")}>
              Create one →
            </button>
          </p>
        )}

        {persona && (
          <pre className="persona-content">{persona}</pre>
        )}
      </main>
    </div>
  );
}
