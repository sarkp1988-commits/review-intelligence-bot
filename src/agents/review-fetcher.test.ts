import { supabase } from '@/lib/supabase';
import { saveReviews, updateLastCrawledAt } from './review-fetcher';
import type { PlaceReview } from '@/types';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const RESTAURANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const MOCK_REVIEWS: PlaceReview[] = [
  {
    author_name: 'Alice',
    rating: 5,
    text: 'Amazing food!',
    time: 1700000000,
    relative_time_description: 'a week ago',
  },
  {
    author_name: 'Bob',
    rating: 3,
    text: 'Average.',
    time: 1699900000,
    relative_time_description: '2 weeks ago',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();
});

function mockUpsertSuccess(): jest.Mock {
  const upsertMock = jest.fn().mockResolvedValue({ error: null });
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'reviews') return { upsert: upsertMock };
    return {};
  });
  return upsertMock;
}

function mockUpsertError(message: string): void {
  const upsertMock = jest.fn().mockResolvedValue({ error: { message } });
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'reviews') return { upsert: upsertMock };
    return {};
  });
}

function mockUpdateSuccess(): jest.Mock {
  const updateMock = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  });
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'restaurants') return { update: updateMock };
    return {};
  });
  return updateMock;
}

function mockUpdateError(message: string): void {
  const updateMock = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: { message } }),
  });
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'restaurants') return { update: updateMock };
    return {};
  });
}

// ─── saveReviews ──────────────────────────────────────────────────────────────

describe('saveReviews', () => {
  it('upserts reviews with correct shape', async () => {
    const upsertMock = mockUpsertSuccess();

    await saveReviews(RESTAURANT_ID, MOCK_REVIEWS);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [rows, options] = upsertMock.mock.calls[0] as [unknown[], Record<string, unknown>];

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      restaurant_id: RESTAURANT_ID,
      platform: 'google',
      external_id: 'Alice_1700000000',
      author: 'Alice',
      stars: 5,
      body: 'Amazing food!',
      is_competitor: false,
      sentiment: null,
      sentiment_score: null,
      topics: null,
    });
    // review_date is an ISO string derived from the unix timestamp
    expect((rows[0] as Record<string, unknown>).review_date).toBe(
      new Date(1700000000 * 1000).toISOString()
    );
    expect(options).toMatchObject({ onConflict: 'restaurant_id,platform,external_id' });
  });

  it('does nothing when reviews array is empty', async () => {
    const upsertMock = mockUpsertSuccess();

    await saveReviews(RESTAURANT_ID, []);

    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    mockUpsertError('constraint violation');

    await expect(saveReviews(RESTAURANT_ID, MOCK_REVIEWS)).rejects.toThrow(
      'constraint violation'
    );
  });

  it('handles a single review correctly', async () => {
    const upsertMock = mockUpsertSuccess();
    const singleReview: PlaceReview[] = [MOCK_REVIEWS[0]];

    await saveReviews(RESTAURANT_ID, singleReview);

    const [rows] = upsertMock.mock.calls[0] as [unknown[]];
    expect(rows).toHaveLength(1);
  });
});

// ─── updateLastCrawledAt ──────────────────────────────────────────────────────

describe('updateLastCrawledAt', () => {
  it('updates last_crawled_at to the current timestamp', async () => {
    const updateMock = mockUpdateSuccess();
    const before = Date.now();

    await updateLastCrawledAt(RESTAURANT_ID);

    const after = Date.now();
    const [updateArg] = updateMock.mock.calls[0] as [{ last_crawled_at: string }];
    const ts = new Date(updateArg.last_crawled_at).getTime();

    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('filters by the correct restaurant id', async () => {
    const updateMock = mockUpdateSuccess();

    await updateLastCrawledAt(RESTAURANT_ID);

    const eqMock = updateMock.mock.results[0].value.eq as jest.Mock;
    expect(eqMock).toHaveBeenCalledWith('id', RESTAURANT_ID);
  });

  it('throws when Supabase returns an error', async () => {
    mockUpdateError('row not found');

    await expect(updateLastCrawledAt(RESTAURANT_ID)).rejects.toThrow('row not found');
  });
});
