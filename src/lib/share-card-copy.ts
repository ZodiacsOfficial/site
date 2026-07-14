import type { Locale } from './i18n';

export const SHARE_CARD_EN = {
  bigThreeTitle: 'Your big three',
  fullChartTitle: 'A birth chart',
  compatibilityTitle: 'Compatibility',
  sun: 'Sun',
  moon: 'Moon',
  rising: 'Rising',
  sunDescriptor: 'Core identity and direction',
  moonDescriptor: 'Instinct and emotional life',
  risingDescriptor: 'First impression and chart horizon',
  dominant: 'Dominant {element} · {modality}',
  balanced: 'Balanced',
  compatibilityFlow: 'Flow, with useful friction',
  compatibilityCharge: 'Chemistry that asks for attention',
  compatibilityBalance: 'An even exchange of ease and charge',
  tightestContacts: 'Tightest contacts',
  engineReceipt: 'Engine {version}',
  bigThreeAction: 'Share the big three',
  fullChartAction: 'Share the full chart',
  compatibilityAction: 'Share this compatibility',
  compatibilityBusy: 'Rendering compatibility card…',
  compatibilitySaved: 'Compatibility card saved.',
  compatibilityError: "Couldn't draw this card in your browser.",
} as const;

const COPY = {
  en: SHARE_CARD_EN,
  es: {
    bigThreeTitle: 'Tus tres grandes',
    fullChartTitle: 'Una carta natal',
    compatibilityTitle: 'Compatibilidad',
    sun: 'Sol',
    moon: 'Luna',
    rising: 'Ascendente',
    sunDescriptor: 'Identidad central y dirección',
    moonDescriptor: 'Instinto y vida emocional',
    risingDescriptor: 'Primera impresión y horizonte de la carta',
    dominant: '{element} dominante · {modality}',
    balanced: 'Equilibrado',
    compatibilityFlow: 'Fluidez, con una fricción útil',
    compatibilityCharge: 'Química que pide atención',
    compatibilityBalance: 'Un intercambio parejo de facilidad y tensión',
    tightestContacts: 'Contactos más exactos',
    engineReceipt: 'Motor {version}',
    bigThreeAction: 'Compartir los tres grandes',
    fullChartAction: 'Compartir la carta completa',
    compatibilityAction: 'Compartir esta compatibilidad',
    compatibilityBusy: 'Creando tarjeta de compatibilidad…',
    compatibilitySaved: 'Tarjeta de compatibilidad guardada.',
    compatibilityError: 'No se pudo crear esta tarjeta en tu navegador.',
  },
  pt: SHARE_CARD_EN,
  fr: SHARE_CARD_EN,
  it: SHARE_CARD_EN,
} as const satisfies Record<Locale, Record<keyof typeof SHARE_CARD_EN, string>>;

export type ShareCardCopyKey = keyof typeof SHARE_CARD_EN;

export function shareCardText(locale: Locale, key: ShareCardCopyKey): string {
  return COPY[locale]?.[key] ?? COPY.en[key];
}

export function shareCardFormat(
  locale: Locale,
  key: ShareCardCopyKey,
  values: Record<string, string | number>,
): string {
  return shareCardText(locale, key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
