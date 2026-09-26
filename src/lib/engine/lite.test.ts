import { describe, expect, it } from 'vitest';
import { bodyLongitude } from './full';
import { moonLongitude, sunLongitude } from './lite';

const wrap = (d: number) => ((d + 540) % 360) - 180;

describe('the homepage\'s low-precision Sun and Moon', () => {
  it('stay within the accuracy its header states, 1900 to 2100', () => {
    let sun = 0;
    let moon = 0;
    for (let t = Date.UTC(1900, 0, 1); t < Date.UTC(2100, 0, 1); t += 0.37 * 86_400_000) {
      const date = new Date(t);
      sun = Math.max(sun, Math.abs(wrap(sunLongitude(date) - bodyLongitude('Sun', date))));
      moon = Math.max(moon, Math.abs(wrap(moonLongitude(date) - bodyLongitude('Moon', date))));
    }
    // The header says 0.017° and 0.365°; measured 0.0165° (2095) and 0.3643°
    // on engine 0.1.1-rc.8, whose observed ΔT moved the full engine's Sun
    // late in the century by a few arcseconds (0.0159° on rc.7).
    expect(sun).toBeLessThan(0.017);
    expect(moon).toBeLessThan(0.365);
  }, 60_000);
});
