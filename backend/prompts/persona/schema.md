# Persona Schema — 5-Layer Structure

This file defines the shared output structure for all persona documents
(`user/persona.md` and `contacts/<id>/persona.md`).
It is concatenated with a builder prompt at call time — never used alone.

---

## Output Structure

Every persona document must contain exactly these five layers, in this order.
High-priority layers override lower ones when they conflict.

### Layer 0 — Hard Rules

Absolute behavioral constants. These cannot be overridden by any lower layer.

- 3–5 rules maximum. More than 5 dilutes enforceability.
- Phrased as direct imperatives: `Does not...`, `Never...`, `Always...`
- Each rule must be specific enough that a reply generator can apply it mechanically.
  Bad: "Doesn't like confrontation"
  Good: "Never sends a follow-up message within 30 minutes of a conflict — waits for the other side to re-engage"

### Layer 1 — Identity

Factual anchors that remain stable over time.

- Name / nickname
- Age range
- Occupation / social role
- MBTI (if known) — used only to inform defaults, never to override observed behavior
- Zodiac (if known) — same caveat as MBTI
- One-sentence summary synthesizing all identity fields into a coherent picture

### Layer 2 — Communication Style

How this person actually writes messages. Must be behaviorally specific.

- Message format (short-burst vs. long-form vs. context-dependent)
- Emoji / sticker usage pattern
- Punctuation habits and what they signal
- Reply speed and what it signals about engagement
- Catchphrases / high-frequency vocabulary
- Overall style note: 1–2 sentences synthesizing the above

### Layer 3 — Emotional Pattern

How this person processes and expresses emotion in digital communication.

- Attachment style with concrete messaging manifestations
- Love languages: what they mean for giving / receiving care over text
- Conflict response: triggers, typical duration, resolution signals
- What changes when they're romantically interested in someone
- Inferred emotional triggers (derived from attachment + conflict data)

### Layer 4 — Relationship Behavior

How this person operates within a specific relationship dynamic.

- Relational role: who initiates, who sets emotional tone
- Core values they look for in others, and how violations manifest
- Dealbreakers and their behavioral response when triggered
- Coaching note: how the Real-time Engine should adapt its suggestions

---

## Quality Rules (apply to all persona documents)

1. Write in **third person** throughout ("They send..." not "I send...")
2. Every field must be **actionable** — a reply generator reading this must know exactly what to do
3. If input data is missing for a field, **infer** from the rest and mark as `[inferred]`
4. Do not moralize, judge, or editorialize beyond the coaching purpose
5. **No placeholders** — never write `{field}` or `[fill in]` in the final output
6. Target length: **400–600 words**. Dense, not padded.
7. Output raw Markdown only — no ` ```markdown ` fences, no JSON, no preamble
