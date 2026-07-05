/*
 * Builds assets/pulse.json — the data behind "The Pulse", the site's
 * attention instrument.
 *
 * Two layers:
 *
 *  1. Wikipedia pageviews (measured) — daily reader views for the twelve
 *     sign articles, combined, against comparison token articles. Fetched
 *     from the open Wikimedia REST API. The site also refreshes this
 *     live in the visitor's browser; the JSON is the dated fallback.
 *
 *  2. Google Trends (snapshot, best-effort) — relative search interest
 *     for "horoscope" vs major tokens. Google rate-limits aggressively
 *     from datacenter IPs; when the fetch fails the previous snapshot
 *     (or null) is kept and the site falls back to a link-out.
 *
 * Platform estimates (X / Instagram / TikTok / Google volumes) are
 * editorial approximations, clearly footnoted on-site; they are kept in
 * this file's ESTIMATES block and carried into the JSON verbatim.
 *
 * Run from the repo root:
 *
 *   node scripts/build-pulse.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, 'public/assets/pulse.json');

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const COMPARISONS = [
  { label: 'Dogecoin', article: 'Dogecoin' },
  { label: 'Ethereum', article: 'Ethereum' },
  { label: 'Solana', article: 'Solana_(blockchain_platform)' },
  { label: 'Shiba Inu', article: 'Shiba_Inu_(cryptocurrency)' },
];

/*
 * Editorial platform estimates. Shown on-site with the disclaimer:
 * "editorial estimates … directional, not measured."
 * Update `capturedAt` when revising the figures.
 */
const ESTIMATES = {
  capturedAt: '2026-06',
  by: 'Editorial estimates from public cumulative hashtag and search-volume figures',
  items: [
    { k: 'X', v: '≈250K', unit: 'astrology posts / day' },
    { k: 'Instagram', v: '≈80K', unit: 'sign-tagged posts / day' },
    { k: 'TikTok', v: '≈100M', unit: 'zodiac-tag views / day' },
    { k: 'Google', v: '10M+', unit: '“horoscope” searches / mo' },
  ],
};

const TRENDS_TERMS = ['horoscope', 'dogecoin', 'solana', 'ethereum'];
const UA = 'zodiacs.org pulse builder (https://zodiacs.org; diasmal917@gmail.com)';

function ymd(d) {
  return d.toISOString().slice(0, 10).replaceAll('-', '');
}

async function wikiDaily(article, start, end) {
  const url =
    'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/' +
    `${encodeURIComponent(article)}/daily/${start}/${end}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${article}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.items ?? []).map((i) => ({ date: i.timestamp.slice(0, 8), views: i.views }));
}

async function buildWikipedia() {
  const end = new Date(Date.now() - 24 * 3600 * 1000); // yesterday — today is partial
  const start = new Date(end.getTime() - 29 * 24 * 3600 * 1000);
  const startStr = ymd(start);
  const endStr = ymd(end);

  // Combined daily series for the Twelve.
  const byDate = new Map();
  const perSign = {};
  for (const sign of SIGNS) {
    const days = await wikiDaily(`${sign}_(astrology)`, startStr, endStr);
    let total = 0;
    for (const d of days) {
      total += d.views;
      byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.views);
    }
    perSign[sign.toLowerCase()] = Math.round(total / Math.max(days.length, 1));
  }
  const series = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, views]) => ({ date, views }));
  const twelveAvg = Math.round(series.reduce((s, d) => s + d.views, 0) / Math.max(series.length, 1));

  const comparisons = [];
  for (const c of COMPARISONS) {
    try {
      const days = await wikiDaily(c.article, startStr, endStr);
      const avg = Math.round(days.reduce((s, d) => s + d.views, 0) / Math.max(days.length, 1));
      comparisons.push({ label: c.label, avgDay: avg, multiple: Math.round(twelveAvg / Math.max(avg, 1)) });
    } catch (err) {
      console.warn(`comparison ${c.label} skipped: ${err.message}`);
    }
  }

  return {
    rangeDays: series.length,
    from: series[0]?.date ?? startStr,
    to: series.at(-1)?.date ?? endStr,
    twelveAvgDay: twelveAvg,
    lastDay: series.at(-1)?.views ?? null,
    series,
    perSignAvgDay: perSign,
    comparisons,
  };
}

async function buildTrends() {
  // Best-effort; Google 429s datacenter IPs routinely.
  const { averages, points } = await fetchTrendsSeries(TRENDS_TERMS);
  return {
    capturedAt: new Date().toISOString().slice(0, 10),
    terms: TRENDS_TERMS,
    averages,
    points,
  };
}

const browserUA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
let trendsCookiePromise = null;
function trendsCookie() {
  trendsCookiePromise ??= fetch('https://trends.google.com/', { headers: { 'User-Agent': browserUA } })
    .then((home) => (home.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '));
  return trendsCookiePromise;
}

// One explore + multiline round trip for up to five terms; returns the
// 12-month average relative interest per term (Google's 0-100 scale,
// relative within this request only).
async function fetchTrendsSeries(terms) {
  const req = {
    comparisonItem: terms.map((keyword) => ({ keyword, geo: '', time: 'today 12-m' })),
    category: 0,
    property: '',
  };
  const cookie = await trendsCookie();
  const explore = await fetch(
    'https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=' + encodeURIComponent(JSON.stringify(req)),
    { headers: { 'User-Agent': browserUA, Cookie: cookie } },
  );
  if (!explore.ok) throw new Error(`explore HTTP ${explore.status}`);
  const widgets = JSON.parse((await explore.text()).replace(/^\)\]\}',?\s*/, '')).widgets;
  const w = widgets.find((x) => x.id === 'TIMESERIES');
  await new Promise((r) => setTimeout(r, 1500));
  const ml = await fetch(
    `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=${encodeURIComponent(
      JSON.stringify(w.request),
    )}&token=${w.token}`,
    { headers: { 'User-Agent': browserUA, Cookie: cookie } },
  );
  if (!ml.ok) throw new Error(`multiline HTTP ${ml.status}`);
  const data = JSON.parse((await ml.text()).replace(/^\)\]\}',?\s*/, ''));
  const points = data.default.timelineData.map((p) => ({
    t: Number(p.time),
    v: p.value,
  }));
  const avg = (i) => Math.round(points.reduce((s, p) => s + p.v[i], 0) / Math.max(points.length, 1));
  return { averages: terms.map((_, i) => avg(i)), points };
}

/*
 * Per-sign search interest, measured with compound queries.
 *
 * Bare sign terms are hopelessly ambiguous in English ("cancer" measures
 * the disease, "gemini" measures Google's model), so each sign is
 * measured as the explicit query "{sign} horoscope" — unambiguous for
 * every sign, and an undercount by design (it misses bare zodiac-intent
 * searches). Trends compares at most five terms per request, so the
 * twelve run in three batches of four, each sharing the anchor term
 * "dogecoin"; values are stored relative to the anchor (dogecoin = 1).
 * Best-effort per batch: failed batches keep the previous snapshot's
 * values for those signs.
 */
const SIGN_TRENDS_ANCHOR = 'dogecoin';

async function buildSignTrends(previousSignTrends) {
  const slugs = SIGNS.map((s) => s.toLowerCase());
  const values = { ...(previousSignTrends?.values ?? {}) };
  let freshBatches = 0;
  for (let i = 0; i < slugs.length; i += 4) {
    const batch = slugs.slice(i, i + 4);
    try {
      const terms = batch.map((slug) => `${slug} horoscope`).concat(SIGN_TRENDS_ANCHOR);
      const { averages } = await fetchTrendsSeries(terms);
      const anchorAvg = averages.at(-1);
      if (!anchorAvg) throw new Error('anchor term scored zero');
      batch.forEach((slug, j) => {
        values[slug] = Math.round((averages[j] / anchorAvg) * 100) / 100;
      });
      freshBatches += 1;
    } catch (err) {
      console.warn(`sign trends batch ${batch.join(',')}: kept previous (${err.message})`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  if (freshBatches === 0 && Object.keys(values).length === 0) {
    throw new Error('no batch succeeded and no previous snapshot');
  }
  return {
    capturedAt: freshBatches > 0 ? new Date().toISOString().slice(0, 10) : previousSignTrends?.capturedAt ?? null,
    anchor: SIGN_TRENDS_ANCHOR,
    query: '{sign} horoscope',
    unit: `relative to "${SIGN_TRENDS_ANCHOR}" = 1`,
    values,
  };
}

let previous = null;
try {
  previous = JSON.parse(await readFile(outPath, 'utf8'));
} catch {
  /* first run */
}

const pulse = {
  capturedAt: new Date().toISOString().slice(0, 10),
  wikipedia: await buildWikipedia(),
  trends: previous?.trends ?? null,
  trendsSigns: previous?.trendsSigns ?? null,
  estimates: ESTIMATES,
};

try {
  pulse.trends = await buildTrends();
  console.log('trends: captured');
} catch (err) {
  console.warn(`trends: kept previous snapshot (${err.message})`);
}

try {
  pulse.trendsSigns = await buildSignTrends(previous?.trendsSigns);
  console.log('sign trends: captured');
} catch (err) {
  console.warn(`sign trends: kept previous snapshot (${err.message})`);
}

await writeFile(outPath, JSON.stringify(pulse, null, 2) + '\n');
console.log(
  `Wrote assets/pulse.json — twelve avg/day ${pulse.wikipedia.twelveAvgDay}, ` +
    `${pulse.wikipedia.comparisons.map((c) => `${c.multiple}× ${c.label}`).join(', ')}`,
);
