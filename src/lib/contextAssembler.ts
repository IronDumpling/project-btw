/**
 * Context Assembly — prevents context rot as persona files grow.
 *
 * Problem: injecting a full persona.md into every LLM call means token cost
 * and latency grow super-linearly as files accumulate patch history.
 * Solution: section-level extraction with hard token budgets.
 *
 * Budget defaults (in tokens, approx 4 chars/token):
 *   user_core        500   Hard Rules + Identity (Layers 0–1)
 *   contact_relevant 300   contact persona relevant sections
 *   conversation_max 1000  current conversation messages
 *
 * Injection priority when space is short:
 *   1. Hard Rules (Layer 0) — never truncated
 *   2. Identity (Layer 1)   — max 200 tokens
 *   3. Communication Style  — max 200 tokens
 *   4. Contact persona      — max 300 tokens
 *   5. Conversation messages — remaining budget
 */

import type { ExtractedMessage } from "./gateway";

export interface ContextBudgets {
  userCore: number;
  contactRelevant: number;
  conversationMax: number;
}

const DEFAULT_BUDGETS: ContextBudgets = {
  userCore: 500,
  contactRelevant: 300,
  conversationMax: 1000,
};

export interface AssembledContext {
  systemPrompt: string;
  budgetUsed: {
    user: number;
    contact: number;
    conversation: number;
  };
}

/**
 * Extract a single ## section from a Markdown document.
 * Returns empty string if the section is not found.
 */
export function extractSection(md: string, heading: string): string {
  // Match "## heading\n" and capture until next "## " or end of string
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `^##\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^##\\s|\\z)`,
    "mi",
  );
  const match = md.match(regex);
  if (!match) return "";
  return `## ${heading}\n${match[1].trim()}`;
}

/**
 * Rough token estimate: ~4 chars per token (covers mixed CJK + Latin).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within maxTokens, preserving complete sentences/lines.
 * Adds "[truncated]" marker when text is cut.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text;

  const maxChars = maxTokens * 4;
  const lines = text.split("\n");
  let result = "";
  for (const line of lines) {
    if (estimateTokens(result + "\n" + line) > maxTokens) break;
    result += (result ? "\n" : "") + line;
  }
  // Fallback: hard-truncate at char limit
  if (!result) result = text.slice(0, maxChars);
  return result + "\n[truncated]";
}

/**
 * Format a conversation message list as a compact string.
 */
function formatMessages(messages: ExtractedMessage[]): string {
  return messages
    .map((m) => `[${m.role === "user" ? "You" : "Contact"}] ${m.text}`)
    .join("\n");
}

/**
 * Assemble a context-budgeted system prompt for reasoning/learning calls.
 *
 * Injection priority:
 *   Hard Rules (never cut) > Identity > Communication Style > Contact > Conversation
 */
export function buildContext(
  userPersonaFull: string,
  contactPersona: string | null,
  messages: ExtractedMessage[],
  budgets: Partial<ContextBudgets> = {},
): AssembledContext {
  const b: ContextBudgets = { ...DEFAULT_BUDGETS, ...budgets };

  // ── Layer 0: Hard Rules (never truncated) ────────────────────────────────
  const hardRules = extractSection(userPersonaFull, "Hard Rules");

  // ── Layer 1: Identity (max 200 tokens) ───────────────────────────────────
  const identityRaw = extractSection(userPersonaFull, "Identity");
  const identity = truncateToTokens(identityRaw, 200);

  // ── Layer 2: Communication Style (max 200 tokens) ────────────────────────
  const commStyleRaw = extractSection(userPersonaFull, "Communication Style");
  const commStyle = truncateToTokens(commStyleRaw, 200);

  // User core = Hard Rules + Identity + Communication Style, capped at budget
  const userCoreRaw = [hardRules, identity, commStyle].filter(Boolean).join("\n\n");
  const userCore = truncateToTokens(userCoreRaw, b.userCore);
  const userTokensUsed = estimateTokens(userCore);

  // ── Contact persona (relevant sections, max contactRelevant tokens) ───────
  let contact = "";
  let contactTokensUsed = 0;
  if (contactPersona) {
    const contactHardRules = extractSection(contactPersona, "Hard Rules");
    const contactComm = extractSection(contactPersona, "Communication Style");
    const contactEmotional = extractSection(contactPersona, "Emotional Pattern");
    const contactRaw = [contactHardRules, contactComm, contactEmotional]
      .filter(Boolean)
      .join("\n\n");
    contact = truncateToTokens(contactRaw, b.contactRelevant);
    contactTokensUsed = estimateTokens(contact);
  }

  // ── Conversation messages (remaining budget) ──────────────────────────────
  const convRaw = formatMessages(messages);
  const conversation = truncateToTokens(convRaw, b.conversationMax);
  const convTokensUsed = estimateTokens(conversation);

  // ── Assemble system prompt ────────────────────────────────────────────────
  const parts: string[] = [];

  if (userCore) {
    parts.push("## User Profile\n" + userCore);
  }
  if (contact) {
    parts.push("## Contact Profile\n" + contact);
  }
  if (conversation) {
    parts.push("## Conversation\n" + conversation);
  }

  return {
    systemPrompt: parts.join("\n\n---\n\n"),
    budgetUsed: {
      user: userTokensUsed,
      contact: contactTokensUsed,
      conversation: convTokensUsed,
    },
  };
}
