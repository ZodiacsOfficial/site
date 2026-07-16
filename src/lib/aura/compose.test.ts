import { describe, expect, it } from 'vitest';
import { moonLongitude, sunLongitude } from '../engine/lite';
import type { SavedChart } from '../profile/schema';
import { signForLongitude } from '../signs';
import { auraSkySigns, composeAura, normalizeHeldSigns, selectAuraFocal } from './compose';
import { AURA_SIGN_ORDER, type AuraEventCatalog, type AuraSign, type AuraSignContext } from './types';

const VISIT = new Date('2026-07-16T12:00:00.000Z');

function chart(timeKnown = true): SavedChart {
  return {
    id: 'chart-1',
    name: 'Selected chart',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    birth: {
      date: '1990-04-01',
      time: timeKnown ? '09:30' : null,
      timeKnown,
      place: null,
    },
    summary: {
      engineVersion: 'fixture',
      utcISO: '1990-04-01T12:00:00.000Z',
      houseSystem: 'whole',
      bodies: [
        { body: 'Sun', lon: 10, retrograde: false },
        { body: 'Moon', lon: 40, retrograde: false },
        { body: 'Mercury', lon: 70, retrograde: false },
        { body: 'Venus', lon: 100, retrograde: false },
        { body: 'Mars', lon: 130, retrograde: false },
        { body: 'Jupiter', lon: 160, retrograde: false },
      ],
      angles: { asc: 190, mc: 280 },
      flags: timeKnown ? [] : ['no-time'],
    },
  };
}

function catalog(events: AuraEventCatalog['events'], generatedAt = '2026-07-15T00:00:00.000Z'): AuraEventCatalog {
  const moonIngresses = AURA_SIGN_ORDER.map((sign, index) => ({
    sign,
    exactAt: new Date(VISIT.getTime() + (30 + index * 3) * 24 * 60 * 60 * 1_000).toISOString(),
  }));
  return {
    generatedAt,
    sourceGeneratedAt: {
      ingresses: generatedAt,
      sky: generatedAt,
      eclipses: generatedAt,
      moonIngresses: generatedAt,
    },
    coverage: {
      from: '2026-01-01T00:00:00.000Z',
      to: '2028-01-01T00:00:00.000Z',
    },
    events,
    moonIngresses,
    issues: [],
  };
}

describe('Registry Aura composition', () => {
  it('normalizes holdings into unique canonical zodiac order', () => {
    expect(normalizeHeldSigns([' Leo ', 'ARIES', 'leo', 'bogus', 'Cancer'])).toEqual([
      'aries',
      'cancer',
      'leo',
    ]);
  });

  it('calculates the current Sun and Moon at the exact visit instant', () => {
    const result = composeAura({
      heldSigns: ['aries'],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog: catalog([]),
    });

    const expectedSun = sunLongitude(VISIT);
    const expectedMoon = moonLongitude(VISIT);
    expect(result.asOf).toBe(VISIT.toISOString());
    expect(result.currentSky.sun).toEqual({
      sign: signForLongitude(expectedSun).slug,
      longitude: expectedSun,
    });
    expect(result.currentSky.moon).toEqual({
      sign: signForLongitude(expectedMoon).slug,
      longitude: expectedMoon,
    });
  });

  it('uses an inclusive ±24-hour event window and exposes the next activation', () => {
    const now = VISIT.getTime();
    const exact = (offset: number) => new Date(now + offset).toISOString();
    const result = composeAura({
      heldSigns: ['aries'],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog: catalog([
        {
          id: 'past-edge',
          kind: 'ingress',
          sign: 'aries',
          exactAt: exact(-24 * 60 * 60 * 1_000),
          label: 'Past edge ingress',
        },
        {
          id: 'future-edge',
          kind: 'lunation',
          sign: 'aries',
          exactAt: exact(24 * 60 * 60 * 1_000),
          label: 'Future edge lunation',
        },
        {
          id: 'next-event',
          kind: 'station',
          sign: 'aries',
          exactAt: exact(25 * 60 * 60 * 1_000),
          label: 'Next station',
        },
      ]),
    });

    const aries = result.signs[0];
    expect(aries.activeNow.filter((item) => item.source === 'event').map((item) => item.label)).toEqual([
      'Future edge lunation',
      'Past edge ingress',
    ]);
    expect(aries.nextActivation).toMatchObject({
      eventId: 'next-event',
      source: 'event-catalog',
      at: exact(25 * 60 * 60 * 1_000),
      beginsAt: new Date(now + 60 * 60 * 1_000).toISOString(),
    });
  });

  it('always supplies an exact next carried-sign activation from the committed Moon table', () => {
    const result = composeAura({
      heldSigns: ['aries', 'libra'],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog: catalog([]),
    });

    for (const context of result.signs) {
      expect(context.nextActivation).toMatchObject({
        sign: context.sign,
        kind: 'moon-ingress',
        source: 'moon-ingress-catalog',
      });
      expect(context.nextActivation?.at).toBe(context.nextActivation?.exactAt);
      expect(Date.parse(context.nextActivation!.at)).toBeGreaterThan(VISIT.getTime());
    }
  });

  it('excludes uncertain-time Moon and angles while labeling sign-level noon estimates', () => {
    const result = composeAura({
      heldSigns: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'libra', 'capricorn'],
      chart: chart(false),
      visitedAt: VISIT,
      eventCatalog: catalog([]),
    });
    const natal = result.signs.flatMap((item) => item.natalEcho);

    expect(natal).toHaveLength(4);
    expect(natal.every((item) => item.kind === 'natal-body' && item.precision === 'noon-estimate')).toBe(true);
    expect(natal.every((item) => !('longitude' in item))).toBe(true);
    expect(natal.some((item) => item.kind === 'natal-body' && item.body === 'Moon')).toBe(false);
    expect(natal.some((item) => item.kind === 'natal-angle')).toBe(false);
    expect(result.uncertainties.map((item) => item.code)).toEqual(expect.arrayContaining([
      'unknown-time-noon-estimate',
      'unknown-time-moon-excluded',
      'unknown-time-angles-excluded',
    ]));
  });

  it('suppresses timed evidence from stale catalogues but keeps live sky evidence', () => {
    const sunSign = signForLongitude(sunLongitude(VISIT)).slug;
    const result = composeAura({
      heldSigns: [sunSign],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog: catalog([{
        id: 'stale-event',
        kind: 'eclipse',
        sign: sunSign as AuraEventCatalog['events'][number]['sign'],
        exactAt: VISIT.toISOString(),
        label: 'Stale eclipse',
      }], '2025-01-01T00:00:00.000Z'),
    });

    expect(result.eventData.usable).toBe(false);
    expect(result.uncertainties.some((item) => item.code === 'event-data-stale')).toBe(true);
    expect(result.signs[0].activeNow.some((item) => item.kind === 'current-sun')).toBe(true);
    expect(result.signs[0].activeNow.some((item) => item.source === 'event')).toBe(false);
    expect(result).not.toHaveProperty('state');
    expect(result.signs[0]).not.toHaveProperty('state');
  });

  it('selects focal evidence deterministically and resolves equal ties in zodiac order', () => {
    const empty = (sign: AuraSignContext['sign']): AuraSignContext => ({
      sign,
      natalEcho: [],
      activeNow: [],
      nextActivation: null,
      uncertainties: [],
      reading: { lead: '', detail: '', text: '' },
    });
    expect(selectAuraFocal([empty('pisces'), empty('taurus')])?.sign).toBe('taurus');

    const first = composeAura({ heldSigns: ['leo', 'aries'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    const second = composeAura({ heldSigns: ['aries', 'leo'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(first.focal).toEqual(second.focal);
    expect(first.signs.map((item) => item.reading)).toEqual(second.signs.map((item) => item.reading));
  });

  it('uses categorical focal precedence without accumulating lower-priority signals', () => {
    const sunLongitudeAtVisit = sunLongitude(VISIT);
    const sunSign = signForLongitude(sunLongitudeAtVisit).slug as AuraSign;
    const moonSign = signForLongitude(moonLongitude(VISIT)).slug as AuraSign;
    expect(moonSign).not.toBe(sunSign);

    const natalHeavySunChart = chart();
    natalHeavySunChart.summary.bodies = natalHeavySunChart.summary.bodies.map((body) => ({
      ...body,
      lon: sunLongitudeAtVisit,
    }));
    natalHeavySunChart.summary.angles = { asc: sunLongitudeAtVisit, mc: sunLongitudeAtVisit };
    const moonOverSun = composeAura({
      heldSigns: [sunSign, moonSign],
      chart: natalHeavySunChart,
      visitedAt: VISIT,
      eventCatalog: catalog([]),
    });
    expect(moonOverSun.focal?.sign).toBe(moonSign);
    expect(moonOverSun.focal?.explanation).toContain('dated Moon');

    const eventSign: AuraSign = moonSign === 'aries' ? 'taurus' : 'aries';
    const eventOverMoon = composeAura({
      heldSigns: [moonSign, eventSign],
      chart: natalHeavySunChart,
      visitedAt: VISIT,
      eventCatalog: catalog([{
        id: 'exact-event',
        kind: 'station',
        sign: eventSign,
        exactAt: VISIT.toISOString(),
        label: 'Exact station',
      }]),
    });
    expect(eventOverMoon.focal?.sign).toBe(eventSign);
  });

  it('braids the reading from the actual chart and sky facts', () => {
    // VISIT sky: Sun in Cancer, Moon in Leo. Fixture chart: Venus in Cancer,
    // Sun in Aries; the pisces chart isolates quiet cells.
    const base = composeAura({ heldSigns: ['cancer'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(base.signs[0].reading.lead).toBe(
      'Protect what needs care without turning every boundary into a wall.',
    );
    expect(base.signs[0].reading.detail).toBe(
      'The Sun is in this sign — this is its season, and the light stays on it for weeks. Your Venus lives here — what you enjoy, and how you show warmth, carries this sign’s style.',
    );
    expect(base.signs[0].reading.text).toBe(
      `${base.signs[0].reading.lead} ${base.signs[0].reading.detail}`,
    );

    const chartOnly = composeAura({ heldSigns: ['aries'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(chartOnly.signs[0].reading.detail).toBe(
      'This is also your Sun sign — home ground. You know this energy from the inside.',
    );

    const piscesChart = chart();
    piscesChart.summary.bodies = piscesChart.summary.bodies.map((body) => ({ ...body, lon: 340 }));
    piscesChart.summary.angles = { asc: 340, mc: 340 };
    const skyOnly = composeAura({ heldSigns: ['cancer'], chart: piscesChart, visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(skyOnly.signs[0].reading.detail).toBe(
      'The Sun is in this sign — this is its season, and the light stays on it for weeks. Your chart is quiet in this sign — this one comes from the sky, not from you.',
    );

    const recordOnly = composeAura({ heldSigns: ['taurus'], chart: piscesChart, visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(recordOnly.signs[0].reading.detail).toBe(
      'The sky is quiet in this sign, and your chart is too. Nothing here is urgent — and that’s worth knowing.',
    );
    expect(JSON.stringify(recordOnly.signs[0].reading)).not.toMatch(/\b(?:today|now)\b/i);

    const driving = composeAura({
      heldSigns: ['cancer'],
      chart: piscesChart,
      visitedAt: VISIT,
      eventCatalog: catalog([{
        id: 'driving-station',
        kind: 'station',
        sign: 'cancer',
        exactAt: VISIT.toISOString(),
        label: 'Mercury stations direct',
        body: 'Mercury',
        eventType: 'direct',
      }]),
    });
    expect(driving.signs[0].reading.detail).toContain(
      'Mercury turns direct in this sign — what felt stuck starts to move again.',
    );

    const example = composeAura({ heldSigns: ['cancer'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]), illustrative: true });
    expect(example.signs[0].reading.detail).toContain(
      'The example chart has placements here too — with a real chart, this is where the reading gets personal.',
    );
    expect(example.signs[0].reading.detail).not.toMatch(/\byour\b/i);
  });

  it('exposes the sky signs for a given instant so restores can name what changed', () => {
    const sky = auraSkySigns(VISIT);
    expect(sky.sun).toBe(signForLongitude(sunLongitude(VISIT)).slug);
    expect(sky.moon).toBe(signForLongitude(moonLongitude(VISIT)).slug);
  });

  it('states the factual sentence in plain deck wording for both real and example modes', () => {
    const real = composeAura({ heldSigns: ['cancer'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(real.auraSentence).toBe(
      'Cancer is found at this public wallet address. It is also in the selected birth chart and in the sky of July 16, 2026 UTC.',
    );

    const example = composeAura({ heldSigns: ['cancer'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]), illustrative: true });
    expect(example.auraSentence).toBe(
      'Cancer is included in the illustrative wallet record. It is also in the example chart and in the sky of July 16, 2026 UTC.',
    );

    const empty = composeAura({ heldSigns: [], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(empty.auraSentence).toBe(
      'No official Zodiac was found at this public wallet address, so no Aura is composed.',
    );

    const piscesChart = chart();
    piscesChart.summary.bodies = piscesChart.summary.bodies.map((body) => ({ ...body, lon: 340 }));
    piscesChart.summary.angles = { asc: 340, mc: 340 };
    const quiet = composeAura({ heldSigns: ['taurus'], chart: piscesChart, visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(quiet.auraSentence).toBe(
      'Taurus is found at this public wallet address. No dated sky or chart signal favors any held sign, so zodiac order chooses.',
    );
    expect(quiet.focal?.explanation).toBe(
      'No dated sky or chart signal favors any held sign, so zodiac order chooses.',
    );
  });

  it('carries the structured body and event type of the next activation', () => {
    const now = VISIT.getTime();
    const withEvent = composeAura({
      heldSigns: ['aries'],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog: catalog([{
        id: 'next-station',
        kind: 'station',
        sign: 'aries',
        exactAt: new Date(now + 30 * 60 * 60 * 1_000).toISOString(),
        label: 'Mercury stations direct',
        body: 'Mercury',
        eventType: 'direct',
      }]),
    });
    expect(withEvent.signs[0].nextActivation).toMatchObject({
      source: 'event-catalog',
      body: 'Mercury',
      eventType: 'direct',
      label: 'Mercury stations direct',
    });

    const moonOnly = composeAura({ heldSigns: ['libra'], chart: chart(), visitedAt: VISIT, eventCatalog: catalog([]) });
    expect(moonOnly.signs[0].nextActivation).toMatchObject({
      source: 'moon-ingress-catalog',
      kind: 'moon-ingress',
      body: 'Moon',
      eventType: null,
    });
  });

  it('breaks exact-event ties by proximity to the visit, then zodiac order', () => {
    const now = VISIT.getTime();
    const eventCatalog = catalog([
      {
        id: 'aries-farther',
        kind: 'ingress',
        sign: 'aries',
        exactAt: new Date(now + 20 * 60 * 60 * 1_000).toISOString(),
        label: 'Aries farther event',
      },
      {
        id: 'pisces-nearer',
        kind: 'station',
        sign: 'pisces',
        exactAt: new Date(now + 2 * 60 * 60 * 1_000).toISOString(),
        label: 'Pisces nearer event',
      },
    ]);
    const nearer = composeAura({
      heldSigns: ['aries', 'pisces'],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog,
    });
    expect(nearer.focal?.sign).toBe('pisces');

    const equalDistance = composeAura({
      heldSigns: ['aries', 'pisces'],
      chart: chart(),
      visitedAt: VISIT,
      eventCatalog: catalog(eventCatalog.events.map((event) => ({
        ...event,
        exactAt: new Date(now + 2 * 60 * 60 * 1_000).toISOString(),
      }))),
    });
    expect(equalDistance.focal?.sign).toBe('aries');
  });
});
