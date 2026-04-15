import { GET } from './route';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.version).toBe('string');
  });

  it('timestamp is a valid ISO 8601 date', async () => {
    const response = await GET();
    const body = await response.json();
    const parsed = new Date(body.timestamp);

    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});
