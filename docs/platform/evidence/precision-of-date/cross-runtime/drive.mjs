/**
 * Run the cross-runtime cases in Node, Chromium and Firefox on the SAME
 * FILE, and compare.
 *
 *   node serve.mjs 8795 &
 *   node drive.mjs --out cross-runtime-run.json
 *
 * ## What is compared, and what is not
 *
 * Compared, to the bit: the digest each runtime computed from the bytes it
 * received, and the published answer — roots, brackets, directions, event
 * counts and the completeness verdict, as decimal strings so a comparison
 * cannot round a near-match into a match.
 *
 * Reported and NOT compared: evaluation counts, cells and wall time. Those
 * are allowed to differ between engines. Folding them into the verdict
 * would either fail honest runs or, worse, tempt someone to stop reporting
 * them; the earlier aberrated evidence found a 0.05 per cent spread in
 * evaluations on the sensitive case and said so.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium, firefox } from 'playwright-core';

const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith('http')) ?? 'http://127.0.0.1:8795/';
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;
const HERE = new URL('.', import.meta.url).pathname;

const ENGINES = {
  chromium: { type: chromium, executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  firefox: { type: firefox, executablePath: process.env.FIREFOX_PATH ?? '/opt/pw-browsers/firefox-1532/firefox/firefox' },
};

const runs = [];

// ---- Node, on the same file
runs.push(JSON.parse(execFileSync(process.execPath, [`${HERE}node-run.mjs`], { encoding: 'utf8' })));

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
  id: row.id, mode: row.mode, frame: row.frame,
  established: row.established, isExactTotal: row.isExactTotal, found: row.found,
  roots: row.roots, brackets: row.brackets, directions: row.directions,
  unresolved: row.unresolved,
  conversionInducedLongitudeArcsec: row.conversionInducedLongitudeArcsec ?? null,
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
        problems.push(`${ref.rows[i].id}: ${r.runtime} published a different answer from ${ref.runtime}`);
      }
    }
    const counts = Object.values(evals);
    const spread = counts.length ? (Math.max(...counts) - Math.min(...counts)) / Math.max(...counts) : 0;
    agreement.push({
      id: ref.rows[i].id,
      mode: ref.rows[i].mode,
      found: ref.rows[i].found,
      answerIdenticalAcrossRuntimes: identical,
      evaluationsByRuntime: evals,
      evaluationSpread: spread,
    });
  }
}
if (good.length < 3) problems.push(`only ${good.length} runtimes produced a result`);
// A pass on one matching event would be a pass on nothing.
const totalEvents = agreement.reduce((n, a) => n + a.found, 0);
if (totalEvents < 10) problems.push(`only ${totalEvents} events were compared, which is not a cross-runtime claim`);

const record = {
  base,
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
