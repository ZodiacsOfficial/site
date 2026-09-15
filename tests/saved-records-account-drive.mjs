/**
 * Saved calculation records under the REAL account coordinator. Requires a
 * fixture build with PUBLIC_SAVED_RECORDS_ENABLED=1,
 * PUBLIC_ACCOUNT_SYNC_V2_ENABLED=1, PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK=1 and
 * the fixture Supabase origin below (see tests/saved-records-account.mjs).
 *
 * The real AccountProfileAccessBootstrap, AccountSyncV2Panel, pre-hydration
 * profile-access reader, Web Locks leases and exclusive transitions run
 * unchanged. Only the auth origin and the account API are intercepted with
 * synthetic identities; no request leaves loopback. Journeys: bind an empty
 * browser and sign out keeping the device; a guest record before sign-in,
 * the hand-off decision and "clear all Zodiacs data"; confirmed account
 * deletion with browser removal; an account change while a removal is
 * pending; an enabled records module that fails to load; a namespace admitted
 * between a clear-all's observation and its exclusive transition.
 *
 *   OUT_DIR=tests/visual/artifacts/saved-records-account node tests/saved-records-account-drive.mjs
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { recordHelpers } from './saved-records-browser-lib.mjs';
import { findChromium, isSiteFooterIconTeardownAbort, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

export const FIXTURE_SUPABASE_ORIGIN = 'https://saved-records-test.supabase.co';
const AUTH_KEY = 'sb-saved-records-test-auth-token';
const OUT = resolve(process.env.OUT_DIR ?? 'tests/visual/artifacts/saved-records-account');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const GRANT_KEY = 'zodiacs.account-sync-v2.profile-access.v1';
const OWNER_KEY = 'zodiacs.account-sync-v2.local-owner.v1';
const RETAINED_KEY = 'zodiacs.account-sync-v2.retained-owner.v1';
const REVOKE_KEY = 'zodiacs.account-sync-v2.profile-lease-revoke.v1';
const DATABASE = 'zodiacs-saved-natal-v1';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const results = [];
let browser;
let base;
let gotoChart, computeKnownTime, waitKeepState, keep, downloadBytes, waitRecordsSettled, gotoProfile, recordCount, durableRows;

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function session(userId, email) {
  return {
    access_token: [base64url({ alg: 'HS256', typ: 'JWT' }), base64url({ aud: 'authenticated', exp: 4102444800, sub: userId }), 'synthetic-signature'].join('.'),
    refresh_token: `synthetic-refresh-${userId.slice(0, 8)}`,
    expires_at: 4102444800,
    expires_in: 2147483647,
    token_type: 'bearer',
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-09-01T00:00:00.000Z' },
  };
}
const SESSION_A = session(A, 'a.synthetic@example.com');
const SESSION_B = session(B, 'b.synthetic@example.com');

/**
 * One context = one synthetic browser. The fixture auth origin and the
 * account API are answered here; everything else off the preview origin is
 * refused and reported. Routing also disables the HTTP cache, so a chunk that
 * is blocked later in a journey is really re-requested.
 */
async function newContext(options = {}) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const blocked = [];
  const calls = [];
  const errors = [];
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: body === undefined ? '' : JSON.stringify(body) });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith(FIXTURE_SUPABASE_ORIGIN)) {
      const { pathname } = new URL(url);
      calls.push(`${request.method()} ${pathname}`);
      if (pathname === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
      if (pathname === '/auth/v1/user') return json(route, 200, SESSION_A.user);
      blocked.push(url);
      return json(route, 404, { error: 'unexpected auth request' });
    }
    if (url.startsWith(`${base}/api/`)) {
      const { pathname } = new URL(url);
      calls.push(`${request.method()} ${pathname}`);
      const body = request.postDataJSON?.() ?? {};
      if (pathname === '/api/account/bootstrap') return json(route, 200, { outcome: 'ready', chart_sync_consent: 'pending' });
      if (pathname === '/api/account/delete-prepare') {
        return json(route, 200, { outcome: 'prepared', requestId: body.requestId, preparedAt: '2026-09-15T08:00:00.000Z',
          expiresAt: '2026-09-22T08:00:00.000Z', dailySunRevoked: false, dailySunReconciliationRequired: false });
      }
      if (pathname === '/api/account/delete-status') {
        return json(route, 200, { outcome: 'prepared', requestId: body.requestId, preparedAt: '2026-09-15T08:00:00.000Z',
          expiresAt: '2026-09-22T08:00:00.000Z', completedAt: null, dailySunRevoked: false, dailySunReconciliationRequired: false });
      }
      if (pathname === '/api/account/delete-finish') {
        return json(route, 200, { outcome: 'completed', requestId: body.requestId, completedAt: '2026-09-15T08:00:05.000Z',
          dailySunRevoked: true, dailySunReconciliationRequired: false });
      }
      blocked.push(url);
      return json(route, 404, { error: 'unexpected api request' });
    }
    if (url.startsWith(base)) {
      if (options.blockRecordsModule && /\/_astro\/saved-record-access\.[^/]+\.js$/u.test(url)) { blocked.push(url); return route.abort(); }
      return route.continue();
    }
    blocked.push(url);
    return route.abort();
  });
  context.on('page', (page) => {
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('requestfailed', (request) => {
      if (isSiteFooterIconTeardownAbort(request)) return;
      if (options.blockRecordsModule && /saved-record-access/u.test(request.url())) return;
      errors.push(`requestfailed ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
    });
  });
  return { context, blocked, calls, errors };
}

const only = process.env.ONLY ?? '';
async function check(name, run) {
  if (only && !name.includes(only)) return;
  const start = Date.now();
  let detail;
  try {
    detail = await run();
    results.push({ name, passed: true, detail, ms: Date.now() - start });
  } catch (error) {
    results.push({ name, passed: false, error: String(error?.stack ?? error), ms: Date.now() - start });
  }
  console.log(`${results.at(-1).passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!results.at(-1).passed) console.log(results.at(-1).error.split('\n').slice(0, 14).map((line) => `  ${line}`).join('\n'));
}

/** Signs a synthetic identity in the way the real client reads it: the persisted session, picked up on the next navigation. */
async function signIn(page, nextSession) {
  await page.goto(`${base}/`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: AUTH_KEY, value: nextSession });
}
const grantMode = (page) => page.evaluate((key) => { try { return JSON.parse(sessionStorage.getItem(key))?.mode ?? null; } catch { return null; } }, GRANT_KEY);
const waitGrant = (page, mode) => page.waitForFunction(({ key, mode }) => {
  try { return JSON.parse(sessionStorage.getItem(key))?.mode === mode && window.zodiacsProfileAccess.canRead(); } catch { return false; }
}, { key: GRANT_KEY, mode });
const ownerMarker = (page) => page.evaluate((key) => { try { return JSON.parse(localStorage.getItem(key))?.accountId ?? null; } catch { return null; } }, OWNER_KEY);
const retainedMarker = (page) => page.evaluate((key) => { try { return JSON.parse(localStorage.getItem(key))?.accountId ?? null; } catch { return null; } }, RETAINED_KEY);
const signedIn = (page) => page.evaluate((key) => localStorage.getItem(key) !== null, AUTH_KEY);
const zodiacsKeys = (page) => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) => key.startsWith('zodiacs')).sort());
const accountMessage = (page) => page.textContent('#profile-sync .pf-sync__message').catch(() => '');
async function waitAccountReady(page) {
  await page.waitForSelector('#profile-sync button:text-is("Sign out · clear all Zodiacs data")');
}
async function waitAccountMessage(page, pattern) {
  await page.waitForFunction((source) => new RegExp(source, 'u').test(document.querySelector('#profile-sync .pf-sync__message')?.textContent ?? ''), pattern.source);
  return accountMessage(page);
}

/** Binds an empty browser to A through the real bootstrap, keeps one record for A, returns the receipt bytes. */
async function bindAndKeep(page, input) {
  await signIn(page, SESSION_A);
  await computeKnownTime(page, input);
  await waitGrant(page, 'account');
  assert.equal(await ownerMarker(page), A, 'the bootstrap must bind the empty browser to A');
  await waitKeepState(page, ['idle']);
  assert.match(await page.textContent('#calculation-record-scope'), /signed-in account/u);
  const receipt = await downloadBytes(page, '[data-download-calculation-receipt]');
  assert.equal(await keep(page), 'kept');
  return receipt;
}

try {
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: await findChromium(), headless: true, args: STABLE_CHROMIUM_ARGS });
  await withPreview({ port: 4412 }, async (baseURL) => {
    base = baseURL;
    ({ gotoChart, computeKnownTime, waitKeepState, keep, downloadBytes, waitRecordsSettled, gotoProfile, recordCount, durableRows } = recordHelpers(base));

    await check('real coordinator: bind an empty browser, keep for the account, sign out keeping this device: retained read-only with the exact bytes', async () => {
      const { context, blocked, calls, errors } = await newContext();
      const page = await context.newPage();
      const receipt = await bindAndKeep(page);
      assert.equal(await gotoProfile(page), 'ready');
      assert.equal(await recordCount(page), 1);
      await waitAccountReady(page);
      assert.ok(calls.includes('POST /api/account/bootstrap'), `bootstrap call expected: ${calls.join(', ')}`);
      await page.click('#profile-sync button:text-is("Sign out · keep this device")');
      // The real sign-out: retained marker, auth session removed, retained grant re-issued by the bootstrap.
      await waitGrant(page, 'retained');
      assert.ok(calls.includes('POST /auth/v1/logout'), 'sign-out must reach the auth origin');
      assert.equal(await signedIn(page), false);
      assert.equal(await ownerMarker(page), A);
      assert.equal(await retainedMarker(page), A);
      await page.waitForSelector('[data-records-retained]');
      await page.waitForFunction(() => document.querySelector('[data-saved-records-state]')?.getAttribute('data-saved-records-state') === 'ready');
      assert.equal(await recordCount(page), 1);
      const retained = await downloadBytes(page, '[data-record-download]');
      assert.equal(sha(retained.bytes), sha(receipt.bytes), 'retained download must be the exact receipt');
      await computeKnownTime(page, { date: '1985-03-02', time: '09:15', place: 'Paris' });
      await waitGrant(page, 'retained');
      assert.equal(await waitKeepState(page, ['read-only']), 'read-only');
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await context.close();
      return { calls, sha256: sha(receipt.bytes) };
    });

    await check('real coordinator: a guest record before sign-in needs the hand-off decision; "clear all Zodiacs data" then removes every namespace', async () => {
      const { context, blocked, calls, errors } = await newContext();
      const page = await context.newPage();
      // Signed out: the bootstrap grants the unowned device; a guest record is kept.
      await computeKnownTime(page);
      await waitGrant(page, 'unowned');
      assert.equal(await keep(page), 'kept');
      // Sign in as A: the real bootstrap discovers the guest record and does not bind; the panel asks.
      await signIn(page, SESSION_A);
      await page.goto(`${base}/profile/`);
      await page.waitForSelector('#account-boundary-heading');
      assert.match(await page.textContent('[data-records-boundary]'), /One calculation record was kept on this device before sign-in/u);
      assert.equal(await ownerMarker(page), null, 'no binding before the decision');
      assert.equal(await waitRecordsSettled(page), 'locked');
      await page.click('#profile-sync button:text-is("Keep for individual selection")');
      // The decision completes under the exclusive transition and reloads bound to A.
      await page.waitForFunction((key) => { try { return JSON.parse(localStorage.getItem(key))?.accountId; } catch { return null; } }, OWNER_KEY);
      await waitGrant(page, 'account');
      assert.equal(await waitRecordsSettled(page), 'ready');
      assert.equal(await recordCount(page), 0, 'guest records are never listed to the account');
      await page.waitForSelector('[data-records-hidden-guest="1"]');
      await computeKnownTime(page, { date: '1985-03-02', time: '09:15', place: 'Paris' });
      await waitGrant(page, 'account');
      assert.equal(await keep(page), 'kept');
      let rows = await durableRows(page);
      assert.deepEqual(rows.records.map((row) => row.ownerKey.split(':')[0]).sort(), ['account', 'guest']);
      assert.equal(await gotoProfile(page), 'ready');
      await waitAccountReady(page);
      await page.click('#profile-sync button:text-is("Sign out · clear all Zodiacs data")');
      // Whole-device: both namespaces erased under the transition, legacy stores cleared, session ended, page reloaded unowned.
      await waitGrant(page, 'unowned');
      await page.waitForFunction((key) => localStorage.getItem(key) === null, AUTH_KEY);
      assert.equal(await ownerMarker(page), null);
      assert.equal(await retainedMarker(page), null);
      rows = await durableRows(page);
      assert.deepEqual(rows.records, [], 'clear-all must purge every record');
      assert.deepEqual(rows.admissions, [{ target: '*', generation: 1, status: 'erased' }]);
      assert.equal(await waitRecordsSettled(page), 'ready');
      await page.waitForSelector('[data-records-empty="erased"]');
      assert.deepEqual((await zodiacsKeys(page)).filter((key) => key !== GRANT_KEY), [], 'no Zodiacs storage may survive clear-all beyond the fresh unowned grant');
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await context.close();
      return { calls };
    });

    await check('real coordinator: confirmed account deletion with browser removal erases only the account namespace; guest records stay', async () => {
      const { context, blocked, calls, errors } = await newContext();
      const page = await context.newPage();
      await computeKnownTime(page);
      await waitGrant(page, 'unowned');
      assert.equal(await keep(page), 'kept');
      await signIn(page, SESSION_A);
      await page.goto(`${base}/profile/`);
      await page.waitForSelector('#account-boundary-heading');
      await page.click('#profile-sync button:text-is("Keep for individual selection")');
      await waitGrant(page, 'account');
      await computeKnownTime(page, { date: '1985-03-02', time: '09:15', place: 'Paris' });
      await waitGrant(page, 'account');
      assert.equal(await keep(page), 'kept');
      assert.equal(await gotoProfile(page), 'ready');
      assert.equal(await recordCount(page), 1);
      await waitAccountReady(page);
      await page.click('#profile-sync details.pf-account-v2__delete summary');
      await page.fill('#account-delete-confirmation', 'DELETE');
      assert.equal(await page.isChecked('#profile-sync details.pf-account-v2__delete input[type="checkbox"]'), true, 'browser removal is the default');
      await page.click('#profile-sync button:text-is("Permanently delete account")');
      const message = await waitAccountMessage(page, /deleted|removed/u);
      assert.doesNotMatch(message, /could not finish/u);
      assert.ok(calls.includes('POST /api/account/delete-prepare') && calls.includes('POST /api/account/delete-finish'), calls.join(', '));
      // Signed out; the browser is unowned again and the guest record is what remains.
      await page.waitForFunction((key) => localStorage.getItem(key) === null, AUTH_KEY);
      await waitGrant(page, 'unowned');
      assert.equal(await ownerMarker(page), null);
      const rows = await durableRows(page);
      assert.deepEqual(rows.records.map((row) => row.ownerKey.split(':')[0]), ['guest'], 'only the deleted account namespace is removed');
      assert.deepEqual(rows.admissions.find((row) => row.target === `account:${A}`), { target: `account:${A}`, generation: 1, status: 'erased' });
      await page.waitForFunction(() => document.querySelector('[data-saved-records-state]')?.getAttribute('data-saved-records-state') === 'ready'
        && document.querySelector('[data-records-count]')?.getAttribute('data-records-count') === '1');
      assert.match(await page.textContent('[data-record-id]'), /1990-06-15/u);
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await context.close();
      return { calls, message };
    });

    await check('real coordinator: an account change while a removal is pending locks the tab and drops the pending feedback', async () => {
      const { context, blocked, calls, errors } = await newContext();
      const page = await context.newPage();
      await bindAndKeep(page);
      assert.equal(await gotoProfile(page), 'ready');
      await waitAccountReady(page);
      assert.equal(await recordCount(page), 1);
      // Another tab signs in as B the moment A's purge commits: the persisted
      // session changes and the client's own cross-tab channel announces it.
      await page.evaluate(({ authKey, sessionB, database }) => {
        const original = IDBDatabase.prototype.transaction;
        let writes = 0;
        IDBDatabase.prototype.transaction = function (...args) {
          const transaction = original.apply(this, args);
          if (this.name === database && transaction.mode === 'readwrite' && ++writes === 2) {
            IDBDatabase.prototype.transaction = original;
            transaction.addEventListener('complete', () => {
              localStorage.setItem(authKey, JSON.stringify(sessionB));
              new BroadcastChannel(authKey).postMessage({ event: 'SIGNED_IN', session: sessionB });
            }, { once: true });
          }
          return transaction;
        };
      }, { authKey: AUTH_KEY, sessionB: SESSION_B, database: DATABASE });
      await page.click('[data-records-remove-all]');
      await page.click('[data-records-remove-all]');
      // The real bootstrap revokes A's lease and refuses to bind B over A's browser; the panel asks.
      await page.waitForSelector('#account-boundary-heading');
      assert.match(await page.textContent('#profile-sync'), /belong to a different signed-in account/u);
      await page.waitForFunction(() => document.querySelector('[data-saved-records-state]')?.getAttribute('data-saved-records-state') === 'locked');
      await page.waitForFunction(() => !document.querySelector('[data-records-remove-all][disabled]') && !document.querySelector('[data-records-message]'));
      assert.equal(await page.$('[data-records-message]'), null, 'A\'s removal feedback must not be shown once the tab is B\'s');
      assert.equal(await ownerMarker(page), A);
      const rows = await durableRows(page);
      assert.deepEqual(rows.records, [], 'the removal itself committed');
      assert.deepEqual(rows.admissions.find((row) => row.target === `account:${A}`), { target: `account:${A}`, generation: 1, status: 'erased' });
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await context.close();
      return { calls };
    });

    await check('real coordinator: an enabled records module that fails to load stops "clear all Zodiacs data"; nothing is removed', async () => {
      const { context, blocked, calls, errors } = await newContext();
      const page = await context.newPage();
      await bindAndKeep(page);
      assert.equal(await gotoProfile(page), 'ready');
      await waitAccountReady(page);
      await context.close();
      // A fresh browser bound the same way, whose records module is lost from the very first request.
      const failing = await newContext({ blockRecordsModule: true });
      const other = await failing.context.newPage();
      await other.goto(`${base}/`);
      await other.evaluate(({ authKey, sessionA, ownerKey, accountId }) => {
        localStorage.setItem(authKey, JSON.stringify(sessionA));
        localStorage.setItem(ownerKey, JSON.stringify({ version: 1, accountId }));
      }, { authKey: AUTH_KEY, sessionA: SESSION_A, ownerKey: OWNER_KEY, accountId: A });
      await other.goto(`${base}/profile/`);
      await waitGrant(other, 'account');
      assert.equal(await waitRecordsSettled(other), 'unavailable');
      assert.ok(failing.blocked.some((url) => /saved-record-access/u.test(url)), 'the records module request must have been refused');
      await waitAccountReady(other);
      await other.evaluate(() => { window.__sameDocument = true; });
      await other.click('#profile-sync button:text-is("Sign out · clear all Zodiacs data")');
      const message = await waitAccountMessage(other, /could not be prepared for removal safely/u);
      assert.match(message, /nothing was removed/u);
      assert.match(message, /Sign-out was stopped/u);
      assert.equal(await other.evaluate(() => window.__sameDocument === true), true, 'a refused clear-all must not reload');
      assert.equal(await signedIn(other), true, 'the session must remain');
      assert.equal(await ownerMarker(other), A);
      assert.ok(!failing.calls.includes('POST /auth/v1/logout'), 'no sign-out request may be sent');
      assert.deepEqual(failing.blocked.filter((url) => !/saved-record-access/u.test(url)), []);
      assert.deepEqual(failing.errors, []);
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await failing.context.close();
      return { message, refusedRequests: failing.blocked.length };
    });

    await check('real coordinator: a namespace admitted between a clear-all observation and its exclusive transition is refused, not skipped', async () => {
      const { context, blocked, calls, errors } = await newContext();
      const panel = await context.newPage();
      await signIn(panel, SESSION_A);
      assert.equal(await gotoProfile(panel), 'ready');
      await waitGrant(panel, 'account');
      assert.equal(await recordCount(panel), 0);
      await waitAccountReady(panel);
      const calculator = await context.newPage();
      await computeKnownTime(calculator);
      await waitGrant(calculator, 'account');
      await waitKeepState(calculator, ['idle']);
      assert.equal((await durableRows(panel)).present, false, 'no database before the observation');
      // The panel's pre-transition observation sees an absent database; the
      // calculator tab's keep lands right after that observation and before
      // the transition's lease revocation, after which the real rows are read.
      await panel.exposeFunction('__keepElsewhere', async () => { assert.equal(await keep(calculator), 'kept'); });
      await panel.evaluate(({ database, revokeKey }) => {
        const databases = IDBFactory.prototype.databases;
        let stalled = false;
        IDBFactory.prototype.databases = async function (...args) {
          const real = await databases.apply(this, args);
          if (!window.__staleAbsent) return real;
          if (!stalled) { stalled = true; await window.__keepElsewhere(); }
          return real.filter((entry) => entry.name !== database);
        };
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === revokeKey) window.__staleAbsent = false;
          return setItem.call(this, key, value);
        };
        window.__staleAbsent = true;
        window.__sameDocument = true;
      }, { database: DATABASE, revokeKey: REVOKE_KEY });
      await panel.click('#profile-sync button:text-is("Sign out · clear all Zodiacs data")');
      const message = await waitAccountMessage(panel, /Sign-out was stopped and nothing else was removed/u);
      assert.match(message, /could not be prepared for removal safely/u);
      assert.equal(await panel.evaluate(() => window.__sameDocument === true && window.__staleAbsent === false), true, 'the transition must have run and the page must not reload');
      assert.equal(await signedIn(panel), true);
      assert.ok(!calls.includes('POST /auth/v1/logout'), 'no sign-out request may be sent');
      const rows = await durableRows(panel);
      assert.equal(rows.records.length, 1, 'the record admitted in between must survive a refused clear-all');
      assert.deepEqual(rows.admissions.map((row) => row.status), ['active', 'active']);
      // The refusal is honest: after a reload the record is listed, and a fresh clear-all observes it and removes it.
      assert.equal(await gotoProfile(panel), 'ready');
      await waitGrant(panel, 'account');
      assert.equal(await recordCount(panel), 1);
      await waitAccountReady(panel);
      await panel.click('#profile-sync button:text-is("Sign out · clear all Zodiacs data")');
      await waitGrant(panel, 'unowned');
      assert.deepEqual((await durableRows(panel)).records, []);
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await context.close();
      return { message };
    });
  });
} finally {
  await browser?.close();
  const report = { completedAt: new Date().toISOString(), node: process.version, fixtureOrigin: FIXTURE_SUPABASE_ORIGIN, results,
    passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed).length };
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, 'result.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ file: resolve(OUT, 'result.json'), passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
}
