import { MODELS, MAX_TOKENS } from './config';

describe('MODELS', () => {
  it('defines HAIKU model ID', () => {
    expect(MODELS.HAIKU).toBe('claude-haiku-4-5-20251001');
  });

  it('defines SONNET model ID', () => {
    expect(MODELS.SONNET).toBe('claude-sonnet-4-6');
  });
});

describe('MAX_TOKENS', () => {
  it('HAIKU budget is 512', () => {
    expect(MAX_TOKENS.HAIKU).toBe(512);
  });

  it('DRAFTER budget is 256', () => {
    expect(MAX_TOKENS.DRAFTER).toBe(256);
  });

  it('SONNET budget is 4096', () => {
    expect(MAX_TOKENS.SONNET).toBe(4096);
  });
});
