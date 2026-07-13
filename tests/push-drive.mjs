/**
 * Drive the contextual push affordance without granting notification
 * permission or registering a service worker.
 *
 *   npm run build
 *   node tests/push-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';
const BASE = 'http://127.0.0.1:4399';

const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [{
    id: 'push-drive',
    name: 'Fixture chart',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    birth: { date: '1990-01-01', time: null, timeKnown: false, place: null },
    summary: {
      engineVersion: 'fixture',
      utcISO: '1990-01-01T12:00:00.000Z',
      houseSystem: 'whole',
      bodies: [{ body: 'Sun', lon: 20.2, retrograde: false }],
      angles: null,
      flags: [],
    },
  }],
};

async function stubPush(page, { returning = false } = {}) {
  await page.addInitScript(({ savedProfile, hasReturned }) => {
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(savedProfile));
    if (hasReturned) {
      localStorage.setItem('zodiacs.today.v1', JSON.stringify({
        version: 1,
        count: 2,
        lastOpenedUtcDay: '2026-07-12',
      }));
    }
    window.__pushDrive = { permissionCalls: 0, registrationCalls: 0 };
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: async () => {
          window.__pushDrive.permissionCalls += 1;
          return 'denied';
        },
      },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: async () => null,
        register: async () => {
          window.__pushDrive.registrationCalls += 1;
          throw new Error('The drive must not register before an explicit accept.');
        },
      },
    });
  }, { savedProfile: profile, hasReturned: returning });
}

const preview = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', '4399'], { stdio: 'ignore' });
await wait(2_500);
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });

  const first = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await stubPush(first);
  await first.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await first.waitForSelector('[data-today-state="chart"]');
  check('first /today/ visit does not show the push affordance',
    await first.locator('[data-push-optin]').count() === 0);
  const firstCalls = await first.evaluate(() => window.__pushDrive);
  check('first visit makes no permission or registration call',
    firstCalls.permissionCalls === 0 && firstCalls.registrationCalls === 0,
    JSON.stringify(firstCalls));
  await first.close();

  const returning = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await stubPush(returning, { returning: true });
  await returning.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await returning.waitForSelector('[data-push-optin][data-push-context="today-return"]');
  check('returning visit shows only the contextual affordance',
    await returning.getByText('Get a daily note?').isVisible());
  const beforeAccept = await returning.evaluate(() => window.__pushDrive);
  check('native permission is not requested on page load',
    beforeAccept.permissionCalls === 0 && beforeAccept.registrationCalls === 0,
    JSON.stringify(beforeAccept));
  const accept = returning.getByRole('button', { name: 'Turn on daily notes' });
  await accept.click();
  await returning.getByText('Notifications are blocked in this browser.').waitFor();
  const afterAccept = await returning.evaluate(() => window.__pushDrive);
  check('permission is requested only after the explicit accept',
    afterAccept.permissionCalls === 1 && afterAccept.registrationCalls === 0,
    JSON.stringify(afterAccept));
  await returning.close();

  const ios = await browser.newPage({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  });
  await stubPush(ios, { returning: true });
  await ios.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
  await ios.waitForSelector('[data-push-optin]');
  check('iOS explains Home Screen installation before push',
    await ios.getByText('notifications work only after you add this site to your Home Screen', { exact: false }).isVisible());
  const iosCalls = await ios.evaluate(() => window.__pushDrive);
  check('iOS install caveat makes no permission request', iosCalls.permissionCalls === 0, JSON.stringify(iosCalls));
  await ios.close();

  await browser.close();
} finally {
  preview.kill();
}

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
