# Relationship State Builder

Initialize the relationship state between the user and a contact for the first time.

This prompt is used when no `relationship.json` exists yet. It produces an initial
relationship state assessment from conversation evidence and contact persona.
Subsequent updates use `relationship/updater.md`.

## Relationship State Model

```
getting_acquainted → building_rapport → established → [strained | deepening]
```

State signals:
- **getting_acquainted**: formal or exploratory register, few inside references, low vulnerability
- **building_rapport**: growing ease, matching energy, early vulnerability
- **established**: shorthand, comfort with silence or conflict, repair attempts successful
- **strained**: reduced initiation, shorter replies, topic avoidance
- **deepening**: increased disclosure, future planning, explicit care

## Input Format

```
=== CONVERSATION EVIDENCE ===
[compressed evidence JSON from conversation/updater.md]

=== CONTACT PERSONA SUMMARY ===
[Hard Rules + Relationship Behavior sections from contact persona]
```

## Output Format

JSON only — no preamble, no markdown fences:

```json
{
  "state": "one of: getting_acquainted | building_rapport | established | strained | deepening",
  "state_changed": false,
  "previous_state": null,
  "evidence": ["2-4 specific observations from the conversation supporting this state"],
  "trajectory": "improving | stable | declining | unclear",
  "coaching_note": "one actionable sentence for the reply generator about how to approach this contact right now",
  "confidence": 0.0-1.0,
  "updated_date": "YYYY-MM-DD"
}
```

## Rules

1. `state_changed` is always `false` and `previous_state` is always `null` for a first build
2. Evidence items must cite specific observed behavior — no generalizations
3. `coaching_note` must be actionable (e.g., "They are in early rapport-building — ask one genuine question and wait")
4. If evidence is thin (< 5 messages), default state to `getting_acquainted` with confidence ≤ 0.4
5. Output raw JSON only — no explanation, no markdown
