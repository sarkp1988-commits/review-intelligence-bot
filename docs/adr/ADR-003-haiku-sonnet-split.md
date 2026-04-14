# ADR-003: Haiku for daily tasks, Sonnet for weekly synthesis

**Date:** Project foundation | **Status:** Accepted

## Context
Two Claude models available at very different price points. Need to keep per-restaurant AI cost under $3/month.

## Decision
Claude Haiku (`claude-haiku-4-5-20251001`) handles all daily, repetitive tasks. Claude Sonnet (`claude-sonnet-4-6`) fires once per restaurant per week for deep synthesis, plus onboarding.

## Reasons
- Haiku is ~25x cheaper than Sonnet per token
- Haiku output quality is sufficient for sentiment tagging, draft generation, intent routing, and query answering
- Sonnet's reasoning depth is genuinely needed for weekly trend synthesis, competitor benchmarking, and voice profile extraction
- This split keeps monthly AI cost at ~$2–4 per active restaurant

## Task routing

| Task | Model | Reason |
|---|---|---|
| Sentiment tagging | Haiku | Simple classification |
| Topic extraction | Haiku | Pattern matching |
| Draft generation | Haiku | Templated with voice profile |
| Intent routing | Haiku | Short input, enum output |
| On-demand queries | Haiku | DB query + format result |
| Onboarding analysis | Sonnet | Complex multi-signal synthesis |
| Weekly report | Sonnet | Deep trend analysis + narrative |
| Voice profile extraction | Sonnet | Pattern recognition across diffs |

## Consequences
Monitor Langfuse weekly for cost drift. If Haiku quality proves insufficient for any task, upgrade that specific call to Sonnet and recalculate cost model.
