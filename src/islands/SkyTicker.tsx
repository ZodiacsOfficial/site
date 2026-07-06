/**
 * The proof strip: live sky facts, one quiet mono line.
 * Sun/Moon from the lite math; retrogrades + next lunation from the
 * build-time sky data — the ephemeris never loads here.
 */
import { useMemo } from 'preact/hooks';
import { formatLongitude, signForLongitude, signName } from '../lib/signs';
import { moonLongitude, sunLongitude } from '../lib/engine/lite';
import sky from '../data/sky.json';
import { normalizeLocale, t, type Locale } from '../lib/i18n';

export default function SkyTicker({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const items = useMemo(() => {
    const now = new Date();
    const nowIso = now.toISOString();
    const out: string[] = [];

    out.push(`${t(locale, 'sun')} ${formatLongitude(sunLongitude(now), locale)}`);
    out.push(`${t(locale, 'moonIn')} ${signName(signForLongitude(moonLongitude(now)), locale)}`);

    const active = (sky.retrogrades as { planet: string; from: string; to: string | null }[])
      .filter((r) => r.from <= nowIso && (r.to === null || r.to > nowIso))
      .map((r) => r.planet);
    out.push(active.includes('Mercury')
      ? (locale === 'es' ? 'Mercurio retrógrado' : 'Mercury retrograde')
      : (locale === 'es' ? 'Mercurio directo' : 'Mercury direct'));
    for (const planet of active) {
      if (planet !== 'Mercury') out.push(locale === 'es' ? `${planet} retrógrado` : `${planet} retrograde`);
    }

    const nextMoon = (sky.moons as { type: string; at: string }[]).find((m) => m.at > nowIso);
    if (nextMoon) {
      const days = Math.round((new Date(nextMoon.at).getTime() - now.getTime()) / 86400_000);
      const label = nextMoon.type === 'full'
        ? (locale === 'es' ? 'Luna llena' : 'Full moon')
        : (locale === 'es' ? 'Luna nueva' : 'New moon');
      out.push(days <= 0
        ? (locale === 'es' ? `${label} esta noche` : `${label} tonight`)
        : days === 1
          ? (locale === 'es' ? `${label} mañana` : `${label} tomorrow`)
          : (locale === 'es' ? `${label} en ${days} días` : `${label} in ${days} days`));
    }

    return out;
  }, [locale]);

  return (
    <p class="skyticker mono" aria-label={locale === 'es' ? 'Condiciones actuales del cielo, calculadas en vivo' : 'Current sky conditions, computed live'}>
      <span class="skyticker__label">{t(locale, 'rightNow')}</span>
      {items.map((item, i) => (
        <span key={item}>
          {i > 0 && <span class="skyticker__sep" aria-hidden="true">·</span>}
          <span class="skyticker__item">{item}</span>
        </span>
      ))}
    </p>
  );
}
