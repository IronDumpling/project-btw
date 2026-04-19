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

  return (
    <div>
      <p className="view-heading">My Profile</p>
      {loading && <p className="view-empty">Loading…</p>}
      {!loading && !persona && (
        <p className="view-empty">No profile yet. Complete onboarding to build your persona.</p>
      )}
      {persona && (
        <div className="view-section">
          <pre className="view-persona-text">{persona}</pre>
        </div>
      )}
    </div>
  );
}
