import type { PlaceDetails, NearbyPlace } from '@/types';

if (!process.env.GOOGLE_PLACES_API_KEY) {
  throw new Error('Missing env var: GOOGLE_PLACES_API_KEY');
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Fetch up to 5 most-recent reviews for a given Place ID.
// Google Places Details returns at most 5 reviews per call.
export async function getPlaceReviews(placeId: string): Promise<PlaceDetails> {
  const url =
    `${BASE_URL}/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=place_id,name,rating,user_ratings_total,reviews` +
    `&key=${API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Places API HTTP error: ${res.status}`);
  }

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

// Find competitors within radiusMeters of a place (default 5 000 m ≈ 3 miles).
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
    `&key=${API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Places API HTTP error: ${res.status}`);
  }

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

// Resolve a text query (e.g. "Luigi's Pizza, Brooklyn") to a Place ID.
export async function findPlaceId(query: string): Promise<string | null> {
  const url =
    `${BASE_URL}/findplacefromtext/json` +
    `?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery` +
    `&fields=place_id` +
    `&key=${API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Places API HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as {
    status: string;
    candidates?: Array<{ place_id: string }>;
  };

  return json.candidates?.[0]?.place_id ?? null;
}
