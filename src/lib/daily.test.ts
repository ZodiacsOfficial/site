/**
 * The daily layer is pure math over committed JSON — these vectors pin
 * the solar-house arithmetic and the reading's shape so copy changes
 * stay deliberate and house assignments never silently shift.
 */
import { describe, expect, it } from 'vitest';
import { dailyHeadline, dailyReading, solarHouse } from './daily';
import type { Daily } from './daily';

const FIXTURE: Daily = {
  date: '2026-07-06',
  bodies: [
    { body: 'Moon', lon: 358.31, sign: 'pisces', degree: 28.3, retrograde: false },
    { body: 'Sun', lon: 104.45, sign: 'cancer', degree: 14.4, retrograde: false },
    { body: 'Mercury', lon: 114.58, sign: 'cancer', degree: 24.6, retrograde: true },
    { body: 'Venus', lon: 146.4, sign: 'leo', degree: 26.4, retrograde: false },
    { body: 'Mars', lon: 171.1, sign: 'virgo', degree: 21.1, retrograde: false },
  ],
  moon: { phase: 'Last Quarter', illumination: 0.44 },
  events: [
    { kind: 'station', at: '2026-07-07T11:21:04.854Z', planet: 'Neptune', type: 'retrograde', sign: 'aries', degree: 4.4 },
  ],
};

describe('solarHouse', () => {
  it('puts a sign in its own first house', () => {
    expect(solarHouse('aries', 'aries')).toBe(1);
    expect(solarHouse('pisces', 'pisces')).toBe(1);
  });
  it('wraps the wheel', () => {
    expect(solarHouse('aries', 'taurus')).toBe(12);
    expect(solarHouse('pisces', 'aries')).toBe(12);
    expect(solarHouse('cancer', 'aries')).toBe(4);
    expect(solarHouse('capricorn', 'cancer')).toBe(7);
  });
});

describe('dailyReading', () => {
  it('leads with the event, keeps the Moon, dedupes houses, caps at four', () => {
    const r = dailyReading('aries', FIXTURE);
    expect(r.lines.length).toBeLessThanOrEqual(4);
    expect(r.headline).toContain('Neptune stations retrograde');
    expect(r.headline).toContain('first house'); // aries station in aries → house 1
    const moonLine = r.lines.find((l) => l.receipt.startsWith('Moon'));
    expect(moonLine?.text).toContain('twelfth house'); // pisces for aries sun
    const houses = r.lines.map((l) => l.receipt.match(/house (\d+)/)?.[1]).filter(Boolean);
    expect(new Set(houses).size).toBe(houses.length);
  });

  it('every line carries a receipt with a degree or a clock time', () => {
    for (const sign of ['aries', 'leo', 'capricorn']) {
      for (const line of dailyReading(sign, FIXTURE).lines) {
        expect(line.receipt).toMatch(/(\d+(\.\d+)?°)|(\d{2}:\d{2} UTC)/);
      }
    }
  });

  it('marks retrograde bodies in the receipt', () => {
    const r = dailyReading('capricorn', FIXTURE);
    const mercury = r.lines.find((l) => l.receipt.startsWith('Mercury'));
    if (mercury) expect(mercury.receipt).toContain('retrograde');
  });

  it('survives an empty event day', () => {
    const quiet = { ...FIXTURE, events: [] };
    const r = dailyReading('libra', quiet);
    expect(r.lines.length).toBeGreaterThanOrEqual(3);
    expect(r.headline).toBe(r.lines[0].text);
  });

  it('headline matches the reading', () => {
    expect(dailyHeadline('taurus', FIXTURE)).toBe(dailyReading('taurus', FIXTURE).headline);
  });

  it('fixture snapshot: aries reads as written', () => {
    const r = dailyReading('aries', FIXTURE);
    expect(r.lines.map((l) => `${l.text} [${l.receipt}]`)).toMatchInlineSnapshot(`
      [
        "Neptune stations retrograde in your first house — expect revisions in how you look, start, and come across. [Neptune stations retrograde 4.4° Aries · 11:21 UTC]",
        "The Moon spends today in your twelfth house — rest, retreat, and what runs under the surface. [Moon 28.3° Pisces · house 12]",
        "Mercury is working your fourth house — home, family, and the private floor of your life. [Mercury 24.6° Cancer, retrograde · house 4]",
        "Venus is warming your fifth house — pleasure, romance, children, and what you make for joy. [Venus 26.4° Leo · house 5]",
      ]
    `);
  });
});
