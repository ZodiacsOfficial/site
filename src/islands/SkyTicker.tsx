/**
 * The proof strip: live sky facts, one quiet mono line — now with a small
 * celestial glyph per fact so it reads as an almanac row, not flat text.
 * Sun/Moon from the lite math; retrogrades + next lunation from the
 * build-time sky data — the ephemeris never loads here.
 */
import { useMemo } from 'preact/hooks';
import { formatLongitude, signForLongitude, signName } from '../lib/signs';
import { moonLongitude, sunLongitude } from '../lib/engine/lite';
import sky from '../data/sky.json';
import { normalizeLocale, t, tf, type Locale } from '../lib/i18n';
import { planetLabel } from '../lib/i18n/astrology';

type IconKind = 'sun' | 'moon' | 'retro' | 'direct' | 'newMoon' | 'fullMoon';
interface Item { kind: IconKind; text: string; hue?: string }

/** Small line-art sky glyphs, drawn at ~13px. Stroke presentation is set in
 * CSS (.skyticker__icon svg); the two filled glyphs flip to fill via style. */
const FILLED = 'fill:currentColor;stroke:none';
function TickerIcon({ kind }: { kind: IconKind }) {
  switch (kind) {
    case 'sun':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.9" />
          <path d="M12 2.2v2.1M12 19.7v2.1M4.3 4.3l1.5 1.5M18.2 18.2l1.5 1.5M2.2 12h2.1M19.7 12h2.1M4.3 19.7l1.5-1.5M18.2 5.8l1.5-1.5" />
        </svg>
      );
    case 'moon':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={FILLED}>
          <path d="M20.5 14.3A8.6 8.6 0 1 1 9.7 3.5a6.7 6.7 0 0 0 10.8 10.8Z" />
        </svg>
      );
    case 'retro': // apparent backward motion — a counter-clockwise turn
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 2.6-6.3L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case 'direct':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.6-6.3L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      );
    case 'newMoon':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" />
        </svg>
      );
    case 'fullMoon':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={FILLED}>
          <circle cx="12" cy="12" r="8.2" />
        </svg>
      );
  }
}

export default function SkyTicker({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const items = useMemo<Item[]>(() => {
    const now = new Date();
    const nowIso = now.toISOString();
    const out: Item[] = [];

    const sunLon = sunLongitude(now);
    const moonSign = signForLongitude(moonLongitude(now));
    out.push({ kind: 'sun', text: `${t(locale, 'sun')} ${formatLongitude(sunLon, locale)}`, hue: signForLongitude(sunLon).hue });
    out.push({ kind: 'moon', text: `${t(locale, 'moonIn')} ${signName(moonSign, locale)}`, hue: moonSign.hue });

    const active = (sky.retrogrades as { planet: string; from: string; to: string | null }[])
      .filter((r) => r.from <= nowIso && (r.to === null || r.to > nowIso))
      .map((r) => r.planet);
    out.push(active.includes('Mercury')
      ? { kind: 'retro', text: t(locale, 'skyMercuryRetrograde') }
      : { kind: 'direct', text: t(locale, 'skyMercuryDirect') });
    for (const planet of active) {
      if (planet !== 'Mercury') {
        out.push({
          kind: 'retro',
          text: tf(locale, 'skyPlanetRetrograde', { planet: planetLabel(locale, planet) }),
        });
      }
    }

    const nextMoon = (sky.moons as { type: string; at: string }[]).find((m) => m.at > nowIso);
    if (nextMoon) {
      const days = Math.round((new Date(nextMoon.at).getTime() - now.getTime()) / 86400_000);
      const full = nextMoon.type === 'full';
      const label = full
        ? t(locale, 'skyFullMoon')
        : t(locale, 'skyNewMoon');
      const text = days <= 0
        ? tf(locale, 'skyTonight', { event: label })
        : days === 1
          ? tf(locale, 'skyTomorrow', { event: label })
          : tf(locale, 'skyInDays', { event: label, days });
      out.push({ kind: full ? 'fullMoon' : 'newMoon', text });
    }

    return out;
  }, [locale]);

  return (
    <p class="skyticker mono" aria-label={t(locale, 'skyTickerAria')}>
      <span class="skyticker__label">{t(locale, 'rightNow')}</span>
      {items.map((item) => (
        <span class="skyticker__item" key={item.text}>
          <span class="skyticker__icon" style={item.hue ? `color:${item.hue}` : undefined}>
            <TickerIcon kind={item.kind} />
          </span>
          <span>{item.text}</span>
        </span>
      ))}
    </p>
  );
}
