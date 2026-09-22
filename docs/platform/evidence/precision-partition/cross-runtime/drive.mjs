/**
 * Run the partition cross-runtime cases in Node, Chromium and Firefox on
 * the SAME FILE, and compare.
 *
 *   node serve.mjs 8796 &
 *   node drive.mjs http://127.0.0.1:8796/ --out cross-runtime-run.json
 *
 * ## What is compared, and what is not
 *
 * Compared, to the bit: the digest each runtime computed from the bytes it
 * received; the PLAN -- its four span lists and its key -- and the answer
 * found over that plan, as decimal strings so a comparison cannot round a
 * near-match into a match; and what each result claims, over the request
 * and over the proved-admissible spans separately.
 *
 * Reported and NOT compared: evaluations, cells and wall time. Those are
 * allowed to differ between engines. Folding them into the verdict would
 * either fail honest runs or tempt someone to stop reporting them.
 *
 * ## Why the plan key is in the comparison
 *
 * It is the identity a cached plan is reused under. Two engines that
 * publish different keys for the same request cannot share a cache,
 * whatever else about their answers matches -- and each would REFUSE the
 * other's plan, which is the correct behaviour and a silent loss of the
 * reuse the partition exists for. So a key difference is a failure here
 * even though no number would differ.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium, firefox } from 'playwright-core';

const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith('http')) ?? 'http://127.0.0.1:8796/';
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;
const HERE = new URL('.', import.meta.url).pathname;

const ENGINES = {
  chromium: { type: chromium, executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  firefox: { type: firefox, executablePath: process.env.FIREFOX_PATH ?? '/opt/pw-browsers/firefox-1532/firefox/firefox' },
};

const runs = [];

// ---- Node, on the same file
runs.push(JSON.parse(execFileSync(process.execPath, [`${HERE}node-run.mjs`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })));

// ---- the two browsers
for (const name of ['chromium', 'firefox']) {
  const engine = ENGINES[name];
  const browser = await engine.type.launch({ executablePath: engine.executablePath });
  const page = await browser.newPage();
  const offOrigin = [];
  const errors = [];
  page.on('request', (r) => { if (!r.url().startsWith(base)) offOrigin.push(r.url()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.done === '1', null, { timeout: 180000 });
  const record = await page.evaluate(() => window.CROSS_RUNTIME);
  await browser.close();
  runs.push({ ...record, engine: name, offOrigin, errors });
}

// ---- the comparison
const expected = JSON.parse(readFileSync(`${HERE}pack.json`, 'utf8'));
const problems = [];
for (const r of runs) {
  if (r.error) { problems.push(`${r.engine ?? r.runtime}: ${r.error}`); continue; }
  if (!r.digestMatches) problems.push(`${r.runtime}: digest ${r.digestSeen} is not the recorded ${r.digestExpected}`);
  if (r.digestExpected !== expected.sha256) problems.push(`${r.runtime}: compared against the wrong recorded digest`);
  if ((r.offOrigin ?? []).length) problems.push(`${r.runtime}: off-origin requests ${r.offOrigin.join(', ')}`);
  if ((r.errors ?? []).length) problems.push(`${r.runtime}: page errors ${r.errors.join(' | ')}`);
}

/** The answer fields, which must be identical. Cost fields are excluded. */
const answerOf = (row) => JSON.stringify({
  id: row.id, body: row.body, targetDeg: row.targetDeg, windowTdbSec: row.windowTdbSec,
  planContract: row.planContract, planKey: row.planKey, identityStrength: row.identityStrength,
  planStatus: row.planStatus, boundaryToleranceSec: row.boundaryToleranceSec,
  deflectorIsTarget: row.deflectorIsTarget,
  admissible: row.admissible, excluded: row.excluded, boundary: row.boundary, unprocessed: row.unprocessed,
  searchContract: row.searchContract,
  found: row.found, roots: row.roots, brackets: row.brackets,
  eligibility: row.eligibility, positionFrom: row.positionFrom,
  overRequest: row.overRequest, exhaustiveOverAdmissible: row.exhaustiveOverAdmissible,
  mayHoldUnfoundSupportedEvents: row.mayHoldUnfoundSupportedEvents,
  isExactTotalOverRequest: row.isExactTotalOverRequest,
  isExactTotalOverAdmissible: row.isExactTotalOverAdmissible,
  coversRequestExactly: row.coversRequestExactly,
  admissibleSec: row.admissibleSec, excludedSec: row.excludedSec,
  boundarySec: row.boundarySec, unprocessedSec: row.unprocessedSec,
  planReused: row.planReused,
});

const good = runs.filter((r) => !r.error);
const ref = good[0];
const agreement = [];
if (ref) {
  for (let i = 0; i < ref.rows.length; i += 1) {
    const want = answerOf(ref.rows[i]);
    const evals = {};
    let identical = true;
    for (const r of good) {
      evals[r.engine ?? 'node'] = r.rows[i].evaluations;
      if (answerOf(r.rows[i]) !== want) {
        identical = false;
        problems.push(`${ref.rows[i].id}: ${r.runtime} published a different plan or answer from ${ref.runtime}`);
      }
    }
    const counts = Object.values(evals);
    const spread = counts.length ? (Math.max(...counts) - Math.min(...counts)) / Math.max(...counts) : 0;
    agreement.push({
      id: ref.rows[i].id,
      found: ref.rows[i].found,
      answerIdenticalAcrossRuntimes: identical,
      evaluationsByRuntime: evals,
      evaluationSpread: spread,
    });
  }
}
if (good.length < 3) problems.push(`only ${good.length} runtimes produced a result`);

/**
 * The run has to exercise what it claims to be about. A cross-runtime pass
 * on five cases that all came back "everything admissible" would say
 * nothing about the partition.
 */
if (ref) {
  const rows = ref.rows;
  const byId = (id) => rows.find((r) => r.id === id);
  if (!rows.some((r) => r.excluded.length > 0)) {
    problems.push('no case proved a span EXCLUDED, so the verdict a caller most needs agreement on was never compared');
  }
  if (!rows.some((r) => r.boundary.length > 0)) {
    problems.push('no case left a BOUNDARY span, so the unproved residue was never compared');
  }
  if (!rows.some((r) => r.overRequest === true)) {
    problems.push('no case established completeness over its request, so only the declining path was exercised');
  }
  if (!rows.some((r) => r.overRequest === false && r.exhaustiveOverAdmissible === true)) {
    problems.push('no case showed the SMALLER claim holding where the larger one does not, which is the distinction this contract exists for');
  }
  if (!rows.some((r) => r.deflectorIsTarget === true)) {
    problems.push('no case asked for the deflector itself, so the profile exception was never exercised across runtimes');
  }
  // Longitude independence, checked rather than asserted: P2 and P3 differ
  // only in the target longitude, so their plans must be the same plan.
  const p2 = byId('P2');
  const p3 = byId('P3');
  if (!p2 || !p3) problems.push('P2 or P3 missing: longitude independence was not checked');
  else if (p2.planKey !== p3.planKey || JSON.stringify(p2.admissible) !== JSON.stringify(p3.admissible)) {
    problems.push('P2 and P3 differ only in the target longitude, and their plans differ: the partition is not independent of the longitude');
  }
  // The tolerance is part of the identity: P2 and P5 are the same request
  // at different tolerances and must NOT share a key.
  const p5 = byId('P5');
  if (!p5) problems.push('P5 missing: the tolerance was not shown to be part of the plan identity');
  else if (p2 && p2.planKey === p5.planKey) {
    problems.push('P2 and P5 use different boundary tolerances and share a plan key: the identity does not cover the tolerance');
  }
  for (const r of rows) {
    if (!r.coversRequestExactly) problems.push(`${r.id}: the four classes do not tile the request`);
    if (!r.planReused) problems.push(`${r.id}: the plan was rebuilt rather than reused, so nothing about reuse was measured`);
    if (r.overRequest && (r.excludedSec !== '0' || r.boundarySec !== '0')) {
      problems.push(`${r.id}: claims completeness over a request part of which it did not admit`);
    }
  }
}

const totalEvents = agreement.reduce((n, a) => n + a.found, 0);
if (totalEvents < 8) problems.push(`only ${totalEvents} events were compared, which is not a cross-runtime claim`);

const record = {
  base,
  what: 'one synthetic pack, one domain plan per case, three engines',
  pack: { bytes: expected.bytes, sha256: expected.sha256, builtBy: expected.builtBy, builtOn: expected.node },
  runtimes: runs.map((r) => ({ runtime: r.runtime, engine: r.engine ?? 'node', digestSeen: r.digestSeen, digestMatches: r.digestMatches, ms: r.ms })),
  eventsCompared: totalEvents,
  agreement,
  runs,
  problems,
  passed: problems.length === 0,
};
const text = `${JSON.stringify(record, null, 2)}\n`;
if (outPath) writeFileSync(outPath, text);
process.stdout.write(text);
if (!record.passed) process.exitCode = 1;
