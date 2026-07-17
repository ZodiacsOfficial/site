import { describe, expect, it } from 'vitest';
import type { BodyName, Chart } from './engine/types';
import {
  APPROACH_MARS,
  APPROACH_MERCURY,
  APPROACH_MOON,
  APPROACH_RISING,
  approachRead,
} from './approach';

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function chart(options: {
  rising?: number | null;
  mercury?: number;
  moon?: number;
  mars?: number;
} = {}): Chart {
  const body = (name: BodyName, lon: number) => ({
    body: name, lon, lat: 0, speed: 1, retrograde: false,
  });
  const rising = options.rising === undefined ? 0 : options.rising;
  return {
    input: {
      utc: new Date('1990-06-15T12:30:00Z'),
      houseSystem: 'whole',
      timeKnown: rising != null,
    },
    bodies: [
      body('Mercury', options.mercury ?? 0),
      body('Moon', options.moon ?? 0),
      body('Mars', options.mars ?? 0),
    ],
    angles: rising == null ? null : {
      asc: rising,
      dsc: (rising + 180) % 360,
      mc: 90,
      ic: 270,
    },
    houses: null,
    aspects: [],
    flags: rising == null ? ['no-time'] : [],
    engineVersion: 'test',
  };
}

describe('approach corpus', () => {
  it('contains a fully authored line for every sign and every role', () => {
    for (const corpus of [APPROACH_RISING, APPROACH_MERCURY, APPROACH_MOON, APPROACH_MARS]) {
      expect(Object.keys(corpus)).toEqual(SIGNS);
      expect(Object.values(corpus)).toHaveLength(12);
      expect(Object.values(corpus).every((line) => line.length > 60 && /[.!?]$/.test(line))).toBe(true);
    }
  });

  it('builds audience-facing advice from Rising, Mercury, Moon, and Mars', () => {
    const read = approachRead(chart({ rising: 185, mercury: 42, moon: 95, mars: 188 }));

    expect(read.rising).toMatchObject({ body: 'Rising', role: 'How to open', sign: 'libra' });
    expect(read.mercury).toMatchObject({ body: 'Mercury', role: 'How to say it', sign: 'taurus' });
    expect(read.moon).toMatchObject({ body: 'Moon', role: 'What builds trust', sign: 'cancer' });
    expect(read.avoid).toMatchObject({ body: 'Mars', role: 'What to avoid under pressure', sign: 'libra' });
    expect(read.limitations).toEqual([]);
  });

  it('keeps no-time and Moon-boundary limitations explicit', () => {
    const read = approachRead(chart({ rising: null, mercury: 300, moon: 329, mars: 210 }), {
      moonAmbiguous: true,
    });

    expect(read.rising).toBeNull();
    expect(read.mercury?.sign).toBe('aquarius');
    expect(read.moonAmbiguous).toBe(true);
    expect(read.limitations).toHaveLength(2);
    expect(read.limitations[0]).toBe('A birth time is needed to know how you first come across.');
    expect(read.limitations.join(' ')).toMatch(/Moon may change signs/i);
  });

  it('does not inspect or reproduce private birth input', () => {
    const privateChart = chart();
    privateChart.input = {
      ...privateChart.input,
      utc: new Date('1990-06-15T12:30:00Z'),
    };
    const serialized = JSON.stringify(approachRead(privateChart));

    expect(serialized).not.toMatch(/1990|12:30|latitude|longitude|birthplace/i);
  });
});
