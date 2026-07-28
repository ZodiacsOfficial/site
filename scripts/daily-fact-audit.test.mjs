import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditDailyAstronomy, readAndAuditTransitMonth } from './daily-fact-audit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const daily = JSON.parse(await readFile(resolve(repoRoot, 'src/data/daily.json'), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

describe('independent daily fact audit', () => {
  it('authenticates the committed body, lunar, event, and source facts', async () => {
    expect(await auditDailyAstronomy(daily, repoRoot)).toEqual([]);
    const month = await readAndAuditTransitMonth(daily.date.slice(0, 7), repoRoot);
    expect(month.failures).toEqual([]);
    expect(month.events.length).toBeGreaterThan(0);
  });

  it('rejects fabricated coordinates and retrograde state', async () => {
    const candidate = clone(daily);
    candidate.bodies[0].lon += 1;
    candidate.bodies[0].degree += 1;
    const mercury = candidate.bodies.find((body) => body.body === 'Mercury');
    mercury.retrograde = !mercury.retrograde;
    const rules = (await auditDailyAstronomy(candidate, repoRoot)).map((item) => item.ruleId);
    expect(rules).toContain('ASTRO-BODY-LONGITUDE');
    expect(rules).toContain('ASTRO-BODY-COORDINATE');
    expect(rules).toContain('ASTRO-BODY-DIRECTION');
  });

  it('rejects fabricated lunar metadata and a changed monthly day slice', async () => {
    const candidate = clone(daily);
    // Whatever the committed phase is, claim a different one. Naming a
    // fixed phase here passes the audit outright on the days the sky
    // happens to agree with it, which is the audit working and the test
    // failing.
    candidate.moon.phase = daily.moon.phase === 'Full Moon' ? 'New Moon' : 'Full Moon';
    candidate.moon.illumination = daily.moon.illumination > 0.5 ? 0 : 1;
    candidate.events = [{
      kind: 'aspect',
      a: 'Mars',
      b: 'Saturn',
      type: 'sextile',
      orb: 0,
      aSign: 'gemini',
      aDegree: 12,
      bSign: 'aries',
      bDegree: 12,
      at: `${candidate.date}T06:00:00.000Z`,
    }];
    const rules = (await auditDailyAstronomy(candidate, repoRoot)).map((item) => item.ruleId);
    expect(rules).toContain('ASTRO-MOON-PHASE');
    expect(rules).toContain('ASTRO-MOON-ILLUMINATION');
    expect(rules).toContain('ASTRO-EVENT-SLICE');
  });
});
