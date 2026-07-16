import { signBySlug, signForLongitude } from '../signs';
import type { SavedChart } from '../profile/schema';
import type {
  AuraNextActivation,
  AuraSign,
  AuraSignContext,
} from './types';

// Shared consumer-facing Aura copy. This module must stay importable by the
// eager island bundle AND by build-time Astro frontmatter, so it may depend
// only on signs, profile types, and Aura types — never on the composer or an
// engine module.

const WHEEL_PLANETS = new Set([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]);

// These stamps sit on the result render path; formatter construction is ~50×
// the cost of a reuse, so the fixed en/UTC formatters are built once.
const LONG_DATE = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
const DATE_TIME = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});
const SHORT_DAY = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Long-form stamp: "July 16, 2026 UTC". */
export function auraDateStamp(value: string): string {
  return `${LONG_DATE.format(new Date(value))} UTC`;
}

/** Short stamp with time: "Jul 23, 2026, 10:56 PM UTC". */
export function auraDateTime(value: string): string {
  return DATE_TIME.format(new Date(value));
}

/**
 * "yesterday" / "N days earlier" when `earlierIso` falls on an earlier UTC
 * calendar day than `laterIso`; null when both stamps share a UTC day.
 */
export function auraRelativeDayNote(earlierIso: string, laterIso: string): string | null {
  const day = (value: string) => Math.floor(Date.parse(value) / 86_400_000);
  const difference = day(laterIso) - day(earlierIso);
  if (!Number.isFinite(difference) || difference <= 0) return null;
  return difference === 1 ? 'yesterday' : `${difference} days earlier`;
}

export function auraRecordSubject(mode: 'pasted' | 'connected' | 'restored' | 'example'): string {
  if (mode === 'connected') return 'The connected address carries';
  if (mode === 'example') return 'The illustrative record includes';
  return 'This address carries';
}

/** Fact-only reason for the focal sign; no ranking or repo vocabulary. */
export function auraFocalReason(
  context: AuraSignContext | null,
  skyAt: string,
  illustrative = false,
): string {
  if (!context)
    return 'The chart is shown without inventing a connection to an empty public wallet record.';
  const sign = signBySlug(context.sign).name;
  const event = context.activeNow.find(
    (evidence) => evidence.source === 'event',
  );
  if (event?.source === 'event') {
    return `${event.label} is the nearest exact event to this visit inside its ±24-hour window. Its exact date is ${auraDateStamp(event.exactAt)}.`;
  }
  if (context.activeNow.some((evidence) => evidence.kind === 'current-moon')) {
    return `The Moon is in ${sign} in the sky of ${auraDateStamp(skyAt)}.`;
  }
  if (context.activeNow.some((evidence) => evidence.kind === 'current-sun')) {
    return `The Sun is in ${sign} in the sky of ${auraDateStamp(skyAt)}.`;
  }
  if (context.natalEcho.length > 0) {
    // The example must never claim a "selected" chart it says it never read.
    return illustrative
      ? `${sign} appears in the example chart; no held sign has a stronger dated sky signal.`
      : `${sign} appears in the selected birth chart; no held sign has a stronger dated sky signal.`;
  }
  return 'No dated sky or chart signal favors any held sign, so zodiac order chooses.';
}

function shortDayStamp(value: string): string {
  return SHORT_DAY.format(new Date(value));
}

interface AuraSkyPair {
  sun: AuraSign;
  moon: AuraSign;
}

/**
 * One dated sentence naming what visibly changed in the sky since a restored
 * reading was saved; null when the Sun and Moon signs are unchanged.
 */
export function auraSinceLastLine(
  previous: AuraSkyPair,
  current: AuraSkyPair,
  savedAt: string,
): string | null {
  const sunMoved = previous.sun !== current.sun;
  const moonMoved = previous.moon !== current.moon;
  if (!sunMoved && !moonMoved) return null;
  const stamp = shortDayStamp(savedAt);
  if (sunMoved && moonMoved) {
    return `Since your last reading (${stamp}), the Sun has moved into ${signBySlug(current.sun).name} and the Moon into ${signBySlug(current.moon).name}.`;
  }
  if (moonMoved) {
    return `Since your last reading (${stamp}), the Moon has moved from ${signBySlug(previous.moon).name} into ${signBySlug(current.moon).name}.`;
  }
  return `Since your last reading (${stamp}), the Sun has moved from ${signBySlug(previous.sun).name} into ${signBySlug(current.sun).name}.`;
}

/** "Next on the calendar" line, sourced from the committed catalogs. */
export function auraCalendarLine(next: AuraNextActivation | null): string {
  if (!next) return 'No held-sign event falls within the published calendar’s range.';
  if (next.source === 'event-catalog') {
    return `Across the held signs, ${next.label} comes next — exact ${auraDateTime(next.at)}; its ±24-hour window opens ${auraDateTime(next.beginsAt)}.`;
  }
  return `Across the held signs, the Moon enters ${signBySlug(next.sign).name} next — exact ${auraDateTime(next.at)}, from the Registry’s published sky calendar.`;
}

/**
 * Natal-only description for the optional full wheel. Honors the same
 * unknown-time exclusions as Aura evidence: no Moon, no angles, no degrees.
 */
export function auraWheelDescription(chart: SavedChart): string {
  // Non-finite saved longitudes are expected input (the composer records an
  // uncertainty for them); the description simply omits those points.
  const natal = chart.summary.bodies
    .filter((body) => (
      WHEEL_PLANETS.has(body.body)
      && Number.isFinite(body.lon)
      && (chart.birth.timeKnown || body.body !== 'Moon')
    ))
    .map((body) => `${body.body} in ${signForLongitude(body.lon).name}`);
  if (chart.birth.timeKnown && chart.summary.angles) {
    if (Number.isFinite(chart.summary.angles.asc)) {
      natal.push(`Ascendant in ${signForLongitude(chart.summary.angles.asc).name}`);
    }
    if (Number.isFinite(chart.summary.angles.mc)) {
      natal.push(`Midheaven in ${signForLongitude(chart.summary.angles.mc).name}`);
    }
  }
  return `Selected birth chart: ${natal.join(', ')}.`;
}
