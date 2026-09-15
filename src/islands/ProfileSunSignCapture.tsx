import { useEffect, useState } from 'preact/hooks';
import { loadProfileSunSign, setProfileSunSign } from '../lib/profile/store';
import { loadProfile } from '../lib/profile/read-store';
import { SIGNS, type Sign } from '../lib/signs';

export function profileSunSignFromSearch(search: string): Sign | null {
  const slug = new URLSearchParams(search).get('sun');
  return SIGNS.find((sign) => sign.slug === slug) ?? null;
}

export function profileSunSignFromStored(slug: string | null): Sign | null {
  return SIGNS.find((sign) => sign.slug === slug) ?? null;
}

export default function ProfileSunSignCapture() {
  const [sign, setSign] = useState<Sign | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasCharts, setHasCharts] = useState(false);

  useEffect(() => {
    let requested = profileSunSignFromSearch(window.location.search);

    const sync = (): void => {
      setHasCharts(loadProfile().charts.length > 0);
      if (requested) {
        setSign(requested);
        if (loadProfileSunSign() !== requested.slug && !setProfileSunSign(requested.slug)) return;
        setSaved(true);
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        requested = null;
        return;
      }

      const stored = profileSunSignFromStored(loadProfileSunSign());
      setSign(stored);
      setSaved(stored !== null);
    };

    sync();
    window.addEventListener('zodiacs:profile-access', sync);
    window.addEventListener('zodiacs:profile', sync);
    return () => {
      window.removeEventListener('zodiacs:profile-access', sync);
      window.removeEventListener('zodiacs:profile', sync);
    };
  }, []);

  if (!sign || !saved) return null;

  // A quick-read preference is not a chart. Once a birth chart is saved it
  // decides Today; say so instead of repeating the first-visit invitation.
  return (
    <aside class="pf-sun-sign shell tinted" style={`--sign:${sign.hue}`} role="status" data-sun-sign-preference={hasCharts ? 'secondary' : 'primary'}>
      <div class="core tinted pf-sun-sign__core">
        <em class="kicker">{hasCharts ? 'Quick-read Sun sign' : 'Sun sign saved'}</em>
        <strong>{sign.name} · {hasCharts ? 'a preference on this device, not a chart' : 'added · on this device'}</strong>
        <p>{hasCharts
          ? 'Today reads from the birth chart marked as yours; this Sun sign is only used when no chart is marked as yours.'
          : 'Add your birth time and place when you want your Moon, rising sign, and the rest of the chart.'}</p>
        {!hasCharts && (
          <a class="btn btn--ghost" href="/birth-chart/">
            <span>Get your free birth chart</span><span class="orb" aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </aside>
  );
}
