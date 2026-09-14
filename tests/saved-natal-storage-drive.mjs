/** Native IndexedDB acceptance for the inactive saved-receipt prerequisite.
 * The production source is bundled unchanged. Faults abort real transactions at
 * request-success or commit boundaries; no in-memory storage adapter is used.
 * Run: node tests/saved-natal-storage-drive.mjs (OUT_DIR overrides evidence).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.env.OUT_DIR ?? resolve(root, 'tests/visual/artifacts/saved-natal-storage'));
const hash = value => createHash('sha256').update(value).digest('hex');
const sourcePaths = ['src/lib/profile/saved-record.ts', 'src/lib/profile/saved-record-store.ts'];
const source = await Promise.all(sourcePaths.map(async path => ({ path, sha256: hash(await readFile(resolve(root, path))) })));
const entry = `
export { SavedNatalStore, IndexedDbSavedNatalAdapter, SAVED_NATAL_DATABASE_NAME }
  from './src/lib/profile/saved-record-store';
export { computePortableChart } from './src/lib/engine/portable';
export { serializeNatalEnvelope } from '@zodiacs/engine/receipt';
`;
const bundled = await build({
  absWorkingDir: root, stdin: { contents: entry, resolveDir: root },
  bundle: true, write: false, format: 'iife', globalName: 'SavedNatalFixture',
  platform: 'browser', target: 'es2022', metafile: true, logLevel: 'silent',
});

// This function is serialized as browser fixture code. Every value is synthetic.
function installNativeFixture() {
  const { SavedNatalStore, IndexedDbSavedNatalAdapter, SAVED_NATAL_DATABASE_NAME: DB,
    computePortableChart, serializeNatalEnvelope } = window.SavedNatalFixture;
  const A = 'account:10000000-0000-4000-8000-000000000001';
  const B = 'account:20000000-0000-4000-8000-000000000002';
  const G = 'guest:30000000-0000-4000-8000-000000000003';
  const ID = '40000000-0000-4000-8000-000000000004';
  const handles = [];
  const insist = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, message) => insist(JSON.stringify(actual) === JSON.stringify(expected), message);
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
  const bound = (ownerKey = A, options = {}) => {
    const store = new SavedNatalStore({ ownerKey, epoch: 1,
      readAuthority: () => ({ ownerKey, epoch: 1 }), ...options });
    handles.push(store);
    return store;
  };
  const adapter = () => {
    const instance = new IndexedDbSavedNatalAdapter();
    handles.push({ revoke: () => instance.abortPending() });
    return instance;
  };
  const openRaw = (version, upgrade) => new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(DB) : indexedDB.open(DB, version);
    request.onupgradeneeded = () => upgrade?.(request.result);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
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
  const rawPut = async (name, row) => {
    const db = await openRaw();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(name, 'readwrite');
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error);
        transaction.objectStore(name).put(row);
      });
    } finally { db.close(); }
  };
  const ownRows = (state, owner = A) => state.rows.records.filter(row => row.ownerKey === owner);
  const marker = (state, target = A) => state.rows.erasures.find(row => row.target === target);
  const expectMarker = (state, target, status) => equal(marker(state, target), { target, status }, 'Wrong durable erasure marker');

  // Hooks observe a native request before the production handler can run. The
  // transaction remains native, including rollback and cross-connection locks.
  const onRequest = (storeName, methods, action) => {
    const originals = new Map(methods.map(method => [method, IDBObjectStore.prototype[method]]));
    let calls = 0;
    for (const [method, original] of originals) {
      IDBObjectStore.prototype[method] = function (...args) {
        const request = original.apply(this, args);
        if (this.name === storeName && calls === 0) {
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
  const onWriteComplete = action => {
    const original = IDBDatabase.prototype.transaction;
    let calls = 0;
    IDBDatabase.prototype.transaction = function (...args) {
      const transaction = original.apply(this, args);
      if (this.name === DB && transaction.mode === 'readwrite' && calls === 0) {
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
    const transaction = db.transaction(['records', 'erasures'], 'readwrite');
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
  window.h = { A, B, G, ID, DB, insist, equal, value, failure, envelope, bound, adapter,
    openRaw, snapshot, rawPut, ownRows, marker, expectMarker, serializeNatalEnvelope,
    onRequest, onWriteComplete, watchTransactions, blockWrites,
    close: () => { for (const handle of handles) handle.revoke(); },
  };
}

const script = Buffer.concat([Buffer.from(bundled.outputFiles[0].contents), Buffer.from(`\n(${installNativeFixture.toString()})();\n`)]);
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Synthetic saved-receipt storage tests</title><script src="/fixture.js"></script>');
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
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Native case exceeded 20 seconds')), 20_000); }),
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
  browser = await chromium.launch({ executablePath: await findChromium(), headless: true, args: STABLE_CHROMIUM_ARGS });

  await group('inert import and immutable receipt bytes', page => page.evaluate(async () => {
    const { insist, value, envelope, bound, serializeNatalEnvelope, snapshot, A } = h;
    insist(window.savedNatalOpenCount === 0, 'Import opened a database');
    insist(localStorage.length === 0 && sessionStorage.length === 0, 'Import wrote profile storage');
    const store = bound();
    const inputs = [envelope(), envelope('placidus', true), envelope('whole', true), envelope()];
    const records = [];
    for (const input of inputs) {
      const expected = serializeNatalEnvelope(input);
      const saved = value(await store.create(input));
      insist(saved.envelopeJson === expected, 'Save altered receipt bytes');
      insist(value(await store.exportEnvelope(saved.id)) === expected, 'Export altered receipt bytes');
      insist(!expected.includes(A) && !expected.includes(saved.id), 'Envelope leaked local identity');
      records.push(saved);
    }
    insist(new Set(records.map(row => row.id)).size === inputs.length, 'Equivalent requests collapsed');
    const state = await snapshot();
    insist(state.version === 2 && state.rows.erasures.length === 0, 'Unexpected new database schema');
    insist(localStorage.length === 0 && sessionStorage.length === 0, 'Receipt persistence touched profile storage');
    h.close();
    return { version: state.version, saved: records.length, exactBytes: true };
  }));

  await group('cap enforced across native connections', page => page.evaluate(async () => {
    const a = h.bound(), b = h.bound(), sample = h.envelope();
    for (let index = 0; index < 39; index++) h.value(await a.create(sample));
    const results = await Promise.all([a.create(sample), b.create(sample)]);
    h.insist(results.filter(result => result.ok).length === 1, 'Cap race had wrong success count');
    h.insist(results.filter(result => !result.ok && result.code === 'full').length === 1, 'Cap race exceeded 40');
    h.insist(h.value(await a.list()).length === 40, 'Native count exceeded cap');
    h.close(); return { saved: 40 };
  }));

  await group('terminal owner marker denies existing and reopened handles', page => page.evaluate(async () => {
    const a = h.bound(), old = h.bound(), b = h.bound(h.B);
    h.value(await a.create(h.envelope()));
    const other = h.value(await b.create(h.envelope('whole', true)));
    h.value(await old.list());
    h.value(await a.clearOwner());
    for (const store of [old, h.bound()]) {
      h.failure(await store.list(), 'owner-erased');
      h.failure(await store.create(h.envelope()), 'owner-erased');
      h.failure(await store.delete(h.ID), 'owner-erased');
    }
    const state = await h.snapshot();
    h.expectMarker(state, h.A, 'complete');
    h.insist(h.ownRows(state).length === 0, 'Erased owner rows survived');
    h.equal(h.value(await b.get(other.id)), other, 'Owner clear changed unrelated receipt');
    h.close(); return { remainingOwners: [h.B], terminal: true };
  }));

  await group('marker transaction abort preserves records and permits retry', page => page.evaluate(async () => {
    const store = h.bound();
    const original = h.value(await store.create(h.envelope()));
    const hook = h.onRequest('erasures', ['add', 'put'], transaction => transaction.abort());
    let result;
    try { result = await store.clearOwner(); } finally { hook.restore(); }
    h.failure(result, 'aborted', 'storage-unavailable');
    h.insist(result.mayHaveCommitted === false, 'Marker abort reported committed intent');
    h.insist(hook.count() === 1, 'Did not abort native marker request');
    const state = await h.snapshot();
    h.equal(h.ownRows(state), [original], 'Marker abort removed a receipt');
    h.insist(state.rows.erasures.length === 0, 'Aborted marker became durable');
    const retry = h.bound();
    h.value(await retry.create(h.envelope('whole', true)));
    h.value(await retry.clearOwner());
    h.expectMarker(await h.snapshot(), h.A, 'complete');
    h.close(); return { result, retried: true };
  }));

  await group('purge abort survives reload and recovers without read authority', async page => {
    const initial = await page.evaluate(async () => {
      const store = h.bound(), other = h.bound(h.B);
      const original = h.value(await store.create(h.envelope()));
      const unaffected = h.value(await other.create(h.envelope('whole', true)));
      const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
      let result;
      try { result = await store.clearOwner(); } finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Purge abort hid committed intent');
      h.insist(hook.count() === 1, 'Did not abort native purge request');
      const state = await h.snapshot();
      h.expectMarker(state, h.A, 'pending');
      h.equal(h.ownRows(state), [original], 'Aborted purge partially deleted owner');
      h.failure(await h.bound().list(), 'erasure-pending');
      h.failure(await h.bound().create(h.envelope()), 'erasure-pending');
      h.close(); return { result, unaffected };
    });
    await page.reload();
    await page.waitForFunction(() => !!window.h);
    const recovered = await page.evaluate(async unaffected => {
      h.failure(await h.bound(h.A, { readAuthority: () => null }).list(), 'access-denied');
      const recovery = h.adapter();
      h.insist(h.value(await recovery.recoverPendingErasures()) === 1, 'Reload recovery did not finish saved intent');
      h.insist(h.value(await recovery.recoverPendingErasures()) === 0, 'Recovery repeated completed intent');
      const state = await h.snapshot();
      h.expectMarker(state, h.A, 'complete');
      h.insist(h.ownRows(state).length === 0, 'Recovery retained erased receipts');
      h.equal(h.value(await h.bound(h.B).get(unaffected.id)), unaffected, 'Recovery changed other owner bytes');
      h.failure(await h.bound().list(), 'owner-erased');
      h.close(); return { recovered: 1, secondRecovery: 0, unrelatedBytesPreserved: true };
    }, initial.unaffected);
    return { initialFailure: initial.result, ...recovered };
  });

  await group('authority loss after marker commit retains recoverable intent', page => page.evaluate(async () => {
    let authority = { ownerKey: h.A, epoch: 1 };
    const store = h.bound(h.A, { readAuthority: () => authority });
    h.value(await store.create(h.envelope()));
    const hook = h.onWriteComplete(() => { authority = null; });
    let result;
    try { result = await store.clearOwner(); } finally { hook.restore(); }
    h.failure(result, 'stale');
    h.insist(result.mayHaveCommitted === true, 'Committed marker was reported as definitely uncommitted');
    h.insist(hook.count() === 1, 'Marker commit boundary not observed');
    h.expectMarker(await h.snapshot(), h.A, 'pending');
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Revoked clear could not recover');
    h.expectMarker(await h.snapshot(), h.A, 'complete');
    h.close(); return { result, recovered: true };
  }));

  await group('create commit ambiguity preserves exact receipt without retry', page => page.evaluate(async () => {
    const store = h.bound();
    h.value(await store.list());
    const expected = h.serializeNatalEnvelope(h.envelope());
    const hook = h.onWriteComplete(() => store.revoke());
    let result;
    try { result = await store.create(h.envelope()); } finally { hook.restore(); }
    h.failure(result, 'stale');
    h.insist(result.mayHaveCommitted === true, 'Committed create hid ambiguity');
    const rows = h.ownRows(await h.snapshot());
    h.insist(rows.length === 1 && rows[0].envelopeJson === expected, 'Committed create was lost, changed, or duplicated');
    h.close(); return { result, committedRows: rows.length };
  }));

  for (const separatePage of [false, true]) {
    await group(`queued clear blocks ${separatePage ? 'second-page' : 'second-handle'} create`, async (page, context) => {
      await page.evaluate(async () => {
        window.eraser = h.bound();
        h.value(await eraser.create(h.envelope()));
        window.blocker = await h.blockWrites();
        window.watch = h.watchTransactions();
        window.eraseResult = eraser.clearOwner();
      });
      await page.waitForFunction(() => window.watch.events.some(event => event.mode === 'readwrite'));
      const writerPage = separatePage ? await newPage(context) : page;
      await writerPage.evaluate(() => {
        window.writer = h.bound();
        window.writerWatch = h.watchTransactions();
        window.writeResult = writer.create(h.envelope('whole', true));
      });
      await writerPage.waitForFunction(() => window.writerWatch.events.some(event => event.mode === 'readwrite'));
      await page.evaluate(async () => { blocker.release(); await blocker.done; });
      const outcome = await writerPage.evaluate(async () => {
        const result = await writeResult;
        writerWatch.restore();
        h.failure(result, 'erasure-pending', 'owner-erased');
        return result;
      });
      await page.evaluate(async () => {
        h.value(await eraseResult);
        watch.restore();
        const state = await h.snapshot();
        h.expectMarker(state, h.A, 'complete');
        h.insist(h.ownRows(state).length === 0, 'Queued create resurrected erased owner');
      });
      if (separatePage) {
        await writerPage.evaluate(async () => {
          h.failure(await writer.list(), 'owner-erased');
          h.failure(await h.bound().create(h.envelope()), 'owner-erased');
        });
      }
      return { outcome, separatePage, resurrectedRows: 0 };
    });
  }

  await group('device erasure covers guest and inactive account partitions', page => page.evaluate(async () => {
    for (const owner of [h.A, h.B, h.G]) h.value(await h.bound(owner).create(h.envelope()));
    h.value(await h.adapter().clearAll(() => {}));
    const state = await h.snapshot();
    h.expectMarker(state, '*', 'complete');
    h.insist(state.rows.records.length === 0, 'Device clear left an owner partition');
    for (const owner of [h.A, h.B, h.G]) {
      h.failure(await h.bound(owner).list(), 'owner-erased');
      h.failure(await h.bound(owner).create(h.envelope()), 'owner-erased');
    }
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 0, 'Complete all marker was replayed');
    h.close(); return { partitions: 3, remaining: 0, terminal: true };
  }));

  await group('aborted device purge retains a global barrier across reload', async page => {
    await page.evaluate(async () => {
      for (const owner of [h.A, h.B, h.G]) h.value(await h.bound(owner).create(h.envelope()));
      const before = await h.snapshot();
      const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
      let result;
      try { result = await h.adapter().clearAll(() => {}); } finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Device purge abort hid committed intent');
      h.insist(hook.count() === 1, 'Device purge fault was not applied');
      const after = await h.snapshot();
      h.expectMarker(after, '*', 'pending');
      h.equal(after.rows.records, before.rows.records, 'Aborted global purge partially committed');
      for (const owner of [h.A, h.B, h.G]) h.failure(await h.bound(owner).list(), 'erasure-pending');
      h.close();
    });
    await page.reload();
    await page.waitForFunction(() => !!window.h);
    return page.evaluate(async () => {
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Global saved intent did not recover');
      const state = await h.snapshot();
      h.expectMarker(state, '*', 'complete');
      h.insist(state.rows.records.length === 0, 'Recovered global purge left rows');
      h.close(); return { recovered: 1, remaining: 0 };
    });
  });

  await group('device marker abort reports no committed intent', page => page.evaluate(async () => {
    h.value(await h.bound().create(h.envelope()));
    const before = await h.snapshot();
    const hook = h.onRequest('erasures', ['add', 'put'], transaction => transaction.abort());
    let result;
    try { result = await h.adapter().clearAll(() => {}); } finally { hook.restore(); }
    h.failure(result, 'aborted', 'storage-unavailable');
    h.insist(result.mayHaveCommitted === false, 'Aborted global intent reported committed');
    h.insist(hook.count() === 1, 'Global marker request was not aborted');
    h.equal(await h.snapshot(), before, 'Global marker abort changed persistent state');
    h.value(await h.bound().create(h.envelope('whole', true)));
    h.close(); return { result, newWritesRemainAllowed: true };
  }));

  for (const all of [false, true]) {
    await group(`${all ? 'global' : 'owner'} acknowledgment abort rolls back the entire purge`, page => page.evaluate(async all => {
      const store = h.bound();
      h.value(await store.create(h.envelope()));
      h.value(await h.bound(h.B).create(h.envelope('whole', true)));
      const before = await h.snapshot();
      // Initial intent uses add(). The first put() is the terminal
      // acknowledgment after all native cursor deletion requests succeeded.
      const hook = h.onRequest('erasures', ['put'], transaction => transaction.abort());
      let result;
      try { result = all ? await h.adapter().clearAll(() => {}) : await store.clearOwner(); }
      finally { hook.restore(); }
      h.failure(result, 'aborted', 'storage-unavailable');
      h.insist(result.mayHaveCommitted === true, 'Acknowledgment abort lost committed intent');
      h.insist(hook.count() === 1, 'Terminal acknowledgment was not intercepted');
      const after = await h.snapshot();
      h.expectMarker(after, all ? '*' : h.A, 'pending');
      h.equal(after.rows.records, before.rows.records, 'Acknowledgment abort committed partial deletion');
      h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Acknowledgment failure was not retryable');
      const recovered = await h.snapshot();
      h.expectMarker(recovered, all ? '*' : h.A, 'complete');
      h.insist(h.ownRows(recovered).length === 0, 'Retry left owner content');
      h.equal(h.ownRows(recovered, h.B), all ? [] : h.ownRows(before, h.B), 'Retry changed wrong owner partition');
      h.close(); return { result, originalRowsRolledBack: before.rows.records.length, retryCompleted: true };
    }, all));
  }

  await group('owner completion cannot acknowledge a pending device erasure', page => page.evaluate(async () => {
    for (const owner of [h.A, h.B, h.G]) h.value(await h.bound(owner).create(h.envelope()));
    const hook = h.onRequest('records', ['delete', 'clear'], transaction => transaction.abort());
    try { h.failure(await h.adapter().clearAll(() => {}), 'aborted', 'storage-unavailable'); }
    finally { hook.restore(); }
    h.expectMarker(await h.snapshot(), '*', 'pending');
    // A separately authorized owner erase can finish, but it cannot remove or
    // acknowledge the older global request while other partitions remain.
    await h.adapter().clear(h.A, () => {});
    const partial = await h.snapshot();
    h.expectMarker(partial, h.A, 'complete');
    h.expectMarker(partial, '*', 'pending');
    h.insist(h.ownRows(partial).length === 0 && partial.rows.records.length === 2, 'Owner erase widened or missed scope');
    for (const owner of [h.A, h.B, h.G]) h.failure(await h.bound(owner).list(), 'erasure-pending');
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 1, 'Global retry was lost to owner acknowledgment');
    const completed = await h.snapshot();
    h.expectMarker(completed, '*', 'complete');
    h.expectMarker(completed, h.A, 'complete');
    h.insist(completed.rows.records.length === 0, 'Global recovery left other owners');
    h.close(); return { isolatedOwnerCompletion: true, globalRecovered: true };
  }));

  await group('concurrent owner and device erasures preserve every terminal marker', page => page.evaluate(async () => {
    for (const owner of [h.A, h.B, h.G]) h.value(await h.bound(owner).create(h.envelope()));
    const a = h.adapter(), b = h.adapter(), device = h.adapter();
    const results = await Promise.all([a.clear(h.A, () => {}), b.clear(h.B, () => {}), device.clearAll(() => {})]);
    h.value(results[2]);
    const state = await h.snapshot();
    for (const target of [h.A, h.B, '*']) h.expectMarker(state, target, 'complete');
    h.insist(state.rows.records.length === 0, 'Concurrent erasures retained receipt data');
    h.insist(h.value(await h.adapter().recoverPendingErasures()) === 0, 'Concurrent acknowledgment left pending intents');
    for (const owner of [h.A, h.B, h.G]) h.failure(await h.bound(owner).create(h.envelope()), 'owner-erased');
    h.close(); return { terminalMarkers: 3, remaining: 0 };
  }));

  await group('corrupt erasure markers fail closed and remain intact', page => page.evaluate(async () => {
    const store = h.bound();
    const original = h.value(await store.create(h.envelope()));
    const corrupt = { target: h.A, status: 'future-state', privateFixture: 'synthetic' };
    await h.rawPut('erasures', corrupt);
    h.failure(await store.list(), 'unsupported-storage');
    h.failure(await store.create(h.envelope()), 'unsupported-storage');
    h.failure(await store.delete(original.id), 'unsupported-storage');
    h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
    const state = await h.snapshot();
    h.equal(h.marker(state), corrupt, 'Corrupt marker was normalized or discarded');
    h.equal(h.ownRows(state), [original], 'Corrupt marker permitted receipt mutation');
    h.close(); return { markerPreserved: true, receiptPreserved: true };
  }));

  for (const version of [1, 3]) {
    await group(`schema v${version} refusal preserves the existing database`, page => page.evaluate(async version => {
      const db = await h.openRaw(version, database => {
        const records = database.createObjectStore('records', { keyPath: ['ownerKey', 'id'] });
        records.createIndex('ownerKey', 'ownerKey');
      });
      db.close();
      const sentinel = { ownerKey: h.A, id: h.ID, schema: `synthetic-opaque-v${version}`, bytes: 'preserve exactly' };
      await h.rawPut('records', sentinel);
      const before = await h.snapshot();
      h.failure(await h.bound().list(), 'unsupported-storage');
      h.failure(await h.bound().clearOwner(), 'unsupported-storage');
      h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
      h.failure(await h.adapter().clearAll(() => {}), 'unsupported-storage');
      h.equal(await h.snapshot(), before, 'Refused database was upgraded or changed');
      h.close(); return { version, preserved: true };
    }, version));
  }

  await group('version 2 incompatible store shape remains intact', page => page.evaluate(async () => {
    const db = await h.openRaw(2, database => {
      const records = database.createObjectStore('records', { keyPath: ['ownerKey', 'id'] });
      records.createIndex('ownerKey', 'ownerKey');
      const erasures = database.createObjectStore('erasures', { keyPath: 'target' });
      erasures.createIndex('unexpected', 'status');
    });
    db.close();
    await h.rawPut('records', { ownerKey: h.A, id: h.ID, bytes: 'synthetic preservation control' });
    const before = await h.snapshot();
    h.failure(await h.bound().list(), 'unsupported-storage');
    h.failure(await h.adapter().recoverPendingErasures(), 'unsupported-storage');
    h.equal(await h.snapshot(), before, 'Incompatible shape changed');
    h.close(); return { preserved: true };
  }));

  await mkdir(out, { recursive: true });
  const report = {
    startedAt, completedAt: new Date().toISOString(), node: process.version,
    browser: await browser.version(), source, bundleSha256: hash(script),
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
