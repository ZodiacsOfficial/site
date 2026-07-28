import { describe, expect, it } from 'vitest';
import { angleDelta, bodyLonAt, turnFrame, type TurnInput } from './turning';
import { altitudeOf, separation } from '../../lib/wheel/ecliptic3d';

/** Frida Kahlo, Coyoacán — the engine's own angles and Placidus cusps. */
const KAHLO: TurnInput = {
  utcMs: Date.parse('1907-07-06T20:30:00Z'),
  latitude: 19.35,
  longitude: -99.16,
  baseline: { asc: 219.169, mc: 129.564, dsc: 39.169, ic: 309.564 },
  baselineCusps: [
    219.169, 248.391, 278.381, 309.564, 341.423, 11.861,
    39.169, 68.391, 98.381, 129.564, 161.423, 191.861,
  ],
  houseSystem: 'placidus',
  polarFallback: false,
};

/** One sidereal day: the sky returns to where it started. */
const SIDEREAL_DAY_MINUTES = 86_164_090.5 / 60_000;

describe('shortest angular delta', () => {
  it('takes the short way round the wrap', () => {
    expect(angleDelta(350, 10)).toBeCloseTo(20, 9);
    expect(angleDelta(10, 350)).toBeCloseTo(-20, 9);
    expect(angleDelta(0, 179)).toBeCloseTo(179, 9);
    expect(angleDelta(0, 181)).toBeCloseTo(-179, 9);
  });
});

describe('advancing a body along the zodiac', () => {
  it('holds still with no speed and no time', () => {
    expect(bodyLonAt(103.59)).toBeCloseTo(103.59, 9);
    expect(bodyLonAt(103.59, 0.95, 0)).toBeCloseTo(103.59, 9);
  });

  it('moves the Moon about half a degree an hour', () => {
    expect(bodyLonAt(0, 13.2, 60)).toBeCloseTo(0.55, 2);
  });

  it('goes backwards when a body is retrograde, and wraps', () => {
    expect(bodyLonAt(1, -12, 1440)).toBeCloseTo(349, 9);
    expect(bodyLonAt(359, 12, 1440)).toBeCloseTo(11, 9);
  });
});

describe('the turning frame', () => {
  it('returns the engine’s own chart at the moment of birth', () => {
    const frame = turnFrame(KAHLO, 0);
    expect(frame.angles).toEqual(KAHLO.baseline);
    expect(frame.cusps).toEqual(KAHLO.baselineCusps);
    expect(frame.fellBack).toBe(false);
  });

  it('puts the ascendant on the horizon it computes, at any minute', () => {
    for (const dt of [0, 37, -145, 300]) {
      const frame = turnFrame(KAHLO, dt);
      expect(altitudeOf(frame.angles.asc, 0, frame.zenith)).toBeCloseTo(0, 1);
    }
  });

  it('comes back to the same sky after one sidereal day', () => {
    const frame = turnFrame(KAHLO, SIDEREAL_DAY_MINUTES);
    expect(separation(frame.angles.asc, KAHLO.baseline.asc)).toBeLessThan(0.05);
    expect(separation(frame.angles.mc, KAHLO.baseline.mc)).toBeLessThan(0.05);
  });

  it('carries the ascendant forward through the zodiac, never backward', () => {
    let previous = KAHLO.baseline.asc;
    let travelled = 0;
    for (let dt = 10; dt <= 720; dt += 10) {
      const asc = turnFrame(KAHLO, dt).angles.asc;
      const step = angleDelta(previous, asc);
      expect(step).toBeGreaterThan(0);
      travelled += step;
      previous = asc;
    }
    // Half a day of turning is about half the zodiac.
    expect(travelled).toBeGreaterThan(150);
    expect(travelled).toBeLessThan(210);
  });

  it('moves the ascendant far more than the Sun moves', () => {
    // The whole reason a birth minute matters.
    const twoHours = turnFrame(KAHLO, 120).angles.asc;
    const ascMoved = Math.abs(angleDelta(KAHLO.baseline.asc, twoHours));
    const sunMoved = Math.abs(angleDelta(103.59, bodyLonAt(103.59, 0.953, 120)));
    expect(ascMoved).toBeGreaterThan(20);
    expect(sunMoved).toBeLessThan(0.1);
  });

  it('keeps a whole-sign floor nailed to the ascendant', () => {
    const whole: TurnInput = { ...KAHLO, houseSystem: 'whole' };
    const frame = turnFrame(whole, 200);
    expect(frame.cusps).not.toBeNull();
    expect(frame.cusps![0]).toBeCloseTo(Math.floor(frame.angles.asc / 30) * 30, 9);
    for (let i = 0; i < 12; i += 1) {
      expect(frame.cusps![i]).toBeCloseTo(((frame.cusps![0] + i * 30) % 360), 9);
    }
  });

  it('turns a Placidus floor with the sky, keeping twelve cusps', () => {
    const frame = turnFrame(KAHLO, 90);
    expect(frame.cusps).toHaveLength(12);
    expect(frame.cusps![0]).toBeCloseTo(frame.angles.asc, 6);
    expect(frame.cusps![9]).toBeCloseTo(frame.angles.mc, 6);
    // It really moved.
    expect(separation(frame.cusps![0], KAHLO.baselineCusps![0])).toBeGreaterThan(5);
  });

  it('holds a polar chart to whole sign for the whole scrub', () => {
    const polar: TurnInput = {
      ...KAHLO,
      latitude: 70,
      polarFallback: true,
    };
    for (const dt of [0, 60, 400]) {
      const frame = turnFrame(polar, dt);
      expect(frame.fellBack).toBe(true);
      if (dt !== 0) expect(frame.cusps![0] % 30).toBeCloseTo(0, 9);
    }
  });

  it('draws no floor when the reader has houses turned off', () => {
    const noFloor: TurnInput = { ...KAHLO, baselineCusps: null };
    expect(turnFrame(noFloor, 45).cusps).toBeNull();
  });
});
