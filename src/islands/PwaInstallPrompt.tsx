import { useEffect, useRef, useState } from 'preact/hooks';
import { SIGNS } from '../lib/signs';
import {
  dismissPwaInstall,
  isStandalonePwa,
  pwaInstallDismissed,
  recordChartComputation,
} from '../lib/pwa-install';
import { normalizeLocale, type Locale } from '../lib/i18n';
import { pwaText } from '../strings/pwa';
import { a2hsPlatform } from '../lib/a2hs';
import '../styles/pwa-install.css';

interface DeferredInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    zodiacsInstallPrompt?: DeferredInstallPrompt;
  }
}

interface PwaInstallPromptProps {
  locale?: Locale;
  computationCount: number;
}

export default function PwaInstallPrompt({ locale: rawLocale = 'en', computationCount }: PwaInstallPromptProps) {
  const locale = normalizeLocale(rawLocale);
  const [eligible, setEligible] = useState(false);
  const [installEvent, setInstallEvent] = useState<DeferredInstallPrompt | null>(null);
  const recordedComputation = useRef(0);
  const isIos = typeof navigator !== 'undefined'
    && a2hsPlatform(navigator.userAgent) === 'ios';

  useEffect(() => {
    if (isStandalonePwa(navigator as Navigator & { standalone?: boolean }, window.matchMedia.bind(window))
      || pwaInstallDismissed(localStorage)) return;
    setInstallEvent(window.zodiacsInstallPrompt ?? null);
    const onReady = () => setInstallEvent(window.zodiacsInstallPrompt ?? null);
    const onInstalled = () => {
      dismissPwaInstall(localStorage);
      setEligible(false);
    };
    window.addEventListener('zodiacs:install-prompt-ready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('zodiacs:install-prompt-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (computationCount <= recordedComputation.current) return;
    recordedComputation.current = computationCount;
    if (isStandalonePwa(navigator as Navigator & { standalone?: boolean }, window.matchMedia.bind(window))
      || pwaInstallDismissed(localStorage)) return;
    if (recordChartComputation(localStorage)) setEligible(true);
  }, [computationCount]);

  function dismiss(): void {
    dismissPwaInstall(localStorage);
    setEligible(false);
  }

  async function install(): Promise<void> {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    // The directive treats either browser-sheet choice as final: dismissal is
    // never converted into a nag on the next chart.
    dismiss();
    if (choice.outcome === 'accepted') window.zodiacsInstallPrompt = undefined;
  }

  if (!eligible || (!installEvent && !isIos)) return null;

  return (
    <aside class="pwa-install notice" aria-live="polite" data-pwa-install>
      <div class="pwa-install__icons" role="img" aria-label={pwaText(locale, 'icons')}>
        {SIGNS.map((sign) => (
          <img
            src={`/assets/zodiac-icons/48/${sign.slug}.webp`}
            alt=""
            width="28"
            height="28"
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
      <div class="pwa-install__copy">
        <strong>{pwaText(locale, 'heading')}</strong>
        <span>{isIos && !installEvent ? pwaText(locale, 'ios') : pwaText(locale, 'body')}</span>
      </div>
      <div class="pwa-install__actions">
        {installEvent && (
          <button class="btn btn--ghost" type="button" onClick={install}>{pwaText(locale, 'install')}</button>
        )}
        <button class="pwa-install__dismiss" type="button" onClick={dismiss}>{pwaText(locale, 'dismiss')}</button>
      </div>
    </aside>
  );
}
