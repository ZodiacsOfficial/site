/**
 * "For your chart" — the day's sky pressed against the visitor's saved
 * natal chart. Pure arithmetic: natal longitudes come from the stored
 * summary, transiting longitudes from the committed daily JSON, aspects
 * from the synastry math. The ephemeris never loads; visitors without a
 * saved chart see nothing at all.
 */
import { useProfile } from '../lib/hooks/useProfile';
import { findInterAspects } from '../lib/engine/synastry';
import { TRANSIT_ORB, transitLine } from '../lib/transits';
import PlanetGlyph from '../components/PlanetGlyph';
import { signBySlug, signForLongitude } from '../lib/signs';
import { localizePath, normalizeLocale, t, type Locale } from '../lib/i18n';
import daily from '../data/daily.json';

/** Each transiting body's current-sign hue, for the leading receipt glyph. */
const SKY_HUE: Record<string, string> = Object.fromEntries(
  daily.bodies.map((b) => [b.body, signBySlug(b.sign).hue]),
);

interface Props { sign?: string; locale?: Locale }

/** The transit-worthy movers; the natal side keeps every stored body. */
const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

export default function DailyForYou({ sign, locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const { profile } = useProfile();
  const chart = [...profile.charts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((candidate) => {
      if (!sign) return true;
      const sun = candidate.summary.bodies.find((body) => body.body === 'Sun');
      return sun != null && signForLongitude(sun.lon).slug === sign;
    }) ?? null;

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
              <PlanetGlyph body={a.a} hue={SKY_HUE[a.a]} size={13} class="rcpt-glyph" />
              {a.a} {a.type} {t(locale, 'natal')} {a.b} · {t(locale, 'orb')} {a.orb.toFixed(1)}°
            </span>
          </li>
        ))}
      </ul>
      <a class="dfy__more" href={localizePath(locale, '/transits/')}>{t(locale, 'allTransits')} →</a>
    </section>
  );
}
