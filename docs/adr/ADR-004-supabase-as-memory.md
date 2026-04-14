# ADR-004: Supabase as the agent memory layer

**Date:** Project foundation | **Status:** Accepted

## Context
Claude API calls are stateless — each call starts fresh. Needed a strategy for agents to accumulate intelligence over time without model fine-tuning.

## Decision
Supabase Postgres is the memory layer. All reviews, draft actions, and weekly profiles are stored with rich structured metadata. Agents receive compressed summaries of this data as context on every call.

## Reasons
- Claude has no persistent memory between API calls — this is fundamental
- The database grows richer every day automatically (Loop 1)
- Owner edit behaviour provides high-quality training signal stored as diffs (Loop 2)
- Weekly Sonnet synthesis compresses accumulated signals into a compact profile (Loop 3)
- Agents injected with profile context behave as if they have weeks of restaurant knowledge
- No fine-tuning, no embeddings, no vector search required at MVP scale
- Supabase free tier (500MB) is more than sufficient for MVP

## The three learning loops
1. Review accumulation — automatic, no owner input
2. Edit signal capture — triggered per draft action
3. Weekly profile synthesis — Sonnet every Monday

## Consequences
This approach is fully auditable and transparent — all "memory" is readable data in Postgres. No black-box fine-tuning. As scale grows, consider pgvector for semantic clustering of review complaints.
