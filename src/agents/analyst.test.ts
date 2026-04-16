import { runAnalystAgent } from './analyst';
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

const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    restaurant_id: 'rest-1',
    platform: 'google',
    external_id: 'Alice_1700000000',
    author: 'Alice',
    stars: 5,
    body: 'Amazing food and service!',
    review_date: '2023-11-14T00:00:00.000Z',
    sentiment: null,
    sentiment_score: null,
    topics: null,
    is_competitor: false,
    competitor_name: null,
    fetched_at: '2023-11-14T01:00:00.000Z',
  },
  {
    id: 'rev-2',
    restaurant_id: 'rest-1',
    platform: 'google',
    external_id: 'Bob_1699900000',
    author: 'Bob',
    stars: 2,
    body: 'Slow service, food was cold.',
    review_date: '2023-11-12T00:00:00.000Z',
    sentiment: null,
    sentiment_score: null,
    topics: null,
    is_competitor: false,
    competitor_name: null,
    fetched_at: '2023-11-14T01:00:00.000Z',
  },
];

const MOCK_ANALYST_OUTPUT = {
  reviews: [
    {
      external_id: 'Alice_1700000000',
      sentiment: 'positive',
      sentiment_score: 0.9,
      topics: ['food', 'service'],
    },
    {
      external_id: 'Bob_1699900000',
      sentiment: 'negative',
      sentiment_score: -0.7,
      topics: ['service', 'food temperature'],
    },
  ],
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();
  (tracedClaudeCall as jest.Mock).mockResolvedValue(
    JSON.stringify(MOCK_ANALYST_OUTPUT)
  );
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runAnalystAgent', () => {
  it('calls tracedClaudeCall with the analyst trace name and Haiku model', async () => {
    await runAnalystAgent(REVIEWS, RESTAURANT);

    expect(tracedClaudeCall).toHaveBeenCalledWith(
      expect.objectContaining({
        traceName: 'analyst-agent',
        model: MODELS.HAIKU,
        maxTokens: MAX_TOKENS.HAIKU,
      })
    );
  });

  it('includes the restaurant name and city in the system prompt', async () => {
    await runAnalystAgent(REVIEWS, RESTAURANT);

    const call = (tracedClaudeCall as jest.Mock).mock.calls[0][0] as {
      system: string;
    };
    expect(call.system).toContain("Mario's Bistro");
    expect(call.system).toContain('New York');
  });

  it('passes review bodies and stars in the user message', async () => {
    await runAnalystAgent(REVIEWS, RESTAURANT);

    const call = (tracedClaudeCall as jest.Mock).mock.calls[0][0] as {
      userMessage: string;
    };
    expect(call.userMessage).toContain('Amazing food and service!');
    expect(call.userMessage).toContain('Slow service');
  });

  it('returns parsed AnalystOutput with sentiment and topics per review', async () => {
    const output = await runAnalystAgent(REVIEWS, RESTAURANT);

    expect(output.reviews).toHaveLength(2);
    expect(output.reviews[0]).toMatchObject({
      external_id: 'Alice_1700000000',
      sentiment: 'positive',
      sentiment_score: 0.9,
      topics: ['food', 'service'],
    });
    expect(output.reviews[1].sentiment).toBe('negative');
  });

  it('includes reviewCount in the trace input', async () => {
    await runAnalystAgent(REVIEWS, RESTAURANT);

    const call = (tracedClaudeCall as jest.Mock).mock.calls[0][0] as {
      traceInput: Record<string, unknown>;
    };
    expect(call.traceInput).toMatchObject({ reviewCount: 2 });
  });

  it('throws when tracedClaudeCall returns invalid JSON', async () => {
    (tracedClaudeCall as jest.Mock).mockResolvedValue('not valid json {{');

    await expect(runAnalystAgent(REVIEWS, RESTAURANT)).rejects.toThrow();
  });

  it('handles an empty reviews array without throwing', async () => {
    (tracedClaudeCall as jest.Mock).mockResolvedValue(
      JSON.stringify({ reviews: [] })
    );

    const output = await runAnalystAgent([], RESTAURANT);

    expect(output.reviews).toHaveLength(0);
  });

  it('propagates errors from tracedClaudeCall', async () => {
    (tracedClaudeCall as jest.Mock).mockRejectedValue(new Error('API timeout'));

    await expect(runAnalystAgent(REVIEWS, RESTAURANT)).rejects.toThrow('API timeout');
  });
});
