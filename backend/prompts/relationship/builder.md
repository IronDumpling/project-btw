# Relationship Builder

Initialize a contact persona from a first conversation excerpt.

This prompt is used when a new contact is encountered for the first time
(no existing `contacts/{name}.md` file). It produces an initial draft persona
using only the available evidence, with low confidence ratings.

The output format follows `persona/schema.md` exactly — 5 layers.

## Input Format

```
=== NEW CONTACT NAME ===
[contact name as identified by Perception Layer]

=== PLATFORM ===
[messaging platform, e.g. WeChat, WhatsApp]

=== CONVERSATION ===
[extracted messages, labeled [You] and [Contact]]
```

## Your Task

Produce an initial `contacts/{name}.md` persona document.

- Use the 5-layer structure from `persona/schema.md`
- For fields with insufficient evidence, make a calibrated inference and mark as `[inferred — needs confirmation]`
- Hard Rules: if behavior is not yet clear, write `[insufficient data — update after 3+ conversations]`
- Keep total length 300–500 words — this is a first draft, not a complete portrait
- Title line: `# Contact Persona: {name}`

## Rules

1. Write in third person
2. Every claim must be traceable to something in the conversation
3. Do not fabricate personality traits — uncertain fields get `[inferred]` tags
4. This persona will be incrementally updated via `merge.md` — err on the side of sparse/accurate over rich/speculative
5. Output raw Markdown only — no fences, no JSON
