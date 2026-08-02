import {
  ASPECT_BODIES,
  houseOf,
  matchAspect,
  wholeSignCusps,
} from '@zodiacs/engine/internal/math';
import { bodyLongitude, longitudeSpeed } from '../../src/lib/engine/server-ephemeris.js';
import {
  BODY_NAMES,
  type AssistantChartV2,
  type BodyName,
} from './contracts.js';

const BODY_NAME_SET: ReadonlySet<string> = new Set(BODY_NAMES);
const WIRE_KEYS = new Set(['b', 'a', 'h', 'v']);
const ENGINE_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,31}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]+$/;
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;
const TRANSIT_BODIES = [
  'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly BodyName[];
const ACTIVE_TRANSIT_ORB = 3;

export interface DecodedPositionsChart {
  bodies: Array<{ body: BodyName; lon: number }>;
  angles: { asc: number; mc: number } | null;
  houseSystem: 'whole' | 'placidus';
  engineVersion: string;
}

export interface ChartFact {
  id: string;
  label: string;
  text: string;
}

export interface AssistantChartContext {
  facts: ChartFact[];
  factIds: Set<string>;
  capabilities: {
    chart: boolean;
    houses: boolean;
    transits: boolean;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
}

function canonicalBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

/** Strict server twin of src/lib/share-positions.ts's public v2 decoder. */
export function decodePositionsToken(token: string): DecodedPositionsChart | null {
  try {
    if (typeof token !== 'string' || token.length > 256 || !token.startsWith('2.')) return null;
    const payload = token.slice(2);
    if (!payload || !TOKEN_RE.test(payload)) return null;
    const bytes = Buffer.from(payload, 'base64url');
    if (canonicalBase64Url(bytes) !== payload) return null;
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed) || JSON.stringify(parsed) !== json) return null;

    const keys = Object.keys(parsed);
    const expected = Object.prototype.hasOwnProperty.call(parsed, 'a') ? 4 : 3;
    if (keys.length !== expected || !keys.every((key) => WIRE_KEYS.has(key))) return null;
    if (!Object.prototype.hasOwnProperty.call(parsed, 'b')
      || !Object.prototype.hasOwnProperty.call(parsed, 'h')
      || !Object.prototype.hasOwnProperty.call(parsed, 'v')) return null;
    if (!Array.isArray(parsed.b)
      || parsed.b.length !== BODY_NAMES.length
      || !parsed.b.every(validLongitude)) return null;
    if (parsed.h !== 'w' && parsed.h !== 'p') return null;
    if (typeof parsed.v !== 'string' || !ENGINE_VERSION_RE.test(parsed.v)) return null;

    let angles: DecodedPositionsChart['angles'] = null;
    if (Object.prototype.hasOwnProperty.call(parsed, 'a')) {
      if (!Array.isArray(parsed.a) || parsed.a.length !== 2 || !parsed.a.every(validLongitude)) return null;
      angles = { asc: parsed.a[0] as number, mc: parsed.a[1] as number };
    }

    return {
      bodies: BODY_NAMES.map((body, index) => ({ body, lon: (parsed.b as number[])[index]! })),
      angles,
      houseSystem: parsed.h === 'w' ? 'whole' : 'placidus',
      engineVersion: parsed.v,
    };
  } catch {
    return null;
  }
}

function slug(value: string): string {
  return value.toLowerCase().replaceAll(' ', '-');
}

function normalizedDifference(from: number, to: number): number {
  return ((to - from) % 360 + 360) % 360;
}

function validOrderedCusps(cusps: readonly number[]): boolean {
  if (cusps.length !== 12 || !cusps.every(validLongitude)) return false;
  for (let index = 0; index < cusps.length; index += 1) {
    const span = normalizedDifference(cusps[index]!, cusps[(index + 1) % cusps.length]!);
    if (span < 0.01 || span > 90) return false;
  }
  return true;
}

function positionLabel(longitude: number): string {
  const normalized = ((longitude % 360) + 360) % 360;
  const within = normalized % 30;
  const minutes = Math.floor((within - Math.floor(within)) * 60 + 1e-7);
  return `${Math.floor(within)}°${String(minutes).padStart(2, '0')}′ ${SIGNS[Math.floor(normalized / 30)]}`;
}

function emptyChartContext(): AssistantChartContext {
  return {
    facts: [],
    factIds: new Set(),
    capabilities: { chart: false, houses: false, transits: false },
  };
}

export function buildChartContext(
  input: AssistantChartV2 | undefined,
  now: Date = new Date(),
): AssistantChartContext | null {
  if (!input) return emptyChartContext();
  const chart = decodePositionsToken(input.positionsToken);
  if (!chart) return null;
  if (input.retrogradeBodies.some((body) => !BODY_NAME_SET.has(body))) return null;
  if (input.cusps && (chart.houseSystem !== 'placidus' || chart.angles === null || !validOrderedCusps(input.cusps))) {
    return null;
  }

  const retrogrades = new Set(input.retrogradeBodies);
  const cusps = chart.angles === null
    ? null
    : chart.houseSystem === 'whole'
      ? wholeSignCusps(chart.angles.asc)
      : input.cusps ?? null;
  const facts: ChartFact[] = chart.bodies.map(({ body, lon }) => {
    const house = cusps ? houseOf(lon, cusps) : null;
    const text = `${body} is at ${positionLabel(lon)}${house ? ` in house ${house}` : ''}${retrogrades.has(body) ? ' and is retrograde' : ''}.`;
    return { id: `chart:body:${slug(body)}`, label: body, text };
  });

  if (chart.angles) {
    facts.push(
      { id: 'chart:angle:asc', label: 'Rising sign', text: `The Ascendant is at ${positionLabel(chart.angles.asc)}.` },
      { id: 'chart:angle:mc', label: 'Midheaven', text: `The Midheaven is at ${positionLabel(chart.angles.mc)}.` },
    );
  }

  // Keep the assistant on the exact same natal-aspect surface as the chart
  // engine. The lunar nodes are placements, but are intentionally not part
  // of the canonical Sun-through-Pluto aspect search.
  const aspectBodies = chart.bodies.filter(({ body }) => ASPECT_BODIES.has(body));
  const aspectFacts: Array<ChartFact & { orb: number }> = [];
  for (let left = 0; left < aspectBodies.length; left += 1) {
    for (let right = left + 1; right < aspectBodies.length; right += 1) {
      const a = aspectBodies[left]!;
      const b = aspectBodies[right]!;
      const match = matchAspect(a.body, a.lon, b.body, b.lon);
      if (!match) continue;
      aspectFacts.push({
        id: `chart:aspect:${slug(a.body)}-${match.definition.type}-${slug(b.body)}`,
        label: `${a.body} ${match.definition.type} ${b.body}`,
        text: `${a.body} forms a ${match.definition.type} with ${b.body}, with an orb of ${match.orb.toFixed(2)}°.` ,
        orb: match.orb,
      });
    }
  }
  aspectFacts.sort((a, b) => a.orb - b.orb || a.id.localeCompare(b.id));
  facts.push(...aspectFacts.slice(0, 24).map(({ orb: _orb, ...fact }) => fact));

  let transits = false;
  if (Number.isFinite(now.getTime())) {
    try {
      const day = now.toISOString().slice(0, 10);
      const natalPoints: Array<{ body: string; lon: number }> = chart.bodies
        .filter(({ body }) => body !== 'North Node' && body !== 'South Node');
      if (chart.angles) {
        natalPoints.push(
          { body: 'ASC', lon: chart.angles.asc },
          { body: 'MC', lon: chart.angles.mc },
        );
      }
      const transitFacts: Array<ChartFact & { orb: number }> = [];
      for (const transiting of TRANSIT_BODIES) {
        const movingLongitude = bodyLongitude(transiting, now);
        const retrograde = longitudeSpeed(transiting, now) < 0;
        for (const natal of natalPoints) {
          const match = matchAspect(transiting, movingLongitude, natal.body, natal.lon);
          if (!match || match.orb > ACTIVE_TRANSIT_ORB) continue;
          transitFacts.push({
            id: `transit:${day}:${slug(transiting)}-${match.definition.type}-${slug(natal.body)}`,
            label: `${transiting} ${match.definition.type} natal ${natal.body}`,
            text: `On ${day} UTC, transiting ${transiting} at ${positionLabel(movingLongitude)}${retrograde ? ' (retrograde)' : ''} forms a ${match.definition.type} with natal ${natal.body}, with an orb of ${match.orb.toFixed(2)}°.`,
            orb: match.orb,
          });
        }
      }
      transitFacts.sort((a, b) => a.orb - b.orb || a.id.localeCompare(b.id));
      if (transitFacts.length) {
        facts.push(...transitFacts.slice(0, 12).map(({ orb: _orb, ...fact }) => fact));
      } else {
        facts.push({
          id: `transit:${day}:quiet`,
          label: 'No close major transit',
          text: `On ${day} UTC, none of the default moving planets forms a major aspect within 3° of the supplied natal planets or angles.`,
        });
      }
      transits = true;
    } catch {
      // A server-ephemeris failure removes current-timing capability entirely;
      // the model is never shown stale or partially computed transit facts.
      transits = false;
    }
  }

  return {
    facts,
    factIds: new Set(facts.map((fact) => fact.id)),
    capabilities: { chart: true, houses: cusps !== null, transits },
  };
}

const LEGACY_LINE_RE = /^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|North Node|South Node|ASC|MC):\s*(\d{1,2})°(?:\d{2}′)?\s*(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)(?:\s*[·,]\s*house\s+(1[0-2]|[1-9]))?(?:\s*·\s*retrograde)?$/i;

/**
 * Compatibility parser for the cached v1 client. It forwards only the exact
 * placements grammar that client generated, so a free-form string cannot
 * smuggle names, dates, places, coordinates, or extra instructions upstream.
 */
export function buildLegacyChartContext(value: string | undefined): AssistantChartContext {
  if (!value) return emptyChartContext();
  const facts: ChartFact[] = [];
  let houses = false;
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^Tropical chart placements:$/i.test(line)) continue;
    const match = LEGACY_LINE_RE.exec(line);
    if (!match) continue;
    const label = match[1]!;
    const house = match[4];
    houses ||= Boolean(house);
    const id = label === 'ASC' || label === 'MC'
      ? `chart:angle:${label.toLowerCase()}`
      : `chart:body:${slug(label)}`;
    facts.push({ id, label, text: line });
  }
  return {
    facts,
    factIds: new Set(facts.map((fact) => fact.id)),
    capabilities: { chart: facts.length > 0, houses, transits: false },
  };
}

export function chartFactsPrompt(context: AssistantChartContext): string {
  if (!context.facts.length) return 'No chart is attached. Do not infer any personal placements.';
  return [
    'DETERMINISTIC CHART FACTS (computed by Zodiacs; interpretation only):',
    ...context.facts.map((fact) => `[${fact.id}] ${fact.text}`),
  ].join('\n');
}
