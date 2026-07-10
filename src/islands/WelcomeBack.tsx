/**
 * The returning-visitor strip. If this device holds saved charts, the
 * homepage acknowledges it — one quiet row, no fanfare. First-time
 * visitors get nothing at all: the section only exists after mount,
 * and only when a profile does.
 */
import SignChip from './SignChip';
import { useProfile } from '../lib/hooks/useProfile';
import { encodeChartLink } from '../lib/share';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';

export default function WelcomeBack({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const { profile } = useProfile();
  const chart = [...profile.charts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  const count = profile.charts.length;

  if (!chart) return null;

  const find = (name: string) => chart.summary.bodies.find((b) => b.body === name);
  const sun = find('Sun');
  const moon = find('Moon');
  const asc = chart.summary.angles?.asc ?? null;

  // Reopen the saved chart straight in the calculator (needs coordinates to
  // reconstruct; charts saved without a place fall back to the profile list).
  const openHref = chart.birth.place
    ? `${localizePath(locale, '/birth-chart/')}#c=${encodeChartLink({
        date: chart.birth.date,
        time: chart.birth.time,
        timeKnown: chart.birth.timeKnown,
        lat: chart.birth.place.lat,
        lon: chart.birth.place.lon,
        tz: chart.birth.place.tz,
        name: chart.name,
        place: chart.birth.place.name,
        houseSystem: chart.summary.houseSystem,
      })}`
    : localizePath(locale, '/profile/');

  return (
    <section class="container" aria-label={t(locale, 'savedChartAria')}>
      <div class="wb">
        <p class="wb__lead">{t(locale, 'welcomeBack')}</p>
        <dl class="wb__three">
          {sun && <><dt class="mono--label">{t(locale, 'sun')}</dt><dd><SignChip lon={sun.lon} locale={locale} /></dd></>}
          {moon && <><dt class="mono--label">{t(locale, 'moon')}</dt><dd><SignChip lon={moon.lon} locale={locale} /></dd></>}
          {asc !== null && <><dt class="mono--label">{t(locale, 'rising')}</dt><dd><SignChip lon={asc} locale={locale} /></dd></>}
        </dl>
        <div class="wb__links">
          <a class="wb__open btn btn--primary" href={openHref}><span>{t(locale, 'openChart')}</span><span class="orb">↗</span></a>
          <div class="wb__sublinks">
            <a href={localizePath(locale, '/transits/')}>{t(locale, 'todayAgainstChart')} →</a>
            <a href={localizePath(locale, '/profile/')}>{count > 1 ? `${t(locale, 'yourCharts')} (${count}) →` : `${t(locale, 'profile')} →`}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
