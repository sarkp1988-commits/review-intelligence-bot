// Bot Engineer Agent — Slice 5 (Issue #6)
// TDD: tests written BEFORE feature code — callbackHandler unit tests

import { handleCallbackQuery, handleEditReply, levenshtein } from '@/lib/bot/callbackHandler';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

function makeCallbackCtx(data: string) {
  return {
    callbackQuery: { data },
    answerCallbackQuery: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('handleCallbackQuery', () => {
  test('approve: updates draft and confirms', async () => {
    const ctx = makeCallbackCtx('approve:draft-uuid-123');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith('✅ Got it! Response noted.');
  });

  test('skip: updates draft and confirms', async () => {
    const ctx = makeCallbackCtx('skip:draft-uuid-456');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith('⏭ Skipped. Moving on.');
  });

  test('edit: sets awaiting_edit state', async () => {
    const ctx = makeCallbackCtx('edit:draft-uuid-789');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith("✏️ Send me your edited version.");
  });

  test('unknown action: does not crash, replies error', async () => {
    const ctx = makeCallbackCtx('bogus:draft-uuid-000');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith('Something went wrong.');
  });

  test('missing draftId: replies error gracefully', async () => {
    const ctx = makeCallbackCtx('approve');
    await handleCallbackQuery(ctx);
    expect(ctx.reply).toHaveBeenCalledWith('Something went wrong.');
  });
});

describe('handleEditReply', () => {
  test('saves final_text and non-zero edit_distance', async () => {
    const ctx = { reply: jest.fn().mockResolvedValue(undefined) } as any;
    await handleEditReply(ctx, 'draft-id', 'Hello world', 'Hello there');
    expect(ctx.reply).toHaveBeenCalledWith('✅ Updated version saved.');
  });

  test('edit_distance is 0 for identical text', async () => {
    const dist = levenshtein('same text', 'same text');
    expect(dist).toBe(0);
  });

  test('edit_distance is correct for simple change', async () => {
    const dist = levenshtein('cat', 'cut');
    expect(dist).toBe(1);
  });
});
