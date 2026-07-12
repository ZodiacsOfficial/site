import type { Locale, UiKey } from './i18n';

interface NavTool {
  href: string;
  label: UiKey;
  sublabel: Record<Locale, string>;
}

/**
 * The eight primary calculators surfaced by the site navigation. Sublabels
 * are reused verbatim from the existing EN/ES tool-page and tools-hub copy.
 */
export const NAV_TOOLS = [
  {
    href: '/birth-chart/',
    label: 'birthChart',
    sublabel: {
      en: 'See your sun, moon, rising, planets, houses, and what they mean.',
      es: 'Ve tu Sol, Luna, ascendente, planetas, casas y lo que significan.',
    },
  },
  {
    href: '/compatibility/',
    label: 'compatibility',
    sublabel: {
      en: 'Compare two charts and see where they click, clash, and grow.',
      es: 'Compara dos cartas y mira dónde conectan, chocan y crecen.',
    },
  },
  {
    href: '/transits/',
    label: 'transits',
    sublabel: {
      en: "See today's sky next to your chart.",
      es: 'El cielo de hoy comparado con tu carta.',
    },
  },
  {
    href: '/moon-sign/',
    label: 'moonSign',
    sublabel: {
      en: 'How you feel, and what settles you.',
      es: 'Cómo sientes y qué te ayuda a volver a ti.',
    },
  },
  {
    href: '/rising-sign/',
    label: 'risingSign',
    sublabel: {
      en: 'Find the sign people meet first. Birth time helps.',
      es: 'Encuentra la energía que otros notan primero.',
    },
  },
  {
    href: '/moon-phase/',
    label: 'moonPhase',
    sublabel: {
      en: 'Tonight’s moon, and the moon of any date you care about.',
      es: 'La Luna de hoy y la Luna de cualquier fecha importante.',
    },
  },
  {
    href: '/saturn-return/',
    label: 'saturnReturn',
    sublabel: {
      en: 'When yours hits, exactly, and what it tends to ask.',
      es: 'Cuándo llega el tuyo y qué suele pedir.',
    },
  },
  {
    href: '/birthday/',
    label: 'birthday',
    sublabel: {
      en: 'Pick your birthday and get the receipts.',
      es: 'Un cumpleaños, un aniversario, cualquier fecha.',
    },
  },
] as const satisfies readonly NavTool[];
