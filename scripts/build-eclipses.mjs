/*
 * Computes every solar and lunar eclipse over a three-year window into
 * committed JSON the /eclipses/ page renders as receipts.
 *
 *   npm run data:eclipses   →  src/data/eclipses.json
 *
 * Solar entries come from SearchGlobalSolarEclipse (geocentric view:
 * kind partial | annular | total, with obscuration defined only for
 * annular and total); lunar entries from SearchLunarEclipse (penumbral
 * | partial | total, obscuration always defined). Penumbral lunar
 * eclipses are kept in the data — the page decides how quietly to
 * present them. Each entry carries the zodiac sign of the eclipsed
 * luminary at peak (Sun for solar, Moon for lunar) and, for total
 * lunar eclipses, the length of totality in minutes.
 *
 * The script validates its own output (chronology, sign validity,
 * plausible count, and a hard anchor — the 2026-08-12 total solar
 * eclipse must be present) and refuses to write otherwise. Refresh
 * yearly alongside sky.json.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  MakeTime, GeoVector, RotateVector, Rotation_EQJ_ECT,
  SearchGlobalSolarEclipse, NextGlobalSolarEclipse,
  SearchLunarEclipse, NextLunarEclipse,
} from 'astronomy-engine';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'src/data/eclipses.json');
await mkdir(dirname(out), { recursive: true });

const FROM = new Date('2026-01-01T00:00:00Z');
const TO = new Date('2029-01-01T00:00:00Z');

// Mirrors src/lib/signs.ts SIGN_SLUGS order (scripts can't import the TS
// module; build-transits.mjs sets the precedent).
const SIGN_SLUGS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function lonAt(body, date) {
  const t = MakeTime(date);
  const vec = GeoVector(body, t, true);
  const ecl = RotateVector(Rotation_EQJ_ECT(t), vec);
  const lon = (Math.atan2(ecl.y, ecl.x) * 180) / Math.PI;
  return ((lon % 360) + 360) % 360;
}

const signAt = (body, date) => SIGN_SLUGS[Math.floor(lonAt(body, date) / 30) % 12];

const eclipses = [];

// ── Solar (geocentric "global" circumstances) ────────────────────────
let solar = SearchGlobalSolarEclipse(MakeTime(FROM));
for (let i = 0; i < 40 && solar && solar.peak.date < TO; i += 1) {
  const entry = {
    type: 'solar',
    kind: solar.kind,
    peak: solar.peak.date.toISOString(),
    sign: signAt('Sun', solar.peak.date),
  };
  // Undefined for partial eclipses — omit rather than fake it.
  if (typeof solar.obscuration === 'number') {
    entry.obscuration = +solar.obscuration.toFixed(3);
  }
  eclipses.push(entry);
  solar = NextGlobalSolarEclipse(solar.peak);
}

// ── Lunar ─────────────────────────────────────────────────────────────
let lunar = SearchLunarEclipse(MakeTime(FROM));
for (let i = 0; i < 40 && lunar && lunar.peak.date < TO; i += 1) {
  const entry = {
    type: 'lunar',
    kind: lunar.kind,
    peak: lunar.peak.date.toISOString(),
    sign: signAt('Moon', lunar.peak.date),
    obscuration: +lunar.obscuration.toFixed(3),
  };
  if (lunar.kind === 'total' && lunar.sd_total > 0) {
    entry.totalMinutes = Math.round(2 * lunar.sd_total);
  }
  eclipses.push(entry);
  lunar = NextLunarEclipse(lunar.peak);
}

eclipses.sort((a, b) => a.peak.localeCompare(b.peak));

// ── Self-validation: refuse to commit a corrupt sky ──────────────────
const problems = [];
for (let i = 1; i < eclipses.length; i += 1) {
  if (eclipses[i].peak <= eclipses[i - 1].peak) {
    problems.push(`not strictly chronological at ${eclipses[i].peak}`);
  }
}
const KINDS = { solar: ['partial', 'annular', 'total'], lunar: ['penumbral', 'partial', 'total'] };
for (const e of eclipses) {
  if (!SIGN_SLUGS.includes(e.sign)) problems.push(`bad sign ${e.sign} at ${e.peak}`);
  if (!KINDS[e.type]?.includes(e.kind)) problems.push(`bad kind ${e.type}/${e.kind} at ${e.peak}`);
  if (e.type === 'solar' && e.kind !== 'partial' && typeof e.obscuration !== 'number') {
    problems.push(`missing obscuration for ${e.kind} solar at ${e.peak}`);
  }
}
// 2026–2028 should hold roughly 4–7 eclipses/year including penumbral.
if (eclipses.length < 10 || eclipses.length > 24) {
  problems.push(`implausible count ${eclipses.length} for a 3-year window`);
}
// Hard anchor: the total solar eclipse of 2026-08-12 (peaks over the
// North Atlantic; totality crosses Iceland and Spain).
if (!eclipses.some((e) => e.type === 'solar' && e.kind === 'total' && e.peak.startsWith('2026-08-12'))) {
  problems.push('anchor missing: 2026-08-12 total solar eclipse');
}
if (problems.length > 0) {
  console.error('build-eclipses: validation failed —\n  ' + problems.join('\n  '));
  process.exit(1);
}

const payload = {
  generatedAt: new Date().toISOString(),
  from: FROM.toISOString(),
  to: TO.toISOString(),
  eclipses,
};
await writeFile(out, JSON.stringify(payload, null, 2) + '\n');
const solarCount = eclipses.filter((e) => e.type === 'solar').length;
console.log(`Done — ${solarCount} solar + ${eclipses.length - solarCount} lunar eclipses → src/data/eclipses.json`);
