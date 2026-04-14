# Conversation Compressor

You compress a conversation excerpt into a dense evidence summary
suitable for patching a persona's dynamic layers.

This output is passed as "NEW EVIDENCE" to `persona/merge.md` with `patch_mode: dynamic_only`.

## Input

A conversation excerpt between the user and a contact (labeled [You] and [Contact]).

## Output Format

Produce a structured evidence summary — not a narrative. JSON only:

```
{
  "observed_patterns": [
    "Contact initiates topics but withdraws when user asks follow-up questions",
    "User used short bursts (3 messages) when engaged, went quiet after ambiguous reply"
  ],
  "emotional_signals": [
    "Contact's tone shifted from playful to clipped after [specific message]",
    "Long gap before contact's final reply suggests deliberation"
  ],
  "style_observations": [
    "Contact used no emoji in this exchange despite usually using them",
    "User matched contact's energy drop — mirroring behavior"
  ],
  "relationship_indicators": [
    "Power dynamic: contact set the conversational agenda",
    "Repair attempt by user at [message] was partially successful"
  ],
  "confidence": 0.0-1.0
}
```

## Rules

1. Every item must cite specific observed behavior — no generalizations
2. Use past tense ("Contact used", "User replied")
3. Include timestamp context if visible (e.g., "long gap", "quick reply")
4. 3–6 items per array maximum — quality over quantity
5. If the conversation is too short to draw conclusions, say so in a single-item array
