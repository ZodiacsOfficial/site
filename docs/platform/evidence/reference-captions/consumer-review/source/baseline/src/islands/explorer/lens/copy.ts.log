/**
 * Module-local copy for the Time-Lens rail. Chrome is en+es (key parity
 * enforced by `satisfies`); interpretive corpus lines are EN-only, matching
 * the sitewide precedent (synastry lines, tour prose) under the D9 freeze.
 * The rail button labels live in the HOST (they render before this module
 * loads); everything below the wheel lives here.
 */
import type { CatalogLocale as Locale } from '../../../lib/i18n';

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
    noTimeNote: 'Computed from a noon chart. Planetary themes remain useful; houses and rising are withheld until you add a birth time.',
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
    transitsLink: 'Recorre este cielo a través del tiempo en /transits/.',
    returnInstant: 'Instante del retorno',
    localTime: 'tu hora',
    noTimeNote: 'Calculado a partir de una carta de mediodía. Los temas planetarios siguen siendo útiles; las casas y el ascendente no se muestran hasta que añadas una hora de nacimiento.',
    noPlaceNote: 'Sin lugar de nacimiento, el retorno se muestra solo con planetas, sin casas.',
    progressedAngles: 'Las casas progresadas requieren una convención que no hemos adoptado; aquí solo progresan los planetas.',
    trustLine: 'Cada uno de estos cielos se calcula en este dispositivo.',
    loading: 'Calculando…',
  },
  pt: {
    skyRingLabel: 'o céu neste momento',
    progressedRingLabel: 'seus planetas progredidos',
    returnRingLabel: 'seu céu do retorno solar',
    skyIntro: 'O anel externo é o céu deste momento sobre sua roda natal.',
    progressedIntro: 'O anel externo é seu mapa progredido até hoje: cada dia após o nascimento representa um ano de vida.',
    returnIntro: 'O anel externo é o céu do seu retorno solar mais recente: o instante em que o Sol voltou à sua posição natal.',
    tightestNow: 'Contatos mais exatos:',
    noContacts: 'Nenhum contato próximo com este orbe agora.',
    transitsLink: 'Percorra este céu ao longo do tempo em /transits/.',
    returnInstant: 'Instante do retorno',
    localTime: 'seu horário',
    noTimeNote: 'Calculado com um mapa do meio-dia. Os temas planetários continuam úteis; as casas e o ascendente não são mostrados até você adicionar a hora de nascimento.',
    noPlaceNote: 'Sem o local de nascimento, o retorno mostra apenas os planetas, sem casas.',
    progressedAngles: 'As casas progredidas exigem uma convenção que ainda não adotamos; aqui, apenas os planetas progridem.',
    trustLine: 'Cada um destes céus é calculado neste dispositivo.',
    loading: 'Calculando…',
  },
  fr: {
    skyRingLabel: 'le ciel à cet instant',
    progressedRingLabel: 'tes planètes progressées',
    returnRingLabel: 'ton ciel de révolution solaire',
    skyIntro: 'L’anneau extérieur représente le ciel à cet instant, superposé à ta roue natale.',
    progressedIntro: 'L’anneau extérieur représente ton thème progressé jusqu’à aujourd’hui — un jour après la naissance correspond à une année de vie.',
    returnIntro: 'L’anneau extérieur représente le ciel de ta révolution solaire la plus récente — l’instant où le Soleil est revenu à sa position de naissance.',
    tightestNow: 'Contacts les plus exacts :',
    noContacts: 'Aucun contact proche dans cet orbe pour le moment.',
    transitsLink: 'Explore ce ciel au fil du temps sur /transits/.',
    returnInstant: 'Instant de la révolution solaire',
    localTime: 'ton heure',
    noTimeNote: 'Calculé à partir d’un thème de midi. Les thèmes planétaires restent utiles ; les maisons et l’ascendant ne sont pas affichés tant que tu n’as pas ajouté ton heure de naissance.',
    noPlaceNote: 'Sans lieu de naissance, la révolution solaire est présentée avec les seules planètes, sans maisons.',
    progressedAngles: 'Les maisons progressées exigent une convention que nous n’avons pas adoptée ; seules les planètes progressent ici.',
    trustLine: 'Chacun de ces ciels est calculé sur cet appareil.',
    loading: 'Calcul en cours…',
  },
  it: {
    skyRingLabel: 'il cielo in questo momento',
    progressedRingLabel: 'i tuoi pianeti progrediti',
    returnRingLabel: 'il cielo della tua rivoluzione solare',
    skyIntro: 'L’anello esterno è il cielo di questo momento, sovrapposto alla ruota del tuo tema natale.',
    progressedIntro: 'L’anello esterno è il tuo tema progredito a oggi — un giorno dopo la nascita rappresenta un anno di vita.',
    returnIntro: 'L’anello esterno è il cielo della tua rivoluzione solare più recente — l’istante in cui il Sole è tornato alla sua posizione di nascita.',
    tightestNow: 'Contatti più esatti:',
    noContacts: 'Nessun contatto ravvicinato entro questa orbita al momento.',
    transitsLink: 'Scorri questo cielo nel tempo su /transits/.',
    returnInstant: 'Istante della rivoluzione solare',
    localTime: 'la tua ora',
    noTimeNote: 'Calcolato da un tema di mezzogiorno. I temi planetari restano utili; le case e l’ascendente non vengono mostrati finché non aggiungi l’ora di nascita.',
    noPlaceNote: 'Senza un luogo di nascita, la rivoluzione solare mostra solo i pianeti, senza case.',
    progressedAngles: 'Le case progredite richiedono una convenzione che non abbiamo adottato, quindi qui progrediscono solo i pianeti.',
    trustLine: 'Ognuno di questi cieli viene calcolato su questo dispositivo.',
    loading: 'Calcolo in corso…',
  },
  ru: {
    skyRingLabel: 'небо прямо сейчас',
    progressedRingLabel: 'ваши прогрессивные планеты',
    returnRingLabel: 'небо вашего солнечного возвращения',
    skyIntro: 'Внешнее кольцо — небо этого момента поверх вашей натальной карты.',
    progressedIntro: 'Внешнее кольцо — ваша карта, прогрессивно сдвинутая к сегодняшнему дню: один день после рождения соответствует одному году жизни.',
    returnIntro: 'Внешнее кольцо — небо последнего солнечного возвращения: момента, когда Солнце вернулось в натальное положение.',
    tightestNow: 'Самые точные контакты:',
    noContacts: 'Сейчас в этом орбисе нет близких контактов.',
    transitsLink: 'Двигайте это небо во времени на /transits/.',
    returnInstant: 'Момент возвращения',
    localTime: 'ваше время',
    noTimeNote: 'Считано по полуденной карте. Планетные темы остаются полезными; дома и асцендент скрыты, пока вы не добавите время рождения.',
    noPlaceNote: 'Без места рождения солнечное возвращение показано только по планетам, без домов.',
    progressedAngles: 'Для прогрессивных домов нужна договорённость, которую мы не приняли, поэтому здесь прогрессируют только планеты.',
    trustLine: 'Каждое из этих положений неба рассчитано на вашем устройстве.',
    loading: 'Считаем…',
  },
} as const satisfies Record<Locale, LensChrome>;

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
  aries: 'The year emphasizes ignition — situations may reward starting before you feel entirely ready. Momentum is a theme to work with.',
  taurus: 'The year leads with consolidation — building, furnishing, and letting good things get boring in the best way. Slow is the strategy, not the setback.',
  gemini: 'The year emphasizes movement — conversations, short trips, and a busier-than-usual inbox may take more space. Notice what deserves a place on the calendar.',
  cancer: 'The year draws attention to home in the load-bearing sense: where you live, who counts as family, and what helps you feel safe.',
  leo: 'The year can bring more visibility, chosen or otherwise. Decide what you want people to understand when attention finds you.',
  virgo: 'The year emphasizes maintenance — health, systems, and the backlog you have been stepping over. Small fixes may create useful room.',
  libra: 'The year emphasizes other people — partnerships, negotiations, and the balance between “we” and “I.” Choose counterparts thoughtfully.',
  scorpio: 'The year emphasizes depth — shared resources, intimacy, and the questions that need an honest look. Let clarity matter more than drama.',
  sagittarius: 'The year emphasizes range — travel, study, or a belief that needs field-testing. Look for the option that genuinely expands your view.',
  capricorn: 'The year draws attention to career, reputation, and the long game. Consistent effort may matter more than a dramatic leap.',
  aquarius: 'The year emphasizes networks — allies, groups, and the future you are actively building. Notice which communities make that future more possible.',
  pisces: 'The year emphasizes rest, imagination, and endings that make room. Margin may be as useful as output.',
};
