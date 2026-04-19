import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useParams, useNavigate } from "react-router-dom";
import NavSidebar from "../../components/NavSidebar";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../../lib/captureStore";
import { chatLearning } from "../../lib/gateway";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<string>("");
  const [contactDisplayName, setContactDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const captureState = useCaptureStore();

  const contactId = decodeURIComponent(id ?? "");
  const updateCount = captureState.personaUpdateCount[contactId] ?? 0;
  const showBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  useEffect(() => {
    if (!contactId) return;
    setContactDisplayName(contactId);
    invoke<string>("read_file", { relativePath: `contacts/${contactId}/persona.md` })
      .then((content) => {
        setPersona(content);
        const nameLine = content.split("\n").find((l) => l.startsWith("name:"));
        if (nameLine) setContactDisplayName(nameLine.split(":")[1].trim());
      })
      .catch(() => setPersona(""))
      .finally(() => setLoading(false));
  }, [contactId]);

  async function handlePersonaPatch() {
    if (!contactId) return;
    captureStore.setPersonaPatchStatus("patching");

    try {
      const existing = await invoke<string>("read_file", {
        relativePath: `contacts/${contactId}/persona.md`,
      });

      const evidence = captureState.analyzeResult?.messages
        .map((m) => `[${m.role === "user" ? "You" : contactDisplayName}] ${m.text}`)
        .join("\n") ?? "";

      const mergeInput = [
        "=== EXISTING PERSONA ===",
        existing,
        "",
        "=== NEW EVIDENCE ===",
        evidence,
        "",
        "=== PATCH MODE ===",
        "dynamic_only",
      ].join("\n");

      const response = await chatLearning({
        messages: [
          { role: "system", content: "You are a persona architect performing an incremental update. Follow the merge.md prompt instructions." },
          { role: "user", content: mergeInput },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const tmpPath = `contacts/${contactId}/persona.tmp.md`;
      const finalPath = `contacts/${contactId}/persona.md`;

      await invoke("write_file", { relativePath: tmpPath, content: response.content });
      await invoke("rename_file", { fromPath: tmpPath, toPath: finalPath });

      setPersona(response.content);
      captureStore.onPersonaPatchSuccess(contactId);
    } catch (e) {
      captureStore.setPersonaPatchStatus(
        "error",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return (
    <div className="main-layout">
      <NavSidebar />
      <main className="main-content">
        <button className="back-btn" onClick={() => navigate("/contacts")}>← Contacts</button>
        <h1 className="main-heading">{contactDisplayName || contactId}</h1>

        {showBadge && (
          <div className="persona-badge">
            <span>{updateCount} new captures — persona can be updated</span>
            <button
              className="persona-update-btn"
              disabled={captureState.personaPatchStatus === "patching"}
              onClick={handlePersonaPatch}
            >
              {captureState.personaPatchStatus === "patching" ? "Updating…" : "Update Persona"}
            </button>
            {captureState.personaPatchStatus === "error" && (
              <p className="persona-patch-error">{captureState.personaPatchError}</p>
            )}
          </div>
        )}

        {loading && <p className="main-loading">Loading…</p>}

        {!loading && !persona && (
          <p className="main-empty">No persona yet for {contactDisplayName || contactId}.</p>
        )}

        {persona && (
          <pre className="persona-content">{persona}</pre>
        )}
      </main>
    </div>
  );
}
