/**
 * Find a real birth datetime (NYC) whose chart is Gemini Sun / Taurus Moon /
 * Virgo Rising — matching the reference share card — using the site's own
 * engine. Prints full chart data for the chosen candidate.
 */
import { computeChart } from '../../src/lib/engine/full';
import { resolveLocalToUtc } from '../../src/lib/time/localToUtc';
import { signForLongitude, formatLongitude, degreeInSign } from '../../src/lib/signs';

const TZ = 'America/New_York';
const LAT = 40.7128;
const LON = -74.006;

function chartFor(date: string, time: string) {
  const res = resolveLocalToUtc(date, time, TZ);
  return computeChart({
    utc: res.utc,
    latitude: LAT,
    longitude: LON,
    houseSystem: 'placidus',
    timeKnown: true,
  });
}

const days: string[] = [];
for (let d = 21; d <= 31; d++) days.push(`1993-05-${String(d).padStart(2, '0')}`);
for (let d = 1; d <= 20; d++) days.push(`1993-06-${String(d).padStart(2, '0')}`);

const hits: { date: string; time: string }[] = [];
for (const date of days) {
  const noon = chartFor(date, '12:00');
  const sun = signForLongitude(noon.bodies.find((b) => b.body === 'Sun')!.lon).slug;
  const moon = signForLongitude(noon.bodies.find((b) => b.body === 'Moon')!.lon).slug;
  if (sun !== 'gemini' || moon !== 'taurus') continue;
  // Scan the day in 10-minute steps for Virgo rising windows.
  for (let m = 0; m < 24 * 60; m += 10) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const c = chartFor(date, `${hh}:${mm}`);
    if (!c.angles) continue;
    const asc = signForLongitude(c.angles.asc).slug;
    const moonNow = signForLongitude(c.bodies.find((b) => b.body === 'Moon')!.lon).slug;
    if (asc === 'virgo' && moonNow === 'taurus') hits.push({ date, time: `${hh}:${mm}` });
  }
}

console.log('windows (date time):');
for (const h of hits) console.log(' ', h.date, h.time);

// Pick a candidate in the middle of a window, prefer mid-afternoon if any.
const pick = hits.find((h) => h.date === '1993-06-16' && h.time === '12:30')
  ?? hits.find((h) => h.time >= '14:00' && h.time <= '17:00')
  ?? hits[Math.floor(hits.length / 2)];
if (!pick) {
  console.log('NO MATCH');
  process.exit(1);
}
const chart = chartFor(pick.date, pick.time);
console.log('\nCHOSEN', pick.date, pick.time, 'America/New_York  New York, NY');
console.log('engine', chart.engineVersion, 'houses', chart.houses?.system);
console.log('\nbodies:');
for (const b of chart.bodies) {
  console.log(
    ' ',
    b.body.padEnd(11),
    formatLongitude(b.lon).padEnd(18),
    `lon=${b.lon.toFixed(4)}`.padEnd(14),
    b.retrograde ? 'Rx' : ''
  );
}
console.log('\nangles: ASC', formatLongitude(chart.angles!.asc), `(${chart.angles!.asc.toFixed(4)})`,
  ' MC', formatLongitude(chart.angles!.mc), `(${chart.angles!.mc.toFixed(4)})`);
console.log('\ncusps:', chart.houses!.cusps.map((c) => c.toFixed(2)).join(', '));
console.log('\naspects:');
for (const a of chart.aspects) {
  console.log(' ', a.a, a.type, a.b, `orb ${a.orb.toFixed(2)}°`, a.applying ? 'applying' : 'separating');
}
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const outPath = resolve(process.cwd(), 'video/data/natal-chart.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
  input: { date: pick.date, time: pick.time, tz: TZ, lat: LAT, lon: LON, place: 'New York, NY', houseSystem: 'placidus' },
  utc: chart.input.utc.toISOString(),
  engineVersion: chart.engineVersion,
  bodies: chart.bodies.map((b) => ({ body: b.body, lon: b.lon, retrograde: b.retrograde })),
  angles: chart.angles,
  cusps: chart.houses!.cusps,
  aspects: chart.aspects,
}, null, 2));
console.log('\nwrote', outPath);
