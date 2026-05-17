import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../lib/captureStore";
import { compressConversation, mergePersona, updateRelationship, buildRelationship } from "../lib/gateway";
import { getContactMeta, updateContactMeta } from "../lib/contactRegistry";
import { extractSection, truncateToTokens } from "../lib/contextAssembler";
import { readFile, writeFile, appendToFile, copyFile, renameFile, deleteContact } from "../lib/storage";

function pruneConversation(raw: string, keepBlocks: number): string {
  const blocks = raw.split(/\n\n---\n\n/);
  if (blocks.length <= keepBlocks) return raw;
  return blocks.slice(-keepBlocks).join("\n\n---\n\n");
}

export default function ContactDetail() {
  const { id: contactId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState("");
  const [memory, setMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [metaCaptureCount, setMetaCaptureCount] = useState(0);

  const captureState = useCaptureStore();

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    setPersona("");
    setMemory("");
    setDisplayName(contactId);
    setMetaCaptureCount(0);

    Promise.all([
      Promise.resolve(readFile(`contacts/${contactId}/persona.md`)),
      Promise.resolve(readFile(`contacts/${contactId}/memory.md`)),
      getContactMeta(contactId),
    ])
      .then(([p, m, meta]) => {
        setPersona(p ?? "");
        setMemory(m ?? "");
        if (meta) setMetaCaptureCount(meta.capture_count);
        const nameLine = (p ?? "").split("\n").find((l) => l.startsWith("name:"));
        if (nameLine) setDisplayName(nameLine.split(":")[1].trim());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contactId]);

  useEffect(() => {
    if (!contactId || captureState.status !== "done") return;
    getContactMeta(contactId)
      .then((meta) => { if (meta) setMetaCaptureCount(meta.capture_count); })
      .catch(() => {});
  }, [captureState.analyzeResult, contactId]);

  const storeCount = contactId ? (captureState.personaUpdateCount[contactId] ?? 0) : 0;
  const updateCount = Math.max(storeCount, metaCaptureCount);
  const showBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  async function handlePersonaPatch() {
    if (!contactId) return;
    captureStore.setPersonaPatchStatus("patching");

    try {
      const conversationRaw = readFile(`contacts/${contactId}/conversation.md`);
      const conversation = truncateToTokens(conversationRaw ?? "", 3000);

      if (!conversation.trim()) {
        captureStore.setPersonaPatchStatus("error", "No conversation history to compress.");
        return;
      }

      const evidence = await compressConversation(conversation, contactId);

      if (evidence.memory_updates.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const newEntries = evidence.memory_updates
          .map((item) => `- [${today}] ${item}`)
          .join("\n");
        appendToFile(`contacts/${contactId}/memory.md`, "\n" + newEntries);
      }

      const meta = await getContactMeta(contactId);
      const version = meta?.persona_version ?? 0;
      try {
        copyFile(
          `contacts/${contactId}/persona.md`,
          `contacts/${contactId}/versions/persona_v${version}.md`,
        );
      } catch {
        // Backup failure doesn't block the merge
      }

      const patchMode = version === 0 ? "full" : "dynamic_only";
      const existingPersona = readFile(`contacts/${contactId}/persona.md`);
      const mergeResult = await mergePersona(existingPersona ?? "", evidence, patchMode);

      writeFile(`contacts/${contactId}/persona.tmp.md`, mergeResult.persona);
      renameFile(`contacts/${contactId}/persona.tmp.md`, `contacts/${contactId}/persona.md`);

      const pruned = pruneConversation(conversationRaw ?? "", 10);
      writeFile(`contacts/${contactId}/conversation.md`, pruned);

      await updateContactMeta(contactId, {
        persona_version: version + 1,
        capture_count: 0,
      });

      try {
        const currentRelationshipRaw = readFile(`contacts/${contactId}/relationship.json`);
        const personaSummary = [
          extractSection(mergeResult.persona, "Hard Rules"),
          extractSection(mergeResult.persona, "Relationship Behavior"),
        ]
          .filter(Boolean)
          .join("\n\n");

        const relationship = currentRelationshipRaw?.trim()
          ? await updateRelationship(currentRelationshipRaw, evidence, personaSummary)
          : await buildRelationship(evidence, personaSummary);

        writeFile(
          `contacts/${contactId}/relationship.json`,
          JSON.stringify(relationship, null, 2),
        );
      } catch {
        // Relationship update failure doesn't block persona success
      }

      setPersona(mergeResult.persona);
      setMemory(readFile(`contacts/${contactId}/memory.md`) ?? "");
      setMetaCaptureCount(0);
      captureStore.onPersonaPatchSuccess(contactId);
    } catch (e) {
      captureStore.setPersonaPatchStatus("error", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete() {
    if (!contactId) return;
    const confirmed = window.confirm(`Delete contact "${displayName}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      deleteContact(contactId);
      navigate("/dashboard");
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!contactId) {
    return (
      <div className="page-container">
        <p className="view-empty">Select a contact from the list.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← 返回</button>
        <h2 className="view-heading" style={{ margin: 0 }}>
          {loading ? "Loading…" : displayName}
        </h2>
      </div>

      {showBadge && (
        <div className="persona-badge" style={{ marginBottom: 16 }}>
          <span style={{ flex: 1 }}>
            {updateCount} new captures — persona can be updated
          </span>
          <button
            className="persona-update-btn"
            disabled={captureState.personaPatchStatus === "patching"}
            onClick={handlePersonaPatch}
          >
            {captureState.personaPatchStatus === "patching" ? "Updating…" : "Update Persona"}
          </button>
          {captureState.personaPatchStatus === "error" && captureState.personaPatchError && (
            <p className="persona-patch-error">{captureState.personaPatchError}</p>
          )}
        </div>
      )}

      {memory && memory.trim().length > 0 && (
        <div className="dashboard-card">
          <p className="view-section-label">Memory</p>
          <pre className="view-persona-text" style={{ margin: 0 }}>{memory}</pre>
        </div>
      )}

      {persona ? (
        <div className="dashboard-card">
          <p className="view-section-label">Persona</p>
          <pre className="view-persona-text" style={{ margin: 0 }}>{persona}</pre>
        </div>
      ) : (
        !loading && <p className="view-empty">No persona yet.</p>
      )}

      <div className="contact-actions">
        <button className="contact-action-btn danger" onClick={handleDelete}>Delete</button>
        <button className="contact-action-btn" disabled title="Coming soon">Merge</button>
        <button className="contact-action-btn" disabled title="Coming soon">Split</button>
      </div>
    </div>
  );
}
