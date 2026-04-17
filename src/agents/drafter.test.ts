import { runDrafterAgent } from './drafter';
import { tracedClaudeCall } from '@/lib/langfuse';
import { MODELS, MAX_TOKENS } from '@/lib/config';
import type { Review, Restaurant } from '@/types';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/langfuse', () => ({
  tracedClaudeCall: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RESTAURANT: Pick<Restaurant, 'name' | 'city'> = {
  name: "Mario's Bistro",
  city: 'New York',
};

const REVIEW: Review = {
  id: 'rev-1',
  restaurant_id: 'rest-1',
  platform: 'google',
  external_id: 'Alice_1700000000',
  author: 'Alice',
  stars: 5,
  body: 'Amazing pasta, best in the city!',
  review_date: '2023-11-14T00:00:00.000Z',
  sentiment: 'positive',
  sentiment_score: 0.9,
  topics: ['food', 'pasta'],
  is_competitor: false,
  competitor_name: null,
  fetched_at: '2023-11-14T01:00:00.000Z',
};

const MOCK_DRAFT = 'Thank you so much for your kind words, Alice! We are thrilled you enjoyed the pasta.';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();
  (tracedClaudeCall as jest.Mock).mockResolvedValue(MOCK_DRAFT);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runDrafterAgent', () => {
  it('calls tracedClaudeCall with the drafter trace name and Haiku model', async () => {
    await runDrafterAgent(REVIEW, RESTAURANT);

    expect(tracedClaudeCall).toHaveBeenCalledWith(
      expect.objectContaining({
        traceName: 'drafter-agent',
        model: MODELS.HAIKU,
        maxTokens: MAX_TOKENS.DRAFTER,
      })
    );
  });

  it('includes restaurant name and city in the system prompt', async () => {
    await runDrafterAgent(REVIEW, RESTAURANT);

    const call = (tracedClaudeCall as jest.Mock).mock.calls[0][0] as {
      system: string;
    };
    expect(call.system).toContain("Mario's Bistro");
    expect(call.system).toContain('New York');
  });

  it('includes the review body and star rating in the user message', async () => {
    await runDrafterAgent(REVIEW, RESTAURANT);

    const call = (tracedClaudeCall as jest.Mock).mock.calls[0][0] as {
      userMessage: string;
    };
    expect(call.userMessage).toContain('Amazing pasta');
    expect(call.userMessage).toContain('5');
  });

  it('returns the draft text from tracedClaudeCall', async () => {
    const draft = await runDrafterAgent(REVIEW, RESTAURANT);

    expect(draft).toBe(MOCK_DRAFT);
  });

  it('includes review metadata in the trace input', async () => {
    await runDrafterAgent(REVIEW, RESTAURANT);

    const call = (tracedClaudeCall as jest.Mock).mock.calls[0][0] as {
      traceInput: Record<string, unknown>;
    };
    expect(call.traceInput).toMatchObject({ reviewId: 'rev-1', stars: 5 });
  });

  it('propagates errors from tracedClaudeCall', async () => {
    (tracedClaudeCall as jest.Mock).mockRejectedValue(new Error('Rate limited'));

    await expect(runDrafterAgent(REVIEW, RESTAURANT)).rejects.toThrow('Rate limited');
  });

  it('handles null review body gracefully', async () => {
    const reviewNoBody = { ...REVIEW, body: null };

    await runDrafterAgent(reviewNoBody, RESTAURANT);

    expect(tracedClaudeCall).toHaveBeenCalledTimes(1);
  });
});
