import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function ProfileView() {
  const [persona, setPersona] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    invoke<string>("read_file", { relativePath: "user/persona.md" })
      .then((c) => setPersona(c ?? ""))
      .catch(() => setPersona(""))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleEdit() {
    await invoke("open_onboarding");
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete your profile? This cannot be undone.");
    if (!confirmed) return;
    try {
      await Promise.all([
        invoke("write_file", { relativePath: "user/persona.md", content: "" }),
        invoke("write_file", { relativePath: "user/memory.md", content: "" }).catch(() => {}),
      ]);
      setPersona("");
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div>
      <p className="view-heading">My Profile</p>

      {loading && <p className="view-empty">Loading…</p>}

      {!loading && !persona && (
        <>
          <p className="view-empty">No profile yet. Complete onboarding to build your persona.</p>
          <div className="contact-actions" style={{ marginTop: 12 }}>
            <button className="contact-action-btn" onClick={handleEdit}>
              Set up Profile
            </button>
          </div>
        </>
      )}

      {persona && (
        <>
          <div className="view-section">
            <pre className="view-persona-text">{persona}</pre>
          </div>
          <div className="contact-actions">
            <button className="contact-action-btn danger" onClick={handleDelete}>
              Delete
            </button>
            <button className="contact-action-btn" onClick={handleEdit}>
              Edit Profile
            </button>
          </div>
        </>
      )}
    </div>
  );
}
