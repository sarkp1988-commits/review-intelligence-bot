# Review Intelligence Bot

AI-powered reputation management for restaurant owners — delivered entirely through Telegram and email. No app. No dashboard. Just a smart bot that monitors reviews, analyses sentiment, benchmarks competitors, and drafts responses directly into the owner's messaging app.

## What it does

- **Daily alerts** — new reviews summarised every morning at 8am with AI-drafted responses ready to approve in one tap
- **Weekly intelligence report** — sentiment trends, competitor benchmarks, and actionable recommendations as chart images + narrative
- **On-demand queries** — owner asks "show me my worst complaints this month" and gets a chart back in seconds
- **Continuous learning** — gets smarter every day from review history and owner edit behaviour

## Two distinct worlds

| Surface | Who | Interface |
|---|---|---|
| Builder side | Partha | GitHub + Claude Code + Telegram dev bot |
| Customer side | Restaurant owner | Telegram personal bot + Email |

The customer has zero awareness of GitHub, agents, or infrastructure.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (API routes only — no frontend) |
| Database | Supabase (Postgres cloud) |
| AI | Claude API — Haiku (daily tasks) + Sonnet (weekly synthesis) |
| Bot | Telegram Bot API via Grammy.js |
| Email | Resend |
| Charts | QuickChart.io |
| Hosting | Vercel (free hobby tier) |
| Cron | Vercel Cron (daily alert + weekly report) |
| CI/CD | GitHub Actions → Vercel auto-deploy |
| Dev tunnel | ngrok (local Telegram webhook testing) |
| Local DB | Supabase CLI |

## Repository structure

```
review-intelligence-bot/
├── docs/
│   ├── PRD.md               # Product requirements
│   ├── FRD.md               # Functional requirements
│   ├── TRD.md               # Technical requirements
│   ├── ARCHITECTURE.md      # System design and data flows
│   ├── SETUP.md             # Zero to running locally
│   ├── DEPENDENCIES.md      # Every package and service
│   ├── RUNBOOK.md           # Deploy, rollback, debug
│   └── adr/                 # Architecture decision records
├── agents/
│   ├── CLAUDE.md            # Root context for all Claude Code agents
│   ├── tech-lead.md
│   ├── ba.md
│   ├── backend-engineer.md
│   ├── bot-engineer.md
│   ├── qa.md
│   └── devops.md
├── src/                     # Application code (populated during build)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           # Test + lint on every PR
│   │   └── deploy.yml       # Deploy to Vercel on merge to main
│   └── ISSUE_TEMPLATE/
│       ├── feature.md
│       └── bug.md
├── .env.example
├── CONTRIBUTING.md
└── README.md
```

## Quick start

See [docs/SETUP.md](docs/SETUP.md) for the complete local setup guide.

## Documentation index

| Document | Purpose |
|---|---|
| [PRD](docs/PRD.md) | What we are building and why |
| [FRD](docs/FRD.md) | Every feature and interaction specified |
| [TRD](docs/TRD.md) | Architecture, schema, agent specs |
| [SETUP](docs/SETUP.md) | Local dev environment from zero |
| [DEPENDENCIES](docs/DEPENDENCIES.md) | Every package and service |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design and data flows |
| [RUNBOOK](docs/RUNBOOK.md) | Deploy, rollback, debug |
| [CONTRIBUTING](CONTRIBUTING.md) | Branch naming, commits, PR process |

## Project status

**Phase:** Foundation — pre-build
**Target:** Single restaurant functional test (friend's restaurant)
**Timeline:** 2–3 weeks
**Owner:** sarkp1988-commits
