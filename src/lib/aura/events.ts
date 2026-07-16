import eclipseData from '../../data/eclipses.json';
import ingressData from '../../data/ingresses.json';
import moonIngressData from '../../data/aura-moon-ingresses.json';
import skyData from '../../data/sky.json';
import { moonLongitude } from '../engine/lite';
import { signForLongitude } from '../signs';
import {
  AURA_SIGN_ORDER,
  type AuraEventCatalog,
  type AuraEventCatalogIssue,
  type AuraEventFreshnessOptions,
  type AuraEventKind,
  type AuraEventValidation,
  type AuraSign,
  type AuraTimedEvent,
  type AuraUncertainty,
} from './types';

export const AURA_EVENT_WINDOW_MS = 24 * 60 * 60 * 1_000;
/** Source builders refresh yearly; 400 days gives that cadence a bounded grace period. */
export const DEFAULT_AURA_EVENT_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1_000;
export const DEFAULT_AURA_EVENT_FUTURE_SKEW_MS = 5 * 60 * 1_000;

const ECLIPSE_LUNATION_DEDUP_MS = 2 * 60 * 60 * 1_000;
const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);

interface RawIngressWindow {
  planet: string;
  sign: string;
  from: string;
  to: string;
}

interface RawIngressHorizon {
  planets: string[];
  from: string;
  to: string;
}

interface RawIngressData {
  generatedAt: string;
  horizons: RawIngressHorizon[];
  windows: RawIngressWindow[];
}

interface RawMoonEvent {
  type: string;
  at: string;
}

interface RawRetrograde {
  planet: string;
  from: string;
  to: string | null;
}

interface RawSkyData {
  generatedAt: string;
  from: string;
  to: string;
  moons: RawMoonEvent[];
  retrogrades: RawRetrograde[];
}

interface RawEclipse {
  type: string;
  kind: string;
  peak: string;
  sign: string;
}

interface RawEclipseData {
  generatedAt: string;
  from: string;
  to: string;
  eclipses: RawEclipse[];
}

interface RawMoonIngressData {
  generatedAt: string;
  from: string;
  to: string;
  ingresses: Array<{ sign: string; at: string }>;
}

export interface AuraEventSources {
  ingresses: RawIngressData;
  sky: RawSkyData;
  eclipses: RawEclipseData;
  moonIngresses: RawMoonIngressData;
}

const DEFAULT_EVENT_SOURCES: AuraEventSources = {
  ingresses: ingressData as RawIngressData,
  sky: skyData as RawSkyData,
  eclipses: eclipseData as RawEclipseData,
  moonIngresses: moonIngressData as RawMoonIngressData,
};

function isAuraSign(value: unknown): value is AuraSign {
  return typeof value === 'string' && SIGN_SET.has(value);
}

function timestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value: number): string {
  return new Date(value).toISOString();
}

function eventId(kind: AuraEventKind, body: string, exactAt: string): string {
  const token = body.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${kind}:${token}:${exactAt}`;
}

function titleCase(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

function pushIssue(
  issues: AuraEventCatalogIssue[],
  code: AuraEventCatalogIssue['code'],
  message: string,
): void {
  issues.push({ code, message });
}

function coverageBoundary(value: string, endOfRange: boolean): number | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return timestamp(`${value}T${endOfRange ? '23:59:59.999' : '00:00:00.000'}Z`);
  }
  return timestamp(value);
}

function findIngressSign(
  windows: readonly RawIngressWindow[],
  planet: string,
  at: number,
): AuraSign | null {
  for (const window of windows) {
    if (window.planet !== planet || !isAuraSign(window.sign)) continue;
    const from = timestamp(window.from);
    const to = timestamp(window.to);
    if (from !== null && to !== null && at >= from && at < to) return window.sign;
  }
  return null;
}

function eventOrder(kind: AuraEventKind): number {
  switch (kind) {
    case 'eclipse': return 0;
    case 'lunation': return 1;
    case 'ingress': return 2;
    case 'station': return 3;
  }
}

export function compareAuraEvents(a: AuraTimedEvent, b: AuraTimedEvent): number {
  return Date.parse(a.exactAt) - Date.parse(b.exactAt)
    || eventOrder(a.kind) - eventOrder(b.kind)
    || AURA_SIGN_ORDER.indexOf(a.sign) - AURA_SIGN_ORDER.indexOf(b.sign)
    || a.id.localeCompare(b.id);
}

/**
 * Builds one deterministic catalogue from the repository's committed astronomy
 * data. Invalid individual records are omitted and surfaced in `issues`.
 */
export function buildAuraEventCatalog(
  sources: AuraEventSources = DEFAULT_EVENT_SOURCES,
): AuraEventCatalog {
  const issues: AuraEventCatalogIssue[] = [];
  const events: AuraTimedEvent[] = [];
  const { ingresses, sky, eclipses, moonIngresses } = sources;

  const generatedValues = [ingresses.generatedAt, sky.generatedAt, eclipses.generatedAt, moonIngresses.generatedAt]
    .map(timestamp)
    .filter((value): value is number => value !== null);
  if (generatedValues.length !== 4) {
    pushIssue(issues, 'invalid-source-timestamp', 'One or more event sources has an invalid generated-at timestamp.');
  }

  const horizonStarts = ingresses.horizons.map((horizon) => coverageBoundary(horizon.from, false));
  const horizonEnds = ingresses.horizons.map((horizon) => coverageBoundary(horizon.to, true));
  const coverageStarts = [
    ...horizonStarts,
    coverageBoundary(sky.from, false),
    coverageBoundary(eclipses.from, false),
    coverageBoundary(moonIngresses.from, false),
  ].filter((value): value is number => value !== null);
  const coverageEnds = [
    ...horizonEnds,
    coverageBoundary(sky.to, true),
    coverageBoundary(eclipses.to, true),
    coverageBoundary(moonIngresses.to, true),
  ].filter((value): value is number => value !== null);
  const coverageFrom = coverageStarts.length > 0 ? Math.max(...coverageStarts) : Number.NaN;
  const coverageTo = coverageEnds.length > 0 ? Math.min(...coverageEnds) : Number.NaN;
  if (!Number.isFinite(coverageFrom) || !Number.isFinite(coverageTo) || coverageFrom >= coverageTo) {
    pushIssue(issues, 'invalid-source-timestamp', 'The event sources do not provide a valid shared coverage range.');
  }

  const windowsByPlanet = new Map<string, RawIngressWindow[]>();
  for (const window of ingresses.windows) {
    const from = timestamp(window.from);
    const to = timestamp(window.to);
    if (!window.planet || !isAuraSign(window.sign) || from === null || to === null || from >= to) {
      pushIssue(issues, 'invalid-event', 'An invalid ingress window was omitted.');
      continue;
    }
    const windows = windowsByPlanet.get(window.planet) ?? [];
    windows.push(window);
    windowsByPlanet.set(window.planet, windows);
  }

  for (const [planet, windows] of windowsByPlanet) {
    windows.sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
    for (let index = 0; index < windows.length; index += 1) {
      const current = windows[index];
      const previous = windows[index - 1];
      if (previous && (previous.to !== current.from || previous.sign === current.sign)) continue;
      if (!isAuraSign(current.sign)) continue;
      const exact = timestamp(current.from);
      if (exact === null) continue;
      const exactAt = iso(exact);
      events.push({
        id: eventId('ingress', `${planet}-${current.sign}`, exactAt),
        kind: 'ingress',
        sign: current.sign,
        exactAt,
        body: planet,
        label: `${planet} enters ${titleCase(current.sign)}`,
      });
    }
  }

  for (const moon of sky.moons) {
    const exact = timestamp(moon.at);
    if (exact === null || (moon.type !== 'new' && moon.type !== 'full')) {
      pushIssue(issues, 'invalid-event', 'An invalid lunation record was omitted.');
      continue;
    }
    const sign = signForLongitude(moonLongitude(new Date(exact))).slug;
    if (!isAuraSign(sign)) {
      pushIssue(issues, 'invalid-event', 'A lunation could not be assigned to a zodiac sign.');
      continue;
    }
    const exactAt = iso(exact);
    events.push({
      id: eventId('lunation', `${moon.type}-moon-${sign}`, exactAt),
      kind: 'lunation',
      sign,
      exactAt,
      eventType: moon.type,
      body: 'Moon',
      label: `${titleCase(moon.type)} Moon in ${titleCase(sign)}`,
    });
  }

  const skyFrom = timestamp(sky.from);
  const skyTo = timestamp(sky.to);
  for (const retrograde of sky.retrogrades) {
    const starts = timestamp(retrograde.from);
    const ends = timestamp(retrograde.to);
    const boundaries: Array<{ at: number | null; eventType: 'retrograde' | 'direct' }> = [
      { at: starts !== null && starts !== skyFrom ? starts : null, eventType: 'retrograde' },
      { at: ends !== null && ends !== skyTo ? ends : null, eventType: 'direct' },
    ];
    for (const boundary of boundaries) {
      if (boundary.at === null) continue;
      const sign = findIngressSign(ingresses.windows, retrograde.planet, boundary.at);
      if (!sign) {
        pushIssue(
          issues,
          'missing-station-sign',
          `${retrograde.planet}'s ${boundary.eventType} station could not be assigned to a sign.`,
        );
        continue;
      }
      const exactAt = iso(boundary.at);
      events.push({
        id: eventId('station', `${retrograde.planet}-${boundary.eventType}-${sign}`, exactAt),
        kind: 'station',
        sign,
        exactAt,
        body: retrograde.planet,
        eventType: boundary.eventType,
        label: `${retrograde.planet} stations ${boundary.eventType}`,
      });
    }
  }

  for (const eclipse of eclipses.eclipses) {
    const exact = timestamp(eclipse.peak);
    if (exact === null || !isAuraSign(eclipse.sign) || !eclipse.type || !eclipse.kind) {
      pushIssue(issues, 'invalid-event', 'An invalid eclipse record was omitted.');
      continue;
    }
    const exactAt = iso(exact);
    const eventType = `${eclipse.kind} ${eclipse.type}`;
    events.push({
      id: eventId('eclipse', `${eventType}-${eclipse.sign}`, exactAt),
      kind: 'eclipse',
      sign: eclipse.sign,
      exactAt,
      body: eclipse.type === 'solar' ? 'Sun' : 'Moon',
      eventType,
      label: `${titleCase(eclipse.kind)} ${titleCase(eclipse.type)} eclipse in ${titleCase(eclipse.sign)}`,
    });
  }

  const eclipseEvents = events.filter((event) => event.kind === 'eclipse');
  const deduplicated = events.filter((event) => {
    if (event.kind !== 'lunation') return true;
    const exact = Date.parse(event.exactAt);
    return !eclipseEvents.some((eclipse) => (
      eclipse.sign === event.sign
      && Math.abs(Date.parse(eclipse.exactAt) - exact) <= ECLIPSE_LUNATION_DEDUP_MS
    ));
  });

  const exactMoonIngresses = moonIngresses.ingresses.flatMap((ingress) => {
    const exact = timestamp(ingress.at);
    if (!isAuraSign(ingress.sign) || exact === null) {
      pushIssue(issues, 'invalid-event', 'An invalid Moon ingress was omitted.');
      return [];
    }
    return [{ sign: ingress.sign, exactAt: iso(exact) }];
  }).sort((a, b) => a.exactAt.localeCompare(b.exactAt));

  return {
    generatedAt: generatedValues.length > 0 ? iso(Math.min(...generatedValues)) : 'invalid',
    sourceGeneratedAt: {
      ingresses: ingresses.generatedAt,
      sky: sky.generatedAt,
      eclipses: eclipses.generatedAt,
      moonIngresses: moonIngresses.generatedAt,
    },
    coverage: {
      from: Number.isFinite(coverageFrom) ? iso(coverageFrom) : 'invalid',
      to: Number.isFinite(coverageTo) ? iso(coverageTo) : 'invalid',
    },
    events: deduplicated.sort(compareAuraEvents),
    moonIngresses: exactMoonIngresses,
    issues,
  };
}

function uncertainty(
  code: AuraUncertainty['code'],
  message: string,
): AuraUncertainty {
  return { code, scope: 'events', message };
}

/** Validates freshness and whether the full ±24-hour sky-event window is covered. */
export function validateAuraEventCatalog(
  catalog: AuraEventCatalog,
  visitedAt: Date,
  options: AuraEventFreshnessOptions = {},
): AuraEventValidation {
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_AURA_EVENT_MAX_AGE_MS;
  const allowedFutureSkewMs = options.allowedFutureSkewMs ?? DEFAULT_AURA_EVENT_FUTURE_SKEW_MS;
  const uncertainties: AuraUncertainty[] = [];
  let usable = Number.isFinite(visitedAt.getTime());

  const generated = Object.values(catalog.sourceGeneratedAt).map(timestamp);
  if (generated.some((value) => value === null)) {
    usable = false;
    uncertainties.push(uncertainty('event-data-invalid', 'Event data has an invalid source timestamp, so timed sky events are unavailable.'));
  } else {
    const generatedTimes = generated as number[];
    const newest = Math.max(...generatedTimes);
    const oldest = Math.min(...generatedTimes);
    if (newest - visitedAt.getTime() > allowedFutureSkewMs) {
      usable = false;
      uncertainties.push(uncertainty('event-data-from-future', 'Event data is dated after this visit, so timed sky events are unavailable.'));
    }
    if (visitedAt.getTime() - oldest > maxAgeMs) {
      usable = false;
      uncertainties.push(uncertainty('event-data-stale', 'Event data is older than the allowed freshness window, so timed sky events are unavailable.'));
    }
  }

  const coverageFrom = timestamp(catalog.coverage.from);
  const coverageTo = timestamp(catalog.coverage.to);
  const windowFrom = visitedAt.getTime() - AURA_EVENT_WINDOW_MS;
  const windowTo = visitedAt.getTime() + AURA_EVENT_WINDOW_MS;
  if (coverageFrom === null || coverageTo === null || coverageFrom > windowFrom || coverageTo < windowTo) {
    usable = false;
    uncertainties.push(uncertainty('event-data-out-of-range', 'Event data does not cover the full sky-event window for this visit.'));
  }

  const invalidCatalogEvent = catalog.events.some((event) => (
    !isAuraSign(event.sign)
    || timestamp(event.exactAt) === null
    || !event.id
    || !event.label
  ));
  const invalidMoonIngress = catalog.moonIngresses.some((ingress) => (
    !isAuraSign(ingress.sign) || timestamp(ingress.exactAt) === null
  ));
  if (invalidCatalogEvent || invalidMoonIngress || catalog.issues.some((issue) => issue.code === 'invalid-source-timestamp')) {
    usable = false;
    if (!uncertainties.some((item) => item.code === 'event-data-invalid')) {
      uncertainties.push(uncertainty('event-data-invalid', 'Event data failed validation, so timed sky events are unavailable.'));
    }
  } else if (catalog.issues.length > 0) {
    uncertainties.push(uncertainty('event-data-invalid', 'Some malformed event records were omitted from the timed sky-event catalogue.'));
  }

  return {
    usable,
    uncertainties,
    generatedAt: catalog.generatedAt,
    coverage: catalog.coverage,
  };
}

export const COMMITTED_AURA_EVENTS = buildAuraEventCatalog();
