// Bot Engineer Agent — Slice 5 (Issue #6)
// TDD: intentRouter unit tests

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

import { routeIntent } from '@/lib/bot/intentRouter';

function mockHaiku(intent: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: intent }],
  });
}

beforeEach(() => jest.clearAllMocks());

describe('routeIntent', () => {
  test('routes "yes" to approve', async () => {
    mockHaiku('approve');
    expect(await routeIntent('yes')).toBe('approve');
  });

  test('routes "looks good" to approve', async () => {
    mockHaiku('approve');
    expect(await routeIntent('looks good')).toBe('approve');
  });

  test('routes "no" to skip', async () => {
    mockHaiku('skip');
    expect(await routeIntent('no')).toBe('skip');
  });

  test('routes "next" to skip', async () => {
    mockHaiku('skip');
    expect(await routeIntent('next')).toBe('skip');
  });

  test('routes "edit" to edit', async () => {
    mockHaiku('edit');
    expect(await routeIntent('edit')).toBe('edit');
  });

  test('routes "try again" to regenerate', async () => {
    mockHaiku('regenerate');
    expect(await routeIntent('try again')).toBe('regenerate');
  });

  test('routes "help" to help', async () => {
    mockHaiku('help');
    expect(await routeIntent('help')).toBe('help');
  });

  test('unrecognised Haiku output returns unknown', async () => {
    mockHaiku('banana');
    expect(await routeIntent('what is this')).toBe('unknown');
  });

  test('empty Haiku output returns unknown', async () => {
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
