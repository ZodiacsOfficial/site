/**
 * Once a chart is marked as yours, one quiet note on how to get back here
 * in a tap: install the site where the browser offers it, add it to the
 * Home Screen on iPhone and iPad, or bookmark it — plus the short address,
 * zodiacs.org/me. It never shows inside the installed app, and hiding it
 * is remembered on this device.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useProfile } from '../lib/hooks/useProfile';
import { useMe } from '../lib/hooks/useMe';
import { explicitSelfChart } from '../lib/profile/read-store';
import { saveMe } from '../lib/profile/me';
import { a2hsPlatform } from '../lib/a2hs';
import { isStandalonePwa } from '../lib/pwa-install';
import { useProfileSurface } from '../lib/profile/surface-gate';

interface DeferredInstall extends Event {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Route = 'install' | 'ios' | 'android' | 'desktop-mac' | 'desktop';

export const SHORT_ADDRESS = 'zodiacs.org/me';

/** Which instruction fits this browser. User-agent routing only picks the copy. */
export function keepCloseRoute(userAgent: string, canInstall: boolean): Route {
  if (canInstall) return 'install';
  const platform = a2hsPlatform(userAgent);
  if (platform) return platform;
  return /\bMac OS X\b|\bMacintosh\b/u.test(userAgent) ? 'desktop-mac' : 'desktop';
}

const INSTRUCTION: Record<Route, string> = {
  install: 'Add Zodiacs to this device so it opens like an app, or bookmark this page.',
  ios: 'On iPhone or iPad, tap Share, then Add to Home Screen.',
  android: 'In Chrome’s menu, tap Add to Home screen.',
  'desktop-mac': 'Press ⌘D to bookmark it.',
  desktop: 'Press Ctrl+D to bookmark it.',
};

function installPrompt(): DeferredInstall | null {
  const event = Reflect.get(window, 'zodiacsInstallPrompt') as DeferredInstall | undefined;
  return event && typeof event.prompt === 'function' ? event : null;
}

export default function ProfileKeepClose({ accountBound = false }: { accountBound?: boolean }) {
  const { profile, ready: profileReady } = useProfile();
  const ready = useProfileSurface(accountBound) && profileReady;
  const me = useMe();
  const self = useMemo(() => explicitSelfChart(profile.charts), [profile.charts]);
  const [route, setRoute] = useState<Route | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const update = () => {
      setStandalone(isStandalonePwa(navigator, window.matchMedia.bind(window)));
      setRoute(keepCloseRoute(navigator.userAgent, installPrompt() !== null));
    };
    update();
    window.addEventListener('zodiacs:install-prompt-ready', update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener('zodiacs:install-prompt-ready', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  if (!ready || !self || standalone || !route || hidden || me.keepCloseDismissed) return null;

  async function install() {
    const event = installPrompt();
    if (!event) return;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      // The browser's install sheet answers once; either way the offer is spent.
      Reflect.set(window, 'zodiacsInstallPrompt', undefined);
      if (choice?.outcome === 'accepted') setHidden(true);
      else setRoute(keepCloseRoute(navigator.userAgent, false));
    } catch {
      setRoute(keepCloseRoute(navigator.userAgent, false));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${SHORT_ADDRESS}`);
      setCopied('copied');
    } catch {
      setCopied('manual');
    }
  }

  function dismiss() {
    setHidden(true);
    saveMe({ keepCloseDismissed: true });
  }

  return (
    <aside class="pf-keep" aria-labelledby="pf-keep-title" data-keep-close={route}>
      <div class="pf-keep__text">
        <h2 id="pf-keep-title">Keep your page one tap away</h2>
        <p>{INSTRUCTION[route]}</p>
        <p class="pf-keep__address">
          Or remember the short address, <strong>{SHORT_ADDRESS}</strong>. Your charts are kept in this
          browser, so come back in this one.
        </p>
        {copied === 'manual' && (
          <input
            class="field__input calc__share-url"
            type="text"
            readOnly
            value={`https://${SHORT_ADDRESS}`}
            aria-label="Short address for your page"
            onFocus={(event) => (event.currentTarget as HTMLInputElement).select()}
          />
        )}
      </div>
      <div class="pf-keep__actions">
        {route === 'install' && (
          <button class="btn btn--glass" type="button" onClick={install}>
            <span>Add to this device</span><span class="orb" aria-hidden="true">↓</span>
          </button>
        )}
        <button class="btn btn--ghost" type="button" onClick={copy}>
          {copied === 'copied' ? 'Address copied' : 'Copy address'}
        </button>
        <button class="pf-me__text-action" type="button" onClick={dismiss}>Hide this</button>
      </div>
      <p class="sr-only" role="status">{copied === 'copied' ? 'Address copied' : ''}</p>
    </aside>
  );
}
