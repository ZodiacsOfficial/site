import type { Locale } from '../lib/i18n';

const EN = {
  heading: 'Get a daily note?',
  body: 'A short sky note opens your private brief at /today/. Your birth details stay on this device.',
  ios: 'On iPhone and iPad, notifications work only after you add this site to your Home Screen. Install it first, then return here.',
  accept: 'Turn on daily notes',
  installing: 'Turning on…',
  dismiss: 'Not now',
  dismissLabel: 'Dismiss daily-note offer',
  on: 'Daily notes are on. Notifications open /today/; your chart stays on this device.',
  off: 'Turn off',
  denied: 'Notifications are blocked in this browser. You can change that in the site settings.',
  error: 'Daily notes are unavailable right now. Try again later.',
} as const;

export const PUSH_COPY = {
  en: EN,
  es: {
    heading: '¿Quieres una nota diaria?',
    body: 'Una nota breve del cielo abre tu resumen privado en /today/. Tus datos de nacimiento se quedan en este dispositivo.',
    ios: 'En iPhone y iPad, las notificaciones solo funcionan después de añadir el sitio a la pantalla de inicio. Instálalo primero y vuelve aquí.',
    accept: 'Activar notas diarias',
    installing: 'Activando…',
    dismiss: 'Ahora no',
    dismissLabel: 'Descartar oferta de nota diaria',
    on: 'Las notas diarias están activadas. Las notificaciones abren /today/; tu carta se queda en este dispositivo.',
    off: 'Desactivar',
    denied: 'Las notificaciones están bloqueadas en este navegador. Puedes cambiarlo en los ajustes del sitio.',
    error: 'Las notas diarias no están disponibles ahora. Inténtalo más tarde.',
  },
  pt: EN,
  fr: EN,
  it: EN,
} as const satisfies Record<Locale, Record<keyof typeof EN, string>>;

export type PushCopyKey = keyof typeof EN;

export function pushText(locale: Locale, key: PushCopyKey): string {
  return PUSH_COPY[locale]?.[key] ?? PUSH_COPY.en[key];
}
