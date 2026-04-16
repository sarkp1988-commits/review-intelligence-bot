import { supabase } from '@/lib/supabase';
import type { PlaceReview } from '@/types';

// ─── saveReviews ──────────────────────────────────────────────────────────────

// Persist a batch of PlaceReviews for a restaurant.
// Deduplicates by (restaurant_id, platform, external_id) — existing rows are left untouched.
export async function saveReviews(
  restaurantId: string,
  reviews: PlaceReview[]
): Promise<void> {
  if (reviews.length === 0) return;

  const rows = reviews.map((r) => ({
    restaurant_id: restaurantId,
    platform: 'google' as const,
    external_id: `${r.author_name}_${r.time}`,
    author: r.author_name,
    stars: r.rating,
    body: r.text,
    review_date: new Date(r.time * 1000).toISOString(),
    sentiment: null,
    sentiment_score: null,
    topics: null,
    is_competitor: false,
    competitor_name: null,
  }));

  const { error } = await supabase
    .from('reviews')
    .upsert(rows, { onConflict: 'restaurant_id,platform,external_id', ignoreDuplicates: true });

  if (error) throw new Error(`saveReviews: ${error.message}`);
}

// ─── updateLastCrawledAt ──────────────────────────────────────────────────────

// Stamp the restaurant row with the current UTC time after a successful crawl.
export async function updateLastCrawledAt(restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurants')
    .update({ last_crawled_at: new Date().toISOString() })
    .eq('id', restaurantId);

  if (error) throw new Error(`updateLastCrawledAt: ${error.message}`);
}
