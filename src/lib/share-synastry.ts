/**
 * Positions-only two-chart share codec for the Phase 4 send-back loop.
 *
 * Each side is an existing v2 positions token. The wrapper adds only a
 * display label and an explicit time-known bit. No date, time, place,
 * coordinates, timezone, account id, invitation id, or email can be
 * represented by this grammar.
 */
import {
  decodePositionsLink,
  encodePositionsLink,
  type PositionsShareChart,
  type PositionsShareInput,
} from './share-positions';

const SYN_VERSION_PREFIX = 's1.';
const SYN_TOKEN_MAX_LENGTH = 640;
const LABEL_MAX_LENGTH = 24;
const SYN_KEYS = new Set(['p', 'l', 'k']);

interface SynastryWire {
  p: [string, string];
  l: [string, string];
  k: [boolean, boolean];
}

export interface SynastryShareInput {
  sides: [
    { chart: PositionsShareInput; label?: string },
    { chart: PositionsShareInput; label?: string },
  ];
}

export interface SynastryShareResult {
  sides: [
    { chart: PositionsShareChart; label: string; timeKnown: boolean },
    { chart: PositionsShareChart; label: string; timeKnown: boolean },
  ];
}

function cleanLabel(value: unknown): string | null {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const label = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return Array.from(label).length <= LABEL_MAX_LENGTH ? label : null;
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

function hasExactKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === 3
    && keys.every((key) => SYN_KEYS.has(key))
    && Object.prototype.hasOwnProperty.call(value, 'p')
    && Object.prototype.hasOwnProperty.call(value, 'l')
    && Object.prototype.hasOwnProperty.call(value, 'k');
}

export function encodeSynastryLink(input: SynastryShareInput): string | null {
  if (!input || !Array.isArray(input.sides) || input.sides.length !== 2) return null;
  const first = input.sides[0];
  const second = input.sides[1];
  if (!first?.chart || !second?.chart) return null;

  const tokenA = encodePositionsLink(first.chart);
  const tokenB = encodePositionsLink(second.chart);
  const labelA = cleanLabel(first.label);
  const labelB = cleanLabel(second.label);
  if (!tokenA || !tokenB || labelA === null || labelB === null) return null;

  const wire: SynastryWire = {
    p: [tokenA, tokenB],
    l: [labelA, labelB],
    k: [first.chart.angles !== null, second.chart.angles !== null],
  };
  const token = SYN_VERSION_PREFIX
    + toBase64Url(new TextEncoder().encode(JSON.stringify(wire)));
  return token.length <= SYN_TOKEN_MAX_LENGTH ? token : null;
}

export function decodeSynastryLink(token: string): SynastryShareResult | null {
  try {
    if (typeof token !== 'string'
      || token.length > SYN_TOKEN_MAX_LENGTH
      || !token.startsWith(SYN_VERSION_PREFIX)) return null;
    const encoded = token.slice(SYN_VERSION_PREFIX.length);
    const bytes = fromBase64Url(encoded);
    if (!bytes || toBase64Url(bytes) !== encoded) return null;
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (JSON.stringify(parsed) !== json
      || !parsed
      || typeof parsed !== 'object'
      || Array.isArray(parsed)
      || !hasExactKeys(parsed as Record<string, unknown>)) return null;

    const wire = parsed as Partial<SynastryWire>;
    if (!Array.isArray(wire.p) || wire.p.length !== 2
      || !wire.p.every((value) => typeof value === 'string')
      || !Array.isArray(wire.l) || wire.l.length !== 2
      || !Array.isArray(wire.k) || wire.k.length !== 2
      || !wire.k.every((value) => typeof value === 'boolean')) return null;

    const labelA = cleanLabel(wire.l[0]);
    const labelB = cleanLabel(wire.l[1]);
    const chartA = decodePositionsLink(wire.p[0]);
    const chartB = decodePositionsLink(wire.p[1]);
    if (labelA === null || labelB === null || !chartA || !chartB) return null;
    if ((chartA.angles !== null) !== wire.k[0]
      || (chartB.angles !== null) !== wire.k[1]) return null;

    return {
      sides: [
        { chart: chartA, label: labelA, timeKnown: wire.k[0] },
        { chart: chartB, label: labelB, timeKnown: wire.k[1] },
      ],
    };
  } catch {
    return null;
  }
}

export const SYN_TOKEN_PREFIX = SYN_VERSION_PREFIX;
export const SYN_TOKEN_LIMIT = SYN_TOKEN_MAX_LENGTH;
