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
  { name: 'horoscopes', path: '/horoscopes/' },
  { name: 'horoscope-daily', path: '/horoscopes/aries/' },
  { name: 'horoscope-tomorrow', path: '/horoscopes/aries/tomorrow/' },
  { name: 'horoscope-weekly', path: '/horoscopes/aries/weekly/' },
  { name: 'horoscope-monthly', path: '/horoscopes/aries/monthly/' },
  { name: 'horoscope-love', path: '/horoscopes/aries/love/' },
  { name: 'horoscope-career', path: '/horoscopes/aries/career/' },
  { name: 'horoscope-yearly', path: '/horoscopes/aries/2027/' },
];
// The Phase 1 brief gates every *new* template. Older site baselines remain
// available for a broader audit without making unrelated debt block this gate.
if (process.env.LIGHTHOUSE_INCLUDE_BASELINE === '1') {
  routes.unshift(
    { name: 'home', path: '/' },
    { name: 'birth-chart', path: '/birth-chart/' },
    { name: 'aries', path: '/aries/' },
    { name: 'today', path: '/today/' },
  );
}
if (process.env.LIGHTHOUSE_INCLUDE_AURA === '1') {
  routes.push({ name: 'registry-aura', path: '/registry/aura/' });
}
const budgets = {
  score: 0.95,
  lcp: 2_500,
  cls: 0.05,
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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summarize(results) {
  return {
    performance: median(results.map((result) => result.performance)),
    accessibility: median(results.map((result) => result.accessibility)),
    seo: median(results.map((result) => result.seo)),
    lcp: median(results.map((result) => result.lcp)),
    cls: median(results.map((result) => result.cls)),
    tbt: median(results.map((result) => result.tbt)),
  };
}

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

const chromePath = await findChromium();
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: [
    '--headless=new',
    '--disable-gpu',
    ...STABLE_CHROMIUM_ARGS,
  ],
  logLevel: 'silent',
});

let failures = 0;
try {
  await withPreview({ port: Number(process.env.LIGHTHOUSE_PORT ?? 4328) }, async (baseURL) => {
    console.log(`Lighthouse · ${runCount} run${runCount === 1 ? '' : 's'} per route · ${baseURL}`);
    console.log('Route                         Perf  A11y   SEO     LCP       CLS       TBT');

    for (const route of routes) {
      const results = [];
      for (let index = 0; index < runCount; index += 1) {
        const url = `${baseURL}${route.path}`;
        const result = await lighthouse(url, {
          port: chrome.port,
          logLevel: 'error',
          output: 'json',
          onlyCategories: ['performance', 'accessibility', 'seo'],
          maxWaitForLoad: 45_000,
          disableStorageReset: false,
        }, mobileConfig);
        if (!result) throw new Error(`Lighthouse returned no result for ${url}.`);

        const lhr = result.lhr;
        results.push({
          performance: categoryScore(lhr, 'performance'),
          accessibility: categoryScore(lhr, 'accessibility'),
          seo: categoryScore(lhr, 'seo'),
          lcp: metric(lhr, 'largest-contentful-paint'),
          cls: metric(lhr, 'cumulative-layout-shift'),
          tbt: metric(lhr, 'total-blocking-time'),
        });
        await writeFile(
          resolve(artifactRoot, `${route.name}-${index + 1}.json`),
          JSON.stringify(lhr, null, 2),
        );
      }

      const values = summarize(results);
      const failed = values.performance < budgets.score
        || values.accessibility < budgets.score
        || values.seo < budgets.score
        || values.lcp > budgets.lcp
        || values.cls > budgets.cls
        || values.tbt > budgets.tbt;
      if (failed) failures += 1;
      console.log(
        `${failed ? 'FAIL' : 'pass'} ${route.path.padEnd(22)} ${Math.round(values.performance * 100).toString().padStart(3)}   ${Math.round(values.accessibility * 100).toString().padStart(3)}   ${Math.round(values.seo * 100).toString().padStart(3)}   ${(values.lcp / 1000).toFixed(2).padStart(6)}s   ${values.cls.toFixed(3).padStart(6)}   ${Math.round(values.tbt).toString().padStart(5)}ms`,
      );
    }
  });
} finally {
  await chrome.kill();
}

if (failures > 0) {
  throw new Error(
    `${failures} route${failures === 1 ? '' : 's'} missed the Phase 1 Lighthouse gate: performance, accessibility, and SEO ≥95; LCP ≤2.50s; CLS ≤0.05; TBT ≤200ms.`,
  );
}
