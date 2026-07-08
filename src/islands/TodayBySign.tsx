/**
 * Zero-input value on the homepage: tap your sun sign, get today's sky
 * read from its solar houses — the same computed lines the horoscope
 * pages carry, one tap and no birth time. Pure over the committed daily
 * JSON; the ephemeris never loads here (homepage bundle rule).
 */
import { useState } from 'preact/hooks';
import { SIGNS } from '../lib/signs';
import { dailyReading, type Daily } from '../lib/daily';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import daily from '../data/daily.json';

interface Props { locale?: Locale }

export default function TodayBySign({ locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const [sel, setSel] = useState<string | null>(null);
  const reading = sel ? dailyReading(sel, daily as Daily) : null;
  const active = sel ? SIGNS.find((s) => s.slug === sel)! : null;

  return (
    <section class="tbs" aria-label={t(locale, 'todayBySignTitle')}>
      <div class="tbs__head">
        <h2>{t(locale, 'todayBySignTitle')}</h2>
        <span class="mono tbs__stamp">{daily.date} · {daily.moon.phase}</span>
      </div>

      <div class="tbs__signs" role="tablist" aria-label={t(locale, 'todayBySignTitle')}>
        {SIGNS.map((s) => (
          <button
            key={s.slug}
            type="button"
            role="tab"
            aria-selected={sel === s.slug}
            class={`tbs__sign${sel === s.slug ? ' tbs__sign--on' : ''}`}
            style={`--sign:${s.hue}`}
            onClick={() => setSel((cur) => (cur === s.slug ? null : s.slug))}
          >
            <picture class="tbs__icon">
              <source srcset={`/assets/zodiac-icons/48/${s.slug}.avif`} type="image/avif" />
              <img src={`/assets/zodiac-icons/48/${s.slug}.webp`} width="30" height="30" alt="" loading="lazy" decoding="async" />
            </picture>
            <span class="tbs__name">{s.name}</span>
          </button>
        ))}
      </div>

      {reading && active ? (
        <div class="tbs__read" style={`--sign:${active.hue}`} role="tabpanel" aria-live="polite">
          <div class="tbs__read-head">
            <strong>{active.name} · {t(locale, 'today')}</strong>
            <span class="mono tbs__read-stamp">{t(locale, 'todaySolarNote')}</span>
          </div>
          <ul class="tbs__lines">
            {reading.lines.map((l) => (
              <li key={l.receipt}>
                <p>{l.text}</p>
                <span class="mono tbs__receipt">{l.receipt}</span>
              </li>
            ))}
          </ul>
          <a class="tbs__more" href={localizePath(locale, `/horoscopes/${active.slug}/`)}>
            {active.name} {t(locale, 'todayHoroscopeLink')} →
          </a>
        </div>
      ) : (
        <p class="tbs__prompt">{t(locale, 'todayBySignPrompt')}</p>
      )}
    </section>
  );
}
