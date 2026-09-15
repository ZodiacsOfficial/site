/** Native IndexedDB acceptance for the inactive saved-record protocol (schema 3).
 * The production source is bundled unchanged. Faults abort real transactions at
 * request-success or commit boundaries; no in-memory storage adapter is used.
 * Run: node tests/saved-natal-storage-drive.mjs (OUT_DIR overrides evidence;
 * ENGINE=firefox runs the same cases in a Playwright-managed Firefox).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium, firefox } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';

const ENGINE = process.env.ENGINE === 'firefox' ? 'firefox' : 'chromium';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.env.OUT_DIR ?? resolve(root, 'tests/visual/artifacts/saved-natal-storage'));
const hash = value => createHash('sha256').update(value).digest('hex');
const sourcePaths = ['src/lib/profile/saved-record.ts', 'src/lib/profile/saved-record-store.ts', 'src/lib/profile/saved-record-access.ts'];
const source = await Promise.all(sourcePaths.map(async path => ({ path, sha256: hash(await readFile(resolve(root, path))) })));
const entry = `
export { SavedNatalStore, IndexedDbSavedNatalAdapter, SAVED_NATAL_DATABASE_NAME, SAVED_NATAL_SCHEMA_VERSION,
  MAX_SAVED_NATAL_OWNERS, savedNatalScopeState }
  from './src/lib/profile/saved-record-store';
export { computePortableChart } from './src/lib/engine/portable';
export { serializeNatalEnvelope } from '@zodiacs/engine/receipt';
export { prepareSavedRecordErasure, confirmSavedRecordsAbsent, eraseSavedRecords } from './src/lib/profile/saved-record-access';
`;
const bundled = await build({
  absWorkingDir: root, stdin: { contents: entry, resolveDir: root },
  bundle: true, write: false, format: 'iife', globalName: 'SavedNatalFixture',
  platform: 'browser', target: 'es2022', metafile: true, logLevel: 'silent',
  // The access module's browser defaults read build flags; the cases below pass explicit deps.
  define: { 'import.meta.env.PUBLIC_SAVED_RECORDS_ENABLED': '"1"' },
});
if (bundled.warnings.some(warning => /import\.meta/u.test(warning.text))) {
  throw new Error(`Fixture bundle left import.meta unresolved: ${bundled.warnings.map(warning => warning.text).join('; ')}`);
}

// This function is serialized as browser fixture code. Every value is synthetic.
function installNativeFixture() {
  const { SavedNatalStore, IndexedDbSavedNatalAdapter, SAVED_NATAL_DATABASE_NAME: DB, SAVED_NATAL_SCHEMA_VERSION: VERSION,
    MAX_SAVED_NATAL_OWNERS, savedNatalScopeState, computePortableChart, serializeNatalEnvelope,
    prepareSavedRecordErasure, confirmSavedRecordsAbsent, eraseSavedRecords } = window.SavedNatalFixture;
  const A = 'account:10000000-0000-4000-8000-000000000001';
  const B = 'account:20000000-0000-4000-8000-000000000002';
  const G = 'guest:30000000-0000-4000-8000-000000000003';
  const G2 = 'guest:50000000-0000-4000-8000-000000000005';
  const ID = '40000000-0000-4000-8000-000000000004';
  const DEVICE = '*';
  const handles = [];
  const insist = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, message) => insist(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  const value = result => { insist(result?.ok === true, `Expected success: ${JSON.stringify(result)}`); return result.value; };
  const failure = (result, ...codes) => {
    insist(result?.ok === false && codes.includes(result.code), `Expected ${codes}: ${JSON.stringify(result)}`);
    insist(!Object.hasOwn(result, 'value'), 'Failure returned private content');
    return result;
  };
  const envelope = (houseSystem = 'placidus', timeKnown = false) => computePortableChart({
    utc: '2001-12-21T08:30:00-00:00', latitude: 78.2232, longitude: 15.6267,
    houseSystem, timeKnown,
  }, { sourceInstant: '2001-12-21T08:30:00-00:00' }).envelope;
  const openRaw = (version, upgrade) => new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(DB) : indexedDB.open(DB, version);
    request.onupgradeneeded = () => upgrade?.(request.result, request);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(new Error('blocked'));
  });
  const exists = async () => (await indexedDB.databases()).some(entry => entry.name === DB);
  const snapshot = async () => {
    const db = await openRaw();
    try {
      const stores = [...db.objectStoreNames];
      const transaction = db.transaction(stores, 'readonly');
      const result = { version: db.version, stores, rows: {} };
      const done = new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error);
      });
      for (const name of stores) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => { result.rows[name] = request.result; };
      }
      await done;
      return result;
    } finally { db.close(); }
  };
  const rawPut = async (name, rows) => {
    const db = await openRaw();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(name, 'readwrite');
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error);
        for (const row of [].concat(rows)) transaction.objectStore(name).put(row);
      });
    } finally { db.close(); }
  };
  const ownRows = (state, owner = A) => state.rows.records.filter(row => row.ownerKey === owner);
  const admission = (state, target = A) => state.rows.admissions.find(row => row.target === target);
  const expectAdmission = (state, target, generation, status) => equal(admission(state, target), { target, generation, status }, 'Wrong durable admission row');
  /** A handle observing the exact current durable rows (or none when the database is absent). */
  const scopeFor = async ownerKey => {
    if (!await exists()) return { ownerKey, device: null, owner: null };
    const state = await snapshot();
    const pick = row => row ? { target: row.target, generation: row.generation, status: row.status } : null;
    return { ownerKey, device: pick(admission(state, DEVICE)), owner: pick(admission(state, ownerKey)) };
  };
  const bound = async (ownerKey = A, options = {}) => {
    const scope = options.scope ?? await scopeFor(ownerKey);
    const store = new SavedNatalStore({ scope, epoch: 1,
      readAuthority: () => ({ ownerKey, epoch: 1 }), ...options });
    handles.push(store);
    return store;
  };
  /** Explicit first save admits the owner; later saves need no admission. */
  const save = async (store, input = envelope()) => {
    const state = savedNatalScopeState(store.currentScope);
    return store.create(input, undefined, state === null ? {} : { admit: true });
  };
  const adapter = () => {
    const instance = new IndexedDbSavedNatalAdapter();
    handles.push({ revoke: () => instance.abortPending() });
    return instance;
  };

  // Hooks observe a native request before the production handler can run. The
  // transaction remains native, including rollback and cross-connection locks.
  const onRequest = (storeName, methods, action, options = {}) => {
    const originals = new Map(methods.map(method => [method, IDBObjectStore.prototype[method]]));
    let calls = 0;
    const skip = options.skip ?? 0;
    let seen = 0;
    for (const [method, original] of originals) {
      IDBObjectStore.prototype[method] = function (...args) {
        const request = original.apply(this, args);
        if (this.name === storeName && calls === 0 && (options.match?.(args[0]) ?? true)) {
          if (seen++ < skip) return request;
          calls++;
          const transaction = this.transaction;
          request.addEventListener('success', () => action(transaction), { once: true });
        }
        return request;
      };
    }
    return {
      count: () => calls,
      restore: () => { for (const [method, original] of originals) IDBObjectStore.prototype[method] = original; },
    };
  };
  const onWriteComplete = (action, options = {}) => {
    const original = IDBDatabase.prototype.transaction;
    let calls = 0;
    let seen = 0;
    IDBDatabase.prototype.transaction = function (...args) {
      const transaction = original.apply(this, args);
      if (this.name === DB && transaction.mode === 'readwrite' && calls === 0) {
        if (seen++ < (options.skip ?? 0)) return transaction;
        calls++;
        transaction.addEventListener('complete', action, { once: true });
      }
      return transaction;
    };
    return { count: () => calls, restore: () => { IDBDatabase.prototype.transaction = original; } };
  };
  const watchTransactions = () => {
    const original = IDBDatabase.prototype.transaction;
    const events = [];
    IDBDatabase.prototype.transaction = function (...args) {
      const transaction = original.apply(this, args);
      if (this.name === DB) events.push({ mode: transaction.mode, stores: [...transaction.objectStoreNames] });
      return transaction;
    };
    return { events, restore: () => { IDBDatabase.prototype.transaction = original; } };
  };
  const blockWrites = async () => {
    const db = await openRaw();
    const transaction = db.transaction(['records', 'admissions'], 'readwrite');
    let keepAlive = true;
    let ready;
    const acquired = new Promise(resolve => { ready = resolve; });
    const done = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    }).finally(() => db.close());
    const pump = () => {
      const request = transaction.objectStore('records').get([A, ID]);
      request.onsuccess = () => { ready(); if (keepAlive) pump(); };
    };
    pump();
    await acquired;
    return { release: () => { keepAlive = false; }, done };
  };
  /** The access module's erasure authority over this page's real database, account-free device mode. */
  const accessDeps = () => ({ enabled: true, accountSyncV2: false, accessAllowed: () => true,
    storage: { local: localStorage, session: sessionStorage }, randomUUID: () => crypto.randomUUID(), adapter });
  const access = { prepareSavedRecordErasure, confirmSavedRecordsAbsent, eraseSavedRecords };
  window.h = { A, B, G, G2, ID, DB, DEVICE, VERSION, MAX_SAVED_NATAL_OWNERS, insist, equal, value, failure, envelope,
    bound, save, scopeFor, adapter, openRaw, exists, snapshot, rawPut, ownRows, admission, expectAdmission, serializeNatalEnvelope,
    savedNatalScopeState, onRequest, onWriteComplete, watchTransactions, blockWrites, access, accessDeps,
    close: () => { for (const handle of handles) handle.revoke(); },
  };
}

const script = Buffer.concat([Buffer.from(bundled.outputFiles[0].contents), Buffer.from(`\n(${installNativeFixture.toString()})();\n`)]);
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Synthetic saved-record storage tests</title><script src="/fixture.js"></script>');
  } else if (pathname === '/fixture.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(script);
  } else { response.statusCode = 404; response.end(); }
});
let browser;
let origin;
const results = [];
const startedAt = new Date().toISOString();
async function newPage(context) {
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => !!window.h);
  return page;
}
async function group(name, run) {
  const context = await browser.newContext();
  const pageErrors = [];
  const unexpectedRequests = [];
  context.on('page', page => page.on('pageerror', error => pageErrors.push(String(error))));
  await context.route('**/*', route => {
    if (route.request().url().startsWith(origin + '/')) return route.continue();
    unexpectedRequests.push(route.request().url());
    return route.abort();
  });
  // Import-time behavior is observed before the fixture imports production code.
  await context.addInitScript(() => {
    window.savedNatalOpenCount = 0;
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      window.savedNatalOpenCount++;
      return original.apply(this, args);
    };
  });
  const start = performance.now();
  let timeout;
  try {
    const page = await newPage(context);
    const detail = await Promise.race([
      run(page, context),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Native case exceeded 30 seconds')), 30_000); }),
    ]);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(unexpectedRequests, []);
    results.push({ name, passed: true, detail, milliseconds: performance.now() - start });
  } catch (error) {
    results.push({ name, passed: false, error: String(error.stack ?? error), pageErrors, unexpectedRequests });
  } finally { clearTimeout(timeout); await context.close(); }
  console.log(JSON.stringify({ name, passed: results.at(-1).passed }));
}

try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = ENGINE === 'firefox'
    ? await firefox.launch({ headless: true })
    : await chromium.launch({ executablePath: await findChromium(), headless: true, args: STABLE_CHROMIUM_ARGS });

  await group('inert import, content-free discovery without creation, immutable receipt bytes', page => page.evaluate(async () => {
    const { insist, value, failure, envelope, bound, save, serializeNatalEnvelope, snapshot, adapter, exists, A } = h;
    insist(window.savedNatalOpenCount === 0, 'Import opened a database');
    insist(localStorage.length === 0 && sessionStorage.length === 0, 'Import wrote profile storage');
    const inventory = await adapter().inspect(A, () => {});
    h.equal(inventory, { absent: true, device: null, owner: null, guest: null, ownerRecords: 0, guestRecords: 0, pending: false, owners: 0 }, 'Discovery on a fresh browser');
    insist(window.savedNatalOpenCount === 0 && !await exists(), 'Discovery created a database');
    insist(value(await adapter().recoverPendingErasures()) === 0 && !await exists(), 'Recovery created a database');
    const unadmitted = await bound();
    failure(await unadmitted.list(), 'not-admitted');
    failure(await unadmitted.create(envelope()), 'not-admitted');
    insist(!await exists(), 'Refused operations created a database');
    const inputs = [envelope(), envelope('placidus', true), envelope('whole', true), envelope()];
    const records = [];
    for (const input of inputs) {
      const expected = serializeNatalEnvelope(input);
      const saved = value(await save(unadmitted, input)).record;
      insist(saved.envelopeJson === expected, 'Save altered receipt bytes');
      insist(value(await unadmitted.exportEnvelope(saved.id)) === expected, 'Export altered receipt bytes');
      insist(!expected.includes(A) && !expected.includes(saved.id), 'Envelope leaked local identity');
      records.push(saved);
    }
    insist(new Set(records.map(row => row.id)).size === inputs.length, 'Equivalent requests collapsed');
    const state = await snapshot();
    insist(state.version === h.VERSION && JSON.stringify(state.stores.slice().sort()) === JSON.stringify(['admissions', 'records']), 'Unexpected new database schema');
    h.expectAdmission(state, h.DEVICE, 1, 'active');
    h.expectAdmission(state, A, 1, 'active');
    insist(localStorage.length === 0 && sessionStorage.length === 0, 'Receipt persistence touched profile storage');
    const after = await adapter().inspect(A, () => {});
    h.equal(after, { absent: false, device: { target: h.DEVICE, generation: 1, status: 'active' }, owner: { target: A, generation: 1, status: 'active' }, guest: null, ownerRecords: 4, guestRecords: 0, pending: false, owners: 1 }, 'Inventory after saves');
    h.close();
    return { version: state.version, saved: records.length, exactBytes: true };
  }));

  await group('cap enforced across native connections', page => page.evaluate(async () => {
    const a = await h.bound(); h.value(await h.save(a));
    const b = await h.bound(); const sample = h.envelope();
    for (let index = 0; index < 38; index++) h.value(await a.create(sample));
    const results = await Promise.all([a.create(sample), b.create(sample)]);
    h.insist(results.filter(result => result.ok).length === 1, 'Cap race had wrong success count');
    h.insist(results.filter(result => !result.ok && result.code === 'full').length === 1, 'Cap race exceeded 40');
    h.insist(h.value(await a.list()).length === 40, 'Native count exceeded cap');
    h.close(); return { saved: 40 };
  }));

  await group('owner erasure fences existing and reopened handles until explicit readmission', page => page.evaluate(async () => {
    const a = await h.bound(); h.value(await h.save(a));
    const old = await h.bound(), b = await h.bound(h.B);
    const other = h.value(await h.save(b, h.envelope('whole', true))).record;
    h.value(await old.list());
    h.equal(await a.clearOwner(), { ok: true, value: 'erased' }, 'Owner erase');
    const reopened = await h.bound();
    for (const store of [old, reopened]) {
      failure(store, 'list', 'owner-erased'); failure(store, 'create', 'owner-erased'); failure(store, 'delete', 'owner-erased');
    }
    async function failure(store, method, code) {
      const result = method === 'list' ? await store.list() : method === 'create' ? await store.create(h.envelope()) : await store.delete(h.ID);
      h.failure(result, code);
    }
    let state = await h.snapshot();
    h.expectAdmission(state, h.A, 1, 'erased');
    h.insist(h.ownRows(state).length === 0, 'Erased owner rows survived');
    h.equal(h.value(await b.get(other.id)), other, 'Owner clear changed unrelated receipt');
    // Explicit readmission rotates the generation and admits nothing else.
    const readmitted = h.value(await reopened.create(h.envelope(), undefined, { admit: true }));
    h.equal(readmitted.scope.owner, { target: h.A, generation: 2, status: 'active' }, 'Readmission generation');
    state = await h.snapshot();
    h.expectAdmission(state, h.A, 2, 'active');
    h.insist(h.ownRows(state).length === 1, 'Readmission resurrected or lost rows');
    // Every pre-erasure callback is stale against the new generation.
    h.failure(await old.list(), 'stale');
    h.failure(await old.delete(readmitted.record.id), 'stale');
    h.failure(await old.create(h.envelope()), 'stale');
    h.failure(await old.clearOwner(), 'stale');
    state = await h.snapshot();
    h.expectAdmission(state, h.A, 2, 'active');
    h.equal(h.ownRows(state).map(row => row.id), [readmitted.record.id], 'Stale handle changed the new admission');
    h.close(); return { remainingOwners: [h.A, h.B], readmittedGeneration: 2 };
  }));

  await group('intent transaction abort preserves records and permits retry', page => page.evaluate(async () => {
    const store = await h.bound();
    const original = h.value(await h.save(store)).record;
    const hook = h.onRequest('admissions', ['put'], transaction => transaction.abort(), { match: key => key?.status === 'pending' });
    const retryHandle = await h.bound();
    let result;
    try { result = await retryHandle.clearOwner(); } finally { hook.restore(); }
    h.failure(result, 'aborted', 'storage-unavailable');
    h.insist(result.mayHaveCommitted === false, 'Intent abort reported committed intent');
    h.insist(hook.count() === 1, 'Did not abort native intent request');
    const state = await h.snapshot();
    h.equal(h.ownRows(state), [original], 'Intent abort removed a receipt');
    h.expectAdmission(state, h.A, 1, 'active');
    const retry = await h.bound();
    h.value(await retry.create(h.envelope('whole', true)));
    h.equal(await retry.clearOwner(), { ok: true, value: 'erased' }, 'Retry erase');
    h.expectAdmission(await h.snapshot(), h.A, 1, 'erased');
    h.close(); return { result, retried: true };
  }));

  await group('purge abort survives reload and recovers without read authority', async page => {
    const initial = await page.evaluate(async () => {
      const store = await h.bound(); const original = h.value(await h.save(store)).record;
      const other = await h.bound(h.B); const unaffected = h.value(await h.save(other, h.envelope('whole', true))).record;
      const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
      let result;
      try { result = await store.clearOwner(); } finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Purge abort hid committed intent');
      h.insist(hook.count() === 1, 'Did not abort native purge request');
      const state = await h.snapshot();
      h.expectAdmission(state, h.A, 1, 'pending');
      h.equal(h.ownRows(state), [original], 'Aborted purge partially deleted owner');
      h.failure(await (await h.bound()).list(), 'erasure-pending');
      h.failure(await (await h.bound()).create(h.envelope(), undefined, { admit: true }), 'erasure-pending');
      h.close(); return { result, unaffected };
    });
    await page.reload();
    await page.waitForFunction(() => !!window.h);
    const recovered = await page.evaluate(async unaffected => {
      h.failure(await (await h.bound(h.A, { readAuthority: () => null })).list(), 'access-denied');
      const recovery = h.adapter();
      h.insist(h.value(await recovery.recoverPendingErasures()) === 1, 'Reload recovery did not finish saved intent');
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 0, 'Recovery repeated completed intent');
      const state = await h.snapshot();
      h.expectAdmission(state, h.A, 1, 'erased');
      h.insist(h.ownRows(state).length === 0, 'Recovery retained erased receipts');
      h.equal(h.value(await (await h.bound(h.B)).get(unaffected.id)), unaffected, 'Recovery changed other owner bytes');
      h.failure(await (await h.bound()).list(), 'owner-erased');
      h.close(); return { recovered: 1, secondRecovery: 0, unrelatedBytesPreserved: true };
    }, initial.unaffected);
    return { initialFailure: initial.result, ...recovered };
  });

  await group('authority loss after intent commit retains recoverable intent', page => page.evaluate(async () => {
    let authority = { ownerKey: h.A, epoch: 1 };
    const seed = await h.bound(); h.value(await h.save(seed));
    const store = await h.bound(h.A, { readAuthority: () => authority });
    const hook = h.onWriteComplete(() => { authority = null; });
    let result;
    try { result = await store.clearOwner(); } finally { hook.restore(); }
    h.failure(result, 'stale');
    h.insist(result.mayHaveCommitted === true, 'Committed intent was reported as definitely uncommitted');
    h.insist(hook.count() === 1, 'Intent commit boundary not observed');
    h.expectAdmission(await h.snapshot(), h.A, 1, 'pending');
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Revoked clear could not recover');
    h.expectAdmission(await h.snapshot(), h.A, 1, 'erased');
    h.close(); return { result, recovered: true };
  }));

  await group('create commit ambiguity preserves exact receipt without retry', page => page.evaluate(async () => {
    const seed = await h.bound(); h.value(await h.save(seed));
    const store = await h.bound();
    h.value(await store.list());
    const expected = h.serializeNatalEnvelope(h.envelope('whole', true));
    const hook = h.onWriteComplete(() => store.revoke());
    let result;
    try { result = await store.create(h.envelope('whole', true)); } finally { hook.restore(); }
    h.failure(result, 'stale');
    h.insist(result.mayHaveCommitted === true, 'Committed create hid ambiguity');
    const rows = h.ownRows(await h.snapshot());
    h.insist(rows.length === 2 && rows.some(row => row.envelopeJson === expected), 'Committed create was lost, changed, or duplicated');
    h.close(); return { result, committedRows: rows.length };
  }));

  for (const separatePage of [false, true]) {
    await group(`queued erasure blocks ${separatePage ? 'second-page' : 'second-handle'} create`, async (page, context) => {
      // Handles capture their scope before the deliberate write blocker; a
      // fresh discovery would queue behind it exactly like any other reader.
      const writerScope = await page.evaluate(async () => {
        window.eraser = await h.bound();
        h.value(await h.save(eraser));
        window.blocker = await h.blockWrites();
        window.watch = h.watchTransactions();
        window.eraseResult = eraser.clearOwner();
        return eraser.currentScope;
      });
      await page.waitForFunction(() => window.watch.events.some(event => event.mode === 'readwrite'));
      const writerPage = separatePage ? await newPage(context) : page;
      await writerPage.evaluate(async writerScope => {
        window.writer = await h.bound(h.A, { scope: writerScope });
        window.writerWatch = h.watchTransactions();
        window.writeResult = writer.create(h.envelope('whole', true));
      }, writerScope);
      await writerPage.waitForFunction(() => window.writerWatch.events.some(event => event.mode === 'readwrite'));
      await page.evaluate(async () => { blocker.release(); await blocker.done; });
      const outcome = await writerPage.evaluate(async () => {
        const result = await writeResult;
        writerWatch.restore();
        h.failure(result, 'erasure-pending', 'owner-erased');
        return result;
      });
      await page.evaluate(async () => {
        h.equal(await eraseResult, { ok: true, value: 'erased' }, 'Queued erase');
        watch.restore();
        const state = await h.snapshot();
        h.expectAdmission(state, h.A, 1, 'erased');
        h.insist(h.ownRows(state).length === 0, 'Queued create resurrected erased owner');
      });
      if (separatePage) {
        await writerPage.evaluate(async () => {
          h.failure(await writer.list(), 'owner-erased');
          h.failure(await (await h.bound()).create(h.envelope()), 'owner-erased');
          h.close();
        });
      }
      await page.evaluate(() => h.close());
      return { outcome, separatePage, resurrectedRows: 0 };
    });
  }

  await group('device erasure covers every partition, removes owner admissions, and readmits owners anew', page => page.evaluate(async () => {
    const before = {};
    for (const owner of [h.A, h.B, h.G]) before[owner] = h.value(await h.save(await h.bound(owner))).record;
    const stale = await h.bound(h.A);
    h.equal(await h.adapter().erase(h.DEVICE, 1, 1, () => {}), { ok: true, value: 'erased' }, 'Device erase');
    let state = await h.snapshot();
    h.expectAdmission(state, h.DEVICE, 1, 'erased');
    h.insist(state.rows.records.length === 0, 'Device clear left an owner partition');
    h.insist(state.rows.admissions.length === 1, 'Device clear kept owner admission rows');
    for (const owner of [h.A, h.B, h.G]) {
      h.failure(await (await h.bound(owner)).list(), 'device-erased');
      h.failure(await (await h.bound(owner)).create(h.envelope()), 'device-erased');
    }
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 0, 'Erased device row was replayed');
    // Readmission of the device happens inside the first explicit save and admits only that owner.
    const readmitted = h.value(await (await h.bound(h.A)).create(h.envelope(), undefined, { admit: true }));
    h.equal(readmitted.scope, { ownerKey: h.A, device: { target: h.DEVICE, generation: 2, status: 'active' }, owner: { target: h.A, generation: 1, status: 'active' } }, 'Device readmission');
    h.failure(await (await h.bound(h.B)).list(), 'not-admitted');
    h.failure(await stale.list(), 'stale');
    h.failure(await stale.delete(readmitted.record.id), 'stale');
    state = await h.snapshot();
    h.insist(state.rows.admissions.length === 2 && h.ownRows(state).length === 1, 'Stale device-era handle affected the new admission');
    h.close(); return { partitions: 3, remaining: 0, deviceGeneration: 2 };
  }));

  await group('aborted device purge retains a global barrier across reload', async page => {
    await page.evaluate(async () => {
      for (const owner of [h.A, h.B, h.G]) h.value(await h.save(await h.bound(owner)));
      const before = await h.snapshot();
      const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
      let result;
      try { result = await h.adapter().erase(h.DEVICE, 1, 1, () => {}); } finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Device purge abort hid committed intent');
      h.insist(hook.count() === 1, 'Device purge fault was not applied');
      const after = await h.snapshot();
      h.expectAdmission(after, h.DEVICE, 1, 'pending');
      h.equal(after.rows.records, before.rows.records, 'Aborted global purge partially committed');
      h.equal(after.rows.admissions.filter(row => row.target !== h.DEVICE), before.rows.admissions.filter(row => row.target !== h.DEVICE), 'Aborted global purge changed owner rows');
      for (const owner of [h.A, h.B, h.G]) h.failure(await (await h.bound(owner)).list(), 'erasure-pending');
      h.close();
    });
    await page.reload();
    await page.waitForFunction(() => !!window.h);
    return page.evaluate(async () => {
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Global saved intent did not recover');
      const state = await h.snapshot();
      h.expectAdmission(state, h.DEVICE, 1, 'erased');
      h.insist(state.rows.records.length === 0 && state.rows.admissions.length === 1, 'Recovered global purge left rows');
      h.close(); return { recovered: 1, remaining: 0 };
    });
  });

  await group('device intent abort reports no committed intent', page => page.evaluate(async () => {
    h.value(await h.save(await h.bound()));
    const before = await h.snapshot();
    const hook = h.onRequest('admissions', ['put'], transaction => transaction.abort(), { match: key => key?.status === 'pending' });
    let result;
    try { result = await h.adapter().erase(h.DEVICE, 1, 1, () => {}); } finally { hook.restore(); }
    h.failure(result, 'aborted', 'storage-unavailable');
    h.insist(result.mayHaveCommitted === false, 'Aborted global intent reported committed');
    h.insist(hook.count() === 1, 'Global intent request was not aborted');
    h.equal(await h.snapshot(), before, 'Global intent abort changed persistent state');
    h.value(await (await h.bound()).create(h.envelope('whole', true)));
    h.close(); return { result, newWritesRemainAllowed: true };
  }));

  for (const all of [false, true]) {
    await group(`${all ? 'device' : 'owner'} acknowledgment abort rolls back the entire purge`, page => page.evaluate(async all => {
      const store = await h.bound(); h.value(await h.save(store));
      h.value(await h.save(await h.bound(h.B), h.envelope('whole', true)));
      const before = await h.snapshot();
      // The first put() writes pending intent; the erased acknowledgment is the
      // put() that follows every native deletion request.
      const hook = h.onRequest('admissions', ['put'], transaction => transaction.abort(), { match: key => key?.status === 'erased' });
      let result;
      try { result = all ? await h.adapter().erase(h.DEVICE, 1, 1, () => {}) : await store.clearOwner(); }
      finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Acknowledgment abort lost committed intent');
      h.insist(hook.count() === 1, 'Terminal acknowledgment was not intercepted');
      const after = await h.snapshot();
      h.expectAdmission(after, all ? h.DEVICE : h.A, 1, 'pending');
      h.equal(after.rows.records, before.rows.records, 'Acknowledgment abort committed partial deletion');
      h.insist(after.rows.admissions.length === before.rows.admissions.length, 'Acknowledgment abort committed partial owner-row deletion');
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Acknowledgment failure was not retryable');
      const recovered = await h.snapshot();
      h.expectAdmission(recovered, all ? h.DEVICE : h.A, 1, 'erased');
      h.insist(h.ownRows(recovered).length === 0, 'Retry left owner content');
      h.equal(h.ownRows(recovered, h.B), all ? [] : h.ownRows(before, h.B), 'Retry changed wrong owner partition');
      h.close(); return { result, originalRowsRolledBack: before.rows.records.length, retryCompleted: true };
    }, all));
  }

  await group('owner completion cannot acknowledge a pending device erasure', page => page.evaluate(async () => {
    for (const owner of [h.A, h.B, h.G]) h.value(await h.save(await h.bound(owner)));
    const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
    try { h.failure(await h.adapter().erase(h.DEVICE, 1, 1, () => {}), 'aborted', 'storage-unavailable'); }
    finally { hook.restore(); }
    h.expectAdmission(await h.snapshot(), h.DEVICE, 1, 'pending');
    // A separately authorized owner erase can finish, but it cannot remove or
    // acknowledge the older device intent while other partitions remain.
    h.equal(await h.adapter().erase(h.A, 1, 1, () => {}), { ok: true, value: 'erased' }, 'Owner erase under device intent');
    const partial = await h.snapshot();
    h.expectAdmission(partial, h.A, 1, 'erased');
    h.expectAdmission(partial, h.DEVICE, 1, 'pending');
    h.insist(h.ownRows(partial).length === 0 && partial.rows.records.length === 2, 'Owner erase widened or missed scope');
    for (const owner of [h.A, h.B, h.G]) h.failure(await (await h.bound(owner)).list(), 'erasure-pending');
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Global retry was lost to owner acknowledgment');
    const completed = await h.snapshot();
    h.expectAdmission(completed, h.DEVICE, 1, 'erased');
    h.insist(completed.rows.records.length === 0 && completed.rows.admissions.length === 1, 'Global recovery left other owners');
    h.close(); return { isolatedOwnerCompletion: true, globalRecovered: true };
  }));

  await group('concurrent owner and device erasures preserve every durable fence', page => page.evaluate(async () => {
    for (const owner of [h.A, h.B, h.G]) h.value(await h.save(await h.bound(owner)));
    const a = h.adapter(), b = h.adapter(), device = h.adapter();
    const results = await Promise.all([a.erase(h.A, 1, 1, () => {}), b.erase(h.B, 1, 1, () => {}), device.erase(h.DEVICE, 1, 1, () => {})]);
    h.value(results[2]);
    const state = await h.snapshot();
    h.expectAdmission(state, h.DEVICE, 1, 'erased');
    h.insist(state.rows.records.length === 0, 'Concurrent erasures retained receipt data');
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 0, 'Concurrent acknowledgment left pending intents');
    for (const owner of [h.A, h.B, h.G]) h.failure(await (await h.bound(owner)).create(h.envelope()), 'device-erased', 'owner-erased');
    h.close(); return { results: results.map(result => result.ok ? result.value : result.code), remaining: 0 };
  }));

  await group('concurrent readmissions compare-and-swap so only one succeeds', page => page.evaluate(async () => {
    const seed = await h.bound(); h.value(await h.save(seed));
    h.equal(await seed.clearOwner(), { ok: true, value: 'erased' }, 'Seed erase');
    const first = await h.bound(), second = await h.bound();
    h.equal(first.currentScope.owner, { target: h.A, generation: 1, status: 'erased' }, 'Observed erased row');
    const results = await Promise.all([
      first.create(h.envelope(), undefined, { admit: true }),
      second.create(h.envelope('whole', true), undefined, { admit: true }),
    ]);
    const winners = results.filter(result => result.ok);
    h.insist(winners.length === 1, `Readmission race had ${winners.length} winners`);
    h.failure(results.find(result => !result.ok), 'stale');
    const state = await h.snapshot();
    h.expectAdmission(state, h.A, 2, 'active');
    h.insist(h.ownRows(state).length === 1, 'Readmission race duplicated records');
    // The loser re-observes the durable rows and continues under the new generation.
    const rejoined = await h.bound();
    h.value(await rejoined.create(h.envelope()));
    h.insist(h.value(await rejoined.list()).length === 2, 'Rejoined handle did not see the new admission');
    h.close(); return { winners: 1, generation: 2 };
  }));

  await group('a stale acknowledgment cannot erase or complete a newer admission', async (page, context) => {
    await page.evaluate(async () => {
      const store = await h.bound(); h.value(await h.save(store));
      const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
      try { h.failure(await store.clearOwner(), 'aborted', 'storage-unavailable'); } finally { hook.restore(); }
      h.expectAdmission(await h.snapshot(), h.A, 1, 'pending');
      window.late = h.adapter();
    });
    const other = await newPage(context);
    const recovered = await other.evaluate(async () => {
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Second page did not finish pending intent');
      const readmitted = h.value(await (await h.bound()).create(h.envelope('whole', true), undefined, { admit: true }));
      return readmitted.record.id;
    });
    return page.evaluate(async recovered => {
      // The first page still believes A is pending; its completion must be a no-op.
      await late.finishErasure(h.A);
      h.equal(await h.adapter().recoverPendingErasures(), { ok: true, value: 0 }, 'Late completion replayed');
      const state = await h.snapshot();
      h.expectAdmission(state, h.A, 2, 'active');
      h.equal(h.ownRows(state).map(row => row.id), [recovered], 'Late acknowledgment erased a newer admission');
      h.close(); return { lateCompletionNoOp: true };
    }, recovered);
  });

  await group('repeated erase/readmit cycles keep bounded metadata and monotonic generations', page => page.evaluate(async () => {
    const cycles = 25;
    for (let cycle = 1; cycle <= cycles; cycle++) {
      const store = await h.bound();
      h.value(await store.create(h.envelope(), undefined, { admit: true }));
      h.equal(await store.clearOwner(), { ok: true, value: 'erased' }, `Cycle ${cycle} erase`);
    }
    const state = await h.snapshot();
    h.insist(state.rows.admissions.length === 2, `Metadata grew to ${state.rows.admissions.length} rows`);
    h.expectAdmission(state, h.A, cycles, 'erased');
    h.expectAdmission(state, h.DEVICE, 1, 'active');
    h.insist(state.rows.records.length === 0, 'Cycle left records');
    h.close(); return { cycles, admissionRows: 2, generation: cycles };
  }));

  await group('generation exhaustion and owner capacity fail closed without evicting fences', page => page.evaluate(async () => {
    h.value(await h.save(await h.bound(h.B)));
    await h.rawPut('admissions', { target: h.A, generation: Number.MAX_SAFE_INTEGER, status: 'erased' });
    const exhausted = await h.bound(h.A);
    h.failure(await exhausted.create(h.envelope(), undefined, { admit: true }), 'unsupported-storage');
    let state = await h.snapshot();
    h.expectAdmission(state, h.A, Number.MAX_SAFE_INTEGER, 'erased');
    h.insist(h.ownRows(state).length === 0, 'Exhausted admission wrote a record');
    const owners = [];
    for (let index = 0; index < h.MAX_SAVED_NATAL_OWNERS - 2; index++) {
      const target = `account:${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`;
      owners.push({ target, generation: 1, status: 'active' });
    }
    await h.rawPut('admissions', owners);
    state = await h.snapshot();
    h.insist(state.rows.admissions.length === h.MAX_SAVED_NATAL_OWNERS + 1, 'Capacity fixture size');
    const newcomer = await h.bound(h.G);
    h.failure(await newcomer.create(h.envelope(), undefined, { admit: true }), 'owners-full');
    h.value(await (await h.bound(h.B)).create(h.envelope('whole', true)));
    h.failure(await (await h.bound(h.G)).list(), 'not-admitted');
    h.insist((await h.snapshot()).rows.admissions.length === h.MAX_SAVED_NATAL_OWNERS + 1, 'Capacity refusal changed metadata');
    // Above the bound (only reachable by tampering), already admitted scopes
    // keep working while discovery, admission and recovery fail closed.
    const survivor = await h.bound(h.B);
    await h.rawPut('admissions', { target: 'account:99999999-0000-4000-8000-000000000000', generation: 1, status: 'active' });
    h.value(await survivor.list());
    let discovery;
    try { await h.adapter().inspect(h.B, () => {}); discovery = 'allowed'; } catch { discovery = 'refused'; }
    h.insist(discovery === 'refused', 'Discovery accepted metadata above the bound');
    h.failure(await (await h.bound(h.G, { scope: { ownerKey: h.G, device: survivor.currentScope.device, owner: null } })).create(h.envelope(), undefined, { admit: true }), 'unsupported-storage');
    h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
    h.close(); return { exhaustionRefused: true, capacityRefused: true, overCapacityFailsClosed: true };
  }));

  await group('one guest namespace per device and content-free guest discovery', page => page.evaluate(async () => {
    const guest = await h.bound(h.G);
    h.value(await h.save(guest));
    h.failure(await (await h.bound(h.G2)).create(h.envelope(), undefined, { admit: true }), 'stale');
    const inventory = await h.adapter().inspect(h.A, () => {});
    h.equal(inventory, { absent: false, device: { target: h.DEVICE, generation: 1, status: 'active' }, owner: null,
      guest: { target: h.G, generation: 1, status: 'active' }, ownerRecords: 0, guestRecords: 1, pending: false, owners: 1 }, 'Guest discovery');
    h.insist(!JSON.stringify(inventory).includes('receipt'), 'Discovery exposed content');
    h.equal(await guest.clearOwner(), { ok: true, value: 'erased' }, 'Guest erase');
    h.failure(await (await h.bound(h.G2)).create(h.envelope(), undefined, { admit: true }), 'stale');
    h.value(await (await h.bound(h.G)).create(h.envelope(), undefined, { admit: true }));
    h.close(); return { singleGuest: true };
  }));

  await group('corrupt admission rows fail closed and remain intact', page => page.evaluate(async () => {
    const store = await h.bound();
    const original = h.value(await h.save(store)).record;
    const corrupt = { target: h.A, generation: 1, status: 'future-state', privateFixture: 'synthetic' };
    await h.rawPut('admissions', corrupt);
    h.failure(await store.list(), 'unsupported-storage');
    h.failure(await store.create(h.envelope()), 'unsupported-storage');
    h.failure(await store.delete(original.id), 'unsupported-storage');
    h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
    h.failure(await h.adapter().erase(h.A, 1, 1, () => {}), 'unsupported-storage');
    const state = await h.snapshot();
    h.equal(h.admission(state), corrupt, 'Corrupt row was normalized or discarded');
    h.equal(h.ownRows(state), [original], 'Corrupt row permitted receipt mutation');
    h.close(); return { rowPreserved: true, receiptPreserved: true };
  }));

  await group('schema v1 and unreleased v2 databases are refused intact', page => page.evaluate(async () => {
    const outcomes = [];
    for (const version of [1, 2]) {
      await new Promise(resolve => { const request = indexedDB.deleteDatabase(h.DB); request.onsuccess = resolve; request.onerror = resolve; });
      const db = await h.openRaw(version, database => {
        const records = database.createObjectStore('records', { keyPath: ['ownerKey', 'id'] });
        records.createIndex('ownerKey', 'ownerKey');
        if (version === 2) database.createObjectStore('erasures', { keyPath: 'target' });
      });
      db.close();
      const sentinel = { ownerKey: h.A, id: h.ID, schema: `synthetic-opaque-v${version}`, bytes: 'preserve exactly' };
      await h.rawPut('records', sentinel);
      if (version === 2) await h.rawPut('erasures', { target: h.B, status: 'complete' });
      const before = await h.snapshot();
      h.failure(await (await h.bound(h.A, { scope: { ownerKey: h.A, device: null, owner: null } })).create(h.envelope(), undefined, { admit: true }), 'unsupported-storage');
      h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
      h.failure(await h.adapter().erase(h.DEVICE, 0, 0, () => {}), 'unsupported-storage');
      let discovery;
      try { await h.adapter().inspect(h.A, () => {}); discovery = 'allowed'; } catch { discovery = 'refused'; }
      h.insist(discovery === 'refused', 'Discovery accepted an incompatible database');
      h.equal(await h.snapshot(), before, 'Refused database was upgraded or changed');
      outcomes.push({ version, preserved: true });
    }
    h.close(); return outcomes;
  }));

  await group('old v2 client and future v4 schema cannot write around schema 3', page => page.evaluate(async () => {
    h.value(await h.save(await h.bound()));
    // An old adapter requesting version 2 receives VersionError and never opens.
    let oldClient;
    try { await h.openRaw(2); oldClient = 'opened'; } catch (error) { oldClient = error?.name; }
    h.insist(oldClient === 'VersionError', `Old v2 client outcome ${oldClient}`);
    h.equal(h.ownRows(await h.snapshot()).length, 1, 'Old client attempt changed rows');
    // A newer schema created elsewhere is refused by this client and preserved.
    await new Promise(resolve => { const request = indexedDB.deleteDatabase(h.DB); request.onsuccess = resolve; request.onerror = resolve; });
    const db = await h.openRaw(4, database => {
      const records = database.createObjectStore('records', { keyPath: ['ownerKey', 'id'] });
      records.createIndex('ownerKey', 'ownerKey');
      database.createObjectStore('admissions', { keyPath: 'target' });
      database.createObjectStore('future', { keyPath: 'id' });
    });
    db.close();
    await h.rawPut('records', { ownerKey: h.A, id: h.ID, schema: 'synthetic-opaque-v4', bytes: 'preserve exactly' });
    const future = await h.snapshot();
    const admittedScope = { ownerKey: h.A, device: { target: h.DEVICE, generation: 1, status: 'active' }, owner: { target: h.A, generation: 1, status: 'active' } };
    h.failure(await (await h.bound(h.A, { scope: admittedScope })).list(), 'unsupported-storage');
    h.failure(await (await h.bound(h.A, { scope: { ownerKey: h.A, device: null, owner: null } })).create(h.envelope(), undefined, { admit: true }), 'unsupported-storage');
    h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
    h.equal(await h.snapshot(), future, 'Future database was changed');
    h.close(); return { oldClient, futurePreserved: true };
  }));

  await group('version 3 incompatible store shape remains intact', page => page.evaluate(async () => {
    const db = await h.openRaw(3, database => {
      const records = database.createObjectStore('records', { keyPath: ['ownerKey', 'id'] });
      records.createIndex('ownerKey', 'ownerKey');
      const admissions = database.createObjectStore('admissions', { keyPath: 'target' });
      admissions.createIndex('unexpected', 'status');
    });
    db.close();
    await h.rawPut('records', { ownerKey: h.A, id: h.ID, bytes: 'synthetic preservation control' });
    const before = await h.snapshot();
    h.failure(await (await h.bound(h.A, { scope: { ownerKey: h.A, device: null, owner: null } })).create(h.envelope(), undefined, { admit: true }), 'unsupported-storage');
    h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
    h.equal(await h.snapshot(), before, 'Incompatible shape changed');
    h.close(); return { preserved: true };
  }));

  await group('a blocked upgrade from another page closes this connection and fails closed', async (page, context) => {
    await page.evaluate(async () => {
      window.store = await h.bound();
      h.value(await h.save(store));
      window.watch = h.watchTransactions();
    });
    const other = await newPage(context);
    // The other page requests a newer schema; this page's live connection must yield.
    const upgrade = other.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open(h.DB, h.VERSION + 1);
      request.onblocked = () => { window.upgradeBlocked = true; };
      request.onupgradeneeded = () => { request.transaction.abort(); };
      request.onerror = () => resolve('aborted');
      request.onsuccess = () => { request.result.close(); resolve('upgraded'); };
    }));
    const outcome = await upgrade;
    assert.equal(outcome, 'aborted');
    return page.evaluate(async () => {
      // The production adapter closed on versionchange, so the old connection can no longer write.
      const result = await store.create(h.envelope('whole', true));
      watch.restore();
      const state = await h.snapshot();
      h.insist(state.version === h.VERSION, 'Aborted upgrade changed the schema version');
      h.insist(result.ok || result.code === 'stale', `Unexpected post-versionchange outcome ${JSON.stringify(result)}`);
      h.insist(h.ownRows(state).length === (result.ok ? 2 : 1), 'Post-versionchange write count disagrees with result');
      h.close(); return { postVersionChange: result.ok ? 'reopened' : result.code };
    });
  });

  await group('device erasure and same-owner readmission fence a device-era owner erasure and a pre-wipe ticket', page => page.evaluate(async () => {
    const early = await h.bound(); h.value(await h.save(early));
    h.value(await h.save(await h.bound(h.B)));
    // A ticket prepared before the wipe observes A at generation 1 under device generation 1.
    const preWipe = { target: h.A, expected: 1, expectedDevice: 1 };
    h.equal(await h.adapter().erase(h.DEVICE, 1, 1, () => {}), { ok: true, value: 'erased' }, 'Device erase');
    // The same owner string signs back in and keeps a calculation: A is generation 1 again, under device generation 2.
    const readmitted = h.value(await (await h.bound(h.A)).create(h.envelope('whole', true), undefined, { admit: true }));
    h.equal(readmitted.scope, { ownerKey: h.A, device: { target: h.DEVICE, generation: 2, status: 'active' }, owner: { target: h.A, generation: 1, status: 'active' } }, 'Readmission after wipe');
    // The device-era handle and the pre-wipe ticket both observed {device 1, A 1}; neither reaches the new namespace.
    h.failure(await early.clearOwner(), 'stale');
    h.failure(await h.adapter().erase(preWipe.target, preWipe.expected, preWipe.expectedDevice, () => {}), 'stale');
    let state = await h.snapshot();
    h.expectAdmission(state, h.A, 1, 'active');
    h.expectAdmission(state, h.DEVICE, 2, 'active');
    h.equal(h.ownRows(state).map(row => row.id), [readmitted.record.id], 'A stale owner erasure reached the readmitted namespace');
    // A capability that observed the current admission still clears it.
    h.equal(await (await h.bound(h.A)).clearOwner(), { ok: true, value: 'erased' }, 'Current-admission clear');
    state = await h.snapshot();
    h.expectAdmission(state, h.A, 1, 'erased');
    h.insist(h.ownRows(state).length === 0, 'Current clear left rows');
    h.close(); return { readmittedOwnerGeneration: 1, deviceGeneration: 2, staleErasures: 2 };
  }));

  await group('an adapter revocation while a write is queued reports the first cause and rolls back', page => page.evaluate(async () => {
    h.value(await h.save(await h.bound()));
    const before = await h.snapshot();
    const adapter = h.adapter();
    const store = await h.bound(h.A, { adapter });
    const original = IDBObjectStore.prototype.add;
    let hooked = 0;
    // The versionchange/onclose path: the adapter aborts its live transaction
    // while the add request is still pending; Chromium then fires AbortError on it.
    IDBObjectStore.prototype.add = function (...args) {
      const request = original.apply(this, args);
      if (this.name === 'records' && hooked++ === 0) adapter.abortPending();
      return request;
    };
    let result;
    try { result = await store.create(h.envelope('whole', true)); } finally { IDBObjectStore.prototype.add = original; }
    h.failure(result, 'stale');
    h.insist(result.mayHaveCommitted === false, 'Rolled-back write reported as possibly committed');
    h.insist(hooked === 1, 'Write hook was not applied');
    h.equal(await h.snapshot(), before, 'Aborted write changed persistent state');
    h.close(); return { code: result.code, mayHaveCommitted: result.mayHaveCommitted };
  }));

  await group('an aborted acknowledgment is recovered after reload without read authority', async page => {
    await page.evaluate(async () => {
      h.value(await h.save(await h.bound()));
      const hook = h.onRequest('admissions', ['put'], transaction => transaction.abort(), { match: key => key?.status === 'erased' });
      let result;
      try { result = await h.adapter().erase(h.A, 1, 1, () => {}); } finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Acknowledgment abort hid the committed intent');
      h.insist(hook.count() === 1, 'Acknowledgment fault was not applied');
      const state = await h.snapshot();
      h.expectAdmission(state, h.A, 1, 'pending');
      h.insist(h.ownRows(state).length === 1, 'Aborted acknowledgment lost or purged rows');
      h.close();
    });
    await page.reload();
    await page.waitForFunction(() => !!window.h);
    return page.evaluate(async () => {
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Acknowledgment-phase intent did not recover after reload');
      const state = await h.snapshot();
      h.expectAdmission(state, h.A, 1, 'erased');
      h.insist(h.ownRows(state).length === 0, 'Recovery left rows');
      h.close(); return { recovered: 1 };
    });
  });

  await group('an absence observed before the exclusive transition is re-checked under it and refuses a namespace admitted in between', page => page.evaluate(async () => {
    const { insist, equal, value, bound, save, snapshot, exists, ownRows, access, accessDeps, DEVICE, A } = h;
    const deps = accessDeps();
    // T1: the account panel observes an absent device before its exclusive transition.
    equal(await access.prepareSavedRecordErasure('device', deps), { status: 'absent' }, 'Fresh device is not absent');
    // Unchanged, the absence is confirmed under the transition without creating a database to learn it.
    equal(await access.confirmSavedRecordsAbsent('device', () => true, deps), { ok: true, value: 'absent' }, 'Unchanged absence not confirmed');
    insist(!await exists(), 'Confirming an absence created the database');
    // T2: another tab's explicit keep admits the device and an owner, with one record, before T1's transition.
    const record = value(await save(await bound())).record;
    // T3: under the transition the observation no longer holds; the whole-device clear refuses instead of skipping.
    equal(await access.confirmSavedRecordsAbsent('device', () => true, deps), { ok: false, code: 'stale', mayHaveCommitted: false }, 'Admitted namespace was not refused');
    equal(await access.confirmSavedRecordsAbsent({ accountId: A.slice('account:'.length) }, () => true, deps), { ok: false, code: 'stale', mayHaveCommitted: false }, 'Admitted owner was not refused');
    equal(await access.confirmSavedRecordsAbsent('guest', () => true, deps), { ok: true, value: 'absent' }, 'A still-absent guest namespace must confirm');
    let state = await snapshot();
    equal(ownRows(state).map(row => row.id), [record.id], 'A refusal must remove nothing');
    // The caller prepares a fresh ticket on its next attempt; that ticket pins the admitted generation and erases exactly it.
    const prepared = await access.prepareSavedRecordErasure('device', deps);
    equal(prepared, { status: 'ready', ticket: { target: DEVICE, expected: 1, expectedDevice: 1, guestRecords: 0 } }, 'Fresh observation did not pin the admitted generation');
    equal(await access.eraseSavedRecords(prepared.ticket, () => true, deps), { ok: true, value: 'erased' }, 'Pinned erasure failed');
    state = await snapshot();
    h.expectAdmission(state, DEVICE, 1, 'erased');
    insist(state.rows.records.length === 0 && state.rows.admissions.length === 1, 'Device erasure left rows or owner admissions');
    // An erased device with no owners is absent again; the caller's own authority ends the check before any read.
    equal(await access.confirmSavedRecordsAbsent('device', () => true, deps), { ok: true, value: 'absent' }, 'Erased device not absent');
    equal(await access.confirmSavedRecordsAbsent('device', () => false, deps), { ok: false, code: 'stale', mayHaveCommitted: false }, 'Lost authority not refused');
    h.close(); return { refused: 'stale', erased: 1 };
  }));

  await group('a device readmission racing a pre-wipe owner erasure yields exactly one durable outcome', page => page.evaluate(async () => {
    h.value(await h.save(await h.bound()));
    h.equal(await h.adapter().erase(h.DEVICE, 1, 1, () => {}), { ok: true, value: 'erased' }, 'Device erase');
    const readmitter = await h.bound(h.A);
    const [created, erased] = await Promise.all([
      readmitter.create(h.envelope('whole', true), undefined, { admit: true }),
      h.adapter().erase(h.A, 1, 1, () => {}),
    ]);
    const record = h.value(created).record;
    h.insist((erased.ok && erased.value === 'absent') || (!erased.ok && erased.code === 'stale'), `Pre-wipe erasure outcome ${JSON.stringify(erased)}`);
    const state = await h.snapshot();
    h.expectAdmission(state, h.DEVICE, 2, 'active');
    h.expectAdmission(state, h.A, 1, 'active');
    h.equal(h.ownRows(state).map(row => row.id), [record.id], 'Racing pre-wipe erasure reached the readmitted namespace');
    h.close(); return { erasure: erased.ok ? erased.value : erased.code };
  }));

  await mkdir(out, { recursive: true });
  const report = {
    startedAt, completedAt: new Date().toISOString(), node: process.version,
    engine: ENGINE, browser: await browser.version(), source, bundleSha256: hash(script),
    sourceInstrumented: false, faultModel: 'Native IndexedDB request-success aborts and commit-boundary authority revocation',
    results, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length,
  };
  await writeFile(resolve(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(out, 'bundle-inputs.json'), JSON.stringify(bundled.metafile, null, 2) + '\n');
  console.log(JSON.stringify({ file: resolve(out, 'result.json'), passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
