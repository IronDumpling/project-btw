import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore } from "../../lib/captureStore";
import { ensureContact, sanitizeToId } from "../../lib/contactRegistry";
import CaptureCard from "./CaptureCard";
import CaptureView from "./views/CapturesView";
import ContactDetailView from "./views/ContactDetailView";
import ProfileView from "./views/ProfileView";
import SettingsView from "./views/SettingsView";

type ActiveView = "captures" | "contacts" | "profile" | "settings";

interface SidebarBtnProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarBtn({ icon, label, active, onClick }: SidebarBtnProps) {
  return (
    <button
      className={`bubble-sidebar-btn${active ? " active" : ""}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

interface ContactEntry {
  id: string;
  name: string;
  platform: string;
}

interface ContactsPanelProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  reloadKey?: number;
}

function ContactsPanel({ selectedId, onSelect, reloadKey }: ContactsPanelProps) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useCaptureStore();

  function loadContacts() {
    invoke<ContactEntry[]>("list_contacts")
      .then(setContacts)
      .catch(() => setContacts([]));
  }

  useEffect(loadContacts, []);

  useEffect(() => {
    if (state.activeContactId) loadContacts();
  }, [state.activeContactId]);

  useEffect(() => {
    if (reloadKey !== undefined && reloadKey > 0) loadContacts();
  }, [reloadKey]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function confirmAdd() {
    const name = newName.trim();
    if (!name) return;
    const id = sanitizeToId(name);
    await ensureContact(id, name, "manual");
    loadContacts();
    setAdding(false);
    setNewName("");
    onSelect(id);
  }

  function cancelAdd() {
    setAdding(false);
    setNewName("");
  }

  return (
    <div className="bubble-contacts-panel">
      <div className="bubble-contacts-panel-header">
        <p className="bubble-contacts-panel-title">Contacts</p>
        <button className="contacts-add-icon-btn" onClick={() => setAdding(true)} title="Add contact">+</button>
      </div>
      {adding && (
        <div className="contacts-add-form">
          <input
            ref={inputRef}
            className="contacts-add-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") cancelAdd(); }}
            placeholder="Contact name"
          />
          <button className="contacts-add-btn" onClick={confirmAdd}>✓</button>
          <button className="contacts-add-btn" onClick={cancelAdd}>✕</button>
        </div>
      )}
      {contacts.length === 0 ? (
        <p className="bubble-contacts-empty">No contacts yet</p>
      ) : (
        contacts.map((c) => (
          <div
            key={c.id}
            className={`bubble-contact-entry${selectedId === c.id ? " selected" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <span className="bubble-contact-entry-name">{c.name}</span>
            {state.activeContactId === c.id && (
              <span className="bubble-contact-entry-active">●</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

interface Props {
  onCollapse: () => void;
  onClose: () => void;
  contactsCache: Record<string, string>;
}

export default function BubbleExpanded({ onCollapse, onClose, contactsCache }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>("captures");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactsReloadKey, setContactsReloadKey] = useState(0);
  const state = useCaptureStore();

  // When a capture comes in, auto-navigate to Capture tab
  useEffect(() => {
    if (state.captureCardVisible) {
      setActiveView("captures");
    }
  }, [state.captureCardVisible]);

  // When contact becomes active (e.g., via capture), auto-select it in the contacts panel
  useEffect(() => {
    if (state.activeContactId && selectedContactId !== state.activeContactId) {
      setSelectedContactId(state.activeContactId);
    }
  }, [state.activeContactId]);

  function selectContact(id: string) {
    setSelectedContactId(id);
    captureStore.setActiveContact(id);
  }

  const activeContactName = state.activeContactId
    ? (contactsCache[state.activeContactId] ?? state.analyzeResult?.contact_name ?? state.activeContactId)
    : null;

  return (
    <div className="bubble-expanded">
      {/* Title bar */}
      <div className="bubble-exp-header">
        <span className="bubble-exp-title" data-tauri-drag-region>project-btw</span>
        <div className="bubble-exp-actions">
          <button className="bubble-exp-collapse" onClick={onCollapse} aria-label="collapse">-</button>
          <button className="bubble-exp-close" onClick={onClose} aria-label="close">×</button>
        </div>
      </div>

      {/* Body: sidebar + optional contacts panel + main content */}
      <div className="bubble-body">
        <nav className="bubble-sidebar">
          <SidebarBtn icon="📷" label="Capture" active={activeView === "captures"} onClick={() => setActiveView("captures")} />
          <SidebarBtn icon="👥" label="Contacts" active={activeView === "contacts"} onClick={() => setActiveView("contacts")} />
          <div className="bubble-sidebar-spacer" />
          <SidebarBtn icon="👤" label="Profile" active={activeView === "profile"} onClick={() => setActiveView("profile")} />
          <SidebarBtn icon="⚙️" label="Settings" active={activeView === "settings"} onClick={() => setActiveView("settings")} />
        </nav>

        {activeView === "contacts" && (
          <ContactsPanel selectedId={selectedContactId} onSelect={selectContact} reloadKey={contactsReloadKey} />
        )}

        <div className="bubble-main-content">
          {activeView === "captures" ? (
            state.captureCardVisible ? (
              <CaptureCard />
            ) : (
              <CaptureView
                onGoToContacts={() => setActiveView("contacts")}
                activeContactName={activeContactName}
              />
            )
          ) : activeView === "contacts" ? (
            <ContactDetailView contactId={selectedContactId} onDeleted={() => {
              setSelectedContactId(null);
              captureStore.setActiveContact(null);
              setContactsReloadKey((k) => k + 1);
            }} />
          ) : activeView === "profile" ? (
            <ProfileView />
          ) : (
            <SettingsView />
          )}
        </div>
      </div>
    </div>
  );
}
