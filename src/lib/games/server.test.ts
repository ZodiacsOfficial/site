import { describe, expect, it, vi } from 'vitest';
import {
  handleGamesApi,
  isAllowedGamesRequest,
  parseJoinSign,
  resolveJoinBucketLimit,
  zeroFilledStandings,
} from './server';
import { SIGN_SLUGS } from '../signs';

const SECRET = 'games-test-secret-0123456789abcdefghijklmn';

const BASE_ENV = {
  NODE_ENV: 'production',
  PUBLIC_ZODIAC_GAMES_ENABLED: '1',
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  ZODIAC_GAMES_SESSION_SECRET: SECRET,
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {},
    headers: {
      origin: 'https://zodiacs.org',
      host: 'zodiacs.org',
      'x-forwarded-for': '203.0.113.9',
    },
    body: undefined,
    ...overrides,
  };
}

function makeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
    end(payload: string) { res.body = JSON.parse(payload); },
    headers,
  };
  return res;
}

function rpcFetcher(result: unknown) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(result),
  })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const AUG_17 = () => new Date(Date.UTC(2026, 7, 17, 12));

describe('handleGamesApi gates', () => {
  it('is disabled without the feature flag', async () => {
    const res = makeRes();
    await handleGamesApi(makeReq(), res, { ...BASE_ENV, PUBLIC_ZODIAC_GAMES_ENABLED: '0' });
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'disabled' });
  });

  it('fails closed without Supabase or session configuration', async () => {
    const res = makeRes();
    await handleGamesApi(makeReq(), res, { ...BASE_ENV, ZODIAC_GAMES_SESSION_SECRET: 'short' });
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error: 'unconfigured',
      missing: {
        hasSupabaseUrl: true,
        hasServiceKey: true,
        hasSecret: true,
        secretLength: 5,
        secretValid: false,
      },
    });
  });

  it('rejects cross-origin writes', async () => {
    const res = makeRes();
    const req = makeReq({
      query: { action: 'join' },
      headers: { origin: 'https://evil.example', host: 'zodiacs.org' },
    });
    await handleGamesApi(req, res, BASE_ENV);
    expect(res.statusCode).toBe(403);
  });

  it('404s unknown actions', async () => {
    const res = makeRes();
    await handleGamesApi(makeReq({ query: { action: 'buy' } }), res, BASE_ENV);
    expect(res.statusCode).toBe(404);
  });
});

describe('standings', () => {
  it('returns the season clock and a zero-filled 12-sign board', async () => {
    const fetcher = rpcFetcher({
      season_id: 'leo-2026',
      standings: [{ sign: 'scorpio', points: 150, joins: 1, checkins: 2 }],
    });
    const res = makeRes();
    await handleGamesApi(
      makeReq({ method: 'GET', query: { action: 'standings' }, headers: {} }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.seasonId).toBe('leo-2026');
    expect(body.seasonName).toBe('Leo');
    expect(body.daysLeft).toBe(6);
    expect(body.isoWeek).toBe(34);
    const standings = body.standings as { sign: string; points: number }[];
    expect(standings).toHaveLength(12);
    expect(standings[0]).toEqual({ sign: 'scorpio', points: 150, joins: 1, checkins: 2 });
    expect(new Set(standings.map((row) => row.sign)).size).toBe(12);
    expect(body.closed).toBe(false);
    expect(res.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(res.headers['cdn-cache-control']).toBe('public, s-maxage=60');
    const [, init] = fetcher.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ season_id: 'leo-2026' });
  });

  it('serves a closed past season as a long-cached immutable archive', async () => {
    const fetcher = rpcFetcher({
      season_id: 'cancer-2026',
      standings: [{ sign: 'pisces', points: 400, joins: 3, checkins: 4 }],
    });
    const res = makeRes();
    await handleGamesApi(
      makeReq({ method: 'GET', query: { action: 'standings', season: 'cancer-2026' }, headers: {} }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.seasonId).toBe('cancer-2026');
    expect(body.closed).toBe(true);
    expect(body.daysLeft).toBe(0);
    expect((body.standings as unknown[]).length).toBe(12);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.headers['cdn-cache-control']).toBe('public, s-maxage=86400');
    const [, init] = fetcher.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ season_id: 'cancer-2026' });
  });

  it('refuses future seasons and malformed season ids', async () => {
    for (const [season, status, error] of [
      ['virgo-2026', 404, 'unknown_season'],
      ['leo-2099', 404, 'unknown_season'],
      ['dragon-2026', 400, 'invalid'],
    ] as const) {
      const res = makeRes();
      await handleGamesApi(
        makeReq({ method: 'GET', query: { action: 'standings', season }, headers: {} }),
        res, BASE_ENV, { fetcher: vi.fn() as unknown as typeof fetch, now: AUG_17 },
      );
      expect(res.statusCode, season).toBe(status);
      expect((res.body as { error?: string }).error, season).toBe(error);
    }
  });
});

describe('join and check-in', () => {
  it('mints a session cookie and relays the join to the RPC', async () => {
    const fetcher = rpcFetcher({ status: 'joined', sign: 'scorpio', season_id: 'leo-2026' });
    const res = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'join' }, body: { sign: 'scorpio' } }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).status).toBe('joined');
    expect(res.headers['set-cookie']).toContain('__Host-zodiacs_games=v1.');
    expect(res.headers['set-cookie']).toContain('HttpOnly; Secure; SameSite=Strict');
    const args = JSON.parse((fetcher.mock.calls[0]![1] as RequestInit).body as string);
    expect(args.sign).toBe('scorpio');
    expect(args.season_id).toBe('leo-2026');
    expect(args.participant_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.bucket_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.bucket_limit).toBe(30);
  });

  it('maps rate_limited joins to 429', async () => {
    const fetcher = rpcFetcher({ status: 'rate_limited' });
    const res = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'join' }, body: { sign: 'aries' } }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBe('86400');
  });

  it('rejects unknown signs before any RPC call', async () => {
    const fetcher = rpcFetcher({});
    const res = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'join' }, body: { sign: 'ophiuchus' } }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('treats a cookie-less check-in as not joined, without any RPC call', async () => {
    const fetcher = rpcFetcher({});
    const res = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'checkin' } }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).status).toBe('not_joined');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps one participant identity from join to check-in', async () => {
    const joinFetcher = rpcFetcher({ status: 'joined', sign: 'virgo', season_id: 'leo-2026' });
    const joinRes = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'join' }, body: { sign: 'virgo' } }),
      joinRes, BASE_ENV, { fetcher: joinFetcher, now: AUG_17 },
    );
    const cookie = joinRes.headers['set-cookie']!.split(';')[0]!;
    const joinArgs = JSON.parse((joinFetcher.mock.calls[0]![1] as RequestInit).body as string);

    const checkinFetcher = rpcFetcher({ status: 'checked_in', sign: 'virgo' });
    const checkinRes = makeRes();
    await handleGamesApi(
      makeReq({
        query: { action: 'checkin' },
        headers: {
          origin: 'https://zodiacs.org',
          host: 'zodiacs.org',
          cookie,
        },
      }),
      checkinRes, BASE_ENV, { fetcher: checkinFetcher, now: AUG_17 },
    );
    expect(checkinRes.statusCode).toBe(200);
    const body = checkinRes.body as Record<string, unknown>;
    expect(body.status).toBe('checked_in');
    expect(body.isoWeek).toBe(34);
    const checkinArgs = JSON.parse(
      (checkinFetcher.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(checkinArgs.participant_hash).toBe(joinArgs.participant_hash);
    expect(checkinArgs.iso_year).toBe(2026);
    expect(checkinArgs.iso_week).toBe(34);
  });

  it('answers 502 when PostgREST fails, never a fabricated result', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false, status: 500, text: async () => 'boom',
    })) as unknown as typeof fetch;
    const res = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'join' }, body: { sign: 'leo' } }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'unavailable', upstream: 'PostgREST zodiac_games_join_v1 500' });
  });

  it('collapses non-PostgREST upstream failures to a fixed token', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('fetch failed: https://example.supabase.co');
    }) as unknown as typeof fetch;
    const res = makeRes();
    await handleGamesApi(
      makeReq({ query: { action: 'join' }, body: { sign: 'leo' } }),
      res, BASE_ENV, { fetcher, now: AUG_17 },
    );
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'unavailable', upstream: 'fetch_failed' });
  });
});

describe('helpers', () => {
  it('parseJoinSign accepts only the 12 slugs inside the body cap', () => {
    expect(parseJoinSign({ sign: 'aries' })).toBe('aries');
    expect(parseJoinSign(JSON.stringify({ sign: 'pisces' }))).toBe('pisces');
    expect(parseJoinSign({ sign: 'Aries' })).toBeNull();
    expect(parseJoinSign({ sign: 'x'.repeat(300) })).toBeNull();
    expect(parseJoinSign('not json')).toBeNull();
    expect(parseJoinSign(undefined)).toBeNull();
  });

  it('resolveJoinBucketLimit bounds the env override', () => {
    expect(resolveJoinBucketLimit({})).toBe(30);
    expect(resolveJoinBucketLimit({ ZODIAC_GAMES_JOIN_BUCKET_LIMIT: '5' })).toBe(5);
    expect(resolveJoinBucketLimit({ ZODIAC_GAMES_JOIN_BUCKET_LIMIT: '0' })).toBe(30);
    expect(resolveJoinBucketLimit({ ZODIAC_GAMES_JOIN_BUCKET_LIMIT: '999999' })).toBe(30);
  });

  it('zeroFilledStandings covers all 12 signs in points-then-zodiac order', () => {
    const rows = zeroFilledStandings([
      { sign: 'leo', points: 50, joins: 1, checkins: 0 },
      { sign: 'not-a-sign', points: 999, joins: 0, checkins: 0 },
    ]);
    expect(rows).toHaveLength(12);
    expect(rows[0]!.sign).toBe('leo');
    expect(rows.slice(1).map((row) => row.sign)).toEqual(
      SIGN_SLUGS.filter((slug) => slug !== 'leo'),
    );
    expect(rows.every((row) => row.points >= 0)).toBe(true);
  });

  it('isAllowedGamesRequest requires a matching first-party host', () => {
    const env = { NODE_ENV: 'production' };
    const request = (origin: string, host: string) => ({
      method: 'POST', headers: { origin, host }, query: {},
    });
    expect(isAllowedGamesRequest(request('https://zodiacs.org', 'zodiacs.org'), env)).toBe(true);
    expect(isAllowedGamesRequest(request('https://evil.example', 'zodiacs.org'), env)).toBe(false);
    expect(isAllowedGamesRequest(request('https://zodiacs.org', 'evil.example'), env)).toBe(false);
    expect(isAllowedGamesRequest({ method: 'POST', headers: {}, query: {} }, env)).toBe(false);
  });
});
