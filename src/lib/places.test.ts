// Set before module import so the module-level env check passes
process.env.GOOGLE_PLACES_API_KEY = 'test-key';

import { fetchReviews, fetchNearbyCompetitors } from './places';
import type { PlaceReview, NearbyPlace } from '@/types';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

beforeEach(() => {
  jest.resetAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

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
    text: 'Decent place.',
    time: 1699900000,
    relative_time_description: '2 weeks ago',
  },
];

const MOCK_NEARBY: NearbyPlace[] = [
  {
    place_id: 'ChIJABC123',
    name: 'Rival Bistro',
    rating: 4.2,
    user_ratings_total: 200,
    vicinity: '10 Main St',
  },
];

function mockOkJson(body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

// ─── fetchReviews ─────────────────────────────────────────────────────────────

describe('fetchReviews', () => {
  it('returns the reviews array from a successful Places response', async () => {
    mockOkJson({ status: 'OK', result: { reviews: MOCK_REVIEWS } });

    const reviews = await fetchReviews(PLACE_ID);

    expect(reviews).toHaveLength(2);
    expect(reviews[0].author_name).toBe('Alice');
    expect(reviews[0].rating).toBe(5);
  });

  it('calls the Place Details endpoint with the correct place_id', async () => {
    mockOkJson({ status: 'OK', result: { reviews: MOCK_REVIEWS } });

    await fetchReviews(PLACE_ID);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain('place_id=ChIJN1t_tDeuEmsRUsoyG83frY4');
    expect(url).toContain('/place/details/json');
  });

  it('returns an empty array when the result has no reviews field', async () => {
    mockOkJson({ status: 'OK', result: {} });

    const reviews = await fetchReviews(PLACE_ID);

    expect(reviews).toEqual([]);
  });

  it('throws when the HTTP response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await expect(fetchReviews(PLACE_ID)).rejects.toThrow('500');
  });

  it('throws when Places API returns a non-OK status', async () => {
    mockOkJson({ status: 'NOT_FOUND', error_message: 'place not found' });

    await expect(fetchReviews(PLACE_ID)).rejects.toThrow(/NOT_FOUND/);
  });
});

// ─── fetchNearbyCompetitors ───────────────────────────────────────────────────

describe('fetchNearbyCompetitors', () => {
  it('returns nearby places from a successful response', async () => {
    mockOkJson({ status: 'OK', results: MOCK_NEARBY });

    const places = await fetchNearbyCompetitors(40.7128, -74.006);

    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Rival Bistro');
  });

  it('calls the Nearby Search endpoint with lat/lng and radius', async () => {
    mockOkJson({ status: 'OK', results: MOCK_NEARBY });

    await fetchNearbyCompetitors(40.7128, -74.006, 3000);

    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain('/place/nearbysearch/json');
    expect(url).toContain('location=40.7128,-74.006');
    expect(url).toContain('radius=3000');
  });

  it('uses 5 000 m as the default radius', async () => {
    mockOkJson({ status: 'OK', results: [] });

    await fetchNearbyCompetitors(40.7128, -74.006);

    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain('radius=5000');
  });

  it('returns an empty array on ZERO_RESULTS', async () => {
    mockOkJson({ status: 'ZERO_RESULTS', results: [] });

    const places = await fetchNearbyCompetitors(0, 0);

    expect(places).toEqual([]);
  });

  it('throws when HTTP response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 } as Response);

    await expect(fetchNearbyCompetitors(0, 0)).rejects.toThrow('403');
  });

  it('throws when Places API returns an error status', async () => {
    mockOkJson({ status: 'REQUEST_DENIED', error_message: 'bad key' });

    await expect(fetchNearbyCompetitors(0, 0)).rejects.toThrow(/REQUEST_DENIED/);
  });
});
