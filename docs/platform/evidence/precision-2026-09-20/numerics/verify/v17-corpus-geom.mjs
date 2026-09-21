import { readFileSync } from 'node:fs';
import { Backend, DEFAULTS, PROTOTYPE } from '../src/apparent2.mjs';
import { MEASURE, BODIES } from '/home/user/site/docs/platform/evidence/swiss-benchmark/tools/corpus.mjs';
const swiss = JSON.parse(readFileSync('/tmp/claude-0/swisslab/swiss-measure.json','utf8'));
const dt = new Map(swiss.cases.map(c=>[c.id,c.delta_t_seconds]));
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const circ=(a,b)=>{let d=(a-b)%360; if(d>180)d-=360; if(d<=-180)d+=360; return d;};
const rows=[];
for (const k of MEASURE) {
  const ut = new Date(k.utc).getTime()/86400000 - 10957.5;
  if (!dt.has(k.id)) continue;
  const tt = ut + dt.get(k.id)/86400;
  let sun;
  try { sun = de.apparent('Sun', tt, DEFAULTS); } catch { continue; }
  for (const b of BODIES) {
    if (b==='Sun') continue;
    let on, off;
    try { on = de.apparent(b, tt, DEFAULTS); off = de.apparent(b, tt, {...DEFAULTS, deflection:'none'}); } catch { continue; }
    const dl = circ(on.lon, sun.lon)*Math.cos((on.lat+sun.lat)/2*Math.PI/180);
    const el = Math.hypot(dl, on.lat-sun.lat);
    rows.push({id:k.id, body:b, elong:el, deflLon:(on.lon-off.lon)*3600});
  }
}
rows.sort((a,b)=>a.elong-b.elong);
console.log('corpus rows sorted by solar elongation (16 in-coverage cases x 9 non-Sun bodies = '+rows.length+'):');
for (const r of rows.slice(0,10)) console.log(`  ${r.body}@${r.id} elong=${r.elong.toFixed(3)} deg  deflection in lon = ${r.deflLon.toFixed(5)}"`);
console.log('  rows with |deflection| > 0.05":', rows.filter(r=>Math.abs(r.deflLon)>0.05).length);
console.log('  rows with |deflection| > 0.01":', rows.filter(r=>Math.abs(r.deflLon)>0.01).length);
// Now decompose the PUBLISHED prototype worst row Neptune@geo-01
const k = MEASURE.find(c=>c.id==='geo-01');
const tt = new Date(k.utc).getTime()/86400000 - 10957.5 + dt.get('geo-01')/86400;
const opt=(o)=>de.apparent('Neptune', tt, o).lon;
const best=opt(DEFAULTS);
console.log('\nNeptune@geo-01 (the published cell-D worst row) decomposition, arcsec vs the best model:');
for (const [lab,o] of [['prototype as shipped',PROTOTYPE],
                       ['best, nutation->AE',{...DEFAULTS,nutation:'ae'}],
                       ['best, bias off',{...DEFAULTS,bias:false}],
                       ['best, deflection off',{...DEFAULTS,deflection:'none'}],
                       ['best, aberration first',{...DEFAULTS,aberration:'first'}],
                       ['best, TT as TDB',{...DEFAULTS,timescale:'tt'}]]) {
  console.log(`  ${lab.padEnd(24)} ${(circ(opt(o),best)*3600).toFixed(5)}"`);
}
