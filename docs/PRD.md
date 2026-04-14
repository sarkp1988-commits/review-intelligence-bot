# PRD — Product Requirements Document

**Product:** Review Intelligence Bot
**Version:** 1.0 — MVP
**Owner:** sarkp1988-commits
**Status:** Pre-build baseline

---

## 1. Problem statement

Restaurant owners spend 4–6 hours per week managing online reviews. Most do it inconsistently. A single unanswered 1-star review can cost a restaurant 10–15 potential customers. No affordable, intelligent tool handles this autonomously for the independent owner.

---

## 2. Product vision

An AI-powered reputation management bot operating entirely through Telegram (primary) and email (digests). No app to install. No dashboard to log into. The bot monitors reviews, analyses sentiment, benchmarks competitors, and delivers drafted responses to the owner's phone. The owner's only job: approve, edit, or skip each draft.

---

## 3. Two distinct worlds

| Surface | Who | Interface |
|---|---|---|
| Builder side | Partha | GitHub + Claude Code + Telegram dev bot |
| Customer side | Restaurant owner | Telegram personal bot + Email |

The customer has zero awareness of GitHub, agents, or infrastructure.

---

## 4. Target users

### Primary — Independent restaurant owner
- Runs 1–3 locations
- 5–50 new reviews per month on Google
- No dedicated marketing staff
- Uses Telegram or WhatsApp daily
- Cares about reputation but has no time to manage it

### Secondary — Restaurant group manager (post-MVP)
- 3–10 locations, needs consolidated intelligence across sites

---

## 5. Goals and non-goals

### Goals (MVP)
- Monitor Google reviews daily per restaurant
- Generate AI-drafted response per new review
- Deliver drafts via Telegram with one-tap Approve / Edit / Skip
- Weekly intelligence report: sentiment trends, competitor benchmarks
- Learn owner voice from edit history, improve draft quality over time
- Cost under $35/month for 1–3 test restaurants

### Non-goals (MVP)
- Web or mobile app interface
- Auto-posting responses without owner approval
- Billing or payment processing
- WhatsApp integration
- Yelp review monitoring
- Multi-location support

---

## 6. Success metrics

| Metric | Target | Measured via |
|---|---|---|
| Onboarding completion | >90% | Supabase: restaurants reaching idle state |
| Draft approval rate | >70% by week 4 | drafts table: approved / total actioned |
| Daily alert delivery | <2% failure rate | Langfuse: delivery logs |
| Time to first report | <90 seconds | Langfuse: onboarding trace duration |
| Owner active at week 4 | >80% | Supabase: last_interaction_at recency |
| AI cost per restaurant | <$3/month | Langfuse: token cost by restaurant_id |

---

## 7. Pricing

**MVP:** $0 — test phase. No billing infrastructure needed.

**Post-MVP:**
- Base: $20/month
- Pro: $49/month (unlimited drafts, deeper competitor analysis)
- Stripe added at first paying customer
