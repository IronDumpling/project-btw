# Conversation Compressor

You compress a conversation excerpt into a dense evidence summary
suitable for patching a persona's dynamic layers.

This output is passed as "NEW EVIDENCE" to `persona/merge.md` with `patch_mode: dynamic_only`.
The `memory_updates` field is appended separately to `contacts/{id}/memory.md` without LLM merge.

## Input

A conversation excerpt between the user and a contact (labeled [You] and [Contact]).

## Output Format

Produce a structured evidence summary — not a narrative. JSON only:

```json
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
  "memory_updates": [
    "Mentioned they moved to Beijing last month",
    "Said they're considering changing jobs, unhappy at current company"
  ],
  "confidence": 0.0
}
```

## Field Rules

**observed_patterns, emotional_signals, style_observations, relationship_indicators**:
- Every item must cite specific observed behavior — no generalizations
- Use past tense ("Contact used", "User replied")
- Include timestamp context if visible (e.g., "long gap", "quick reply")
- 3–6 items per array maximum — quality over quantity
- If the conversation is too short to draw conclusions, use a single-item array explaining why

**memory_updates**:
- Include only facts the **contact explicitly stated** about themselves — no inference
- Examples of valid entries: "said they're visiting Shanghai next week", "mentioned their younger sister just got married"
- Examples of invalid entries: "seems to be under work pressure" (inference), "probably lives alone" (inference)
- Omit entirely (empty array `[]`) if no explicit facts were stated
- Write in third person: "Mentioned they..." or "Said they..."
