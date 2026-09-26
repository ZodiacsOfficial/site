// Step 1.2 (rule 1a): classify the rebuilt 2024 30-minute Swiss-position scan with
// the VENDORED rc.7 findAspects (the function computeChart calls) and count
// misclassifications against two truths:
//   T1 (the rule's): the orb's rate at the instant from Swiss's own speeds,
//       d(orb)/dt = sign(|s| - A) * sign(s) * (vA - vB), s = wrap(lonA - lonB); the
//       audit's swiss_compare.mjs, rows with |rate| < 1e-9 set aside;
//   T2 (independent of any speed formula): the orb's actual motion under Swiss,
//       orb(t + 1 s) < orb(t - 1 s) from Swiss positions recomputed at t -/+ 1 s;
//       rows where exactness falls inside the +-1 s stencil set aside.
// rc.6's findAspects runs on the same rows as a positive control (the audit found
// 506 of 236,932 on these positions).
// Reads $WORK/s12/swiss-2024.json and swiss-2024-pm1s.json (swiss_scan_2024.py), the installed
// @zodiacs/engine and the rc.6 tarball run-all.sh extracts to $WORK/tgz-rc6. Writes
// $WORK/s12/classify.json and prints it; its examples carry orbs from Swiss's positions, so
// it stays in WORK.
//   node tools/s12/classify.mjs > $WORK/s12/classify.log
import fs from 'node:fs';
import { ENGINE, RC6, outDir } from '../lib/paths.mjs';

const OUT = outDir('s12');
const rc7 = await import(`${ENGINE}/dist/index.js`);
const rc7internalMath = await import(`${ENGINE}/dist/internal-math.js`);
const rc6 = await import(`${RC6}/dist/internal-math.js`);
const pkg = JSON.parse(fs.readFileSync(`${ENGINE}/package.json`, 'utf8'));
if (pkg.version !== '0.1.1-rc.7' || rc7.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
if (rc7.findAspects !== rc7internalMath.findAspects) throw new Error('two findAspects');

const ANGLE = Object.fromEntries(rc7.ASPECTS.map((row) => [row.type, row.angle]));
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const closedRate = (a, b, angle) => { const s = wrap(a.lon - b.lon); return Math.sign(Math.abs(s) - angle) * Math.sign(s) * (a.speed - b.speed); };
// Signed distance from exactness, smooth through it: |s| - A for 0 < A < 180, s for A = 0,
// wrap(s - 180) for A = 180 (the orb is its absolute value in every case).
const signedDev = (lonA, lonB, angle) => {
  const s = wrap(lonA - lonB);
  if (angle === 0) return s;
  if (angle === 180) return wrap(s - 180);
  return Math.abs(s) - angle;
};

const sw = JSON.parse(fs.readFileSync(OUT + 'swiss-2024.json'));
const st = JSON.parse(fs.readFileSync(OUT + 'swiss-2024-pm1s.json'));
if (sw.rows.length !== st.rows.length) throw new Error('row count');

const blank = () => ({ judged: 0, misclassified: 0, falsePositives: 0, falseNegatives: 0, examples: [] });
const res = {
  engine: { package: pkg.version, ENGINE_VERSION: rc7.ENGINE_VERSION },
  swissBadFlag: sw.badflag,
  instants: sw.rows.length,
  aspects: { rc7: 0, rc6: 0, sameSet: true, byType: {} },
  rc7: { T1: blank(), T2: blank(), stationary: 0, applyingCount: 0 },
  rc6: { T1: blank(), T2: blank(), maxMinutesToExactT1: 0, nonMoonT1: 0 },
  T1setAside: 0,
  T2setAside: 0,
  truthsDisagree: 0,
  // Coverage of the scan itself: rc.7 against T1 within the wrap and retrograde subsets.
  subsets: {
    oneRetrograde: { aspects: 0, rc7MisT1: 0, rc6MisT1: 0 },
    bothRetrograde: { aspects: 0, rc7MisT1: 0, rc6MisT1: 0 },
    rawDifferenceWraps: { aspects: 0, rc7MisT1: 0, rc6MisT1: 0 },
    oppositions: { aspects: 0, rc7MisT1: 0, rc6MisT1: 0 },
    withinOneDegree: { aspects: 0, rc7MisT1: 0, rc6MisT1: 0 },
    within0_15Degree: { aspects: 0, rc7MisT1: 0, rc6MisT1: 0 }
  }
};
const tally = (bucket, flag, truth, detail) => {
  bucket.judged += 1;
  if (flag !== truth) {
    bucket.misclassified += 1;
    if (flag) bucket.falsePositives += 1; else bucket.falseNegatives += 1;
    if (bucket.examples.length < 5) bucket.examples.push(detail);
  }
};

for (let i = 0; i < sw.rows.length; i += 1) {
  const row = sw.rows[i];
  const sten = st.rows[i];
  if (sten.utc !== row.utc) throw new Error('stencil misaligned at ' + row.utc);
  const by = Object.fromEntries(row.bodies.map((b) => [b.body, b]));
  const now = rc7.findAspects(row.bodies);
  const old = rc6.findAspects(row.bodies);
  const key = (x) => `${x.a}|${x.b}|${x.type}`;
  const oldBy = new Map(old.map((x) => [key(x), x]));
  if (old.length !== now.length) res.aspects.sameSet = false;
  res.aspects.rc6 += old.length;
  for (const asp of now) {
    res.aspects.rc7 += 1;
    res.aspects.byType[asp.type] = (res.aspects.byType[asp.type] ?? 0) + 1;
    const a = by[asp.a];
    const b = by[asp.b];
    const angle = ANGLE[asp.type];
    const motion = rc7.aspectMotion(a, b, angle);
    if ((motion === 'applying') !== asp.applying) throw new Error('findAspects and aspectMotion disagree');
    if (motion === 'stationary') res.rc7.stationary += 1;
    if (asp.applying) res.rc7.applyingCount += 1;
    const prior = oldBy.get(key(asp));
    if (!prior) { res.aspects.sameSet = false; continue; }
    const detail = { utc: row.utc, a: asp.a, b: asp.b, type: asp.type, orb: +asp.orb.toFixed(6) };

    // T1: closed form from Swiss speeds.
    const rate = closedRate(a, b, angle);
    let t1 = null;
    if (Math.abs(rate) < 1e-9) res.T1setAside += 1;
    else {
      t1 = rate < 0;
      const minutes = (asp.orb / Math.abs(rate)) * 1440;
      tally(res.rc7.T1, asp.applying, t1, { ...detail, rc7: asp.applying, truth: t1, minutesToExact: +minutes.toFixed(3) });
      const before = res.rc6.T1.misclassified;
      tally(res.rc6.T1, prior.applying, t1, { ...detail, rc6: prior.applying, truth: t1, minutesToExact: +minutes.toFixed(3) });
      if (res.rc6.T1.misclassified > before) {
        res.rc6.maxMinutesToExactT1 = Math.max(res.rc6.maxMinutesToExactT1, minutes);
        if (asp.a !== 'Moon' && asp.b !== 'Moon') res.rc6.nonMoonT1 += 1;
      }
      const retro = (a.speed < 0 ? 1 : 0) + (b.speed < 0 ? 1 : 0);
      const inSubsets = [];
      if (retro >= 1) inSubsets.push('oneRetrograde');
      if (retro === 2) inSubsets.push('bothRetrograde');
      if (Math.abs(a.lon - b.lon) > 180) inSubsets.push('rawDifferenceWraps');
      if (asp.type === 'opposition') inSubsets.push('oppositions');
      if (asp.orb < 1) inSubsets.push('withinOneDegree');
      if (asp.orb < 0.15) inSubsets.push('within0_15Degree');
      for (const name of inSubsets) {
        const sub = res.subsets[name];
        sub.aspects += 1;
        if (asp.applying !== t1) sub.rc7MisT1 += 1;
        if (prior.applying !== t1) sub.rc6MisT1 += 1;
      }
    }

    // T2: actual motion under Swiss over +-1 s.
    const dm = signedDev(sten.minus1s[asp.a], sten.minus1s[asp.b], angle);
    const d0 = signedDev(a.lon, b.lon, angle);
    const dp = signedDev(sten.plus1s[asp.a], sten.plus1s[asp.b], angle);
    if (d0 === 0 || Math.sign(dm) !== Math.sign(dp) || Math.sign(dm) !== Math.sign(d0)) { res.T2setAside += 1; continue; }
    const t2 = Math.abs(dp) < Math.abs(dm);
    tally(res.rc7.T2, asp.applying, t2, { ...detail, rc7: asp.applying, truth: t2 });
    tally(res.rc6.T2, prior.applying, t2, { ...detail, rc6: prior.applying, truth: t2 });
    if (t1 !== null && t1 !== t2) res.truthsDisagree += 1;
  }
}
res.rc6.maxMinutesToExactT1 = +res.rc6.maxMinutesToExactT1.toFixed(3);
fs.writeFileSync(OUT + 'classify.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
