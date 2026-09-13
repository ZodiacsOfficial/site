import type { Chart } from './engine/types';
import type { CommunicationSign } from './communication';
import { signForLongitude } from './signs';
import { moonIsUncertain } from './moon-certainty';

/**
 * Audience-facing advice for meeting the chart owner. These lines are
 * deliberately authored for the recipient of a shared card; mechanically
 * changing the pronouns in the owner's communication reading produces copy
 * that sounds clinical and often changes the meaning.
 */
export const APPROACH_RISING: Record<CommunicationSign, string> = {
  aries: 'Lead with the point and keep pace. A confident, direct opening earns attention faster than a long preamble.',
  taurus: 'Arrive calmly and do not rush familiarity. Consistency makes a better first impression than intensity.',
  gemini: 'Start with a real question, a sharp observation, or something genuinely interesting. Conversation is the doorway.',
  cancer: 'Approach gently and read the room. Warmth and respect for privacy matter before depth.',
  leo: 'Be warm, present, and specific. Genuine recognition opens the door; generic flattery does not.',
  virgo: 'Be clear, considerate, and prepared. Small signs of competence register immediately.',
  libra: 'Use tact and good faith. A balanced opening lands better than pressure or provocation.',
  scorpio: 'Be honest without prying. Trust grows when you mean what you say and leave room for privacy.',
  sagittarius: 'Be candid, upbeat, and willing to go somewhere interesting. Over-managing the interaction will flatten it.',
  capricorn: 'Respect their time and arrive with substance. Reliability makes the strongest introduction.',
  aquarius: 'Bring an original thought and skip the script. Interest grows through ideas, not forced familiarity.',
  pisces: 'Lead with kindness and a little softness. They notice atmosphere before agenda.',
};

export const APPROACH_MERCURY: Record<CommunicationSign, string> = {
  aries: 'Say the main thing first. Clear, active language will land better than caveats stacked before the point.',
  taurus: 'Give the idea time and make it concrete. Pressure to answer instantly is more likely to harden the answer.',
  gemini: 'Make it a conversation, not a monologue. Questions, examples, and room to riff keep the exchange alive.',
  cancer: 'Mind the tone as much as the words. Context and care decide whether the message feels safe enough to hear.',
  leo: 'Speak with conviction and make the human stakes visible. A lifeless delivery can make a good idea feel smaller than it is.',
  virgo: 'Be precise and bring the useful details. They will trust a careful explanation more than a sweeping promise.',
  libra: 'Frame the point fairly and acknowledge the other side. Diplomacy helps the honest version get through.',
  scorpio: 'Say what you actually mean and leave out the performance. They will notice the missing layer before the polished one.',
  sagittarius: 'Give the big picture, then the truth in plain language. Too much hedging reads as distance from the point.',
  capricorn: 'Lead with the conclusion, the reason, and the next step. Structure is a form of respect here.',
  aquarius: 'Bring the principle behind the point. An independent mind responds better to a strong idea than social pressure.',
  pisces: 'Use examples, images, and emotional context. A message can be exact without being rigid.',
};

export const APPROACH_MOON: Record<CommunicationSign, string> = {
  aries: 'Let feelings move instead of pinning them down immediately. A little space for action makes honesty easier.',
  taurus: 'Be steady, follow through, and avoid surprise reversals. Trust grows through a pattern they can feel in the body.',
  gemini: 'Let them talk the feeling into focus. Curiosity will help more than demanding one final emotional answer.',
  cancer: 'Remember the details and protect what was shared in confidence. Care becomes believable through continuity.',
  leo: 'Notice the effort specifically and say so. Feeling genuinely valued is what makes the guard come down.',
  virgo: 'Offer practical care without making the feeling into a flaw to fix. Small, useful support speaks loudly.',
  libra: 'Keep the exchange fair and name tension before it becomes atmosphere. Calm honesty is safer than delayed resentment.',
  scorpio: 'Treat vulnerability as confidential information. Depth is welcome; casual intrusion is not.',
  sagittarius: 'Leave room for humor, perspective, and a change of scenery. Space helps the feeling become speakable.',
  capricorn: 'Respect the composed exterior and stay for the slower second answer. Reliability makes emotion less expensive.',
  aquarius: 'Give them a moment to understand the feeling before asking them to perform it. Space is part of the processing.',
  pisces: 'Lower the emotional volume and be clear about what belongs to whom. Gentleness works best with clean boundaries.',
};

export const APPROACH_MARS: Record<CommunicationSign, string> = {
  aries: 'Do not turn a fast flare-up into a permanent verdict. Address the issue directly, then let the temperature fall.',
  taurus: 'Do not confuse patience with unlimited tolerance. Repeated pressure can turn a movable question into a final no.',
  gemini: 'Do not make the disagreement a contest for the cleverest line. Slow the exchange enough for the real point to survive.',
  cancer: 'Do not dismiss a sideways reaction as nothing. Naming the hurt gently is more useful than cornering it.',
  leo: 'Do not lead with humiliation or disrespect. Restore dignity first and the actual disagreement becomes workable.',
  virgo: 'Do not answer critique with a character indictment. Stay specific about what needs to change.',
  libra: 'Do not reward avoidance by pretending everything is fine. A fair, early disagreement is kinder than accumulated static.',
  scorpio: 'Do not test trust, threaten exposure, or play for leverage. Clean honesty is the only useful route through.',
  sagittarius: 'Do not match bluntness with a grudge. Say what landed badly while the moment is still small enough to repair.',
  capricorn: 'Do not force an emotional answer on demand. Ask for a time to return to the issue, then hold them to it.',
  aquarius: 'Do not mistake calm analysis for lack of feeling. Name the human impact before debating the framework.',
  pisces: 'Do not accept a vague yes when the energy says no. Make refusal safe enough to happen before disappearance.',
};

export type ApproachBody = 'Rising' | 'Mercury' | 'Moon' | 'Mars';

export interface ApproachPart {
  body: ApproachBody;
  role: string;
  sign: CommunicationSign;
  reading: string;
}

export interface ApproachRead {
  rising: ApproachPart | null;
  mercury: ApproachPart | null;
  moon: ApproachPart | null;
  avoid: ApproachPart | null;
  moonAmbiguous: boolean;
  limitations: string[];
}

export interface ApproachReadOptions {
  /** True when a no-time civil day crosses a Moon-sign boundary. */
  moonAmbiguous?: boolean;
}

const SIGNS = new Set<CommunicationSign>(Object.keys(APPROACH_RISING) as CommunicationSign[]);

function signSlug(longitude: number): CommunicationSign {
  const slug = signForLongitude(longitude).slug as CommunicationSign;
  if (!SIGNS.has(slug)) throw new Error(`Unknown approach sign: ${slug}`);
  return slug;
}

function bodyPart(
  chart: Pick<Chart, 'bodies'>,
  body: 'Mercury' | 'Moon' | 'Mars',
  role: string,
  corpus: Record<CommunicationSign, string>,
): ApproachPart | null {
  const placement = chart.bodies.find((candidate) => candidate.body === body);
  if (!placement) return null;
  const sign = signSlug(placement.lon);
  return { body, role, sign, reading: corpus[sign] };
}

/** Pure positions-to-reading layer; it never reads Chart.input. */
export function approachRead(
  chart: Pick<Chart, 'bodies' | 'angles' | 'moonSignCandidates'>,
  options: ApproachReadOptions = {},
): ApproachRead {
  const moonAmbiguous = options.moonAmbiguous === true || moonIsUncertain(chart);
  const rising = chart.angles
    ? (() => {
      const sign = signSlug(chart.angles.asc);
      return {
        body: 'Rising' as const,
        role: 'How to open',
        sign,
        reading: APPROACH_RISING[sign],
      };
    })()
    : null;
  const limitations: string[] = [];
  if (!rising) limitations.push('A birth time is needed to know how you first come across.');
  if (moonAmbiguous) limitations.push('The Moon may change signs on this birth date, so exact birth time could change the trust advice.');

  return {
    rising,
    mercury: bodyPart(chart, 'Mercury', 'How to say it', APPROACH_MERCURY),
    moon: moonAmbiguous ? null : bodyPart(chart, 'Moon', 'What builds trust', APPROACH_MOON),
    avoid: bodyPart(chart, 'Mars', 'What to avoid under pressure', APPROACH_MARS),
    moonAmbiguous,
    limitations,
  };
}
