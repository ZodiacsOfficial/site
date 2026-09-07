/**
 * Void-of-course Moon: the stretch between the Moon's last exact Ptolemaic
 * aspect in a sign and its ingress into the next. Build-time only — this
 * module reads the full ephemeris through ./full and is never shipped to
 * the browser. Aspects are the five Ptolemaic ones (conjunction, sextile,
 * square, trine, opposition) between the Moon and, by default, the Sun and
 * the eight planets; the traditional Sun-to-Saturn set is available as an
 * option. All instants are UTC.
 */
import { bodyLongitude } from './full';
import { findLongitudeCrossingsWith, type BodyLongitudeAt } from './longitude-crossings';

const DAY = 86_400_000;

export const VOID_BODIES_MODERN = [
  'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;
export const VOID_BODIES_TRADITIONAL = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;
export type VoidBody = (typeof VOID_BODIES_MODERN)[number];

export type VoidAspect = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
export const PTOLEMAIC_ASPECTS: readonly { type: VoidAspect; angle: number }[] = [
  { type: 'conjunction', angle: 0 },
  { type: 'sextile', angle: 60 },
  { type: 'square', angle: 90 },
  { type: 'trine', angle: 120 },
  { type: 'opposition', angle: 180 },
];

/** Each aspect as the Moon meets it from either side: a sextile perfects at +60° and at −60° (300°). */
export const ASPECT_OFFSETS: readonly { type: VoidAspect; offset: number }[] = PTOLEMAIC_ASPECTS.flatMap(({ type, angle }) => (
  angle === 0 || angle === 180 ? [{ type, offset: angle }] : [{ type, offset: angle }, { type, offset: 360 - angle }]
));

export interface MoonIngress {
  /** Instant the Moon enters `signIndex` (0 = Aries). */
  at: Date;
  signIndex: number;
}

export interface MoonAspect {
  at: Date;
  body: VoidBody;
  aspect: VoidAspect;
  /** The Moon's longitude at perfection, degrees 0–360. */
  moonLon: number;
}

export interface VoidWindow {
  /** Instant of the last exact aspect in the sign; the void begins here. */
  from: Date;
  /** Instant of the next ingress; the void ends here. */
  to: Date;
  /** Null only when the Moon made no Ptolemaic aspect at all while in the sign. */
  lastAspect: MoonAspect | null;
  /** Sign the Moon is leaving (0 = Aries). */
  signIndex: number;
  /** Sign the Moon enters at `to`. */
  nextSignIndex: number;
}

export interface VoidOptions {
  bodies?: readonly VoidBody[];
  longitudeAt?: BodyLongitudeAt;
}

/** Signed shortest angular distance a→b, degrees (−180, 180]. */
function delta(a: number, b: number): number {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/** Every Moon ingress in (from, to], in time order. */
export function moonIngresses(from: Date, to: Date, longitudeAt: BodyLongitudeAt = bodyLongitude): MoonIngress[] {
  const out: MoonIngress[] = [];
  for (let signIndex = 0; signIndex < 12; signIndex += 1) {
    // Six-hour steps: the Moon covers at most about 4° in six hours, well
    // inside the crossing helper's ±90° wrap guard.
    for (const crossing of findLongitudeCrossingsWith(longitudeAt, 'Moon', signIndex * 30, from, to, 0.25)) {
      if (!crossing.retrograde) out.push({ at: crossing.at, signIndex });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Every exact Ptolemaic aspect the Moon makes to `bodies` in (from, to].
 * One three-hour sampling pass over the window; each sign change of the
 * signed separation is refined by bisection. The Moon always outruns the
 * planets, so the separation is monotonic between samples.
 */
export function moonAspects(from: Date, to: Date, options: VoidOptions = {}): MoonAspect[] {
  const bodies = options.bodies ?? VOID_BODIES_MODERN;
  const longitudeAt = options.longitudeAt ?? bodyLongitude;
  const step = DAY / 8;
  const fromT = from.getTime();
  const toT = to.getTime();
  if (!(toT > fromT)) return [];

  const pairs = bodies.flatMap((body) => ASPECT_OFFSETS.map((aspect) => ({ body, aspect })));
  const separation = (body: VoidBody, angle: number, t: number): number => {
    const date = new Date(t);
    return delta(longitudeAt(body, date) + angle, longitudeAt('Moon', date));
  };

  const out: MoonAspect[] = [];
  let prevT = fromT;
  let prev = pairs.map(({ body, aspect }) => separation(body, aspect.offset, prevT));

  while (prevT < toT) {
    const t = Math.min(prevT + step, toT);
    const moonLon = longitudeAt('Moon', new Date(t));
    const bodyLons = new Map<VoidBody, number>();
    for (const body of bodies) bodyLons.set(body, longitudeAt(body, new Date(t)));

    pairs.forEach(({ body, aspect }, i) => {
      const cur = delta((bodyLons.get(body) ?? 0) + aspect.offset, moonLon);
      const before = prev[i];
      if (cur === 0 && before !== 0 && Math.abs(before) < 90) {
        out.push({ at: new Date(t), body, aspect: aspect.type, moonLon });
      } else if (before !== 0 && cur !== 0 && Math.sign(cur) !== Math.sign(before)
        && Math.abs(cur) < 90 && Math.abs(before) < 90) {
        let lo = prevT;
        let hi = t;
        const rising = cur > before;
        for (let k = 0; k < 26; k += 1) {
          const mid = (lo + hi) / 2;
          const d = separation(body, aspect.offset, mid);
          if ((d > 0) === rising) hi = mid;
          else lo = mid;
        }
        const at = new Date(hi);
        out.push({ at, body, aspect: aspect.type, moonLon: longitudeAt('Moon', at) });
      }
      prev[i] = cur;
    });
    prevT = t;
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Every void-of-course window whose ending ingress falls in (from, to].
 * The Moon spends under three days in a sign, so a scan starting four
 * days earlier always supplies the ingress that opened each sign.
 */
export function voidOfCourseWindows(from: Date, to: Date, options: VoidOptions = {}): VoidWindow[] {
  const longitudeAt = options.longitudeAt ?? bodyLongitude;
  const scanFrom = new Date(from.getTime() - 4 * DAY);
  const ingresses = moonIngresses(scanFrom, to, longitudeAt);
  const windows: VoidWindow[] = [];
  for (let i = 1; i < ingresses.length; i += 1) {
    const entered = ingresses[i - 1];
    const leaving = ingresses[i];
    if (leaving.at.getTime() <= from.getTime()) continue;
    const aspects = moonAspects(entered.at, leaving.at, { ...options, longitudeAt })
      .filter((aspect) => aspect.at.getTime() < leaving.at.getTime());
    const lastAspect = aspects.length > 0 ? aspects[aspects.length - 1] : null;
    windows.push({
      from: lastAspect ? lastAspect.at : entered.at,
      to: leaving.at,
      lastAspect,
      signIndex: entered.signIndex,
      nextSignIndex: leaving.signIndex,
    });
  }
  return windows;
}

export interface VoidStatus {
  at: Date;
  isVoid: boolean;
  /** The window in progress at `at`, when the Moon is void. */
  current: VoidWindow | null;
  /** The next window to begin after `at`. */
  next: VoidWindow | null;
}

/** Whether the Moon is void of course at `at`, with the window in progress and the next one. */
export function voidStatus(at: Date, options: VoidOptions = {}): VoidStatus {
  const windows = voidOfCourseWindows(new Date(at.getTime() - 3 * DAY), new Date(at.getTime() + 6 * DAY), options);
  const t = at.getTime();
  const current = windows.find((w) => w.from.getTime() <= t && t < w.to.getTime()) ?? null;
  const next = windows.find((w) => w.from.getTime() > t) ?? null;
  return { at, isVoid: current !== null, current, next };
}
