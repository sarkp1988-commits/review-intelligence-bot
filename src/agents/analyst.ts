import { tracedClaudeCall } from '@/lib/langfuse';
import { MODELS, MAX_TOKENS } from '@/lib/config';
import type { Review, Restaurant, AnalystOutput } from '@/types';

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(restaurant: Pick<Restaurant, 'name' | 'city'>): string {
  return `You are a review analyst for ${restaurant.name}, ${restaurant.city}.
Analyze each review and respond ONLY with valid JSON matching this schema exactly:
{
  "reviews": [
    {
      "external_id": "<external_id from input>",
      "sentiment": "positive" | "negative" | "neutral",
      "sentiment_score": <number between -1.0 and 1.0>,
      "topics": ["<topic>"]
    }
  ]
}`;
}

function buildUserMessage(reviews: Review[]): string {
  return JSON.stringify(
    reviews.map((r) => ({
      external_id: r.external_id,
      stars: r.stars,
      body: r.body ?? '',
    }))
  );
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function runAnalystAgent(
  reviews: Review[],
  restaurant: Pick<Restaurant, 'name' | 'city'>
): Promise<AnalystOutput> {
  const raw = await tracedClaudeCall({
    traceName: 'analyst-agent',
    model: MODELS.HAIKU,
    maxTokens: MAX_TOKENS.HAIKU,
    system: buildSystemPrompt(restaurant),
    userMessage: buildUserMessage(reviews),
    traceInput: { reviewCount: reviews.length },
  });

  return JSON.parse(raw) as AnalystOutput;
}
