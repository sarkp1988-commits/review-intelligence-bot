# TRD — Technical Requirements Document

**Product:** Review Intelligence Bot
**Version:** 1.0 — MVP

---

## 1. System architecture — four layers

| Layer | Components | Responsibility |
|---|---|---|
| Channel | Telegram Bot API, Resend email | Owner-facing. Sends/receives messages and chart images |
| Orchestration | Next.js API routes on Vercel, Vercel Cron | Webhook handler, intent router, cron scheduler |
| Intelligence | Claude API (Haiku + Sonnet) | All agent logic — analysis, drafting, reporting |
| Data | Supabase Postgres, Google Places API, QuickChart | Storage, review acquisition, chart generation |

---

## 2. Infrastructure

| Resource | Purpose | Cost |
|---|---|---|
| Mac laptop | Local development, Claude Code sessions | Already owned |
| Vercel (hobby) | Hosts Next.js app, webhook endpoint, cron jobs | Free |
| Supabase cloud | Postgres database — reviews, drafts, profiles | Free (500MB) |
| ngrok | Exposes localhost:3000 to Telegram for local dev | Free |

---

## 3. Vercel configuration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-alert",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/cron/weekly-profile",
      "schedule": "0 11 * * 1"
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "10 11 * * 1"
    }
  ]
}
```

Note: Vercel cron times are UTC. 13:00 UTC = 8:00am EST. Weekly jobs split into two: profile update first, report delivery 10 minutes later. Each must complete within 60 seconds on hobby tier.

---

## 4. Database schema (Supabase Postgres)

### restaurants
```sql
CREATE TABLE restaurants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  city             TEXT NOT NULL,
  google_place_id  TEXT,
  email            TEXT,
  onboarded_at     TIMESTAMPTZ DEFAULT now(),
  last_crawled_at  TIMESTAMPTZ,
  status           TEXT DEFAULT 'active',
  timezone         TEXT DEFAULT 'America/New_York'
);
```

### reviews
```sql
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id),
  platform        TEXT DEFAULT 'google',
  external_id     TEXT,
  author          TEXT,
  stars           INT,
  body            TEXT,
  review_date     TIMESTAMPTZ,
  sentiment       TEXT,
  sentiment_score FLOAT,
  topics          TEXT[],
  is_competitor   BOOLEAN DEFAULT false,
  competitor_name TEXT,
  fetched_at      TIMESTAMPTZ DEFAULT now()
);
```

### drafts
```sql
CREATE TABLE drafts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  UUID REFERENCES restaurants(id),
  review_id      UUID REFERENCES reviews(id),
  original_draft TEXT NOT NULL,
  final_text     TEXT,
  action         TEXT DEFAULT 'pending',
  edit_distance  INT,
  model_used     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  actioned_at    TIMESTAMPTZ
);
```

### restaurant_profiles
```sql
CREATE TABLE restaurant_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id),
  week_ending     DATE NOT NULL,
  strengths       TEXT[],
  active_issues   JSONB,
  resolved_issues TEXT[],
  competitor_gaps TEXT[],
  sentiment_trend TEXT,
  voice_profile   JSONB,
  draft_stats     JSONB,
  raw_summary     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, week_ending)
);
```

### conversation_state
```sql
CREATE TABLE conversation_state (
  telegram_chat_id BIGINT PRIMARY KEY,
  restaurant_id    UUID REFERENCES restaurants(id),
  state            TEXT DEFAULT 'new',
  context          JSONB DEFAULT '{}',
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Agent specifications

| Agent | Model | Trigger | Output |
|---|---|---|---|
| Onboarding | claude-sonnet-4-6 | First message | JSON: sentiment, strengths, pain points, initial profile |
| Analyst | claude-haiku-4-5-20251001 | Daily cron | reviews[] with sentiment + topics tagged |
| Drafter | claude-haiku-4-5-20251001 | After analyst | Draft string per review |
| Intent Router | claude-haiku-4-5-20251001 | Every owner message | Intent enum |
| Query Handler | claude-haiku-4-5-20251001 | On-demand query | Answer + optional QuickChart config JSON |
| Reporter | claude-sonnet-4-6 | Weekly cron (Monday) | Full profile update + 4 chart configs + narrative |

### System prompt structure (all agents)

```
[IDENTITY]
You are the {agent_name} for {restaurant.name}, {restaurant.city}.
Respond only in valid JSON matching the output schema below.

[RESTAURANT PROFILE — week ending {profile.week_ending}]
Strengths: {profile.strengths}
Active issues: {profile.active_issues}
Resolved: {profile.resolved_issues}
Competitor gaps: {profile.competitor_gaps}
Sentiment trend: {profile.sentiment_trend}

[OWNER VOICE]
Tone: {voice.tone}
Avg length: {voice.avg_length} words
Uses: {voice.uses}
Avoids: {voice.avoids}
Approval rate last 30 days: {draft_stats.approval_rate}%

[TASK]
{task_specific_instruction}

[OUTPUT SCHEMA]
{json_schema}
```

---

## 6. API integrations

### Telegram (Grammy.js)
- Webhook: `POST /api/telegram`
- Dev: ngrok URL registered as webhook
- Staging: Vercel URL registered as webhook
- Photos: `bot.api.sendPhoto(chatId, chartUrl, { caption })`
- Inline keyboards: `InlineKeyboard` builder

### Google Places API
- Place Details (reviews field) — up to 5 most recent reviews per call
- Nearby Search — competitor discovery within 3-mile radius
- Free $200/month credit covers all MVP usage

### Claude API
- SDK: `@anthropic-ai/sdk`
- All calls traced via Langfuse
- All agents return structured JSON

### Resend
- Free: 3,000 emails/month
- Weekly digest as HTML email with embedded chart images

### QuickChart.io
- Free, no API key needed
- `https://quickchart.io/chart?c={encoded_chartjs}&w=600&h=300`
- Returns PNG image URL — sent as Telegram photo

---

## 7. Token cost controls

| Strategy | Detail |
|---|---|
| Haiku for routine | Sonnet only for onboarding + weekly report |
| Compressed context | 90-day history as 200-token structured summary |
| Batch reviews | One Haiku call for all new reviews per restaurant per day |
| Skip learning | Stop drafting for review types owner skipped 3x |
| Cache competitors | Refreshed weekly in profile, not daily |
| max_tokens | Haiku: 512, Drafter: 256, Sonnet: 4096 |

---

## 8. CI/CD pipeline

### On PR
1. ESLint
2. TypeScript strict check
3. Jest unit tests

### On merge to main
1. Full test suite via GitHub Actions
2. Vercel auto-deploys (connected to GitHub repo)
3. Telegram notification to Partha

Vercel deployment is fully automatic — no GitHub Action needed for deploy, just connect Vercel to the repo in the Vercel dashboard.
