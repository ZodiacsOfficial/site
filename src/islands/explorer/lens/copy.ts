/**
 * Module-local copy for the Time-Lens rail. Chrome is en+es (key parity
 * enforced by `satisfies`); interpretive corpus lines are EN-only, matching
 * the sitewide precedent (synastry lines, tour prose) under the D9 freeze.
 * The rail button labels live in the HOST (they render before this module
 * loads); everything below the wheel lives here.
 */

export type LensId = 'sky' | 'progressed' | 'return';

interface LensChrome {
  skyRingLabel: string;
  progressedRingLabel: string;
  returnRingLabel: string;
  skyIntro: string;
  progressedIntro: string;
  returnIntro: string;
  tightestNow: string;
  noContacts: string;
  transitsLink: string;
  returnInstant: string;
  localTime: string;
  noTimeNote: string;
  noPlaceNote: string;
  progressedAngles: string;
  trustLine: string;
  loading: string;
}

export const LENS_CHROME = {
  en: {
    skyRingLabel: 'the sky right now',
    progressedRingLabel: 'your progressed planets',
    returnRingLabel: 'your solar-return sky',
    skyIntro: 'The outer ring is the sky at this moment, over your natal wheel.',
    progressedIntro: 'The outer ring is your chart progressed to today — one day after birth stands for one year of life.',
    returnIntro: 'The outer ring is the sky at your most recent solar return — the instant the Sun came back to its birth position.',
    tightestNow: 'Tightest contacts:',
    noContacts: 'No close contacts at this orb right now.',
    transitsLink: 'Scrub this sky through time at /transits/.',
    returnInstant: 'Return instant',
    localTime: 'your time',
    noTimeNote: 'Computed from a noon chart — an exact birth time sharpens these positions.',
    noPlaceNote: 'Without a birthplace the return is shown planets-only, no houses.',
    progressedAngles: 'Progressed houses need a convention we haven’t adopted, so only the planets progress here.',
    trustLine: 'Every one of these skies is computed on this device.',
    loading: 'Computing…',
  },
  es: {
    skyRingLabel: 'el cielo en este momento',
    progressedRingLabel: 'tus planetas progresados',
    returnRingLabel: 'tu cielo de retorno solar',
    skyIntro: 'El anillo exterior es el cielo de este momento sobre tu rueda natal.',
    progressedIntro: 'El anillo exterior es tu carta progresada hasta hoy: un día tras el nacimiento representa un año de vida.',
    returnIntro: 'El anillo exterior es el cielo de tu último retorno solar: el instante en que el Sol volvió a su posición natal.',
    tightestNow: 'Contactos más exactos:',
    noContacts: 'Sin contactos cercanos con este orbe ahora mismo.',
    transitsLink: 'Recorre este cielo en el tiempo en /transits/.',
    returnInstant: 'Instante del retorno',
    localTime: 'tu hora',
    noTimeNote: 'Calculado desde una carta de mediodía: la hora exacta de nacimiento afina estas posiciones.',
    noPlaceNote: 'Sin lugar de nacimiento, el retorno se muestra solo con planetas, sin casas.',
    progressedAngles: 'Las casas progresadas requieren una convención que no hemos adoptado; aquí solo progresan los planetas.',
    trustLine: 'Cada uno de estos cielos se calcula en este dispositivo.',
    loading: 'Calculando…',
  },
} as const satisfies Record<'en' | 'es', LensChrome>;

/** The ~2.5-year emotional climate of the progressed Moon's sign. EN-only. */
export const PROGRESSED_MOON: Record<string, string> = {
  aries: 'The progressed Moon in Aries opens a self-first stretch: appetite returns, patience thins, and starting matters more than finishing. Roughly two and a half years of "me first, then we."',
  taurus: 'A settling stretch — the emotional weather wants routine, comfort, and fewer surprises. Build the nest; the calm is structural, not laziness.',
  gemini: 'A talkative stretch — feelings want words, company, and motion. Boredom is the only real enemy for these two and a half years.',
  cancer: 'A homing stretch — family, memory, and the past ask for attention, and moods run tidal. Feed the base and everything else steadies.',
  leo: 'A warming stretch — the heart wants an audience, and hiding stops working. Making something visible is the mood’s actual request.',
  virgo: 'An editing stretch — emotional energy flows into fixing, sorting, and quiet usefulness. Watch that self-improvement doesn’t become self-audit.',
  libra: 'A pairing stretch — relationships move to the emotional center, and imbalances that were tolerable stop being so. Fairness becomes a feeling, not a concept.',
  scorpio: 'A deepening stretch — the emotional water runs darker and more honest. Attachments intensify; so does the need to know what’s real.',
  sagittarius: 'A widening stretch — restlessness with a purpose, the mood improving with mileage. The far horizon is genuinely medicinal for a while.',
  capricorn: 'A sobering stretch — feelings organize around duty, work, and what you’re building. Competence is the comfort food of these years.',
  aquarius: 'A cooling stretch — useful distance from your own reactions, and more feeling for the group than the room. Old emotional habits become visible enough to retire.',
  pisces: 'A porous stretch — dreams louder, boundaries thinner, compassion up. Margin and sleep are load-bearing for these two and a half years.',
};

/** One line under the progressed lens; {degree}/{sign} filled at render. EN-only. */
export const PROGRESSED_SUN_NOTE =
  'The progressed Sun moves about a degree a year and changes sign roughly every thirty years — when it does, the decade’s whole flavor shifts. Yours is at {degree} {sign}; the identity is still yours, just further along its own arc.';

/** "The year leads with…" — the solar-return ascendant. EN-only. */
export const SR_ASC: Record<string, string> = {
  aries: 'The year leads with ignition — you’ll be handed situations that reward starting before you feel ready. Momentum is this year’s currency.',
  taurus: 'The year leads with consolidation — building, furnishing, and letting good things get boring in the best way. Slow is the strategy, not the setback.',
  gemini: 'The year leads with traffic — conversations, short trips, twice the usual inbox. Your calendar becomes the chart’s main character.',
  cancer: 'The year leads with home in the load-bearing sense: where you live, who counts as family, what safety costs. Tend the base and the rest follows.',
  leo: 'The year leads with visibility — you get seen more, on purpose and not. Decide early what you want the audience to find.',
  virgo: 'The year leads with maintenance — health, systems, the backlog you’ve been stepping over. Unglamorous fixes pay this year’s best dividends.',
  libra: 'The year leads with other people — partnerships tighten, negotiations multiply, and "we" outvotes "I" more than usual. Choose counterparts carefully.',
  scorpio: 'The year leads with depth — shared resources, real intimacy, and at least one honest reckoning. What survives this year was built to.',
  sagittarius: 'The year leads with range — travel, study, or a belief that needs field-testing. The far option is usually the right one this year.',
  capricorn: 'The year leads with the ledger — career, reputation, and the long game asking for its installment. Effort placed now compounds unusually well.',
  aquarius: 'The year leads with the network — allies, groups, and the future you’re actually building versus the one you inherited. Find your people; the plan follows.',
  pisces: 'The year leads with the tide — rest, imagination, and endings that make room. Not every year is for output; this one profits from margin.',
};
