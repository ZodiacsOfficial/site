/**
 * Sign-to-sign compatibility facts and synastry phrasing. Pure data
 * composition over signs.ts — no engine imports, so pair pages compute
 * their panels at build time and the synastry island ships without the
 * ephemeris. Written in the interpretations.ts voice: dry, specific,
 * warm, no verdicts pretending to be scores.
 */
import { SIGNS, SIGN_SLUGS, signBySlug } from './signs';
import type { Element, Modality, Sign } from './signs';

/** Canonical pair slug: both signs in zodiac order, joined with a hyphen. */
export function pairSlug(a: string, b: string): string {
  const ia = SIGN_SLUGS.indexOf(a);
  const ib = SIGN_SLUGS.indexOf(b);
  if (ia < 0 || ib < 0) throw new Error(`Unknown sign in pair: ${a}, ${b}`);
  return ia <= ib ? `${a}-${b}` : `${b}-${a}`;
}

/** All 78 canonical pairs (12 same-sign + 66 cross), zodiac order. */
export const ALL_PAIRS: readonly [string, string][] = SIGNS.flatMap((a, i) =>
  SIGNS.slice(i).map((b) => [a.slug, b.slug] as [string, string]),
);

export interface InteractionNote {
  label: string;
  note: string;
}

/** Unordered element-pair key, e.g. "air+fire". */
function comboKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

const ELEMENT_NOTES: Record<string, InteractionNote> = {
  'fire+fire': {
    label: 'Shared heat',
    note: 'Two fire signs move at the same speed and forgive at the same speed. The open question is who minds the brakes.',
  },
  'earth+fire': {
    label: 'Spark and soil',
    note: 'Fire supplies ignition, earth supplies follow-through. It works once each stops grading the other’s tempo.',
  },
  'air+fire': {
    label: 'Oxygen',
    note: 'Air feeds fire and fire keeps air warm — quick, talkative, and mobile. Somebody still has to anchor the calendar.',
  },
  'fire+water': {
    label: 'Steam',
    note: 'Impulse meets feeling: each can do what the other can’t. Handled carelessly it scalds; handled well it moves things.',
  },
  'earth+earth': {
    label: 'Bedrock',
    note: 'Two earth signs build a life that works on paper and in practice. Booking the surprises becomes a shared chore.',
  },
  'air+earth': {
    label: 'Idea and estimate',
    note: 'Air brings possibilities, earth asks what they cost. Respect makes that a partnership; impatience makes it a committee.',
  },
  'earth+water': {
    label: 'River and bank',
    note: 'Water softens earth and earth gives water shape — the classic quiet-strength pairing, genuinely low-friction.',
  },
  'air+air': {
    label: 'Crosswind',
    note: 'Endless conversation and mutual independence. Feelings need an appointment, made on purpose, kept.',
  },
  'air+water': {
    label: 'Naming the weather',
    note: 'Air wants the feeling named; water wants it felt. The translation work never fully ends, and it’s worth doing.',
  },
  'water+water': {
    label: 'Deep water',
    note: 'Two water signs read each other without subtitles. The tide comes in together and goes out together — keep a barometer.',
  },
};

export function elementInteraction(a: Element, b: Element): InteractionNote {
  return ELEMENT_NOTES[comboKey(a, b)];
}

const MODALITY_NOTES: Record<string, InteractionNote> = {
  'cardinal+cardinal': {
    label: 'Two starters',
    note: 'Both open seasons; both arrive with a plan. The real negotiation is whose plan runs this quarter.',
  },
  'cardinal+fixed': {
    label: 'Starter and keeper',
    note: 'One launches, the other sustains. It divides labor beautifully as long as the credit gets divided too.',
  },
  'cardinal+mutable': {
    label: 'Starter and adapter',
    note: 'One sets the direction, the other adjusts course without ego. Low friction — watch that drift doesn’t replace steering.',
  },
  'fixed+fixed': {
    label: 'Two anchors',
    note: 'Durable, loyal, and immovable in the same argument. Disagreements calcify unless someone blinks by appointment.',
  },
  'fixed+mutable': {
    label: 'Anchor and sail',
    note: 'Stability plus flexibility, each supplying what the other skips — resented only when either denies the other’s function.',
  },
  'mutable+mutable': {
    label: 'Two sails',
    note: 'Endlessly adaptable and rarely in open conflict. Decisions can orbit for months without landing; name a deadline.',
  },
};

export function modalityInteraction(a: Modality, b: Modality): InteractionNote {
  return MODALITY_NOTES[comboKey(a, b)];
}

export function polarityNote(a: Sign, b: Sign): string {
  if (a.polarity === 'day' && b.polarity === 'day') {
    return 'Both day signs: energy runs outward on both sides, toward action and expression. Rest is the shared blind spot.';
  }
  if (a.polarity === 'night' && b.polarity === 'night') {
    return 'Both night signs: both process inward before anything shows. Silences here are usually work, not distance.';
  }
  return 'One day sign, one night sign: one thinks out loud, the other thinks first. Each supplies the register the other skips.';
}

/** Everything the pair-page panel renders, computed from the sign table. */
export interface PairFacts {
  a: Sign;
  b: Sign;
  slug: string;
  same: boolean;
  element: InteractionNote;
  modality: InteractionNote;
  polarity: string;
}

export function pairFacts(slugA: string, slugB: string): PairFacts {
  const ordered = SIGN_SLUGS.indexOf(slugA) <= SIGN_SLUGS.indexOf(slugB);
  const a = signBySlug(ordered ? slugA : slugB);
  const b = signBySlug(ordered ? slugB : slugA);
  return {
    a,
    b,
    slug: `${a.slug}-${b.slug}`,
    same: a.slug === b.slug,
    element: elementInteraction(a.element, b.element),
    modality: modalityInteraction(a.modality, b.modality),
    polarity: polarityNote(a, b),
  };
}

// ── Synastry phrasing ─────────────────────────────────────────────────

export const BODY_ROLE: Record<string, string> = {
  Sun: 'sense of self',
  Moon: 'emotional life',
  Mercury: 'way of thinking',
  Venus: 'way of loving',
  Mars: 'drive',
  Jupiter: 'appetite for more',
  Saturn: 'standards',
  Uranus: 'independence',
  Neptune: 'imagination',
  Pluto: 'intensity',
};

const ASPECT_PHRASE: Record<string, { verb: string; gloss: string }> = {
  conjunction: {
    verb: 'sits right on top of',
    gloss: 'the two run together, hard to tell apart, for better and worse',
  },
  sextile: {
    verb: 'works easily with',
    gloss: 'an ease that pays out whenever either of you bothers to use it',
  },
  square: {
    verb: 'pushes against',
    gloss: 'friction that forces growth or starts fights, depending on the week',
  },
  trine: {
    verb: 'flows with',
    gloss: 'support so natural it can go unnoticed and unthanked',
  },
  opposition: {
    verb: 'pulls against',
    gloss: 'a seesaw — balance when both sit down, whiplash when one stands up',
  },
};

/**
 * One readable sentence for an inter-chart aspect. Names are whatever
 * the caller displays ("Ana", "Chart B", a sign name for sun-sign mode).
 */
export function synastryLine(
  aName: string,
  aBody: string,
  bName: string,
  bBody: string,
  type: string,
): string {
  const roleA = BODY_ROLE[aBody] ?? aBody.toLowerCase();
  const roleB = BODY_ROLE[bBody] ?? bBody.toLowerCase();
  const phrase = ASPECT_PHRASE[type];
  if (!phrase) return `${aName}’s ${roleA} meets ${bName}’s ${roleB}.`;
  const subject =
    aBody === bBody
      ? `${aName}’s ${roleA} ${phrase.verb} ${bName}’s`
      : `${aName}’s ${roleA} ${phrase.verb} ${bName}’s ${roleB}`;
  return `${subject} — ${phrase.gloss}.`;
}
