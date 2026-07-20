import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  authorizeRealDelivery,
  buildEventAlert,
  createPushClaimStore,
  parseOptions,
  parseSubscriptionIdAllowlist,
  readSubscriptions,
  selectEventForDay,
  sendDailyPush,
  verifyEventLive,
} from './send-daily-push.mjs';

const event = (overrides = {}) => ({
  id: 'uranus-trine-pluto-2026-07-18',
  path: '/events/uranus-trine-pluto-2026-07-18/',
  title: 'Uranus trine Pluto — July 18, 2026',
  anchor: '2026-07-18T04:39:44.443Z',
  family: 'aspect',
  subtype: 'trine',
  bodies: ['Uranus', 'Pluto'],
  signs: ['gemini', 'aquarius'],
  summary: 'Uranus and Pluto reach an exact trine.',
  lastModified: '2026-07-20',
  ...overrides,
});

const PUBLICATION = {
  schema: 'zodiacs.events-publication.v1',
  locale: 'en',
  timeline: [
    event(),
    event({
      id: 'jupiter-trine-neptune-2026-07-20',
      path: '/events/jupiter-trine-neptune-2026-07-20/',
      title: 'Jupiter trine Neptune — July 20, 2026',
      anchor: '2026-07-20T07:47:52.896Z',
      bodies: ['Jupiter', 'Neptune'],
      signs: ['leo', 'aries'],
      summary: 'Jupiter and Neptune reach an exact trine.',
    }),
    event({
      id: 'jupiter-opposition-pluto-2026-07-20',
      path: '/events/jupiter-opposition-pluto-2026-07-20/',
      title: 'Jupiter opposition Pluto — July 20, 2026',
      anchor: '2026-07-20T14:45:43.725Z',
      subtype: 'opposition',
      bodies: ['Jupiter', 'Pluto'],
      signs: ['leo', 'aquarius'],
      summary: 'Jupiter and Pluto reach an exact opposition.',
    }),
    event({
      id: 'mercury-stations-direct-2026-07-23',
      path: '/mercury-retrograde/2026-06-29/',
      title: 'Mercury stations direct — July 23, 2026',
      anchor: '2026-07-23T22:56:19.394Z',
      family: 'station',
      subtype: 'direct',
      bodies: ['Mercury'],
      signs: ['cancer'],
      summary: 'Mercury stands still, then resumes forward motion.',
    }),
    event({
      id: 'full-moon-2026-07-29',
      path: '/full-moon/2026-07-29/',
      title: 'Full moon in Aquarius — July 29, 2026',
      anchor: '2026-07-29T14:35:36.043Z',
      family: 'lunation',
      subtype: 'full',
      bodies: ['Moon', 'Sun'],
      signs: ['aquarius'],
      summary: 'The Buck Moon — the Moon stands opposite the Sun in Aquarius.',
    }),
    event({
      id: 'new-moon-2026-08-12',
      path: '/new-moon/2026-08-12/',
      title: 'New moon in Leo — August 12, 2026',
      anchor: '2026-08-12T17:36:35.369Z',
      family: 'lunation',
      subtype: 'new',
      bodies: ['Moon', 'Sun'],
      signs: ['leo'],
      summary: "Sun and Moon meet in Leo; the month's quiet reset.",
    }),
    event({
      id: 'eclipse-2026-08-12',
      path: '/eclipses/2026-08-12/',
      title: 'Total solar eclipse in Leo — August 12, 2026',
      anchor: '2026-08-12T17:45:46.794Z',
      family: 'eclipse',
      subtype: 'solar',
      bodies: ['Moon', 'Sun'],
      signs: ['leo'],
      summary: "A new moon crosses the Sun's face in Leo.",
    }),
  ],
};
const COMMITTED_PUBLICATION = JSON.parse(readFileSync(
  new URL('../src/data/events-publication.json', import.meta.url),
  'utf8',
));

const subscription = (overrides = {}) => ({
  subscription_id: 41,
  endpoint: 'https://push.test/subscription',
  p256dh: 'public-key',
  auth: 'auth-key',
  lang: 'en',
  ...overrides,
});

function claims(outcome = 'reserved') {
  return {
    claim: vi.fn().mockResolvedValue({ outcome, claimToken: '11111111-1111-4111-8111-111111111111' }),
    complete: vi.fn().mockResolvedValue({ outcome: 'finalized', status: 'sent' }),
  };
}

function response({ ok = true, status = 200, json = {}, text = '' } = {}) {
  return {
    ok,
    status,
    headers: { get: vi.fn().mockReturnValue('text/html; charset=utf-8') },
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(text),
  };
}

describe('sky-alert event selection and copy', () => {
  it('selects only the run UTC day and never previews a future event', () => {
    expect(selectEventForDay(PUBLICATION, new Date('2026-07-19T12:00:00Z'))).toBeNull();
    expect(selectEventForDay(PUBLICATION, new Date('2026-07-20T23:59:59Z'))?.id)
      .toBe('jupiter-trine-neptune-2026-07-20');
  });

  it('suppresses a paired lunation in favor of the eclipse', () => {
    expect(selectEventForDay(PUBLICATION, new Date('2026-08-12T01:00:00Z'))?.id)
      .toBe('eclipse-2026-08-12');
  });

  it('uses stable priority, then anchor, then id for unresolved collisions', () => {
    const reversed = { ...PUBLICATION, timeline: [...PUBLICATION.timeline].reverse() };
    expect(selectEventForDay(reversed, new Date('2026-07-20T12:00:00Z'))?.id)
      .toBe('jupiter-trine-neptune-2026-07-20');

    const mixed = {
      ...PUBLICATION,
      timeline: [
        event({
          id: 'full-moon-2026-06-29', family: 'lunation', subtype: 'full',
          anchor: '2026-06-29T23:56:33.675Z', path: '/full-moon/2026-06-29/',
          title: 'Full moon in Capricorn — June 29, 2026', bodies: ['Moon', 'Sun'],
          signs: ['capricorn'], summary: 'The Strawberry Moon — the Moon stands opposite the Sun in Capricorn.',
        }),
        event({
          id: 'mercury-stations-retrograde-2026-06-29', family: 'station', subtype: 'retrograde',
          anchor: '2026-06-29T17:37:12.860Z', path: '/mercury-retrograde/2026-06-29/',
          title: 'Mercury stations retrograde — June 29, 2026', bodies: ['Mercury'],
          signs: ['cancer'], summary: 'Mercury slows to a standstill and turns retrograde.',
        }),
      ],
    };
    expect(selectEventForDay(mixed, new Date('2026-06-29T12:00:00Z'))?.family).toBe('station');
  });

  it('pins the approved full moon, new moon, station, and major-event slots', () => {
    expect(buildEventAlert(PUBLICATION.timeline[4])).toEqual({
      title: 'Full moon tonight',
      body: 'The Buck Moon peaks in Aquarius at 14:35 UTC. Where it lands for you:',
      url: '/full-moon/2026-07-29/',
    });
    expect(buildEventAlert(PUBLICATION.timeline[5])).toEqual({
      title: 'New moon today',
      body: 'Sun and Moon meet in Leo — the month’s reset point.',
      url: '/new-moon/2026-08-12/',
    });
    expect(buildEventAlert(PUBLICATION.timeline[3])).toEqual({
      title: 'Mercury turns direct today',
      body: 'The review window closes at 22:56 UTC. Stalled plans start moving.',
      url: '/mercury-retrograde/2026-06-29/',
    });
    expect(buildEventAlert(PUBLICATION.timeline[0])).toEqual({
      title: 'A rare exact alignment today',
      body: 'Uranus and Pluto reach an exact trine — years in the making.',
      url: '/events/uranus-trine-pluto-2026-07-18/',
    });
  });

  it('uses only the selected event canonical URL for an eclipse', () => {
    expect(buildEventAlert(PUBLICATION.timeline[6])).toEqual({
      title: 'Total solar eclipse today',
      body: 'The Moon covers the Sun at 20° Leo, 17:45 UTC — the year’s most emphatic new moon.',
      url: '/eclipses/2026-08-12/',
    });
  });

  it('requires one exact live canonical before a real event may send', async () => {
    const selected = PUBLICATION.timeline[0];
    const canonical = 'https://zodiacs.org/events/uranus-trine-pluto-2026-07-18/';
    const fetchImpl = vi.fn().mockResolvedValue(response({
      text: `<html><head><link href="${canonical}" rel="canonical"></head></html>`,
    }));
    await expect(verifyEventLive(selected, fetchImpl)).resolves.toBe(canonical);
    expect(fetchImpl).toHaveBeenCalledWith(canonical, {
      headers: { Accept: 'text/html' },
      redirect: 'manual',
    });

    const wrongCanonical = vi.fn().mockResolvedValue(response({
      text: '<link rel="canonical" href="https://zodiacs.org/events/another/">',
    }));
    await expect(verifyEventLive(selected, wrongCanonical)).rejects.toThrow(/canonical/u);
    const redirect = vi.fn().mockResolvedValue(response({ ok: false, status: 308 }));
    await expect(verifyEventLive(selected, redirect)).rejects.toThrow(/not live \(308\)/u);
  });

  it('keeps unapproved aspect and family fallbacks on committed publication copy', () => {
    expect(buildEventAlert(PUBLICATION.timeline[1])).toEqual({
      title: 'Jupiter trine Neptune',
      body: 'Jupiter and Neptune reach an exact trine.',
      url: '/events/jupiter-trine-neptune-2026-07-20/',
    });
    expect(buildEventAlert(event({
      id: 'neptune-enters-aries-2026-01-26',
      path: '/events/neptune-enters-aries-2026-01-26/',
      title: 'Neptune enters Aries — January 26, 2026',
      anchor: '2026-01-26T14:30:38.567Z',
      family: 'ingress',
      subtype: 'ingress',
      bodies: ['Neptune'],
      signs: ['aries'],
      summary: 'Neptune moves into Aries from Pisces.',
    }))).toEqual({
      title: 'Neptune enters Aries',
      body: 'Neptune moves into Aries from Pisces.',
      url: '/events/neptune-enters-aries-2026-01-26/',
    });
  });

  it('fails closed on an unverified schema or unsafe event URL', () => {
    expect(() => selectEventForDay({ ...PUBLICATION, schema: 'wrong' }, new Date()))
      .toThrow(/verified events publication/u);
    const unsafe = { ...PUBLICATION, timeline: [event({ path: '//attacker.test/' })] };
    expect(selectEventForDay(unsafe, new Date('2026-07-18T12:00:00Z'))).toBeNull();
    const backslash = { ...PUBLICATION, timeline: [event({ path: '/\\attacker.test/' })] };
    expect(selectEventForDay(backslash, new Date('2026-07-18T12:00:00Z'))).toBeNull();
    const query = { ...PUBLICATION, timeline: [event({ path: '/events/example/?next=/today/' })] };
    expect(selectEventForDay(query, new Date('2026-07-18T12:00:00Z'))).toBeNull();
    const nonEventRoute = { ...PUBLICATION, timeline: [event({ path: '/today/' })] };
    expect(selectEventForDay(nonEventRoute, new Date('2026-07-18T12:00:00Z'))).toBeNull();
    expect(() => selectEventForDay({ ...PUBLICATION, locale: 'fr' }, new Date()))
      .toThrow(/verified events publication/u);
  });

  it('renders bounded local payloads for every family in the committed receipt', () => {
    for (const published of COMMITTED_PUBLICATION.timeline) {
      const alert = buildEventAlert(published);
      expect(alert.title.length).toBeGreaterThan(0);
      expect(alert.title.length).toBeLessThanOrEqual(120);
      expect(alert.body.length).toBeGreaterThan(0);
      expect(alert.body.length).toBeLessThanOrEqual(320);
      expect(alert.url).toBe(published.path);
      expect(alert.url.length).toBeLessThanOrEqual(512);
      expect(alert.url.startsWith('/')).toBe(true);
      expect(alert.url.startsWith('//')).toBe(false);
      expect(JSON.stringify(alert).length).toBeLessThan(4_096);
    }
  });
});

describe('sky-alert delivery', () => {
  it('does nothing on a quiet day without claiming or contacting Web Push', async () => {
    const store = claims();
    const sendNotification = vi.fn();
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-19T12:00:00Z'), claims: store, sendNotification,
    });
    expect(report).toMatchObject({ event: null, considered: 0, reserved: 0, sent: 0, dryRun: 0 });
    expect(store.claim).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('renders every locale as approved English during a mutation-free dry run', async () => {
    const store = claims();
    const sendNotification = vi.fn();
    const log = vi.fn();
    const report = await sendDailyPush({
      subscriptions: [subscription({ lang: 'it' }), subscription({ subscription_id: 42, lang: 'fr' })],
      publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'),
      dryRun: true,
      claims: store,
      sendNotification,
      log,
    });
    expect(report).toMatchObject({ event: 'uranus-trine-pluto-2026-07-18', considered: 2, reserved: 0, dryRun: 2 });
    expect(store.claim).not.toHaveBeenCalled();
    expect(store.complete).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls.every(([line]) => line.includes('dry-run en'))).toBe(true);
  });

  it('reserves before Web Push, sends the event URL, then finalizes the exact claim', async () => {
    const order = [];
    const store = claims();
    store.claim.mockImplementation(async () => {
      order.push('reserve');
      return { outcome: 'reserved', claimToken: 'claim-token' };
    });
    store.complete.mockImplementation(async () => {
      order.push('finalize');
      return { outcome: 'finalized', status: 'sent' };
    });
    const sendNotification = vi.fn().mockImplementation(async (_subscription, payload, options) => {
      order.push('send');
      expect(JSON.parse(payload).url).toBe('/events/uranus-trine-pluto-2026-07-18/');
      expect(options.TTL).toBe(43_200);
      return { statusCode: 201 };
    });
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'), now: new Date('2026-07-18T12:00:00Z'),
      claims: store, sendNotification,
    });
    expect(order).toEqual(['reserve', 'send', 'finalize']);
    expect(store.claim).toHaveBeenCalledWith(41, 'uranus-trine-pluto-2026-07-18');
    expect(store.complete).toHaveBeenCalledWith(
      41, 'uranus-trine-pluto-2026-07-18', 'claim-token', 'sent', 201,
    );
    expect(report).toMatchObject({ considered: 1, reserved: 1, sent: 1, failed: 0 });
  });

  it.each(['capped_24h', 'capped_7d', 'duplicate', 'missing'])(
    'does not contact Web Push after a %s outcome',
    async (outcome) => {
      const store = claims(outcome);
      const sendNotification = vi.fn();
      const report = await sendDailyPush({
        subscriptions: [subscription()], publication: PUBLICATION,
        date: new Date('2026-07-18T12:00:00Z'), claims: store, sendNotification,
      });
      expect(sendNotification).not.toHaveBeenCalled();
      expect(store.complete).not.toHaveBeenCalled();
      expect(report.capped).toBe(outcome.startsWith('capped') ? 1 : 0);
      expect(report.duplicate).toBe(outcome === 'duplicate' ? 1 : 0);
      expect(report.missing).toBe(outcome === 'missing' ? 1 : 0);
    },
  );

  it.each([404, 410])('atomically expires and prunes the exact subscription after %i', async (statusCode) => {
    const store = claims();
    store.complete.mockResolvedValue({ outcome: 'expired' });
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'), claims: store,
      sendNotification: vi.fn().mockRejectedValue({ statusCode }),
    });
    expect(store.complete).toHaveBeenCalledWith(
      41, 'uranus-trine-pluto-2026-07-18', expect.any(String), 'expired', statusCode,
    );
    expect(report).toMatchObject({ reserved: 1, sent: 0, pruned: 1, failed: 0 });
  });

  it('treats a resolved non-2xx Web Push response as a provider failure', async () => {
    const store = claims();
    store.complete.mockResolvedValue({ outcome: 'expired' });
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'), claims: store,
      sendNotification: vi.fn().mockResolvedValue({ statusCode: 410 }),
    });
    expect(store.complete).toHaveBeenCalledWith(
      41, 'uranus-trine-pluto-2026-07-18', expect.any(String), 'expired', 410,
    );
    expect(report).toMatchObject({ sent: 0, pruned: 1, failed: 0 });
  });

  it.each([{}, null, undefined])(
    'never treats a resolved provider response without an explicit status as sent: %j',
    async (providerResponse) => {
      const store = claims();
      store.complete.mockResolvedValue({ outcome: 'finalized', status: 'failed' });
      const report = await sendDailyPush({
        subscriptions: [subscription()], publication: PUBLICATION,
        date: new Date('2026-07-18T12:00:00Z'), claims: store,
        sendNotification: vi.fn().mockResolvedValue(providerResponse), log: vi.fn(),
      });
      expect(store.complete).toHaveBeenCalledWith(
        41, 'uranus-trine-pluto-2026-07-18', expect.any(String), 'failed', null,
      );
      expect(report).toMatchObject({ sent: 0, failed: 1 });
    },
  );

  it('records a non-terminal provider failure without retrying the event', async () => {
    const store = claims();
    store.complete.mockResolvedValue({ outcome: 'finalized', status: 'failed' });
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'), claims: store,
      sendNotification: vi.fn().mockRejectedValue({ statusCode: 503 }), log: vi.fn(),
    });
    expect(store.complete).toHaveBeenCalledWith(
      41, 'uranus-trine-pluto-2026-07-18', expect.any(String), 'failed', 503,
    );
    expect(report).toMatchObject({ reserved: 1, sent: 0, pruned: 0, failed: 1 });
  });

  it('counts one failed subscription when provider and receipt both fail', async () => {
    const store = claims();
    store.complete.mockRejectedValue(new Error('database unavailable'));
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'), claims: store,
      sendNotification: vi.fn().mockRejectedValue({ statusCode: 503 }), log: vi.fn(),
    });
    expect(report).toMatchObject({ considered: 1, reserved: 1, sent: 0, failed: 1 });
  });

  it('leaves a reservation in place when accepted delivery cannot be finalized', async () => {
    const store = claims();
    store.complete.mockRejectedValue(new Error('database unavailable'));
    const report = await sendDailyPush({
      subscriptions: [subscription()], publication: PUBLICATION,
      date: new Date('2026-07-18T12:00:00Z'), claims: store,
      sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }), log: vi.fn(),
    });
    expect(store.complete).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({ reserved: 1, sent: 0, failed: 1 });
  });
});

describe('push claim PostgREST adapter and CLI', () => {
  it('reads the stable subscription id required by the cap ledger', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ json: [subscription()] }));
    await expect(readSubscriptions(fetchImpl, 'https://project.supabase.co', 'service-key', 500))
      .resolves.toEqual([subscription()]);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('select=subscription_id,endpoint,p256dh,auth,lang');

    await readSubscriptions(
      fetchImpl,
      'https://project.supabase.co',
      'service-key',
      50,
      [41, 43],
    );
    expect(String(fetchImpl.mock.calls[1][0])).toContain('subscription_id=in.(41,43)');
  });

  it('hard-gates real delivery to the enabled schedule or an exact test list', () => {
    expect(authorizeRealDelivery({ PUSH_ENABLED: 'true' })).toEqual([]);
    expect(authorizeRealDelivery({ PUSH_TEST_SUBSCRIPTION_IDS: '41, 43,41' })).toEqual([41, 43]);
    expect(() => authorizeRealDelivery({})).toThrow(/PUSH_ENABLED=true/u);
    expect(() => parseSubscriptionIdAllowlist('0,2')).toThrow(/positive integer/u);
    expect(() => parseSubscriptionIdAllowlist('1,not-an-id')).toThrow(/positive integer/u);
  });

  it('reserves and finalizes through the service-only RPC contract', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ json: {
        outcome: 'reserved',
        claim_token: '11111111-1111-4111-8111-111111111111',
        claimed_at: '2026-07-18T07:00:00Z',
      } }))
      .mockResolvedValueOnce(response({ json: { outcome: 'finalized', status: 'sent' } }));
    const store = createPushClaimStore(fetchImpl, 'https://project.supabase.co', 'service-key', {
      randomId: () => '11111111-1111-4111-8111-111111111111',
    });
    const claim = await store.claim(41, 'event-id');
    expect(claim.outcome).toBe('reserved');
    await expect(store.complete(41, 'event-id', claim.claimToken, 'sent', 201))
      .resolves.toMatchObject({ outcome: 'finalized', status: 'sent' });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rpc/reserve_push_delivery');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      candidate_subscription_id: 41,
      candidate_event_key: 'event-id',
      candidate_claim_token: claim.claimToken,
      candidate_outcome: 'sent',
      candidate_provider_status: 201,
    });
  });

  it('retries a thrown reserve/finalize transport once with the identical idempotency body', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('connection reset after commit'))
      .mockResolvedValueOnce(response({ json: {
        outcome: 'reserved', claim_token: '11111111-1111-4111-8111-111111111111',
      } }))
      .mockRejectedValueOnce(new Error('connection reset after commit'))
      .mockResolvedValueOnce(response({ json: { outcome: 'finalized', status: 'sent' } }));
    const store = createPushClaimStore(fetchImpl, 'https://project.supabase.co', 'service-key', {
      randomId: () => '11111111-1111-4111-8111-111111111111',
    });
    const claim = await store.claim(41, 'event-id');
    await store.complete(41, 'event-id', claim.claimToken, 'sent', 201);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[0][0]).toBe(fetchImpl.mock.calls[1][0]);
    expect(fetchImpl.mock.calls[0][1].body).toBe(fetchImpl.mock.calls[1][1].body);
    expect(fetchImpl.mock.calls[2][0]).toBe(fetchImpl.mock.calls[3][0]);
    expect(fetchImpl.mock.calls[2][1].body).toBe(fetchImpl.mock.calls[3][1].body);
  });

  it('does not retry an explicit non-OK RPC response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: false, status: 503, text: 'offline' }));
    const store = createPushClaimStore(fetchImpl, 'https://project.supabase.co', 'service-key', {
      randomId: () => '11111111-1111-4111-8111-111111111111',
    });
    await expect(store.claim(41, 'event-id')).rejects.toThrow(/503/u);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const finalizeFetch = vi.fn().mockResolvedValue(response({ ok: false, status: 409, text: 'conflict' }));
    const finalizeStore = createPushClaimStore(finalizeFetch, 'https://project.supabase.co', 'service-key');
    await expect(finalizeStore.complete(
      41, 'event-id', '11111111-1111-4111-8111-111111111111', 'sent', 201,
    )).rejects.toThrow(/409/u);
    expect(finalizeFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown RPC outcomes and invalid calendar options', async () => {
    const store = createPushClaimStore(
      vi.fn().mockResolvedValue(response({ json: { outcome: 'surprise' } })),
      'https://project.supabase.co', 'service-key',
    );
    await expect(store.claim(41, 'event-id')).rejects.toThrow(/unknown outcome/u);
    await expect(store.claim(0, 'event-id')).rejects.toThrow(/subscription id/u);
    await expect(store.claim(41, '../event')).rejects.toThrow(/event id/u);
    expect(() => parseOptions(['--date', '2026-02-31'])).toThrow(/real UTC calendar date/u);
    expect(() => parseOptions(['--limit', '0'])).toThrow(/integer from 1 to 10000/u);
    expect(() => parseOptions(['--fixture'])).toThrow(/requires --dry-run/u);
    expect(() => parseOptions(['--verify-live-only', '--dry-run'])).toThrow(/cannot be combined/u);
  });

  it('keeps the workflow gate explicit and scheduled delivery disabled by default', () => {
    const workflow = readFileSync(new URL('../.github/workflows/push-daily.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('Require selected event in production before real delivery');
    expect(workflow).toContain('npm run push:daily -- --verify-live-only');
    expect(workflow).toContain("vars.PUSH_ENABLED == 'true'");
    expect(workflow).toContain('PUSH_TEST_SUBSCRIPTION_IDS: ${{ vars.PUSH_TEST_SUBSCRIPTION_IDS }}');
  });
});
