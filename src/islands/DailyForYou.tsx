/**
 * "For your chart" — the day's sky pressed against the visitor's saved
 * natal chart. Pure arithmetic: natal longitudes come from the stored
 * summary, transiting longitudes from the committed daily JSON, aspects
 * from the synastry math. The ephemeris never loads; visitors without a
 * saved chart see nothing at all.
 */
import { useEffect, useState } from 'preact/hooks';
import { loadProfile } from '../lib/profile/store';
import type { SavedChart } from '../lib/profile/schema';
import { findInterAspects } from '../lib/engine/synastry';
import { TRANSIT_ORB, transitLine } from '../lib/transits';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import daily from '../data/daily.json';

interface Props { sign?: string; locale?: Locale }

/** The transit-worthy movers; the natal side keeps every stored body. */
const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

export default function DailyForYou({ locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const [chart, setChart] = useState<SavedChart | null>(null);

  useEffect(() => {
    const pick = () => {
      const p = loadProfile();
      setChart([...p.charts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null);
    };
    pick();
    window.addEventListener('zodiacs:profile', pick);
    return () => window.removeEventListener('zodiacs:profile', pick);
  }, []);

  if (!chart) return null;

  const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
  const sky = daily.bodies
    .filter((b) => MOVERS.has(b.body))
    .map(({ body, lon }) => ({ body, lon }));

  const hits = findInterAspects(sky, natal)
    .filter((a) => a.orb <= TRANSIT_ORB)
    .sort((x, y) => x.orb - y.orb)
    .slice(0, 3);

  if (hits.length === 0) return null;

  const handle = chart.name.split('·')[0].trim() || chart.name;

  return (
    <section class="dfy" aria-label={t(locale, 'forYourChart')}>
      <div class="dfy__head">
        <h2>{t(locale, 'forYourChart')}</h2>
        <span class="mono dfy__stamp">{handle} · {daily.date}</span>
      </div>
      <ul class="dfy__lines">
        {hits.map((a) => (
          <li key={`${a.a}-${a.b}-${a.type}`}>
            <p>{transitLine(a.a, a.type, a.b)}</p>
            <span class="mono dfy__receipt">
              {a.a} {a.type} {t(locale, 'natal')} {a.b} · {t(locale, 'orb')} {a.orb.toFixed(1)}°
            </span>
          </li>
        ))}
      </ul>
      <a class="dfy__more" href={localizePath(locale, '/transits/')}>{t(locale, 'allTransits')} →</a>
    </section>
  );
}
