import { describe, expect, it, vi } from 'vitest';
import {
  handleGamesApi,
  isAllowedGamesRequest,
  parseCheckinAnswer,
  parseJoinSign,
  resolveJoinBucketLimit,
  zeroFilledAnswerCounts,
  zeroFilledStandings,
  zeroFilledTeamAnswerCounts,
} from './server';
import { SIGN_SLUGS } from '../lib/signs';
import { gamesQuestionForWeek } from './questions';

const BASE_ENV = {
  NODE_ENV: 'production',
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
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
const QUESTION = gamesQuestionForWeek(2026, 34);

describe('handleGamesApi gates', () => {
  it('fails closed without the existing server-side Supabase configuration', async () => {
    const res = makeRes();
    await handleGamesApi(makeReq(), res, { NODE_ENV: 'production' });
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'unconfigured' });
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
      responses: [{ sign: 'scorpio', answer_key: QUESTION.choices[0]!.key, count: 4 }],
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
    const question = body.question as Record<string, unknown>;
    expect(question.id).toBe(QUESTION.id);
    expect(question.prompt).toBe(QUESTION.prompt);
    expect(question.choices).toEqual(QUESTION.choices);
    expect(question.responses).toEqual([
        { key: QUESTION.choices[0]!.key, count: 4 },
        { key: QUESTION.choices[1]!.key, count: 0 },
        { key: QUESTION.choices[2]!.key, count: 0 },
      ]);
    const teams = question.teams as { sign: string; responses: { key: string; count: number }[] }[];
    expect(teams).toHaveLength(12);
    expect(teams.find((team) => team.sign === 'scorpio')?.responses[0]?.count).toBe(4);
    expect(res.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(res.headers['cdn-cache-control']).toBe('public, s-maxage=60');
    const [, init] = fetcher.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      season_id: 'leo-2026',
      iso_year: 2026,
      iso_week: 34,
      question_id: QUESTION.id,
    });
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
    expect(args.bucket_limit).toBe(5);
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

    const answer = QUESTION.choices[0]!.key;
    const checkinFetcher = rpcFetcher({
      status: 'checked_in', sign: 'virgo', season_id: 'leo-2026', answer_key: answer,
    });
    const checkinRes = makeRes();
    await handleGamesApi(
      makeReq({
        query: { action: 'checkin' },
        headers: {
          origin: 'https://zodiacs.org',
          host: 'zodiacs.org',
          cookie,
        },
        body: { answer },
      }),
      checkinRes, BASE_ENV, { fetcher: checkinFetcher, now: AUG_17 },
    );
    expect(checkinRes.statusCode).toBe(200);
    const body = checkinRes.body as Record<string, unknown>;
    expect(body.status).toBe('checked_in');
    expect(body.isoWeek).toBe(34);
    expect(body.seasonId).toBe('leo-2026');
    const checkinArgs = JSON.parse(
      (checkinFetcher.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(checkinArgs.participant_hash).toBe(joinArgs.participant_hash);
    expect(checkinArgs.iso_year).toBe(2026);
    expect(checkinArgs.iso_week).toBe(34);
    expect(checkinArgs.question_id).toBe(QUESTION.id);
    expect(checkinArgs.answer_key).toBe(answer);
    expect(body.answer).toBe(answer);
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
    expect(res.body).toEqual({ error: 'unavailable' });
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

  it('parseCheckinAnswer rejects free text and answers from another question', () => {
    expect(parseCheckinAnswer({ answer: QUESTION.choices[0]!.key }, QUESTION))
      .toBe(QUESTION.choices[0]!.key);
    expect(parseCheckinAnswer({ answer: 'my own answer' }, QUESTION)).toBeNull();
    expect(parseCheckinAnswer({}, QUESTION)).toBeNull();
  });

  it('resolveJoinBucketLimit bounds the env override', () => {
    expect(resolveJoinBucketLimit({})).toBe(5);
    expect(resolveJoinBucketLimit({ ZODIAC_GAMES_JOIN_BUCKET_LIMIT: '3' })).toBe(3);
    expect(resolveJoinBucketLimit({ ZODIAC_GAMES_JOIN_BUCKET_LIMIT: '0' })).toBe(5);
    expect(resolveJoinBucketLimit({ ZODIAC_GAMES_JOIN_BUCKET_LIMIT: '999999' })).toBe(5);
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

  it('zeroFilledAnswerCounts preserves choices and ignores unreviewed keys', () => {
    expect(zeroFilledAnswerCounts([
      { sign: 'scorpio', answer_key: QUESTION.choices[1]!.key, count: 3 },
      { sign: 'scorpio', answer_key: 'write-in', count: 900 },
    ], QUESTION)).toEqual([
      { key: QUESTION.choices[0]!.key, count: 0 },
      { key: QUESTION.choices[1]!.key, count: 3 },
      { key: QUESTION.choices[2]!.key, count: 0 },
    ]);
    const teams = zeroFilledTeamAnswerCounts([
      { sign: 'scorpio', answer_key: QUESTION.choices[1]!.key, count: 3 },
      { sign: 'leo', answer_key: QUESTION.choices[0]!.key, count: 2 },
    ], QUESTION);
    expect(teams).toHaveLength(12);
    expect(teams.find((team) => team.sign === 'scorpio')?.responses[1]?.count).toBe(3);
    expect(teams.find((team) => team.sign === 'leo')?.responses[0]?.count).toBe(2);
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
