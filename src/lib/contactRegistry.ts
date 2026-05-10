import { invoke } from "@tauri-apps/api/core";
import type { ExtractedMessage } from "./gateway";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContactMeta {
  id: string;
  display_name: string;
  aliases: string[];
  platform: string;
  created_at: string;
  capture_count: number;
  last_seen: string;
  persona_version: number;
}

interface AliasEntry {
  alias: string;
  contact_id: string;
}

// ── Alias cache ──────────────────────────────────────────────────────────────
// Module-level map: normalized_alias → contact_id.
// Refreshed after every ensureContact call.

let aliasCache = new Map<string, string>();

function normalizeAlias(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "")
    .trim();
}

export async function refreshAliasCache(): Promise<void> {
  try {
    const entries = await invoke<AliasEntry[]>("list_all_aliases");
    aliasCache = new Map(
      entries.map(({ alias, contact_id }) => [normalizeAlias(alias), contact_id]),
    );
  } catch {
    // Non-fatal — cache stays as-is; will be retried on next ensureContact.
  }
}

// ── ID sanitization (used only when creating a brand-new contact) ─────────────

export function sanitizeToId(name: string): string {
  const id = name
    .trim()
    .replace(/[/\\:*?"<>|\x00\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return id.length > 0 ? id : "unknown";
}

// ── Contact ID resolution ────────────────────────────────────────────────────

/**
 * Resolve an OCR-extracted name to a stable contact_id.
 *
 * Priority:
 *   1. activeContactId — if the user already has a contact selected, use it
 *   2. Alias cache exact match (case-insensitive, normalized)
 *   3. Alias cache fuzzy match (strip non-alphanumeric + lowercase)
 *   4. sanitizeToId(ocrName) — new contact, no prior record
 */
export async function resolveContactId(
  ocrName: string | null,
  activeContactId: string | null,
): Promise<string | null> {
  // When OCR returns nothing, fall back to whatever the user has manually selected.
  if (!ocrName || !ocrName.trim()) return activeContactId;

  const normalized = normalizeAlias(ocrName);

  // Cache may be empty on first call — load it.
  if (aliasCache.size === 0) {
    await refreshAliasCache();
  }

  const cached = aliasCache.get(normalized);
  if (cached) return cached;

  // No alias match → new contact.
  return sanitizeToId(ocrName);
}

// ── meta.json helpers ────────────────────────────────────────────────────────

async function readMeta(contactId: string): Promise<ContactMeta | null> {
  const raw = await invoke<string>("read_meta", { contactId });
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContactMeta;
  } catch {
    return null;
  }
}

async function writeMeta(contactId: string, meta: ContactMeta): Promise<void> {
  await invoke("write_meta", { contactId, content: JSON.stringify(meta, null, 2) });
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Contact initialization & maintenance ──────────────────────────────────────

export async function ensureContact(
  contactId: string,
  displayName: string,
  platform: string,
): Promise<void> {
  await invoke("ensure_dir", { relativePath: `contacts/${contactId}` });
  await invoke("ensure_dir", { relativePath: `contacts/${contactId}/versions` });

  const existing = await readMeta(contactId);

  if (!existing) {
    // New contact — write initial meta and stub files.
    const meta: ContactMeta = {
      id: contactId,
      display_name: displayName,
      aliases: [displayName],
      platform,
      created_at: nowIso(),
      capture_count: 1,
      last_seen: nowIso(),
      persona_version: 0,
    };
    await writeMeta(contactId, meta);

    // Stub persona.md only if absent.
    const existingPersona = await invoke<string>("read_file", {
      relativePath: `contacts/${contactId}/persona.md`,
    });
    if (!existingPersona || existingPersona.trim().length === 0) {
      const template = [
        `name: ${displayName}`,
        `platform: ${platform}`,
        "",
        "## Hard Rules",
        "",
        "## Identity",
        "",
        "## Communication Style",
        "",
        "## Emotional Pattern",
        "",
        "## Relationship Behavior",
        "",
      ].join("\n");
      await invoke("write_file", {
        relativePath: `contacts/${contactId}/persona.md`,
        content: template,
      });
    }

    // Stub memory.md only if absent.
    const existingMemory = await invoke<string>("read_file", {
      relativePath: `contacts/${contactId}/memory.md`,
    });
    if (!existingMemory || existingMemory.trim().length === 0) {
      await invoke("write_file", {
        relativePath: `contacts/${contactId}/memory.md`,
        content: `# Contact Memory: ${contactId}\n`,
      });
    }

    // Stub conversation.md only if absent.
    const existingConv = await invoke<string>("read_file", {
      relativePath: `contacts/${contactId}/conversation.md`,
    });
    if (!existingConv || existingConv.trim().length === 0) {
      await invoke("write_file", {
        relativePath: `contacts/${contactId}/conversation.md`,
        content: "",
      });
    }
  } else {
    // Existing contact — update capture_count, last_seen, and add alias if new.
    const updated: ContactMeta = { ...existing };
    updated.capture_count += 1;
    updated.last_seen = nowIso();

    const normalizedDisplay = normalizeAlias(displayName);
    const knownAliases = existing.aliases.map(normalizeAlias);
    if (!knownAliases.includes(normalizedDisplay)) {
      updated.aliases = [...existing.aliases, displayName];
    }

    await writeMeta(contactId, updated);
  }

  // Refresh alias cache so the next resolveContactId call sees the new alias.
  await refreshAliasCache();
}

// ── Conversation accumulation ─────────────────────────────────────────────────

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

// ── Meta accessors (used by ContactDetailView for badge count and versioning) ──

export async function getContactMeta(contactId: string): Promise<ContactMeta | null> {
  return readMeta(contactId);
}

export async function updateContactMeta(
  contactId: string,
  patch: Partial<ContactMeta>,
): Promise<void> {
  const existing = await readMeta(contactId);
  if (!existing) return;
  await writeMeta(contactId, { ...existing, ...patch });
}
