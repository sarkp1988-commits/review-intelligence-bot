import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/telegram';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  restaurantId?: string | null
): Promise<void> {
  const row: Record<string, unknown> = {
    telegram_chat_id: chatId,
    state,
    context,
    updated_at: new Date().toISOString(),
  };
  if (restaurantId !== undefined) {
    row.restaurant_id = restaurantId;
  }
  await supabase.from('conversation_state').upsert(row);
}

function extractPlaceId(text: string): string | null {
  // ?place_id=... query parameter
  try {
    const url = new URL(text);
    const paramId = url.searchParams.get('place_id');
    if (paramId) return paramId;
  } catch {
    // not a valid URL — fall through
  }

  // !1sChIJ... encoding in full Maps URLs
  const match = /!1s(ChIJ[^!&\s]+)/.exec(text);
  if (match) return match[1];

  return null;
}

function send(chatId: number, text: string): Promise<unknown> {
  return bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
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
  const newCtx = { ...ctx, name: text };
  await saveState(chatId, 'onboarding_city', newCtx);
  await send(chatId, 'Great! Which city is your restaurant in?');
}

async function handleOnboardingCity(
  chatId: number,
  text: string,
  ctx: Record<string, unknown>
): Promise<void> {
  const newCtx = { ...ctx, city: text };
  await saveState(chatId, 'onboarding_link', newCtx);
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

  // No row ⇒ brand-new user
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
  // 1. Authenticate — read at request time so tests can set env before each call
  const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!incomingSecret || incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let update: Record<string, unknown>;
  try {
    update = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // 3. Extract message — ignore non-message updates (callback queries, etc.)
  const message = update.message as
    | { chat?: { id?: number }; text?: string }
    | undefined;
  const chatId = message?.chat?.id;

  if (!chatId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const text = message?.text ?? '';

  // 4. Dispatch to state machine
  await dispatch(chatId, text);

  return NextResponse.json({ ok: true }, { status: 200 });
}
