import { describe, expect, it } from 'vitest';
import {
  NATAL_HOUSE_THEME,
  chartWeather,
  natalAspectLine,
  planetInHouseLine,
  topAspects,
} from './natal';
import type { Aspect, AspectType } from './engine/types';

const PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];
const TYPES: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];

/** Voice tells banned on new surfaces (CLAUDE.md) — none may be composed. */
const BANNED = [
  'done properly',
  'computed properly',
  'shows its work',
  'like a human',
  'no mush',
  'not vibes',
];

describe('planetInHouseLine', () => {
  it('composes a non-empty, house-referencing line for every planet in every house', () => {
    for (const p of PLANETS) {
      for (let h = 1; h <= 12; h++) {
        const line = planetInHouseLine(p, h);
        expect(line.length).toBeGreaterThan(40);
        expect(line).toContain('house');
        expect(line.startsWith('Your ')).toBe(true);
        for (const tell of BANNED) expect(line.toLowerCase()).not.toContain(tell);
      }
    }
  });

  it('serves curated lines where they exist', () => {
    expect(planetInHouseLine('Sun', 1)).toContain('first minute');
    expect(planetInHouseLine('Saturn', 12)).toContain('nobody watches');
  });

  it('falls back sanely for unknown bodies', () => {
    expect(planetInHouseLine('Chiron', 5)).toContain('fifth house');
  });

  it('drops the theme tail on repeat mentions of a house', () => {
    const repeat = planetInHouseLine('Uranus', 7, { withTheme: false });
    expect(repeat).toContain('seventh house too');
    expect(repeat).not.toContain('—');
  });
});

describe('natalAspectLine', () => {
  it('composes for every planet pair and aspect type without banned tells', () => {
    for (let i = 0; i < PLANETS.length; i++) {
      for (let j = i + 1; j < PLANETS.length; j++) {
        for (const t of TYPES) {
          const line = natalAspectLine(PLANETS[i], t, PLANETS[j]);
          expect(line.length).toBeGreaterThan(40);
          expect(line.startsWith('Your ')).toBe(true);
          for (const tell of BANNED) expect(line.toLowerCase()).not.toContain(tell);
        }
      }
    }
  });

  it('serves the full-moon curated line', () => {
    expect(natalAspectLine('Sun', 'opposition', 'Moon')).toContain('full-moon birth');
  });
});

describe('topAspects', () => {
  const asp = (a: string, b: string, type: AspectType, orb: number): Aspect => ({
    a: a as Aspect['a'],
    b: b as Aspect['b'],
    type,
    orb,
    applying: false,
  });

  it('prefers a looser luminary aspect over a slightly tighter planetary one', () => {
    const list = [asp('Mercury', 'Venus', 'trine', 1.0), asp('Sun', 'Saturn', 'square', 2.0)];
    expect(topAspects(list, 1)[0].a).toBe('Sun');
  });

  it('caps at n and does not mutate input order', () => {
    const list = [
      asp('Mars', 'Jupiter', 'sextile', 3),
      asp('Venus', 'Neptune', 'square', 0.2),
      asp('Mercury', 'Pluto', 'trine', 2),
    ];
    const before = list.map((x) => x.a).join();
    expect(topAspects(list, 2)).toHaveLength(2);
    expect(list.map((x) => x.a).join()).toBe(before);
  });
});

describe('chartWeather', () => {
  // Longitudes put bodies in known signs: Aries 0–30 (fire), Taurus 30–60
  // (earth), Gemini 60–90 (air), Cancer 90–120 (water), Leo 120–150 (fire),
  // Sagittarius 240–270 (fire).
  const fireHeavy = [
    { body: 'Sun', lon: 5, sign: 'aries' },
    { body: 'Moon', lon: 125, sign: 'leo' },
    { body: 'Mercury', lon: 15, sign: 'aries' },
    { body: 'Venus', lon: 250, sign: 'sagittarius' },
    { body: 'Mars', lon: 28, sign: 'aries' },
    { body: 'Jupiter', lon: 45, sign: 'taurus' },
    { body: 'Saturn', lon: 65, sign: 'gemini' },
    { body: 'Uranus', lon: 70, sign: 'gemini' },
    { body: 'Neptune', lon: 75, sign: 'gemini' },
    { body: 'Pluto', lon: 40, sign: 'taurus' },
  ];

  it('reports a dominant element and a missing one', () => {
    const w = chartWeather(fireHeavy);
    expect(w.elements.fire).toBe(5);
    expect(w.lines.some((l) => l.includes('Fire carries 5'))).toBe(true);
    expect(w.lines.some((l) => l.includes('no planet in water'))).toBe(true);
  });

  it('detects a sign stellium', () => {
    const w = chartWeather(fireHeavy);
    expect(w.lines.some((l) => l.includes('Aries') && l.includes('stellium'))).toBe(true);
  });

  it('detects a house stellium only when houses are known', () => {
    const houseOf = (b: string) => (['Sun', 'Mercury', 'Mars'].includes(b) ? 10 : 3);
    const withHouses = chartWeather(fireHeavy, houseOf);
    expect(withHouses.lines.some((l) => l.includes('tenth house'))).toBe(true);
    const without = chartWeather(fireHeavy);
    expect(without.lines.some((l) => l.includes('tenth house'))).toBe(false);
  });

  it('mentions retrogrades only at three or more', () => {
    const two = fireHeavy.map((b, i) => ({ ...b, retrograde: i < 2 }));
    expect(chartWeather(two).lines.some((l) => l.includes('retrograde'))).toBe(false);
    const three = fireHeavy.map((b, i) => ({ ...b, retrograde: i < 3 }));
    expect(chartWeather(three).lines.some((l) => l.includes('3 planets were retrograde'))).toBe(
      true,
    );
  });

  it('keeps every composed line free of banned tells', () => {
    const w = chartWeather(fireHeavy, () => 10);
    for (const line of w.lines) {
      for (const tell of BANNED) expect(line.toLowerCase()).not.toContain(tell);
    }
  });

  it('has a theme for all twelve houses', () => {
    for (let h = 1; h <= 12; h++) expect(NATAL_HOUSE_THEME[h]).toBeTruthy();
  });
});
