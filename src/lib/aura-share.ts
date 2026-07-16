import { AURA_SIGN_ORDER, type AuraEventKind, type AuraSign } from './aura/types';

const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);
const EVENT_KIND_SET = new Set<AuraEventKind>(['ingress', 'lunation', 'station', 'eclipse']);
const PUBLIC_FOCUS_TOKEN = Symbol('registry-aura-public-focus');
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const EXACT_EVENT_WINDOW_MS = 24 * 60 * 60 * 1_000;

export const AURA_SHARE_BODIES = new Set([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]);

export interface AuraShareSkyEvent {
  kind: AuraEventKind;
  sign: AuraSign;
  exactAt: string;
  /** Catalog body for the event ("Sun", "Mercury"); validated when present. */
  body?: string | null;
  /** Catalog detail ("total solar", "direct", "full"); passed through opaquely. */
  eventType?: string | null;
}

export interface AuraSharePublicInput {
  heldSigns: readonly AuraSign[];
  skyAt: string;
  currentSky: {
    sun: AuraSign;
    moon: AuraSign;
  };
  activeEvents: readonly AuraShareSkyEvent[];
}

export type AuraShareFocusReason = 'exact-event' | 'moon' | 'sun' | 'zodiac-order';

export interface AuraShareFocus {
  readonly [PUBLIC_FOCUS_TOKEN]: true;
  readonly sign: AuraSign;
  readonly reason: AuraShareFocusReason;
  readonly eventKind: AuraEventKind | null;
  readonly eventAt: string | null;
  readonly eventBody: string | null;
  readonly eventDetail: string | null;
}

function publicFocus(
  sign: AuraSign,
  reason: AuraShareFocusReason,
  eventKind: AuraEventKind | null,
  eventAt: string | null,
  eventBody: string | null = null,
  eventDetail: string | null = null,
): AuraShareFocus {
  const focus = { sign, reason, eventKind, eventAt, eventBody, eventDetail } as AuraShareFocus;
  Object.defineProperty(focus, PUBLIC_FOCUS_TOKEN, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(focus);
}

export function isAuraShareFocus(value: unknown): value is AuraShareFocus {
  return Boolean(
    value
    && typeof value === 'object'
    && (value as Partial<AuraShareFocus>)[PUBLIC_FOCUS_TOKEN] === true,
  );
}

export function assertAuraShareSign(
  value: unknown,
  field: string,
): asserts value is AuraSign {
  if (typeof value !== 'string' || !SIGN_SET.has(value)) {
    throw new TypeError(`${field} must be a canonical zodiac sign.`);
  }
}

const assertSign: typeof assertAuraShareSign = assertAuraShareSign;

export const AURA_SHARE_EVENT_KINDS: ReadonlySet<AuraEventKind> = EVENT_KIND_SET;

export function auraShareDateMs(value: unknown, field: string): number {
  if (typeof value !== 'string' || !ISO_INSTANT.test(value)) {
    throw new TypeError(`${field} must be an ISO date.`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be an ISO date.`);
  return parsed;
}

/**
 * Selects the social-card sign from public record + sky facts only.
 * Page-level natal evidence is deliberately absent from this interface.
 */
export function selectAuraShareFocus(input: AuraSharePublicInput): AuraShareFocus | null {
  const skyAt = auraShareDateMs(input.skyAt, 'skyAt');
  const held = new Set<AuraSign>();
  for (const sign of input.heldSigns) {
    assertSign(sign, 'heldSigns[]');
    held.add(sign);
  }
  assertSign(input.currentSky.sun, 'currentSky.sun');
  assertSign(input.currentSky.moon, 'currentSky.moon');

  const events = input.activeEvents.map((event, index) => {
    assertSign(event.sign, `activeEvents[${index}].sign`);
    if (!EVENT_KIND_SET.has(event.kind)) {
      throw new TypeError(`activeEvents[${index}].kind must be a supported event kind.`);
    }
    if (event.body != null && !AURA_SHARE_BODIES.has(event.body)) {
      throw new TypeError(`activeEvents[${index}].body must be a known body.`);
    }
    return { ...event, exactMs: auraShareDateMs(event.exactAt, `activeEvents[${index}].exactAt`) };
  });

  if (held.size === 0) return null;
  const event = events
    .filter((candidate) => (
      held.has(candidate.sign)
      && Math.abs(candidate.exactMs - skyAt) <= EXACT_EVENT_WINDOW_MS
    ))
    .sort((a, b) => (
      Math.abs(a.exactMs - skyAt) - Math.abs(b.exactMs - skyAt)
      || AURA_SIGN_ORDER.indexOf(a.sign) - AURA_SIGN_ORDER.indexOf(b.sign)
      || a.kind.localeCompare(b.kind)
    ))[0];
  if (event) {
    return publicFocus(
      event.sign,
      'exact-event',
      event.kind,
      event.exactAt,
      event.body ?? null,
      event.eventType ?? null,
    );
  }
  if (held.has(input.currentSky.moon)) {
    return publicFocus(input.currentSky.moon, 'moon', null, null);
  }
  if (held.has(input.currentSky.sun)) {
    return publicFocus(input.currentSky.sun, 'sun', null, null);
  }
  const sign = AURA_SIGN_ORDER.find((candidate) => held.has(candidate));
  return sign ? publicFocus(sign, 'zodiac-order', null, null) : null;
}
