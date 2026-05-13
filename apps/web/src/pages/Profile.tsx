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
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", color: "var(--btw-text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          ← 返回
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--btw-text)" }}>My Profile</h2>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: "var(--btw-text-muted)" }}>Loading…</p>
      )}

      {!loading && !persona && (
        <>
          <p style={{ fontSize: 13, color: "var(--btw-text-muted)", marginBottom: 16 }}>
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
          <div style={{ background: "var(--btw-surface)", border: "1px solid var(--btw-border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <pre style={{ fontSize: 13, color: "var(--btw-text)", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{persona}</pre>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDelete}
              style={{ fontSize: 13, padding: "6px 14px", background: "none", border: "1px solid var(--btw-danger)", borderRadius: 6, color: "var(--btw-danger)", cursor: "pointer" }}
            >
              Delete
            </button>
            <button
              onClick={handleEdit}
              style={{ fontSize: 13, padding: "6px 14px", background: "none", border: "1px solid var(--btw-border)", borderRadius: 6, color: "var(--btw-text)", cursor: "pointer" }}
            >
              Edit Profile
            </button>
          </div>
        </>
      )}
    </div>
  );
}
