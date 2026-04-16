-- ─── Initial schema for Review Intelligence Bot ─────────────────────────────
-- Creates all 5 tables in FK-dependency order.
-- Run via: supabase db push

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── restaurants ─────────────────────────────────────────────────────────────
create table restaurants (
  id               uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint unique not null,
  name             text not null,
  city             text not null,
  google_place_id  text,
  email            text,
  onboarded_at     timestamptz default now(),
  last_crawled_at  timestamptz,
  status           text default 'active' check (status in ('active', 'inactive')),
  timezone         text default 'America/New_York'
);

-- ─── reviews ─────────────────────────────────────────────────────────────────
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid references restaurants(id) on delete cascade,
  platform        text default 'google',
  external_id     text,
  author          text,
  stars           int check (stars between 1 and 5),
  body            text,
  review_date     timestamptz,
  sentiment       text check (sentiment in ('positive', 'negative', 'neutral')),
  sentiment_score float check (sentiment_score between -1 and 1),
  topics          text[],
  is_competitor   boolean default false,
  competitor_name text,
  fetched_at      timestamptz default now()
);

-- Prevent duplicate review ingestion
create unique index reviews_restaurant_platform_external
  on reviews (restaurant_id, platform, external_id)
  where external_id is not null;

-- ─── drafts ──────────────────────────────────────────────────────────────────
create table drafts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid references restaurants(id) on delete cascade,
  review_id      uuid references reviews(id) on delete cascade,
  original_draft text not null,
  final_text     text,
  action         text default 'pending' check (action in ('pending', 'approved', 'edited', 'skipped')),
  edit_distance  int,
  model_used     text,
  created_at     timestamptz default now(),
  actioned_at    timestamptz
);

-- ─── restaurant_profiles ─────────────────────────────────────────────────────
create table restaurant_profiles (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid references restaurants(id) on delete cascade,
  week_ending     date not null,
  strengths       text[],
  active_issues   jsonb,
  resolved_issues text[],
  competitor_gaps text[],
  sentiment_trend text check (sentiment_trend in ('improving', 'declining', 'stable')),
  voice_profile   jsonb,
  draft_stats     jsonb,
  raw_summary     text,
  created_at      timestamptz default now(),
  unique (restaurant_id, week_ending)
);

-- ─── conversation_state ───────────────────────────────────────────────────────
create table conversation_state (
  telegram_chat_id bigint primary key,
  restaurant_id    uuid references restaurants(id) on delete set null,
  state            text default 'new' check (state in (
    'new',
    'onboarding_name',
    'onboarding_city',
    'onboarding_link',
    'processing',
    'idle'
  )),
  context          jsonb default '{}',
  updated_at       timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables. The server-side service role key bypasses RLS,
-- so these policies only apply if the anon key is ever used.

alter table restaurants        enable row level security;
alter table reviews            enable row level security;
alter table drafts             enable row level security;
alter table restaurant_profiles enable row level security;
alter table conversation_state enable row level security;

-- No anon access — all data access is server-side via service role key.
-- Add permissive policies here if you later add authenticated Supabase clients.
