import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const FIXED_NOW = '2026-07-10T12:00:00.000Z';
const PROFILE_KEY = 'zodiacs.profile.v1';
const TIMEOUT = 45_000;

const FRIDA_BODIES = [
  ['Sun', 103.3755, false],
  ['Moon', 59.7121, false],
  ['Mercury', 126.3359, false],
  ['Venus', 84.3393, false],
  ['Mars', 283.3963, true],
  ['Jupiter', 110.4352, false],
  ['Saturn', 357.4452, false],
  ['Uranus', 280.6122, true],
  ['Neptune', 102.399, false],
  ['Pluto', 83.7468, false],
  ['North Node', 113.4131, true],
  ['South Node', 293.4131, true],
];

const savedChart = ({ id, name, date, time, place, bodies, angles, updatedAt }) => ({
  id,
  name,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt,
  birth: {
    date,
    time,
    timeKnown: time !== null,
    place,
  },
  summary: {
    engineVersion: '1.0.0',
    utcISO: `${date}T12:00:00.000Z`,
    houseSystem: 'whole',
    bodies: bodies.map(([body, lon, retrograde]) => ({ body, lon, retrograde })),
    angles,
    flags: [],
  },
});

const PROFILE = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [
    savedChart({
      id: 'chart-frida',
      name: 'Frida · fixture',
      date: '1907-07-06',
      time: '08:30',
      place: {
        name: 'Coyoacán', admin1: 'Ciudad de México', country: 'Mexico',
        lat: 19.35, lon: -99.16, tz: 'America/Mexico_City',
      },
      bodies: FRIDA_BODIES,
      angles: { asc: 143.5128, mc: 53.3284 },
      updatedAt: '2026-07-09T00:00:00.000Z',
    }),
    savedChart({
      id: 'chart-alex',
      name: 'Alex · fixture',
      date: '1990-06-15',
      time: '08:30',
      place: {
        name: 'New York City', admin1: 'New York', country: 'United States',
        lat: 40.71, lon: -74.01, tz: 'America/New_York',
      },
      bodies: FRIDA_BODIES.map(([body, lon, retrograde], index) => [
        body,
        (lon + 47 + index * 3.25) % 360,
        index % 4 === 0 ? !retrograde : retrograde,
      ]),
      angles: { asc: 212.125, mc: 126.75 },
      updatedAt: '2026-07-08T00:00:00.000Z',
    }),
  ],
};

function kahloFragment() {
  const fixture = {
    d: '1907-07-06',
    z: 'America/Mexico_City',
    la: 19.35,
    lo: -99.16,
    t: '08:30',
    n: 'Frida Kahlo',
    p: 'Coyoacán, Mexico',
  };
  return `#c=1.${Buffer.from(JSON.stringify(fixture)).toString('base64url')}`;
}

const cleanText = (value) => value.replace(/\s+/g, ' ').trim();
const hashText = (value) => createHash('sha256').update(cleanText(value)).digest('hex');

async function waitForHydration(page) {
  await page.locator('.calc__form').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.waitForFunction(() => {
    const form = document.querySelector('.calc__form');
    const island = form?.closest('astro-island');
    return island ? !island.hasAttribute('ssr') : Boolean(form);
  }, null, { timeout: TIMEOUT });
}

async function openRoute(page, baseURL, path) {
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, `${path} must return 200`);
  await waitForHydration(page);
  await page.evaluate(() => document.fonts.ready);
}

async function installBusyProbe(page) {
  await page.evaluate(() => {
    const form = document.querySelector('.calc__form');
    if (!form) throw new Error('calculator form missing');
    const values = [form.getAttribute('aria-busy') ?? 'missing'];
    const observer = new MutationObserver(() => {
      const next = form.getAttribute('aria-busy') ?? 'missing';
      if (values.at(-1) !== next) values.push(next);
    });
    observer.observe(form, { attributes: true, attributeFilter: ['aria-busy'] });
    globalThis.__c6BusyProbe = { values, observer };
  });
}

async function finishBusyProbe(page) {
  await page.waitForFunction(() => {
    const probe = globalThis.__c6BusyProbe;
    const form = document.querySelector('.calc__form');
    return probe?.values.includes('true') && form?.getAttribute('aria-busy') === 'false';
  }, null, { timeout: TIMEOUT });
  return page.evaluate(() => {
    const probe = globalThis.__c6BusyProbe;
    probe?.observer.disconnect();
    return probe?.values ?? [];
  });
}

async function selectCity(page, id = 'place', query = 'New York') {
  const input = page.locator(`#${id}`);
  await input.fill(query);
  const option = page.locator(`#${id}-list [role="option"]:not([aria-disabled="true"])`).first();
  await option.waitFor({ state: 'visible', timeout: TIMEOUT });
  await option.click();
  await page.locator(`#${id}[readonly]`).waitFor({ state: 'visible', timeout: TIMEOUT });
}

async function submitAndWait(page) {
  await installBusyProbe(page);
  await page.locator('.calc__form button[type="submit"]').click();
  const busy = await finishBusyProbe(page);
  await page.locator('.calc__result').waitFor({ state: 'visible', timeout: TIMEOUT });
  return busy;
}

async function activeElement(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      class: el.className,
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
    };
  });
}

async function formSnapshot(page) {
  return page.locator('.calc__form').evaluate((form) => {
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    return {
      ariaBusy: form.getAttribute('aria-busy'),
      fields: Array.from(form.querySelectorAll('input, select, button[type="submit"]')).map((field, index) => ({
        key: field.id || `${field.tagName.toLowerCase()}-${field.getAttribute('type') ?? 'select'}-${index}`,
        tag: field.tagName.toLowerCase(),
        type: field.getAttribute('type') ?? '',
        required: 'required' in field ? field.required : false,
        disabled: 'disabled' in field ? field.disabled : false,
        readOnly: 'readOnly' in field ? field.readOnly : false,
        value: field instanceof HTMLButtonElement ? normalize(field.textContent ?? '') : field.value,
        label: 'labels' in field && field.labels?.length
          ? normalize(Array.from(field.labels).map((label) => label.textContent ?? '').join(' '))
          : '',
      })),
    };
  });
}

async function resultSnapshot(page) {
  const result = page.locator('.calc__result');
  const text = await result.innerText();
  return {
    heading: cleanText((await result.locator('h2[tabindex="-1"]').first().textContent()) ?? ''),
    textHash: hashText(text),
    structure: await result.evaluate((node) => ({
      notices: node.querySelectorAll('[role="status"], .notice').length,
      tables: node.querySelectorAll('table').length,
      wheels: node.querySelectorAll('svg.wheel').length,
      buttons: node.querySelectorAll('button').length,
      links: node.querySelectorAll('a').length,
      listItems: node.querySelectorAll('li').length,
    })),
  };
}

async function hookSnapshot(page) {
  return page.evaluate(() => ({
    shareLink: document.querySelectorAll('[data-share-link]').length,
    shareCard: document.querySelectorAll('[data-share-card]').length,
    inviteLink: document.querySelectorAll('[data-invite-link]').length,
    manualUrl: document.querySelectorAll('.calc__share-url').length,
  }));
}

async function assertResultFocus(page, route) {
  await page.waitForFunction(() => {
    const heading = document.querySelector('.calc__result h2[tabindex="-1"]');
    return heading !== null && document.activeElement === heading;
  }, null, { timeout: TIMEOUT }).catch(() => {});
  const focused = await page.evaluate(() => {
    const heading = document.querySelector('.calc__result h2[tabindex="-1"]');
    return heading !== null && document.activeElement === heading;
  });
  assert.equal(focused, true, `${route} must focus its result heading after submit`);
}

async function copyFallback(page, hook, fragmentKey) {
  await page.locator(hook).click();
  const input = page.locator('.calc__share-url');
  await input.waitFor({ state: 'visible', timeout: TIMEOUT });
  const raw = await input.inputValue();
  const url = new URL(raw);
  assert.equal(url.hash.startsWith(`#${fragmentKey}=1.`), true, `${hook} must expose a v1 fragment fallback`);
  return {
    attempted: await page.evaluate(() => globalThis.__clipboardWrites?.length ?? 0),
    path: url.pathname,
    fragmentPrefix: url.hash.slice(0, 5),
    inputReadOnly: await input.getAttribute('readonly') !== null,
  };
}

async function runCase(browser, baseURL, definition) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(({ fixedNow, profileKey, profile }) => {
    const NativeDate = Date;
    const fixed = new NativeDate(fixedNow).valueOf();
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
    localStorage.setItem(profileKey, JSON.stringify(profile));
    globalThis.__clipboardWrites = [];
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get() {
        return {
          writeText(value) {
            globalThis.__clipboardWrites.push(value);
            return Promise.reject(new DOMException('Parity fallback', 'NotAllowedError'));
          },
        };
      },
    });
  }, { fixedNow: FIXED_NOW, profileKey: PROFILE_KEY, profile: PROFILE });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console:${message.text()}`);
  });

  try {
    const details = await definition.run(page, baseURL);
    assert.deepEqual(errors, [], `${definition.id} emitted browser errors`);
    return { id: definition.id, route: definition.route, ...details };
  } finally {
    await context.close();
  }
}

const CASES = [
  {
    id: 'birth-full',
    route: '/birth-chart/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, `${this.route}${kahloFragment()}`);
      await page.locator('.calc__result').waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.waitForFunction(() => document.querySelector('.calc__form')?.getAttribute('aria-busy') === 'false');
      assert.equal(new URL(page.url()).hash, '', 'received birth fragment must be stripped');
      assert.equal(await page.locator('#birth-date').inputValue(), '1907-07-06');
      assert.equal(await page.locator('#birth-time').inputValue(), '08:30');
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      const focusAfterSubmit = await activeElement(page);
      const fallback = await copyFallback(page, '[data-share-link]', 'c');
      return {
        busy,
        focusAfterSubmit,
        focusAfterCopy: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        hooks: await hookSnapshot(page),
        copyFallback: fallback,
        fragmentStripped: new URL(page.url()).hash === '',
      };
    },
  },
  {
    id: 'moon-sign',
    route: '/moon-sign/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      const submitInitiallyDisabled = await page.locator('.calc__form button[type="submit"]').isDisabled();
      await page.locator('#birth-date').fill('1990-06-15');
      await page.locator('#birth-time').fill('08:30');
      await selectCity(page);
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      return {
        submitInitiallyDisabled,
        busy,
        focusAfterSubmit: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        hooks: await hookSnapshot(page),
      };
    },
  },
  {
    id: 'rising-sign',
    route: '/rising-sign/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      const submitInitiallyDisabled = await page.locator('.calc__form button[type="submit"]').isDisabled();
      await page.locator('#birth-date').fill('1990-06-15');
      await page.locator('#birth-time').fill('08:30');
      await selectCity(page);
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      return {
        submitInitiallyDisabled,
        busy,
        focusAfterSubmit: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        hooks: await hookSnapshot(page),
      };
    },
  },
  {
    id: 'moon-phase',
    route: '/moon-phase/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      const submitInitiallyDisabled = await page.locator('.calc__form button[type="submit"]').isDisabled();
      await page.locator('#mp-date').fill('1990-06-15');
      await page.locator('#mp-time').fill('08:30');
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      return {
        submitInitiallyDisabled,
        busy,
        focusAfterSubmit: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        hooks: await hookSnapshot(page),
      };
    },
  },
  {
    id: 'baby-zodiac',
    route: '/baby-zodiac/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      const date = page.locator('.calc__form input[type="date"]');
      const required = await date.getAttribute('required') !== null;
      await date.fill('2026-07-20');
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      return {
        required,
        busy,
        focusAfterSubmit: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        hooks: await hookSnapshot(page),
      };
    },
  },
  {
    id: 'saturn-return',
    route: '/saturn-return/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      const submitInitiallyDisabled = await page.locator('.calc__form button[type="submit"]').isDisabled();
      await page.locator('#sr-date').fill('1990-06-15');
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      return {
        submitInitiallyDisabled,
        busy,
        focusAfterSubmit: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        seasons: await page.locator('.sr__season').count(),
        hooks: await hookSnapshot(page),
      };
    },
  },
  {
    id: 'synastry',
    route: '/compatibility/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      await page.locator('#syn-a-source').waitFor({ state: 'visible', timeout: TIMEOUT });
      const submitInitiallyDisabled = await page.locator('.calc__form button[type="submit"]').isDisabled();
      await page.locator('#syn-a-source').selectOption('chart-frida');
      await page.locator('#syn-b-source').selectOption('chart-alex');
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      const focusAfterSubmit = await activeElement(page);
      const fallback = await copyFallback(page, '[data-invite-link]', 'a');
      return {
        submitInitiallyDisabled,
        busy,
        focusAfterSubmit,
        focusAfterCopy: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        hooks: await hookSnapshot(page),
        copyFallback: fallback,
      };
    },
  },
  {
    id: 'transits',
    route: '/transits/',
    async run(page, baseURL) {
      await openRoute(page, baseURL, this.route);
      await page.locator('#trans-source').waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.waitForFunction(() => document.querySelector('#trans-source')?.value === 'chart-frida');
      await page.locator('#trans-when').fill('2026-07-10');
      const busy = await submitAndWait(page);
      await assertResultFocus(page, this.route);
      return {
        selectedSavedChart: await page.locator('#trans-source').inputValue(),
        busy,
        focusAfterSubmit: await activeElement(page),
        form: await formSnapshot(page),
        result: await resultSnapshot(page),
        skyPositions: await page.locator('.trans__pos').count(),
        hooks: await hookSnapshot(page),
      };
    },
  },
];

const executablePath = await findChromium();
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

const transcript = {
  schema: 'zodiacs.c6-parity.v1',
  fixedNow: FIXED_NOW,
  cases: [],
};

try {
  await withPreview({ port: Number(process.env.C6_PARITY_PORT ?? 4331) }, async (baseURL) => {
    for (const definition of CASES) {
      transcript.cases.push(await runCase(browser, baseURL, definition));
    }
  });
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(transcript, null, 2)}\n`);
