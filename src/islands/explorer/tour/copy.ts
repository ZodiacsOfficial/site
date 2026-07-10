/**
 * Tour copy — module-local dictionary, both locales, compile-time key
 * parity via `satisfies` (the SHARE_COPY precedent in
 * PositionsShareSurface.tsx). Lives inside the lazy tour module so none of
 * these strings land in any page's initial JS closure — /birth-chart/ has
 * fractions of a kilobyte of budget headroom and the shared UI dictionary
 * is statically imported by every page.
 *
 * Voice: plain, warm, specific. State computed facts; label interpretation
 * as tradition; never woo, never salesy.
 */
import type { Locale } from '../../../lib/i18n';

const TOUR_COPY = {
  en: {
    // Chrome
    kicker: 'Chapter {n} of {total}',
    next: 'Next',
    prev: 'Back',
    finish: 'Finish the tour',
    exitAria: 'End the tour',
    dotsLabel: 'Chapters',
    dotAria: '{title} — chapter {n} of {total}',
    ended: 'Tour ended.',
    backToTour: '← Back to the tour',
    allTypes: 'All',
    previewNote: 'A preview only — your chart stays in {system}. Change it in the form above.',
    rotateToAries: 'Put 0° Aries on the left',
    rotateToAsc: 'Back to your Ascendant',
    morphToPlacidus: 'See it in Placidus',
    morphToWhole: 'See it in whole sign',
    diffCount: '{n} placements change house',
    diffOne: '1 placement changes house',
    diffNone: 'No placements change house for this birth',
    polarNote: "This far from the equator Placidus isn't defined, so this chart uses whole sign either way.",
    loudest: "This chart's four loudest:",
    wholeSign: 'whole sign',
    placidus: 'Placidus',

    // Chapters
    skyTitle: 'This is your sky',
    skyBody1: 'Everything on this wheel was computed from one instant: the sky over your birthplace at your birth time. Nothing is looked up — it is calculated, on your device.',
    skyBody2: 'The tour walks the wheel one layer at a time. Tap anything along the way; the tour waits.',
    zodiacTitle: 'The zodiac ring',
    zodiacBody1: "The outer ring is the zodiac: twelve equal 30° segments of the Sun's yearly path. It is the wheel's fixed ruler — every position is read against it.",
    zodiacBody2: "Your Sun stays lit. That one degree is what a sun sign means.",
    zodiacRotateNote: 'Charts are usually drawn with your Ascendant on the left. The ring never changes — only where we start reading.',
    horizonTitle: 'Your horizon',
    horizonBody1: 'ASC marks the degree rising in the east at your birth minute — your rising sign. Straight across sits the Descendant, where the sky was setting; MC is the degree overhead.',
    horizonBody2: 'This axis is why the minute matters: it moves about a degree every four minutes, and the whole wheel is anchored to it.',
    'big-threeTitle': 'The big three',
    'big-threeBody1': 'Sun, Moon, rising — identity, instinct, entrance. Read these three first; everything else refines them.',
    planetsTitle: 'The planets',
    planetsBody1: "Each disc is a planet at its true degree. Mercury through Mars move fast and read personally; Jupiter and Saturn set the decade's themes; the outer three mark generations.",
    planetsBody2: 'Tap any disc for its receipt — position, speed, house, aspects. Rx means retrograde: apparent backward motion, common and ordinary.',
    housesTitle: 'The houses',
    housesBody1: 'The twelve wedges are the houses — where in life a planet does its work. They come from your birth time and place, not the calendar.',
    housesBody2: 'Two honest ways to slice them: whole sign gives each house one sign; Placidus divides by exact horizon math. Try the other one — the planets never move, only the walls.',
    aspectsTitle: 'The conversations',
    aspectsBody1: 'The chords in the middle are aspects: set angles between planets, each a kind of conversation. Thicker chords are tighter angles — they do the most work; dashed ones are already separating.',
    wholeTitle: 'The whole picture',
    wholeBody1: "Everything back on. A chart isn't a list of traits — it's one sky with everything happening at once. The reading below walks it line by line.",
    wholeBody2: 'Save it and this device computes its year ahead on your profile page; the share link carries the data itself, never through a server.',
    'no-housesTitle': 'Why this chart has no houses',
    'no-housesBody1': "Houses come from the exact minute of birth — the sky's rotation, not the calendar. Without a time we compute a noon chart: every planet's sign is right, but there is no horizon to hang houses on.",
    'no-housesBody2': 'If the time ever turns up (birth certificates usually have it), add it above — the wheel gains its rooms, and you gain a rising sign.',
  },
  es: {
    kicker: 'Capítulo {n} de {total}',
    next: 'Siguiente',
    prev: 'Atrás',
    finish: 'Terminar el recorrido',
    exitAria: 'Salir del recorrido',
    dotsLabel: 'Capítulos',
    dotAria: '{title} — capítulo {n} de {total}',
    ended: 'Recorrido terminado.',
    backToTour: '← Volver al recorrido',
    allTypes: 'Todos',
    previewNote: 'Solo una vista previa — tu carta sigue en {system}. Cámbialo en el formulario de arriba.',
    rotateToAries: 'Poner 0° de Aries a la izquierda',
    rotateToAsc: 'Volver a tu ascendente',
    morphToPlacidus: 'Verla en Placidus',
    morphToWhole: 'Verla en signos enteros',
    diffCount: '{n} posiciones cambian de casa',
    diffOne: '1 posición cambia de casa',
    diffNone: 'Ninguna posición cambia de casa para este nacimiento',
    polarNote: 'Tan lejos del ecuador Placidus no está definido, así que esta carta usa signos enteros de todos modos.',
    loudest: 'Los cuatro más fuertes de esta carta:',
    wholeSign: 'signos enteros',
    placidus: 'Placidus',

    skyTitle: 'Este es tu cielo',
    skyBody1: 'Todo en esta rueda se calculó a partir de un instante: el cielo sobre tu lugar de nacimiento a tu hora de nacimiento. Nada se busca en tablas — se calcula, en tu dispositivo.',
    skyBody2: 'El recorrido repasa la rueda capa por capa. Toca lo que quieras por el camino; el recorrido espera.',
    zodiacTitle: 'El anillo del zodiaco',
    zodiacBody1: 'El anillo exterior es el zodiaco: doce segmentos iguales de 30° del camino anual del Sol. Es la regla fija de la rueda — cada posición se lee contra él.',
    zodiacBody2: 'Tu Sol sigue encendido. Ese grado es lo que significa un signo solar.',
    zodiacRotateNote: 'Las cartas suelen dibujarse con tu ascendente a la izquierda. El anillo no cambia — solo dónde empezamos a leer.',
    horizonTitle: 'Tu horizonte',
    horizonBody1: 'ASC marca el grado que subía por el este en tu minuto de nacimiento — tu ascendente. Justo enfrente está el descendente, donde el cielo se ponía; el MC es el grado en lo más alto.',
    horizonBody2: 'Este eje es la razón de que importe el minuto: se mueve alrededor de un grado cada cuatro minutos, y toda la rueda está anclada a él.',
    'big-threeTitle': 'Los tres grandes',
    'big-threeBody1': 'Sol, Luna, ascendente: identidad, instinto, entrada. Lee estos tres primero; todo lo demás los matiza.',
    planetsTitle: 'Los planetas',
    planetsBody1: 'Cada disco es un planeta en su grado real. De Mercurio a Marte van rápido y se leen en lo personal; Júpiter y Saturno marcan los temas de la década; los tres exteriores marcan generaciones.',
    planetsBody2: 'Toca cualquier disco para ver su ficha — posición, velocidad, casa, aspectos. Rx significa retrógrado: movimiento aparente hacia atrás, común y corriente.',
    housesTitle: 'Las casas',
    housesBody1: 'Las doce cuñas son las casas — en qué parte de la vida trabaja cada planeta. Salen de tu hora y lugar de nacimiento, no del calendario.',
    housesBody2: 'Dos maneras honestas de cortarlas: signos enteros da un signo a cada casa; Placidus divide con la trigonometría exacta del horizonte. Prueba la otra — los planetas no se mueven, solo las paredes.',
    aspectsTitle: 'Las conversaciones',
    aspectsBody1: 'Las cuerdas del centro son aspectos: ángulos fijos entre planetas, cada uno un tipo de conversación. Las cuerdas más gruesas son ángulos más exactos — son las que más trabajan; las discontinuas ya se están separando.',
    wholeTitle: 'La imagen completa',
    wholeBody1: 'Todo encendido otra vez. Una carta no es una lista de rasgos — es un solo cielo con todo a la vez. La lectura de abajo la recorre línea por línea.',
    wholeBody2: 'Guárdala y este dispositivo calcula su año por delante en tu página de perfil; el enlace para compartir lleva los datos en sí mismo, nunca por un servidor.',
    'no-housesTitle': 'Por qué esta carta no tiene casas',
    'no-housesBody1': 'Las casas salen del minuto exacto del nacimiento — la rotación del cielo, no el calendario. Sin hora calculamos una carta de mediodía: el signo de cada planeta es correcto, pero no hay horizonte del que colgar las casas.',
    'no-housesBody2': 'Si la hora aparece algún día (el certificado de nacimiento suele tenerla), agrégala arriba — la rueda gana sus habitaciones, y tú un ascendente.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type TourKey = keyof typeof TOUR_COPY.en;

export function tourText(locale: Locale, key: TourKey): string {
  return TOUR_COPY[locale][key];
}

export function tourFormat(
  locale: Locale,
  key: TourKey,
  values: Record<string, string | number>,
): string {
  return tourText(locale, key).replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (token, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token
  ));
}
