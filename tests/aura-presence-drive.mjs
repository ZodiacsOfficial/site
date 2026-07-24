import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const fixedNow = '2026-07-16T12:00:00.000Z';
const checkedAt = '2026-07-16T11:58:00.000Z';
const address = '11111111111111111111111111111111';
const expectedHoldings = [
  { sign: 'cancer', finish: 'pastel' },
  { sign: 'leo', finish: 'bronze' },
  { sign: 'scorpio', finish: 'silver' },
  { sign: 'aquarius', finish: 'gold', goldCount: '3' },
];
const expectedHeldSigns = expectedHoldings.map(({ sign }) => sign);
// A true v2 record: gold carries no count and migrates to one Masterwork.
const restoredAura = {
  version: 2,
  address,
  chain: 'solana',
  holdings: expectedHoldings.map(({ sign, finish }) => ({ sign, finish })),
  checkedAt,
  savedAt: '2026-07-16T11:59:00.000Z',
  expiresAt: '2026-07-17T11:59:00.000Z',
  chartId: 'aura-presence-fixture',
};
const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [{
    id: 'aura-presence-fixture',
    name: 'Private fixture name',
    createdAt: fixedNow,
    updatedAt: fixedNow,
    birth: { date: '1994-05-02', time: '12:00', timeKnown: true, place: null },
    summary: {
      engineVersion: 'fixture',
      utcISO: '1994-05-02T12:00:00.000Z',
      houseSystem: 'whole',
      bodies: [
        { body: 'Sun', lon: 42, retrograde: false },
        { body: 'Moon', lon: 105, retrograde: false },
        { body: 'Mercury', lon: 100, retrograde: false },
        { body: 'Venus', lon: 102, retrograde: false },
        { body: 'Mars', lon: 132, retrograde: false },
      ],
      angles: { asc: 190, mc: 100 },
      flags: [],
    },
  }],
};

// The owner's voice law plus the cabinet's own bans: planner register never
// ships, absence is never shouted, and the count grammar never goes metric.
const BANNED_PAGE_TEXT = [
  /illustrative/i,
  /the short version/i,
  /without the jargon/i,
  /new to crypto/i,
  /two-minute/i,
  /built into this page/i,
  /NOT REPRESENTED/,
  /×[\d.]+[KMBT]/,
  // System vocabulary stays internal; the page speaks plain collector English.
  /masterwork/i,
  /accession/i,
  /hallmark/i,
  /deterministic/i,
  /\bniches?\b/i,
  // The product is the Cabinet of Twelve; "aura" stays internal.
  /\baura\b/i,
];

function normalized(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

async function waitForSettledMotion(locator) {
  await locator.evaluate(async (node) => {
    const animations = node
      .getAnimations({ subtree: true })
      .filter((animation) => animation.playState === 'pending' || animation.playState === 'running');
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });
}

async function installState(context, storedProfile = profile, storedAura = null) {
  await context.addInitScript(({ storedProfile, storedAura, now }) => {
    if (storedProfile) {
      localStorage.setItem('zodiacs.profile.v1', JSON.stringify(storedProfile));
    }
    if (storedAura) {
      sessionStorage.setItem('zodiacs.aura.session.v2', JSON.stringify(storedAura));
    }
    const NativeDate = Date;
    const fixed = new NativeDate(now).valueOf();
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
    globalThis.__auraPaintedText = [];
    const nativeFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function captureAuraText(text, ...args) {
      globalThis.__auraPaintedText.push(String(text));
      return nativeFillText.call(this, text, ...args);
    };
  }, { storedProfile, storedAura, now: fixedNow });
}

async function talismanGeometry(page) {
  return page.locator('.aura-result [data-aura-talisman]').evaluate((talisman) => {
    const svg = talisman.querySelector('.aura-talisman__svg');
    const segments = Array.from(talisman.querySelectorAll('.aura-talisman__segments line'))
      .map((line) => ['x1', 'y1', 'x2', 'y2'].map((key) => line.getAttribute(key)).join(':'));
    const represented = Array.from(
      talisman.querySelectorAll('[data-aura-talisman-represented="true"]'),
    ).map((node) => node.getAttribute('data-aura-talisman-node'));
    return {
      mode: svg?.getAttribute('data-aura-talisman-mode'),
      full: svg?.getAttribute('data-aura-talisman-full'),
      segmentCount: talisman
        .querySelector('.aura-talisman__segments')
        ?.getAttribute('data-aura-talisman-segment-count'),
      segments,
      represented,
      skyMarks: talisman.querySelectorAll('[data-aura-talisman-sky]').length,
    };
  });
}

async function installCabinetStageRecorder(page) {
  await page.evaluate(() => {
    globalThis.__auraCabinetStageObserver?.disconnect();
    globalThis.__auraCabinetStages = [];
    let lastStage = '';
    let queued = false;
    const capture = () => {
      queued = false;
      const cabinet = document.querySelector('.aura-stage .aura-collection-cabinet');
      const stage = cabinet?.getAttribute('data-aura-cabinet-stage') || '';
      if (!cabinet || !stage || stage === lastStage) return;
      lastStage = stage;
      const materials = Object.fromEntries(
        Array.from(cabinet.querySelectorAll('[data-aura-cabinet-represented="true"]'))
          .map((item) => {
            // The pastel disc legitimately stays current beneath a struck rim;
            // the topmost current layer names the displayed edition.
            const layers = item.querySelectorAll('.aura-collection-cabinet__material.is-current');
            return [
              item.getAttribute('data-aura-cabinet-sign'),
              layers.length
                ? layers[layers.length - 1].getAttribute('data-aura-cabinet-material')
                : null,
            ];
          }),
      );
      globalThis.__auraCabinetStages.push({ stage, materials });
    };
    const scheduleCapture = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(capture);
    };
    const observer = new MutationObserver(scheduleCapture);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-aura-cabinet-stage', 'class'],
    });
    globalThis.__auraCabinetStageObserver = observer;
    scheduleCapture();
  });
}

async function recordedCabinetStages(page) {
  return page.evaluate(() => globalThis.__auraCabinetStages || []);
}

function stageCabinet(page) {
  return page.locator('.aura-stage .aura-collection-cabinet');
}

async function waitForStageSettled(page) {
  const cabinet = stageCabinet(page);
  await cabinet.waitFor();
  await page.waitForFunction(() => (
    document.querySelector('.aura-stage .aura-collection-cabinet')
      ?.getAttribute('data-aura-cabinet-stage') === 'settled'
  ));
  await waitForSettledMotion(cabinet);
  return cabinet;
}

async function waitForStageRevealStart(page) {
  // The stage remounts on a fresh accession; wait until the new cabinet has
  // actually left "settled" so the settled-wait below cannot pass on the
  // previous cabinet.
  await page.waitForFunction(() => (
    document.querySelector('.aura-stage .aura-collection-cabinet')
      ?.getAttribute('data-aura-cabinet-stage') !== 'settled'
  ));
}

async function waitForStageKicker(page, expected) {
  await page.waitForFunction((text) => (
    document.querySelector('.aura-stage .aura-collection-cabinet__kicker')
      ?.textContent?.trim() === text
  ), expected);
}

function assertUpgradeSequence(stages, label) {
  const names = stages.map(({ stage }) => stage);
  let cursor = -1;
  for (const expected of ['light', 'pastel', 'bronze', 'silver', 'gold', 'strike', 'settled']) {
    const next = names.indexOf(expected, cursor + 1);
    assert.ok(next > cursor, `${label} should progress through ${expected}: ${names.join(' -> ')}`);
    cursor = next;
  }

  const expectedAtStage = {
    pastel: { cancer: 'pastel', leo: 'pastel', scorpio: 'pastel', aquarius: 'pastel' },
    bronze: { cancer: 'pastel', leo: 'bronze', scorpio: 'bronze', aquarius: 'bronze' },
    silver: { cancer: 'pastel', leo: 'bronze', scorpio: 'silver', aquarius: 'silver' },
    gold: { cancer: 'pastel', leo: 'bronze', scorpio: 'silver', aquarius: 'gold' },
    settled: { cancer: 'pastel', leo: 'bronze', scorpio: 'silver', aquarius: 'gold' },
  };
  for (const [stage, expectedMaterials] of Object.entries(expectedAtStage)) {
    assert.deepEqual(
      stages.find((entry) => entry.stage === stage)?.materials,
      expectedMaterials,
      `${label} should show the correct material editions at ${stage}`,
    );
  }
}

async function assertSettledEditions(cabinet, label) {
  assert.equal(await cabinet.getAttribute('data-aura-cabinet-stage'), 'settled');
  const observed = await cabinet.locator('[data-aura-cabinet-finish]').evaluateAll((items) => (
    items.map((item) => {
      const layers = item.querySelectorAll('.aura-collection-cabinet__material.is-current');
      return {
        sign: item.getAttribute('data-aura-cabinet-sign'),
        finish: item.getAttribute('data-aura-cabinet-finish'),
        current: layers.length
          ? layers[layers.length - 1].getAttribute('data-aura-cabinet-material')
          : null,
      };
    })
  ));
  assert.deepEqual(
    observed,
    expectedHoldings.map(({ sign, finish }) => ({ sign, finish, current: finish })),
    `${label} should settle every represented sign at its verified edition`,
  );
}

async function assertCabinetCraft(cabinet, label) {
  const violations = await cabinet.locator('[data-aura-cabinet-sign]').evaluateAll((items) => (
    items.flatMap((item) => {
      const niche = item.querySelector('.aura-collection-cabinet__niche');
      const object = item.querySelector('.aura-collection-cabinet__object');
      const name = item.querySelector('.aura-collection-cabinet__name');
      if (!niche || !object || !name) return ['missing niche, object stage, or name'];
      const problems = [];
      const nicheRect = niche.getBoundingClientRect();
      const objectRect = object.getBoundingClientRect();
      const tolerance = 0.75;
      if (
        objectRect.left < nicheRect.left - tolerance
        || objectRect.right > nicheRect.right + tolerance
        || objectRect.top < nicheRect.top - tolerance
        || objectRect.bottom > nicheRect.bottom + tolerance
      ) {
        problems.push('object escapes its niche');
      }
      if (getComputedStyle(niche).overflow !== 'hidden') {
        problems.push('niche does not clip');
      }
      // A museum label never truncates the name of the work.
      if (name.scrollWidth > name.clientWidth + 1) {
        problems.push(`name truncates (${name.textContent})`);
      }
      return problems.length
        ? [`${item.getAttribute('data-aura-cabinet-sign')}: ${problems.join(', ')}`]
        : [];
    })
  ));
  assert.deepEqual(violations, [], `${label} must keep artwork clipped and names whole`);
}

async function assertHouseVoice(page, label) {
  const text = await page.locator('.aura-page').innerText();
  for (const banned of BANNED_PAGE_TEXT) {
    assert.doesNotMatch(text, banned, `${label} must not ship the banned register ${banned}`);
  }
}

async function verifyNoJavaScriptSample(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/collection/`, { waitUntil: 'domcontentloaded' });

  assert.equal(
    normalized(await page.locator('.aura-page__hero .kicker').innerText()).toLowerCase(),
    'the registry',
  );
  assert.equal(
    normalized(await page.locator('h1').innerText()),
    'See your Zodiac collection.',
  );
  // The address box server-renders inside the hero band, consumer-labelled.
  assert.equal(await page.locator('#aura-address').count(), 1);
  assert.equal(
    normalized(await page.locator('label[for="aura-address"]').innerText()),
    'Wallet address',
  );

  // The stage server-renders the curator's sample: no JavaScript, full case.
  const cabinet = stageCabinet(page);
  assert.equal(await cabinet.locator('[data-aura-cabinet-sign]').count(), 12);
  assert.equal(await cabinet.locator('[data-aura-cabinet-represented="true"]').count(), 4);
  assert.equal(await cabinet.locator('[data-zodiac-medallion]').count(), 4);
  assert.equal(await cabinet.locator('.aura-collection-cabinet__reserved-mark').count(), 8);
  assert.equal(
    normalized(await cabinet.locator('.aura-collection-cabinet__kicker').first().innerText()).toLowerCase(),
    'curator’s sample',
  );
  await assertSettledEditions(cabinet, 'the static sample stage');
  await assertCabinetCraft(cabinet, 'the 390px static sample stage');
  assert.equal(
    normalized(await page.locator('.aura-desk .aura-desk-details > summary').innerText()),
    'Wallet, storage, and method',
  );
  await assertHouseVoice(page, 'the no-JavaScript page');
  await context.close();
}

async function verifySampleAndLiveCollection(browser, baseURL) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await installState(context);
  const page = await context.newPage();
  const browserErrors = [];
  const productFailures = [];
  const failedResources = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
  });
  let lookups = 0;
  let requestKeys = [];
  await page.route('**/api/aura-holdings', async (route) => {
    lookups += 1;
    const body = JSON.parse(route.request().postData() || '{}');
    requestKeys = Object.keys(body).sort();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        chain: 'solana',
        heldSigns: expectedHeldSigns,
        holdings: expectedHoldings,
        checkedAt,
      }),
    });
  });

  await page.goto(`${baseURL}/registry/collection/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve('/tmp', 'zodiacs-registry-aura-cabinet-top.png') });
  assert.equal(await stageCabinet(page).locator('[data-aura-cabinet-sign]').count(), 12);
  // The sample opens on its principal work: the Gold Masterwork, not the
  // first pastel in zodiac order.
  assert.equal(
    await page.locator('.aura-stage [data-aura-cabinet-placard]').getAttribute('data-aura-cabinet-placard'),
    'aquarius',
  );

  await installCabinetStageRecorder(page);
  await page.locator('#aura-primer-example').click();
  await waitForStageRevealStart(page);
  await waitForStageKicker(page, 'Curator’s sample');
  const sampleCabinet = await waitForStageSettled(page);
  assertUpgradeSequence(await recordedCabinetStages(page), 'the explicitly opened sample');
  await assertSettledEditions(sampleCabinet, 'the explicitly opened sample');
  await assertCabinetCraft(sampleCabinet, 'the 390px opened sample');
  assert.equal(await page.locator('.aura-result__room--talisman [data-aura-talisman]').count(), 1);
  assert.match(
    normalized(await page.locator('.aura-result__room--talisman').innerText()),
    /The sample’s dated seal\./,
  );
  assert.equal(await page.locator('.aura-result__room--provenance [data-aura-ledger-sign]').count(), 4);
  assert.match(
    normalized(await page.locator('.aura-result__room--provenance').innerText()),
    /Curator’s sample — no address was looked up/,
  );
  assert.ok(
    await page.locator('.aura-result__room--talisman [data-aura-talisman-chart-echo]').count() > 0,
    'the finished sample should demonstrate the optional private echo layer',
  );
  assert.equal(await page.getByRole('button', { name: 'Share this collection' }).count(), 0);
  await assertHouseVoice(page, 'the opened sample');

  await page.getByRole('button', { name: 'Open my collection' }).click();
  await page.waitForFunction(() => (
    document.querySelector('#aura-status')?.textContent?.includes('Sample closed.')
  ));

  await installCabinetStageRecorder(page);
  await page.locator('#aura-address').fill(address);
  await page.getByRole('button', { name: 'Show my collection', exact: true }).click();
  await waitForStageRevealStart(page);
  await waitForStageKicker(page, 'Collection opened');
  const liveCabinet = await waitForStageSettled(page);
  assert.equal(lookups, 1);
  assert.deepEqual(requestKeys, ['address'], 'the holdings request may contain only the public address');
  assertUpgradeSequence(await recordedCabinetStages(page), 'a fresh public-address lookup');
  await assertSettledEditions(liveCabinet, 'a fresh public-address lookup');
  await assertCabinetCraft(liveCabinet, 'the 390px live cabinet');
  assert.match(
    normalized(await page.locator('#aura-status').innerText()),
    /4 official Zodiacs were found\./,
  );

  const talisman = page.locator('.aura-result__room--talisman');
  const provenance = page.locator('.aura-result__room--provenance');
  assert.equal(await talisman.locator('[data-aura-talisman]').count(), 1);
  assert.match(
    normalized(await talisman.innerText()),
    /The collection’s dated seal\./,
  );
  assert.equal(await provenance.locator('[data-aura-ledger-sign]').count(), 4);
  assert.match(normalized(await provenance.innerText()), /8 places remain reserved\./);
  assert.match(normalized(await provenance.innerText()), /Solana · checked July 16, 2026/);
  // The record keeps the exact figure in plain words.
  assert.match(normalized(await provenance.innerText()), /×3 sculptures/i);

  await waitForSettledMotion(page.locator('.aura-result'));

  const geometryBeforeSelection = await talismanGeometry(page);
  assert.deepEqual(geometryBeforeSelection, {
    mode: 'polygon',
    full: 'false',
    segmentCount: '4',
    segments: geometryBeforeSelection.segments,
    represented: expectedHeldSigns,
    skyMarks: 2,
  });
  assert.equal(geometryBeforeSelection.segments.length, 4);

  await stageCabinet(page).locator('[data-aura-cabinet-sign="leo"] button').click();
  await page.waitForFunction(() => (
    document.querySelector('.aura-stage [data-aura-cabinet-placard]')
      ?.getAttribute('data-aura-cabinet-placard') === 'leo'
  ));
  const placard = page.locator('.aura-stage [data-aura-cabinet-placard="leo"]');
  assert.match(await placard.innerText(), /Catalogue\s+Nº 05 \/ XII/i);
  assert.match(await placard.innerText(), /Bronze Edition/);
  assert.match(await placard.innerText(), /From 10,000 held/i);
  assert.match(await placard.innerText(), /set in a cast bronze rim and sealed II/);
  assert.match(await placard.innerText(), /Recorded July 16, 2026 UTC · Solana/);
  assert.deepEqual(
    await talismanGeometry(page),
    geometryBeforeSelection,
    'cabinet selection may update emphasis, but not the deterministic public seal',
  );

  const chartSelect = page.locator('#aura-result-chart');
  await chartSelect.selectOption(profile.charts[0].id);
  await page.getByText(/chart echo was added/i).waitFor();
  assert.equal(lookups, 1, 'adding a local chart must not re-query the public address');
  assert.ok(
    await talisman.locator('[data-aura-talisman-chart-echo]').count() > 0,
    'the saved chart should add private inner echo marks',
  );
  assert.match(await page.locator('.aura-result__chart-control').innerText(), /Private fixture name adds the inner echo marks/i);
  assert.equal(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('zodiacs.aura.session.v3') || 'null')?.chartId),
    profile.charts[0].id,
    'the stored session should retain the optional chart choice',
  );
  assert.deepEqual(
    await page.evaluate(() => {
      const record = JSON.parse(sessionStorage.getItem('zodiacs.aura.session.v3') || 'null');
      return record && {
        version: record.version,
        holdings: record.holdings,
        hasHeldSigns: Object.hasOwn(record, 'heldSigns'),
        hasAmounts: Object.keys(record).some((key) => /amount|balance|quantity/i.test(key)),
      };
    }),
    { version: 3, holdings: expectedHoldings, hasHeldSigns: false, hasAmounts: false },
    'v3 persistence should retain only the classified material editions',
  );
  assert.deepEqual(
    await talismanGeometry(page),
    geometryBeforeSelection,
    'the private chart layer must not change public collection geometry',
  );
  await page.screenshot({ path: resolve('/tmp', 'zodiacs-registry-aura-gallery-result.png') });

  const shareSection = page.locator('[data-aura-share-disclosure]');
  await shareSection.scrollIntoViewIfNeeded();
  assert.match(
    normalized(await shareSection.innerText()),
    /never the address/i,
  );
  await page.evaluate(() => { globalThis.__auraPaintedText = []; });
  const saveButton = shareSection.getByRole('button', { name: 'Share this collection', exact: true });
  await saveButton.waitFor({ state: 'visible' });
  assert.equal(await saveButton.isEnabled(), true);
  await saveButton.click();
  await page.locator('.aura-share-preview').waitFor();
  const painted = await page.evaluate(() => globalThis.__auraPaintedText);
  const paintedText = painted.join(' ');
  const paintedLower = paintedText.toLowerCase();
  for (const expected of [
    'collection seal',
    'the cabinet of twelve',
    'cancer',
    'leo',
    'scorpio',
    'aquarius',
  ]) {
    assert.equal(paintedLower.includes(expected), true, `share image should include ${expected}`);
  }
  assert.equal(paintedLower.includes('×3'), true, 'share image should carry the capped count grammar');
  for (const forbidden of [address, profile.charts[0].name, profile.charts[0].birth.date]) {
    assert.equal(paintedText.includes(forbidden), false, `share image must omit ${forbidden}`);
  }

  await page.screenshot({ path: resolve('/tmp', 'zodiacs-registry-aura-mobile-gallery.png'), fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    true,
    'the 390px Aura page must not overflow horizontally',
  );
  await assertHouseVoice(page, 'the live collection page');
  if (browserErrors.length > 0) {
    productFailures.push(
      `browser console failures (${browserErrors.join('; ')}); resources: ${failedResources.join(', ')}`,
    );
  }
  await context.close();
  return productFailures;
}

async function verifyReducedMotion(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/collection/`, { waitUntil: 'networkidle' });

  await assertSettledEditions(stageCabinet(page), 'the reduced-motion static sample');

  await installCabinetStageRecorder(page);
  await page.locator('#aura-primer-example').click();
  await page.waitForFunction(() => (
    document.querySelector('.aura-result__room--talisman [data-aura-talisman]') !== null
  ));
  const cabinet = await waitForStageSettled(page);
  assert.equal(
    await page.locator('.aura-result--gallery').evaluate((node) => getComputedStyle(node).animationName),
    'none',
  );
  const stages = await recordedCabinetStages(page);
  assert.equal(
    stages.some(({ stage }) => ['light', 'pastel', 'bronze', 'silver', 'gold', 'strike'].includes(stage)),
    false,
    `reduced motion should settle without upgrade stages: ${stages.map(({ stage }) => stage).join(' -> ')}`,
  );
  await assertSettledEditions(cabinet, 'the reduced-motion opened sample');
  assert.equal(
    await page.locator('.aura-result__room--talisman .aura-talisman__segments')
      .evaluate((node) => getComputedStyle(node).animationName),
    'none',
  );
  await context.close();
}

async function verifyRestoredCabinet(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 768, height: 900 },
    colorScheme: 'dark',
  });
  await installState(context, profile, restoredAura);
  const page = await context.newPage();
  let lookups = 0;
  await page.route('**/api/aura-holdings', async (route) => {
    lookups += 1;
    await route.abort();
  });

  await page.goto(`${baseURL}/registry/collection/`, { waitUntil: 'networkidle' });
  await waitForStageKicker(page, 'Collection restored');
  const cabinet = stageCabinet(page);
  assert.match(await page.locator('#aura-status').innerText(), /restored from this device/i);
  assert.equal(lookups, 0, 'restoring v2 material editions must not repeat the public lookup');
  await assertSettledEditions(cabinet, 'a restored v2 cabinet');
  await assertCabinetCraft(cabinet, 'the 768px restored cabinet');
  assert.equal(
    await page.locator('.aura-stage [data-aura-cabinet-stage="pastel"]').count(),
    0,
    'a restored cabinet must not replay the tier ascent',
  );
  await context.close();
}

async function verifyDesktopFold(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/registry/collection/`, { waitUntil: 'networkidle' });

  // The thesis and the case itself both land inside the first screen.
  const headline = await page.locator('.aura-page__hero h1').boundingBox();
  assert.ok(headline, 'hero headline must render');
  assert.ok(
    headline.y >= 0 && headline.y + headline.height <= 800,
    `the one-line thesis must sit fully inside a 1280x800 first screen (bottom at ${Math.round(headline.y + headline.height)}px)`,
  );
  const firstNiche = await page
    .locator('.aura-stage [data-aura-cabinet-sign="aries"] .aura-collection-cabinet__niche')
    .boundingBox();
  assert.ok(firstNiche, 'the stage cabinet must render');
  assert.ok(
    firstNiche.y + firstNiche.height <= 800,
    `the case's first register must be visible on the first screen (niche bottom at ${Math.round(firstNiche.y + firstNiche.height)}px)`,
  );

  const cabinet = stageCabinet(page);
  await assertSettledEditions(cabinet, 'the desktop static sample');
  await assertCabinetCraft(cabinet, 'the 1280px static sample');
  // The case owns the full width; its label hangs beneath it.
  const frame = await page.locator('.aura-stage .aura-collection-cabinet__frame').boundingBox();
  const placard = await page.locator('.aura-stage .aura-collection-cabinet__placard').boundingBox();
  assert.ok(
    frame && placard && placard.y >= frame.y + frame.height - 1,
    'the placard must sit beneath the full-width case',
  );
  assert.ok(
    frame && frame.width > 1000,
    `the case must own the container width (got ${frame && Math.round(frame.width)}px)`,
  );
  // The address box itself lands inside the first screen.
  const addressBox = await page.locator('#aura-address').boundingBox();
  assert.ok(
    addressBox && addressBox.y + addressBox.height <= 800,
    'the wallet-address box must sit inside the first screen',
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    true,
    'the desktop Aura page must not overflow horizontally',
  );
  await assertHouseVoice(page, 'the desktop page');
  await page.screenshot({ path: resolve('/tmp', 'zodiacs-registry-aura-desktop-cabinet.png') });
  await context.close();
}

const executablePath = await findChromium();
const browser = await chromium.launch({ executablePath, headless: true, args: STABLE_CHROMIUM_ARGS });
try {
  await withPreview({ port: 4331 }, async (baseURL) => {
    await verifyNoJavaScriptSample(browser, baseURL);
    const productFailures = await verifySampleAndLiveCollection(browser, baseURL);
    await verifyReducedMotion(browser, baseURL);
    await verifyRestoredCabinet(browser, baseURL);
    await verifyDesktopFold(browser, baseURL);
    assert.deepEqual(productFailures, [], 'the gallery browser verification found product regressions');
  });
} finally {
  await browser.close();
}

console.log('aura-presence-drive: one-stage cabinet, four material editions, light-to-strike reveal, principal-work placard, accession ledger, settled v2 restoration, dated seal, chart echoes, restricted preview, house voice, desktop fold, and reduced motion verified');
