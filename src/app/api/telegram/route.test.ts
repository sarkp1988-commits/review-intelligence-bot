import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/telegram';
import { POST } from './route';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/telegram', () => ({
  bot: {
    api: {
      sendMessage: jest.fn(),
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-webhook-secret';

const VALID_UPDATE = {
  update_id: 100,
  message: {
    message_id: 1,
    from: { id: 12345, first_name: 'Test', is_bot: false },
    chat: { id: 12345, type: 'private' },
    text: 'hello',
    date: 1700000000,
  },
};

function makeRequest(body: unknown, secret?: string): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (secret !== undefined) {
    headers.set('x-telegram-bot-api-secret-token', secret);
  }
  const rawBody =
    typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost/api/telegram', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = VALID_SECRET;
  jest.resetAllMocks();

  // Default: successful Supabase upsert
  (supabase.from as jest.Mock).mockReturnValue({
    upsert: jest.fn().mockResolvedValue({ error: null }),
  });

  // Default: successful Telegram sendMessage
  (bot.api.sendMessage as jest.Mock).mockResolvedValue({});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/telegram', () => {
  it('returns 200 for POST with valid secret token', async () => {
    const req = makeRequest(VALID_UPDATE, VALID_SECRET);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 401 for POST with invalid secret token', async () => {
    const req = makeRequest(VALID_UPDATE, 'wrong-secret');
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 401 for POST with missing secret token', async () => {
    const req = makeRequest(VALID_UPDATE); // no secret header
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for malformed body without crashing', async () => {
    const req = makeRequest('not-valid-json-{{{', VALID_SECRET);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('upserts conversation_state in Supabase with correct chatId', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

    const req = makeRequest(VALID_UPDATE, VALID_SECRET);
    await POST(req);

    expect(supabase.from).toHaveBeenCalledWith('conversation_state');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ telegram_chat_id: 12345 })
    );
  });

  it('calls bot.api.sendMessage with correct chatId', async () => {
    const req = makeRequest(VALID_UPDATE, VALID_SECRET);
    await POST(req);

    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      12345,
      expect.any(String),
      expect.objectContaining({ parse_mode: 'Markdown' })
    );
  });

  it('returns 200 without calling sendMessage when update has no message', async () => {
    const noMessageUpdate = { update_id: 101 }; // callback_query, etc.
    const req = makeRequest(noMessageUpdate, VALID_SECRET);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });
});
