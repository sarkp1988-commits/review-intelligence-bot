import type { PlaceDetails, PlaceReview, NearbyPlace } from '@/types';

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Read at call time (not module load) so tests can set the env var before calling.
function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Missing env var: GOOGLE_PLACES_API_KEY');
  return key;
}

// ─── Place Details ────────────────────────────────────────────────────────────

// Fetch full place details (including up to 5 reviews) for a given Place ID.
export async function getPlaceReviews(placeId: string): Promise<PlaceDetails> {
  const url =
    `${BASE_URL}/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=place_id,name,rating,user_ratings_total,reviews` +
    `&key=${apiKey()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API HTTP error: ${res.status}`);

  const json = (await res.json()) as {
    status: string;
    result?: PlaceDetails;
    error_message?: string;
  };

  if (json.status !== 'OK' || !json.result) {
    throw new Error(
      `Places API error: ${json.status} — ${json.error_message ?? 'no details'}`
    );
  }

  return json.result;
}

// Convenience wrapper — returns just the reviews array (empty if none).
export async function fetchReviews(placeId: string): Promise<PlaceReview[]> {
  const details = await getPlaceReviews(placeId);
  return details.reviews ?? [];
}

// ─── Nearby Search ────────────────────────────────────────────────────────────

// Find restaurants within radiusMeters of the given coordinates (default 5 000 m ≈ 3 miles).
export async function getNearbyCompetitors(
  lat: number,
  lng: number,
  radiusMeters = 5000
): Promise<NearbyPlace[]> {
  const url =
    `${BASE_URL}/nearbysearch/json` +
    `?location=${lat},${lng}` +
    `&radius=${radiusMeters}` +
    `&type=restaurant` +
    `&key=${apiKey()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API HTTP error: ${res.status}`);

  const json = (await res.json()) as {
    status: string;
    results?: NearbyPlace[];
    error_message?: string;
  };

  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(
      `Places API error: ${json.status} — ${json.error_message ?? 'no details'}`
    );
  }

  return json.results ?? [];
}

// Public alias with explicit radius parameter — used by the review-fetcher agent.
export async function fetchNearbyCompetitors(
  lat: number,
  lng: number,
  radiusMeters = 5000
): Promise<NearbyPlace[]> {
  return getNearbyCompetitors(lat, lng, radiusMeters);
}

// ─── Place Search ─────────────────────────────────────────────────────────────

// Resolve a text query (e.g. "Luigi's Pizza, Brooklyn") to a Place ID.
export async function findPlaceId(query: string): Promise<string | null> {
  const url =
    `${BASE_URL}/findplacefromtext/json` +
    `?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery` +
    `&fields=place_id` +
    `&key=${apiKey()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API HTTP error: ${res.status}`);

  const json = (await res.json()) as {
    status: string;
    candidates?: Array<{ place_id: string }>;
  };

  return json.candidates?.[0]?.place_id ?? null;
}
