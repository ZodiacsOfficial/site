/**
 * Chart cards: the link a person makes from the chart marked as theirs so
 * someone can keep them on their own profile. The grammar wraps one v2
 * positions token (src/lib/share-positions.ts) with the name the sender
 * chose and the time-known bit, and nothing else — it has no field for a
 * birth date, time, place, coordinates, timezone, or account.
 *
 * The token travels in the URL fragment (`/profile/#card=…`), which the
 * browser does not send to a server; the receiving page reads it, strips
 * it from the address bar, and stores the card only if the reader adds it.
 */
import type { BodyName } from '../engine/types';
import {
  decodePositionsLink,
  encodePositionsLink,
  type PositionsShareChart,
  type PositionsShareInput,
} from '../share-positions';
import { DISPLAY_NAME_MAX, cleanDisplayName } from './me';
import type { SavedChart } from './schema';

const CARD_VERSION_PREFIX = 'c1.';
const CARD_TOKEN_MAX_LENGTH = 640;
const CARD_KEYS = new Set(['p', 'l', 'k']);
export const CARD_FRAGMENT_KEY = 'card';
/** Asks the profile header to open its card panel (e.g. after a card arrives). */
export const OPEN_CARD_EVENT = 'zodiacs:open-card-share';

interface CardWire {
  p: string;
  l: string;
  k: boolean;
}

export interface ChartCard {
  chart: PositionsShareChart;
  /** The sender's chosen name; empty when they chose none. */
  label: string;
  timeKnown: boolean;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/');
  try {
    const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/** A label is canonical when cleaning leaves it unchanged. */
function canonicalLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value === '') return '';
  const cleaned = cleanDisplayName(value);
  return cleaned === value && Array.from(value).length <= DISPLAY_NAME_MAX ? value : null;
}

export function encodeCardLink(input: { chart: PositionsShareInput; label?: string | null }): string | null {
  if (!input?.chart) return null;
  const positions = encodePositionsLink(input.chart);
  if (!positions) return null;
  const label = input.label ? cleanDisplayName(input.label) ?? '' : '';
  const wire: CardWire = { p: positions, l: label, k: input.chart.angles !== null };
  const token = CARD_VERSION_PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify(wire)));
  return token.length <= CARD_TOKEN_MAX_LENGTH ? token : null;
}

/** Decode a c1 card token. Hostile input always resolves to null. */
export function decodeCardLink(token: string): ChartCard | null {
  try {
    if (typeof token !== 'string'
      || token.length > CARD_TOKEN_MAX_LENGTH
      || !token.startsWith(CARD_VERSION_PREFIX)) return null;
    const encoded = token.slice(CARD_VERSION_PREFIX.length);
    const bytes = fromBase64Url(encoded);
    if (!bytes || toBase64Url(bytes) !== encoded) return null;
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(json);
    // Only the encoder's compact canonical JSON: one spelling, no duplicate keys.
    if (JSON.stringify(parsed) !== json
      || !parsed
      || typeof parsed !== 'object'
      || Array.isArray(parsed)) return null;
    const wire = parsed as Record<string, unknown>;
    const keys = Object.keys(wire);
    if (keys.length !== 3 || !keys.every((key) => CARD_KEYS.has(key))) return null;
    if (typeof wire.p !== 'string' || typeof wire.k !== 'boolean') return null;
    const label = canonicalLabel(wire.l);
    const chart = decodePositionsLink(wire.p);
    if (label === null || !chart || (chart.angles !== null) !== wire.k) return null;
    return { chart, label, timeKnown: wire.k };
  } catch {
    return null;
  }
}

/**
 * The positions a saved chart may share: its twelve longitudes, and the
 * angles only when the birth time is known (a reference-time chart has no
 * rising sign to give).
 */
export function positionsForChart(chart: Pick<SavedChart, 'birth' | 'summary'>): PositionsShareInput {
  return {
    bodies: chart.summary.bodies.map(({ body, lon }) => ({ body: body as BodyName, lon })),
    angles: chart.birth.timeKnown === true && chart.summary.angles
      ? { asc: chart.summary.angles.asc, mc: chart.summary.angles.mc }
      : null,
    houseSystem: chart.summary.houseSystem,
    engineVersion: chart.summary.engineVersion,
  };
}

/** Whether a received card carries exactly this saved chart's positions. */
export function cardMatchesChart(card: ChartCard, chart: Pick<SavedChart, 'birth' | 'summary'>): boolean {
  const own = encodePositionsLink(positionsForChart(chart));
  return own !== null && own === encodePositionsLink(card.chart);
}

/** The full link for a card, on the profile page of whoever opens it. */
export function cardUrl(origin: string, token: string): string {
  return `${origin}/profile/#${CARD_FRAGMENT_KEY}=${token}`;
}

/** Read a card token from a location hash such as `#card=c1.…`. */
export function cardTokenFromHash(hash: string): string | null {
  const match = /^#card=([A-Za-z0-9._-]{1,640})$/u.exec(hash);
  return match ? match[1] : null;
}
