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
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--btw-text)", margin: 0 }}>Between</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/profile" style={{ fontSize: 13, color: "var(--btw-text-muted)", textDecoration: "none" }}>Profile</Link>
          <Link to="/settings" style={{ fontSize: 13, color: "var(--btw-text-muted)", textDecoration: "none" }}>Settings</Link>
        </div>
      </div>

      {/* Backend status */}
      {healthy === false && (
        <div style={{ background: "var(--btw-surface-2)", border: "1px solid var(--btw-danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--btw-danger)" }}>
          Backend not reachable — run <code>python backend/main.py</code> to enable analysis
        </div>
      )}

      {/* Upload CTA */}
      <button
        onClick={() => navigate("/capture")}
        style={{ width: "100%", padding: "14px 20px", background: "var(--btw-accent)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 28 }}
      >
        上传截图 →
      </button>

      {/* Identity summary */}
      {identity && (
        <div style={{ background: "var(--btw-surface)", border: "1px solid var(--btw-border)", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--btw-text-muted)", marginBottom: 8 }}>My Identity</p>
          <pre style={{ fontSize: 13, color: "var(--btw-text)", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{identity}</pre>
        </div>
      )}

      {/* Contacts list */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--btw-text-muted)", marginBottom: 10 }}>
          Contacts ({contacts.length})
        </p>
        {contacts.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--btw-text-muted)" }}>
            No contacts yet — upload a screenshot to create one.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {contacts.map((c) => (
              <Link
                key={c.id}
                to={`/contacts/${c.id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--btw-surface)", border: "1px solid var(--btw-border)", borderRadius: 8, textDecoration: "none", color: "var(--btw-text)" }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: "var(--btw-text-muted)" }}>{c.platform}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
