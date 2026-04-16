// ─── Model IDs ────────────────────────────────────────────────────────────────
// All Claude model references must import from here — never hardcode elsewhere.

export const MODELS = {
  // Routine agents: analyst, drafter, intent-router, query-handler
  HAIKU: 'claude-haiku-4-5-20251001',
  // High-quality agents: onboarding, weekly reporter
  SONNET: 'claude-sonnet-4-6',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// ─── Token budgets (per TRD §7) ───────────────────────────────────────────────

export const MAX_TOKENS = {
  HAIKU: 512,
  DRAFTER: 256,
  SONNET: 4096,
} as const;
