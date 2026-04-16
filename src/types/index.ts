// ─── Database row types ───────────────────────────────────────────────────────
// These mirror the Supabase schema exactly. Use these throughout the app —
// never write inline object types for DB rows.

export interface Restaurant {
  id: string;
  telegram_chat_id: number;
  name: string;
  city: string;
  google_place_id: string | null;
  email: string | null;
  onboarded_at: string;
  last_crawled_at: string | null;
  status: 'active' | 'inactive';
  timezone: string;
}

export interface Review {
  id: string;
  restaurant_id: string;
  platform: string;
  external_id: string | null;
  author: string | null;
  stars: number | null;
  body: string | null;
  review_date: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  sentiment_score: number | null;
  topics: string[] | null;
  is_competitor: boolean;
  competitor_name: string | null;
  fetched_at: string;
}

export interface Draft {
  id: string;
  restaurant_id: string;
  review_id: string;
  original_draft: string;
  final_text: string | null;
  action: 'pending' | 'approved' | 'edited' | 'skipped';
  edit_distance: number | null;
  model_used: string | null;
  created_at: string;
  actioned_at: string | null;
}

export interface VoiceProfile {
  tone: string;
  avg_length: number;
  uses: string[];
  avoids: string[];
}

export interface DraftStats {
  approval_rate: number;
  total_drafts: number;
  approved: number;
  edited: number;
  skipped: number;
}

export interface ActiveIssue {
  topic: string;
  count: number;
  first_seen: string;
  examples: string[];
}

export interface RestaurantProfile {
  id: string;
  restaurant_id: string;
  week_ending: string;
  strengths: string[] | null;
  active_issues: ActiveIssue[] | null;
  resolved_issues: string[] | null;
  competitor_gaps: string[] | null;
  sentiment_trend: 'improving' | 'declining' | 'stable' | null;
  voice_profile: VoiceProfile | null;
  draft_stats: DraftStats | null;
  raw_summary: string | null;
  created_at: string;
}

export interface ConversationState {
  telegram_chat_id: number;
  restaurant_id: string | null;
  state:
    | 'new'
    | 'onboarding_name'
    | 'onboarding_city'
    | 'onboarding_link'
    | 'processing'
    | 'idle';
  context: Record<string, unknown>;
  updated_at: string;
}

// ─── Supabase Database type map ───────────────────────────────────────────────
// Used to type the Supabase client generically.

// Named interfaces (above) are for application code.
// The Database type must satisfy Supabase's GenericSchema / GenericTable constraints,
// which require Row/Insert/Update to extend Record<string, unknown>.
// TypeScript named interfaces don't implicitly satisfy index-signature types, so we
// intersect with Record<string, unknown> here. This is structural-only — no runtime cost.
export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant & Record<string, unknown>;
        // Fields with DB defaults or nullable-no-default are optional on insert.
        // Required: telegram_chat_id, name, city, google_place_id
        Insert: Omit<Restaurant, 'id' | 'onboarded_at' | 'email' | 'last_crawled_at' | 'status' | 'timezone'>
          & Partial<Pick<Restaurant, 'email' | 'last_crawled_at' | 'status' | 'timezone'>>
          & Record<string, unknown>;
        Update: Partial<Omit<Restaurant, 'id'>> & Record<string, unknown>;
        Relationships: [];
      };
      reviews: {
        Row: Review & Record<string, unknown>;
        Insert: Omit<Review, 'id' | 'fetched_at'> & Record<string, unknown>;
        Update: Partial<Omit<Review, 'id'>> & Record<string, unknown>;
        Relationships: [];
      };
      drafts: {
        Row: Draft & Record<string, unknown>;
        Insert: Omit<Draft, 'id' | 'created_at'> & Record<string, unknown>;
        Update: Partial<Omit<Draft, 'id'>> & Record<string, unknown>;
        Relationships: [];
      };
      restaurant_profiles: {
        Row: RestaurantProfile & Record<string, unknown>;
        Insert: Omit<RestaurantProfile, 'id' | 'created_at'> & Record<string, unknown>;
        Update: Partial<Omit<RestaurantProfile, 'id'>> & Record<string, unknown>;
        Relationships: [];
      };
      conversation_state: {
        Row: ConversationState & Record<string, unknown>;
        Insert: ConversationState & Record<string, unknown>;
        Update: Partial<ConversationState> & Record<string, unknown>;
        Relationships: [];
      };
    };
    // Required by GenericSchema — no views or functions in MVP
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// ─── Agent I/O types ──────────────────────────────────────────────────────────

export interface AnalystOutput {
  reviews: Array<{
    external_id: string;
    sentiment: Review['sentiment'];
    sentiment_score: number;
    topics: string[];
  }>;
}

export interface DrafterOutput {
  drafts: Array<{
    review_id: string;
    draft: string;
  }>;
}

export interface IntentRouterOutput {
  intent: 'approve' | 'edit' | 'skip' | 'query' | 'unknown';
  draft_id?: string;
  edit_text?: string;
  query?: string;
}

export interface QueryHandlerOutput {
  answer: string;
  chart?: QuickChartConfig;
}

export interface QuickChartConfig {
  type: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }>;
  };
  options?: Record<string, unknown>;
}

export interface ReporterOutput {
  strengths: string[];
  active_issues: ActiveIssue[];
  resolved_issues: string[];
  competitor_gaps: string[];
  sentiment_trend: RestaurantProfile['sentiment_trend'];
  voice_profile: VoiceProfile;
  draft_stats: DraftStats;
  raw_summary: string;
}

// ─── Google Places types ──────────────────────────────────────────────────────

export interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  reviews: PlaceReview[];
}

export interface NearbyPlace {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  vicinity: string;
}
