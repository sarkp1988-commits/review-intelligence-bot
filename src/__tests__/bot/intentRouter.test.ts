// Bot Engineer Agent — Slice 5 (Issue #6)
// TDD: tests written BEFORE feature code — intentRouter unit tests

import { routeIntent, Intent } from '@/lib/bot/intentRouter';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

const mockCreate = jest.fn();
(Anthropic as jest.Mock).mockImplementation(() => ({
  messages: { create: mockCreate },
}));

function mockHaiku(intent: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: intent }],
  });
}

beforeEach(() => jest.clearAllMocks());

describe('routeIntent', () => {
  test('routes "yes" → approve', async () => {
    mockHaiku('approve');
    expect(await routeIntent('yes')).toBe('approve');
  });

  test('routes "looks good" → approve', async () => {
    mockHaiku('approve');
    expect(await routeIntent('looks good')).toBe('approve');
  });

  test('routes "no" → skip', async () => {
    mockHaiku('skip');
    expect(await routeIntent('no')).toBe('skip');
  });

  test('routes "next" → skip', async () => {
    mockHaiku('skip');
    expect(await routeIntent('next')).toBe('skip');
  });

  test('routes "edit" → edit', async () => {
    mockHaiku('edit');
    expect(await routeIntent('edit')).toBe('edit');
  });

  test('routes "try again" → regenerate', async () => {
    mockHaiku('regenerate');
    expect(await routeIntent('try again')).toBe('regenerate');
  });

  test('routes "help" → help', async () => {
    mockHaiku('help');
    expect(await routeIntent('help')).toBe('help');
  });

  test('unrecognised Haiku output → unknown', async () => {
    mockHaiku('banana');
    expect(await routeIntent('what is this')).toBe('unknown');
  });

  test('empty string Haiku output → unknown', async () => {
    mockHaiku('');
    expect(await routeIntent('???')).toBe('unknown');
  });

  test('Haiku called with correct model', async () => {
    mockHaiku('approve');
    await routeIntent('ok');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
      })
    );
  });
});
