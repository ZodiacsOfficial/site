import type { AuraEventKind, AuraSign } from './types';

// The reading is a deterministic braid of three strands, each traceable to a
// row of the Alignment: the sign's base line, a sky strand naming the actual
// driving event, and a chart strand naming the strongest echoing point.
// Voice: plain everyday words for a casual horoscope reader. Pop-astrology
// terms only (retrograde, full Moon, rising sign); "ingress"-style jargon and
// "today"/"now" are banned and enforced by tests. Absence becomes honest text
// instead of silence.

const GROUNDED_REFLECTION: Record<AuraSign, string> = {
  aries: 'Pick one thing to start, and start it cleanly. Fast is fine; rushed isn’t.',
  taurus: 'Keep the promise you already made before adding a new one. Steady beats forceful.',
  gemini: 'Ask the question you’ve been holding back before you settle on an answer.',
  cancer: 'Protect what needs care without turning every boundary into a wall.',
  leo: 'Do one honest thing out in the open, without keeping score of the reaction.',
  virgo: 'Fix the next small thing that can actually be fixed, then let the rest breathe.',
  libra: 'Say out loud what a fair deal looks like — balance works better when it’s spoken.',
  scorpio: 'Sit with what’s really going on under the first reaction. Strong feelings aren’t proof.',
  sagittarius: 'Aim at one real goal and take the first step. The step will tell you if the plan is honest.',
  capricorn: 'Do the thing that will still matter next month, even if nobody sees it this week.',
  aquarius: 'Make room for the idea that helps more people than just the usual circle.',
  pisces: 'Name what you’re feeling before deciding what it means. Feelings are information, not instructions.',
};

export type AuraReadingNatalFact =
  | { kind: 'body'; body: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' }
  | { kind: 'angle'; angle: 'Ascendant' | 'Midheaven' };

export type AuraReadingSkyFact =
  | { kind: 'event'; eventKind: AuraEventKind; body: string | null; eventType: string | null }
  | { kind: 'sun-and-moon' }
  | { kind: 'moon' }
  | { kind: 'sun' };

export interface AuraReadingFacts {
  sign: AuraSign;
  natal: readonly AuraReadingNatalFact[];
  sky: AuraReadingSkyFact | null;
  illustrative?: boolean;
}

export interface AuraReadingText {
  /** The sign's base line — the only reflection the share card may paint. */
  lead: string;
  /** The evidence strands: sky first, then chart; absence stated honestly. */
  detail: string;
  /** lead + detail, used wherever the full reading renders as one block. */
  text: string;
}

const SKY_FALLBACK =
  'A dated sky event marks this sign — the exact details are in the evidence below.';

const CHART_CLAUSE: Record<string, string> = {
  Sun: 'This is also your Sun sign — home ground. You know this energy from the inside.',
  Moon: 'Your Moon is here too, so this sign already knows your moods.',
  Mercury: 'Your Mercury sits here — the way you think and talk already has this sign’s accent.',
  Venus: 'Your Venus lives here — what you enjoy, and how you show warmth, carries this sign’s style.',
  Mars: 'Your Mars is here — when you push for something, this is the gear you use.',
  Ascendant: 'This is also your rising sign — the side of you people meet first.',
  Midheaven: 'This sign sits at the top of your chart, where work and reputation live.',
};

const CHART_MORE = 'And it isn’t alone — more of your chart lives in this sign.';
const CHART_QUIET =
  'Your chart is quiet in this sign — this one comes from the sky, not from you.';
const ALL_QUIET =
  'The sky is quiet in this sign, and your chart is too. Nothing here is urgent — and that’s worth knowing.';

const EXAMPLE_CHART_CLAUSE =
  'The example chart has placements here too — with a real chart, this is where the reading gets personal.';
const EXAMPLE_CHART_QUIET =
  'The example chart is quiet in this sign — this one comes from the sky.';
const EXAMPLE_ALL_QUIET =
  'The sky is quiet in this sign, and the example chart is too. Nothing here is urgent — and that’s worth knowing.';

function skyClause(sky: AuraReadingSkyFact): string {
  switch (sky.kind) {
    case 'sun':
      return 'The Sun is in this sign — this is its season, and the light stays on it for weeks.';
    case 'moon':
      return 'The Moon is passing through this sign — a day or two of extra feeling here, then it moves on.';
    case 'sun-and-moon':
      return 'It’s this sign’s season and the Moon is passing through it as well — a loud few days for one sign.';
    case 'event':
      break;
  }
  switch (sky.eventKind) {
    case 'station':
      if (!sky.body || (sky.eventType !== 'retrograde' && sky.eventType !== 'direct')) {
        return SKY_FALLBACK;
      }
      return sky.eventType === 'retrograde'
        ? `${sky.body} turns retrograde in this sign — the classic time to double-check, finish, and repair rather than launch something new.`
        : `${sky.body} turns direct in this sign — what felt stuck starts to move again. Give it a day before you call anything final.`;
    case 'lunation':
      if (sky.eventType === 'new') {
        return 'There’s a new Moon in this sign — the quiet starting line of the month. Small beginnings count double.';
      }
      if (sky.eventType === 'full') {
        return 'There’s a full Moon in this sign — feelings and results come into full view. Look before you judge.';
      }
      return SKY_FALLBACK;
    case 'eclipse':
      if (sky.body === 'Sun') {
        return 'A solar eclipse lands in this sign — a rare reset. Big feelings are normal; big decisions can wait a day.';
      }
      if (sky.body === 'Moon') {
        return 'A lunar eclipse lands in this sign — endings show what they meant. Notice what you’re ready to set down.';
      }
      return SKY_FALLBACK;
    case 'ingress':
      return sky.body
        ? `${sky.body} has just entered this sign and will color it for a while — a change of tone more than a change of task.`
        : SKY_FALLBACK;
  }
}

function chartClause(
  natal: readonly AuraReadingNatalFact[],
  illustrative: boolean,
): string {
  if (illustrative) return EXAMPLE_CHART_CLAUSE;
  const lead = natal[0];
  const clause =
    lead.kind === 'body' ? CHART_CLAUSE[lead.body] : CHART_CLAUSE[lead.angle];
  return natal.length > 1 ? `${clause} ${CHART_MORE}` : clause;
}

/** The sign's base line — the only reflection the share card may ever paint. */
export function groundedAuraReflection(sign: AuraSign): string {
  return GROUNDED_REFLECTION[sign];
}

/**
 * Composes the full page reading. Deterministic: the same facts always
 * produce the same words, and the words change exactly when the facts do.
 */
export function composeAuraReadingText(facts: AuraReadingFacts): AuraReadingText {
  const illustrative = facts.illustrative === true;
  const parts: string[] = [];
  if (facts.sky) parts.push(skyClause(facts.sky));
  if (facts.natal.length > 0) {
    parts.push(chartClause(facts.natal, illustrative));
  } else if (facts.sky) {
    parts.push(illustrative ? EXAMPLE_CHART_QUIET : CHART_QUIET);
  } else {
    parts.push(illustrative ? EXAMPLE_ALL_QUIET : ALL_QUIET);
  }
  const lead = GROUNDED_REFLECTION[facts.sign];
  const detail = parts.join(' ');
  return { lead, detail, text: `${lead} ${detail}` };
}
