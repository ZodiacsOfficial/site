/**
 * The returning-visitor strip. If this device holds saved charts, the
 * homepage acknowledges it — one quiet row, no fanfare. First-time
 * visitors get nothing at all: the section only exists after mount,
 * and only when a profile does.
 */
import { useEffect, useState } from 'preact/hooks';
import SignChip from './SignChip';
import { loadProfile } from '../lib/profile/store';
import type { SavedChart } from '../lib/profile/schema';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';

export default function WelcomeBack({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const [chart, setChart] = useState<SavedChart | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const pick = () => {
      const p = loadProfile();
      const latest = [...p.charts]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
      setChart(latest);
      setCount(p.charts.length);
    };
    pick();
    window.addEventListener('zodiacs:profile', pick);
    return () => window.removeEventListener('zodiacs:profile', pick);
  }, []);

  if (!chart) return null;

  const find = (name: string) => chart.summary.bodies.find((b) => b.body === name);
  const sun = find('Sun');
  const moon = find('Moon');
  const asc = chart.summary.angles?.asc ?? null;

  return (
    <section class="container" aria-label={t(locale, 'savedChartAria')}>
      <div class="wb">
        <p class="wb__lead">{t(locale, 'welcomeBack')}</p>
        <div class="wb__chips">
          {sun && <span class="wb__chip"><span class="mono--label">{t(locale, 'sun')}</span><SignChip lon={sun.lon} locale={locale} /></span>}
          {moon && <span class="wb__chip"><span class="mono--label">{t(locale, 'moon')}</span><SignChip lon={moon.lon} locale={locale} /></span>}
          {asc !== null && <span class="wb__chip"><span class="mono--label">{t(locale, 'rising')}</span><SignChip lon={asc} locale={locale} /></span>}
        </div>
        <div class="wb__links">
          <a href={localizePath(locale, '/transits/')}>{t(locale, 'todayAgainstChart')} →</a>
          <a href={localizePath(locale, '/profile/')}>{count > 1 ? `${t(locale, 'yourCharts')} (${count}) →` : `${t(locale, 'profile')} →`}</a>
        </div>
      </div>
    </section>
  );
}
