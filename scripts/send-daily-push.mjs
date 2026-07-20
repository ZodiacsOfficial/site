import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import webPush from 'web-push';

const EVENTS_PATH = new URL('../src/data/events-publication.json', import.meta.url);
const EVENTS_SCHEMA = 'zodiacs.events-publication.v1';
const LIVE_EVENT_ORIGIN = 'https://zodiacs.org';
const DAY_MS = 86_400_000;
const EVENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,159}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ALERT_TITLE_MAX = 120;
const ALERT_BODY_MAX = 320;
const EVENT_PATH_MAX = 512;
const EVENT_PATH_PREFIXES = Object.freeze([
  '/eclipses/',
  '/events/',
  '/full-moon/',
  '/mars-retrograde/',
  '/mercury-retrograde/',
  '/new-moon/',
  '/retrogrades/',
  '/venus-retrograde/',
]);

// Fable's final collision/copy addendum can replace this isolated policy
// without touching delivery or consent. Until then, eclipse is the explicit
// paired-lunation winner and every other tie is deterministic.
const EVENT_PRIORITY = Object.freeze({
  eclipse: 0,
  station: 1,
  lunation: 2,
  aspect: 3,
  ingress: 4,
});

function utcDay(value) {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
}

function utcTime(value) {
  return new Date(value).toISOString().slice(11, 16);
}

function titleCase(value) {
  return String(value ?? '').replace(/(^|[-\s])\p{L}/gu, (match) => match.toUpperCase());
}

function sentence(value) {
  const normalized = String(value ?? '').trim();
  return /[.!?]$/u.test(normalized) ? normalized : `${normalized}.`;
}

function withoutPeriod(value) {
  return String(value ?? '').trim().replace(/\.$/u, '');
}

function eventRank(event) {
  return EVENT_PRIORITY[event.family] ?? Number.MAX_SAFE_INTEGER;
}

function supportedSubtype(event) {
  if (event.family === 'lunation') return event.subtype === 'full' || event.subtype === 'new';
  if (event.family === 'eclipse') return event.subtype === 'solar' || event.subtype === 'lunar';
  if (event.family === 'station') return event.subtype === 'direct' || event.subtype === 'retrograde';
  if (event.family === 'ingress') return event.subtype === 'ingress';
  return event.family === 'aspect' && event.subtype.length > 0 && event.subtype.length <= 40;
}

function validEvent(event) {
  const safePath = typeof event?.path === 'string'
    && event.path.length <= EVENT_PATH_MAX
    && event.path.startsWith('/')
    && !event.path.startsWith('//')
    && !event.path.includes('?')
    && !/[\\\u0000-\u001f\u007f]/u.test(event.path)
    && EVENT_PATH_PREFIXES.some((prefix) => event.path.startsWith(prefix));
  let exactLocalPath = false;
  if (safePath) {
    try {
      const parsed = new URL(event.path, 'https://zodiacs.org');
      exactLocalPath = parsed.origin === 'https://zodiacs.org'
        && `${parsed.pathname}${parsed.hash}` === event.path
        && /^\/[a-z0-9/-]+\/$/iu.test(parsed.pathname)
        && (!parsed.hash || /^#[a-z0-9-]+$/iu.test(parsed.hash));
    } catch {
      exactLocalPath = false;
    }
  }
  return Boolean(
    event
    && typeof event.id === 'string'
    && EVENT_ID_PATTERN.test(event.id)
    && typeof event.title === 'string'
    && event.title.trim().length > 0
    && event.title.length <= 240
    && !/[\u0000-\u001f\u007f]/u.test(event.title)
    && typeof event.anchor === 'string'
    && Number.isFinite(Date.parse(event.anchor))
    && exactLocalPath
    && typeof event.family === 'string'
    && Object.hasOwn(EVENT_PRIORITY, event.family)
    && typeof event.subtype === 'string'
    && supportedSubtype(event)
    && Array.isArray(event.bodies)
    && Array.isArray(event.signs)
    && typeof event.summary === 'string'
    && event.summary.trim().length > 0
    && event.summary.length <= 1_000
    && !/[\u0000-\u001f\u007f]/u.test(event.summary),
  );
}

function checkedAlert(alert) {
  const title = typeof alert?.title === 'string' ? alert.title.trim() : '';
  const body = typeof alert?.body === 'string' ? alert.body.trim() : '';
  if (!title
    || title.length > ALERT_TITLE_MAX
    || !body
    || body.length > ALERT_BODY_MAX
    || /[\u0000-\u001f\u007f]/u.test(title)
    || /[\u0000-\u001f\u007f]/u.test(body)) {
    throw new Error('Published event produced an invalid Sky Alert payload.');
  }
  return { title, body, url: alert.url };
}

/** Select exactly one published event on the run's UTC day; never look ahead. */
export function selectEventForDay(publication, date = new Date()) {
  if (publication?.schema !== EVENTS_SCHEMA
    || publication.locale !== 'en'
    || !Array.isArray(publication.timeline)) {
    throw new Error('Push delivery requires the verified events publication schema.');
  }
  const day = utcDay(date);
  if (!day) throw new Error('Push delivery date is invalid.');

  const candidates = publication.timeline
    .filter(validEvent)
    .filter((event) => utcDay(event.anchor) === day);
  const hasEclipse = candidates.some((event) => event.family === 'eclipse');
  return candidates
    .filter((event) => !hasEclipse || event.family !== 'lunation')
    .sort((left, right) => (
      eventRank(left) - eventRank(right)
      || left.anchor.localeCompare(right.anchor)
      || left.id.localeCompare(right.id)
    ))[0] ?? null;
}

/**
 * English-only, source-backed payload policy. These are the approved Fable
 * slots where the receipt exposes them; unsupported families fall back to the
 * committed publication sentence, never to a generic daily notification.
 */
export function buildEventAlert(event) {
  if (!validEvent(event)) throw new Error('Cannot build a push alert from an invalid event.');
  const time = utcTime(event.anchor);
  const sign = titleCase(event.signs[0]);
  const planet = event.bodies[0] ?? '';

  if (event.family === 'lunation' && event.subtype === 'full') {
    const namedMoon = event.summary.match(/^(The [^—]+?)\s+—/u)?.[1] ?? 'The full Moon';
    return checkedAlert({
      title: 'Full moon tonight',
      body: `${namedMoon} peaks${sign ? ` in ${sign}` : ''} at ${time} UTC. Where it lands for you:`,
      url: event.path,
    });
  }
  if (event.family === 'lunation' && event.subtype === 'new') {
    return checkedAlert({
      title: 'New moon today',
      body: `Sun and Moon meet${sign ? ` in ${sign}` : ''} — the month’s reset point.`,
      url: event.path,
    });
  }
  if (event.family === 'eclipse') {
    const label = event.title.split(/\s+—/u)[0]?.replace(/\s+in\s+.+$/u, '').trim() || 'Eclipse';
    return checkedAlert({
      title: `${label} today`,
      body: event.id === 'eclipse-2026-08-12'
        ? 'The Moon covers the Sun at 20° Leo, 17:45 UTC — the year’s most emphatic new moon.'
        : `${withoutPeriod(event.summary)} at ${time} UTC.`,
      url: event.path,
    });
  }
  if (event.family === 'station') {
    const direction = event.subtype === 'direct' ? 'direct' : 'retrograde';
    return checkedAlert({
      title: `${planet || 'A planet'} turns ${direction} today`,
      body: planet === 'Mercury' && direction === 'direct'
        ? `The review window closes at ${time} UTC. Stalled plans start moving.`
        : `${withoutPeriod(event.summary)} at ${time} UTC.`,
      url: event.path,
    });
  }
  if (event.family === 'aspect') {
    if (event.id === 'uranus-trine-pluto-2026-07-18') {
      return checkedAlert({
        title: 'A rare exact alignment today',
        body: 'Uranus and Pluto reach an exact trine — years in the making.',
        url: event.path,
      });
    }
    return checkedAlert({
      title: event.title.split(/\s+—/u)[0],
      body: sentence(event.summary),
      url: event.path,
    });
  }
  return checkedAlert({
    title: event.title.split(/\s+—/u)[0],
    body: sentence(event.summary),
    url: event.path,
  });
}

function quotedAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'iu'));
  return match?.[2] ?? null;
}

/** Fail closed unless the selected event is already live at its exact canonical. */
export async function verifyEventLive(
  event,
  fetchImpl = fetch,
  origin = LIVE_EVENT_ORIGIN,
) {
  if (!validEvent(event)) throw new Error('Cannot verify an invalid Sky Alert event.');
  const expected = new URL(event.path, origin);
  expected.hash = '';
  if (expected.origin !== origin) throw new Error('Sky Alert live origin is invalid.');

  const response = await fetchImpl(expected.href, {
    headers: { Accept: 'text/html' },
    redirect: 'manual',
  });
  if (!response.ok) {
    throw new Error(`Sky Alert destination is not live (${response.status}).`);
  }
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (!/^text\/html(?:;|$)/iu.test(contentType)) {
    throw new Error('Sky Alert destination did not return HTML.');
  }
  const html = await response.text();
  const canonicals = (html.match(/<link\b[^>]*>/giu) ?? [])
    .filter((tag) => (quotedAttribute(tag, 'rel') ?? '')
      .toLowerCase().split(/\s+/u).includes('canonical'))
    .map((tag) => quotedAttribute(tag, 'href'));
  if (canonicals.length !== 1 || canonicals[0] !== expected.href) {
    throw new Error(`Sky Alert destination canonical is not ${expected.href}.`);
  }
  return expected.href;
}

function serviceHeaders(serviceKey, prefer) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

async function responseDetail(response) {
  return String(await response.text().catch(() => '')).slice(0, 300);
}

export function parseSubscriptionIdAllowlist(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  const ids = value.split(',').map((part) => part.trim());
  if (ids.length > 50
    || ids.some((part) => !/^[1-9][0-9]*$/u.test(part)
      || !Number.isSafeInteger(Number(part)))) {
    throw new Error('PUSH_TEST_SUBSCRIPTION_IDS must contain 1 to 50 positive integer ids.');
  }
  return [...new Set(ids.map(Number))];
}

export function authorizeRealDelivery(env = process.env) {
  const subscriptionIds = parseSubscriptionIdAllowlist(env.PUSH_TEST_SUBSCRIPTION_IDS);
  if (env.PUSH_ENABLED !== 'true' && subscriptionIds.length === 0) {
    throw new Error('Real push requires PUSH_ENABLED=true or an explicit test subscription allowlist.');
  }
  return subscriptionIds;
}

export async function readSubscriptions(
  fetchImpl,
  url,
  serviceKey,
  limit,
  subscriptionIds = [],
) {
  const filter = subscriptionIds.length > 0
    ? `&subscription_id=in.(${subscriptionIds.join(',')})`
    : '';
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/push_subscriptions?select=subscription_id,endpoint,p256dh,auth,lang&order=created_at.asc&limit=${limit}${filter}`;
  const response = await fetchImpl(endpoint, { headers: serviceHeaders(serviceKey, 'return=representation') });
  if (!response.ok) throw new Error(`Could not read push subscriptions (${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Push subscription response was not an array.');
  return rows;
}

function emptyReport(event = null) {
  return {
    event: event?.id ?? null,
    considered: 0,
    reserved: 0,
    capped: 0,
    duplicate: 0,
    missing: 0,
    sent: 0,
    pruned: 0,
    failed: 0,
    dryRun: 0,
  };
}

function deliveryTtlSeconds(now) {
  const dayStart = Date.parse(`${utcDay(now)}T00:00:00.000Z`);
  return Math.max(0, Math.floor((dayStart + DAY_MS - now.getTime()) / 1_000));
}

/**
 * Deliver one event alert to a bounded subscription batch. The claim store is
 * the only authority for duplicate and rolling-cap decisions and is always
 * consulted before Web Push. Dry runs are render-only and never call it.
 */
export async function sendDailyPush({
  subscriptions,
  publication,
  date,
  now = new Date(),
  dryRun = false,
  claims,
  sendNotification,
  log = console.log,
}) {
  const event = selectEventForDay(publication, date);
  const report = emptyReport(event);
  if (!event) return report;
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('Push delivery clock is invalid.');
  }

  const alert = buildEventAlert(event);
  const payload = JSON.stringify(alert);
  for (const row of subscriptions) {
    report.considered += 1;
    if (dryRun) {
      report.dryRun += 1;
      log(`sky-alert: dry-run en event=${event.id} ${payload}`);
      continue;
    }

    let claim;
    try {
      claim = await claims.claim(row.subscription_id, event.id);
    } catch (error) {
      report.failed += 1;
      log(`sky-alert: claim failed ${error instanceof Error ? error.message : 'unknown'}`);
      continue;
    }
    if (claim.outcome !== 'reserved') {
      if (claim.outcome === 'capped_24h' || claim.outcome === 'capped_7d') report.capped += 1;
      else if (claim.outcome === 'duplicate') report.duplicate += 1;
      else report.missing += 1;
      continue;
    }
    report.reserved += 1;

    let response;
    let acceptedStatus;
    try {
      response = await sendNotification({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }, payload, { TTL: deliveryTtlSeconds(now), urgency: 'normal' });
      const resolvedStatus = Number(response?.statusCode ?? response?.status);
      if (!Number.isInteger(resolvedStatus) || resolvedStatus < 200 || resolvedStatus > 299) {
        throw Object.assign(new Error(`Web Push returned ${resolvedStatus || 'an invalid status'}.`), {
          statusCode: Number.isInteger(resolvedStatus) ? resolvedStatus : undefined,
        });
      }
      acceptedStatus = resolvedStatus;
    } catch (error) {
      const status = Number(error?.statusCode ?? error?.status);
      const expired = status === 404 || status === 410;
      let receiptFailed = false;
      try {
        const completion = await claims.complete(
          row.subscription_id,
          event.id,
          claim.claimToken,
          expired ? 'expired' : 'failed',
          Number.isFinite(status) && status > 0 ? status : null,
        );
        if (expired && completion.outcome === 'expired') report.pruned += 1;
      } catch (completionError) {
        receiptFailed = true;
        log(`sky-alert: receipt failed ${completionError instanceof Error ? completionError.message : 'unknown'}`);
      }
      if (!expired || receiptFailed) report.failed += 1;
      if (!expired) log(`sky-alert: delivery failed ${status || 'unknown'}`);
      continue;
    }

    try {
      await claims.complete(
        row.subscription_id,
        event.id,
        claim.claimToken,
        'sent',
        acceptedStatus,
      );
      report.sent += 1;
    } catch (completionError) {
      // The provider may already have accepted the alert. Leave the durable
      // reservation in place so a retry cannot break the promised caps.
      report.failed += 1;
      log(`sky-alert: receipt failed ${completionError instanceof Error ? completionError.message : 'unknown'}`);
    }
  }
  return report;
}

export function parseOptions(argv) {
  const options = {
    dryRun: false,
    fixture: false,
    verifyLiveOnly: false,
    limit: 500,
    date: new Date(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--fixture') options.fixture = true;
    else if (arg === '--verify-live-only') options.verifyLiveOnly = true;
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else if (arg === '--date') {
      const raw = argv[++index];
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw ?? '')) throw new Error('--date must be YYYY-MM-DD.');
      options.date = new Date(`${raw}T12:00:00.000Z`);
      if (utcDay(options.date) !== raw) throw new Error('--date must be a real UTC calendar date.');
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 10_000) {
    throw new Error('--limit must be an integer from 1 to 10000.');
  }
  if (Number.isNaN(options.date.getTime())) throw new Error('--date must be YYYY-MM-DD.');
  if (options.fixture && !options.dryRun) throw new Error('--fixture is render-only and requires --dry-run.');
  if (options.verifyLiveOnly && (options.dryRun || options.fixture)) {
    throw new Error('--verify-live-only cannot be combined with --dry-run or --fixture.');
  }
  return options;
}

function parseRpcObject(value, label) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') throw new Error(`${label} returned an invalid response.`);
  return row;
}

async function postRpcWithTransportRetry(fetchImpl, url, init) {
  try {
    return await fetchImpl(url, init);
  } catch {
    return fetchImpl(url, init);
  }
}

export function createPushClaimStore(
  fetchImpl,
  url,
  serviceKey,
  { randomId = randomUUID } = {},
) {
  const root = url.replace(/\/+$/, '');
  return {
    async claim(subscriptionId, eventId) {
      if (!Number.isSafeInteger(subscriptionId) || subscriptionId < 1) {
        throw new Error('Push delivery requires a valid subscription id.');
      }
      if (typeof eventId !== 'string' || !EVENT_ID_PATTERN.test(eventId)) {
        throw new Error('Push delivery requires a valid event id.');
      }
      const claimToken = randomId();
      if (typeof claimToken !== 'string' || !UUID_PATTERN.test(claimToken)) {
        throw new Error('Push delivery requires a valid claim token.');
      }
      const rpcUrl = `${root}/rest/v1/rpc/reserve_push_delivery`;
      const init = {
        method: 'POST',
        headers: serviceHeaders(serviceKey, 'return=representation'),
        body: JSON.stringify({
          candidate_subscription_id: subscriptionId,
          candidate_event_key: eventId,
          candidate_claim_token: claimToken,
        }),
      };
      const response = await postRpcWithTransportRetry(fetchImpl, rpcUrl, init);
      if (!response.ok) {
        throw new Error(`Could not claim push delivery (${response.status}): ${await responseDetail(response)}`);
      }
      const result = parseRpcObject(await response.json(), 'Push delivery claim');
      const outcomes = new Set(['reserved', 'duplicate', 'capped_24h', 'capped_7d', 'missing']);
      if (!outcomes.has(result.outcome)) throw new Error('Push delivery claim returned an unknown outcome.');
      if (result.outcome === 'reserved' && result.claim_token !== claimToken) {
        throw new Error('Push delivery claim was not owned by this worker.');
      }
      return {
        outcome: result.outcome,
        claimToken: result.claim_token,
      };
    },
    async complete(subscriptionId, eventId, claimToken, outcome, providerStatus) {
      if (!Number.isSafeInteger(subscriptionId) || subscriptionId < 1
        || typeof eventId !== 'string' || !EVENT_ID_PATTERN.test(eventId)
        || typeof claimToken !== 'string' || !UUID_PATTERN.test(claimToken)
        || !['sent', 'failed', 'expired'].includes(outcome)
        || (outcome === 'sent' && (!Number.isInteger(providerStatus) || providerStatus < 200 || providerStatus > 299))
        || (outcome === 'expired' && providerStatus !== 404 && providerStatus !== 410)
        || (outcome === 'failed' && providerStatus !== null
          && (!Number.isInteger(providerStatus) || providerStatus < 100 || providerStatus > 599))) {
        throw new Error('Push delivery completion arguments are invalid.');
      }
      const rpcUrl = `${root}/rest/v1/rpc/finalize_push_delivery`;
      const init = {
        method: 'POST',
        headers: serviceHeaders(serviceKey, 'return=representation'),
        body: JSON.stringify({
          candidate_subscription_id: subscriptionId,
          candidate_event_key: eventId,
          candidate_claim_token: claimToken,
          candidate_outcome: outcome,
          candidate_provider_status: providerStatus,
        }),
      };
      const response = await postRpcWithTransportRetry(fetchImpl, rpcUrl, init);
      if (!response.ok) {
        throw new Error(`Could not complete push delivery (${response.status}): ${await responseDetail(response)}`);
      }
      const result = parseRpcObject(await response.json(), 'Push delivery completion');
      const expected = outcome === 'expired' ? 'expired' : 'finalized';
      if (result.outcome !== expected
        || (expected === 'finalized' && result.status !== outcome)) {
        throw new Error('Push delivery receipt was not finalized by its owner.');
      }
      return result;
    },
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const publication = JSON.parse(await readFile(EVENTS_PATH, 'utf8'));
  const event = selectEventForDay(publication, options.date);
  if (!event) {
    console.log(`sky-alert: no published event on ${utcDay(options.date)}; nothing sent`);
    return;
  }

  if (!options.dryRun) {
    if (utcDay(options.date) !== utcDay(new Date())) {
      throw new Error('A real push may only send the current UTC day; use --dry-run for historical dates.');
    }
    const liveUrl = await verifyEventLive(event);
    console.log(`sky-alert: live destination verified ${liveUrl}`);
    if (options.verifyLiveOnly) return;
  }

  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let subscriptions;
  if (options.fixture) {
    subscriptions = [{
      endpoint: 'https://push.example.test/subscription',
      subscription_id: 1,
      p256dh: 'fixture-public-key',
      auth: 'fixture-auth-key',
      lang: 'en',
    }];
  } else {
    if (!url || !serviceKey) throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    const subscriptionIds = options.dryRun ? [] : authorizeRealDelivery();
    subscriptions = await readSubscriptions(fetch, url, serviceKey, options.limit, subscriptionIds);
  }

  if (!options.dryRun) {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!url || !serviceKey || !subject || !publicKey || !privateKey) {
      throw new Error('Supabase and VAPID configuration are required to send.');
    }
    webPush.setVapidDetails(subject, publicKey, privateKey);
  }

  const claims = options.dryRun
    ? { claim: async () => { throw new Error('Dry run attempted to claim.'); }, complete: async () => {} }
    : createPushClaimStore(fetch, url, serviceKey);
  const report = await sendDailyPush({
    subscriptions,
    publication,
    date: options.date,
    now: new Date(),
    dryRun: options.dryRun,
    claims,
    sendNotification: webPush.sendNotification.bind(webPush),
  });
  console.log(
    `sky-alert: done event=${report.event ?? 'none'} considered=${report.considered} reserved=${report.reserved} `
    + `sent=${report.sent} capped=${report.capped} duplicate=${report.duplicate} missing=${report.missing} `
    + `pruned=${report.pruned} failed=${report.failed} dryRun=${report.dryRun}`,
  );
  if (report.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
