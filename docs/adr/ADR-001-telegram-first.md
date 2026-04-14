# ADR-001: Telegram as primary channel

**Date:** Project foundation | **Status:** Accepted

## Context
Needed to choose the primary owner-facing channel for MVP. Options: Telegram, WhatsApp, Email.

## Decision
Telegram is the primary MVP channel. Email runs in parallel for weekly digests. WhatsApp deferred to post-MVP.

## Reasons
- Telegram Bot API is completely free with no per-message cost
- No business verification or Meta approval process
- Full support for inline keyboards, markdown, photo messages, and file attachments
- Bot can be created and live in under 5 minutes via @BotFather
- Widely used — especially in tech-adjacent and international communities

## Trade-offs
- WhatsApp has higher adoption among US restaurant owners
- WhatsApp integration (post-MVP) will require Meta Business verification and per-message fees

## Consequences
WhatsApp added post-MVP via same architecture — just a new channel adapter.
