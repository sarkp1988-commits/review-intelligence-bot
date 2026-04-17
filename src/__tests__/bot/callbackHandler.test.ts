// Bot Engineer Agent — Slice 5 (Issue #6)
// TDD: callbackHandler unit tests

// Mock Supabase BEFORE any imports that use it
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

import { handleCallbackQuery, handleEditReply, levenshtein } from '@/lib/bot/callbackHandler';

function makeCallbackCtx(data: string) {
  return {
    callbackQuery: { data },
    answerCallbackQuery: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('handleCallbackQuery', () => {
  test('approve: answers query and confirms', async () => {
    const ctx = makeCallbackCtx('approve:draft-uuid-123');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith('\u2705 Got it! Response noted.');
  });

  test('skip: answers query and confirms', async () => {
    const ctx = makeCallbackCtx('skip:draft-uuid-456');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith('\u23ed Skipped. Moving on.');
  });

  test('edit: sets awaiting_edit state', async () => {
    const ctx = makeCallbackCtx('edit:draft-uuid-789');
    await handleCallbackQuery(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith("\u270f\ufe0f Send me your edited version.");
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
  test('saves final_text and replies confirmation', async () => {
    const ctx = { reply: jest.fn().mockResolvedValue(undefined) } as any;
    await handleEditReply(ctx, 'draft-id', 'Hello world', 'Hello there');
    expect(ctx.reply).toHaveBeenCalledWith('\u2705 Updated version saved.');
  });
});

describe('levenshtein', () => {
  test('identical strings return 0', () => {
    expect(levenshtein('same text', 'same text')).toBe(0);
  });

  test('single char change returns 1', () => {
    expect(levenshtein('cat', 'cut')).toBe(1);
  });
});
