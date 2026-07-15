import { createServer } from 'node:http';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

function listen(server) {
  return new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return rejectListen(new Error('host server has no TCP address'));
      resolveListen(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolveClose) => server.close(resolveClose));
}

await withPreview({ port: Number(process.env.WIDGET_PREVIEW_PORT ?? 4331) }, async (baseURL) => {
  const host = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html><body>
      <iframe id="moon" src="${baseURL}/embed/moon/?theme=light&accent=%23E0B080" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
      <iframe id="sky" src="${baseURL}/embed/sky/?theme=dark" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
      <iframe id="chart" src="${baseURL}/embed/chart/?theme=dark" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
      <script async src="${baseURL}/assets/widgets.js" data-zodiacs-widget="sky" data-theme="light" data-accent="#E0B080" data-title="Mounted sky"></script>
    </body></html>`);
  });
  const hostURL = await listen(host);
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    headless: true,
    args: STABLE_CHROMIUM_ARGS,
  });
  const requests = [];

  try {
    const page = await browser.newPage();
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(hostURL, { waitUntil: 'networkidle' });
    if (new URL(page.url()).origin === new URL(baseURL).origin) throw new Error('fixture is not foreign-origin');

    for (const selector of ['#moon', '#sky', '#chart']) {
      const frame = page.frameLocator(selector);
      await frame.getByRole('link', { name: /Powered by Zodiacs\.org/ }).waitFor();
      if (await frame.locator('img[src*="/assets/zodiac-icons/48/"]').count() < 1) {
        throw new Error(`${selector} did not render a canonical sign icon`);
      }
    }

    const mounted = page.frameLocator('iframe[title="Mounted sky"]');
    await mounted.getByRole('link', { name: /Powered by Zodiacs\.org/ }).waitFor();

    const chart = page.frameLocator('#chart');
    await chart.getByLabel('Birth date').fill('1990-01-15');
    await chart.getByLabel('Birth time').fill('12:30');
    const birthplace = chart.getByLabel('Birthplace');
    await birthplace.fill('New York');
    await chart.getByRole('option').first().waitFor();
    await birthplace.press('ArrowDown');
    await birthplace.press('ArrowUp');
    await birthplace.press('Enter');
    if (!(await chart.getByLabel('Birthplace').inputValue()).includes('New York')) {
      throw new Error('mini chart keyboard selection did not preserve the labeled birthplace input');
    }
    await chart.getByRole('button', { name: 'Find the big three' }).click();
    await chart.locator('.mini-chart__result article').first().waitFor({ timeout: 30_000 });
    if (await chart.locator('.mini-chart__result article').count() !== 3) {
      throw new Error('mini chart did not render all three placements');
    }

    const forbidden = requests.filter((url) => /plausible|analytics|session[-_]?record|fingerprint|\/api\//i.test(url));
    if (forbidden.length > 0) throw new Error(`embed made forbidden requests:\n${forbidden.join('\n')}`);
    console.log('widgets-drive: foreign-origin iframe, script mount, branding, icons, and private chart all pass');
  } finally {
    await browser.close();
    await close(host);
  }
});
