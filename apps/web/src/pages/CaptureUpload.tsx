import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { captureStore, useCaptureStore } from "../lib/captureStore";
import {
  uploadImageAsBase64,
  analyzePerception,
  runIntelligencePipeline,
} from "../lib/gateway";
import type { CaptureEvent } from "../lib/gateway";
import { resolveContactId, ensureContact, appendConversation } from "../lib/contactRegistry";
import { buildContext } from "../lib/contextAssembler";
import { readFile } from "../lib/storage";

export default function CaptureUpload() {
  const state = useCaptureStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<number | null>(null);

  async function handleUpload() {
    const base64 = await uploadImageAsBase64();
    if (!base64) return;

    captureStore.reset();
    captureStore.setStatus("analyzing");

    const event: CaptureEvent = {
      screenshot: base64,
      window_title: "Manual Upload",
      timestamp: String(Date.now() / 1000),
    };

    try {
      const result = await analyzePerception(base64, "Manual Upload");
      const contactId = await resolveContactId(result.contact_name, state.activeContactId);
      captureStore.setCaptureResult(event, result, contactId ?? undefined);

      captureStore.setStatus("reasoning");

      const userPersona = readFile("user/persona.md");
      const userMemory = readFile("user/memory.md");
      const contactPersona = contactId ? readFile(`contacts/${contactId}/persona.md`) : "";
      const contactMemory = contactId ? readFile(`contacts/${contactId}/memory.md`) : "";
      const relState = contactId ? readFile(`contacts/${contactId}/relationship.json`) : "";

      const { systemPrompt } = buildContext(
        userPersona,
        contactPersona || null,
        result.messages,
        undefined,
        contactMemory || null,
        relState || null,
        userMemory || null,
      );

      const pipeline = await runIntelligencePipeline({
        contact_name: result.contact_name ?? "unknown",
        messages: result.messages,
        user_context: systemPrompt,
      });

      captureStore.setReasoningResult(
        pipeline.subtext.subtext,
        pipeline.reply_drafts.map((d) => d.text),
      );

      if (contactId) {
        await ensureContact(contactId, result.contact_name ?? contactId, result.platform ?? "unknown");
        await appendConversation(contactId, result.messages, new Date().toLocaleString());
        captureStore.setActiveContact(contactId);
      }
    } catch (e) {
      captureStore.setError(e instanceof Error ? e.message : String(e));
    }
  }

  function copyReply(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const result = state.analyzeResult;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "var(--btw-text-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}>
          ← 返回
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--btw-text)" }}>上传截图分析</h2>
      </div>

      {/* Upload button */}
      {(state.status === "idle" || state.status === "error") && (
        <button
          onClick={handleUpload}
          style={{ width: "100%", padding: "48px 20px", background: "var(--btw-surface)", border: "2px dashed var(--btw-border)", borderRadius: 12, fontSize: 15, color: "var(--btw-text-muted)", cursor: "pointer", textAlign: "center" }}
        >
          点击选择截图
          <br />
          <span style={{ fontSize: 12, marginTop: 6, display: "block" }}>支持 PNG、JPG、WEBP</span>
        </button>
      )}

      {state.status === "error" && state.error && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--btw-surface-2)", border: "1px solid var(--btw-danger)", borderRadius: 8, fontSize: 13, color: "var(--btw-danger)" }}>
          {state.error}
        </div>
      )}

      {/* Analyzing */}
      {state.status === "analyzing" && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--btw-text-muted)", fontSize: 14 }}>
          <div className="app-loading-spinner" style={{ margin: "0 auto 16px" }} />
          识别截图内容…
        </div>
      )}

      {/* Reasoning */}
      {state.status === "reasoning" && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--btw-text-muted)", fontSize: 14 }}>
          <div className="app-loading-spinner" style={{ margin: "0 auto 16px" }} />
          分析对话、生成回复建议…
        </div>
      )}

      {/* Results */}
      {state.status === "done" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Contact detected */}
          {result.contact_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--btw-text-muted)" }}>联系人</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--btw-text)" }}>{result.contact_name}</span>
              {result.platform && (
                <span style={{ fontSize: 11, color: "var(--btw-text-muted)", background: "var(--btw-surface)", padding: "2px 6px", borderRadius: 4 }}>{result.platform}</span>
              )}
              {state.activeContactId && (
                <button
                  onClick={() => navigate(`/contacts/${state.activeContactId}`)}
                  style={{ marginLeft: "auto", fontSize: 12, color: "var(--btw-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  查看联系人 →
                </button>
              )}
            </div>
          )}

          {/* Subtext */}
          {state.subtextResult && (
            <div style={{ background: "var(--btw-surface)", border: "1px solid var(--btw-border)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--btw-text-muted)", marginBottom: 8 }}>潜台词解读</p>
              <p style={{ fontSize: 14, color: "var(--btw-text)", lineHeight: 1.65, margin: 0 }}>{state.subtextResult}</p>
            </div>
          )}

          {/* Reply drafts */}
          {state.replyDrafts.length > 0 && (
            <div style={{ background: "var(--btw-surface)", border: "1px solid var(--btw-border)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--btw-text-muted)", marginBottom: 12 }}>回复建议</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {state.replyDrafts.map((draft, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--btw-surface-2)", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ flex: 1, fontSize: 14, color: "var(--btw-text)", margin: 0, lineHeight: 1.5 }}>{draft}</p>
                    <button
                      onClick={() => copyReply(draft, i)}
                      style={{ flexShrink: 0, fontSize: 12, color: copied === i ? "var(--btw-success)" : "var(--btw-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                    >
                      {copied === i ? "已复制" : "复制"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload again */}
          <button
            onClick={handleUpload}
            style={{ padding: "10px 16px", background: "none", border: "1px solid var(--btw-border)", borderRadius: 8, fontSize: 13, color: "var(--btw-text-muted)", cursor: "pointer" }}
          >
            再上传一张
          </button>
        </div>
      )}
    </div>
  );
}
