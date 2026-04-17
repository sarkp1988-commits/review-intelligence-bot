// Bot Engineer Agent — Slice 5 (Issue #6)
// Handles approve / edit / skip callback_query events from Telegram inline buttons
// Uses shared supabase singleton from @/lib/supabase (already mocked in tests)

import type { CallbackQueryContext, Context } from 'grammy';
import { supabase } from '@/lib/supabase';

export type DraftAction = 'approved' | 'skipped' | 'edited';

/** Called for every inline-button tap (callback_query). */
export async function handleCallbackQuery(ctx: CallbackQueryContext<Context>): Promise<void> {
  const data = ctx.callbackQuery.data ?? '';
  await ctx.answerCallbackQuery();

  const colonIdx = data.indexOf(':');
  const action = colonIdx === -1 ? data : data.substring(0, colonIdx);
  const draftId = colonIdx === -1 ? '' : data.substring(colonIdx + 1);

  if (!draftId) {
    await ctx.reply('Something went wrong.');
    return;
  }

  if (action === 'approve') {
    await updateDraftAction(draftId, 'approved');
    await ctx.reply('\u2705 Got it! Response noted.');
  } else if (action === 'skip') {
    await updateDraftAction(draftId, 'skipped');
    await ctx.reply('\u23ed Skipped. Moving on.');
  } else if (action === 'edit') {
    await setDraftAwaitingEdit(draftId);
    await ctx.reply("\u270f\ufe0f Send me your edited version.");
  } else {
    console.warn('[callbackHandler] Unknown:', data);
    await ctx.reply('Something went wrong.');
  }
}

/** Called when owner is in awaiting_edit state and sends free text. */
export async function handleEditReply(
  ctx: Context,
  draftId: string,
  originalDraft: string,
  editedText: string
): Promise<void> {
  const editDistance = levenshtein(originalDraft, editedText);
  const { error } = await supabase
    .from('drafts')
    .update({
      final_text: editedText,
      edit_distance: editDistance,
      action: 'edited',
      actioned_at: new Date().toISOString(),
      state: null,
    })
    .eq('id', draftId);
  if (error) throw error;
  await ctx.reply('\u2705 Updated version saved.');
}

async function updateDraftAction(draftId: string, action: DraftAction): Promise<void> {
  const { error } = await supabase
    .from('drafts')
    .update({ action, actioned_at: new Date().toISOString() })
    .eq('id', draftId);
  if (error) throw error;
}

async function setDraftAwaitingEdit(draftId: string): Promise<void> {
  const { error } = await supabase
    .from('drafts')
    .update({ state: 'awaiting_edit' })
    .eq('id', draftId);
  if (error) throw error;
}

/** Levenshtein distance for edit tracking. */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}
