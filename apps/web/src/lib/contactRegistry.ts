import type { ExtractedMessage } from "./gateway";
import {
  readFile,
  writeFile,
  appendToFile,
  ensureDir,
  readMeta as storageReadMeta,
  writeMeta as storageWriteMeta,
  listContacts as storageListContacts,
  deleteContact as storageDeleteContact,
  listAllAliases,
} from "./storage";
import type { ContactMeta, ContactEntry, AliasEntry } from "./storage";

export type { ContactMeta, ContactEntry, AliasEntry };

// ── Alias cache ───────────────────────────────────────────────────────────────

let aliasCache = new Map<string, string>();

function normalizeAlias(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "")
    .trim();
}

export async function refreshAliasCache(): Promise<void> {
  try {
    const entries = listAllAliases();
    aliasCache = new Map(
      entries.map(({ alias, contact_id }) => [normalizeAlias(alias), contact_id]),
    );
  } catch {
    // Non-fatal
  }
}

// ── ID sanitization ───────────────────────────────────────────────────────────

export function sanitizeToId(name: string): string {
  const id = name
    .trim()
    .replace(/[/\\:*?"<>|\x00\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return id.length > 0 ? id : "unknown";
}

// ── Contact ID resolution ─────────────────────────────────────────────────────

export async function resolveContactId(
  ocrName: string | null,
  activeContactId: string | null,
): Promise<string | null> {
  if (!ocrName || !ocrName.trim()) return activeContactId;

  const normalized = normalizeAlias(ocrName);

  if (aliasCache.size === 0) {
    await refreshAliasCache();
  }

  const cached = aliasCache.get(normalized);
  if (cached) return cached;

  return sanitizeToId(ocrName);
}

// ── meta.json helpers ─────────────────────────────────────────────────────────

async function readMeta(contactId: string): Promise<ContactMeta | null> {
  return Promise.resolve(storageReadMeta(contactId));
}

async function writeMeta(contactId: string, meta: ContactMeta): Promise<void> {
  storageWriteMeta(contactId, meta);
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
  ensureDir(`contacts/${contactId}`);
  ensureDir(`contacts/${contactId}/versions`);

  const existing = await readMeta(contactId);

  if (!existing) {
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

    const existingPersona = readFile(`contacts/${contactId}/persona.md`);
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
      writeFile(`contacts/${contactId}/persona.md`, template);
    }

    const existingMemory = readFile(`contacts/${contactId}/memory.md`);
    if (!existingMemory || existingMemory.trim().length === 0) {
      writeFile(`contacts/${contactId}/memory.md`, `# Contact Memory: ${contactId}\n`);
    }

    const existingConv = readFile(`contacts/${contactId}/conversation.md`);
    if (!existingConv || existingConv.trim().length === 0) {
      writeFile(`contacts/${contactId}/conversation.md`, "");
    }
  } else {
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
  const lines = messages
    .map((m) => `[${m.role === "user" ? "You" : "Contact"}] ${m.text}`)
    .join("\n");
  const block = `\n\n---\n\n**${timestamp}**\n\n${lines}`;

  appendToFile(convPath, block);
}

// ── Meta accessors ────────────────────────────────────────────────────────────

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

// ── List / delete (delegates to storage) ────────────────────────────────────

export function listContacts(): ContactEntry[] {
  return storageListContacts();
}

export function deleteContact(contactId: string): void {
  storageDeleteContact(contactId);
}
