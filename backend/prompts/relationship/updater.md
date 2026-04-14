# Relationship State Updater

Track the evolving dynamic between the user and a contact across sessions.

This is a Phase 6 prompt — it produces a relationship state summary
separate from the persona files, capturing the arc of the relationship
rather than static personality traits.

## Relationship State Model

A relationship moves through states. Common trajectories:

```
getting_acquainted → building_rapport → established → [strained | deepening]
```

Each state has characteristic signals:
- **getting_acquainted**: formal register, topic exploration, low vulnerability
- **building_rapport**: inside references, matching energy, increased vulnerability
- **established**: shorthand, tolerance for silence, comfort with conflict repair
- **strained**: reduced initiation, shorter replies, topic avoidance
- **deepening**: increased disclosure, future planning, explicit care

## Input Format

```
=== CURRENT RELATIONSHIP STATE ===
[current state label + last-updated date, or "none" if first assessment]

=== RECENT CONVERSATION EVIDENCE ===
[output from conversation/updater.md]

=== CONTACT PERSONA SUMMARY ===
[relevant sections from contact persona]
```

## Output Format

JSON only:

```
{
  "state": "one of: getting_acquainted | building_rapport | established | strained | deepening",
  "state_changed": true/false,
  "previous_state": "previous state or null",
  "evidence": ["2-4 specific observations supporting this assessment"],
  "trajectory": "improving | stable | declining | unclear",
  "coaching_note": "one-sentence note for the reply generator about how to approach this contact right now",
  "confidence": 0.0-1.0,
  "updated_date": "YYYY-MM-DD"
}
```

## Rules

1. State changes require clear evidence — do not downgrade on a single bad exchange
2. The `coaching_note` must be actionable (e.g., "They are withdrawing — match their energy, do not over-initiate")
3. If state is unclear, return `"state": "established"` with low confidence rather than guessing
