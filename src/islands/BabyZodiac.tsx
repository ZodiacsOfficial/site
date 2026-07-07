/**
 * Due-date sky reader: what a birth around a given date would carry.
 * Honest by construction — the Sun is nearly certain (with cusp caveats
 * computed, not hand-waved), the Moon is listed as the week's spans
 * because it changes signs every two or three days, and the rising sign
 * is named as unknowable before the birth minute. Engine loads lazily
 * on first compute (bundle rule: only full.ts touches the ephemeris).
 */
import { useState } from 'preact/hooks';
import { signBySlug, signForLongitude, type Sign } from '../lib/signs';
import { birthdaySlug } from '../lib/birthdays';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import sky from '../data/sky.json';

interface Props { locale?: Locale }

let enginePromise: Promise<typeof import('../lib/engine/full')> | null = null;
const loadEngine = () => (enginePromise ??= import('../lib/engine/full'));

interface MoonSpan { fromISO: string; toISO: string; sign: Sign }

interface Reading {
  dueISO: string;
  sun: { kind: 'single'; sign: Sign; nearEdge: Sign | null } | { kind: 'split'; a: Sign; b: Sign };
  moonSpans: MoonSpan[];
  retro: string[];
  birthdayHref: string;
}

const DAY = 86400_000;

function fmtDay(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export default function BabyZodiac({ locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);

  const compute = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setReading(null);
    if (!due) {
      setError(t(locale, 'babyNeedDate'));
      return;
    }
    const noon = new Date(`${due}T12:00:00Z`);
    if (Number.isNaN(noon.getTime())) {
      setError(t(locale, 'babyNeedDate'));
      return;
    }
    setBusy(true);
    try {
      const { bodyLongitude } = await loadEngine();

      // Sun: split-day check via the day's two ends, then a near-edge note.
      const dayStart = new Date(`${due}T00:00:00Z`);
      const s0 = signForLongitude(bodyLongitude('Sun', dayStart));
      const s1 = signForLongitude(bodyLongitude('Sun', new Date(dayStart.getTime() + DAY - 1000)));
      let sun: Reading['sun'];
      if (s0.slug !== s1.slug) {
        sun = { kind: 'split', a: s0, b: s1 };
      } else {
        const lon = bodyLongitude('Sun', noon);
        const inSign = ((lon % 360) + 360) % 360 % 30;
        // Within ~a degree of an edge, one day's drift crosses the line.
        const nearEdge =
          inSign < 1 ? signForLongitude(lon - 2) : inSign > 29 ? signForLongitude(lon + 2) : null;
        sun = { kind: 'single', sign: s0, nearEdge };
      }

      // Moon: noon sign for due-3 … due+3, compressed into spans.
      const spans: MoonSpan[] = [];
      for (let d = -3; d <= 3; d += 1) {
        const at = new Date(noon.getTime() + d * DAY);
        const sign = signForLongitude(bodyLongitude('Moon', at));
        const last = spans[spans.length - 1];
        if (last && last.sign.slug === sign.slug) {
          last.toISO = at.toISOString();
        } else {
          spans.push({ fromISO: at.toISOString(), toISO: at.toISOString(), sign });
        }
      }

      // Retrogrades active on the due date, from the committed windows.
      const retro = (sky.retrogrades as { planet: string; from: string; to: string | null }[])
        .filter((w) => new Date(w.from) <= noon && (w.to === null || new Date(w.to) >= noon))
        .map((w) => w.planet);

      const m = noon.getUTCMonth() + 1;
      const day = noon.getUTCDate();
      setReading({
        dueISO: noon.toISOString(),
        sun,
        moonSpans: spans,
        retro,
        birthdayHref: `/birthday/${birthdaySlug(m, day)}/`,
      });
    } catch {
      setError(t(locale, 'babyError'));
    }
    setBusy(false);
  };

  return (
    <div class="calc">
      <form class="calc__form" onSubmit={compute}>
        <div class="calc__grid">
          <label class="field">
            <span class="field__label mono">{t(locale, 'babyDueDate')}</span>
            <input
              class="field__input"
              type="date"
              value={due}
              min="1990-01-01"
              max="2028-12-31"
              onInput={(e) => setDue((e.target as HTMLInputElement).value)}
              onFocus={() => { void loadEngine(); }}
              required
            />
          </label>
        </div>
        <div class="calc__actions">
          <button class="btn btn--primary" type="submit" disabled={busy}>
            <span>{busy ? t(locale, 'computing') : t(locale, 'babyCompute')}</span>
            <span class="orb">{busy ? '…' : '→'}</span>
          </button>
        </div>
        {error && <p class="calc__error" role="alert">{error}</p>}
      </form>

      {reading && (
        <div class="calc__result" role="status">
          <div class="baby-block">
            <h3>{t(locale, 'babySunHead')}</h3>
            {reading.sun.kind === 'single' ? (
              <>
                <p>
                  {t(locale, 'babySunSingle')} <strong>{reading.sun.sign.name}</strong>.
                  {reading.sun.nearEdge && (
                    <> {t(locale, 'babySunNearEdge')} {reading.sun.nearEdge.name} {t(locale, 'babySunNearEdgeTail')}</>
                  )}
                </p>
                <span class="mono baby-receipt">
                  {fmtDay(reading.dueISO, locale)} · {t(locale, 'babyNoonNote')}
                </span>
              </>
            ) : (
              <>
                <p>
                  {t(locale, 'babySunSplitA')} <strong>{reading.sun.a.name}</strong> {t(locale, 'babySunSplitOr')}{' '}
                  <strong>{reading.sun.b.name}</strong> {t(locale, 'babySunSplitTail')}
                </p>
                <span class="mono baby-receipt">
                  {fmtDay(reading.dueISO, locale)} · {reading.sun.a.name} → {reading.sun.b.name}
                </span>
              </>
            )}
          </div>

          <div class="baby-block">
            <h3>{t(locale, 'babyMoonHead')}</h3>
            <p>{t(locale, 'babyMoonBody')}</p>
            <ul class="baby-spans">
              {reading.moonSpans.map((s) => (
                <li key={s.fromISO}>
                  <span class="mono baby-receipt">
                    {fmtDay(s.fromISO, locale)}
                    {s.toISO !== s.fromISO && <> – {fmtDay(s.toISO, locale)}</>}
                  </span>
                  <span>{t(locale, 'moonIn')} {s.sign.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {reading.retro.length > 0 && (
            <div class="baby-block">
              <h3>{t(locale, 'babyRetroHead')}</h3>
              <p>
                {reading.retro.join(' · ')} — {t(locale, 'babyRetroBody')}
              </p>
            </div>
          )}

          <div class="baby-block">
            <h3>{t(locale, 'babyRisingHead')}</h3>
            <p>{t(locale, 'babyRisingBody')}</p>
          </div>

          <div class="calc__actions">
            <a class="btn btn--ghost" href={reading.birthdayHref}>
              <span>{t(locale, 'babyDateLink')}</span><span class="orb">→</span>
            </a>
            <a class="btn btn--primary" href={localizePath(locale, '/birth-chart/')}>
              <span>{t(locale, 'babyChartLink')}</span><span class="orb">↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
