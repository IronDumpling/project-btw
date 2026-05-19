import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { readFile, listContacts } from "../lib/storage";
import type { ContactEntry } from "../lib/storage";
import { backendHealthy } from "../lib/gateway";
import { extractSection } from "../lib/contextAssembler";

export default function Dashboard() {
  const [identity, setIdentity] = useState("");
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const persona = readFile("user/persona.md");
    setIdentity(extractSection(persona, "Identity"));
    setContacts(listContacts());
    backendHealthy().then(setHealthy).catch(() => setHealthy(false));
  }, []);

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 className="main-heading" style={{ margin: 0 }}>Between</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/profile" style={{ fontSize: 13, color: "var(--btw-text-muted)", textDecoration: "none" }}>Profile</Link>
          <Link to="/settings" style={{ fontSize: 13, color: "var(--btw-text-muted)", textDecoration: "none" }}>Settings</Link>
        </div>
      </div>

      {healthy === false && (
        <div className="dashboard-card" style={{ borderColor: "var(--btw-error)", color: "var(--btw-error)", marginBottom: 20 }}>
          Backend not reachable — run <code>python backend/main.py</code> to enable analysis
        </div>
      )}

      <button
        onClick={() => navigate("/capture")}
        style={{ width: "100%", padding: "14px 20px", background: "var(--btw-accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 28 }}
      >
        上传截图 →
      </button>

      {identity && (
        <div className="dashboard-card">
          <p className="view-section-label">My Identity</p>
          <pre className="view-persona-text" style={{ margin: 0 }}>{identity}</pre>
        </div>
      )}

      <div>
        <p className="view-section-label">Contacts ({contacts.length})</p>
        {contacts.length === 0 ? (
          <p className="view-empty">No contacts yet — upload a screenshot to create one.</p>
        ) : (
          <ul className="contact-list">
            {contacts.map((c) => (
              <li key={c.id} className="contact-list-item" onClick={() => navigate(`/contacts/${c.id}`)} style={{ cursor: "pointer" }}>
                <span className="contact-name">{c.name}</span>
                <span className="contact-platform">{c.platform}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
