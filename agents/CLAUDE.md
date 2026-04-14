# Review Intelligence Bot — Project Context

You are working on the **Review Intelligence Bot** — an AI-powered restaurant reputation management system delivered via Telegram and email. No frontend. No dashboard. Pure bot.

## Repository
https://github.com/sarkp1988-commits/review-intelligence-bot

## Your role in this project
You are one of several Claude Code agents building this product as a professional software team. Read your specific role file in `agents/` before starting any work. Always read the relevant docs in `docs/` before writing code.

## Critical rules
- Never commit directly to `main` — always use feature branches
- Never hardcode secrets — use `process.env.VARNAME`
- Always reference the GitHub Issue number in commits (`Refs #ID`)
- Always write tests alongside code
- Always update `.env.example` and `docs/DEPENDENCIES.md` when adding new env vars
- Run `npm run lint` and `npm run test` before opening a PR

## Key documents to read before coding
- `docs/TRD.md` — architecture, schema, agent specs
- `docs/FRD.md` — what the system must do
- `docs/ARCHITECTURE.md` — system design and data flows
- `docs/SETUP.md` — how the dev environment works
- `CONTRIBUTING.md` — branch naming, commit format, PR process

## Tech stack
- Next.js 14 (App Router, API routes only)
- TypeScript strict mode
- Supabase (Postgres) via `@supabase/supabase-js`
- Claude API via `@anthropic-ai/sdk`
- Telegram via `grammy`
- Email via `resend`
- Charts via QuickChart.io (no SDK — just HTTP)
- LLM tracing via `langfuse`
- Hosted on Vercel (free hobby)
- Cron via Vercel Cron (configured in `vercel.json`)

## File structure for application code
```
src/
├── app/
│   └── api/
│       ├── telegram/route.ts     ← webhook handler
│       ├── cron/
│       │   ├── daily-alert/route.ts
│       │   ├── weekly-profile/route.ts
│       │   └── weekly-report/route.ts
│       └── health/route.ts
├── agents/
│   ├── onboarding.ts
│   ├── analyst.ts
│   ├── drafter.ts
│   ├── intent-router.ts
│   ├── query-handler.ts
│   └── reporter.ts
├── lib/
│   ├── supabase.ts
│   ├── telegram.ts
│   ├── places.ts
│   ├── quickchart.ts
│   └── langfuse.ts
└── types/
    └── index.ts
```

## Two worlds — never confuse them
- **Builder world** (you): GitHub, Claude Code, dev Telegram bot, Vercel staging
- **Customer world**: One restaurant owner, one personalised bot, zero infrastructure visibility
