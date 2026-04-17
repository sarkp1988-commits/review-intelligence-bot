// Bot Engineer Agent — Slice 5 (Issue #6)
import type { CallbackQueryContext, Context } from 'grammy';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type DraftAction = 'approved' | 'skipped' | 'edited';

export async function handleCallbackQuery(ctx: CallbackQueryContext<Context>): Promise<void> {
  const data = ctx.callbackQuery.data ?? '';
  await ctx.answerCallbackQuery();
  const colonIdx = data.indexOf(':');
  const action = colonIdx === -1 ? data : data.substring(0, colonIdx);
  const draftId = colonIdx === -1 ? '' : data.substring(colonIdx + 1);
  if (!draftId) { await ctx.reply('Something went wrong.'); return; }
  if (action === 'approve') {
    await updateDraftAction(draftId, 'approved');
    await ctx.reply('✅ Got it! Response noted.');
  } else if (action === 'skip') {
    await updateDraftAction(draftId, 'skipped');
    await ctx.reply('⏭ Skipped. Moving on.');
  } else if (action === 'edit') {
    await setDraftAwaitingEdit(draftId);
    await ctx.reply("✏️ Send me your edited version.");
  } else {
    console.warn('[callbackHandler] Unknown:', data);
    await ctx.reply('Something went wrong.');
  }
}

export async function handleEditReply(ctx: Context, draftId: string, original: string, edited: string): Promise<void> {
  const dist = levenshtein(original, edited);
  const { error } = await supabase.from('drafts').update({
    final_text: edited, edit_distance: dist,
    action: 'edited', actioned_at: new Date().toISOString(), state: null,
  }).eq('id', draftId);
  if (error) throw error;
  await ctx.reply('✅ Updated version saved.');
}

async function updateDraftAction(draftId: string, action: DraftAction): Promise<void> {
  const { error } = await supabase.from('drafts')
    .update({ action, actioned_at: new Date().toISOString() }).eq('id', draftId);
  if (error) throw error;
}

async function setDraftAwaitingEdit(draftId: string): Promise<void> {
  const { error } = await supabase.from('drafts')
    .update({ state: 'awaiting_edit' }).eq('id', draftId);
  if (error) throw error;
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}
