import { useEffect, useState } from 'preact/hooks';
import type { Locale } from '../lib/i18n';
import { claimA2hsHint } from '../lib/a2hs';
import {
  claimPushPrompt,
  isIosDevice,
  isStandaloneDisplay,
  readPushPreference,
  setPushPreference,
  vapidKeyBytes,
} from '../lib/push';
import '../styles/push.css';

interface Props {
  locale?: Locale;
  context?: 'chart-save' | 'today-return';
}

type View = 'hidden' | 'offer' | 'ios-install' | 'busy' | 'subscribed' | 'denied' | 'error';

const COPY = {
  en: {
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
  },
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
} as const satisfies Record<Locale, {
  heading: string;
  body: string;
  ios: string;
  accept: string;
  installing: string;
  dismiss: string;
  dismissLabel: string;
  on: string;
  off: string;
  denied: string;
  error: string;
}>;

function track(name: 'push_prompt' | 'push_subscribe'): void {
  (window as Window & {
    zodiacsAnalytics?: { track?: (event: string, props: Record<string, never>) => void };
  }).zodiacsAnalytics?.track?.(name, {});
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager.getSubscription() ?? null;
}

export default function PushOptIn({ locale = 'en', context = 'chart-save' }: Props) {
  const copy = COPY[locale];
  const [view, setView] = useState<View>('hidden');

  useEffect(() => {
    if (!supported()) return;
    let live = true;
    void currentSubscription().then((subscription) => {
      if (!live) return;
      if (subscription) {
        setPushPreference(localStorage, 'subscribed');
        setView('subscribed');
        return;
      }

      const needsInstall = isIosDevice(navigator.userAgent)
        && !isStandaloneDisplay(navigator as Navigator & { standalone?: boolean }, window.matchMedia.bind(window));
      if (needsInstall) {
        // Claim only the install hint. The independent push claim remains open
        // for the first contextual visit from the installed Home Screen app.
        if (claimA2hsHint(locale, navigator.userAgent, localStorage)) setView('ios-install');
        return;
      }

      if (readPushPreference(localStorage) === 'subscribed') {
        setPushPreference(localStorage, 'offered');
        setView('offer');
        track('push_prompt');
        return;
      }
      if (!claimPushPrompt(localStorage)) return;
      setView('offer');
      track('push_prompt');
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  function dismiss(): void {
    if (view === 'ios-install') {
      setView('hidden');
      return;
    }
    setPushPreference(localStorage, 'dismissed');
    setView('hidden');
  }

  async function subscribe(): Promise<void> {
    if (view === 'busy') return;
    setView('busy');
    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== 'granted') {
        setPushPreference(localStorage, 'dismissed');
        setView('denied');
        return;
      }

      const publicKey = import.meta.env.PUBLIC_VAPID_KEY?.trim();
      if (!publicKey) throw new Error('missing public key');
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyBytes(publicKey),
      });
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subscription.toJSON(), lang: locale }),
      });
      if (!response.ok) {
        if (!existing) await subscription.unsubscribe();
        throw new Error(`subscription endpoint ${response.status}`);
      }

      setPushPreference(localStorage, 'subscribed');
      setView('subscribed');
      track('push_subscribe');
    } catch {
      setView('error');
    }
  }

  async function unsubscribe(): Promise<void> {
    setView('busy');
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await Promise.allSettled([
          fetch('/api/push/subscribe', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          }),
          subscription.unsubscribe(),
        ]);
      }
      setPushPreference(localStorage, 'dismissed');
      setView('hidden');
    } catch {
      setView('error');
    }
  }

  if (view === 'hidden') return null;

  const message = view === 'subscribed'
    ? copy.on
    : view === 'ios-install'
      ? copy.ios
      : view === 'denied'
        ? copy.denied
        : view === 'error'
          ? copy.error
          : copy.body;

  return (
    <aside class="push-optin" aria-live="polite" data-push-optin data-push-context={context}>
      <div class="push-optin__copy">
        {view !== 'subscribed' && <strong>{copy.heading}</strong>}
        <span>{message}</span>
      </div>
      <div class="push-optin__actions">
        {(view === 'offer' || view === 'busy') && (
          <button class="btn btn--ghost" type="button" onClick={subscribe} disabled={view === 'busy'}>
            {view === 'busy' ? copy.installing : copy.accept}
          </button>
        )}
        {view === 'subscribed' && (
          <button class="btn btn--ghost" type="button" onClick={unsubscribe}>{copy.off}</button>
        )}
        {view !== 'subscribed' && view !== 'busy' && (
          <button class="push-optin__dismiss" type="button" onClick={dismiss} aria-label={copy.dismissLabel}>
            {copy.dismiss}
          </button>
        )}
      </div>
    </aside>
  );
}
