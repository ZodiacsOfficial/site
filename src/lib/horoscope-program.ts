/**
 * Deterministic build-time horoscope program.
 *
 * This module never computes astronomy and never invents a missing transit.
 * It accepts validated daily snapshots and a normalized 2027 event catalog,
 * maps those facts through whole-sign solar houses, and composes curated copy.
 * Missing periods return an explicit `insufficient-evidence` reading so a page
 * generator can hold publication instead of filling the gap with vague prose.
 */
import {
  HOUSE_THEME,
  dailyBodyFactId,
  dailyEventFactId,
  dailyHouseFactId,
  solarHouse,
  type Daily,
  type DailyBody,
  type DailyEvent,
} from './daily';
import { validateDailyFacts } from './daily-publication';
import { SIGN_SLUGS } from './signs';
import type {
  BuildHoroscopeProgramInput,
  HoroscopeEvidenceReceipt,
  HoroscopePassage,
  HoroscopeProgram,
  HoroscopeProgramEvent,
  HoroscopeProgramViolation,
  HoroscopeReading,
  HoroscopeSign,
  HoroscopeSignProgram,
  HoroscopeSurface,
} from './horoscope-program-types';

export type {
  BuildHoroscopeProgramInput,
  HoroscopeEvidenceReceipt,
  HoroscopePassage,
  HoroscopeProgram,
  HoroscopeProgramEvent,
  HoroscopeProgramViolation,
  HoroscopeReading,
  HoroscopeSign,
  HoroscopeSignProgram,
  HoroscopeSurface,
} from './horoscope-program-types';

export const HOROSCOPE_PROGRAM_SCHEMA = 'zodiacs.horoscope-program.v1' as const;
export const HOROSCOPE_PROGRAM_RENDERER = 'zodiacs.horoscope-program-renderer.v3' as const;

export const HOROSCOPE_WORD_BOUNDS: Record<HoroscopeSurface, { min: number; max: number }> = {
  today: { min: 90, max: 140 },
  tomorrow: { min: 90, max: 140 },
  weekly: { min: 200, max: 300 },
  love: { min: 60, max: 100 },
  career: { min: 60, max: 100 },
  'yearly-2027': { min: 1_200, max: 1_800 },
};

export const HOROSCOPE_DISTINCTNESS_LIMITS: Record<HoroscopeSurface, number> = {
  today: 0.4,
  tomorrow: 0.4,
  weekly: 0.55,
  love: 0.55,
  career: 0.55,
  'yearly-2027': 0.72,
};

const MASTER_BRIEF_BANNED = [
  /\bdelve\b/iu,
  /\bunlock\b/iu,
  /\bembark\b/iu,
  /\btapestr(?:y|ies)\b/iu,
  /\bvibrant\b/iu,
  /\belevat(?:e|es|ed|ing|ion)\b/iu,
  /\bempower(?:s|ed|ing|ment)?\b/iu,
  /\bharness(?:es|ed|ing)?\b/iu,
  /\bin today[’']s world\b/iu,
] as const;

const UNSAFE_CLAIMS = [
  /\b(?:guaranteed|destined|inevitable|will definitely|certain to)\b/iu,
  /\b(?:diagnos(?:e|is)|cure|medication|pregnan(?:t|cy)|fertility)\b/iu,
  /\b(?:buy|sell|trade|invest(?:ment|ing)?)\b/iu,
  /\b(?:lawsuit|legal outcome|guilty|innocent)\b/iu,
] as const;

const BACKSTAGE_COPY = /\b(?:deterministic|noon[- ]UTC snapshot|verified position|source receipts?|proportionate to the evidence|supplied (?:day|week|position|snapshot)|event catalog|solar-house method)\b/iu;
const KITCHEN_FIRST_OPENING = /^(?:the\s+)?(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|new moon|full moon|solar eclipse|lunar eclipse)\b|(?:\bUTC\b|\d+(?:\.\d+)?°|\bsolar house\b)/iu;

const CANONICAL_SIGNS = new Set<string>(SIGN_SLUGS);
const CANONICAL_EVENT_KINDS = new Set(['ingress', 'lunation', 'station', 'aspect', 'eclipse']);
const SURFACES: readonly HoroscopeSurface[] = [
  'today', 'tomorrow', 'weekly', 'love', 'career', 'yearly-2027',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

interface SignRegister {
  daily: string;
  weekly: string;
  love: string;
  career: string;
  year: string;
  test: string;
}

const SIGN_REGISTER: Record<HoroscopeSign, SignRegister> = {
  aries: {
    daily: 'a clean first move matters more than a dramatic sprint',
    weekly: 'sequence the week before charging at its loudest moment',
    love: 'directness works when it also leaves room for an answer',
    career: 'initiative is useful once the target is specific',
    year: 'momentum needs a destination, not simply more speed',
    test: 'name the first workable move and leave the grand gesture alone',
  },
  taurus: {
    daily: 'steady attention can reveal which pressure is real and which can wait',
    weekly: 'protect the useful rhythm while making one deliberate adjustment',
    love: 'reliability says more than a perfectly staged reassurance',
    career: 'durable progress begins with the resource already in hand',
    year: 'change becomes usable when it has a stable place to land',
    test: 'keep what is sound and alter only the part that has stopped working',
  },
  gemini: {
    daily: 'the sharp question is more valuable than another quick answer',
    weekly: 'sort the useful signal from the week’s competing messages',
    love: 'curiosity helps when the conversation is allowed to finish',
    career: 'a precise brief will carry farther than scattered cleverness',
    year: 'information becomes direction only after it is edited',
    test: 'write the question down before collecting another opinion',
  },
  cancer: {
    daily: 'care works best when it includes a boundary around your own time',
    weekly: 'let private priorities set the pace before outside demands arrive',
    love: 'tenderness is clearer when the need beneath it is named',
    career: 'quiet preparation can support a more public decision',
    year: 'security grows through choices that can hold both memory and change',
    test: 'separate what needs protection from what simply feels familiar',
  },
  leo: {
    daily: 'presence is strongest when the point is clearer than the performance',
    weekly: 'give the week a center without making every moment orbit it',
    love: 'warmth lands best when admiration travels in both directions',
    career: 'visibility helps when the work underneath it is ready',
    year: 'creative authority deepens when attention serves a real purpose',
    test: 'choose the contribution you would still value without applause',
  },
  virgo: {
    daily: 'one useful correction is enough; the whole system does not need rebuilding',
    weekly: 'edit the process where friction repeats, then let the revision run',
    love: 'care is easier to feel when it is not disguised as a critique',
    career: 'a small operational fix may matter more than a larger announcement',
    year: 'discernment is most powerful when it leaves room for the unfinished',
    test: 'fix the repeatable error and stop before precision turns punitive',
  },
  libra: {
    daily: 'balance comes from a clear choice, not from extending every negotiation',
    weekly: 'notice where agreement is useful and where it only postpones the decision',
    love: 'fairness includes saying what you want before reading the room',
    career: 'good collaboration needs terms that everyone can actually see',
    year: 'reciprocity becomes real through decisions, limits, and follow-through',
    test: 'make the fair offer once, then allow the response to carry information',
  },
  scorpio: {
    daily: 'depth is useful when it produces a fact, a boundary, or a decision',
    weekly: 'follow the consequential thread without turning every silence into evidence',
    love: 'trust grows through measured disclosure rather than a hidden test',
    career: 'concentrated effort works better than trying to control every variable',
    year: 'transformation has weight when it changes an actual arrangement',
    test: 'ask what is known before assigning meaning to what is concealed',
  },
  sagittarius: {
    daily: 'the wider view helps once today’s practical detail has a place in it',
    weekly: 'keep the horizon visible while checking the route beneath your feet',
    love: 'honesty is kindest when timing and tone are part of the truth',
    career: 'a promising direction still needs a defined next checkpoint',
    year: 'freedom expands through commitments chosen with open eyes',
    test: 'connect the large idea to one appointment, draft, or measurable step',
  },
  capricorn: {
    daily: 'responsibility is clearer when you distinguish the essential from the inherited',
    weekly: 'build around the obligation that still matters, not every old expectation',
    love: 'commitment feels warmer when effort and affection are both visible',
    career: 'authority grows through a standard you can maintain',
    year: 'ambition becomes sustainable when the structure includes recovery',
    test: 'define the minimum sound structure before adding another duty',
  },
  aquarius: {
    daily: 'the original move is the one that improves the system, not merely surprises it',
    weekly: 'test the new idea against the people and conditions it is meant to serve',
    love: 'independence and closeness can coexist when expectations are explicit',
    career: 'innovation is credible when someone else can understand and use it',
    year: 'the future gets practical through alliances, prototypes, and revision',
    test: 'explain the experiment in terms another person could repeat',
  },
  pisces: {
    daily: 'intuition becomes useful after it is given a boundary and a concrete question',
    weekly: 'make enough quiet to hear the signal, then give it a practical form',
    love: 'empathy needs a clear edge so that closeness does not become guesswork',
    career: 'imagination carries farther when the handoff and deadline are visible',
    year: 'sensitivity becomes strength through form, timing, and selective attention',
    test: 'translate the feeling into one request, sketch, boundary, or pause',
  },
};

const HOUSE_ACTION: Record<number, string> = {
  1: 'make your own position visible before reacting to the room',
  2: 'check the budget of time, attention, and material resources',
  3: 'clarify the message, route, or conversation closest to hand',
  4: 'protect the conditions that make home and private life workable',
  5: 'give play, romance, or creative work a defined place',
  6: 'adjust the routine where the daily load repeatedly catches',
  7: 'put the agreement or disagreement directly on the table',
  8: 'name what is shared, owed, private, or difficult to divide',
  9: 'test the larger belief against study, distance, or direct experience',
  10: 'choose what should be visible in your work and public role',
  11: 'ask which friendship, group, or future plan still has momentum',
  12: 'leave room for rest, closure, and work that happens offstage',
};

const LOVE_ACTION: Record<number, string> = {
  1: 'state your preference without turning it into a demand',
  2: 'notice whether care is supported by consistent values and effort',
  3: 'let a specific conversation replace assumptions',
  4: 'make emotional safety tangible in the shared environment',
  5: 'allow pleasure and affection to be direct rather than overmanaged',
  6: 'look at the small routines through which care is actually delivered',
  7: 'treat reciprocity as an observable practice',
  8: 'approach trust, intimacy, and shared resources with explicit terms',
  9: 'make room for different beliefs without abandoning your own',
  10: 'consider how private bonds and public obligations affect each other',
  11: 'let friendship and a shared future carry part of the relationship',
  12: 'pause before confusing empathy with responsibility for another person',
};

const CAREER_ACTION: Record<number, string> = {
  1: 'define how you want to enter the room and begin',
  2: 'review compensation, capacity, and the resources behind the plan',
  3: 'tighten the brief, message, or nearby exchange',
  4: 'stabilize the private base that supports public work',
  5: 'give authorship and creative risk an appropriate share of the schedule',
  6: 'repair the workflow before asking effort alone to solve it',
  7: 'make roles and terms clear with partners or clients',
  8: 'review shared costs, obligations, access, and accountability',
  9: 'connect the task to training, publishing, travel, or a wider field',
  10: 'put the strongest finished work where decision-makers can see it',
  11: 'use the network as a place for contribution, not only exposure',
  12: 'finish background work and protect concentration from unnecessary display',
};

const YEAR_QUESTIONS: Record<number, string> = {
  1: 'What version of your role is ready to become visible through repeated action?',
  2: 'Which resources deserve firmer terms, and which measures of worth are no longer useful?',
  3: 'What needs to be said, learned, documented, or carried across a short distance?',
  4: 'What would make the private base steadier enough to support the rest of the year?',
  5: 'Which pleasure, creative work, or affection deserves protected time rather than leftover time?',
  6: 'Where can a routine become kinder, clearer, and easier to repeat?',
  7: 'Which agreement becomes healthier when both sides can see its terms?',
  8: 'What shared obligation, intimacy, or resource needs a more explicit arrangement?',
  9: 'Which belief should be tested through study, travel, teaching, or direct experience?',
  10: 'What standard do you want your public work and reputation to demonstrate?',
  11: 'Which people and future plans are capable of becoming a durable alliance?',
  12: 'What can close, rest, or move behind the scenes without being treated as failure?',
};

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function horoscopeWordCount(text: string): number {
  return text.normalize('NFKC').match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function tokens(text: string): string[] {
  return text.normalize('NFKC').toLocaleLowerCase('en')
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function horoscopeShingleJaccard(leftText: string, rightText: string, width = 3): number {
  const make = (text: string): Set<string> => {
    const values = tokens(text);
    if (values.length < width) return new Set(values.length ? [values.join(' ')] : []);
    return new Set(values.slice(0, values.length - width + 1).map((_, index) => (
      values.slice(index, index + width).join(' ')
    )));
  };
  const left = make(leftText);
  const right = make(rightText);
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isoWeek(date: string): { from: string; through: string; dates: string[] } {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const mondayOffset = (parsed.getUTCDay() + 6) % 7;
  const from = addDays(date, -mondayOffset);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(from, index));
  return { from, through: dates[6], dates };
}

function dateLabel(dateOrInstant: string): string {
  const parsed = new Date(dateOrInstant.length === 10 ? `${dateOrInstant}T00:00:00.000Z` : dateOrInstant);
  return `${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
}

function timeLabel(at: string): string {
  return `${at.slice(11, 16)} UTC`;
}

function factToken(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function violation(ruleId: string, path: string, message: string): HoroscopeProgramViolation {
  return { ruleId, path, message };
}

export function validateHoroscopeProgramInput(
  input: BuildHoroscopeProgramInput,
): HoroscopeProgramViolation[] {
  const failures: HoroscopeProgramViolation[] = [];
  if (!isDate(input.anchorDate)) {
    failures.push(violation('INPUT-DATE', 'input.anchorDate', 'anchorDate must be a real YYYY-MM-DD UTC date'));
  }
  if (!Array.isArray(input.dailySnapshots)) {
    failures.push(violation('INPUT-SNAPSHOTS', 'input.dailySnapshots', 'dailySnapshots must be an array'));
  } else {
    const dates = new Set<string>();
    input.dailySnapshots.forEach((daily, index) => {
      const path = `input.dailySnapshots[${index}]`;
      if (dates.has(daily?.date)) {
        failures.push(violation('INPUT-DUPLICATE-DATE', `${path}.date`, `duplicate daily snapshot ${daily.date}`));
      }
      dates.add(daily?.date);
      for (const failure of validateDailyFacts(daily)) {
        failures.push(violation(`INPUT-${failure.ruleId}`, `${path}.${failure.path}`, failure.message));
      }
    });
  }

  if (input.yearlyEvents !== undefined && !Array.isArray(input.yearlyEvents)) {
    failures.push(violation('INPUT-YEAR-EVENTS', 'input.yearlyEvents', 'yearlyEvents must be an array when supplied'));
  } else {
    const identities = new Set<string>();
    (input.yearlyEvents ?? []).forEach((event, index) => {
      const path = `input.yearlyEvents[${index}]`;
      if (!CANONICAL_EVENT_KINDS.has(event.kind)) {
        failures.push(violation('INPUT-EVENT-KIND', `${path}.kind`, `unsupported event kind ${String(event.kind)}`));
      }
      const isYearInstant = isInstant(event.at) && event.at.slice(0, 4) === '2027';
      const isAdjacentStationBoundary = event.kind === 'station'
        && isInstant(event.at)
        && (event.at.slice(0, 4) === '2026' || event.at.slice(0, 4) === '2028');
      if (!isYearInstant && !isAdjacentStationBoundary) {
        failures.push(violation(
          'INPUT-EVENT-INSTANT',
          `${path}.at`,
          'yearly event must use a canonical 2027 instant; station boundaries may use adjacent 2026/2028 instants',
        ));
      }
      for (const [key, value] of [['sign', event.sign], ['aSign', event.aSign], ['bSign', event.bSign]] as const) {
        if (value !== undefined && !CANONICAL_SIGNS.has(value)) {
          failures.push(violation('INPUT-EVENT-SIGN', `${path}.${key}`, `unsupported sign ${value}`));
        }
      }
      if (['ingress', 'lunation', 'station', 'eclipse'].includes(event.kind) && !event.sign) {
        failures.push(violation('INPUT-EVENT-SIGN', `${path}.sign`, `${event.kind} requires a sign`));
      }
      if (event.kind === 'ingress' && !event.planet) {
        failures.push(violation('INPUT-EVENT-BODY', `${path}.planet`, 'ingress requires a planet'));
      }
      if (event.kind === 'station' && (!event.planet || !['retrograde', 'direct'].includes(event.type ?? ''))) {
        failures.push(violation('INPUT-EVENT-STATION', path, 'station requires a planet and retrograde/direct type'));
      }
      if (event.kind === 'lunation' && !['new', 'full'].includes(event.type ?? '')) {
        failures.push(violation('INPUT-EVENT-LUNATION', `${path}.type`, 'lunation requires new/full type'));
      }
      if (event.kind === 'eclipse' && !['solar', 'lunar'].includes(event.type ?? '')) {
        failures.push(violation('INPUT-EVENT-ECLIPSE', `${path}.type`, 'eclipse requires solar/lunar type'));
      }
      if (event.kind === 'aspect' && (!event.a || !event.b || !event.type || !event.aSign || !event.bSign)) {
        failures.push(violation('INPUT-EVENT-ASPECT', path, 'aspect requires both bodies, type, and both signs'));
      }
      if (event.kind === 'aspect' && event.orb !== 0) {
        failures.push(violation(
          'INPUT-EVENT-ASPECT-ORB',
          `${path}.orb`,
          'exact aspect must explicitly use a zero-degree orb',
        ));
      }
      for (const [key, value] of [['degree', event.degree], ['aDegree', event.aDegree], ['bDegree', event.bDegree]] as const) {
        if (value !== undefined && (!Number.isFinite(value) || value < 0 || value >= 30)) {
          failures.push(violation('INPUT-EVENT-DEGREE', `${path}.${key}`, 'degree must be finite and in [0, 30)'));
        }
      }
      const identity = JSON.stringify(event);
      if (identities.has(identity)) failures.push(violation('INPUT-EVENT-DUPLICATE', path, 'duplicate yearly event'));
      identities.add(identity);
    });
  }
  return failures;
}

class EvidenceCatalog {
  private readonly receipts = new Map<string, HoroscopeEvidenceReceipt>();

  position(daily: Daily, body: DailyBody, sunSign: HoroscopeSign): string[] {
    const sourceId = dailyBodyFactId(daily.date, body);
    this.receipts.set(sourceId, {
      id: sourceId,
      kind: 'body-position',
      sourceId: `daily-snapshot:${daily.date}:1200z`,
      label: `${body.body} ${body.degree.toFixed(1)}° ${cap(body.sign)}${body.retrograde ? ', retrograde' : ''} at 12:00 UTC`,
      at: daily.snapshotAt ?? `${daily.date}T12:00:00.000Z`,
      body: body.body,
      sign: body.sign,
      degree: body.degree,
      moonPhase: body.body === 'Moon' ? daily.moon.phase : undefined,
      retrograde: body.retrograde,
    });
    const house = solarHouse(body.sign, sunSign);
    const houseId = dailyHouseFactId(daily.date, sunSign, sourceId, house);
    this.receipts.set(houseId, {
      id: houseId,
      kind: 'solar-house',
      sourceId,
      sourceFactId: sourceId,
      label: `${body.body} in ${cap(body.sign)} maps to ${cap(sunSign)} solar house ${house}`,
      at: daily.snapshotAt ?? `${daily.date}T12:00:00.000Z`,
      body: body.body,
      sign: body.sign,
      sunSign,
      house,
    });
    return [sourceId, houseId];
  }

  event(
    event: HoroscopeProgramEvent,
    sunSign: HoroscopeSign,
    source: { date?: string; sourceId: string },
  ): string[] {
    const eventId = source.date
      ? dailyEventFactId(source.date, event as DailyEvent)
      : `fact:2027:event:${event.kind}:${event.at}:${factToken(eventIdentity(event))}`;
    const label = eventLabel(event);
    this.receipts.set(eventId, {
      id: eventId,
      kind: 'sky-event',
      sourceId: event.sourceId ?? source.sourceId,
      label,
      at: event.at,
      body: event.planet ?? event.a ?? (event.kind === 'eclipse' || event.kind === 'lunation' ? 'Moon' : undefined),
      eventKind: event.kind,
      eventType: event.type,
      a: event.a,
      b: event.b,
      sign: event.sign,
      degree: event.degree,
      orb: event.orb,
      retrograde: event.retrograde,
    });
    const refs = [eventId];
    const signs = event.sign
      ? [{ sign: event.sign, body: event.planet ?? (event.kind === 'lunation' || event.kind === 'eclipse' ? 'Moon' : undefined) }]
      : [
          ...(event.aSign ? [{ sign: event.aSign, body: event.a }] : []),
          ...(event.bSign ? [{ sign: event.bSign, body: event.b }] : []),
        ];
    for (const placement of signs) {
      const house = solarHouse(placement.sign, sunSign);
      const houseId = `derived:${event.at.slice(0, 10)}:solar-house:${sunSign}:h${house}:${factToken(eventId)}:${placement.body ?? 'event'}`;
      this.receipts.set(houseId, {
        id: houseId,
        kind: 'solar-house',
        sourceId: eventId,
        sourceFactId: eventId,
        label: `${placement.body ?? cap(event.kind)} in ${cap(placement.sign)} maps to ${cap(sunSign)} solar house ${house}`,
        at: event.at,
        body: placement.body,
        eventKind: event.kind,
        sign: placement.sign,
        orb: event.orb,
        sunSign,
        house,
      });
      refs.push(houseId);
    }
    return refs;
  }

  values(): HoroscopeEvidenceReceipt[] {
    return [...this.receipts.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}

function eventIdentity(event: HoroscopeProgramEvent): string {
  if (event.kind === 'aspect') return `${event.a}-${event.type}-${event.b}`;
  return `${event.planet ?? event.type ?? 'moon'}-${event.sign ?? 'unknown'}`;
}

function eventLabel(event: HoroscopeProgramEvent): string {
  const degree = event.degree === undefined ? '' : ` at ${event.degree.toFixed(1)}°`;
  if (event.kind === 'ingress') return `${event.planet} enters ${cap(event.sign ?? '')} on ${dateLabel(event.at)} at ${timeLabel(event.at)}`;
  if (event.kind === 'station') return `${event.planet} stations ${event.type} in ${cap(event.sign ?? '')}${degree} on ${dateLabel(event.at)} at ${timeLabel(event.at)}`;
  if (event.kind === 'lunation') return `${event.type === 'new' ? 'New Moon' : 'Full Moon'} in ${cap(event.sign ?? '')}${degree} on ${dateLabel(event.at)} at ${timeLabel(event.at)}`;
  if (event.kind === 'eclipse') return `${cap(event.type ?? '')} eclipse in ${cap(event.sign ?? '')}${degree} on ${dateLabel(event.at)} at ${timeLabel(event.at)}`;
  return `${event.a} ${event.type} ${event.b} on ${dateLabel(event.at)} at ${timeLabel(event.at)}`;
}

function eventHouses(event: HoroscopeProgramEvent, sign: HoroscopeSign): number[] {
  const signs = event.sign ? [event.sign] : [event.aSign, event.bSign].filter(Boolean) as string[];
  return [...new Set(signs.map((eventSign) => solarHouse(eventSign, sign)))];
}

function body(daily: Daily, name: string): DailyBody {
  const found = daily.bodies.find((candidate) => candidate.body === name);
  if (!found) throw new Error(`Validated ${daily.date} snapshot has no ${name}`);
  return found;
}

function eventName(event: HoroscopeProgramEvent): string {
  if (event.kind === 'ingress') return `${event.planet} entering ${cap(event.sign ?? '')}`;
  if (event.kind === 'station') return `${event.planet} stationing ${event.type} in ${cap(event.sign ?? '')}`;
  if (event.kind === 'lunation') return `${event.type === 'new' ? 'the New Moon' : 'the Full Moon'} in ${cap(event.sign ?? '')}`;
  if (event.kind === 'eclipse') return `${event.type === 'solar' ? 'the solar eclipse' : 'the lunar eclipse'} in ${cap(event.sign ?? '')}`;
  return `${event.a} ${event.type} ${event.b}`;
}

function eventSentence(event: HoroscopeProgramEvent, sign: HoroscopeSign): string {
  const houses = eventHouses(event, sign);
  if (houses.length === 2) {
    return `${eventName(event)} connects ${HOUSE_THEME[houses[0]]} with ${HOUSE_THEME[houses[1]]}.`;
  }
  const house = houses[0];
  return `${eventName(event)} brings ${HOUSE_THEME[house]} into focus.`;
}

function passage(text: string, evidenceRefs: string[]): HoroscopePassage {
  return { text: text.replace(/\s+/g, ' ').trim(), evidenceRefs: [...new Set(evidenceRefs)] };
}

function reading(
  surface: HoroscopeSurface,
  sign: HoroscopeSign,
  period: { from: string; through: string },
  title: string,
  passages: HoroscopePassage[],
): HoroscopeReading {
  const padded = padReading(surface, sign, passages);
  const text = padded.map((item) => item.text).join('\n\n');
  return {
    surface,
    sign,
    period: { ...period, utcBasis: true },
    title,
    status: 'publishable',
    passages: padded,
    text,
    wordCount: horoscopeWordCount(text),
  };
}

function fallbackReading(
  surface: HoroscopeSurface,
  sign: HoroscopeSign,
  period: { from: string; through: string },
  reason: string,
): HoroscopeReading {
  const text = `${cap(sign)} ${surface.replace('yearly-2027', '2027')} is being held because ${reason}. Zodiacs.org does not replace missing sky data with generic predictions.`;
  return {
    surface,
    sign,
    period: { ...period, utcBasis: true },
    title: `${cap(sign)} ${surface === 'yearly-2027' ? '2027 horoscope' : `${cap(surface)} horoscope`}`,
    status: 'insufficient-evidence',
    fallbackReason: reason,
    passages: [{ text, evidenceRefs: [] }],
    text,
    wordCount: horoscopeWordCount(text),
  };
}

function padReading(
  surface: HoroscopeSurface,
  sign: HoroscopeSign,
  original: HoroscopePassage[],
): HoroscopePassage[] {
  const passages = original.map((item) => ({ ...item, evidenceRefs: [...item.evidenceRefs] }));
  const { min, max } = HOROSCOPE_WORD_BOUNDS[surface];
  const profile = SIGN_REGISTER[sign];
  const sources = passages.flatMap((item) => item.evidenceRefs);
  const additions = [
    `For ${cap(sign)}, the useful test is to ${profile.test}.`,
    `Let this be the thread to follow: ${profile.daily}.`,
    `Treat the timing as an invitation to notice what is ready for attention, never as a promise.`,
    `If a theme does not match your circumstances, let it pass instead of bending the day to fit it.`,
    `Bring the symbolism down to one honest question you can act on.`,
  ];
  let index = 0;
  while (horoscopeWordCount(passages.map((item) => item.text).join(' ')) < min) {
    const target = passages[index % Math.max(passages.length, 1)];
    if (!target) {
      passages.push(passage(additions[index % additions.length], sources));
    } else {
      target.text = `${target.text} ${additions[index % additions.length]}`;
    }
    index += 1;
    if (index > 80) throw new Error(`Unable to reach ${surface} minimum word count`);
  }
  const count = horoscopeWordCount(passages.map((item) => item.text).join(' '));
  if (count > max) throw new Error(`${surface} renderer produced ${count} words; maximum is ${max}`);
  return passages;
}

function dailySurface(
  surface: 'today' | 'tomorrow',
  sign: HoroscopeSign,
  daily: Daily,
  catalog: EvidenceCatalog,
): HoroscopeReading {
  const profile = SIGN_REGISTER[sign];
  const moon = body(daily, 'Moon');
  const signIndex = SIGN_SLUGS.indexOf(sign);
  const secondaryName = ['Mercury', 'Venus', 'Mars', 'Saturn'][signIndex % 4];
  const secondary = body(daily, secondaryName);
  const moonHouse = solarHouse(moon.sign, sign);
  const secondaryHouse = solarHouse(secondary.sign, sign);
  const dayWord = surface === 'today' ? 'Today' : 'Tomorrow';
  const passages = [
    passage(
      `${dayWord}, ${HOUSE_ACTION[moonHouse]}. For ${cap(sign)}, ${profile.daily}. The ${daily.moon.phase.toLocaleLowerCase('en')} Moon brings ${HOUSE_THEME[moonHouse]} into the picture.`,
      catalog.position(daily, moon, sign),
    ),
    passage(
      `${cap(HOUSE_ACTION[secondaryHouse])}. Give the situation room to show you what it needs instead of forcing one symbol into a verdict. ${secondary.body}${secondary.retrograde ? ' retrograde' : ''} in ${cap(secondary.sign)} adds emphasis to ${HOUSE_THEME[secondaryHouse]}.`,
      catalog.position(daily, secondary, sign),
    ),
  ];
  const exact = daily.events[0] as HoroscopeProgramEvent | undefined;
  if (exact) {
    passages.push(passage(
      `Let this be the day’s pivot: test one real conversation, task, or choice before drawing a larger conclusion. ${eventSentence(exact, sign)}`,
      catalog.event(exact, sign, { date: daily.date, sourceId: daily.eventsSource ?? `daily-snapshot:${daily.date}` }),
    ));
  } else {
    passages.push(passage(
      `${dayWord}, the practical move is to ${profile.test}. ${cap(profile.weekly)}.`,
      [...catalog.position(daily, moon, sign), ...catalog.position(daily, secondary, sign)],
    ));
  }
  return reading(
    surface,
    sign,
    { from: daily.date, through: daily.date },
    `${cap(sign)} horoscope for ${surface === 'today' ? dateLabel(daily.date) : `tomorrow, ${dateLabel(daily.date)}`}`,
    passages,
  );
}

function loveSurface(sign: HoroscopeSign, daily: Daily, catalog: EvidenceCatalog): HoroscopeReading {
  const venus = body(daily, 'Venus');
  const moon = body(daily, 'Moon');
  const venusHouse = solarHouse(venus.sign, sign);
  const moonHouse = solarHouse(moon.sign, sign);
  return reading('love', sign, { from: daily.date, through: daily.date }, `${cap(sign)} love horoscope for ${dateLabel(daily.date)}`, [
    passage(
      `${cap(LOVE_ACTION[venusHouse])}. For ${cap(sign)}, ${SIGN_REGISTER[sign].love}. Venus brings ${HOUSE_THEME[venusHouse]} into the relationship foreground.`,
      catalog.position(daily, venus, sign),
    ),
    passage(
      `${cap(LOVE_ACTION[moonHouse])}. Let the other person’s response be information, not a riddle you must solve in advance. The Moon shifts the emotional weather toward ${HOUSE_THEME[moonHouse]}.`,
      catalog.position(daily, moon, sign),
    ),
  ]);
}

function careerSurface(sign: HoroscopeSign, daily: Daily, catalog: EvidenceCatalog): HoroscopeReading {
  const signIndex = SIGN_SLUGS.indexOf(sign);
  const primary = body(daily, ['Mercury', 'Saturn', 'Mars'][signIndex % 3]);
  const sun = body(daily, 'Sun');
  const primaryHouse = solarHouse(primary.sign, sign);
  const sunHouse = solarHouse(sun.sign, sign);
  const sunLead = sunHouse === primaryHouse
    ? `Use this as the standard: ${SIGN_REGISTER[sign].career}.`
    : `${cap(CAREER_ACTION[sunHouse])}.`;
  return reading('career', sign, { from: daily.date, through: daily.date }, `${cap(sign)} career horoscope for ${dateLabel(daily.date)}`, [
    passage(
      `${cap(CAREER_ACTION[primaryHouse])}. For ${cap(sign)}, ${SIGN_REGISTER[sign].career}. ${primary.body}${primary.retrograde ? ' retrograde' : ''} brings ${HOUSE_THEME[primaryHouse]} into the work picture.`,
      catalog.position(daily, primary, sign),
    ),
    passage(
      `${sunLead} Build around choices you can revisit instead of treating the mood as a promised professional result. The Sun widens the frame to ${HOUSE_THEME[sunHouse]}.`,
      catalog.position(daily, sun, sign),
    ),
  ]);
}

function uniqueWeekEvents(days: Daily[]): Array<{ event: HoroscopeProgramEvent; daily: Daily }> {
  const seen = new Set<string>();
  const result: Array<{ event: HoroscopeProgramEvent; daily: Daily }> = [];
  for (const daily of days) for (const event of daily.events) {
    const identity = JSON.stringify(event);
    if (seen.has(identity)) continue;
    seen.add(identity);
    result.push({ event, daily });
  }
  return result.sort((left, right) => left.event.at.localeCompare(right.event.at));
}

function weeklySurface(sign: HoroscopeSign, days: Daily[], catalog: EvidenceCatalog): HoroscopeReading {
  const start = days[0];
  const middle = days[3];
  const end = days[6];
  const startMoon = body(start, 'Moon');
  const middleMoon = body(middle, 'Moon');
  const endMoon = body(end, 'Moon');
  const startHouse = solarHouse(startMoon.sign, sign);
  const middleHouse = solarHouse(middleMoon.sign, sign);
  const endHouse = solarHouse(endMoon.sign, sign);
  const passages = [
    passage(
      `${cap(SIGN_REGISTER[sign].weekly)}. Start by choosing one practical way to ${HOUSE_ACTION[startHouse]}, then make room for ${HOUSE_THEME[middleHouse]} by Thursday. The Moon’s movement connects the two parts of the week.`,
      [...catalog.position(start, startMoon, sign), ...catalog.position(middle, middleMoon, sign)],
    ),
    passage(
      `Early in the week, turn toward ${HOUSE_THEME[startHouse]}. ${cap(HOUSE_ACTION[startHouse])}. Keep the adjustment small enough to notice what it changes.`,
      catalog.position(start, startMoon, sign),
    ),
    passage(
      `By midweek, attention shifts to ${HOUSE_THEME[middleHouse]}. ${cap(HOUSE_ACTION[middleHouse])}.`,
      catalog.position(middle, middleMoon, sign),
    ),
  ];
  const exact = uniqueWeekEvents(days)[0];
  if (exact) {
    passages.push(passage(
      `Treat the week’s turning point as a moment to notice what changes, not a deadline for forcing a result. ${eventSentence(exact.event, sign)}`,
      catalog.event(exact.event, sign, { date: exact.daily.date, sourceId: exact.daily.eventsSource ?? `daily-snapshot:${exact.daily.date}` }),
    ));
  } else {
    const mercury = body(middle, 'Mercury');
    const mercuryHouse = solarHouse(mercury.sign, sign);
    passages.push(passage(
      `By midweek, ${HOUSE_ACTION[mercuryHouse]}. Mercury adds emphasis to ${HOUSE_THEME[mercuryHouse]}.`,
      catalog.position(middle, mercury, sign),
    ));
  }
  passages.push(passage(
    `The week closes by returning attention to ${HOUSE_THEME[endHouse]}. ${cap(HOUSE_ACTION[endHouse])}. For ${cap(sign)}, the useful review is to ${SIGN_REGISTER[sign].test}.`,
    catalog.position(end, endMoon, sign),
  ));
  return reading('weekly', sign, { from: start.date, through: end.date }, `${cap(sign)} weekly horoscope, ${dateLabel(start.date)}–${dateLabel(end.date)}`, passages);
}

function hasYearCoverage(events: readonly HoroscopeProgramEvent[]): boolean {
  const inYear = events.filter((event) => event.at.startsWith('2027-'));
  const kinds = new Set(inYear.map((event) => event.kind));
  const stationTypes = new Set(
    events.filter((event) => event.kind === 'station').map((event) => event.type),
  );
  return inYear.length >= 6
    && kinds.has('ingress')
    && kinds.has('eclipse')
    && kinds.has('station')
    && stationTypes.has('retrograde')
    && stationTypes.has('direct');
}

function chooseEvent(
  events: readonly HoroscopeProgramEvent[],
  sign: HoroscopeSign,
  preferredHouses: readonly number[],
  offset: number,
): HoroscopeProgramEvent {
  const preferred = events.filter((event) => eventHouses(event, sign).some((house) => preferredHouses.includes(house)));
  const candidates = preferred.length ? preferred : [...events];
  return candidates[offset % candidates.length];
}

function yearEventPassage(
  event: HoroscopeProgramEvent,
  sign: HoroscopeSign,
  slot: number,
  catalog: EvidenceCatalog,
): HoroscopePassage {
  const houses = eventHouses(event, sign);
  const primary = houses[0];
  const secondary = houses[1];
  const placement = secondary
    ? `${cap(eventName(event))} connects ${HOUSE_THEME[primary]} with ${HOUSE_THEME[secondary]} around ${dateLabel(event.at)}.`
    : `${cap(eventName(event))} brings ${HOUSE_THEME[primary]} into focus around ${dateLabel(event.at)}.`;
  const profile = SIGN_REGISTER[sign];
  const approaches = [
    `For ${cap(sign)}, the test is to ${profile.test}.`,
    `The ${cap(sign)} lens is that ${profile.daily}.`,
    `Across the year, ${profile.year}.`,
    `In practice, ${profile.weekly}.`,
  ];
  const eventPractice: Record<HoroscopeProgramEvent['kind'], string[]> = {
    aspect: [
      'An exact aspect is a timing marker, so test it against what is observable rather than stretching it across the whole year.',
      'Treat the aspect as a short checkpoint inside the longer sequence, not as the year’s final verdict.',
    ],
    ingress: [
      'An ingress changes the emphasis over months; let the pattern reveal itself over time.',
      'Because an ingress opens a longer chapter, review the pattern later instead of forcing an immediate conclusion.',
    ],
    lunation: [
      'A lunation offers a short review window; ordinary context still decides what can begin, end, or change.',
      'Keep the lunation’s symbolic window proportionate to the choices and constraints already in view.',
    ],
    station: [
      'A station marks a change of pace; allow the surrounding days to show what actually needs review.',
      'Stations can concentrate attention around a process, but what needs review may reveal itself gradually.',
    ],
    eclipse: [
      'An eclipse can sharpen attention around the date without guaranteeing a rupture or reversal.',
      'Use the eclipse as a visible checkpoint while leaving room for events to be ordinary, gradual, or unrelated.',
    ],
  };
  const practice = eventPractice[event.kind][slot % eventPractice[event.kind].length];
  return passage(
    `${YEAR_QUESTIONS[primary]} ${approaches[slot % approaches.length]} ${placement} ${practice}`,
    catalog.event(event, sign, { sourceId: event.sourceId ?? 'input:yearlyEvents' }),
  );
}

function yearlySurface(
  sign: HoroscopeSign,
  events: readonly HoroscopeProgramEvent[],
  catalog: EvidenceCatalog,
): HoroscopeReading {
  // Adjacent-year station boundaries keep overlapping retrograde periods
  // complete in the fact catalog. Reader copy remains a 2027 edition.
  const ordered = events
    .filter((event) => event.at.startsWith('2027-'))
    .sort((left, right) => left.at.localeCompare(right.at));
  const passages: HoroscopePassage[] = [];
  // Register the complete catalog, including 2026/2028 station boundaries,
  // even though only in-year events are narrated below.
  for (const event of events) {
    catalog.event(event, sign, { sourceId: event.sourceId ?? 'input:yearlyEvents' });
  }
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const openingRefs = [
    ...catalog.event(first, sign, { sourceId: first.sourceId ?? 'input:yearlyEvents' }),
    ...catalog.event(last, sign, { sourceId: last.sourceId ?? 'input:yearlyEvents' }),
  ];
  passages.push(passage(
    `${cap(sign)} enters 2027 with one clear through-line: ${SIGN_REGISTER[sign].year}. Use the year’s turning points to plan, reflect, and decide where your attention belongs, without treating any one moment as a verdict. The sequence begins with ${eventName(first)} in ${MONTHS[new Date(first.at).getUTCMonth()]} and closes with ${eventName(last)} in ${MONTHS[new Date(last.at).getUTCMonth()]}.`,
    openingRefs,
  ));

  const chronologicalSlots = Math.max(8, ordered.length);
  for (let index = 0; index < chronologicalSlots; index += 1) {
    passages.push(yearEventPassage(ordered[index % ordered.length], sign, index, catalog));
  }

  const loveEvent = chooseEvent(ordered, sign, [5, 7, 8, 11], SIGN_SLUGS.indexOf(sign));
  const loveHouse = eventHouses(loveEvent, sign)[0];
  passages.push(passage(
    `For relationships, look closely at reciprocity, boundaries, attention, and the choices people can actually discuss. ${cap(LOVE_ACTION[loveHouse])}; ${SIGN_REGISTER[sign].love}. Around ${dateLabel(loveEvent.at)}, ${eventName(loveEvent)} brings ${HOUSE_THEME[loveHouse]} forward. Revisit the question afterward rather than judging the whole year by one charged moment.`,
    catalog.event(loveEvent, sign, { sourceId: loveEvent.sourceId ?? 'input:yearlyEvents' }),
  ));

  const careerEvent = chooseEvent(ordered, sign, [2, 6, 10, 11], SIGN_SLUGS.indexOf(sign) + 2);
  const careerHouse = eventHouses(careerEvent, sign)[0];
  passages.push(passage(
    `For work and resources, begin with capacity, responsibilities, collaborators, and the difference between visible urgency and work that will still matter a month later. ${cap(CAREER_ACTION[careerHouse])}; ${SIGN_REGISTER[sign].career}. Around ${dateLabel(careerEvent.at)}, ${eventName(careerEvent)} emphasizes ${HOUSE_THEME[careerHouse]}. Treat the timing as planning context rather than financial instruction.`,
    catalog.event(careerEvent, sign, { sourceId: careerEvent.sourceId ?? 'input:yearlyEvents' }),
  ));

  const privateEvent = chooseEvent(ordered, sign, [1, 4, 12], SIGN_SLUGS.indexOf(sign) + 4);
  const privateHouse = eventHouses(privateEvent, sign)[0];
  passages.push(passage(
    `The year needs a private counterweight: ${HOUSE_ACTION[privateHouse]}. Keep your boundaries, relationships, and existing commitments in view as you respond. Around ${dateLabel(privateEvent.at)}, ${eventName(privateEvent)} brings ${HOUSE_THEME[privateHouse]} into focus and may help you notice a shift in emphasis.`,
    catalog.event(privateEvent, sign, { sourceId: privateEvent.sourceId ?? 'input:yearlyEvents' }),
  ));

  passages.push(passage(
    `Read the year in sequence rather than as a single verdict. Keep a dated note when ${eventName(first)} arrives, then compare it with what is happening by ${eventName(last)}. For ${cap(sign)}, the through-line is to ${SIGN_REGISTER[sign].test}. The dates offer a rhythm; your choices and circumstances write the actual story.`,
    openingRefs,
  ));

  return reading('yearly-2027', sign, { from: '2027-01-01', through: '2027-12-31' }, `${cap(sign)} 2027 horoscope`, passages);
}

export class HoroscopeProgramInputError extends Error {
  constructor(readonly violations: HoroscopeProgramViolation[]) {
    super(`Invalid horoscope program input:\n${violations.map((failure) => `- ${failure.path}: ${failure.message}`).join('\n')}`);
    this.name = 'HoroscopeProgramInputError';
  }
}

/** Build all six Phase-1 surfaces for all twelve signs. */
export function buildHoroscopeProgram(input: BuildHoroscopeProgramInput): HoroscopeProgram {
  const inputFailures = validateHoroscopeProgramInput(input);
  if (inputFailures.length) throw new HoroscopeProgramInputError(inputFailures);

  const snapshots = new Map(input.dailySnapshots.map((daily) => [daily.date, daily]));
  const today = snapshots.get(input.anchorDate);
  const tomorrowDate = addDays(input.anchorDate, 1);
  const tomorrow = snapshots.get(tomorrowDate);
  const week = isoWeek(input.anchorDate);
  const weekDays = week.dates.map((date) => snapshots.get(date)).filter((value): value is Daily => Boolean(value));
  const yearlyEvents = input.yearlyEvents ?? [];
  const yearComplete = hasYearCoverage(yearlyEvents);
  const catalog = new EvidenceCatalog();

  const signs: HoroscopeSignProgram[] = SIGN_SLUGS.map((sign) => {
    const todayReading = today
      ? dailySurface('today', sign, today, catalog)
      : fallbackReading('today', sign, { from: input.anchorDate, through: input.anchorDate }, `the ${input.anchorDate} noon UTC snapshot was not supplied`);
    const tomorrowReading = tomorrow
      ? dailySurface('tomorrow', sign, tomorrow, catalog)
      : fallbackReading('tomorrow', sign, { from: tomorrowDate, through: tomorrowDate }, `the ${tomorrowDate} noon UTC snapshot was not supplied`);
    const loveReading = today
      ? loveSurface(sign, today, catalog)
      : fallbackReading('love', sign, { from: input.anchorDate, through: input.anchorDate }, `the ${input.anchorDate} noon UTC snapshot was not supplied`);
    const careerReading = today
      ? careerSurface(sign, today, catalog)
      : fallbackReading('career', sign, { from: input.anchorDate, through: input.anchorDate }, `the ${input.anchorDate} noon UTC snapshot was not supplied`);
    const weeklyReading = weekDays.length === 7
      ? weeklySurface(sign, weekDays, catalog)
      : fallbackReading('weekly', sign, { from: week.from, through: week.through }, `only ${weekDays.length} of 7 ISO-week snapshots were supplied`);
    const yearlyReading = yearComplete
      ? yearlySurface(sign, yearlyEvents, catalog)
      : fallbackReading('yearly-2027', sign, { from: '2027-01-01', through: '2027-12-31' }, 'the 2027 catalog does not yet include at least six major events with ingress, eclipse, and retrograde/direct station coverage');
    return {
      sign,
      readings: {
        today: todayReading,
        tomorrow: tomorrowReading,
        weekly: weeklyReading,
        love: loveReading,
        career: careerReading,
        'yearly-2027': yearlyReading,
      },
    };
  });

  return {
    schema: HOROSCOPE_PROGRAM_SCHEMA,
    anchorDate: input.anchorDate,
    locale: 'en',
    policy: {
      id: 'org.zodiacs.horoscope-program.en',
      version: '1.0.0',
      rendererVersion: HOROSCOPE_PROGRAM_RENDERER,
      mode: 'deterministic-template',
      model: null,
    },
    coverage: {
      today: today ? 'complete' : 'unavailable',
      tomorrow: tomorrow ? 'complete' : 'unavailable',
      isoWeek: weekDays.length === 7 ? 'complete' : weekDays.length ? 'partial' : 'unavailable',
      yearly2027: yearComplete ? 'complete' : 'insufficient',
    },
    evidence: catalog.values(),
    signs,
  };
}

function voiceViolations(text: string, path: string): HoroscopeProgramViolation[] {
  const failures: HoroscopeProgramViolation[] = [];
  if (text.includes('!')) failures.push(violation('VOICE-EXCLAMATION', path, 'exclamation marks are not allowed'));
  if (/<[^>]+>/.test(text)) failures.push(violation('VOICE-MARKUP', path, 'reading copy must be plain text'));
  for (const pattern of MASTER_BRIEF_BANNED) {
    if (pattern.test(text)) failures.push(violation('VOICE-BANNED', path, `copy matches ${pattern.source}`));
  }
  for (const pattern of UNSAFE_CLAIMS) {
    if (pattern.test(text)) failures.push(violation('VOICE-UNSAFE', path, `copy matches ${pattern.source}`));
  }
  return failures;
}

/** Structural, editorial, evidence, and distinctness gate for serialized output. */
export function validateHoroscopeProgram(program: HoroscopeProgram): HoroscopeProgramViolation[] {
  const failures: HoroscopeProgramViolation[] = [];
  if (program.schema !== HOROSCOPE_PROGRAM_SCHEMA) {
    failures.push(violation('STRUCT-SCHEMA', 'program.schema', `expected ${HOROSCOPE_PROGRAM_SCHEMA}`));
  }
  if (!isDate(program.anchorDate)) failures.push(violation('STRUCT-DATE', 'program.anchorDate', 'invalid anchor date'));
  if (program.policy.mode !== 'deterministic-template' || program.policy.model !== null
    || program.policy.rendererVersion !== HOROSCOPE_PROGRAM_RENDERER) {
    failures.push(violation('PROV-GENERATION', 'program.policy', 'program must identify the deterministic renderer and no model'));
  }
  if (program.signs.length !== 12
    || program.signs.some((entry, index) => entry.sign !== SIGN_SLUGS[index])) {
    failures.push(violation('STRUCT-SIGNS', 'program.signs', 'all twelve signs must appear in canonical order'));
  }
  const evidenceIds = new Set(program.evidence.map((receipt) => receipt.id));
  if (evidenceIds.size !== program.evidence.length) {
    failures.push(violation('EVIDENCE-DUPLICATE', 'program.evidence', 'evidence IDs must be unique'));
  }
  for (const [index, receipt] of program.evidence.entries()) {
    if (!receipt.id || !receipt.sourceId || !receipt.label || !isInstant(receipt.at)) {
      failures.push(violation('EVIDENCE-SHAPE', `program.evidence[${index}]`, 'receipt requires id, sourceId, label, and canonical instant'));
    }
    if (receipt.kind === 'solar-house'
      && (!receipt.sourceFactId || !evidenceIds.has(receipt.sourceFactId)
        || !receipt.sunSign || !receipt.house || receipt.house < 1 || receipt.house > 12)) {
      failures.push(violation('EVIDENCE-DERIVATION', `program.evidence[${index}]`, 'solar-house receipt must link a known fact, sign, and house'));
    }
    if (receipt.eventKind === 'aspect' && receipt.orb !== 0) {
      failures.push(violation(
        'EVIDENCE-ASPECT-ORB',
        `program.evidence[${index}].orb`,
        'exact aspect receipt must explicitly expose a zero-degree orb',
      ));
    }
    if (receipt.kind === 'body-position' && receipt.body === 'Moon' && !receipt.moonPhase) {
      failures.push(violation(
        'EVIDENCE-MOON-PHASE',
        `program.evidence[${index}].moonPhase`,
        'Moon position receipt must expose its edition phase',
      ));
    }
    if (receipt.kind === 'sky-event' && receipt.eventKind === 'aspect'
      && (!receipt.a || !receipt.b || !receipt.eventType)) {
      failures.push(violation(
        'EVIDENCE-ASPECT-SHAPE',
        `program.evidence[${index}]`,
        'aspect receipt must expose both bodies and aspect type',
      ));
    }
  }

  for (const [signIndex, signProgram] of program.signs.entries()) {
    for (const surface of SURFACES) {
      const path = `program.signs[${signIndex}].readings.${surface}`;
      const item = signProgram.readings[surface];
      if (!item || item.surface !== surface || item.sign !== signProgram.sign) {
        failures.push(violation('STRUCT-READING', path, 'reading surface/sign is missing or inconsistent'));
        continue;
      }
      if (item.text !== item.passages.map((entry) => entry.text).join('\n\n')
        || item.wordCount !== horoscopeWordCount(item.text)) {
        failures.push(violation('STRUCT-TEXT', path, 'text and word count must exactly match passages'));
      }
      failures.push(...voiceViolations(item.text, `${path}.text`));
      if (item.status === 'publishable') {
        const bounds = HOROSCOPE_WORD_BOUNDS[surface];
        if (item.wordCount < bounds.min || item.wordCount > bounds.max) {
          failures.push(violation('VOICE-WORDS', `${path}.wordCount`, `${item.wordCount} is outside ${bounds.min}-${bounds.max}`));
        }
        if (!item.passages.length || item.passages.some((entry) => (
          !entry.evidenceRefs.length || entry.evidenceRefs.some((id) => !evidenceIds.has(id))
        ))) {
          failures.push(violation('EVIDENCE-MISSING', `${path}.passages`, 'every publishable passage must cite known evidence'));
        }
        if (BACKSTAGE_COPY.test(item.text)) {
          failures.push(violation('VOICE-BACKSTAGE', `${path}.text`, 'reader copy must not expose publishing or verification plumbing'));
        }
        item.passages.forEach((entry, passageIndex) => {
          const firstSentence = entry.text.split(/(?<=[.!?])\s/u, 1)[0] ?? entry.text;
          if (KITCHEN_FIRST_OPENING.test(firstSentence)) {
            failures.push(violation(
              'VOICE-KITCHEN-FIRST',
              `${path}.passages[${passageIndex}].text`,
              'each passage must open with meaning or useful action before astrological mechanics',
            ));
          }
        });
      } else if (!item.fallbackReason || item.passages.some((entry) => entry.evidenceRefs.length)) {
        failures.push(violation('FALLBACK-SHAPE', path, 'insufficient readings need a reason and may not imply evidence'));
      }
    }
  }

  for (const surface of SURFACES) {
    const candidates = program.signs
      .map((entry) => entry.readings[surface])
      .filter((item) => item?.status === 'publishable');
    for (let left = 0; left < candidates.length; left += 1) for (let right = left + 1; right < candidates.length; right += 1) {
      const similarity = horoscopeShingleJaccard(candidates[left].text, candidates[right].text, 3);
      if (similarity > HOROSCOPE_DISTINCTNESS_LIMITS[surface]) {
        failures.push(violation(
          'DIST-SIMILARITY',
          `program.signs.${candidates[left].sign}/${candidates[right].sign}.readings.${surface}`,
          `trigram Jaccard ${similarity.toFixed(3)} exceeds ${HOROSCOPE_DISTINCTNESS_LIMITS[surface]}`,
        ));
      }
    }
  }
  return failures;
}

/** Deterministic replay gate: structure plus exact regeneration from inputs. */
export function validateHoroscopeProgramAgainstInput(
  input: BuildHoroscopeProgramInput,
  program: HoroscopeProgram,
): HoroscopeProgramViolation[] {
  const failures = validateHoroscopeProgram(program);
  const inputFailures = validateHoroscopeProgramInput(input);
  if (inputFailures.length) return [...inputFailures, ...failures];
  if (JSON.stringify(buildHoroscopeProgram(input)) !== JSON.stringify(program)) {
    failures.push(violation('PROV-REPLAY', 'program', 'serialized program differs from deterministic regeneration'));
  }
  return failures;
}
