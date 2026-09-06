import type { EventInterpretation } from './types';

/** Actual revision date for this bounded corpus; not a publication date. */
export const EVENT_READING_REVISION = '2026-09-06';

/** The seven original editorial anchors remain in interpretations.ts. */
export const REVISED_EVENT_READINGS: Readonly<Record<string, EventInterpretation>> = {
  'neptune-sextile-pluto-2026-09-16': {
    lead: 'Neptune in Aries and Pluto in Aquarius form a sextile on September 16, 2026. This slow pairing gives astrologers a way to consider how an ideal becomes a shared practice.',
    body: [
      'Neptune supplies the vision; Pluto raises questions about power and lasting change. A sextile is traditionally read as an opportunity to cooperate. In Aries and Aquarius, the useful question is how an individual initiative can work with a wider group.',
      'Choose one idea you care about and examine how people would actually take part. Who makes decisions, who does the work, and who can disagree? The exact alignment marks a point in a long cycle; it does not promise that a plan will succeed.',
    ],
    reflections: ['Which ideal could you test through one small activity with other people?', 'What would make participation fair to the people doing the work?'],
  },
  'new-moon-2026-09-11': {
    lead: 'The new moon on September 11, 2026 in Virgo offers a practical starting point: choose one part of daily life that would benefit from a small, repeatable improvement.',
    body: [
      'A new moon is the meeting of the Sun and Moon. In the astrological tradition it opens a cycle of attention; Virgo directs that attention toward methods, details and useful work. Notice where a familiar routine creates avoidable friction before deciding what needs to change.',
      'Make the first version manageable. A clearer checklist, a repaired tool or a little room in a crowded schedule can give you something concrete to observe. Review what helps in your actual day before adding another rule.',
    ],
    reflections: ['Which recurring task could become easier with a simpler, clearer method?', 'What could you try once and then adjust from your own experience?'],
  },
  'venus-retrograde-2026-10-03': {
    lead: 'Venus turns retrograde on October 3, 2026, and returns to direct motion on November 14, 2026. Astrology uses this apparent reversal to revisit preferences, agreements and the ways people express affection.',
    body: [
      'This cycle involves Libra and Scorpio, bringing questions of mutual agreement and personal commitment into the same reading. An old preference may deserve another look, but returning to it does not make it the right choice.',
      'Name what you value now and ask whether an existing arrangement reflects it. Give the other person room to answer. Retrograde motion is a viewing effect in the sky; it does not determine the course of a relationship.',
    ],
    reflections: ['Which agreement between you and another person would benefit from a clear conversation?', 'What do you still value, and what has changed for you?'],
  },
  'jupiter-enters-leo-2026-06-30': {
    lead: 'Jupiter enters Leo on June 30, 2026. In astrology, this joins the wish to grow with the wish to create, contribute and find an audience.',
    body: [
      'Leo gives Jupiter a personal outlet: a piece of work with your name on it, a role that asks you to lead, or a skill you want to share. The ingress opens that theme without deciding how it will develop.',
      'Choose something worth practicing in public and give it an achievable next step. Recognition can be useful feedback, but it is not the only measure of whether the work deserves your time. Notice what you learn from making it.',
    ],
    reflections: ['What would you like to make or share more confidently with other people?', 'Which small next step is within your own control this week?'],
  },
  'eclipse-2026-08-28': {
    lead: 'The partial lunar eclipse in Pisces on August 28, 2026 gives astrologers a point to reflect on endings, emotional boundaries and what has become difficult to ignore.',
    body: [
      'A lunar eclipse occurs when Earth comes between the Sun and Moon, and the full Moon passes through Earth’s shadow. Pisces supplies the symbolic theme here: sensitivity, imagination and the limits of what one person can carry.',
      'Separate what you feel from what you know before deciding what a situation means. You can acknowledge a change without having its whole explanation. The eclipse does not require an immediate decision or predict a personal outcome.',
    ],
    reflections: ['What in your life needs acknowledgment before it needs a definite answer?', 'Where would a clearer boundary leave you more able to help?'],
    limitations: ['The universal peak time does not establish whether the eclipse is visible from your location.'],
  },
};
