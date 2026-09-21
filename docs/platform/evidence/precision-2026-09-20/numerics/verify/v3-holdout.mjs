/** HOLDOUT set, never used to guide the prototype or this track's model choice. */
import { readFileSync, writeFileSync } from 'node:fs';
import { Backend, PROTOTYPE, DEFAULTS } from '../src/apparent2.mjs';
import { HOLDOUT, BODIES } from '/home/user/site/docs/platform/evidence/swiss-benchmark/tools/corpus.mjs';
const kernel = '/tmp/claude-0/swisslab/de440s.bsp';
const swiss = JSON.parse(readFileSync('/tmp/claude-0/swisslab/swiss-hold.json', 'utf8'));
if (!swiss.is_full_swiss_configuration) throw new Error('Swiss fell back');
const byId = new Map(swiss.cases.map((c) => [c.id, c]));
const de = new Backend(kernel);
const DAY = 86400;
const VAR = { 'P0 prototype': { ...PROTOTYPE }, 'P8 best': { ...DEFAULTS }, 'P8a best+2000A': { ...DEFAULTS, nutation: '2000a' } };
const dump = (opts, name) => {
  const out = { engine: `holdout-${name}`, deltaTMatched: true, options: opts, set: 'holdout', cases: [] };
  for (const kase of HOLDOUT) {
    const rec = { id: kase.id, stratum: kase.stratum, utc: kase.utc, bodies: {} };
    const dt = byId.get(kase.id)?.delta_t_seconds;
    const ut = new Date(kase.utc).getTime() / 86400000 - 10957.5;
    const ttDays = ut + dt / DAY;
    for (const b of BODIES) {
      try { const r = de.apparent(b, ttDays, opts); rec.bodies[b] = { lon: r.lon, lat: r.lat, speed: 0 }; }
      catch (e) { rec.bodies[b] = null; rec.err = String(e.message); }
    }
    out.cases.push(rec);
  }
  return out;
};
for (const [name, opts] of Object.entries(VAR)) {
  const slug = name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  writeFileSync(`verify/holdout-${slug}.json`, JSON.stringify(dump(opts, slug), null, 1));
  console.log('wrote', slug);
}
