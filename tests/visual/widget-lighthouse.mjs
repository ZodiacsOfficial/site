import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { findChromium, STABLE_CHROMIUM_ARGS } from './browser.mjs';
import { withPreview } from './preview-server.mjs';

const routes = ['/embed/moon/', '/embed/sky/', '/embed/chart/'];
const minimumScore = 0.95;
const chrome = await chromeLauncher.launch({
  chromePath: await findChromium(),
  chromeFlags: ['--headless=new', '--disable-gpu', ...STABLE_CHROMIUM_ARGS],
  logLevel: 'silent',
});

try {
  await withPreview({ port: Number(process.env.WIDGET_LIGHTHOUSE_PORT ?? 4332) }, async (baseURL) => {
    for (const route of routes) {
      const result = await lighthouse(`${baseURL}${route}`, {
        port: chrome.port,
        logLevel: 'error',
        output: 'json',
        onlyCategories: ['performance', 'accessibility'],
        maxWaitForLoad: 45_000,
      }, desktopConfig);
      if (!result) throw new Error(`Lighthouse returned no result for ${route}`);
      const performance = result.lhr.categories.performance.score ?? 0;
      const accessibility = result.lhr.categories.accessibility.score ?? 0;
      console.log(`${route} performance ${Math.round(performance * 100)} · accessibility ${Math.round(accessibility * 100)}`);
      if (performance < minimumScore || accessibility < minimumScore) {
        throw new Error(`${route} fell below the 95 Lighthouse threshold`);
      }
    }
  });
} finally {
  await chrome.kill();
}
