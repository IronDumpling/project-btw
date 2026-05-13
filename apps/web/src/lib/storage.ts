const PREFIX = "btw:";
const CONTACTS_INDEX_KEY = "btw:__contacts_index__";
const ALIASES_INDEX_KEY = "btw:__aliases_index__";

// ── Core file operations ─────────────────────────────────────────────────────

export function readFile(relativePath: string): string {
  return localStorage.getItem(PREFIX + relativePath) ?? "";
}

export function writeFile(relativePath: string, content: string): void {
  localStorage.setItem(PREFIX + relativePath, content);
}

export function appendToFile(relativePath: string, content: string): void {
  const existing = readFile(relativePath);
  writeFile(relativePath, existing + content);
}

export function renameFile(fromPath: string, toPath: string): void {
  const content = readFile(fromPath);
  writeFile(toPath, content);
  localStorage.removeItem(PREFIX + fromPath);
}

export function copyFile(fromPath: string, toPath: string): void {
  writeFile(toPath, readFile(fromPath));
}

// No-op: localStorage has no real directories.
export function ensureDir(_relativePath: string): void {}

// ── Contact index ────────────────────────────────────────────────────────────

function getContactsIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CONTACTS_INDEX_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function addToContactsIndex(contactId: string): void {
  const index = getContactsIndex();
  if (!index.includes(contactId)) {
    index.push(contactId);
    localStorage.setItem(CONTACTS_INDEX_KEY, JSON.stringify(index));
  }
}

function removeFromContactsIndex(contactId: string): void {
  const index = getContactsIndex().filter((id) => id !== contactId);
  localStorage.setItem(CONTACTS_INDEX_KEY, JSON.stringify(index));
}

// ── Contact meta ─────────────────────────────────────────────────────────────

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

export function readMeta(contactId: string): ContactMeta | null {
  const raw = readFile(`contacts/${contactId}/meta.json`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContactMeta;
  } catch {
    return null;
  }
}

export function writeMeta(contactId: string, meta: ContactMeta): void {
  writeFile(`contacts/${contactId}/meta.json`, JSON.stringify(meta, null, 2));
  addToContactsIndex(contactId);
  rebuildAliasIndex();
}

// ── Contact list ─────────────────────────────────────────────────────────────

export interface ContactEntry {
  id: string;
  name: string;
  platform: string;
}

export function listContacts(): ContactEntry[] {
  return getContactsIndex()
    .map((id) => {
      const meta = readMeta(id);
      return meta
        ? { id, name: meta.display_name, platform: meta.platform }
        : { id, name: id, platform: "unknown" };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Delete contact ───────────────────────────────────────────────────────────

const CONTACT_FILE_SUFFIXES = [
  "meta.json",
  "persona.md",
  "memory.md",
  "conversation.md",
  "relationship.json",
  "persona.tmp.md",
];

export function deleteContact(contactId: string): void {
  CONTACT_FILE_SUFFIXES.forEach((suffix) => {
    localStorage.removeItem(`${PREFIX}contacts/${contactId}/${suffix}`);
  });
  const versionPrefix = `${PREFIX}contacts/${contactId}/versions/`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(versionPrefix))
    .forEach((k) => localStorage.removeItem(k));
  removeFromContactsIndex(contactId);
  rebuildAliasIndex();
}

// ── Alias index ──────────────────────────────────────────────────────────────

export interface AliasEntry {
  alias: string;
  contact_id: string;
}

function rebuildAliasIndex(): void {
  const entries: AliasEntry[] = [];
  getContactsIndex().forEach((id) => {
    const meta = readMeta(id);
    if (meta) {
      meta.aliases.forEach((alias) => entries.push({ alias, contact_id: id }));
    }
  });
  localStorage.setItem(ALIASES_INDEX_KEY, JSON.stringify(entries));
}

export function listAllAliases(): AliasEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ALIASES_INDEX_KEY) ?? "[]") as AliasEntry[];
  } catch {
    return [];
  }
}
