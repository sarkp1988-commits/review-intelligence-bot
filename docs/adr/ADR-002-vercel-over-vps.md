# ADR-002: Vercel over VPS for MVP hosting

**Date:** Project foundation | **Status:** Accepted

## Context
Initially planned to use Hostinger KVM2 VPS. Reconsidered for MVP simplicity.

## Decision
Use Vercel free hobby tier for all hosting. Development on laptop. VPS reconsidered post-MVP if needed.

## Reasons
- Zero server management — no Nginx, PM2, SSL, or SSH setup
- HTTPS automatic on all deployments
- Auto-deploy on merge to main — CI/CD is trivial
- Vercel Cron handles daily and weekly jobs without any infrastructure
- Free hobby tier sufficient for 1–3 restaurant MVP test
- Vercel function logs and cron monitoring built into dashboard

## Trade-offs
- 60-second function timeout on hobby tier — weekly report split into two sequential cron jobs to manage this
- No persistent processes — fine for this stateless architecture
- Cannot run long background workers — acceptable for MVP scale

## Consequences
If timeout becomes a consistent problem at scale, revisit VPS or upgrade to Vercel Pro ($20/month) which raises timeout to 300 seconds.
