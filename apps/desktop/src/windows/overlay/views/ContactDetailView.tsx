import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../../../lib/captureStore";
import { compressConversation, mergePersona, updateRelationship, buildRelationship } from "../../../lib/gateway";
import { getContactMeta, updateContactMeta } from "../../../lib/contactRegistry";
import { extractSection, truncateToTokens } from "../../../lib/contextAssembler";

interface Props {
  contactId: string | null;
  onDeleted?: () => void;
}

// Keep the last N capture blocks (separated by \n\n---\n\n) in conversation.md.
function pruneConversation(raw: string, keepBlocks: number): string {
  const blocks = raw.split(/\n\n---\n\n/);
  if (blocks.length <= keepBlocks) return raw;
  return blocks.slice(-keepBlocks).join("\n\n---\n\n");
}

export default function ContactDetailView({ contactId, onDeleted }: Props) {
  const [persona, setPersona] = useState("");
  const [memory, setMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  // capture_count from meta.json — persists across restarts
  const [metaCaptureCount, setMetaCaptureCount] = useState(0);

  const captureState = useCaptureStore();

  // Load contact files and meta on contact change
  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    setPersona("");
    setMemory("");
    setDisplayName(contactId);
    setMetaCaptureCount(0);

    Promise.all([
      invoke<string>("read_file", { relativePath: `contacts/${contactId}/persona.md` }),
      invoke<string>("read_file", { relativePath: `contacts/${contactId}/memory.md` }),
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

  // Re-read meta capture_count after each completed capture (badge stays in sync)
  useEffect(() => {
    if (!contactId || captureState.status !== "done") return;
    getContactMeta(contactId)
      .then((meta) => { if (meta) setMetaCaptureCount(meta.capture_count); })
      .catch(() => {});
  }, [captureState.analyzeResult, contactId]);

  // Badge uses the higher of in-memory store count and persisted meta count
  const storeCount = contactId ? (captureState.personaUpdateCount[contactId] ?? 0) : 0;
  const updateCount = Math.max(storeCount, metaCaptureCount);
  const showBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  async function handlePersonaPatch() {
    if (!contactId) return;
    captureStore.setPersonaPatchStatus("patching");

    try {
      // Step 1: Read accumulated conversation history
      const conversationRaw = await invoke<string>("read_file", {
        relativePath: `contacts/${contactId}/conversation.md`,
      });
      const conversation = truncateToTokens(conversationRaw ?? "", 3000);

      if (!conversation.trim()) {
        captureStore.setPersonaPatchStatus("error", "No conversation history to compress.");
        return;
      }

      // Step 2: Compress conversation → structured evidence JSON
      const evidence = await compressConversation(conversation, contactId);

      // Step 2a: Append memory_updates to memory.md (factual observations only)
      if (evidence.memory_updates.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const newEntries = evidence.memory_updates
          .map((item) => `- [${today}] ${item}`)
          .join("\n");
        await invoke("append_to_file", {
          relativePath: `contacts/${contactId}/memory.md`,
          content: "\n" + newEntries,
        });
      }

      // Step 3: Version backup (non-fatal if it fails)
      const meta = await getContactMeta(contactId);
      const version = meta?.persona_version ?? 0;
      try {
        await invoke("copy_file", {
          fromPath: `contacts/${contactId}/persona.md`,
          toPath: `contacts/${contactId}/versions/persona_v${version}.md`,
        });
      } catch {
        // Backup failure doesn't block the merge
      }

      // Step 4: Merge persona with compressed evidence
      // First build (version === 0): use "full" so Identity + Hard Rules get populated from evidence.
      // Subsequent updates: dynamic_only preserves stable layers.
      const patchMode = version === 0 ? "full" : "dynamic_only";
      const existingPersona = await invoke<string>("read_file", {
        relativePath: `contacts/${contactId}/persona.md`,
      });
      const mergeResult = await mergePersona(existingPersona ?? "", evidence, patchMode);

      // Step 5: Atomic write (tmp → rename)
      await invoke("write_file", {
        relativePath: `contacts/${contactId}/persona.tmp.md`,
        content: mergeResult.persona,
      });
      await invoke("rename_file", {
        fromPath: `contacts/${contactId}/persona.tmp.md`,
        toPath: `contacts/${contactId}/persona.md`,
      });

      // Step 6: Prune conversation history to last 10 capture blocks
      const pruned = pruneConversation(conversationRaw ?? "", 10);
      await invoke("write_file", {
        relativePath: `contacts/${contactId}/conversation.md`,
        content: pruned,
      });

      // Step 7: Update meta.json (persona_version++, capture_count reset)
      await updateContactMeta(contactId, {
        persona_version: version + 1,
        capture_count: 0,
      });

      // Step 8: Relationship state update (non-fatal)
      // First time: use builder.md to initialize from scratch.
      // Subsequent: use updater.md for incremental updates.
      try {
        const currentRelationshipRaw = await invoke<string>("read_file", {
          relativePath: `contacts/${contactId}/relationship.json`,
        });
        const personaSummary = [
          extractSection(mergeResult.persona, "Hard Rules"),
          extractSection(mergeResult.persona, "Relationship Behavior"),
        ]
          .filter(Boolean)
          .join("\n\n");

        const relationship = currentRelationshipRaw?.trim()
          ? await updateRelationship(currentRelationshipRaw, evidence, personaSummary)
          : await buildRelationship(evidence, personaSummary);

        await invoke("write_file", {
          relativePath: `contacts/${contactId}/relationship.json`,
          content: JSON.stringify(relationship, null, 2),
        });
      } catch {
        // Relationship update failure doesn't block persona success
      }

      // Update UI state
      setPersona(mergeResult.persona);
      const updatedMemory = await invoke<string>("read_file", {
        relativePath: `contacts/${contactId}/memory.md`,
      });
      setMemory(updatedMemory ?? "");
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
      await invoke("delete_contact", { contactId });
      onDeleted?.();
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : String(e)}`);
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
          {captureState.personaPatchStatus === "error" && captureState.personaPatchError && (
            <p style={{ color: "red", fontSize: 12, marginTop: 4 }}>
              {captureState.personaPatchError}
            </p>
          )}
        </div>
      )}

      {memory && memory.trim().length > 0 && (
        <div className="contact-detail-section">
          <p className="contact-detail-section-title">Memory</p>
          <pre className="contact-detail-persona">{memory}</pre>
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

      <div className="contact-actions">
        <button className="contact-action-btn danger" onClick={handleDelete}>
          Delete
        </button>
        <button className="contact-action-btn" disabled title="Coming soon">
          Merge
        </button>
        <button className="contact-action-btn" disabled title="Coming soon">
          Split
        </button>
      </div>
    </div>
  );
}
