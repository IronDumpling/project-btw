import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore } from "../../lib/captureStore";
import CaptureCard from "./CaptureCard";
import HomeView from "./views/HomeView";
import ContactDetailView from "./views/ContactDetailView";
import CapturesView from "./views/CapturesView";
import ProfileView from "./views/ProfileView";
import SettingsView from "./views/SettingsView";

type ActiveView = "home" | "contacts" | "captures" | "profile" | "settings";

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
}

function ContactsPanel({ selectedId, onSelect }: ContactsPanelProps) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const state = useCaptureStore();

  function loadContacts() {
    invoke<ContactEntry[]>("list_contacts")
      .then(setContacts)
      .catch(() => setContacts([]));
  }

  useEffect(loadContacts, []);

  // Reload when a new capture completes (new contact may have been created)
  useEffect(() => {
    if (state.status === "done") loadContacts();
  }, [state.status === "done" ? state.analyzeResult?.contact_name : null]);

  return (
    <div className="bubble-contacts-panel">
      <p className="bubble-contacts-panel-title">Contacts</p>
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
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const state = useCaptureStore();

  // When a capture comes in, auto-navigate to show capture card
  useEffect(() => {
    if (state.captureCardVisible) {
      // No view switch needed — capture card replaces main content
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
          <SidebarBtn icon="🏠" label="Home" active={activeView === "home"} onClick={() => setActiveView("home")} />
          <SidebarBtn icon="👥" label="Contacts" active={activeView === "contacts"} onClick={() => setActiveView("contacts")} />
          <SidebarBtn icon="📷" label="Captures" active={activeView === "captures"} onClick={() => setActiveView("captures")} />
          <div className="bubble-sidebar-spacer" />
          <SidebarBtn icon="👤" label="Profile" active={activeView === "profile"} onClick={() => setActiveView("profile")} />
          <SidebarBtn icon="⚙️" label="Settings" active={activeView === "settings"} onClick={() => setActiveView("settings")} />
        </nav>

        {activeView === "contacts" && (
          <ContactsPanel selectedId={selectedContactId} onSelect={selectContact} />
        )}

        <div className="bubble-main-content">
          {state.captureCardVisible ? (
            <CaptureCard />
          ) : (
            <>
              {activeView === "home" && (
                <HomeView
                  onGoToContacts={() => setActiveView("contacts")}
                  activeContactName={activeContactName}
                />
              )}
              {activeView === "contacts" && (
                <ContactDetailView contactId={selectedContactId} />
              )}
              {activeView === "captures" && <CapturesView />}
              {activeView === "profile" && <ProfileView />}
              {activeView === "settings" && <SettingsView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
