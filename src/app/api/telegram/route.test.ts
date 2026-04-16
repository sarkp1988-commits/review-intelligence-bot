import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/telegram';
import { POST } from './route';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/lib/telegram', () => ({
  bot: { api: { sendMessage: jest.fn() } },
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-webhook-secret';
const CHAT_ID = 12345;
const RESTAURANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeRequest(body: unknown, secret?: string): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (secret !== undefined) {
    headers.set('x-telegram-bot-api-secret-token', secret);
  }
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost/api/telegram', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

function makeUpdate(text: string, chatId = CHAT_ID) {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      from: { id: chatId, is_bot: false, first_name: 'Test' },
      chat: { id: chatId, type: 'private' },
      text,
      date: 1700000000,
    },
  };
}

// ─── Supabase mock factory ────────────────────────────────────────────────────

interface MockOptions {
  state?: string;
  context?: Record<string, unknown>;
  hasRow?: boolean;
  restaurantId?: string;
}

function setupSupabaseMocks({
  state = 'new',
  context = {},
  hasRow = true,
  restaurantId = RESTAURANT_ID,
}: MockOptions = {}) {
  const mockStateUpsert = jest.fn().mockResolvedValue({ data: null, error: null });

  const mockRestaurantSingle = jest
    .fn()
    .mockResolvedValue({ data: { id: restaurantId }, error: null });
  const mockRestaurantSelect = jest.fn().mockReturnValue({ single: mockRestaurantSingle });
  const mockRestaurantUpsert = jest.fn().mockReturnValue({ select: mockRestaurantSelect });

  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'conversation_state') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: hasRow
                ? { telegram_chat_id: CHAT_ID, state, context, restaurant_id: null, updated_at: '' }
                : null,
              error: hasRow ? null : { code: 'PGRST116', message: 'no rows returned' },
            }),
          }),
        }),
        upsert: mockStateUpsert,
      };
    }
    if (table === 'restaurants') {
      return { upsert: mockRestaurantUpsert };
    }
    return { upsert: jest.fn().mockResolvedValue({ error: null }) };
  });

  return { mockStateUpsert, mockRestaurantUpsert, mockRestaurantSingle };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = VALID_SECRET;
  jest.resetAllMocks();
  (bot.api.sendMessage as jest.Mock).mockResolvedValue({});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/telegram — auth & input', () => {
  it('returns 401 for invalid secret token', async () => {
    const res = await POST(makeRequest(makeUpdate('hi'), 'wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 401 for missing secret token', async () => {
    const res = await POST(makeRequest(makeUpdate('hi')));
    expect(res.status).toBe(401);
  });

  it('returns 400 for malformed JSON body', async () => {
    const res = await POST(makeRequest('{{not-json}}', VALID_SECRET));
    expect(res.status).toBe(400);
  });

  it('returns 200 silently for update with no message', async () => {
    setupSupabaseMocks();
    const res = await POST(makeRequest({ update_id: 1 }, VALID_SECRET));
    expect(res.status).toBe(200);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });
});

describe('POST /api/telegram — state: new', () => {
  it('asks for restaurant name and transitions state to onboarding_name', async () => {
    const { mockStateUpsert } = setupSupabaseMocks({ hasRow: false });

    const res = await POST(makeRequest(makeUpdate('hello'), VALID_SECRET));

    expect(res.status).toBe(200);
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/restaurant.*name|name.*restaurant/i),
      expect.objectContaining({ parse_mode: 'Markdown' })
    );
    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        telegram_chat_id: CHAT_ID,
        state: 'onboarding_name',
      })
    );
  });
});

describe('POST /api/telegram — state: onboarding_name', () => {
  it('saves name to context, asks for city, transitions to onboarding_city', async () => {
    const { mockStateUpsert } = setupSupabaseMocks({
      state: 'onboarding_name',
      context: {},
    });

    await POST(makeRequest(makeUpdate("Mario's Bistro"), VALID_SECRET));

    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/city/i),
      expect.anything()
    );
    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'onboarding_city',
        context: expect.objectContaining({ name: "Mario's Bistro" }),
      })
    );
  });
});

describe('POST /api/telegram — state: onboarding_city', () => {
  it('saves city to context, asks for Maps link, transitions to onboarding_link', async () => {
    const { mockStateUpsert } = setupSupabaseMocks({
      state: 'onboarding_city',
      context: { name: "Mario's Bistro" },
    });

    await POST(makeRequest(makeUpdate('New York'), VALID_SECRET));

    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/maps|link|skip/i),
      expect.anything()
    );
    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'onboarding_link',
        context: expect.objectContaining({ name: "Mario's Bistro", city: 'New York' }),
      })
    );
  });
});

describe('POST /api/telegram — state: onboarding_link', () => {
  it('inserts restaurant, sends analysing message, transitions to processing', async () => {
    const mapsUrl =
      'https://www.google.com/maps/place/Marios/@40.7,-74.0/data=!1sChIJXYZ123!8m2!3d40.7';
    const { mockStateUpsert, mockRestaurantUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
    });

    const res = await POST(makeRequest(makeUpdate(mapsUrl), VALID_SECRET));

    expect(res.status).toBe(200);
    // Restaurant created
    expect(mockRestaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        telegram_chat_id: CHAT_ID,
        name: "Mario's Bistro",
        city: 'New York',
      }),
      expect.anything()
    );
    // Sends "analysing" message
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/analys/i),
      expect.anything()
    );
    // Transitions to processing with restaurant_id
    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'processing',
        restaurant_id: RESTAURANT_ID,
      })
    );
  });

  it('handles "skip" — inserts restaurant with null place_id', async () => {
    const { mockRestaurantUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
    });

    await POST(makeRequest(makeUpdate('skip'), VALID_SECRET));

    expect(mockRestaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ google_place_id: null }),
      expect.anything()
    );
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/analys/i),
      expect.anything()
    );
  });

  it('extracts place_id from ?place_id= query param', async () => {
    const urlWithParam = 'https://maps.google.com/?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4';
    const { mockRestaurantUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
    });

    await POST(makeRequest(makeUpdate(urlWithParam), VALID_SECRET));

    expect(mockRestaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
      expect.anything()
    );
  });

  it('extracts place_id from !1s encoding in full Maps URL', async () => {
    const fullMapsUrl =
      'https://www.google.com/maps/place/Name/@40.7,-74.0/data=!1sChIJABC987!4m5';
    const { mockRestaurantUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
    });

    await POST(makeRequest(makeUpdate(fullMapsUrl), VALID_SECRET));

    expect(mockRestaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ google_place_id: 'ChIJABC987' }),
      expect.anything()
    );
  });
});

describe('POST /api/telegram — state: processing', () => {
  it('sends a "still working" message without changing state', async () => {
    const { mockStateUpsert } = setupSupabaseMocks({
      state: 'processing',
      context: {},
    });

    const res = await POST(makeRequest(makeUpdate('are you done?'), VALID_SECRET));

    expect(res.status).toBe(200);
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/analys|ready|report/i),
      expect.anything()
    );
    // State should NOT be changed during processing
    expect(mockStateUpsert).not.toHaveBeenCalled();
  });
});

describe('POST /api/telegram — state: idle', () => {
  it('returns 200 without crashing (intent router wired in later slice)', async () => {
    setupSupabaseMocks({ state: 'idle', context: {} });

    const res = await POST(makeRequest(makeUpdate('Show me complaints'), VALID_SECRET));

    expect(res.status).toBe(200);
  });
});
