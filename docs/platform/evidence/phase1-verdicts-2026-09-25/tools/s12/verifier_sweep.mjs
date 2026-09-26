// Step 1.2 (rule 1a): the audit verifier's synthetic sweep (verify/angles-houses-aspects/
// closed_form.mjs: a Moon-Sun conjunction 0.5 to 30 minutes before exact, and a slow
// Jupiter-Saturn pair 10 minutes before exact) on the VENDORED rc.7 findAspects, then a
// dense version of it written for this run: every aspect angle, four pairs (fast, slow,
// one retrograde, both retrograde), exactness from 0.001 to 60 minutes away on both
// sides (before: applying; after: separating, by construction under linear motion), each
// pair placed both across the 0/360 seam and away from it, and with a ahead of b and
// behind it. rc.6's findAspects runs beside it as a control. Then the verifier's 10-minute
// scan of the engine's own positions through computeChart (the audit found 1,626 of
// 710,786 misclassified by rc.6), judged by the verifier's closed form on the chart's own
// speeds and by the orb's actual motion over +-1 s.
// No Swiss input. Reads the installed @zodiacs/engine and $WORK/tgz-rc6; writes
// $WORK/s12/verifier-sweep.json and prints it.
//   node tools/s12/verifier_sweep.mjs > $WORK/s12/verifier-sweep.log
import fs from 'node:fs';
import { ENGINE, RC6, outDir } from '../lib/paths.mjs';

const OUT = outDir('s12');
const root = await import(`${ENGINE}/dist/index.js`);
const internal = await import(`${ENGINE}/dist/internal.js`);
const rc6 = await import(`${RC6}/dist/internal-math.js`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const { findAspects, ASPECTS } = root;
const ANGLE = Object.fromEntries(ASPECTS.map((row) => [row.type, row.angle]));
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const norm = (x) => ((x % 360) + 360) % 360;
const closedForm = (a, b, angle) => { const s = wrap(a.lon - b.lon); const dorb = Math.sign(Math.abs(s) - angle) * Math.sign(s) * (a.speed - b.speed); return { rate: dorb, applying: dorb < 0, stationary: Math.abs(dorb) < 1e-9 }; };
const body = (name, lon, speed) => ({ body: name, lon, lat: 0, speed });
const result = { engine: root.ENGINE_VERSION };

// 1. The verifier's sweep, verbatim inputs.
{
  const sweep = [];
  for (const min of [0.5, 1, 5, 10, 14, 14.3, 14.5, 15, 20, 30]) {
    const rel = 13.2 - 0.98; const orb = (rel * min) / 1440;
    const a = body('Moon', 100 - orb, 13.2), b = body('Sun', 100, 0.98);
    sweep.push({ minutesToExact: min, rc7: findAspects([a, b])[0].applying, rc6: rc6.findAspects([a, b])[0].applying, closedForm: closedForm(a, b, 0).applying });
  }
  const rel = 0.2 - 0.05; const orb = (rel * 10) / 1440;
  const a = body('Jupiter', 100 - orb, 0.2), b = body('Saturn', 100, 0.05);
  const slow = { minutesToExact: 10, rc7: findAspects([a, b])[0].applying, rc6: rc6.findAspects([a, b])[0].applying, closedForm: closedForm(a, b, 0).applying };
  result.verifierSweep = { rc7Misclassified: sweep.filter((r) => r.rc7 !== r.closedForm).length + (slow.rc7 !== slow.closedForm ? 1 : 0), rc6Misclassified: sweep.filter((r) => r.rc6 !== r.closedForm).length + (slow.rc6 !== slow.closedForm ? 1 : 0), cases: sweep.length + 1, sweep, slow };
}

// 2. Dense time-to-exact sweep.
{
  const PAIRS = [
    ['Moon', 13.2, 'Sun', 0.98],
    ['Jupiter', 0.2, 'Saturn', 0.05],
    ['Mercury', -1.0, 'Sun', 0.98],
    ['Mars', -0.3, 'Jupiter', -0.1]
  ];
  const minutes = [];
  for (let k = 0; k <= 200; k += 1) minutes.push(0.001 * Math.pow(60 / 0.001, k / 200)); // 0.001 .. 60 min, log-spaced
  const tally = { cases: 0, rc7Misclassified: 0, rc7FalsePositives: 0, rc6Misclassified: 0, rc6FalsePositives: 0, rc6WorstMinutes: 0, examples: [] };
  for (const def of ASPECTS) {
    for (const [na, va, nb, vb] of PAIRS) {
      const rel = va - vb;
      for (const base of [0.3, 359.7, 137.4]) { // b near the seam on both sides, and away from it
        for (const side of [1, -1]) {
          for (const m of minutes) {
            for (const when of [1, -1]) { // 1: exactness m minutes ahead (applying); -1: m minutes ago (separating)
              const bLon = base;
              const sExact = def.angle === 0 ? 0 : side * def.angle;
              const s = sExact - rel * (when * m) / 1440;
              const a = body(na, norm(bLon + s), va);
              const b = body(nb, bLon, vb);
              const got = findAspects([a, b]).find((x) => x.type === def.type);
              if (!got) throw new Error('constructed aspect not matched');
              const truth = when === 1;
              tally.cases += 1;
              if (got.applying !== truth) { tally.rc7Misclassified += 1; if (got.applying) tally.rc7FalsePositives += 1; if (tally.examples.length < 5) tally.examples.push({ type: def.type, pair: `${na}-${nb}`, base, side, minutes: m, when }); }
              const old = rc6.findAspects([a, b]).find((x) => x.type === def.type);
              if (old.applying !== truth) { tally.rc6Misclassified += 1; if (old.applying) tally.rc6FalsePositives += 1; tally.rc6WorstMinutes = Math.max(tally.rc6WorstMinutes, m); }
            }
          }
        }
      }
    }
  }
  tally.rc6WorstMinutes = +tally.rc6WorstMinutes.toFixed(3);
  result.denseSweep = tally;
}

// 3. The verifier's 10-minute scan on the engine's own positions, through computeChart.
{
  const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const signedDev = (lonA, lonB, angle) => { const s = wrap(lonA - lonB); if (angle === 0) return s; if (angle === 180) return wrap(s - 180); return Math.abs(s) - angle; };
  const scan = { instants: 0, aspects: 0, closedForm: { judged: 0, rc7Mis: 0, rc7FP: 0, stationarySkipped: 0, rc6FlagMis: 0 }, realMotion: { judged: 0, rc7Mis: 0, rc7FP: 0, setAside: 0 } };
  const t0 = Date.now();
  for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2025, 0, 1); t += 10 * 60_000) {
    const chart = internal.computeChart({ utc: new Date(t), houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 });
    scan.instants += 1;
    const by = Object.fromEntries(chart.bodies.map((x) => [x.body, x]));
    const minus = Object.fromEntries(BODIES.map((x) => [x, internal.bodyLongitude(x, new Date(t - 1000))]));
    const plus = Object.fromEntries(BODIES.map((x) => [x, internal.bodyLongitude(x, new Date(t + 1000))]));
    const old = new Map(rc6.findAspects(chart.bodies).map((x) => [`${x.a}|${x.b}|${x.type}`, x]));
    for (const asp of chart.aspects) {
      scan.aspects += 1;
      const angle = ANGLE[asp.type];
      const cf = closedForm(by[asp.a], by[asp.b], angle);
      if (cf.stationary) scan.closedForm.stationarySkipped += 1;
      else {
        scan.closedForm.judged += 1;
        if (cf.applying !== asp.applying) { scan.closedForm.rc7Mis += 1; if (asp.applying) scan.closedForm.rc7FP += 1; }
        if (cf.applying !== old.get(`${asp.a}|${asp.b}|${asp.type}`).applying) scan.closedForm.rc6FlagMis += 1;
      }
      const dm = signedDev(minus[asp.a], minus[asp.b], angle), d0 = signedDev(by[asp.a].lon, by[asp.b].lon, angle), dp = signedDev(plus[asp.a], plus[asp.b], angle);
      if (d0 === 0 || Math.sign(dm) !== Math.sign(dp) || Math.sign(dm) !== Math.sign(d0)) { scan.realMotion.setAside += 1; continue; }
      const truth = Math.abs(dp) < Math.abs(dm);
      scan.realMotion.judged += 1;
      if (truth !== asp.applying) { scan.realMotion.rc7Mis += 1; if (asp.applying) scan.realMotion.rc7FP += 1; }
    }
  }
  scan.elapsedSeconds = (Date.now() - t0) / 1000;
  result.engineScan10min = scan;
}
fs.writeFileSync(OUT + 'verifier-sweep.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
