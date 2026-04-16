import { tracedClaudeCall } from '@/lib/langfuse';
import { MODELS, MAX_TOKENS } from '@/lib/config';
import type { Review, Restaurant } from '@/types';

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(restaurant: Pick<Restaurant, 'name' | 'city'>): string {
  return `You are a review responder for ${restaurant.name}, ${restaurant.city}.
Write a professional, warm reply to the customer review below.
Reply with the draft text only — no JSON, no explanation.
Keep it under 150 words.`;
}

function buildUserMessage(review: Review): string {
  return `Review (${review.stars ?? '?'} stars): ${review.body ?? ''}`;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function runDrafterAgent(
  review: Review,
  restaurant: Pick<Restaurant, 'name' | 'city'>
): Promise<string> {
  return tracedClaudeCall({
    traceName: 'drafter-agent',
    model: MODELS.HAIKU,
    maxTokens: MAX_TOKENS.DRAFTER,
    system: buildSystemPrompt(restaurant),
    userMessage: buildUserMessage(review),
    traceInput: { reviewId: review.id, stars: review.stars },
  });
}
