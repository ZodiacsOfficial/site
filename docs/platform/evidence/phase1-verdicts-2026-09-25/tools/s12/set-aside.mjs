// Step 1.2 (rule 1a): which scan row did classify.mjs's T2 set aside (exactness inside the
// +-1 s stencil), and what rc.7 said there. Reads $WORK/s12/swiss-2024.json and
// swiss-2024-pm1s.json and the installed @zodiacs/engine; prints one JSON line per row set
// aside. The line carries orbs from Swiss's positions, so it stays in WORK.
//   node tools/s12/set-aside.mjs > $WORK/s12/set-aside.json
import fs from 'node:fs';
import { ENGINE, outDir } from '../lib/paths.mjs';
const OUT = outDir('s12');
const rc7 = await import(`${ENGINE}/dist/index.js`);
const ANGLE = Object.fromEntries(rc7.ASPECTS.map((row) => [row.type, row.angle]));
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const signedDev = (lonA, lonB, angle) => { const s = wrap(lonA - lonB); if (angle === 0) return s; if (angle === 180) return wrap(s - 180); return Math.abs(s) - angle; };
const sw = JSON.parse(fs.readFileSync(OUT + 'swiss-2024.json'));
const st = JSON.parse(fs.readFileSync(OUT + 'swiss-2024-pm1s.json'));
for (let i = 0; i < sw.rows.length; i += 1) {
  const row = sw.rows[i], sten = st.rows[i];
  const by = Object.fromEntries(row.bodies.map((b) => [b.body, b]));
  for (const asp of rc7.findAspects(row.bodies)) {
    const angle = ANGLE[asp.type];
    const dm = signedDev(sten.minus1s[asp.a], sten.minus1s[asp.b], angle);
    const d0 = signedDev(by[asp.a].lon, by[asp.b].lon, angle);
    const dp = signedDev(sten.plus1s[asp.a], sten.plus1s[asp.b], angle);
    if (d0 === 0 || Math.sign(dm) !== Math.sign(dp) || Math.sign(dm) !== Math.sign(d0)) {
      const rel = by[asp.a].speed - by[asp.b].speed;
      console.log(JSON.stringify({ utc: row.utc, a: asp.a, b: asp.b, type: asp.type, orbDeg: asp.orb, secondsToExact: asp.orb / Math.abs(rel) * 86400, rc7Applying: asp.applying, rc7Motion: rc7.aspectMotion(by[asp.a], by[asp.b], angle), devMinus1s: dm, dev0: d0, devPlus1s: dp }));
    }
  }
}
