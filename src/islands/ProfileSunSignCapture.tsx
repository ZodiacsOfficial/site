import { useEffect, useState } from 'preact/hooks';
import { loadProfileSunSign, setProfileSunSign } from '../lib/profile/store';
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

  useEffect(() => {
    let requested = profileSunSignFromSearch(window.location.search);

    const sync = (): void => {
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
    return () => window.removeEventListener('zodiacs:profile-access', sync);
  }, []);

  if (!sign || !saved) return null;

  return (
    <aside class="pf-sun-sign shell tinted" style={`--sign:${sign.hue}`} role="status">
      <div class="core tinted pf-sun-sign__core">
        <em class="kicker">Sun sign saved</em>
        <strong>{sign.name} added · on this device</strong>
        <p>Add your birth time and place when you want your Moon, rising sign, and the rest of the chart.</p>
        <a class="btn btn--ghost" href="/birth-chart/">
          <span>Get your free birth chart</span><span class="orb" aria-hidden="true">→</span>
        </a>
      </div>
    </aside>
  );
}
