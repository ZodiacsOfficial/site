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
import { PUSH_CAP_EN, PUSH_COPY, PUSH_REOFFER_EN } from '../strings/push';
import '../styles/push.css';

interface Props {
  locale?: Locale;
  context?: 'chart-save' | 'today-return';
}

type View = 'hidden' | 'offer' | 'reoffer' | 'ios-install' | 'busy' | 'subscribed' | 'denied' | 'error';
const WEB_PUSH_ENABLED = import.meta.env.PUBLIC_WEB_PUSH_ENABLED === '1';

function track(name: 'push_prompt' | 'push_subscribe'): void {
  (window as Window & {
    zodiacsAnalytics?: { track?: (event: string, props: Record<string, never>) => void };
  }).zodiacsAnalytics?.track?.(name, {});
}

function supported(): boolean {
  return WEB_PUSH_ENABLED
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager.getSubscription() ?? null;
}

export default function PushOptIn({ locale = 'en', context = 'chart-save' }: Props) {
  const copy = PUSH_COPY[locale];
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
        setView('reoffer');
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
          : view === 'reoffer' && locale === 'en'
            ? PUSH_REOFFER_EN
            : copy.body;

  return (
    <aside class="push-optin" aria-live="polite" data-push-optin data-push-context={context}>
      <div class="push-optin__copy">
        {view !== 'subscribed' && <strong>{copy.heading}</strong>}
        <span>{message}</span>
        {locale === 'en' && (view === 'offer' || view === 'reoffer' || view === 'subscribed') && (
          <small>{PUSH_CAP_EN}</small>
        )}
      </div>
      <div class="push-optin__actions">
        {(view === 'offer' || view === 'reoffer' || view === 'busy') && (
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
