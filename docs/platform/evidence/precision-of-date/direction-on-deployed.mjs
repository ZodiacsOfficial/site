/**
 * Check the DEPLOYED preview's `direction` labels against an independently
 * established longitude, in a real browser, on the real origin.
 *
 *   node docs/platform/evidence/precision-of-date/direction-on-deployed.mjs \
 *     --base https://zodiacs.org --out direction-on-deployed.json
 *
 * ## Why this exists separately from `scripts/drive-precision-preview.mjs`
 *
 * That driver exercises the page. This one goes at the one claim the page
 * cannot check for itself: the label on an event. The bug it is guarding
 * against reported every crossing's direction as the sign of `f`'s own
 * change, and `f = R sin(L - lambda)` FALLS as the longitude RISES, so
 * every label was inverted while every root was right. A page that renders
 * the label it was given cannot notice.
 *
 * ## What makes the check independent
 *
 * The label comes from the search. The truth comes from the worker's
 * `places` request, which runs the apparent reducer at an instant and
 * returns a longitude in degrees — a different code path, a different
 * quantity, and one that never sees `f`. Sampling the reducer either side
 * of a reported root and comparing the sign of the change with the label
 * is therefore a real cross-check rather than the search agreeing with
 * itself.
 *
 * Nothing is served locally. The worker is constructed from the ORIGIN'S
 * OWN `/precision-preview/worker.mjs`, so the bytes under test are the
 * bytes the site serves.
 */
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { buildSyntheticPack } from './retrograde-fixture.mjs';

const argv = process.argv.slice(2);
const base = (argv.find((a) => a.startsWith('http')) ?? 'https://zodiacs.org').replace(/\/$/, '');
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;
const exe = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/**
 * Targets are DISCOVERED, not guessed.
 *
 * A hard-coded target on a fixture that may change is a case that quietly
 * finds nothing and reports that as a pass. Instead the reference scan
 * below walks each body's longitude across the window through `places`,
 * and the driver picks two targets from it: one the body crosses while its
 * longitude RISES, and one it crosses while FALLING. If it cannot find
 * both, that is a problem, not a pass -- a one-sided check could not have
 * caught the inverted label this exists to guard against.
 */
/**
 * The preview's OWN synthetic fixture has no retrograde geometry.
 *
 * Measured against the deployed worker over the whole usable window, all
 * four of its bodies are strictly prograde: the smallest step in ecliptic
 * longitude is +0.2264 deg/quarter-day for the Sun and positive for every
 * other body at every one of 304 samples. So a DECREASING crossing cannot
 * be established on it at all, and a check that stopped there would be
 * half a check -- exactly the half that would have missed the inverted
 * label, since an inverted label on a prograde-only fixture is wrong in
 * one direction only and looks right in the other.
 *
 * The package's own fixture does have it: an Earth-like observer and a
 * Mars-like target phased to share a heliocentric longitude at t = 0, so
 * the geocentric longitude turns retrograde around opposition. It is built
 * here and handed to the deployed preview through the preview's OWN
 * `load-pack` path -- the same public capability a person loading a pack
 * uses. Synthetic bytes, built from polynomials, redistributing nothing.
 */
const retrogradePack = await buildSyntheticPack();
const retrogradeDigest = createHash('sha256').update(retrogradePack).digest('hex');

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
const offOrigin = [];
const errors = [];
page.on('request', (r) => { if (!r.url().startsWith(base)) offOrigin.push(r.url()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${base}/developers/precision-preview/`, { waitUntil: 'load' });

const result = await page.evaluate(async ({ packArray, packDigest }) => {
  /** Speak the worker protocol directly, against the served worker bytes. */
  const worker = new Worker('/precision-preview/worker.mjs', { type: 'module' });
  let next = 1;
  const pending = new Map();
  await new Promise((resolve) => {
    worker.addEventListener('message', (e) => {
      if (e.data.type === 'ready') { resolve(); return; }
      const fn = pending.get(e.data.id);
      if (fn) { pending.delete(e.data.id); fn(e.data.payload); }
    });
  });
  const ask = (msg) => new Promise((resolve) => {
    const id = next; next += 1;
    pending.set(id, resolve);
    worker.postMessage({ ...msg, id });
  });

  const iso = (ttDays) => new Date(Date.UTC(2000, 0, 1, 12) + ttDays * 86400000).toISOString();
  const placesRefusals = [];
  const placesAt = async (ttDays) => {
    const r = await ask({ type: 'places', iso: iso(ttDays) });
    if (!r.ok && placesRefusals.length < 3) placesRefusals.push({ ttDays, payload: r });
    return r.ok ? r.rows : null;
  };

  const bytes = Uint8Array.from(packArray);
  // The bytes the browser is about to search are the bytes Node built.
  // Digested here, inside the page, so the claim is not taken on trust
  // from the process that produced them.
  const inPageDigest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

  const fixtures = [];
  const scans = {};
  const bodiesByFixture = {};
  for (const fixture of ['preview-synthetic', 'retrograde-pack']) {
    const loaded = fixture === 'preview-synthetic'
      ? await ask({ type: 'load-synthetic' })
      : await ask({ type: 'load-pack', buffer: bytes.buffer.slice(0) });
    fixtures.push({
      fixture,
      ok: loaded.ok === true,
      synthetic: loaded.info ? loaded.info.synthetic : null,
      digest: loaded.info ? loaded.info.integrity.digest : null,
      selfConsistent: loaded.info ? loaded.info.integrity.selfConsistent : null,
      declaredSynthetic: loaded.info ? loaded.info.pack.declaredSynthetic : null,
      bodies: loaded.info ? loaded.info.bodies : null,
      coverage: loaded.info ? loaded.info.coverage : null,
      refused: loaded.ok ? null : loaded,
    });
    if (!loaded.ok) continue;
    const FROM = fixture === 'preview-synthetic' ? -30 : -34;
    const TO = fixture === 'preview-synthetic' ? 30 : 34;
    const STEP = 0.25;
    const scan = [];
    for (let t = FROM; t <= TO + 1e-9; t += STEP) {
      const rows = await placesAt(t);
      if (rows) scan.push({ t, rows });
    }
    scans[fixture] = { scan, FROM, TO, STEP };
    bodiesByFixture[fixture] = loaded.info.bodies;
  }

  const allRows = [];
  const allPicks = [];
  const diagnostics = [];
  for (const fixture of Object.keys(scans)) {
  const { scan, FROM, TO, STEP } = scans[fixture];
  const bodies = bodiesByFixture[fixture];
  // Reload this fixture before searching it: the loop above left the LAST
  // one open, and searching one fixture's geometry against another's
  // targets would be a silent mismatch rather than a failure.
  if (fixture === 'preview-synthetic') await ask({ type: 'load-synthetic' });
  else await ask({ type: 'load-pack', buffer: bytes.buffer.slice(0) });

  /** Longitude series for one body, unwrapped so a target is a plain level. */
  const series = (body) => scan.map((p) => {
    const row = p.rows.find((r) => r.body === body);
    return row ? { t: p.t, lon: row.lon } : null;
  }).filter(Boolean);

  /**
   * Pick a target this body crosses at least once in the requested
   * direction, comfortably inside the window and away from the 0/360 wrap.
   *
   * It does NOT insist on a single crossing. A target crossed while the
   * longitude FALLS is, on a retrograde loop, crossed two or three times
   * by construction, and an earlier draft that demanded exactly one
   * crossing therefore found no decreasing case at all and reported the
   * one-sided check as a near-pass. Every reported event is compared
   * against the reference at its OWN instant, so several crossings are
   * more evidence rather than a complication.
   */
  const pick = (body, wantRising) => {
    const s = series(body);
    for (let i = 1; i < s.length; i += 1) {
      let d = s[i].lon - s[i - 1].lon;
      if (d > 180 || d < -180) continue;                 // skip the wrap
      if (wantRising ? !(d > 0) : !(d < 0)) continue;
      // Away from the sample edges, so a bracket cannot fall outside the
      // window, and away from the wrap.
      if (i < 4 || i > s.length - 5) continue;
      const mid = (s[i].lon + s[i - 1].lon) / 2;
      if (mid < 5 || mid > 355) continue;
      return { body, targetDeg: Number(mid.toFixed(6)), expect: wantRising ? 'increasing' : 'decreasing' };
    }
    return null;
  };

  const picks = [];
  for (const rising of [true, false]) {
    for (const body of bodies) {
      if (picks.some((p) => p.expect === (rising ? 'increasing' : 'decreasing'))) continue;
      const got = pick(body, rising);
      if (got) picks.push(got);
    }
  }

  const rows = [];
  for (const c of picks) {
    for (const mode of ['geometric', 'empirical']) {
      const verdict = await ask({
        type: 'search',
        mode,
        body: c.body,
        targetDeg: c.targetDeg,
        fromIso: iso(FROM),
        toIso: iso(TO),
        epsilonDeg: 1e-6,
      });
      if (!verdict.ok) { rows.push({ ...c, requestedMode: mode, refused: verdict }); continue; }
      const events = [];
      for (const e of verdict.events) {
        const h = 0.25;
        const rowsBefore = await placesAt(e.ttDays - h);
        const rowsAfter = await placesAt(e.ttDays + h);
        const before = rowsBefore ? (rowsBefore.find((r) => r.body === c.body) ?? {}).lon ?? null : null;
        const after = rowsAfter ? (rowsAfter.find((r) => r.body === c.body) ?? {}).lon ?? null : null;
        let delta = after === null || before === null ? null : after - before;
        if (delta !== null && delta > 180) delta -= 360;
        if (delta !== null && delta < -180) delta += 360;
        const referenceDirection = delta === null ? null : (delta > 0 ? 'increasing' : 'decreasing');
        // The two public modes use different words for the same thing:
        // the validated mode says increasing/decreasing, the empirical one
        // says rising/falling. Both are claims about the LONGITUDE, so
        // they are normalised here and the raw label is kept beside it.
        // Normalising is not the same as excusing: an unrecognised word
        // stays unrecognised and fails.
        const raw = e.direction ?? null;
        const NORMAL = { increasing: 'increasing', rising: 'increasing', decreasing: 'decreasing', falling: 'decreasing' };
        const normalised = raw === null ? null : (NORMAL[raw] ?? `unrecognised:${raw}`);
        events.push({
          ttDays: e.ttDays,
          reportedDirection: raw,
          normalisedDirection: normalised,
          lonBefore: before,
          lonAfter: after,
          referenceDelta: delta,
          referenceDirection,
          agrees: normalised === referenceDirection,
        });
      }
      rows.push({
        ...c,
        requestedMode: mode,
        mode: verdict.verdict.mode,
        synthetic: verdict.synthetic,
        contract: verdict.verdict.contract,
        established: verdict.verdict.completeness.established,
        support: verdict.verdict.completeness.support,
        isExactTotal: verdict.verdict.eventCount.isExactTotal,
        assumptions: (verdict.verdict.assumptions ?? []).map((a) => a.id ?? a.name ?? a),
        found: verdict.events.length,
        events,
      });
    }
  }
  // Per-fixture diagnostics, so "no pick" is a reported fact with a cause
  // rather than a silent absence.
  const motion = {};
  for (const body of bodies) {
    const ser = series(body);
    let min = Infinity; let max = -Infinity; let back = 0;
    for (let i = 1; i < ser.length; i += 1) {
      let d = ser[i].lon - ser[i - 1].lon;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      min = Math.min(min, d); max = Math.max(max, d);
      if (d < 0) back += 1;
    }
    motion[body] = { minStepDeg: min, maxStepDeg: max, backwardSteps: back, samples: ser.length };
  }
  diagnostics.push({ fixture, window: [FROM, TO], stepDays: STEP, samples: scan.length, bodies, motion, picked: picks.length });
  allPicks.push(...picks.map((p) => ({ ...p, fixture })));
  allRows.push(...rows.map((r) => ({ ...r, fixture, window: [FROM, TO], referenceStepDays: STEP, referenceSamples: scan.length })));
  }

  const unloaded = await ask({ type: 'unload' });
  worker.terminate();
  return {
    fixtures,
    inPageDigest,
    packDigest,
    digestsMatch: inPageDigest === packDigest,
    unloaded: unloaded.ok === true,
    picks: allPicks,
    placesRefusals,
    diagnostics,
    rows: allRows,
  };
}, { packArray: Array.from(retrogradePack), packDigest: retrogradeDigest });

await browser.close();

// ---- the verdict, applied rather than eyeballed
const problems = [];
/** Modes that declined rather than answering. Recorded, not counted against. */
const declined = [];
const labelled = result.rows.flatMap((r) => r.events ?? []);
for (const r of result.rows) {
  if (r.refused) { problems.push(`${r.requestedMode} ${r.body} ${r.targetDeg} was refused: ${JSON.stringify(r.refused)}`); continue; }
  if (!r.found) {
    // Finding nothing is only a defect if the mode CLAIMED to have
    // accounted for the interval. The empirical mode declines on the fast
    // companion -- 24 degrees of longitude per quarter-day, past what a
    // sampled rate bound can honestly carry -- and reports `support:
    // none`. Declining is the correct answer there, and calling it a
    // failure would push toward a mode that answers anyway.
    if (r.established === true || r.isExactTotal === true) {
      problems.push(`${r.mode} ${r.body} ${r.targetDeg} claims to have accounted for the interval and found no events,`
        + ` but the reference scan says it is crossed ${r.expect}`);
    } else {
      declined.push(`${r.mode} ${r.body} ${r.targetDeg}: support ${r.support}`);
    }
    continue;
  }
  // The scan said this target is crossed once, in a known direction. The
  // search has to agree about both.
  if (r.found && !r.events.some((e) => e.referenceDirection === r.expect)) {
    problems.push(`${r.mode} ${r.body} ${r.targetDeg}: the scan expected a ${r.expect} crossing and none of the reported events is one`);
  }
  for (const e of r.events) {
    if (e.lonBefore === null || e.lonAfter === null) { problems.push(`${r.body} ${r.targetDeg}: the reference longitude could not be read`); continue; }
    if (!e.agrees) {
      problems.push(`${r.mode} ${r.body} ${r.targetDeg} at ttDays ${e.ttDays}: labelled ${e.reportedDirection}`
        + ` (read as ${e.normalisedDirection}), but the reducer's longitude moved ${e.referenceDelta} deg over the step`);
    }
  }
}
// Both labels must actually occur, or the check could pass on a constant.
const seen = new Set(labelled.map((e) => e.referenceDirection));
if (!seen.has('increasing')) problems.push('no increasing crossing was established, so the check is one-sided');
if (!seen.has('decreasing')) problems.push('no decreasing crossing was established, so the check is one-sided');
// The two public modes keep their declared quantities.
const geo = result.rows.find((r) => r.mode === 'validated-geometric' && r.found > 0);
const emp = result.rows.find((r) => r.mode === 'empirical-apparent' && r.found > 0);
if (!geo || geo.support !== 'proven' || geo.isExactTotal !== true) problems.push('the validated mode no longer reports a proven exact total');
if (!emp || emp.support !== 'conditional' || emp.isExactTotal !== false) problems.push('the empirical mode no longer reports a conditional total');
if (!emp || !emp.assumptions.length) problems.push('the empirical mode reported no unverified assumptions');
if (offOrigin.length) problems.push(`off-origin requests: ${offOrigin.join(', ')}`);
if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`);

if (!result.digestsMatch) {
  problems.push(`the bytes the page digested (${result.inPageDigest}) are not the bytes Node built (${result.packDigest})`);
}
for (const f of result.fixtures) {
  if (!f.ok) problems.push(`the ${f.fixture} fixture did not load: ${JSON.stringify(f.refused)}`);
  else if (f.selfConsistent !== true) problems.push(`the ${f.fixture} fixture is not self-consistent`);
}
// A pack loaded through `load-pack` is not the preview's own fixture, and
// the preview must not go on calling it one.
const supplied = result.fixtures.find((f) => f.fixture === 'retrograde-pack');
if (supplied && supplied.synthetic !== false) {
  problems.push('the preview still reports a caller-supplied pack as its own synthetic fixture');
}
if (supplied && supplied.declaredSynthetic !== true) {
  problems.push('the supplied pack does not declare itself synthetic in its own header');
}

const record = {
  base,
  ranAt: new Date().toISOString(),
  what: 'the deployed preview\'s direction labels, against the worker\'s own apparent reducer',
  chromium: exe,
  offOrigin,
  errors,
  retrogradePackDigest: retrogradeDigest,
  retrogradePackBytes: retrogradePack.byteLength,
  ...result,
  labelsChecked: labelled.length,
  labelsAgreeing: labelled.filter((e) => e.agrees).length,
  directionsSeen: [...new Set(labelled.map((e) => e.referenceDirection))].sort(),
  declined,
  problems,
  passed: problems.length === 0,
};
const text = `${JSON.stringify(record, null, 2)}\n`;
if (outPath) writeFileSync(outPath, text);
process.stdout.write(text);
if (!record.passed) process.exitCode = 1;
