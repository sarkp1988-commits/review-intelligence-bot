# DEPENDENCIES — Full Manifest

Every package, API, service, and tool used in this project.

---

## NPM packages

| Package | Purpose |
|---|---|
| `next` 14.x | Framework — API routes, server functions |
| `typescript` 5.x | Type safety |
| `@anthropic-ai/sdk` | Claude API client |
| `grammy` | Telegram Bot API framework |
| `@supabase/supabase-js` | Supabase database client |
| `resend` | Email delivery |
| `langfuse` | LLM observability and tracing |
| `zod` | Runtime schema validation |
| `date-fns` | Date manipulation |
| `fast-levenshtein` | Edit distance for draft diffs |
| `eslint` | Code linting |
| `jest` | Unit testing |
| `@types/node` | Node.js TypeScript types |

---

## External services

| Service | Purpose | Free tier | Where to get key |
|---|---|---|---|
| Claude API | All agent intelligence | $5 credit on signup | console.anthropic.com |
| Google Places API | Review fetching, competitor discovery | $200/month credit | console.cloud.google.com |
| Telegram Bot API | Primary owner channel | Unlimited free | @BotFather on Telegram |
| Supabase | Postgres database | 500MB, 2 projects | supabase.com |
| Vercel | App hosting + cron | Free hobby tier | vercel.com |
| Resend | Email delivery | 3,000 emails/month | resend.com |
| QuickChart.io | Chart image generation | Free, no key needed | quickchart.io |
| Langfuse | LLM tracing + cost monitoring | 50k events/month | cloud.langfuse.com |
| ngrok | Local dev tunnel | Free (new URL each session) | ngrok.com |
| GitHub | Source control, CI/CD | Free | github.com |

---

## Claude model IDs

| Model | ID | Use case |
|---|---|---|
| Claude Haiku | `claude-haiku-4-5-20251001` | Daily tasks: sentiment, drafts, routing, queries |
| Claude Sonnet | `claude-sonnet-4-6` | Weekly report synthesis, onboarding analysis |

---

## Environment variables reference

| Variable | Required | Source |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | @BotFather → create bot |
| `SUPABASE_URL` | Yes | Supabase dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Yes | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | Yes | console.anthropic.com |
| `GOOGLE_PLACES_API_KEY` | Yes | console.cloud.google.com |
| `RESEND_API_KEY` | Yes | resend.com/api-keys |
| `RESEND_FROM_EMAIL` | Yes | Your verified domain in Resend |
| `LANGFUSE_PUBLIC_KEY` | Yes | cloud.langfuse.com |
| `LANGFUSE_SECRET_KEY` | Yes | cloud.langfuse.com |
| `LANGFUSE_HOST` | Yes | `https://cloud.langfuse.com` |
| `WEBHOOK_URL` | Yes | ngrok URL (dev) or Vercel URL (staging) |
| `CRON_SECRET` | Yes | Any random string — protects cron endpoints |
| `APP_URL` | No | Your Vercel deployment URL |
