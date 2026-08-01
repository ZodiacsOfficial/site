/**
 * The daily layer of /profile/: today's sky pressed against one saved
 * chart, plus the chart's next twelve months. Transits are pure
 * arithmetic over committed data (no ephemeris); the year scan — solar
 * return, Jupiter/Saturn hits on Sun/Moon/ASC, Saturn-return seasons —
 * loads the engine once per chart and caches in localStorage keyed by
 * chart id + engine version, refreshed every two weeks.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useProfile } from '../lib/hooks/useProfile';
import { useTodayChart } from '../lib/hooks/useTodayChart';
import { useYearAhead } from '../lib/hooks/useYearAhead';
import { isTodayChartUsable } from '../lib/profile/today-chart';
import { findInterAspects } from '../lib/engine/synastry';
import { TRANSIT_ORB, transitLine } from '../lib/transits';
import PlanetGlyph from '../components/PlanetGlyph';
import EvidenceDisclosure from './EvidenceDisclosure';
import { houseLine, wholeSignHouseFromAsc, type DailyBody } from '../lib/daily';
import { signBySlug, signForLongitude } from '../lib/signs';
import { localizePath, normalizeCatalogLocale, t, type CatalogLocale as Locale } from '../lib/i18n';
import { aspectLabel, moonPhaseLabel, planetLabel } from '../lib/i18n/astrology';
import daily from '../data/daily.json';

/** Each transiting body's current-sign hue, for the leading receipt glyph. */
const SKY_HUE: Record<string, string> = Object.fromEntries(
  daily.bodies.map((b) => [b.body, signBySlug(b.sign).hue]),
);

interface Props { locale?: Locale }

const TODAY_CHART_COPY = {
  en: { use: 'Use for Today', active: 'Used for Today', viewing: 'Viewing', selected: 'Today now uses' },
  es: { use: 'Usar para Hoy · EN', active: 'Usada para Hoy · EN', viewing: 'Viendo', selected: 'Hoy ahora usa' },
  pt: { use: 'Usar para Hoje · EN', active: 'Usado para Hoje · EN', viewing: 'Vendo', selected: 'Hoje agora usa' },
  fr: { use: 'Utiliser pour Aujourd’hui · EN', active: 'Utilisé pour Aujourd’hui · EN', viewing: 'Thème affiché', selected: 'Aujourd’hui utilise maintenant' },
  it: { use: 'Usa per Oggi · EN', active: 'Usato per Oggi · EN', viewing: 'Tema visualizzato', selected: 'Oggi ora usa' },
  ru: { use: 'Использовать для «Сегодня» · EN', active: 'Для «Сегодня» · EN', viewing: 'Открыта карта', selected: 'Для «Сегодня» выбрана карта' },
} as const satisfies Record<Locale, Record<'use' | 'active' | 'viewing' | 'selected', string>>;

const MOVERS = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);

export default function ProfileDashboard({ locale: rawLocale = 'en' }: Props) {
  const locale = normalizeCatalogLocale(rawLocale);
  const { profile, ready: profileReady } = useProfile();
  const {
    chart: todayChart,
    ready: todayChartReady,
    selectChart: selectTodayChart,
  } = useTodayChart(profile, profileReady);
  const charts = useMemo(
    () => profile.charts
      .filter(isTodayChartUsable)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [profile.charts],
  );
  const [sel, setSel] = useState<string | null>(null);
  const [chartAnnouncement, setChartAnnouncement] = useState('');

  useEffect(() => {
    if (!todayChartReady) return;
    if (sel && charts.some((candidate) => candidate.id === sel)) return;
    setSel(todayChart?.id ?? charts[0]?.id ?? null);
  }, [charts, sel, todayChart?.id, todayChartReady]);

  const chart = charts.find((c) => c.id === sel)
    ?? (todayChartReady ? todayChart ?? charts[0] ?? null : null);
  const { timeline: yearTimeline, busy: yearBusy } = useYearAhead(chart);
  const timeline = yearTimeline.slice(0, 8);
  const natalPointLabel = (body: string) => locale === 'ru'
    ? `${body === 'Moon' || body === 'Venus' ? 'натальная' : 'натальный'} ${planetLabel(locale, body)}`
    : `${t(locale, 'natal')} ${planetLabel(locale, body)}`;

  const today = useMemo(() => {
    if (!chart) return null;
    const natal = chart.summary.bodies.map(({ body, lon }) => ({ body, lon }));
    const sky = daily.bodies.filter((b) => MOVERS.has(b.body)).map(({ body, lon }) => ({ body, lon }));
    const hits = findInterAspects(sky, natal)
      .filter((a) => a.orb <= TRANSIT_ORB)
      .sort((x, y) => x.orb - y.orb)
      .slice(0, 4);

    // Real natal houses (whole sign from the ascendant) when the birth
    // time is known — the Sun and Moon read from YOUR rooms, not solar ones.
    let houseLines: ReturnType<typeof houseLine>[] = [];
    const asc = chart.summary.angles?.asc;
    if (chart.birth.timeKnown && asc != null && chart.summary.houseSystem === 'whole') {
      const ascSign = signForLongitude(asc).slug;
      houseLines = daily.bodies
        .filter((b) => b.body === 'Sun' || b.body === 'Moon')
        .map((b) => houseLine(b as DailyBody, wholeSignHouseFromAsc(b.sign, ascSign)));
    }
    return { hits, houseLines };
  }, [chart]);

  if (!chart) {
    return (
      <section class="shell pfd" aria-label={t(locale, 'pfdEmptyTitle')}>
        <div class="core pfd__core pfd__empty">
          <h2>{t(locale, 'pfdEmptyTitle')}</h2>
          <p>{t(locale, 'pfdEmptyBody')}</p>
          <a class="btn btn--primary" href={localizePath(locale, '/birth-chart/')}>
            <span>{t(locale, 'getBirthChart')}</span><span class="orb">↗</span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section class="pfd" aria-label={t(locale, 'pfdToday')}>
      <div class="shell">
        <div class="core pfd__core">
          <div class="pfd__head">
            <h2>{t(locale, 'pfdToday')}</h2>
            <span class="mono pfd__stamp">
              {daily.date} · {moonPhaseLabel(locale, daily.moon.phase)}
            </span>
          </div>
          <div class="pfd__pick-row">
            {charts.length > 1 && (
              <label class="pfd__pick">
                <span class="mono">{t(locale, 'pfdChartPick')}</span>
                <select
                  class="field__input"
                  value={chart.id}
                  onChange={(event) => {
                    const id = (event.currentTarget as HTMLSelectElement).value;
                    const selected = charts.find((candidate) => candidate.id === id);
                    setSel(id);
                    if (selected) setChartAnnouncement(`${TODAY_CHART_COPY[locale].viewing} ${selected.name}.`);
                  }}
                >
                  {charts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
            {todayChart?.id === chart.id ? (
              <span class="pfd__today-state">{TODAY_CHART_COPY[locale].active}</span>
            ) : (
              <button
                class="pfd__today-action"
                type="button"
                onClick={() => {
                  if (!selectTodayChart(chart.id)) return;
                  setChartAnnouncement(`${TODAY_CHART_COPY[locale].selected} ${chart.name}.`);
                }}
              >
                {TODAY_CHART_COPY[locale].use}
              </button>
            )}
            <span class="sr-only" role="status" aria-live="polite">{chartAnnouncement}</span>
          </div>
          {locale !== 'ru' && today && today.houseLines.length > 0 && (
            <ul class="pfd__lines">
              {today.houseLines.map((l) => (
                <li key={l.receipt}>
                  <p>{l.text}</p>
                </li>
              ))}
            </ul>
          )}
          {locale === 'ru' ? (
            <p class="pfd__quiet">Ежедневные выпуски пока выходят по-английски. Расчётные данные ниже — для любого языка.</p>
          ) : today && today.hits.length > 0 ? (
            <ul class="pfd__lines">
              {today.hits.map((a) => (
                <li key={`${a.a}-${a.b}-${a.type}`}>
                  <p>{transitLine(a.a, a.type, a.b)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p class="pfd__quiet">{t(locale, 'pfdQuietSky')}</p>
          )}
          {today && (today.houseLines.length > 0 || today.hits.length > 0) && (
            <EvidenceDisclosure label={t(locale, 'whyThisReading')}>
              <ul class="evidence-disclosure__list">
                {locale !== 'ru' && today.houseLines.map((l) => (
                  <li class="mono evidence-disclosure__receipt" key={l.receipt}>
                    {l.body && <PlanetGlyph body={l.body} hue={l.hue} size={13} class="rcpt-glyph" />}
                    <span>{l.receipt}</span>
                  </li>
                ))}
                {today.hits.map((a) => (
                  <li class="mono evidence-disclosure__receipt" key={`${a.a}-${a.b}-${a.type}`}>
                    <PlanetGlyph body={a.a} hue={SKY_HUE[a.a]} size={13} class="rcpt-glyph" />
                    <span>{planetLabel(locale, a.a)} {aspectLabel(locale, a.type)} {natalPointLabel(a.b)} · {t(locale, 'orb')} {a.orb.toFixed(1)}°</span>
                  </li>
                ))}
              </ul>
            </EvidenceDisclosure>
          )}
          <a class="pfd__more" href={localizePath(locale, '/transits/')}>{t(locale, 'allTransits')} →</a>
        </div>
      </div>

      <div class="shell">
        <div class="core pfd__core">
          <div class="pfd__head">
            <h2>{t(locale, 'pfdYearAhead')}</h2>
            <span class="mono pfd__stamp">{chart.name}</span>
          </div>
          {locale === 'ru' ? (
            <p class="pfd__quiet">Персональное чтение года впереди пока доступно по-английски. Расчёт выполняется на вашем устройстве.</p>
          ) : timeline.length > 0 ? (
            <ul class="pfd__lines">
              {timeline.map((ev) => (
                <li key={`${ev.kind}-${ev.at}-${ev.receipt}`}>
                  <p>{ev.line}</p>
                </li>
              ))}
            </ul>
          ) : yearBusy ? (
            <p class="pfd__quiet">{t(locale, 'pfdYearBusy')}</p>
          ) : (
            <p class="pfd__quiet">{t(locale, 'pfdQuietAhead')}</p>
          )}
          {locale !== 'ru' && timeline.length > 0 && yearBusy && (
            <p class="pfd__quiet">{t(locale, 'pfdYearBusy')}</p>
          )}
          {locale !== 'ru' && timeline.length > 0 && (
            <EvidenceDisclosure label={t(locale, 'whyThisReading')}>
              <p>{t(locale, 'pfdYearNote')}</p>
              <ul class="evidence-disclosure__list">
                {timeline.map((ev) => (
                  <li class="mono evidence-disclosure__receipt" key={`${ev.kind}-${ev.at}-${ev.receipt}`}>
                    {ev.body && <PlanetGlyph body={ev.body} size={13} class="rcpt-glyph" />}
                    <span>{ev.receipt}</span>
                  </li>
                ))}
              </ul>
            </EvidenceDisclosure>
          )}
        </div>
      </div>
    </section>
  );
}
