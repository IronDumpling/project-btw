import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useParams, useNavigate } from "react-router-dom";
import NavSidebar from "../../components/NavSidebar";
import { captureStore, useCaptureStore, PERSONA_UPDATE_THRESHOLD } from "../../lib/captureStore";
import { chatLearning } from "../../lib/gateway";

export default function ContactDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const captureState = useCaptureStore();

  const contactName = decodeURIComponent(name ?? "");
  const updateCount = captureState.personaUpdateCount[contactName] ?? 0;
  const showBadge = updateCount >= PERSONA_UPDATE_THRESHOLD;

  useEffect(() => {
    if (!contactName) return;
    invoke<string>("read_file", { relativePath: `contacts/${contactName}.md` })
      .then(setPersona)
      .catch(() => setPersona(""))
      .finally(() => setLoading(false));
  }, [contactName]);

  async function handlePersonaPatch() {
    if (!contactName) return;
    captureStore.setPersonaPatchStatus("patching");

    try {
      // Load current persona and conversation evidence
      const existing = await invoke<string>("read_file", {
        relativePath: `contacts/${contactName}.md`,
      });

      // Build the merge prompt input
      const evidence = captureState.analyzeResult?.messages
        .map((m) => `[${m.role === "user" ? "You" : contactName}] ${m.text}`)
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

      // Atomic write: write to .tmp first, then rename
      const tmpPath = `contacts/${contactName}.tmp.md`;
      const finalPath = `contacts/${contactName}.md`;

      await invoke("write_file", { relativePath: tmpPath, content: response.content });
      await invoke("rename_file", { fromPath: tmpPath, toPath: finalPath });

      // Refresh displayed persona
      setPersona(response.content);
      captureStore.onPersonaPatchSuccess(contactName);
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
        <h1 className="main-heading">{contactName}</h1>

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
          <p className="main-empty">No persona yet for {contactName}.</p>
        )}

        {persona && (
          <pre className="persona-content">{persona}</pre>
        )}
      </main>
    </div>
  );
}
