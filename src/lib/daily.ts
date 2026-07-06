/**
 * The daily layer: turns src/data/daily.json into per-sign lines using
 * the solar-house convention every sun-sign column quietly relies on —
 * your sign becomes the first house and today's planets fall where they
 * fall. Everything here is a pure function of the committed JSON, and
 * every rendered line carries its receipt.
 */
import { SIGN_SLUGS } from './signs';

export interface DailyBody {
  body: string;
  lon: number;
  sign: string;
  degree: number;
  retrograde: boolean;
}

export interface DailyEvent {
  kind: 'ingress' | 'lunation' | 'station' | 'aspect';
  at: string;
  planet?: string;
  sign?: string;
  type?: string;
  degree?: number;
  a?: string;
  b?: string;
  retrograde?: boolean;
}

export interface Daily {
  date: string;
  bodies: DailyBody[];
  moon: { phase: string; illumination: number };
  events: DailyEvent[];
}

export interface DailyLine {
  text: string;
  receipt: string;
}

export interface DailyReading {
  headline: string;
  lines: DailyLine[];
}

const ORDINAL = [
  '', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
  'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
];

/** Whole-sign solar house of a planet for a given sun sign. */
export function solarHouse(planetSign: string, sunSign: string): number {
  const p = SIGN_SLUGS.indexOf(planetSign);
  const s = SIGN_SLUGS.indexOf(sunSign);
  return ((p - s + 12) % 12) + 1;
}

/**
 * One line per planet-in-house — dry, specific, second person. The
 * houses read as life areas, not fortunes; the verbs stay observational.
 */
const HOUSE_THEME: Record<number, string> = {
  1: 'how you look, start, and come across',
  2: 'money, possessions, and what steadies you',
  3: 'errands, siblings, messages, and the near neighborhood',
  4: 'home, family, and the private floor of your life',
  5: 'pleasure, romance, children, and what you make for joy',
  6: 'work in progress, health routines, and the daily load',
  7: 'partners, the people directly across the table',
  8: 'shared money, debts, intimacy, and what gets merged',
  9: 'travel, study, belief, and the longer view',
  10: 'career, reputation, and what the public sees',
  11: 'friends, groups, and the future you are pointing at',
  12: 'rest, retreat, and what runs under the surface',
};

const PLANET_VERB: Record<string, string> = {
  Moon: 'The Moon spends today in',
  Sun: 'The Sun is moving through',
  Mercury: 'Mercury is working',
  Venus: 'Venus is warming',
  Mars: 'Mars is pushing on',
  Jupiter: 'Jupiter is stretching',
  Saturn: 'Saturn is testing',
  Uranus: 'Uranus is unsettling',
  Neptune: 'Neptune is blurring',
  Pluto: 'Pluto is slowly rewiring',
};

function houseLine(body: DailyBody, house: number): DailyLine {
  const rx = body.retrograde ? ', retrograde' : '';
  return {
    text: `${PLANET_VERB[body.body] ?? `${body.body} is in`} your ${ORDINAL[house]} house — ${HOUSE_THEME[house]}.`,
    receipt: `${body.body} ${body.degree.toFixed(1)}° ${cap(body.sign)}${rx} · house ${house}`,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const utcTime = (at: string) => `${at.slice(11, 16)} UTC`;

function eventLine(e: DailyEvent, sunSign: string): DailyLine | null {
  if (e.kind === 'ingress' && e.planet && e.sign) {
    const house = solarHouse(e.sign, sunSign);
    return {
      text: `${e.planet} enters your ${ORDINAL[house]} house today — ${HOUSE_THEME[house]} picks up ${e.planet === 'Saturn' || e.planet === 'Pluto' ? 'a long-term tenant' : 'new weather'}.`,
      receipt: `${e.planet} → 0° ${cap(e.sign)} · ${utcTime(e.at)}`,
    };
  }
  if (e.kind === 'lunation' && e.sign) {
    const house = solarHouse(e.sign, sunSign);
    const name = e.type === 'new' ? 'New Moon' : 'Full Moon';
    return {
      text: `${name} in your ${ORDINAL[house]} house — ${e.type === 'new' ? 'a clean line to start something in' : 'something comes due in'} ${HOUSE_THEME[house]}.`,
      receipt: `${name} ${e.degree}° ${cap(e.sign)} · ${utcTime(e.at)}`,
    };
  }
  if (e.kind === 'station' && e.planet && e.sign) {
    const house = solarHouse(e.sign, sunSign);
    const dir = e.type === 'retrograde' ? 'stations retrograde' : 'stations direct';
    return {
      text: `${e.planet} ${dir} in your ${ORDINAL[house]} house — ${e.type === 'retrograde' ? 'expect revisions in' : 'forward motion returns to'} ${HOUSE_THEME[house]}.`,
      receipt: `${e.planet} ${dir} ${e.degree}° ${cap(e.sign)} · ${utcTime(e.at)}`,
    };
  }
  if (e.kind === 'aspect' && e.a && e.b && e.type) {
    return {
      text: `${e.a} ${e.type} ${e.b} is exact today — sky-wide weather, worth knowing the hour.`,
      receipt: `${e.a} ${e.type} ${e.b} · exact ${utcTime(e.at)}`,
    };
  }
  return null;
}

/**
 * The reading for one sign: the day's most concrete event first, the
 * Moon always, then the personal planets whose houses aren't already
 * covered. Four lines, no filler.
 */
export function dailyReading(sunSign: string, daily: Daily): DailyReading {
  const lines: DailyLine[] = [];
  const usedHouses = new Set<number>();

  for (const e of daily.events) {
    const line = eventLine(e, sunSign);
    if (line) {
      lines.push(line);
      if (e.sign) usedHouses.add(solarHouse(e.sign, sunSign));
    }
    if (lines.length >= 2) break;
  }

  const byName = (name: string) => daily.bodies.find((b) => b.body === name);
  const moon = byName('Moon');
  if (moon) {
    const h = solarHouse(moon.sign, sunSign);
    if (!usedHouses.has(h)) {
      lines.push(houseLine(moon, h));
      usedHouses.add(h);
    }
  }

  for (const name of ['Mercury', 'Venus', 'Mars', 'Sun']) {
    if (lines.length >= 4) break;
    const b = byName(name);
    if (!b) continue;
    const h = solarHouse(b.sign, sunSign);
    if (usedHouses.has(h)) continue;
    lines.push(houseLine(b, h));
    usedHouses.add(h);
  }

  const headline = lines[0]?.text ?? 'A quiet sky today.';
  return { headline, lines };
}

/** One-liner for the hub cards: the sign's single strongest note. */
export function dailyHeadline(sunSign: string, daily: Daily): string {
  return dailyReading(sunSign, daily).headline;
}
