import type { ReleasedLocale as Locale } from '../lib/i18n';

const EN = {
  heading: 'Sky alerts, when they’re earned?',
  body: 'A notification only for the dates that matter — full moons, eclipses, retrograde turns. Most days, nothing.',
  ios: 'On iPhone and iPad, alerts work only after you add Zodiacs to your Home Screen. Install first, then return here.',
  accept: 'Turn on sky alerts',
  installing: 'Turning on…',
  dismiss: 'Not now',
  dismissLabel: 'Dismiss the sky-alerts offer',
  on: 'Sky alerts are on — only the dates that matter, never more than one a day.',
  off: 'Turn off',
  denied: 'Notifications are blocked in this browser, so sky alerts can’t reach you. Your browser’s site settings can change that whenever you like.',
  error: 'Sky alerts are unavailable right now. Try again later.',
} as const;

export const PUSH_CAP_EN = 'Never more than one a day, or two a week.';
export const PUSH_REOFFER_EN = 'Your sky alerts lapsed with this browser’s subscription. Turn them back on?';

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
  pt: {
    heading: 'Quer receber uma nota diária?',
    body: 'Uma nota breve sobre o céu abre seu resumo privado em /today/. Seus dados de nascimento ficam neste dispositivo.',
    ios: 'No iPhone e no iPad, as notificações só funcionam depois que você adiciona o site à Tela de Início. Instale primeiro e depois volte aqui.',
    accept: 'Ativar notas diárias',
    installing: 'Ativando…',
    dismiss: 'Agora não',
    dismissLabel: 'Dispensar oferta de nota diária',
    on: 'As notas diárias estão ativadas. As notificações abrem /today/; seu mapa fica neste dispositivo.',
    off: 'Desativar',
    denied: 'As notificações estão bloqueadas neste navegador. Você pode mudar isso nas configurações do site.',
    error: 'As notas diárias não estão disponíveis agora. Tente novamente mais tarde.',
  },
  fr: {
    heading: 'Recevoir une note quotidienne\u202f?',
    body: 'Une courte note sur le ciel ouvre ton résumé privé sur /today/. Tes données de naissance restent sur cet appareil.',
    ios: 'Sur iPhone et iPad, les notifications fonctionnent uniquement après l’ajout du site à l’écran d’accueil. Installe-le d’abord, puis reviens ici.',
    accept: 'Activer les notes quotidiennes',
    installing: 'Activation…',
    dismiss: 'Pas maintenant',
    dismissLabel: 'Fermer la proposition de note quotidienne',
    on: 'Les notes quotidiennes sont activées. Les notifications ouvrent /today/\u00a0; ton thème reste sur cet appareil.',
    off: 'Désactiver',
    denied: 'Les notifications sont bloquées dans ce navigateur. Tu peux modifier ce réglage dans les paramètres du site.',
    error: 'Les notes quotidiennes sont indisponibles pour le moment. Réessaie plus tard.',
  },
  it: {
    heading: 'Vuoi ricevere una nota quotidiana?',
    body: 'Una breve nota sul cielo apre il tuo riepilogo privato su /today/. I tuoi dati di nascita restano su questo dispositivo.',
    ios: 'Su iPhone e iPad, le notifiche funzionano solo dopo aver aggiunto il sito alla schermata Home. Installalo prima, poi torna qui.',
    accept: 'Attiva le note quotidiane',
    installing: 'Attivazione…',
    dismiss: 'Non ora',
    dismissLabel: 'Chiudi la proposta di nota quotidiana',
    on: 'Le note quotidiane sono attive. Le notifiche aprono /today/; il tuo tema resta su questo dispositivo.',
    off: 'Disattiva',
    denied: 'Le notifiche sono bloccate in questo browser. Puoi modificare questa impostazione nelle preferenze del sito.',
    error: 'Le note quotidiane non sono disponibili al momento. Riprova più tardi.',
  },
} as const satisfies Record<Locale, Record<keyof typeof EN, string>>;

export type PushCopyKey = keyof typeof EN;

export function pushText(locale: Locale, key: PushCopyKey): string {
  return PUSH_COPY[locale]?.[key] ?? PUSH_COPY.en[key];
}
