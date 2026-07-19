import { describe, expect, it } from 'vitest';
import dailyData from '../data/daily.json';
import type { Daily } from './daily';
import {
  HOROSCOPE_DISTINCTNESS_LIMITS,
  HOROSCOPE_WORD_BOUNDS,
  HoroscopeProgramInputError,
  buildHoroscopeProgram,
  horoscopeShingleJaccard,
  validateHoroscopeProgram,
  validateHoroscopeProgramAgainstInput,
  validateHoroscopeProgramInput,
  type BuildHoroscopeProgramInput,
  type HoroscopeProgram,
  type HoroscopeProgramEvent,
  type HoroscopeSurface,
} from './horoscope-program';
import { SIGN_SLUGS } from './signs';

const sourceDaily = dailyData as Daily;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function fixtureDay(date: string, dayIndex: number): Daily {
  const daily = clone(sourceDaily);
  daily.date = date;
  daily.snapshotAt = `${date}T12:00:00.000Z`;
  daily.eventsCoverage = 'complete';
  daily.eventsSource = `src/data/transits-${date.slice(0, 7)}.json`;
  daily.events = date === sourceDaily.date ? clone(sourceDaily.events) : [];
  // The unit fixture varies the Moon to exercise solar-house mapping. This
  // module consumes facts; upstream astronomy tests own physical correctness.
  const moon = daily.bodies.find((body) => body.body === 'Moon');
  if (moon) {
    const sign = SIGN_SLUGS[dayIndex % SIGN_SLUGS.length];
    moon.sign = sign;
    moon.degree = 3.25 + dayIndex / 10;
    moon.lon = SIGN_SLUGS.indexOf(sign) * 30 + moon.degree;
  }
  return daily;
}

/** Normalized catalog fixture; upstream event-catalog tests own astronomy. */
const yearlyEvents: HoroscopeProgramEvent[] = [
  { kind: 'eclipse', type: 'solar', sign: 'aquarius', degree: 17.6, at: '2027-02-06T15:59:00.000Z', sourceId: 'fixture:2027-events' },
  { kind: 'eclipse', type: 'lunar', sign: 'virgo', degree: 2.1, at: '2027-02-20T23:12:00.000Z', sourceId: 'fixture:2027-events' },
  { kind: 'station', planet: 'Mercury', type: 'retrograde', sign: 'pisces', degree: 11.2, at: '2027-03-10T09:00:00.000Z', sourceId: 'fixture:2027-events' },
  { kind: 'ingress', planet: 'Jupiter', sign: 'virgo', at: '2027-07-26T03:00:00.000Z', sourceId: 'fixture:2027-events' },
  { kind: 'station', planet: 'Saturn', type: 'retrograde', sign: 'aries', degree: 27.4, at: '2027-08-09T12:00:00.000Z', sourceId: 'fixture:2027-events' },
  { kind: 'eclipse', type: 'solar', sign: 'leo', degree: 9.8, at: '2027-08-02T10:07:00.000Z', sourceId: 'fixture:2027-events' },
  { kind: 'eclipse', type: 'lunar', sign: 'aquarius', degree: 24.2, at: '2027-08-17T07:28:00.000Z', sourceId: 'fixture:2027-events' },
  {
    kind: 'aspect',
    a: 'Jupiter',
    b: 'Saturn',
    type: 'trine',
    aSign: 'virgo',
    aDegree: 18.1,
    bSign: 'taurus',
    bDegree: 18.1,
    at: '2027-11-13T16:00:00.000Z',
    sourceId: 'fixture:2027-events',
  },
];

const dates = [
  '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16',
  '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20',
];
const input: BuildHoroscopeProgramInput = {
  anchorDate: '2026-07-19',
  dailySnapshots: dates.map(fixtureDay),
  yearlyEvents,
};

describe('horoscope program domain', () => {
  it('builds one deterministic, serializable six-surface program for all signs', () => {
    const first = buildHoroscopeProgram(input);
    const second = buildHoroscopeProgram(input);
    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first.signs.map((entry) => entry.sign)).toEqual(SIGN_SLUGS);
    expect(first.coverage).toEqual({
      today: 'complete',
      tomorrow: 'complete',
      isoWeek: 'complete',
      yearly2027: 'complete',
    });
    for (const entry of first.signs) {
      expect(Object.keys(entry.readings).sort()).toEqual([
        'career', 'love', 'today', 'tomorrow', 'weekly', 'yearly-2027',
      ]);
    }
    expect(validateHoroscopeProgramAgainstInput(input, first)).toEqual([]);
  });

  it('enforces the master-brief word bounds and voice rules on every surface', () => {
    const program = buildHoroscopeProgram(input);
    const banned = /\b(?:delve|unlock|embark|tapestry|vibrant|elevate|empower|harness)\b|in today[’']s world/iu;
    const backstage = /\b(?:deterministic|noon[- ]UTC snapshot|verified position|source receipts?|proportionate to the evidence|supplied (?:day|week|position|snapshot)|event catalog|solar-house method)\b/iu;
    for (const entry of program.signs) for (const [surface, item] of Object.entries(entry.readings)) {
      const bounds = HOROSCOPE_WORD_BOUNDS[surface as HoroscopeSurface];
      expect(item.status).toBe('publishable');
      expect(item.wordCount, `${entry.sign}/${surface}`).toBeGreaterThanOrEqual(bounds.min);
      expect(item.wordCount, `${entry.sign}/${surface}`).toBeLessThanOrEqual(bounds.max);
      expect(item.text).not.toMatch(banned);
      expect(item.text).not.toMatch(backstage);
      expect(item.text).not.toContain('!');
    }
  });

  it('links every publishable passage to serializable source or derived evidence', () => {
    const program = buildHoroscopeProgram(input);
    const evidence = new Map(program.evidence.map((receipt) => [receipt.id, receipt]));
    expect(evidence.size).toBeGreaterThan(100);
    for (const entry of program.signs) for (const item of Object.values(entry.readings)) {
      for (const itemPassage of item.passages) {
        expect(itemPassage.evidenceRefs.length, `${entry.sign}/${item.surface}`).toBeGreaterThan(0);
        expect(itemPassage.evidenceRefs.every((id) => evidence.has(id))).toBe(true);
      }
    }
    const derived = program.evidence.filter((receipt) => receipt.kind === 'solar-house');
    expect(derived.length).toBeGreaterThan(0);
    expect(derived.every((receipt) => receipt.sourceFactId && evidence.has(receipt.sourceFactId))).toBe(true);
  });

  it('builds each 2027 edition to long-form depth from the supplied event catalog', () => {
    const program = buildHoroscopeProgram(input);
    const catalogReceipts = program.evidence.filter((receipt) => (
      receipt.kind === 'sky-event' && receipt.sourceId === 'fixture:2027-events'
    ));
    expect(catalogReceipts).toHaveLength(yearlyEvents.length);
    expect(new Set(catalogReceipts.map((receipt) => receipt.at)))
      .toEqual(new Set(yearlyEvents.map((event) => event.at)));
    for (const entry of program.signs) {
      const yearly = entry.readings['yearly-2027'];
      expect(yearly.wordCount).toBeGreaterThanOrEqual(1_200);
      expect(yearly.wordCount).toBeLessThanOrEqual(1_800);
      expect(yearly.text).toContain('Jupiter entering Virgo');
      expect(yearly.text).toContain('solar eclipse in Aquarius');
      expect(yearly.text).toContain('Saturn stationing retrograde');
    }
  });

  it('keeps all twelve readings pairwise distinct, including the long 2027 edition', () => {
    const program = buildHoroscopeProgram(input);
    const surfaces = Object.keys(program.signs[0].readings) as HoroscopeSurface[];
    for (const surface of surfaces) {
      for (let left = 0; left < program.signs.length; left += 1) {
        for (let right = left + 1; right < program.signs.length; right += 1) {
          const score = horoscopeShingleJaccard(
            program.signs[left].readings[surface].text,
            program.signs[right].readings[surface].text,
          );
          expect(score, `${surface}: ${program.signs[left].sign}/${program.signs[right].sign}`)
            .toBeLessThanOrEqual(HOROSCOPE_DISTINCTNESS_LIMITS[surface]);
        }
      }
    }
  });

  it('holds unsupported periods instead of manufacturing filler', () => {
    const partialInput: BuildHoroscopeProgramInput = {
      anchorDate: input.anchorDate,
      dailySnapshots: [fixtureDay(input.anchorDate, 6)],
      yearlyEvents: [],
    };
    const program = buildHoroscopeProgram(partialInput);
    expect(program.coverage).toEqual({
      today: 'complete',
      tomorrow: 'unavailable',
      isoWeek: 'partial',
      yearly2027: 'insufficient',
    });
    for (const entry of program.signs) {
      expect(entry.readings.today.status).toBe('publishable');
      expect(entry.readings.tomorrow.status).toBe('insufficient-evidence');
      expect(entry.readings.weekly.status).toBe('insufficient-evidence');
      expect(entry.readings['yearly-2027'].status).toBe('insufficient-evidence');
      expect(entry.readings['yearly-2027'].text).toContain('does not replace missing sky data');
      expect(entry.readings['yearly-2027'].passages[0].evidenceRefs).toEqual([]);
    }
    expect(validateHoroscopeProgram(program)).toEqual([]);
  });

  it('fails closed on invalid facts, malformed yearly events, and output tampering', () => {
    const malformed = clone(input);
    malformed.dailySnapshots[0].bodies[0].sign = 'ophiuchus';
    malformed.yearlyEvents![0].at = '2028-02-06T15:59:00.000Z';
    const inputFailures = validateHoroscopeProgramInput(malformed).map((failure) => failure.ruleId);
    expect(inputFailures).toContain('INPUT-FACT-SIGN');
    expect(inputFailures).toContain('INPUT-EVENT-INSTANT');
    expect(() => buildHoroscopeProgram(malformed)).toThrow(HoroscopeProgramInputError);

    const program = clone(buildHoroscopeProgram(input)) as HoroscopeProgram;
    program.signs[1].readings.today.text = program.signs[0].readings.today.text;
    program.signs[1].readings.today.wordCount = program.signs[0].readings.today.wordCount;
    program.signs[1].readings.today.passages = clone(program.signs[0].readings.today.passages);
    const failures = validateHoroscopeProgram(program).map((failure) => failure.ruleId);
    expect(failures).toContain('DIST-SIMILARITY');
  });
});
