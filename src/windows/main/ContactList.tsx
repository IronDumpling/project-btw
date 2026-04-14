import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import NavSidebar from "../../components/NavSidebar";

interface ContactEntry {
  id: string;
  name: string;
  platform: string;
}

export default function ContactList() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<ContactEntry[]>("list_contacts")
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="main-layout">
      <NavSidebar />
      <main className="main-content">
        <h1 className="main-heading">Contacts</h1>

        {loading && <p className="main-loading">Loading…</p>}

        {!loading && contacts.length === 0 && (
          <p className="main-empty">
            No contacts yet. Press Ctrl+Shift+B to capture a conversation.
          </p>
        )}

        <ul className="contact-list">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="contact-list-item"
              onClick={() => navigate(`/contacts/${encodeURIComponent(c.name)}`)}
            >
              <span className="contact-name">{c.name}</span>
              <span className="contact-platform">{c.platform}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
