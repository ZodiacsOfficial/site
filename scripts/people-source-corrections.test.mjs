import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectCohortSpacing } from '../docs/phase5/people-pilot/tools/cohort-integrity.mjs';
import { reviewedEvidence } from '../docs/phase5/people-pilot/tools/source-reviews.mjs';
import data from '../src/data/people.json';

const json = (path) => JSON.parse(readFileSync(new URL(`../docs/phase5/people-pilot/${path}`, import.meta.url), 'utf8'));
const correction = json('corrections/2026-09-07-sun-yat-sen.json');
const baseline = json('corrections/published-cohort-2026-09-07.json');
const person = (slug) => data.people.find((entry) => entry.slug === slug);

describe('reviewed People source corrections', () => {
  it('corrects Sun across source, chart, biography and production input', () => {
    const sun = person('sun-yat-sen');
    expect(sun.birthDate.computedGregorianDate).toBe('1866-11-12');
    expect(sun.birthPlace.entity).toBe('Q588677');
    expect(sun.birthPlace.normalisedLabel).toBe('Cuiheng, China');
    expect(sun.computation.timeZone).toBe('Asia/Shanghai');
    expect(sun.moon.signName).toBe('Capricorn');
    expect(sun.shortDescription).toContain('1866–1925');
    expect(sun.shortDescription).not.toMatch(/Soviet|1956|2025/);
    expect(sun.birthTime).toBeNull();
  });

  it('uses the reviewed archival birth correction without falsifying raw claims', () => {
    const raw = json('evidence/carlos-chagas.json');
    const original = structuredClone(raw);
    const resolved = reviewedEvidence(raw, 'carlos-chagas');
    expect(raw).toEqual(original);
    expect(resolved.birth.time).toBe('+1878-07-09T00:00:00Z');
    expect(resolved.birth.allValues).toEqual(raw.birth.allValues);
    expect(person('carlos-chagas').birthDate.computedGregorianDate).toBe('1878-07-09');
    expect(() => reviewedEvidence({ ...raw, birth: { ...raw.birth, time: '+1880-07-09T00:00:00Z' } }, 'carlos-chagas'))
      .toThrow('source birth date changed');
  });

  it('retains uncertain dates and locations explicitly', () => {
    expect(person('rufino-tamayo').shortDescription).toContain('1899–1991');
    expect(person('rufino-tamayo').birthDate.displayedDate).toBe('1899-08-26');
    expect(person('artemisia-gentileschi').shortDescription).toContain('1593–1654 or later');
    for (const slug of ['bessie-smith', 'rufino-tamayo']) {
      expect(person(slug).sourceReview.status).toBe('adopted-date');
      expect(person(slug).copy.metaDescription).toContain('adopted, uncertain birth date');
    }
    for (const slug of ['edith-clarke', 'david-alfaro-siqueiros']) {
      expect(person(slug).sourceReview.status).toBe('reference-location');
    }
  });

  it('pins historical membership and exposes the 360-day variance', () => {
    const bytes = readFileSync(new URL('../docs/phase5/people-pilot/corrections/published-cohort-2026-09-07.json', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('4d50a6a6174def1cd224cc1a8f6b42cda2b56dea0fad86f506a6753e6ba487c1');
    const result = inspectCohortSpacing(data.people, [correction], baseline);
    expect(result.invalid).toEqual([]);
    expect(result.unexplained).toEqual([]);
    expect(result.reviewed).toEqual([{ sign: 'scorpio', pair: ['sun-yat-sen', 'marie-curie'], gapDays: 360, correction: correction.id }]);
  });

  it.each(['new-member', 'no-change', 'fake-release', 'missing-sources', 'changed-companion'])
  ('rejects a manufactured spacing exception: %s', (kind) => {
    const ledger = structuredClone(correction);
    const published = structuredClone(baseline);
    if (kind === 'new-member') published.people = published.people.filter((p) => p.slug !== 'sun-yat-sen');
    if (kind === 'no-change') ledger.previous.birthDate = ledger.corrected.birthDate;
    if (kind === 'fake-release') ledger.previousRelease = 'a'.repeat(40);
    if (kind === 'missing-sources') ledger.sources = [{}, {}];
    if (kind === 'changed-companion') published.people.find((p) => p.slug === 'marie-curie').birthDate = '1868-11-07';
    const result = inspectCohortSpacing(data.people, [ledger], published);
    expect(result.invalid).toContain(correction.id);
    expect(result.unexplained).toHaveLength(1);
  });

  it('never allows an explained pair to mask a new close admission', () => {
    const extra = { ...person('sun-yat-sen'), slug: 'new-admission' };
    const result = inspectCohortSpacing([...data.people, extra], [correction], baseline);
    expect(result.unexplained).toHaveLength(2);
  });
});
