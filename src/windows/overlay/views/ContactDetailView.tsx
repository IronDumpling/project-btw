import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../../../lib/captureStore";
import { chatLearning } from "../../../lib/gateway";

interface Props {
  contactId: string | null;
}

export default function ContactDetailView({ contactId }: Props) {
  const [persona, setPersona] = useState("");
  const [conversation, setConversation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const captureState = useCaptureStore();

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    setPersona("");
    setConversation("");
    setDisplayName(contactId);

    Promise.all([
      invoke<string>("read_file", { relativePath: `contacts/${contactId}/persona.md` }),
      invoke<string>("read_file", { relativePath: `contacts/${contactId}/conversation.md` }),
    ])
      .then(([p, c]) => {
        setPersona(p ?? "");
        setConversation(c ?? "");
        const nameLine = (p ?? "").split("\n").find((l) => l.startsWith("name:"));
        if (nameLine) setDisplayName(nameLine.split(":")[1].trim());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contactId]);

  const updateCount = contactId ? (captureState.personaUpdateCount[contactId] ?? 0) : 0;
  const showBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  async function handlePersonaPatch() {
    if (!contactId) return;
    captureStore.setPersonaPatchStatus("patching");
    try {
      const existing = await invoke<string>("read_file", { relativePath: `contacts/${contactId}/persona.md` });
      const evidence = captureState.analyzeResult?.messages
        .map((m) => `[${m.role === "user" ? "You" : displayName}] ${m.text}`)
        .join("\n") ?? "";

      const mergeInput = [
        "=== EXISTING PERSONA ===", existing, "",
        "=== NEW EVIDENCE ===", evidence, "",
        "=== PATCH MODE ===", "dynamic_only",
      ].join("\n");

      const response = await chatLearning({
        messages: [
          { role: "system", content: "You are a persona architect performing an incremental update. Follow the merge.md prompt instructions." },
          { role: "user", content: mergeInput },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      await invoke("write_file", { relativePath: `contacts/${contactId}/persona.tmp.md`, content: response.content });
      await invoke("rename_file", { fromPath: `contacts/${contactId}/persona.tmp.md`, toPath: `contacts/${contactId}/persona.md` });
      setPersona(response.content);
      captureStore.onPersonaPatchSuccess(contactId);
    } catch (e) {
      captureStore.setPersonaPatchStatus("error", e instanceof Error ? e.message : String(e));
    }
  }

  if (!contactId) {
    return <p className="contact-detail-empty">← Select a contact from the list</p>;
  }

  if (loading) {
    return <p className="view-empty">Loading…</p>;
  }

  return (
    <div>
      <p className="contact-detail-name">{displayName}</p>

      {showBadge && (
        <div className="persona-badge" style={{ marginBottom: 12 }}>
          <span>{updateCount} new captures — persona can be updated</span>
          <button
            className="persona-update-btn"
            disabled={captureState.personaPatchStatus === "patching"}
            onClick={handlePersonaPatch}
          >
            {captureState.personaPatchStatus === "patching" ? "Updating…" : "Update Persona"}
          </button>
        </div>
      )}

      {persona ? (
        <div className="contact-detail-section">
          <p className="contact-detail-section-title">Persona</p>
          <pre className="contact-detail-persona">{persona}</pre>
        </div>
      ) : (
        <p className="view-empty" style={{ marginBottom: 12 }}>No persona yet.</p>
      )}

      {conversation && (
        <div className="contact-detail-section">
          <p className="contact-detail-section-title">Conversation History</p>
          <pre className="contact-detail-conv">{conversation}</pre>
        </div>
      )}
    </div>
  );
}
