# FRD — Functional Requirements Document

**Product:** Review Intelligence Bot
**Version:** 1.0 — MVP

Priority: Must / Should / May

---

## FR-01: Onboarding

| ID | Requirement | Priority |
|---|---|---|
| FR-01.1 | System MUST initiate onboarding when a new Telegram chat ID is detected | Must |
| FR-01.2 | Bot MUST collect restaurant name, city, and Google Maps link conversationally | Must |
| FR-01.3 | System MUST extract place_id from Google Maps URL | Must |
| FR-01.4 | System MUST save restaurant record to Supabase before fetching external data | Must |
| FR-01.5 | Bot MUST send "Analysing your reviews..." before background processing begins | Must |
| FR-01.6 | System MUST deliver initial intelligence report within 90 seconds | Must |
| FR-01.7 | System MUST have Vercel Cron jobs configured on deployment — no per-restaurant scheduling needed | Must |
| FR-01.8 | System SHOULD allow owner to skip Maps link and use name + city search as fallback | Should |

---

## FR-02: Daily review monitoring

| ID | Requirement | Priority |
|---|---|---|
| FR-02.1 | System MUST fetch new reviews from Google Places API once per day per restaurant | Must |
| FR-02.2 | System MUST only process reviews since last_crawled_at (no duplicates) | Must |
| FR-02.3 | System MUST tag each review: sentiment + sentiment_score | Must |
| FR-02.4 | System MUST extract topic tags (service, food, wait_time, ambiance, value) | Must |
| FR-02.5 | System MUST generate a draft response for every review | Must |
| FR-02.6 | System MUST deliver morning alert by 8:00am restaurant local timezone | Must |
| FR-02.7 | System MUST send "All quiet" message on days with zero new reviews | Must |
| FR-02.8 | System MUST flag emerging issues when a topic appears in 3+ reviews within 7 days | Must |
| FR-02.9 | System SHOULD batch all new reviews into one Haiku call per restaurant per day | Should |

---

## FR-03: Draft response workflow

| ID | Requirement | Priority |
|---|---|---|
| FR-03.1 | Each draft MUST be presented with three inline buttons: Approve / Edit / Skip | Must |
| FR-03.2 | System MUST store every draft action with timestamp | Must |
| FR-03.3 | When owner edits, system MUST store original + final text + edit distance | Must |
| FR-03.4 | System MUST confirm approval with a brief acknowledgement message | Must |
| FR-03.5 | System MUST NOT post responses to Google automatically | Must |
| FR-03.6 | System SHOULD stop generating drafts for review types owner skipped 3+ consecutive times | Should |
| FR-03.7 | Owner MAY request draft regeneration by replying "regenerate" | May |

---

## FR-04: On-demand queries

| ID | Requirement | Priority |
|---|---|---|
| FR-04.1 | Owner MUST be able to query the bot in natural language at any time | Must |
| FR-04.2 | System MUST classify every owner message into an intent before routing | Must |
| FR-04.3 | System MUST respond to queries within 15 seconds | Must |
| FR-04.4 | System MUST return chart images for data queries (complaints, trends, comparisons) | Must |
| FR-04.5 | System MUST handle unrecognised intents with a helpful fallback message | Must |
| FR-04.6 | System SHOULD maintain query context within a session (last 5 messages) | Should |

---

## FR-05: Weekly intelligence report

| ID | Requirement | Priority |
|---|---|---|
| FR-05.1 | System MUST generate weekly report every Monday | Must |
| FR-05.2 | Report MUST include: sentiment trend chart, rating vs competitors, top complaints, response rate | Must |
| FR-05.3 | Report MUST include narrative summary with actionable recommendations | Must |
| FR-05.4 | Report MUST be delivered as multi-message Telegram sequence | Must |
| FR-05.5 | Report MUST be simultaneously sent as HTML email via Resend | Must |
| FR-05.6 | System MUST split weekly job into two Vercel Crons to stay within 60s timeout | Must |

---

## FR-06: Continuous learning

| ID | Requirement | Priority |
|---|---|---|
| FR-06.1 | System MUST store structured metadata with every review | Must |
| FR-06.2 | System MUST update voice_profile weekly from approved and edited drafts | Must |
| FR-06.3 | System MUST inject current restaurant_profile into every agent system prompt | Must |
| FR-06.4 | System MUST detect and flag resolved issues (absent for 14+ days) | Must |
| FR-06.5 | System SHOULD version restaurant_profiles weekly — never overwrite | Should |

---

## FR-07: Intent routing table

| Intent | Example triggers | Action |
|---|---|---|
| approve | "Yes", "Send it", taps Approve button | Mark draft approved |
| edit | Owner sends modified text after draft | Store edit + diff |
| skip | "Skip", "No thanks", taps Skip button | Mark draft skipped |
| query | "Show complaints", "How am I doing vs rivals?" | Query Handler agent |
| report_request | "Weekly report", "Show digest" | Reporter agent on demand |
| unknown | Anything unclassified | Help fallback message |
