// Bot Engineer Agent — Slice 5 (Issue #6)
// Haiku-powered free-text intent router for owner messages

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export type Intent = 'approve' | 'skip' | 'edit' | 'regenerate' | 'help' | 'unknown';

const VALID_INTENTS: Intent[] = ['approve', 'skip', 'edit', 'regenerate', 'help', 'unknown'];

const SYSTEM_PROMPT = `You are an intent classifier for a restaurant review management bot.
The restaurant owner sends short free-text messages in response to AI-generated review reply drafts.
Classify the owner's message into exactly one of these intents:
- approve: owner accepts the draft (e.g. "yes", "looks good", "send it", "perfect", "ok")
- skip: owner wants to skip this review (e.g. "no", "skip", "next", "pass", "ignore")
- edit: owner wants to modify the draft (e.g. "edit", "change", "modify", "rewrite", "tweak")
- regenerate: owner wants a new AI draft (e.g. "regenerate", "try again", "another one", "redo")
- help: owner is asking for help or commands (e.g. "help", "what can you do", "commands")
- unknown: anything else that does not fit the above

Reply with ONLY the single intent word in lowercase. No explanation, no punctuation.`;

/**
 * Routes a free-text owner message to a structured Intent using Claude Haiku.
 * Used when the owner types instead of tapping an inline button.
 */
export async function routeIntent(message: string): Promise<Intent> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message.trim() }],
  });

  const raw = (response.content[0] as { type: string; text: string }).text
    .trim()
    .toLowerCase();

  return VALID_INTENTS.includes(raw as Intent) ? (raw as Intent) : 'unknown';
}
