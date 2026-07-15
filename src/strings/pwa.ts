import type { Locale } from '../lib/i18n';

export const PWA_PROMPT_EN = {
  heading: 'Keep your tools close?',
  body: 'Install Zodiacs for a faster return to your private, browser-computed tools.',
  ios: 'On iPhone or iPad, tap Share, then Add to Home Screen.',
  install: 'Install Zodiacs',
  dismiss: 'No, do not ask again',
  icons: 'The twelve zodiac signs',
} as const;

export const PWA_PROMPT_COPY = {
  en: PWA_PROMPT_EN,
  es: {
    heading: '¿Quieres tener tus herramientas a mano?',
    body: 'Instala Zodiacs para volver más rápido a tus herramientas privadas, calculadas en el navegador.',
    ios: 'En iPhone o iPad, toca Compartir y luego Añadir a pantalla de inicio.',
    install: 'Instalar Zodiacs',
    dismiss: 'No, no volver a preguntar',
    icons: 'Los doce signos del zodiaco',
  },
  pt: {
    heading: 'Quer manter suas ferramentas por perto?',
    body: 'Instale o Zodiacs para voltar mais rápido às suas ferramentas privadas, calculadas no navegador.',
    ios: 'No iPhone ou iPad, toque em Compartilhar e depois em Adicionar à Tela de Início.',
    install: 'Instalar o Zodiacs',
    dismiss: 'Não, não perguntar novamente',
    icons: 'Os doze signos do zodíaco',
  },
  fr: {
    heading: 'Garder tes outils à portée de main ?',
    body: 'Installe Zodiacs pour retrouver plus vite tes outils privés, calculés dans le navigateur.',
    ios: 'Sur iPhone ou iPad, touche Partager, puis Sur l’écran d’accueil.',
    install: 'Installer Zodiacs',
    dismiss: 'Non, ne plus me le demander',
    icons: 'Les douze signes du zodiaque',
  },
  it: {
    heading: 'Vuoi tenere gli strumenti a portata di mano?',
    body: 'Installa Zodiacs per tornare più rapidamente ai tuoi strumenti privati, calcolati nel browser.',
    ios: 'Su iPhone o iPad, tocca Condividi e poi Aggiungi alla schermata Home.',
    install: 'Installa Zodiacs',
    dismiss: 'No, non chiederlo più',
    icons: 'I dodici segni zodiacali',
  },
} as const satisfies Record<Locale, Record<keyof typeof PWA_PROMPT_EN, string>>;

export function pwaText(locale: Locale, key: keyof typeof PWA_PROMPT_EN): string {
  return PWA_PROMPT_COPY[locale]?.[key] ?? PWA_PROMPT_COPY.en[key];
}
