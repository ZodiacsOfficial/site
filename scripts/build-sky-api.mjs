/*
 * Emits the public machine-readable sky data API into dist/api/v1/.
 *
 * Every payload is a reshaping of committed source data — src/data/daily.json,
 * sky.json, eclipses.json, and the monthly transits-YYYY-MM.json snapshots —
 * so the API can never disagree with the pages built from the same files.
 * Nothing here computes astronomy; the committed data already passed the
 * engine's accuracy gates and check-dist's freshness gates.
 *
 * Runs after `astro build` (see the build script chain in package.json) and
 * writes into dist only: no committed output, so no drift gate. The endpoint
 * list in index.json is the deploy contract; check-dist walks it and fails
 * the build if any listed path is missing.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://zodiacs.org';

const COMMON_META = Object.freeze({
  source: `${ORIGIN}/api/v1/index.json`,
  docs: `${ORIGIN}/developers/`,
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: `Data: Zodiacs.org — ${ORIGIN}`,
});

const POSITIONS_NOTE = 'Apparent geocentric tropical longitudes; methodology at '
  + `${ORIGIN}/methodology/`;

function isoDay(value) {
  return String(value).slice(0, 10);
}

function yearWindow(year) {
  return {
    from: Date.UTC(year, 0, 1),
    to: Date.UTC(year + 1, 0, 1),
  };
}

function inYear(instant, year) {
  const at = Date.parse(instant);
  const { from, to } = yearWindow(year);
  return at >= from && at < to;
}

/** Calendar years whose twelve monthly transit snapshots are all committed. */
export function completeTransitYears(monthKeys) {
  const byYear = new Map();
  for (const key of monthKeys) {
    const year = Number(key.slice(0, 4));
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }
  return [...byYear.entries()]
    .filter(([, count]) => count === 12)
    .map(([year]) => year)
    .sort((a, b) => a - b);
}

/** Today's sky: the daily-facts snapshot plus retrograde windows and the
 *  next lunations, all joined from the same committed sources. */
export function buildToday({ daily, sky, months, generatedAt }) {
  const snapshot = Date.parse(daily.snapshotAt);
  const retrogrades = sky.retrogrades
    .filter((window) => Date.parse(window.from) <= snapshot && snapshot < Date.parse(window.to))
    .map(({ planet, from, to, preShadowStart, postShadowEnd }) => (
      { planet, from, to, preShadowStart, postShadowEnd }
    ));

  const details = lunationDetails(months);
  const nextLunation = (type) => {
    const upcoming = sky.moons.find((moon) => moon.type === type && Date.parse(moon.at) > snapshot);
    if (!upcoming) return null;
    const detail = details.get(`${type}:${isoDay(upcoming.at)}`);
    return {
      at: upcoming.at,
      ...(detail ? { sign: detail.sign, degree: detail.degree } : {}),
    };
  };

  return {
    schema: 'zodiacs.sky-api.today.v1',
    ...COMMON_META,
    generatedAt,
    date: daily.date,
    snapshotAt: daily.snapshotAt,
    positions: POSITIONS_NOTE,
    bodies: daily.bodies,
    moon: {
      ...daily.moon,
      nextFullMoon: nextLunation('full'),
      nextNewMoon: nextLunation('new'),
    },
    retrogrades,
    eventsCoverage: daily.eventsCoverage,
    events: daily.events,
  };
}

/** Retrograde windows intersecting the year, station to station, with
 *  pre/post shadow boundaries where the scan resolved them. */
export function buildRetrogradeYear(sky, year, generatedAt) {
  const { from, to } = yearWindow(year);
  return {
    schema: 'zodiacs.sky-api.retrogrades.v1',
    ...COMMON_META,
    generatedAt,
    year,
    note: 'Windows intersecting the year; a window crossing January 1 appears in both adjacent years.',
    retrogrades: sky.retrogrades
      .filter((window) => Date.parse(window.from) < to && Date.parse(window.to) > from)
      .map(({ planet, from: start, to: end, preShadowStart, postShadowEnd }) => (
        { planet, from: start, to: end, preShadowStart, postShadowEnd }
      )),
  };
}

/** Sign ingresses for the year from the monthly transit snapshots. */
export function buildIngressYear(months, year, generatedAt) {
  return {
    schema: 'zodiacs.sky-api.ingresses.v1',
    ...COMMON_META,
    generatedAt,
    year,
    ingresses: months
      .filter((month) => month.month.startsWith(`${year}-`))
      .flatMap((month) => month.ingresses)
      .slice()
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
  };
}

/** Lunation instants from committed lunation records keyed by type and UTC
 *  day. The sky.json instants are canonical (the full-moon-calendar and the
 *  events catalog print them); the monthly snapshots carry sign and degree. */
export function lunationDetails(months) {
  const byDay = new Map();
  for (const month of months) {
    for (const lunation of month.lunations) {
      byDay.set(`${lunation.type}:${isoDay(lunation.at)}`, lunation);
    }
  }
  return byDay;
}

/** Full and new moon instants for the year, with sign and degree. */
export function buildMoonPhaseYear(sky, months, year, generatedAt) {
  const details = lunationDetails(months);
  return {
    schema: 'zodiacs.sky-api.moon-phases.v1',
    ...COMMON_META,
    generatedAt,
    year,
    lunations: sky.moons
      .filter((moon) => inYear(moon.at, year))
      .map(({ type, at }) => {
        const detail = details.get(`${type}:${isoDay(at)}`);
        return { type, at, ...(detail ? { sign: detail.sign, degree: detail.degree } : {}) };
      }),
  };
}

/** Solar and lunar eclipses peaking in the year. */
export function buildEclipseYear(eclipseData, year, generatedAt) {
  return {
    schema: 'zodiacs.sky-api.eclipses.v1',
    ...COMMON_META,
    generatedAt,
    year,
    eclipses: eclipseData.eclipses.filter((eclipse) => inYear(eclipse.peak, year)),
  };
}

export function buildIndex({ years, eclipseYears, generatedAt }) {
  const perYear = (family, description, list) => list.map((year) => ({
    path: `/api/v1/${family}/${year}.json`,
    description: `${description} · ${year}`,
    updates: 'yearly data refresh',
  }));
  return {
    schema: 'zodiacs.sky-api.index.v1',
    ...COMMON_META,
    api: `${ORIGIN}/api/v1/`,
    generatedAt,
    versioning: 'Fields are added, never renamed or removed, within v1. Breaking changes would ship as /api/v2/.',
    endpoints: [
      {
        path: '/api/v1/sky/today.json',
        description: "Today's positions, moon phase, active retrogrades, and exact sky events",
        updates: 'daily at the 00:00 UTC publication boundary',
      },
      ...perYear('retrogrades', 'Retrograde windows with shadow boundaries', years),
      ...perYear('ingresses', 'Planetary sign ingresses', years),
      ...perYear('moon-phases', 'Full and new moon instants with signs', years),
      ...perYear('eclipses', 'Solar and lunar eclipse peaks', eclipseYears),
    ],
  };
}

export async function loadSources(root = repo) {
  const dataRoot = resolve(root, 'src/data');
  const parse = async (path) => JSON.parse(await readFile(resolve(dataRoot, path), 'utf8'));
  const monthFiles = (await readdir(dataRoot))
    .filter((name) => /^transits-\d{4}-\d{2}\.json$/.test(name))
    .sort();
  return {
    daily: await parse('daily.json'),
    sky: await parse('sky.json'),
    eclipses: await parse('eclipses.json'),
    months: await Promise.all(monthFiles.map((name) => parse(name))),
  };
}

export async function buildSkyApi({
  root = repo,
  outputRoot = resolve(repo, 'dist'),
  generatedAt = new Date().toISOString(),
} = {}) {
  const { daily, sky, eclipses, months } = await loadSources(root);
  const years = completeTransitYears(months.map((month) => month.month));
  const eclipseYears = years.filter((year) => yearWindow(year).to <= Date.parse(eclipses.to));

  const files = new Map([
    ['sky/today.json', buildToday({ daily, sky, months, generatedAt })],
    ...years.map((year) => [`retrogrades/${year}.json`, buildRetrogradeYear(sky, year, generatedAt)]),
    ...years.map((year) => [`ingresses/${year}.json`, buildIngressYear(months, year, generatedAt)]),
    ...years.map((year) => [`moon-phases/${year}.json`, buildMoonPhaseYear(sky, months, year, generatedAt)]),
    ...eclipseYears.map((year) => [`eclipses/${year}.json`, buildEclipseYear(eclipses, year, generatedAt)]),
  ]);
  const index = buildIndex({ years, eclipseYears, generatedAt });
  files.set('index.json', index);

  for (const [relPath, payload] of files) {
    const target = resolve(outputRoot, 'api/v1', relPath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
  return { fileCount: files.size, years, eclipseYears, index };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { fileCount, years, eclipseYears } = await buildSkyApi();
  console.log(
    `sky-api: dist/api/v1 · ${fileCount} files · years ${years.at(0)}–${years.at(-1)}`
    + ` · eclipses through ${eclipseYears.at(-1)}`,
  );
}
