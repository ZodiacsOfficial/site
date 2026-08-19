/**
 * Zodiac Games API handler — the single server path between the Race page
 * and the Games tables. All persistence goes through the SECURITY DEFINER
 * RPCs of supabase/migrations/20260817080000_zodiac_games.sql; this module
 * only authenticates the origin, resolves the anonymous principal, and
 * relays. Points come from free participation only — there is deliberately
 * no input here that could carry a purchase, balance, or wallet.
 */
import { SIGN_SLUGS } from '../signs.js';
import {
  SEASON_ID_PATTERN,
  daysLeftInSeason,
  isoWeekUtc,
  seasonInstanceAt,
  seasonInstanceForId,
} from './season.js';
import { gamesAnonymousPrincipal, validGamesSecret } from './security.js';

const MAX_BODY_BYTES = 256;
const MAX_RESPONSE_BYTES = 64 * 1024;
const DEFAULT_JOIN_BUCKET_LIMIT = 30;

export interface GamesEnv {
  [key: string]: string | undefined;
}

export interface GamesDependencies {
  fetcher?: typeof fetch;
  now?: () => Date;
  random?: (bytes: number) => Buffer;
}

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function requestHeader(req: any, name: string): string {
  if (typeof req.get === 'function') {
    const value = req.get(name);
    if (typeof value === 'string') return value;
  }
  return firstHeader(req.headers?.[name.toLowerCase()]);
}

function hostname(value: string): string {
  const first = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) return '';
  try {
    return new URL(first.includes('://') ? first : `https://${first}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Allow only the production site or the Vercel preview serving this request. */
export function isAllowedGamesRequest(req: any, env: GamesEnv): boolean {
  const source = requestHeader(req, 'origin') || requestHeader(req, 'referer');
  if (!source) return false;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return false;
  }
  const production = env.NODE_ENV === 'production';
  if (sourceUrl.protocol !== 'https:' && production) return false;

  const sourceHost = sourceUrl.hostname.toLowerCase();
  const requestHost = hostname(requestHeader(req, 'x-forwarded-host') || requestHeader(req, 'host'));
  if (!requestHost || sourceHost !== requestHost) return false;
  return sourceHost === 'zodiacs.org'
    || sourceHost === 'www.zodiacs.org'
    || sourceHost.endsWith('.vercel.app')
    || (!production && (sourceHost === 'localhost' || sourceHost === '127.0.0.1'));
}

function parseBody(input: unknown): Record<string, unknown> | null {
  let candidate = input;
  if (typeof candidate === 'string') {
    if (Buffer.byteLength(candidate, 'utf8') > MAX_BODY_BYTES) return null;
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  } else if (candidate && typeof candidate === 'object') {
    if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > MAX_BODY_BYTES) return null;
  }
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as Record<string, unknown>
    : null;
}

export function parseJoinSign(input: unknown): string | null {
  const body = parseBody(input);
  const sign = body?.sign;
  return typeof sign === 'string' && SIGN_SLUGS.includes(sign) ? sign : null;
}

export function resolveJoinBucketLimit(env: GamesEnv): number {
  const raw = env.ZODIAC_GAMES_JOIN_BUCKET_LIMIT?.trim();
  if (!raw) return DEFAULT_JOIN_BUCKET_LIMIT;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 10_000
    ? value
    : DEFAULT_JOIN_BUCKET_LIMIT;
}

export interface StandingRow {
  sign: string;
  points: number;
  joins: number;
  checkins: number;
}

/**
 * Every sign appears on the board from day one: signs with no rows yet are
 * zero-filled, ordered by points then zodiac order.
 */
export function zeroFilledStandings(rows: unknown): StandingRow[] {
  const bySign = new Map<string, StandingRow>();
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const { sign, points, joins, checkins } = row as Record<string, unknown>;
      if (typeof sign !== 'string' || !SIGN_SLUGS.includes(sign)) continue;
      bySign.set(sign, {
        sign,
        points: typeof points === 'number' ? points : 0,
        joins: typeof joins === 'number' ? joins : 0,
        checkins: typeof checkins === 'number' ? checkins : 0,
      });
    }
  }
  return SIGN_SLUGS
    .map((sign) => bySign.get(sign) ?? { sign, points: 0, joins: 0, checkins: 0 })
    .sort((a, b) => b.points - a.points
      || SIGN_SLUGS.indexOf(a.sign) - SIGN_SLUGS.indexOf(b.sign));
}

function sendJson(
  res: any,
  status: number,
  body: Record<string, unknown>,
  cache: 'none' | 'board' | 'archive' = 'none',
): void {
  res.statusCode = status;
  if (cache === 'board') {
    // Browsers must always revalidate — a stale board is a wrong scoreboard.
    // Only the shared edge cache may briefly reuse a response.
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=60');
  } else if (cache === 'archive') {
    // A closed season can never change — nothing writes to a past season id.
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function callGamesRpc(
  env: GamesEnv,
  fetcher: typeof fetch,
  fn: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const base = env.PUBLIC_SUPABASE_URL!.replace(/\/+$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers: Record<string, string> = {
    apikey: serviceKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  // New-style secret keys authenticate through `apikey` alone.
  if (!serviceKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  const response = await fetcher(`${base}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`PostgREST ${fn} ${response.status}`);
  if (Buffer.byteLength(raw, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error(`PostgREST ${fn} oversized response`);
  }
  return JSON.parse(raw);
}

function gamesAction(req: any): string {
  const raw = typeof req.query?.action === 'string'
    ? req.query.action
    : Array.isArray(req.query?.action) ? req.query.action[0] : '';
  return typeof raw === 'string' ? raw : '';
}

export async function handleGamesApi(
  req: any,
  res: any,
  env: GamesEnv = process.env,
  deps: GamesDependencies = {},
): Promise<void> {
  const fetcher = deps.fetcher ?? fetch;
  const now = deps.now ?? (() => new Date());
  const action = gamesAction(req);

  if (env.PUBLIC_ZODIAC_GAMES_ENABLED !== '1') {
    sendJson(res, 503, { error: 'disabled' });
    return;
  }
  if (!env.PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY
    || !validGamesSecret(env.ZODIAC_GAMES_SESSION_SECRET)) {
    // Fail-closed diagnostics for operators: shape booleans only, never a
    // value. `secretLength` counts the raw var so a padded paste is visible.
    // The shape rides in the response too — this branch only executes while
    // the feature is down, so nothing live is ever described.
    const secret = env.ZODIAC_GAMES_SESSION_SECRET;
    const shape = {
      hasSupabaseUrl: Boolean(env.PUBLIC_SUPABASE_URL),
      hasServiceKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      hasSecret: typeof secret === 'string' && secret.length > 0,
      secretLength: typeof secret === 'string' ? secret.length : 0,
      secretValid: validGamesSecret(secret),
    };
    console.error('[games] unconfigured', JSON.stringify(shape));
    sendJson(res, 503, { error: 'unconfigured', missing: shape });
    return;
  }

  try {
    if (action === 'standings') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'method' });
        return;
      }
      const instant = now();
      const current = seasonInstanceAt(instant);
      // An optional past-season id serves the immutable archive (the season
      // close and the Trophy Hall). Future seasons have no board to serve.
      const requestedRaw = typeof req.query?.season === 'string' ? req.query.season : '';
      let season = current;
      if (requestedRaw && requestedRaw !== current.id) {
        if (!SEASON_ID_PATTERN.test(requestedRaw)) {
          sendJson(res, 400, { error: 'invalid' });
          return;
        }
        const requested = seasonInstanceForId(requestedRaw);
        if (requested.endUtcExclusive > instant) {
          sendJson(res, 404, { error: 'unknown_season' });
          return;
        }
        season = requested;
      }
      const closed = season.endUtcExclusive <= instant;
      const week = isoWeekUtc(instant);
      const result = await callGamesRpc(env, fetcher, 'zodiac_games_standings_v1', {
        season_id: season.id,
      }) as { standings?: unknown };
      sendJson(res, 200, {
        seasonId: season.id,
        seasonSign: season.sign.slug,
        seasonName: season.sign.name,
        seasonEndsAt: season.endUtcExclusive,
        daysLeft: closed ? 0 : daysLeftInSeason(season, instant),
        closed,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        standings: zeroFilledStandings(result?.standings),
      }, closed ? 'archive' : 'board');
      return;
    }

    if (action !== 'join' && action !== 'checkin') {
      sendJson(res, 404, { error: 'unknown_action' });
      return;
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { error: 'method' });
      return;
    }
    if (!isAllowedGamesRequest(req, env)) {
      sendJson(res, 403, { error: 'forbidden' });
      return;
    }

    const instant = now();
    const season = seasonInstanceAt(instant);

    if (action === 'join') {
      const sign = parseJoinSign(req.body);
      if (!sign) {
        sendJson(res, 400, { error: 'invalid' });
        return;
      }
      const principal = gamesAnonymousPrincipal(
        req, env.ZODIAC_GAMES_SESSION_SECRET, true, deps.random,
      );
      if (!principal) {
        sendJson(res, 503, { error: 'unconfigured' });
        return;
      }
      const result = await callGamesRpc(env, fetcher, 'zodiac_games_join_v1', {
        participant_hash: principal.participantHash,
        bucket_hash: principal.bucketHash,
        sign,
        season_id: season.id,
        bucket_limit: resolveJoinBucketLimit(env),
      }) as Record<string, unknown>;
      if (principal.setCookie) res.setHeader('Set-Cookie', principal.setCookie);
      const status = result?.status;
      if (status === 'rate_limited') {
        res.setHeader('Retry-After', '86400');
        sendJson(res, 429, { status: 'rate_limited' });
        return;
      }
      sendJson(res, 200, {
        status,
        sign: result?.sign,
        seasonId: result?.season_id,
        joinedAt: result?.joined_at,
      });
      return;
    }

    const principal = gamesAnonymousPrincipal(
      req, env.ZODIAC_GAMES_SESSION_SECRET, false, deps.random,
    );
    if (!principal) {
      sendJson(res, 200, { status: 'not_joined' });
      return;
    }
    const week = isoWeekUtc(instant);
    const result = await callGamesRpc(env, fetcher, 'zodiac_games_checkin_v1', {
      participant_hash: principal.participantHash,
      season_id: season.id,
      iso_year: week.isoYear,
      iso_week: week.isoWeek,
    }) as Record<string, unknown>;
    sendJson(res, 200, {
      status: result?.status,
      sign: result?.sign,
      seasonId: season.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
    });
  } catch (error) {
    // Operator diagnostics only: the thrown messages carry the RPC name and
    // HTTP status (or a fetch failure naming the public Supabase host) —
    // never a key or a row.
    const message = error instanceof Error ? error.message : String(error);
    console.error('[games] upstream', message);
    // The response echoes the failure only when it is one of our own thrown
    // shapes (an RPC name from the public migration plus a status code);
    // anything else collapses to a fixed token so no runtime detail leaks.
    const upstream = /^PostgREST [a-z0-9_]+ \d{3}$/u.test(message) ? message : 'fetch_failed';
    sendJson(res, 502, { error: 'unavailable', upstream });
  }
}
