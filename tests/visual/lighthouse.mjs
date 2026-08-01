import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import mobileConfig from 'lighthouse/core/config/default-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { findChromium, STABLE_CHROMIUM_ARGS } from './browser.mjs';
import { withPreview } from './preview-server.mjs';

const visualRoot = dirname(fileURLToPath(import.meta.url));
const artifactRoot = resolve(visualRoot, 'artifacts/lighthouse');
const runCount = Number(process.env.LIGHTHOUSE_RUNS ?? 3);
const routes = [
  { name: 'thesis', path: '/thesis/' },
  { name: 'today', path: '/today/' },
  { name: 'horoscopes', path: '/horoscopes/' },
  { name: 'horoscope-daily', path: '/horoscopes/aries/' },
  { name: 'horoscope-tomorrow', path: '/horoscopes/aries/tomorrow/' },
  { name: 'horoscope-weekly', path: '/horoscopes/aries/weekly/' },
  { name: 'horoscope-monthly', path: '/horoscopes/aries/monthly/' },
  { name: 'horoscope-love', path: '/horoscopes/aries/love/' },
  { name: 'horoscope-career', path: '/horoscopes/aries/career/' },
  { name: 'horoscope-yearly', path: '/horoscopes/aries/2027/' },
  { name: 'events-hub', path: '/events/' },
  { name: 'event-full-moon', path: '/full-moon/2026-07-29/' },
  { name: 'event-eclipse', path: '/eclipses/2026-08-12/' },
  { name: 'event-retrograde', path: '/mercury-retrograde/2026-06-29/' },
  { name: 'event-ingress', path: '/events/saturn-enters-aries-2026-02-14/' },
  { name: 'event-aspect', path: '/events/jupiter-trine-saturn-2026-08-31/' },
  { name: 'people-directory', path: '/people/' },
  { name: 'people-profile', path: '/people/ada-lovelace/' },
  { name: 'people-profile-new', path: '/people/marie-curie/' },
  { name: 'people-living-profile', path: '/people/serena-williams/', intentionalNoindex: true },
  // R2 makes the reviewed Russian core public. Gate each distinct Russian
  // template family instead of assuming the English scores transfer across
  // longer Cyrillic copy and the locale-specific font preload path.
  { name: 'ru-home', path: '/ru/' },
  { name: 'ru-birth-chart', path: '/ru/birth-chart/' },
  { name: 'ru-sign-guide', path: '/ru/aries/' },
];
// The Phase 1 brief gates every *new* template. Older site baselines remain
// available for a broader audit without making unrelated debt block this gate.
if (process.env.LIGHTHOUSE_INCLUDE_BASELINE === '1') {
  routes.unshift(
    { name: 'home', path: '/' },
    { name: 'birth-chart', path: '/birth-chart/' },
    { name: 'aries', path: '/aries/' },
  );
}
if (process.env.LIGHTHOUSE_INCLUDE_AURA === '1') {
  routes.push({ name: 'registry-aura', path: '/registry/collection/' });
}
const routeFilter = new Set(
  (process.env.LIGHTHOUSE_ROUTES ?? '').split(',').map((name) => name.trim()).filter(Boolean),
);
const selectedRoutes = routeFilter.size > 0
  ? routes.filter((route) => routeFilter.has(route.name))
  : routes;
if (selectedRoutes.length === 0) {
  throw new Error(`LIGHTHOUSE_ROUTES did not match a route: ${[...routeFilter].join(', ')}`);
}
const budgets = {
  score: 0.95,
  lcp: 2_500,
  // The brief says zero CLS, so any positive raw Lighthouse value fails.
  cls: 0,
  tbt: 200,
};

if (!Number.isInteger(runCount) || runCount < 1 || runCount > 5) {
  throw new Error('LIGHTHOUSE_RUNS must be an integer from 1 to 5.');
}

function metric(lhr, auditId) {
  const value = lhr.audits[auditId]?.numericValue;
  if (!Number.isFinite(value)) throw new Error(`Lighthouse returned no numeric value for ${auditId}.`);
  return value;
}

function categoryScore(lhr, categoryId) {
  const value = lhr.categories[categoryId]?.score;
  if (!Number.isFinite(value)) throw new Error(`Lighthouse returned no score for ${categoryId}.`);
  return value;
}

function categoryScoreWithout(lhr, categoryId, excludedAuditIds) {
  let earned = 0;
  let possible = 0;
  for (const ref of lhr.categories[categoryId]?.auditRefs ?? []) {
    if (excludedAuditIds.has(ref.id) || ref.weight <= 0) continue;
    const score = lhr.audits[ref.id]?.score;
    if (!Number.isFinite(score)) continue;
    earned += score * ref.weight;
    possible += ref.weight;
  }
  if (possible === 0) throw new Error(`Lighthouse returned no scored ${categoryId} audits.`);
  return earned / possible;
}

function gateSummary(results) {
  return {
    // The brief requires three passing runs, so report and gate the weakest
    // result rather than allowing a median to hide one failed run.
    performance: Math.min(...results.map((result) => result.performance)),
    accessibility: Math.min(...results.map((result) => result.accessibility)),
    seo: Math.min(...results.map((result) => result.seo)),
    lcp: Math.max(...results.map((result) => result.lcp)),
    cls: Math.max(...results.map((result) => result.cls)),
    tbt: Math.max(...results.map((result) => result.tbt)),
    searchPrivate: results.every((result) => result.searchPrivate),
  };
}

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

const chromePath = await findChromium();

let failures = 0;
await withPreview({ port: Number(process.env.LIGHTHOUSE_PORT ?? 4328) }, async (baseURL) => {
    console.log(`Lighthouse · ${runCount} run${runCount === 1 ? '' : 's'} per route · ${baseURL}`);
    console.log('Route                         Perf  A11y   SEO     LCP       CLS       TBT');

    for (const route of selectedRoutes) {
      const results = [];
      for (let index = 0; index < runCount; index += 1) {
        const url = `${baseURL}${route.path}`;
        // Each sample gets a fresh browser process. Reusing one process made
        // later samples inherit renderer/benchmark drift from earlier audits,
        // which obscured cold-load regressions instead of measuring them.
        const chrome = await chromeLauncher.launch({
          chromePath,
          chromeFlags: [
            '--headless=new',
            '--disable-gpu',
            ...STABLE_CHROMIUM_ARGS,
          ],
          logLevel: 'silent',
        });
        let result;
        try {
          result = await lighthouse(url, {
            port: chrome.port,
            logLevel: 'error',
            output: 'json',
            onlyCategories: ['performance', 'accessibility', 'seo'],
            maxWaitForLoad: 45_000,
            disableStorageReset: false,
          }, mobileConfig);
        } finally {
          await chrome.kill();
        }
        if (!result) throw new Error(`Lighthouse returned no result for ${url}.`);

        const lhr = result.lhr;
        results.push({
          performance: categoryScore(lhr, 'performance'),
          accessibility: categoryScore(lhr, 'accessibility'),
          // Deliberately protected routes must remain noindex. Gate every SEO
          // audit except the intentional "is-crawlable" failure, then
          // separately require that audit to fail closed on all runs.
          seo: route.intentionalNoindex
            ? categoryScoreWithout(lhr, 'seo', new Set(['is-crawlable']))
            : categoryScore(lhr, 'seo'),
          searchPrivate: route.intentionalNoindex
            ? lhr.audits['is-crawlable']?.score === 0
            : true,
          lcp: metric(lhr, 'largest-contentful-paint'),
          cls: metric(lhr, 'cumulative-layout-shift'),
          tbt: metric(lhr, 'total-blocking-time'),
        });
        await writeFile(
          resolve(artifactRoot, `${route.name}-${index + 1}.json`),
          JSON.stringify(lhr, null, 2),
        );
      }

      const values = gateSummary(results);
      const failed = values.performance < budgets.score
        || values.accessibility < budgets.score
        || values.seo < budgets.score
        || (route.intentionalNoindex && !values.searchPrivate)
        || values.lcp > budgets.lcp
        || values.cls > budgets.cls
        || values.tbt > budgets.tbt;
      if (failed) failures += 1;
      console.log(
        `${failed ? 'FAIL' : 'pass'} ${route.path.padEnd(22)} ${Math.round(values.performance * 100).toString().padStart(3)}   ${Math.round(values.accessibility * 100).toString().padStart(3)}   ${Math.round(values.seo * 100).toString().padStart(3)}   ${(values.lcp / 1000).toFixed(2).padStart(6)}s   ${values.cls.toFixed(3).padStart(6)}   ${Math.round(values.tbt).toString().padStart(5)}ms`,
      );
      if (route.intentionalNoindex) {
        console.log('     ↳ SEO excludes only the intentional noindex audit; noindex remained active in every run.');
      }
    }
});

if (failures > 0) {
  throw new Error(
    `${failures} route${failures === 1 ? '' : 's'} missed the Phase 1/2 Lighthouse gate: performance, accessibility, and SEO ≥95; LCP ≤2.50s; CLS =0; TBT ≤200ms.`,
  );
}
