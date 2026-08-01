import type { CatalogLocale as Locale, UiKey } from './i18n';

interface NavTool {
  href: string;
  label: UiKey;
  sublabel: Record<Locale, string>;
}

/**
 * The daily return path and eight primary calculators surfaced by the site navigation. Sublabels
 * are reused verbatim from the existing EN/ES tool-page and tools-hub copy.
 */
export const NAV_TOOLS = [
  {
    href: '/today/',
    label: 'navToday',
    sublabel: {
      en: 'Your saved chart against today’s sky, plus a clear Sun-sign start.',
      es: 'Tu carta guardada frente al cielo de hoy. Esta experiencia está en inglés.',
      pt: 'Seu mapa salvo diante do céu de hoje. Esta experiência está em inglês.',
      fr: 'Ton thème enregistré face au ciel du jour. Cette expérience est en anglais.',
      it: 'Il tuo tema salvato rispetto al cielo di oggi. Questa esperienza è in inglese.',
      ru: 'Сохранённая карта и небо сегодня. Этот раздел пока на английском.',
    },
  },
  {
    href: '/birth-chart/',
    label: 'birthChart',
    sublabel: {
      en: 'See your sun, moon, rising, planets, houses, and what they mean.',
      es: 'Ve tu Sol, Luna, ascendente, planetas, casas y lo que significan.',
      pt: 'Veja seu Sol, sua Lua, seu ascendente, os planetas, as casas e o que tudo isso significa.',
      fr: 'Découvre ton Soleil, ta Lune, ton ascendant, tes planètes, tes maisons et leur signification.',
      it: 'Il tuo Sole, la tua Luna, l’ascendente, i pianeti, le case e il loro significato.',
      ru: 'Солнце, Луна, асцендент, планеты, дома — и что всё это значит.',
    },
  },
  {
    href: '/compatibility/',
    label: 'compatibility',
    sublabel: {
      en: 'Compare two charts and see where they click, clash, and grow.',
      es: 'Compara dos cartas y mira dónde conectan, chocan y crecen.',
      pt: 'Compare dois mapas e veja onde combinam, entram em conflito e crescem.',
      fr: 'Compare deux thèmes et vois où ils s’accordent, se heurtent et évoluent.',
      it: 'Confronta due temi e scopri dove si accordano, si scontrano e crescono.',
      ru: 'Сравните две карты и увидьте, где они совпадают, спорят и растут.',
    },
  },
  {
    href: '/transits/',
    label: 'transits',
    sublabel: {
      en: "See today's sky next to your chart.",
      es: 'El cielo de hoy comparado con tu carta.',
      pt: 'Veja o céu de hoje ao lado do seu mapa.',
      fr: 'Observe le ciel d’aujourd’hui par rapport à ton thème.',
      it: 'Il cielo di oggi a confronto con il tuo tema.',
      ru: 'Посмотрите на сегодняшнее небо рядом со своей картой.',
    },
  },
  {
    href: '/moon-sign/',
    label: 'moonSign',
    sublabel: {
      en: 'How you feel, and what settles you.',
      es: 'Cómo sientes y qué te ayuda a volver a ti.',
      pt: 'Como você vive as emoções e o que traz calma.',
      fr: 'Ta manière de ressentir et ce qui t’apaise.',
      it: 'Come vivi le emozioni e che cosa ti calma.',
      ru: 'Как вы чувствуете и что помогает вам успокоиться.',
    },
  },
  {
    href: '/rising-sign/',
    label: 'risingSign',
    sublabel: {
      en: 'Find the sign people meet first. Birth time helps.',
      es: 'Encuentra la energía que otros notan primero.',
      pt: 'Descubra o signo que as pessoas percebem primeiro em você. O horário de nascimento ajuda.',
      fr: 'Découvre le signe que les autres perçoivent en premier. L’heure de naissance est utile.',
      it: 'Il segno che mostri agli altri al primo incontro. L’ora di nascita aiuta.',
      ru: 'Найдите знак, который люди встречают первым. Нужны часы рождения.',
    },
  },
  {
    href: '/moon-phase/',
    label: 'moonPhase',
    sublabel: {
      en: 'Tonight’s moon, and the moon of any date you care about.',
      es: 'La Luna de hoy y la Luna de cualquier fecha importante.',
      pt: 'A Lua desta noite e a Lua de qualquer data importante para você.',
      fr: 'La Lune de ce soir et celle de toute date qui compte pour toi.',
      it: 'La Luna di oggi e quella di qualsiasi data importante per te.',
      ru: 'Луна сегодня и Луна в любую важную для вас дату.',
    },
  },
  {
    href: '/saturn-return/',
    label: 'saturnReturn',
    sublabel: {
      en: 'When yours hits, exactly, and what it tends to ask.',
      es: 'Cuándo llega el tuyo y qué suele pedir.',
      pt: 'Quando o seu acontece, com exatidão, e o que ele costuma pedir.',
      fr: 'Quand le tien arrive, précisément, et ce qu’il tend à demander.',
      it: 'Quando arriva il tuo, con precisione, e che cosa tende a chiedere.',
      ru: 'Когда именно случится ваше возвращение и о чём оно обычно спрашивает.',
    },
  },
  {
    href: '/birthday/',
    label: 'birthday',
    sublabel: {
      en: 'Pick your birthday and get the receipts: sun sign verified across 1940–2030, exact degree spans, decans with traditional rulers, and year-by-year cusp tables.',
      es: 'Un cumpleaños, un aniversario, cualquier fecha.',
      pt: 'Um aniversário, uma data especial, qualquer data.',
      fr: 'Un anniversaire, une date marquante, n’importe quelle date.',
      it: 'Un compleanno, un anniversario, una data qualsiasi.',
      ru: 'Выберите дату рождения и получите точные данные о знаке, градусе и декане.',
    },
  },
] as const satisfies readonly NavTool[];
