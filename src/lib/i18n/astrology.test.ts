import { describe, expect, it } from 'vitest';
import dailyData from '../../data/daily.json';
import { SIGN_SLUGS } from '../signs';
import type { Daily } from '../daily';
import {
  aspectLabel,
  moonPhaseLabel,
  planetLabel,
} from './astrology';
import { dailyReadingForLocale } from './daily-reading';

const daily = dailyData as Daily;

describe('astrology localization', () => {
  it('localizes every supported planet, aspect, and moon phase label', () => {
    expect(planetLabel('es', 'Jupiter')).toBe('Júpiter');
    expect(planetLabel('es', 'Neptune')).toBe('Neptuno');
    expect(planetLabel('es', 'Pluto')).toBe('Plutón');
    expect(aspectLabel('es', 'trine')).toBe('trígono');
    expect(aspectLabel('es', 'square')).toBe('cuadratura');
    expect(moonPhaseLabel('es', 'Waning Crescent')).toBe('Luna menguante');
    expect(moonPhaseLabel('es', 'Waxing Gibbous')).toBe('Gibosa creciente');
  });

  it('preserves TodayBySign fact selection while rendering Spanish prose', () => {
    const fixtures: Daily[] = [
      daily,
      {
        ...daily,
        events: [{
          kind: 'ingress', at: `${daily.date}T12:00:00.000Z`, planet: 'Pluto', sign: 'aquarius', degree: 0,
        }],
      },
      {
        ...daily,
        events: [{
          kind: 'lunation', at: `${daily.date}T12:00:00.000Z`, type: 'new', sign: 'cancer', degree: 18,
        }],
      },
      {
        ...daily,
        events: [{
          kind: 'station', at: `${daily.date}T12:00:00.000Z`, planet: 'Neptune', type: 'retrograde', sign: 'aries', degree: 4,
        }],
      },
      {
        ...daily,
        events: [{
          kind: 'station', at: `${daily.date}T12:00:00.000Z`, planet: 'Mercury', type: 'direct', sign: 'cancer', degree: 22,
        }],
      },
      {
        ...daily,
        events: [{
          kind: 'aspect', at: `${daily.date}T12:00:00.000Z`, a: 'Mars', b: 'Saturn', type: 'square',
        }],
      },
    ];

    for (const fixture of fixtures) for (const slug of SIGN_SLUGS) {
      const english = dailyReadingForLocale(slug, fixture, 'en');
      const spanish = dailyReadingForLocale(slug, fixture, 'es');

      expect(spanish.lines).toHaveLength(english.lines.length);
      expect(spanish.lines.map((line) => line.body)).toEqual(english.lines.map((line) => line.body));
      expect(spanish.lines.map((line) => line.receipt.match(/casa (\d+)/)?.[1] ?? null)).toEqual(
        english.lines.map((line) => line.receipt.match(/house (\d+)/)?.[1] ?? null),
      );

      const visibleSpanish = spanish.lines.map((line) => `${line.text} ${line.receipt}`).join(' ');
      expect(visibleSpanish).not.toMatch(
        /\b(?:Sun|Moon|Mercury|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Taurus|Gemini|Cancer|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces|house|retrograde|Waning|Waxing|Quarter|Gibbous|conjunction|sextile|square|trine|opposition)\b/,
      );
    }
  });
});
