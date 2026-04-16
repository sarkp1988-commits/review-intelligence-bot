import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/telegram';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  // Read at request time so tests can set process.env before each call.
  const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!incomingSecret || incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let update: Record<string, unknown>;
  try {
    update = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // ── 3. Extract chatId — ignore non-message updates (callback queries, etc.)
  const message = update.message as
    | { chat?: { id?: number }; text?: string }
    | undefined;
  const chatId = message?.chat?.id;

  if (!chatId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ── 4. Persist conversation state ────────────────────────────────────────
  await supabase.from('conversation_state').upsert({
    telegram_chat_id: chatId,
    restaurant_id: null,
    state: 'new' as const,
    context: {},
    updated_at: new Date().toISOString(),
  });

  // ── 5. Greet the user ────────────────────────────────────────────────────
  await bot.api.sendMessage(
    chatId,
    "Hello! I'm your *Review Intelligence Bot*.\n\nWhat is your restaurant's name?",
    { parse_mode: 'Markdown' }
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
