/**
 * Flags-on Sky Alerts browser acceptance.
 *
 * Build with both push flags and a fixture-safe public VAPID key first:
 *
 *   PUBLIC_WEB_PUSH_ENABLED=1 PUSH_ENABLED=1 PUBLIC_VAPID_KEY=AQIDBA npm run build
 *   node tests/push-drive.mjs
 *
 * The worker, PushManager, permission prompt, and API are all intercepted.
 * This drive never creates a real browser subscription or sends a push.
 */
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

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

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function openFixture(browser, baseURL, {
  returning = false,
  permission = 'default',
  permissionResult = 'denied',
  ios = false,
  standalone = false,
  apiRequests = [],
} = {}) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    userAgent: ios
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      : undefined,
  });

  await context.route('**/api/push/subscribe', async (route) => {
    const request = route.request();
    apiRequests.push({
      method: request.method(),
      body: request.postDataJSON(),
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await context.addInitScript(({
    savedProfile,
    hasReturned,
    initialPermission,
    requestedPermission,
    installed,
  }) => {
    localStorage.clear();
    localStorage.setItem('zodiacs.profile.v1', JSON.stringify(savedProfile));
    if (hasReturned) {
      localStorage.setItem('zodiacs.today.v1', JSON.stringify({
        version: 1,
        count: 2,
        lastOpenedUtcDay: '2026-07-12',
      }));
    }

    const state = {
      permissionCalls: 0,
      registrationCalls: 0,
      getRegistrationCalls: 0,
      getSubscriptionCalls: 0,
      subscribeCalls: 0,
      unsubscribeCalls: 0,
      applicationServerKeyBytes: 0,
    };
    window.__pushDrive = state;

    const subscription = {
      endpoint: 'https://push.fixture.test/subscription/sky-alerts',
      expirationTime: null,
      toJSON: () => ({
        endpoint: 'https://push.fixture.test/subscription/sky-alerts',
        expirationTime: null,
        keys: {
          p256dh: 'fixture-p256dh',
          auth: 'fixture-auth',
        },
      }),
      unsubscribe: async () => {
        state.unsubscribeCalls += 1;
        activeSubscription = null;
        return true;
      },
    };
    let activeSubscription = null;
    const registration = {
      pushManager: {
        getSubscription: async () => {
          state.getSubscriptionCalls += 1;
          return activeSubscription;
        },
        subscribe: async (options) => {
          state.subscribeCalls += 1;
          state.applicationServerKeyBytes = options?.applicationServerKey?.byteLength ?? 0;
          activeSubscription = subscription;
          return subscription;
        },
      },
    };

    const notification = {
      permission: initialPermission,
      requestPermission: async () => {
        state.permissionCalls += 1;
        notification.permission = requestedPermission;
        return requestedPermission;
      },
    };
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: notification,
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: installed,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: async () => {
          state.getRegistrationCalls += 1;
          return registration;
        },
        register: async () => {
          state.registrationCalls += 1;
          return registration;
        },
      },
    });
  }, {
    savedProfile: profile,
    hasReturned: returning,
    initialPermission: permission,
    requestedPermission: permissionResult,
    installed: standalone,
  });

  const page = await context.newPage();
  await page.goto(`${baseURL}/today/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-today-state="chart"]');
  return { context, page };
}

await withPreview({ port: Number(process.env.PUSH_DRIVE_PORT ?? 4399) }, async (baseURL) => {
  const workerResponse = await fetch(`${baseURL}/sw.js`);
  const worker = await workerResponse.text();
  check('generated service worker is present and push-enabled',
    workerResponse.ok
      && /const PUSH_ENABLED = true; \/\/ @build push-enabled/.test(worker)
      && worker.includes("self.addEventListener('push'"),
    `status=${workerResponse.status}`);

  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    const first = await openFixture(browser, baseURL);
    check('first /today/ visit does not show the push affordance',
      await first.page.locator('[data-push-optin]').count() === 0);
    const firstCalls = await first.page.evaluate(() => window.__pushDrive);
    check('first visit makes no permission or push-subscription call',
      firstCalls.permissionCalls === 0 && firstCalls.subscribeCalls === 0,
      JSON.stringify(firstCalls));
    await first.context.close();

    const denied = await openFixture(browser, baseURL, { returning: true });
    await denied.page.waitForSelector('[data-push-optin][data-push-context="today-return"]');
    check('returning visit shows the event-only sky-alert affordance',
      await denied.page.getByText('Sky alerts, when they’re earned?').isVisible()
        && await denied.page.getByText('Most days, nothing.', { exact: false }).isVisible()
        && await denied.page.getByText('Never more than one a day, or two a week.').isVisible());
    const beforeAccept = await denied.page.evaluate(() => window.__pushDrive);
    check('native permission is not requested on page load',
      beforeAccept.permissionCalls === 0 && beforeAccept.subscribeCalls === 0,
      JSON.stringify(beforeAccept));
    await denied.page.getByRole('button', { name: 'Turn on sky alerts' }).click();
    await denied.page.getByText(
      'Notifications are blocked in this browser, so sky alerts can’t reach you.',
      { exact: false },
    ).waitFor();
    const afterAccept = await denied.page.evaluate(() => window.__pushDrive);
    check('denied permission adds no opt-in registration, subscription, or API enrollment',
      afterAccept.permissionCalls === 1
        && afterAccept.registrationCalls === 1
        && afterAccept.subscribeCalls === 0,
      JSON.stringify(afterAccept));
    await denied.context.close();

    const ios = await openFixture(browser, baseURL, { returning: true, ios: true });
    await ios.page.waitForSelector('[data-push-optin]');
    check('non-installed iOS explains Home Screen installation before push',
      await ios.page.getByText(
        'alerts work only after you add Zodiacs to your Home Screen',
        { exact: false },
      ).isVisible()
        && await ios.page.getByRole('button', { name: 'Turn on sky alerts' }).count() === 0);
    const iosCalls = await ios.page.evaluate(() => window.__pushDrive);
    check('non-installed iOS makes no permission or subscription request',
      iosCalls.permissionCalls === 0 && iosCalls.subscribeCalls === 0,
      JSON.stringify(iosCalls));
    await ios.context.close();

    const installedIos = await openFixture(browser, baseURL, {
      returning: true,
      ios: true,
      standalone: true,
    });
    await installedIos.page.waitForSelector('[data-push-optin]');
    check('installed iOS is eligible for the ordinary explicit opt-in',
      await installedIos.page.getByRole('button', { name: 'Turn on sky alerts' }).isVisible()
        && await installedIos.page.getByText(
          'alerts work only after you add Zodiacs to your Home Screen',
          { exact: false },
        ).count() === 0);
    const installedIosCalls = await installedIos.page.evaluate(() => window.__pushDrive);
    check('installed-iOS eligibility remains passive before acceptance',
      installedIosCalls.permissionCalls === 0 && installedIosCalls.subscribeCalls === 0,
      JSON.stringify(installedIosCalls));
    await installedIos.context.close();

    const apiRequests = [];
    const success = await openFixture(browser, baseURL, {
      returning: true,
      permissionResult: 'granted',
      apiRequests,
    });
    await success.page.waitForSelector('[data-push-optin]');
    await success.page.getByRole('button', { name: 'Turn on sky alerts' }).click();
    await success.page.getByText('Sky alerts are on', { exact: false }).waitFor();
    const subscribed = await success.page.evaluate(() => ({
      calls: window.__pushDrive,
      preference: localStorage.getItem('zodiacs.push.v1'),
    }));
    check('explicit acceptance creates one mocked browser subscription',
      subscribed.calls.permissionCalls === 1
        && subscribed.calls.subscribeCalls === 1
        && subscribed.calls.applicationServerKeyBytes > 0
        && subscribed.preference === 'subscribed',
      JSON.stringify(subscribed));
    check('successful enrollment posts only the mocked endpoint and keys',
      apiRequests.length === 1
        && apiRequests[0].method === 'POST'
        && apiRequests[0].body?.endpoint === 'https://push.fixture.test/subscription/sky-alerts'
        && apiRequests[0].body?.keys?.p256dh === 'fixture-p256dh'
        && apiRequests[0].body?.keys?.auth === 'fixture-auth'
        && apiRequests[0].body?.lang === 'en',
      JSON.stringify(apiRequests));

    await success.page.getByRole('button', { name: 'Turn off' }).click();
    await success.page.locator('[data-push-optin]').waitFor({ state: 'detached' });
    const unsubscribed = await success.page.evaluate(() => ({
      calls: window.__pushDrive,
      preference: localStorage.getItem('zodiacs.push.v1'),
    }));
    check('turn off removes the mocked browser subscription and hides the affordance',
      unsubscribed.calls.unsubscribeCalls === 1
        && unsubscribed.preference === 'dismissed'
        && await success.page.locator('[data-push-optin]').count() === 0,
      JSON.stringify(unsubscribed));
    check('turn off deletes the same mocked endpoint from the API',
      apiRequests.length === 2
        && apiRequests[1].method === 'DELETE'
        && apiRequests[1].body?.endpoint === 'https://push.fixture.test/subscription/sky-alerts',
      JSON.stringify(apiRequests));
    await success.context.close();
  } finally {
    await browser.close();
  }
});

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
