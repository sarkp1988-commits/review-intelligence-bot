import { handleCallbackQuery, handleEditReply } from '@/lib/bot/callbackHandler';
import { routeIntent } from '@/lib/bot/intentRouter';
import { NextRequest, NextResponse } from 'next/server';
import { InlineKeyboard } from 'grammy';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/telegram';
import { fetchReviews } from '@/lib/places';
import { saveReviews, updateLastCrawledAt } from '@/agents/review-fetcher';
import { runAnalystAgent } from '@/agents/analyst';
import { runDrafterAgent } from '@/agents/drafter';
import { MODELS } from '@/lib/config';
import type { Review, Draft, AnalystOutput } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationStateValue =
  | 'new'
  | 'onboarding_name'
  | 'onboarding_city'
  | 'onboarding_link'
  | 'processing'
  | 'idle';

interface StateRow {
  telegram_chat_id: number;
  state: ConversationStateValue;
  context: Record<string, unknown>;
  restaurant_id: string | null;
  updated_at: string;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function loadState(chatId: number): Promise<StateRow | null> {
  const { data, error } = await supabase
    .from('conversation_state')
    .select()
    .eq('telegram_chat_id', chatId)
    .single();
  if (error) return null;
  return data as StateRow;
}

async function saveState(
  chatId: number,
  state: ConversationStateValue,
  context: Record<string, unknown>,
  restaurantId: string | null = null
): Promise<void> {
  await supabase.from('conversation_state').upsert({
    telegram_chat_id: chatId,
    state,
    context,
    restaurant_id: restaurantId,
    updated_at: new Date().toISOString(),
  });
}

// ─── Telegram helpers ─────────────────────────────────────────────────────────

function send(chatId: number, text: string): Promise<unknown> {
  return bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

async function sendDraftMessage(
  chatId: number,
  review: Review,
  draftText: string,
  draftId: string
): Promise<void> {
  const stars = '⭐'.repeat(review.stars ?? 0);
  const caption =
    `*${review.author ?? 'Guest'}* ${stars}\n` +
    `_"${review.body ?? ''}"_\n\n` +
    `*Suggested reply:*\n${draftText}`;

  const keyboard = new InlineKeyboard()
    .text('✅ Approve', `approve:${draftId}`)
    .text('✏️ Edit', `edit:${draftId}`)
    .text('⏭️ Skip', `skip:${draftId}`);

  await bot.api.sendMessage(chatId, caption, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

// ─── Place ID extraction ──────────────────────────────────────────────────────

function extractPlaceId(text: string): string | null {
  try {
    const url = new URL(text);
    const paramId = url.searchParams.get('place_id');
    if (paramId) return paramId;
  } catch {
    // not a valid URL — fall through
  }
  const match = /!1s(ChIJ[^!&\s]+)/.exec(text);
  return match ? match[1] : null;
}

// ─── AI pipeline ──────────────────────────────────────────────────────────────

async function applyAnalysis(
  restaurantId: string,
  analysis: AnalystOutput
): Promise<void> {
  for (const result of analysis.reviews) {
    await supabase
      .from('reviews')
      .update({ sentiment: result.sentiment, sentiment_score: result.sentiment_score, topics: result.topics })
      .eq('restaurant_id', restaurantId)
      .eq('external_id', result.external_id);
  }
}

async function draftAndSend(
  chatId: number,
  restaurantId: string,
  reviews: Review[],
  restaurant: { name: string; city: string }
): Promise<void> {
  for (const review of reviews) {
    const draftText = await runDrafterAgent(review, restaurant);

    const { data } = await supabase
      .from('drafts')
      .insert({
        restaurant_id: restaurantId,
        review_id: review.id,
        original_draft: draftText,
        action: 'pending' as const,
        model_used: MODELS.HAIKU,
        final_text: null,
        edit_distance: null,
        actioned_at: null,
      })
      .select()
      .single();

    if (data) {
      await sendDraftMessage(chatId, review, draftText, (data as Draft).id);
    }
  }
}

async function runOnboardingPipeline(
  chatId: number,
  restaurantId: string,
  placeId: string,
  restaurant: { name: string; city: string }
): Promise<void> {
  const placeReviews = await fetchReviews(placeId);
  await saveReviews(restaurantId, placeReviews);

  const { data: reviews } = await supabase
    .from('reviews')
    .select()
    .eq('restaurant_id', restaurantId);

  if (!reviews?.length) return;

  const analysis = await runAnalystAgent(reviews as Review[], restaurant);
  await applyAnalysis(restaurantId, analysis);
  await draftAndSend(chatId, restaurantId, reviews as Review[], restaurant);
  await updateLastCrawledAt(restaurantId);
}

// ─── State handlers ───────────────────────────────────────────────────────────

async function handleNew(chatId: number): Promise<void> {
  await saveState(chatId, 'onboarding_name', {});
  await send(
    chatId,
    "Hello! I'm your *Review Intelligence Bot*.\n\nWhat is your restaurant's name?"
  );
}

async function handleOnboardingName(
  chatId: number,
  text: string,
  ctx: Record<string, unknown>
): Promise<void> {
  await saveState(chatId, 'onboarding_city', { ...ctx, name: text });
  await send(chatId, 'Great! Which city is your restaurant in?');
}

async function handleOnboardingCity(
  chatId: number,
  text: string,
  ctx: Record<string, unknown>
): Promise<void> {
  await saveState(chatId, 'onboarding_link', { ...ctx, city: text });
  await send(
    chatId,
    'Almost there! Please share your Google Maps link, or type *skip* to continue without one.'
  );
}

async function handleOnboardingLink(
  chatId: number,
  text: string,
  ctx: Record<string, unknown>
): Promise<void> {
  const placeId = text.toLowerCase() === 'skip' ? null : extractPlaceId(text);

  const { data } = await supabase
    .from('restaurants')
    .upsert(
      {
        telegram_chat_id: chatId,
        name: ctx.name as string,
        city: ctx.city as string,
        google_place_id: placeId,
      },
      { onConflict: 'telegram_chat_id' }
    )
    .select()
    .single();

  const restaurantId = (data as { id: string } | null)?.id ?? null;

  await saveState(chatId, 'processing', {}, restaurantId);
  await send(chatId, 'Got it! Analysing your reviews now — this may take a minute.');

  if (placeId && restaurantId) {
    await runOnboardingPipeline(chatId, restaurantId, placeId, {
      name: ctx.name as string,
      city: ctx.city as string,
    });
  }

  await saveState(chatId, 'idle', {}, restaurantId);
}

async function handleProcessing(chatId: number): Promise<void> {
  await send(chatId, 'Still analysing your reviews. Your report will be ready soon!');
}

async function handleIdle(
  _chatId: number,
  _text: string,
  _ctx: Record<string, unknown>
): Promise<void> {
  // Intent router wired in a later slice — no-op for now
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function dispatch(chatId: number, text: string): Promise<void> {
  const row = await loadState(chatId);
  const state: ConversationStateValue = row?.state ?? 'new';
  const ctx: Record<string, unknown> = row?.context ?? {};

  switch (state) {
    case 'new':
      await handleNew(chatId);
      break;
    case 'onboarding_name':
      await handleOnboardingName(chatId, text, ctx);
      break;
    case 'onboarding_city':
      await handleOnboardingCity(chatId, text, ctx);
      break;
    case 'onboarding_link':
      await handleOnboardingLink(chatId, text, ctx);
      break;
    case 'processing':
      await handleProcessing(chatId);
      break;
    case 'idle':
      await handleIdle(chatId, text, ctx);
      break;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!incomingSecret || incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: Record<string, unknown>;
  try {
    update = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const message = update.message as
    | { chat?: { id?: number }; text?: string }
    | undefined;
  const chatId = message?.chat?.id;

  if (!chatId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await dispatch(chatId, message?.text ?? '');

  return NextResponse.json({ ok: true }, { status: 200 });
}

// ── Slice 5: callback_query handler (Approve / Edit / Skip) ──
bot.on('callback_query:data', async (ctx) => {
  await handleCallbackQuery(ctx);
});

// Free-text intent routing
bot.on('message:text', async (ctx, next) => {
  const session = await getSession(ctx.chat.id);
  if (session?.state === 'awaiting_edit' && session?.pending_draft_id) {
    const intent = await routeIntent(ctx.message.text);
    if (intent === 'approve') {
      await handleCallbackQuery(Object.assign(ctx, { callbackQuery: { data: 'approve:' + session.pending_draft_id } }));
    } else if (intent === 'skip') {
      await handleCallbackQuery(Object.assign(ctx, { callbackQuery: { data: 'skip:' + session.pending_draft_id } }));
    } else if (intent === 'edit' || ctx.message.text.length > 20) {
      await handleEditReply(ctx, session.pending_draft_id, session.original_draft ?? '', ctx.message.text);
    } else { return next(); }
  } else { return next(); }
});
