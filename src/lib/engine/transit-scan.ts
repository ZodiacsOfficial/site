/**
 * Exact major-aspect contacts between a moving sky and a fixed natal chart.
 *
 * The public input is only the chart's longitudes and ASC/MC. Ephemeris work
 * stays behind full.ts, and every exact pass is retained — including the
 * direct/retrograde/direct sequence around a station.
 */
import { bodyLongitude, computeBodies, longitudeSpeed } from './full';
import { findLongitudeCrossings } from './returns';
import type { Angles, AspectType, BodyName, BodyPosition } from './types';

const DAY = 86_400_000;
const MINUTE = 60_000;
const BOUNDARY_EPSILON_MS = 100;

export type TransitBody = Exclude<BodyName, 'North Node' | 'South Node'>;
export type NatalPoint = TransitBody | 'ASC' | 'MC';

export interface NatalTransitChart {
  bodies: readonly Pick<BodyPosition, 'body' | 'lon'>[];
  angles?: Pick<Angles, 'asc' | 'mc'> | null;
}

export interface NatalTransitPoint {
  name: NatalPoint;
  lon: number;
}

export interface TransitContact {
  transitBody: TransitBody;
  natalPoint: NatalPoint;
  aspect: AspectType;
  /** Exact bisection result in UTC; consumers may display it to the minute. */
  exactUtc: string;
  /** 1-based position of this exact hit among matching contacts in the scan window. */
  pass: number;
  /** Total exact hits for this body, natal point, and aspect in the scan window. */
  passCount: number;
}

type UnnumberedTransitContact = Omit<TransitContact, 'pass' | 'passCount'> & { exactMs: number };

export interface TransitScanOptions {
  /** The Moon is omitted unless this is true. */
  includeMoon?: boolean;
  /** Optional bounded subset for a focused timeline or test fixture. */
  transitBodies?: readonly TransitBody[];
}

export const TRANSIT_BODY_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly TransitBody[];

export const DEFAULT_TRANSIT_BODIES = [
  'Sun', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly TransitBody[];

export const SLOW_TRANSIT_BODIES = [
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly TransitBody[];

export const MAJOR_ASPECT_ORDER = [
  'conjunction', 'sextile', 'square', 'trine', 'opposition',
] as const satisfies readonly AspectType[];

export const NATAL_POINT_ORDER = [
  ...TRANSIT_BODY_ORDER, 'ASC', 'MC',
] as const satisfies readonly NatalPoint[];

const ASPECT_TARGET_OFFSETS: Record<AspectType, readonly number[]> = {
  conjunction: [0],
  sextile: [60, 300],
  square: [90, 270],
  trine: [120, 240],
  opposition: [180],
};

const STEP_DAYS: Record<TransitBody, number> = {
  Sun: 1,
  Moon: 0.25,
  Mercury: 0.5,
  Venus: 1,
  Mars: 1,
  Jupiter: 2,
  Saturn: 5,
  Uranus: 5,
  Neptune: 5,
  Pluto: 5,
};

const TRANSIT_BODY_SET = new Set<BodyName>(TRANSIT_BODY_ORDER);
const BODY_INDEX = new Map<TransitBody, number>(TRANSIT_BODY_ORDER.map((body, index) => [body, index]));
const NATAL_INDEX = new Map<NatalPoint, number>(
  NATAL_POINT_ORDER.map((point, index) => [point, index] as const),
);
const ASPECT_INDEX = new Map<AspectType, number>(MAJOR_ASPECT_ORDER.map((aspect, index) => [aspect, index]));

function validDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function assertWindow(from: Date, to: Date): void {
  if (!validDate(from) || !validDate(to)) throw new RangeError('Transit window dates must be valid.');
  if (from.getTime() > to.getTime()) throw new RangeError('Transit window must have from <= to.');
}

function normalizeLongitude(lon: number): number {
  if (!Number.isFinite(lon)) throw new RangeError('Transit longitudes must be finite.');
  return ((lon % 360) + 360) % 360;
}

function angularError(targetLon: number, transitLon: number): number {
  const distance = Math.abs((((transitLon - targetLon + 540) % 360) + 360) % 360 - 180);
  return distance;
}

function signedAngularDelta(referenceLon: number, lon: number): number {
  return ((((lon - referenceLon + 540) % 360) + 360) % 360) - 180;
}

function isTransitBody(body: BodyName): body is TransitBody {
  return TRANSIT_BODY_SET.has(body);
}

/** Pure extraction of the ten natal planets plus ASC/MC, in stable order. */
export function natalTransitPoints(chart: NatalTransitChart): NatalTransitPoint[] {
  const byBody = new Map<TransitBody, number>();
  for (const position of chart.bodies) {
    if (isTransitBody(position.body)) byBody.set(position.body, normalizeLongitude(position.lon));
  }

  const points = TRANSIT_BODY_ORDER.flatMap<NatalTransitPoint>((body) => {
    const lon = byBody.get(body);
    return lon === undefined ? [] : [{ name: body, lon }];
  });

  if (chart.angles) {
    points.push(
      { name: 'ASC', lon: normalizeLongitude(chart.angles.asc) },
      { name: 'MC', lon: normalizeLongitude(chart.angles.mc) },
    );
  }
  return points;
}

/** The one or two zodiac degrees a mover must cross for an exact aspect. */
export function aspectTargetLongitudes(natalLon: number, aspect: AspectType): number[] {
  const lon = normalizeLongitude(natalLon);
  return ASPECT_TARGET_OFFSETS[aspect].map((offset) => normalizeLongitude(lon + offset));
}

/** Convenience for callers that have an instant and already-computed angles. */
export function computeNatalTransitChart(
  utc: Date,
  angles: Pick<Angles, 'asc' | 'mc'> | null = null,
): NatalTransitChart {
  if (!validDate(utc)) throw new RangeError('Natal chart date must be valid.');
  return {
    bodies: computeBodies(utc).filter((position) => isTransitBody(position.body)),
    angles,
  };
}

function selectedTransitBodies(options: TransitScanOptions): TransitBody[] {
  const selected = new Set<TransitBody>(options.transitBodies ?? DEFAULT_TRANSIT_BODIES);
  if (options.includeMoon) selected.add('Moon');
  else selected.delete('Moon');
  return TRANSIT_BODY_ORDER.filter((body) => selected.has(body));
}

function refineLongitudeExtremum(
  body: TransitBody,
  fromMs: number,
  toMs: number,
  maximize: boolean,
): Date {
  const referenceLon = bodyLongitude(body, new Date((fromMs + toMs) / 2));
  const valueAt = (time: number) => {
    const lon = bodyLongitude(body, new Date(time));
    return referenceLon + signedAngularDelta(referenceLon, lon);
  };

  let lo = fromMs;
  let hi = toMs;
  for (let i = 0; i < 56; i += 1) {
    const third = (hi - lo) / 3;
    const left = lo + third;
    const right = hi - third;
    const leftValue = valueAt(left);
    const rightValue = valueAt(right);
    if (maximize ? leftValue < rightValue : leftValue > rightValue) lo = left;
    else hi = right;
  }

  const center = Math.round((lo + hi) / 2);
  let bestMs = center;
  let bestValue = valueAt(center);
  for (let offset = -3; offset <= 3; offset += 1) {
    const candidateMs = center + offset;
    const candidateValue = valueAt(candidateMs);
    if (maximize ? candidateValue > bestValue : candidateValue < bestValue) {
      bestMs = candidateMs;
      bestValue = candidateValue;
    }
  }
  return new Date(bestMs);
}

function stationBreakpoints(
  body: TransitBody,
  from: Date,
  to: Date,
  stepDays: number,
): Date[] {
  const stations: Date[] = [];
  const stepMs = stepDays * DAY;
  const toMs = to.getTime();
  let previousMs = from.getTime();
  let previousSpeed = longitudeSpeed(body, from);

  while (previousMs < toMs) {
    const currentMs = Math.min(previousMs + stepMs, toMs);
    const currentSpeed = longitudeSpeed(body, new Date(currentMs));
    const previousSign = Math.sign(previousSpeed);
    const currentSign = Math.sign(currentSpeed);

    if (!(previousSign === 0 && currentSign === 0)
      && (previousSign === 0 || currentSign === 0 || previousSign !== currentSign)) {
      stations.push(refineLongitudeExtremum(
        body,
        Math.max(from.getTime(), previousMs - stepMs),
        Math.min(toMs, currentMs + stepMs),
        previousSpeed > currentSpeed,
      ));
    }

    previousMs = currentMs;
    previousSpeed = currentSpeed;
  }

  return stations
    .filter((station) => station.getTime() > from.getTime() && station.getTime() < toMs)
    .filter((station, index, all) => index === 0 || station.getTime() - all[index - 1].getTime() > MINUTE);
}

/**
 * Compute every exact major transit contact in the inclusive UTC window.
 *
 * Each body/point/aspect combination is a fixed-size scan over the window, so
 * runtime grows linearly with the requested duration. The existing crossing
 * solver performs the coarse search and 24-step bisection. Each body scan is
 * split at its stations, so a direct/retrograde pair inside one coarse step
 * cannot cancel into equal-sign endpoints.
 */
export function scanTransitContacts(
  natal: NatalTransitChart,
  from: Date,
  to: Date,
  options: TransitScanOptions = {},
): TransitContact[] {
  assertWindow(from, to);
  const points = natalTransitPoints(natal);
  const bodies = selectedTransitBodies(options);
  if (points.length === 0 || bodies.length === 0) return [];

  const fromMs = from.getTime();
  const toMs = to.getTime();
  const contacts = new Map<string, UnnumberedTransitContact[]>();

  for (const transitBody of bodies) {
    const stepDays = STEP_DAYS[transitBody];
    const stations = stationBreakpoints(transitBody, from, to, stepDays);
    const boundaries = [from, ...stations, to];

    for (const point of points) {
      for (const aspect of MAJOR_ASPECT_ORDER) {
        for (const targetLon of aspectTargetLongitudes(point.lon, aspect)) {
          const hits = boundaries.slice(0, -1).flatMap((boundary, index) =>
            findLongitudeCrossings(transitBody, targetLon, boundary, boundaries[index + 1], stepDays));

          // A target exactly at an extremum touches without changing sign.
          // Use a half-second longitude envelope only as a tangent fallback
          // when the monotonic segments found no nearby crossing themselves.
          for (const station of stations) {
            const stationMs = station.getTime();
            const stationLon = bodyLongitude(transitBody, station);
            const resolution = Math.max(
              angularError(stationLon, bodyLongitude(transitBody, new Date(stationMs - 500))),
              angularError(stationLon, bodyLongitude(transitBody, new Date(stationMs + 500))),
            ) + 1e-12;
            const hasNearbyCrossing = hits.some((hit) =>
              Math.abs(hit.at.getTime() - stationMs) <= MINUTE);
            if (!hasNearbyCrossing && angularError(targetLon, stationLon) <= resolution) {
              hits.push({ at: station, retrograde: false });
            }
          }

          // findLongitudeCrossings starts sampling after `from`, so retain a
          // root that lands exactly on the inclusive lower boundary.
          if (angularError(targetLon, bodyLongitude(transitBody, from)) < 1e-8) {
            hits.unshift({ at: new Date(fromMs), retrograde: false });
          }

          for (const hit of hits) {
            let exactMs = hit.at.getTime();
            if (exactMs < fromMs - BOUNDARY_EPSILON_MS || exactMs > toMs + BOUNDARY_EPSILON_MS) continue;
            if (Math.abs(exactMs - fromMs) <= BOUNDARY_EPSILON_MS) exactMs = fromMs;
            if (Math.abs(exactMs - toMs) <= BOUNDARY_EPSILON_MS) exactMs = toMs;

            const exact = new Date(exactMs);
            const contact = {
              transitBody,
              natalPoint: point.name,
              aspect,
              exactUtc: exact.toISOString(),
            };
            const key = `${contact.transitBody}|${contact.natalPoint}|${contact.aspect}`;
            const sameContact = contacts.get(key) ?? [];
            const duplicate = sameContact.find((existing) => Math.abs(existing.exactMs - exactMs) < 100);
            if (!duplicate) {
              sameContact.push({ ...contact, exactMs });
              contacts.set(key, sameContact);
            }
          }
        }
      }
    }
  }

  const numberedContacts = [...contacts.values()].flatMap((group) => {
    const chronological = [...group].sort((a, b) => a.exactMs - b.exactMs);
    const passCount = chronological.length;
    return chronological.map((contact, index) => ({
      ...contact,
      pass: index + 1,
      passCount,
    }));
  });

  return numberedContacts.sort((a, b) =>
    a.exactUtc.localeCompare(b.exactUtc)
    || (BODY_INDEX.get(a.transitBody) ?? 0) - (BODY_INDEX.get(b.transitBody) ?? 0)
    || (NATAL_INDEX.get(a.natalPoint) ?? 0) - (NATAL_INDEX.get(b.natalPoint) ?? 0)
    || (ASPECT_INDEX.get(a.aspect) ?? 0) - (ASPECT_INDEX.get(b.aspect) ?? 0))
    .map(({ exactMs: _exactMs, ...contact }) => contact);
}
