import type { Locale } from './i18n';

export const A2HS_HINT_KEY = 'zodiacs.a2hs.v1';

export type A2hsPlatform = 'ios' | 'android';

export interface A2hsHint {
  platform: A2hsPlatform;
  message: string;
  dismissLabel: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const COPY = {
  en: {
    ios: 'To keep your saved charts close, tap Share → Add to Home Screen. Daily notifications on iPhone and iPad work only from the installed site.',
    android: 'To keep your saved charts close, tap Menu → Add to Home screen.',
    dismiss: 'Dismiss home-screen hint',
  },
  es: {
    ios: 'Para tener tus cartas guardadas a mano, toca Compartir → Añadir a pantalla de inicio. Las notificaciones diarias en iPhone y iPad solo funcionan desde el sitio instalado.',
    android: 'Para tener tus cartas guardadas a mano, toca Menú → Añadir a pantalla de inicio.',
    dismiss: 'Descartar indicación de pantalla de inicio',
  },
} as const satisfies Record<Locale, {
  ios: string;
  android: string;
  dismiss: string;
}>;

/** User-agent routing only chooses the instruction; it never changes behavior. */
export function a2hsPlatform(userAgent: string): A2hsPlatform | null {
  const iPadOsSafari = /\bMacintosh\b/.test(userAgent) && /\bMobile\//.test(userAgent);
  const iosSafari = (/\b(?:iPhone|iPad|iPod)\b/.test(userAgent) || iPadOsSafari)
    && /Safari\//.test(userAgent)
    && !/(?:CriOS|FxiOS|EdgiOS|OPiOS)\//.test(userAgent);
  if (iosSafari) return 'ios';

  const androidChrome = /Android/.test(userAgent)
    && /Chrome\/\d/.test(userAgent)
    && !/(?:EdgA|OPR|SamsungBrowser)\//.test(userAgent);
  return androidChrome ? 'android' : null;
}

/** Atomically claims the one-time hint. Storage failure means no repeated prompt. */
export function claimA2hsHint(
  locale: Locale,
  userAgent: string,
  storage: StorageLike,
): A2hsHint | null {
  const platform = a2hsPlatform(userAgent);
  if (!platform) return null;
  try {
    if (storage.getItem(A2HS_HINT_KEY)) return null;
    storage.setItem(A2HS_HINT_KEY, '1');
  } catch {
    return null;
  }
  return {
    platform,
    message: COPY[locale][platform],
    dismissLabel: COPY[locale].dismiss,
  };
}
