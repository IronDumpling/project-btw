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

- **Message format**: short-burst (多条短消息连发) vs. long-form (一整段) vs. context-dependent — note what triggers each mode
- **Catchphrases**: list 2–5 exact recurring phrases or words observed across conversations. Mandatory if evidence supports them — do not substitute with generic style descriptions.
- **Punctuation signature**: what their specific punctuation choices actually signal (e.g., "sends '…' to signal hesitation, not trailing off; omits periods entirely in casual chat but uses them when annoyed")
- **Emoji / sticker semantic override**: specific emoji they use and what they actually mean in their context. Note: in Chinese messaging (especially WeChat), common overrides include — 😊 often signals polite dismissal or passive tension rather than happiness; 😂 or 哈哈 can indicate deflection; stickers substitute for direct emotional expression.
- **Message burst pattern**: do they fire multiple short messages before completing a thought, or compose in one long block? What does a single-character reply signal?
- **Reply speed signals**: what does fast / slow / no reply each mean for this person's engagement state?
- Overall style note: 1–2 sentences synthesizing the above into a usable characterization.

### Layer 3 — Emotional Pattern

How this person processes and expresses emotion in digital communication.

- **Attachment style** with concrete messaging manifestations (e.g., anxious = double-texts when no reply; avoidant = goes quiet under emotional pressure)
- **Love languages**: what they mean for giving / receiving care specifically over text
- **Conflict response**: triggers, typical duration, resolution signals — who initiates repair and how
- **Decision mode**: rough emotional/rational weighting under normal vs. stressed conditions (e.g., "70% rational baseline, inverts under relational stress"). Mark as `[self-reported]` or `[inferred]`.
- **Late-night register shift**: does message length, topic, or emotional register change significantly after midnight? If yes, describe how.
- **Vulnerability threshold**: what depth of rapport is required before they express genuine distress, vs. deflecting with humor or brevity?
- **When romantically interested**: specific behavioral changes observable in text (e.g., longer messages, more questions, faster replies)
- **Inferred emotional triggers**: derived from attachment + conflict data above

### Layer 4 — Relationship Behavior

How this person operates within a specific relationship dynamic.

- **Relational role**: who initiates conversations, who sets the emotional tone
- **Initiative asymmetry**: who starts more often, and what a persistent imbalance signals about investment level
- **Boundary strength**: high / medium / low — with specific behavioral evidence (e.g., "does not respond to messages after 11pm; ignores calls without prior notice")
- **Conflict repair timing**: typical duration from trigger to first repair attempt, and who initiates the repair
- **Core values** they look for in others, and how violations manifest behaviorally
- **Dealbreakers** and their response pattern when triggered
- **Coaching note**: direct instruction to the Real-time Engine on how to adapt reply suggestions for this specific dynamic

---

## Quality Rules (apply to all persona documents)

1. Write in **third person** throughout ("They send..." not "I send...")
2. Every field must be **actionable** — a reply generator reading this must know exactly what to do
3. If input data is missing for a field, **infer** from the rest and mark as `[inferred]`
4. Do not moralize, judge, or editorialize beyond the coaching purpose
5. **No placeholders** — never write `{field}` or `[fill in]` in the final output
6. Target length: **400–600 words**. Dense, not padded.
7. Output raw Markdown only — no ` ```markdown ` fences, no JSON, no preamble
8. **Layer 2 catchphrases are mandatory** when evidence supports them — minimum 2 exact phrases. A generic style note ("uses casual language") does not substitute for actual recurring expressions.
