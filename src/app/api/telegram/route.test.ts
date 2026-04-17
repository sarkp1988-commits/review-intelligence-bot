import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/telegram';
import { runAnalystAgent } from '@/agents/analyst';
import { runDrafterAgent } from '@/agents/drafter';
import { fetchReviews } from '@/lib/places';
import { saveReviews, updateLastCrawledAt } from '@/agents/review-fetcher';
import { POST } from './route';
import type { Review } from '@/types';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/lib/telegram', () => ({
  bot: { api: { sendMessage: jest.fn() }, on: jest.fn(), start: jest.fn() },
}));

// Default: return no reviews — existing tests are unaffected, pipeline is a no-op
jest.mock('@/lib/places', () => ({
  fetchReviews: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/agents/review-fetcher', () => ({
  saveReviews: jest.fn().mockResolvedValue(undefined),
  updateLastCrawledAt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/agents/analyst', () => ({
  runAnalystAgent: jest.fn().mockResolvedValue({ reviews: [] }),
}));

jest.mock('@/agents/drafter', () => ({
  runDrafterAgent: jest.fn().mockResolvedValue('Thank you for your review!'),
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-webhook-secret';
const CHAT_ID = 12345;
const RESTAURANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const DRAFT_ID = 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb';
const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

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
  savedReviews?: Review[];
}

function setupSupabaseMocks({
  state = 'new',
  context = {},
  hasRow = true,
  restaurantId = RESTAURANT_ID,
  savedReviews = [],
}: MockOptions = {}) {
  const mockStateUpsert = jest.fn().mockResolvedValue({ data: null, error: null });

  const mockRestaurantSingle = jest
    .fn()
    .mockResolvedValue({ data: { id: restaurantId }, error: null });
  const mockRestaurantSelect = jest.fn().mockReturnValue({ single: mockRestaurantSingle });
  const mockRestaurantUpsert = jest.fn().mockReturnValue({ select: mockRestaurantSelect });

  // reviews: select().eq() and update().eq().eq()
  const mockReviewsEq = jest.fn().mockResolvedValue({ data: savedReviews, error: null });
  const mockReviewsSelect = jest.fn().mockReturnValue({ eq: mockReviewsEq });
  const mockReviewsUpdateEq2 = jest.fn().mockResolvedValue({ error: null });
  const mockReviewsUpdateEq1 = jest.fn().mockReturnValue({ eq: mockReviewsUpdateEq2 });
  const mockReviewsUpdate = jest.fn().mockReturnValue({ eq: mockReviewsUpdateEq1 });

  // drafts: insert().select().single()
  const mockDraftsSingle = jest.fn().mockResolvedValue({ data: { id: DRAFT_ID }, error: null });
  const mockDraftsSelect = jest.fn().mockReturnValue({ single: mockDraftsSingle });
  const mockDraftsInsert = jest.fn().mockReturnValue({ select: mockDraftsSelect });

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
    if (table === 'reviews') {
      return { select: mockReviewsSelect, update: mockReviewsUpdate };
    }
    if (table === 'drafts') {
      return { insert: mockDraftsInsert };
    }
    return { upsert: jest.fn().mockResolvedValue({ error: null }) };
  });

  return {
    mockStateUpsert,
    mockRestaurantUpsert,
    mockRestaurantSingle,
    mockDraftsInsert,
    mockDraftsSingle,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = VALID_SECRET;
  jest.resetAllMocks();
  (bot.api.sendMessage as jest.Mock).mockResolvedValue({});
  // Re-apply defaults after resetAllMocks
  (fetchReviews as jest.Mock).mockResolvedValue([]);
  (saveReviews as jest.Mock).mockResolvedValue(undefined);
  (updateLastCrawledAt as jest.Mock).mockResolvedValue(undefined);
  (runAnalystAgent as jest.Mock).mockResolvedValue({ reviews: [] });
  (runDrafterAgent as jest.Mock).mockResolvedValue('Thank you for your review!');
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
    expect(mockRestaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        telegram_chat_id: CHAT_ID,
        name: "Mario's Bistro",
        city: 'New York',
      }),
      expect.anything()
    );
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      CHAT_ID,
      expect.stringMatching(/analys/i),
      expect.anything()
    );
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
    const urlWithParam = `https://maps.google.com/?place_id=${PLACE_ID}`;
    const { mockRestaurantUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
    });

    await POST(makeRequest(makeUpdate(urlWithParam), VALID_SECRET));

    expect(mockRestaurantUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ google_place_id: PLACE_ID }),
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

describe('POST /api/telegram — AI pipeline (onboarding_link with place_id)', () => {
  const MAPS_URL = `https://maps.google.com/?place_id=${PLACE_ID}`;

  const SAVED_REVIEW: Review = {
    id: 'rev-1',
    restaurant_id: RESTAURANT_ID,
    platform: 'google',
    external_id: 'Alice_1700000000',
    author: 'Alice',
    stars: 5,
    body: 'Amazing food!',
    review_date: '2023-11-14T00:00:00.000Z',
    sentiment: null,
    sentiment_score: null,
    topics: null,
    is_competitor: false,
    competitor_name: null,
    fetched_at: '2023-11-14T01:00:00.000Z',
  };

  beforeEach(() => {
    // Return one review from Places and one from DB for pipeline tests
    (fetchReviews as jest.Mock).mockResolvedValue([
      { author_name: 'Alice', rating: 5, text: 'Amazing food!', time: 1700000000, relative_time_description: 'a week ago' },
    ]);
    (runAnalystAgent as jest.Mock).mockResolvedValue({
      reviews: [{ external_id: 'Alice_1700000000', sentiment: 'positive', sentiment_score: 0.9, topics: ['food'] }],
    });
    (runDrafterAgent as jest.Mock).mockResolvedValue('Thank you, Alice!');
  });

  it('calls fetchReviews with the extracted place_id', async () => {
    setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    expect(fetchReviews).toHaveBeenCalledWith(PLACE_ID);
  });

  it('calls saveReviews with restaurantId and fetched reviews', async () => {
    setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    expect(saveReviews).toHaveBeenCalledWith(
      RESTAURANT_ID,
      expect.arrayContaining([expect.objectContaining({ author_name: 'Alice' })])
    );
  });

  it('runs the analyst agent on saved reviews', async () => {
    setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    expect(runAnalystAgent).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'rev-1' })]),
      expect.objectContaining({ name: "Mario's Bistro", city: 'New York' })
    );
  });

  it('runs the drafter agent for each review and saves a draft', async () => {
    setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    expect(runDrafterAgent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rev-1' }),
      expect.objectContaining({ name: "Mario's Bistro", city: 'New York' })
    );
  });

  it('sends each draft as a Telegram message with Approve/Edit/Skip inline buttons', async () => {
    setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    // At least one sendMessage call must include inline_keyboard buttons
    const calls = (bot.api.sendMessage as jest.Mock).mock.calls as unknown[][];
    const draftCall = calls.find((args) => {
      const opts = args[2] as Record<string, unknown> | undefined;
      if (!opts) return false;
      const rm = opts.reply_markup as Record<string, unknown> | undefined;
      return Array.isArray(rm?.inline_keyboard);
    });
    expect(draftCall).toBeDefined();

    const opts = draftCall![2] as { reply_markup: { inline_keyboard: { callback_data: string }[][] } };
    const buttons = opts.reply_markup.inline_keyboard.flat();
    expect(buttons.some((b) => b.callback_data.startsWith('approve:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('edit:'))).toBe(true);
    expect(buttons.some((b) => b.callback_data.startsWith('skip:'))).toBe(true);
  });

  it('transitions state to idle after pipeline completes', async () => {
    const { mockStateUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'idle', restaurant_id: RESTAURANT_ID })
    );
  });

  it('skips pipeline but transitions to idle when no place_id provided', async () => {
    const { mockStateUpsert } = setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
    });

    await POST(makeRequest(makeUpdate('skip'), VALID_SECRET));

    expect(fetchReviews).not.toHaveBeenCalled();
    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'idle' })
    );
  });

  it('calls updateLastCrawledAt after a successful pipeline run', async () => {
    setupSupabaseMocks({
      state: 'onboarding_link',
      context: { name: "Mario's Bistro", city: 'New York' },
      savedReviews: [SAVED_REVIEW],
    });

    await POST(makeRequest(makeUpdate(MAPS_URL), VALID_SECRET));

    expect(updateLastCrawledAt).toHaveBeenCalledWith(RESTAURANT_ID);
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
