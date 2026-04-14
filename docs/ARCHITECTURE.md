# Architecture — System Design

**Product:** Review Intelligence Bot | **Version:** 1.0 MVP

---

## High-level overview

```
Restaurant Owner
      │  Telegram messages
      ▼
Vercel (Next.js, always on)
├── POST /api/telegram        ← Grammy.js webhook handler
├── GET  /api/cron/daily-alert     ← Vercel Cron 8am daily
├── GET  /api/cron/weekly-profile  ← Vercel Cron Mon 7am
└── GET  /api/cron/weekly-report   ← Vercel Cron Mon 7:10am
      │
      ├── Supabase Postgres    ← all state and reviews
      ├── Claude API           ← all agent intelligence
      ├── Google Places API    ← review and competitor data
      ├── QuickChart.io        ← chart PNG generation
      └── Resend               ← email digest delivery
```

---

## Incoming message lifecycle

```
Owner sends Telegram message
      │
Grammy.js webhook handler (/api/telegram)
      │
Load conversation_state from Supabase
      │
      ├── state = onboarding_* → Onboarding flow
      │
      └── state = idle
               │
         Intent Router (Haiku)
               │
         ├── approve  → mark draft approved, confirm to owner
         ├── edit     → store edit + diff, confirm
         ├── skip     → mark draft skipped
         ├── query    → Query Handler (Haiku) → answer + chart
         └── unknown  → help message
```

---

## Daily cron lifecycle (8am)

```
Vercel Cron fires → /api/cron/daily-alert
      │
For each active restaurant:
      │
Google Places API → reviews since last_crawled_at
      │
Analyst Agent (Haiku) — batch tag all new reviews
      │
Drafter Agent (Haiku) — one draft per review (uses voice profile)
      │
Save reviews + drafts to Supabase
      │
Check for emerging issues (3+ same topic in 7 days)
      │
Send Telegram message sequence:
  - Summary text
  - For each review: stars + excerpt + draft + Approve/Edit/Skip buttons
  - Emerging issue warning (if any)
      │
Update last_crawled_at
```

---

## Weekly report lifecycle (Monday)

```
Cron 1: /api/cron/weekly-profile (7:00am)
      │
Fetch week reviews + draft actions + competitor sample
      │
Reporter Agent (Sonnet) → updated restaurant_profile JSON
      │
Save to restaurant_profiles (versioned, never overwritten)

Cron 2: /api/cron/weekly-report (7:10am)
      │
Load updated profile from Supabase
      │
Generate 4 QuickChart PNGs:
  - Sentiment trend (7-day line)
  - Rating vs competitors (bar)
  - Top complaints (horizontal bar)
  - Response rate (doughnut)
      │
Send 5-message Telegram sequence
      │
Send HTML email via Resend
```

---

## Continuous learning — three loops

**Loop 1 — Review accumulation (automatic)**
Every review stored with metadata. Analyst receives rolling 90-day compressed summary as context. Detects emerging issues and resolutions automatically.

**Loop 2 — Owner edit signal (per draft action)**
Every action captured with diff. Weekly Sonnet call extracts voice patterns. Updated voice_profile injected into all future Drafter prompts.

**Loop 3 — Weekly profile synthesis (Sonnet)**
One Sonnet call Monday morning distils all signals into updated restaurant_profile. Versioned weekly. Injected into every agent call during the week.

---

## Environment topology

| Environment | App host | Database | Telegram bot | How to run |
|---|---|---|---|---|
| Local dev | localhost:3000 | Supabase CLI (local) | Dev bot token + ngrok URL | `npm run dev` |
| Staging | Vercel (main branch) | Supabase cloud project | Staging bot token | Auto on merge to main |
| Production | Vercel (prod branch) | Supabase cloud prod | Prod bot token | Post-MVP |

---

## Security

- Telegram webhook: secret token validated on every request
- Supabase: service role key server-side only, RLS enabled
- Cron endpoints: protected by `CRON_SECRET` header check (Vercel sends this automatically)
- Secrets: `.env.local` locally, Vercel environment variables in staging
- Never committed: no secrets in git, ever
