import { invoke } from "@tauri-apps/api/core";
import type { ExtractedMessage } from "./gateway";

function sanitizeToId(name: string): string {
  const id = name
    .trim()
    .replace(/[/\\:*?"<>|\x00\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return id.length > 0 ? id : "unknown";
}

export function resolveContactId(
  ocrName: string | null,
  activeContactId: string | null,
): string | null {
  if (activeContactId) return activeContactId;
  if (!ocrName || !ocrName.trim()) return null;
  return sanitizeToId(ocrName);
}

export async function ensureContact(
  contactId: string,
  displayName: string,
  platform: string,
): Promise<void> {
  await invoke("ensure_dir", { relativePath: `contacts/${contactId}` });

  const existingPersona = await invoke<string>("read_file", {
    relativePath: `contacts/${contactId}/persona.md`,
  });
  if (!existingPersona || existingPersona.trim().length === 0) {
    const template = [
      `name: ${displayName}`,
      `platform: ${platform}`,
      "",
      "## Identity",
      "",
      "## Communication Style",
      "",
      "## Emotional Pattern",
      "",
      "## Relationship Dynamic",
      "",
      "## Hard Rules",
      "",
    ].join("\n");
    await invoke("write_file", {
      relativePath: `contacts/${contactId}/persona.md`,
      content: template,
    });
  }

  // read_file returns "" for missing files — write an empty conversation.md on init
  const existingConv = await invoke<string>("read_file", {
    relativePath: `contacts/${contactId}/conversation.md`,
  });
  if (!existingConv || existingConv.trim().length === 0) {
    await invoke("write_file", {
      relativePath: `contacts/${contactId}/conversation.md`,
      content: "",
    });
  }
}

export async function appendConversation(
  contactId: string,
  messages: ExtractedMessage[],
  timestamp: string,
): Promise<void> {
  if (messages.length === 0) return;

  const convPath = `contacts/${contactId}/conversation.md`;
  const existing = await invoke<string>("read_file", { relativePath: convPath });

  const lines = messages
    .map((m) => `[${m.role === "user" ? "You" : "Contact"}] ${m.text}`)
    .join("\n");
  const block = `\n\n---\n\n**${timestamp}**\n\n${lines}`;

  await invoke("write_file", {
    relativePath: convPath,
    content: (existing ?? "") + block,
  });
}
