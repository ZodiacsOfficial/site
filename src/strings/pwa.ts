import type { Locale } from '../lib/i18n';

export const PWA_PROMPT_EN = {
  heading: 'Keep your tools close?',
  body: 'Install Zodiacs for a faster return to your private, browser-computed tools.',
  ios: 'On iPhone or iPad, tap Share, then Add to Home Screen.',
  install: 'Install Zodiacs',
  dismiss: 'No, do not ask again',
  icons: 'The twelve zodiac signs',
} as const;

const COPY = {
  en: PWA_PROMPT_EN,
  es: {
    heading: '¿Quieres tener tus herramientas a mano?',
    body: 'Instala Zodiacs para volver más rápido a tus herramientas privadas, calculadas en el navegador.',
    ios: 'En iPhone o iPad, toca Compartir y luego Añadir a pantalla de inicio.',
    install: 'Instalar Zodiacs',
    dismiss: 'No, no volver a preguntar',
    icons: 'Los doce signos del zodiaco',
  },
  pt: PWA_PROMPT_EN,
  fr: PWA_PROMPT_EN,
  it: PWA_PROMPT_EN,
} as const satisfies Record<Locale, Record<keyof typeof PWA_PROMPT_EN, string>>;

export function pwaText(locale: Locale, key: keyof typeof PWA_PROMPT_EN): string {
  return COPY[locale]?.[key] ?? COPY.en[key];
}
