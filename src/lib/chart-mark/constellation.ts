/**
 * The constellation: the chart mark at 44px and above. The ten planets sit
 * on one ring at their ecliptic longitudes, each tinted by the sign it
 * occupies, joined by hairlines for the major aspects between them. The
 * rising sign sits at nine o'clock when the birth time is known (a short
 * tick marks it); otherwise 0° Aries does, as on a solar wheel.
 *
 * Planets that would touch step inward to a second or third lane, so a
 * stellium stays countable. Aspect orbs come from the same engine table as
 * every other aspect on the site; conjunctions are left to the lanes.
 */
import { matchAspect } from '../engine/aspects';
import {
  MARK_SIGN_HUES,
  MARK_UNSETTLED,
  markPoint,
  normalizeLongitude,
  settledSignIndex,
  type ChartMarkSource,
} from './common';

export const MARK_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

export type MarkBody = (typeof MARK_BODIES)[number];

const DOT_RADIUS: Record<MarkBody, number> = {
  Sun: 6.4, Moon: 5.4, Mercury: 3.7, Venus: 3.9, Mars: 3.7,
  Jupiter: 3.3, Saturn: 3.1, Uranus: 2.6, Neptune: 2.6, Pluto: 2.4,
};

/** Outer ring first; a planet steps inward only when it would touch another. */
const LANES = [33, 24, 15] as const;
const DOT_GAP = 0.8;

export interface MarkDot {
  body: MarkBody;
  x: number;
  y: number;
  r: number;
  fill: string;
  lane: number;
}

export interface MarkSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MarkLine extends MarkSegment {
  a: MarkBody;
  b: MarkBody;
  /** Squares and oppositions draw dashed and fainter than trines and sextiles. */
  tense: boolean;
}

export interface MarkRimDot {
  x: number;
  y: number;
  fill: string;
}

export interface ConstellationGeometry {
  /** The Sun's settled sign hue for the faint wash behind the ring. */
  glow: string;
  dots: MarkDot[];
  lines: MarkLine[];
  /**
   * The twelve signs as pastel points just inside the rim, each at its
   * sign's middle degree and turned with the anchor: the brand's
   * twelve-disc wheel, in miniature.
   */
  rim: MarkRimDot[];
  /** The rising-sign tick, or null for an unknown birth time. */
  asc: MarkSegment | null;
}

function segment(lon: number, anchor: number, from: number, to: number): MarkSegment {
  const start = markPoint(lon, anchor, from);
  const end = markPoint(lon, anchor, to);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

function fillFor(body: MarkBody, lon: number, timeKnown: boolean): string {
  const index = settledSignIndex(body, lon, timeKnown);
  return index === null ? MARK_UNSETTLED : MARK_SIGN_HUES[index];
}

export interface ConstellationOptions {
  /** Enlarge the planets for small renderings, where the default dots read as specks. */
  dotScale?: number;
}

/** Null when the chart has no usable Sun. */
export function constellationGeometry(
  source: ChartMarkSource,
  { dotScale = 1 }: ConstellationOptions = {},
): ConstellationGeometry | null {
  const rows = MARK_BODIES.flatMap((body) => {
    const row = source.bodies.find((candidate) => candidate.body === body);
    return row && Number.isFinite(row.lon) ? [{ body, lon: normalizeLongitude(row.lon) }] : [];
  });
  const sun = rows.find((row) => row.body === 'Sun');
  if (!sun) return null;

  const asc = source.timeKnown && source.asc !== null && Number.isFinite(source.asc)
    ? normalizeLongitude(source.asc)
    : null;
  const anchor = asc ?? 0;

  const dots: MarkDot[] = [];
  for (const row of rows) {
    const r = Math.round(DOT_RADIUS[row.body] * dotScale * 100) / 100;
    for (let lane = 0; lane < LANES.length; lane += 1) {
      const point = markPoint(row.lon, anchor, LANES[lane]);
      const clear = dots.every((dot) => Math.hypot(dot.x - point.x, dot.y - point.y) >= dot.r + r + DOT_GAP);
      if (clear || lane === LANES.length - 1) {
        dots.push({ body: row.body, ...point, r, fill: fillFor(row.body, row.lon, source.timeKnown), lane });
        break;
      }
    }
  }

  const lines: MarkLine[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      // Without a birth time the Moon is a reference position, not a settled one.
      if (!source.timeKnown && (a.body === 'Moon' || b.body === 'Moon')) continue;
      const match = matchAspect(a.body, a.lon, b.body, b.lon);
      if (!match || match.def.type === 'conjunction') continue;
      const from = dots.find((dot) => dot.body === a.body)!;
      const to = dots.find((dot) => dot.body === b.body)!;
      lines.push({
        a: a.body,
        b: b.body,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        tense: match.def.type === 'square' || match.def.type === 'opposition',
      });
    }
  }

  return {
    glow: fillFor('Sun', sun.lon, source.timeKnown),
    dots,
    lines,
    rim: MARK_SIGN_HUES.map((fill, index) => ({ ...markPoint(index * 30 + 15, anchor, 44), fill })),
    asc: asc === null ? null : segment(asc, anchor, 40, 49),
  };
}
