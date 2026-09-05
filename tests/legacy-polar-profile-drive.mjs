import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { legacyPolarFixture, installLegacyProfile, checkOriginalProfile, POLAR_REPAIR_VERSION } from './legacy-polar-fixture.mjs';

const TIMEOUT = 30_000;
const BODY_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node'];
const rounded = (lon) => Math.round(lon * 1000) / 1000 % 360;
const unpack = (token, prefix) => {
  assert.ok(token?.startsWith(prefix), `expected ${prefix} share token`);
  return JSON.parse(Buffer.from(token.slice(prefix.length), 'base64url').toString('utf8'));
};

// Independent aspect arithmetic over the committed sky, used to select an
// actual legacy birth whose repaired ASC is visible among Today's three rows.
// A square is excluded: reversing an angle leaves that aspect unchanged.
function rankedContacts(fixture, daily, asc = fixture.correctedAsc) {
  const natal = [...fixture.polar.summary.bodies,
    { body: 'ASC', lon: asc }, { body: 'MC', lon: fixture.legacy.angles.mc }];
  return daily.bodies.flatMap((moving) => natal.map((fixed) => {
    const raw = Math.abs(moving.lon - fixed.lon) % 360;
    const separation = Math.min(raw, 360 - raw);
    const aspect = [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]]
      .map(([type, angle]) => ({ type, orb: Math.abs(separation - angle) }))
      .sort((a, b) => a.orb - b.orb)[0];
    return { moving, fixed, ...aspect };
  })).filter(({ orb }) => orb <= 3).sort((a, b) => a.orb - b.orb
    || a.moving.body.localeCompare(b.moving.body) || a.fixed.body.localeCompare(b.fixed.body)).slice(0, 3);
}

function receipt({ moving, fixed, type, orb }) {
  return `${moving.body}${moving.retrograde ? ' Rx' : ''} ${type} natal ${fixed.body}${fixed.retrograde ? ' Rx' : ''} · ${orb.toFixed(1)}° from exact`;
}

async function open(page, url, selector) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, url);
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: TIMEOUT });
}

export async function driveLegacyPolarProfile({ browser, baseURL, check, outDir }) {
  const fixture = legacyPolarFixture();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'UTC' });
  await installLegacyProfile(context, fixture);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (outDir) await mkdir(outDir, { recursive: true });
  const shot = async (name) => {
    if (outDir) await page.screenshot({ path: `${outDir}/legacy-polar-${name}.png`, fullPage: true });
  };
  try {
    await open(page, `${baseURL}/profile/`, '.pf-chart');
    const saved = page.locator('.pf-chart').filter({ has: page.getByRole('heading', { name: fixture.polar.name, exact: true }) });
    const imported = page.locator('.pf-chart').filter({ has: page.getByRole('heading', { name: fixture.positionsOnly.name, exact: true }) });
    const rising = saved.locator('.pf-chip').filter({ hasText: 'Rising' });
    check('legacy polar Profile: restored identity has the corrected Aries rising position',
      await rising.getAttribute('href') === '/aries/' && await rising.getAttribute('title') === '23°52′ Aries');
    check('legacy polar Profile: positions-only record retains its supplied Libra angle',
      await imported.locator('.pf-chip').filter({ hasText: 'Rising' }).getAttribute('title') === '23°52′ Libra');
    await checkOriginalProfile(page, fixture, check, 'Profile');
    await shot('profile');

    await saved.getByRole('link', { name: 'Open', exact: true }).click();
    await page.locator('.calc__three .three-card').nth(2).waitFor({ state: 'visible', timeout: TIMEOUT });
    check('legacy polar natal: Profile handoff keeps the name and recomputes the same corrected ASC',
      (await page.locator('[data-chart-person]').textContent()).includes(fixture.polar.name)
      && (await page.locator('.calc__three .three-card').nth(2).locator('.three-card__deg').textContent()).trim() === '23°52′ Aries');
    await checkOriginalProfile(page, fixture, check, 'natal');
    await shot('natal');

    await open(page, `${baseURL}/today/`, '[data-today-state="chart"]');
    check('legacy polar Today: personalized reading preserves the restored chart identity',
      await page.locator('.today-reading__chart-name').getAttribute('title') === fixture.polar.name);
    await checkOriginalProfile(page, fixture, check, 'Today');

    await open(page, `${baseURL}/compatibility/`, '#syn-a-source');
    await page.locator('#syn-a-source').selectOption(fixture.polar.id);
    await page.locator('#syn-b-source').selectOption(fixture.positionsOnly.id);
    await page.locator('.calc__submit').click();
    await page.locator('.rwheel').waitFor({ state: 'visible', timeout: TIMEOUT });
    check('legacy polar synastry: both stored names reach the relationship wheel',
      (await page.locator('.tring__caption').textContent()).includes(fixture.polar.name)
      && (await page.locator('.tring__caption').textContent()).includes(fixture.positionsOnly.name));
    await page.locator('[data-relationship-tab="grid"]').click();
    check('legacy polar synastry: repaired ASC opposes the unchanged positions-only ASC',
      await page.locator('[data-grid-contact="ASC-opposition-ASC"]').count() === 1
      && await page.locator('[data-grid-contact="ASC-conjunction-ASC"]').count() === 0);
    await page.locator('.syn-sendback').getByRole('button', { name: /Copy/ }).click();
    await page.waitForFunction(() => typeof window.__polarClipboard === 'string', null, { timeout: TIMEOUT });
    const copied = await page.evaluate(() => window.__polarClipboard);
    const wrapper = unpack(new URLSearchParams(new URL(copied).hash.slice(1)).get('s'), 's1.');
    const [first, second] = wrapper.p.map((token) => unpack(token, '2.'));
    const expectedBodies = BODY_ORDER.map((body) => rounded(fixture.polar.summary.bodies.find((row) => row.body === body).lon));
    check('legacy polar synastry share: all positions, angles, house system and repair receipt agree',
      JSON.stringify(first.b) === JSON.stringify(expectedBodies)
      && JSON.stringify(first.a) === JSON.stringify([rounded(fixture.correctedAsc), rounded(fixture.legacy.angles.mc)])
      && first.h === 'w' && first.v === POLAR_REPAIR_VERSION
      && wrapper.l[0] === fixture.polar.name && wrapper.l[1] === fixture.positionsOnly.name);
    check('legacy polar synastry share: positions-only side retains its original angles and receipt',
      JSON.stringify(second.b) === JSON.stringify(expectedBodies)
      && JSON.stringify(second.a) === JSON.stringify([rounded(fixture.legacy.angles.asc), rounded(fixture.legacy.angles.mc)])
      && second.h === 'w' && second.v === '0.1.0');
    await checkOriginalProfile(page, fixture, check, 'synastry');
    await shot('synastry');

    await open(page, `${baseURL}/birth-chart/#p=${wrapper.p[1]}`, '[data-positions-only]');
    const ascRow = page.locator('[data-positions-only] tr').filter({ has: page.getByRole('cell', { name: 'ASC', exact: true }) });
    check('legacy polar positions receiver: shared Libra ASC remains read-only and unchanged',
      (await ascRow.textContent()).includes('23°52′') && (await ascRow.textContent()).includes('Libra')
      && (await page.locator('[data-positions-only] .calc__receipt').textContent()).includes('0.1.0'));
    await checkOriginalProfile(page, fixture, check, 'positions receiver');
    check('legacy polar chart routes have no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await context.close();
  }

  const daily = JSON.parse(await readFile(new URL('../src/data/daily.json', import.meta.url), 'utf8'));
  let today;
  let contacts;
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const candidate = legacyPolarFixture(minutes);
    if ((candidate.legacy.angles.asc - candidate.legacy.angles.mc + 360) % 360 < 180) continue;
    const ranked = rankedContacts(candidate, daily);
    if (ranked.some(({ fixed, type }) => fixed.body === 'ASC' && type !== 'square')) {
      today = candidate;
      contacts = ranked;
      break;
    }
  }
  assert.ok(today, `No real legacy polar birth exposes a discriminating ASC contact in ${daily.date}`);
  const todayContext = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  await installLegacyProfile(todayContext, today);
  try {
    const todayPage = await todayContext.newPage();
    await open(todayPage, `${baseURL}/today/`, '[data-today-state="chart"]');
    await todayPage.locator('.today-reading--resolved .today-method-details summary').click();
    const rows = await todayPage.locator('.today-reading--resolved .today-method-details li').allTextContents();
    const expected = contacts.map(receipt);
    const old = rankedContacts(today, daily, today.legacy.angles.asc).map(receipt);
    check('legacy polar Today: real daily contacts use the corrected ASC, not its opposite',
      JSON.stringify(rows.map((row) => row.trim())) === JSON.stringify(expected)
      && JSON.stringify(expected) !== JSON.stringify(old),
      `${today.polar.summary.utcISO}; ASC ${today.correctedAsc}; ${expected.join(' | ')}`);
    await checkOriginalProfile(todayPage, today, check, 'Today ASC');
    if (outDir) await todayPage.screenshot({ path: `${outDir}/legacy-polar-today-asc.png`, fullPage: true });
  } finally {
    await todayContext.close();
  }
}
