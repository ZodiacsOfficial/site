import { describe, expect, it } from 'vitest';
import dailyData from '../data/daily.json';
import publicationData from '../data/daily-publication.json';
import type { Daily } from './daily';
import {
  DAILY_EDITORIAL_CONSTITUTION,
  buildDailyPublication,
  publicationForSign,
  validateDailyFacts,
  validateDailyPublication,
  validateEditorialConstitution,
  wordShingleJaccard,
  type DailyPublication,
} from './daily-publication';
import { SIGN_SLUGS } from './signs';

const daily = dailyData as Daily;
const publication = publicationData as DailyPublication;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function dailyWithExactAspect(): Daily {
  const candidate = clone(daily);
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
  return candidate;
}

describe('daily editorial publication', () => {
  it('rebuilds the committed twelve-sign edition with no violations', () => {
    expect(buildDailyPublication(daily)).toEqual(publication);
    expect(validateDailyPublication(daily, publication)).toEqual([]);
    expect(publication.signs.map((entry) => entry.sign)).toEqual(SIGN_SLUGS);
  });

  it('grounds every rendered line in the public fact catalog', () => {
    const factIds = new Set(publication.facts.map((fact) => fact.id));
    for (const entry of publication.signs) {
      expect(entry.lines.length).toBeGreaterThan(0);
      for (const line of [...entry.lines, entry.todayLine]) {
        expect(line.templateId).toBeTruthy();
        expect(line.evidenceRefs?.length).toBeGreaterThan(0);
        expect(line.evidenceRefs?.every((id) => factIds.has(id))).toBe(true);
      }
    }
    const moon = publication.facts.find((fact) => fact.id.includes(':body:moon:'));
    expect(moon).toMatchObject({
      kind: 'body-position',
      body: 'Moon',
      longitude: expect.any(Number),
      degree: expect.any(Number),
      retrograde: false,
    });
    const exactAspect = buildDailyPublication(dailyWithExactAspect()).facts
      .find((fact) => fact.eventKind === 'aspect');
    expect(exactAspect).toMatchObject({ kind: 'sky-event', orb: 0 });
  });

  it('requires exact-hit aspects to expose zero orb and rejects approximations', () => {
    const aspectDaily = dailyWithExactAspect();
    const missing = clone(aspectDaily) as any;
    delete missing.events[0].orb;
    expect(validateDailyFacts(missing).map((failure) => failure.ruleId))
      .toContain('FACT-EVENT-ORB');

    const approximate = clone(aspectDaily) as any;
    approximate.events[0].orb = 0.25;
    expect(validateDailyFacts(approximate).map((failure) => failure.ruleId))
      .toContain('FACT-EVENT-ORB');

    const publishedApproximation = clone(buildDailyPublication(aspectDaily)) as any;
    publishedApproximation.facts.find((fact: { eventKind?: string }) => fact.eventKind === 'aspect').orb = 0.25;
    expect(validateDailyPublication(aspectDaily, publishedApproximation).map((failure) => failure.ruleId))
      .toContain('FACT-ASPECT-ORB');
  });

  it('keeps all hub headlines exact and below the similarity ceiling', () => {
    const normalized = publication.signs.map((entry) => entry.headline.toLocaleLowerCase('en'));
    expect(new Set(normalized).size).toBe(12);
    for (let left = 0; left < publication.signs.length; left += 1) {
      for (let right = left + 1; right < publication.signs.length; right += 1) {
        expect(wordShingleJaccard(
          publication.signs[left].headline,
          publication.signs[right].headline,
          DAILY_EDITORIAL_CONSTITUTION.distinctness.shingleWords,
        )).toBeLessThanOrEqual(DAILY_EDITORIAL_CONSTITUTION.distinctness.maxPairwiseJaccard);
      }
    }
  });

  it('checks Today lines and complete readings for sign-to-sign boilerplate', () => {
    const candidate = clone(publication);
    candidate.signs[1].todayLine.text = candidate.signs[0].todayLine.text;
    candidate.signs[1].lines = clone(candidate.signs[0].lines);
    const rules = validateDailyPublication(daily, candidate).map((failure) => failure.ruleId);
    expect(rules).toContain('DIST-TODAY-SIMILARITY');
    expect(rules).toContain('DIST-READING-SIMILARITY');
  });

  it('rejects copy edits and missing evidence instead of trusting display receipts', () => {
    const candidate = clone(publication);
    const aries = publicationForSign(candidate, 'aries');
    expect(aries).not.toBeNull();
    if (!aries) return;
    aries.lines[0].text = 'You are guaranteed to win today!';
    aries.lines[0].evidenceRefs = [];
    const ruleIds = validateDailyPublication(daily, candidate).map((failure) => failure.ruleId);
    expect(ruleIds).toContain('CLAIM-RENDER');
    expect(ruleIds).toContain('CLAIM-EVIDENCE');
    expect(ruleIds).toContain('SAFE-certainty');
    expect(ruleIds).toContain('VOICE-EXCLAMATION');
  });

  it('rejects astronomical facts whose sign disagrees with longitude', () => {
    const candidateFacts = clone(daily);
    candidateFacts.bodies[0].sign = candidateFacts.bodies[0].sign === 'aries' ? 'taurus' : 'aries';
    const candidatePublication = buildDailyPublication(candidateFacts);
    expect(validateDailyPublication(candidateFacts, candidatePublication).map((failure) => failure.ruleId))
      .toContain('FACT-SIGN');
  });

  it('requires a real UTC edition day, exact noon snapshot, and bounded Moon metadata', () => {
    const impossibleDate = clone(daily);
    impossibleDate.date = '2026-02-30';
    impossibleDate.snapshotAt = '2026-02-30T12:00:00.000Z';
    expect(validateDailyFacts(impossibleDate).map((failure) => failure.ruleId))
      .toContain('FACT-DATE');

    const malformed = clone(daily);
    malformed.snapshotAt = `${malformed.date}T12:00:00Z`;
    malformed.moon.phase = 'Blue Moon';
    malformed.moon.illumination = 1.001;
    const ruleIds = validateDailyFacts(malformed).map((failure) => failure.ruleId);
    expect(ruleIds).toContain('FACT-SNAPSHOT');
    expect(ruleIds).toContain('FACT-MOON-PHASE');
    expect(ruleIds).toContain('FACT-MOON-ILLUMINATION');
  });

  it('fails closed on malformed runtime JSON instead of throwing', () => {
    const malformed = {
      schema: 'zodiacs.daily-facts.v1',
      date: 20260719,
      snapshotAt: null,
      bodies: null,
      moon: null,
      eventsCoverage: 'complete',
      eventsSource: null,
      events: null,
    } as unknown as Daily;
    expect(() => validateDailyFacts(malformed)).not.toThrow();
    const ruleIds = validateDailyFacts(malformed).map((failure) => failure.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining([
      'FACT-DATE',
      'FACT-SNAPSHOT',
      'FACT-BODIES',
      'FACT-MOON-PHASE',
      'FACT-MOON-ILLUMINATION',
      'FACT-EVENTS',
    ]));
  });

  it('requires canonical same-day ISO instants in chronological order', () => {
    const nonCanonical = dailyWithExactAspect();
    nonCanonical.events[0].at = `${daily.date}T18:05:52.329+00:00`;
    expect(validateDailyFacts(nonCanonical).map((failure) => failure.ruleId))
      .toContain('FACT-EVENT-INSTANT');

    const wrongDay = dailyWithExactAspect();
    const adjacentDate = new Date(`${daily.date}T00:00:00.000Z`);
    adjacentDate.setUTCDate(adjacentDate.getUTCDate() + 1);
    wrongDay.events[0].at = `${adjacentDate.toISOString().slice(0, 10)}T00:05:52.329Z`;
    expect(validateDailyFacts(wrongDay).map((failure) => failure.ruleId))
      .toContain('FACT-EVENT-DATE');

    const outOfOrder = dailyWithExactAspect();
    const later = clone(outOfOrder.events[0]);
    later.at = `${daily.date}T20:05:52.329Z`;
    const earlier = clone(outOfOrder.events[0]);
    earlier.at = `${daily.date}T18:05:52.329Z`;
    outOfOrder.events = [later, earlier];
    expect(validateDailyFacts(outOfOrder).map((failure) => failure.ruleId))
      .toContain('FACT-EVENT-ORDER');
  });

  it('rejects duplicate event fact IDs', () => {
    const candidate = dailyWithExactAspect();
    candidate.events.push(clone(candidate.events[0]));
    expect(validateDailyFacts(candidate).map((failure) => failure.ruleId))
      .toContain('FACT-EVENT-DUPLICATE-ID');
  });

  it('rejects duplicate published fact IDs', () => {
    const candidate = clone(publication);
    candidate.facts.push(clone(candidate.facts[0]));
    expect(validateDailyPublication(daily, candidate).map((failure) => failure.ruleId))
      .toContain('FACT-DUPLICATE-ID');
  });

  it('enforces canonical body, sign, and major-aspect enums', () => {
    const candidate = clone(daily);
    candidate.events = dailyWithExactAspect().events;
    candidate.bodies[0].body = 'Chiron';
    candidate.bodies[0].sign = 'ophiuchus';
    candidate.events[0].a = 'Chiron';
    candidate.events[0].type = 'quincunx';
    candidate.events[0].aSign = 'ophiuchus';
    const ruleIds = validateDailyFacts(candidate).map((failure) => failure.ruleId);
    expect(ruleIds).toContain('FACT-BODY');
    expect(ruleIds).toContain('FACT-SIGN');
    expect(ruleIds).toContain('FACT-EVENT-BODY');
    expect(ruleIds).toContain('FACT-EVENT-SIGN');
    expect(ruleIds).toContain('FACT-EVENT-TYPE');
  });

  it('requires complete coordinates and bounded degrees for every event kind', () => {
    const candidate = clone(daily);
    candidate.events = [
      {
        kind: 'ingress',
        planet: 'Mercury',
        sign: 'aries',
        at: `${daily.date}T01:00:00.000Z`,
      },
      {
        kind: 'lunation',
        type: 'new',
        sign: 'aries',
        at: `${daily.date}T02:00:00.000Z`,
      },
      {
        kind: 'station',
        planet: 'Mercury',
        type: 'direct',
        sign: 'aries',
        degree: 30,
        at: `${daily.date}T03:00:00.000Z`,
      },
      {
        kind: 'aspect',
        a: 'Mars',
        b: 'Saturn',
        type: 'sextile',
        orb: 0,
        aSign: 'gemini',
        aDegree: -0.1,
        bDegree: 14.7,
        at: `${daily.date}T04:00:00.000Z`,
      },
    ];
    const failures = validateDailyFacts(candidate);
    expect(failures.map((failure) => failure.ruleId)).toContain('FACT-EVENT-RETROGRADE');
    expect(failures.filter((failure) => failure.ruleId === 'FACT-EVENT-DEGREE').map((failure) => failure.path))
      .toEqual(expect.arrayContaining([
        'daily.events[1].degree',
        'daily.events[2].degree',
        'daily.events[3].aDegree',
      ]));
    expect(failures.find((failure) => failure.path === 'daily.events[3].bSign')?.ruleId)
      .toBe('FACT-EVENT-SIGN');
  });

  it('blocks unknown transit signs before their fallback arithmetic can be trusted', () => {
    const candidateFacts = clone(daily);
    candidateFacts.events = [{
      kind: 'ingress',
      planet: 'Mercury',
      sign: 'ophiuchus',
      retrograde: false,
      at: `${daily.date}T01:00:00.000Z`,
    }];
    const candidatePublication = buildDailyPublication(candidateFacts);
    const failures = validateDailyPublication(candidateFacts, candidatePublication);
    expect(failures.find((failure) => failure.path === 'daily.events[0].sign')?.ruleId)
      .toBe('FACT-EVENT-SIGN');
  });

  it('disallows fictional human attribution and free-form model publication', () => {
    expect(DAILY_EDITORIAL_CONSTITUTION.identity.humanBylineAllowed).toBe(false);
    expect(DAILY_EDITORIAL_CONSTITUTION.generation.freeformModelOutputMayPublish).toBe(false);
    expect(DAILY_EDITORIAL_CONSTITUTION.generation.generatorMayApproveOwnOutput).toBe(false);
  });

  it('fails closed when the machine constitution weakens its gate or thresholds', () => {
    expect(validateEditorialConstitution(DAILY_EDITORIAL_CONSTITUTION)).toEqual([]);
    const candidate = clone(DAILY_EDITORIAL_CONSTITUTION) as any;
    candidate.identity.humanBylineAllowed = true;
    candidate.generation.allowedModes.push('ai-template-selection');
    candidate.distinctness.maxPairwiseJaccard = 2;
    candidate.roles.find((role: { id: string }) => role.id === 'gate').failClosed = false;
    const errors = validateEditorialConstitution(candidate);
    expect(errors).toEqual(expect.arrayContaining([
      'identity.humanBylineAllowed must be false',
      'generation.allowedModes must contain only deterministic-template until AI receipts exist',
      'distinctness thresholds are invalid',
      'gate must be the fail-closed publishing role',
    ]));
  });
});
