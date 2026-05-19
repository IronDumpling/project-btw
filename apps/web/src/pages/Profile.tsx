import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readFile, writeFile } from "../lib/storage";

export default function Profile() {
  const navigate = useNavigate();
  const [persona, setPersona] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    try {
      setPersona(readFile("user/persona.md") ?? "");
    } catch {
      setPersona("");
    }
    setLoading(false);
  }

  useEffect(load, []);

  function handleEdit() {
    navigate("/onboarding");
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete your profile? This cannot be undone.");
    if (!confirmed) return;
    try {
      writeFile("user/persona.md", "");
      try { writeFile("user/memory.md", ""); } catch { /* ignore */ }
      setPersona("");
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← 返回</button>
        <h2 className="view-heading" style={{ margin: 0 }}>My Profile</h2>
      </div>

      {loading && <p className="view-empty">Loading…</p>}

      {!loading && !persona && (
        <>
          <p className="view-empty" style={{ marginBottom: 16 }}>
            No profile yet. Complete onboarding to build your persona.
          </p>
          <button
            onClick={handleEdit}
            style={{ fontSize: 13, padding: "8px 16px", background: "var(--btw-accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Set up Profile
          </button>
        </>
      )}

      {persona && (
        <>
          <pre className="persona-content">{persona}</pre>
          <div className="contact-actions">
            <button className="contact-action-btn danger" onClick={handleDelete}>Delete</button>
            <button className="contact-action-btn" onClick={handleEdit}>Edit Profile</button>
          </div>
        </>
      )}
    </div>
  );
}
