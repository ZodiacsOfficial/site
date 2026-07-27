/**
 * Phase 5A pilot chart computation and screening.
 *
 * Reads the cached evidence records and produces, for each candidate, the
 * exact facts a person page may state and the screening verdicts the
 * pilot contract requires. Nothing here touches the network: it consumes
 * only committed evidence plus the repository's own ephemeris.
 *
 * Conventions are taken from the live birth-chart engine so a People page
 * and the calculator never disagree:
 *   - unknown time  → 12:00 civil time at the birthplace's IANA zone,
 *     resolved through the full tzdb history (Intl), exactly as
 *     ChartCalculator does (`effectiveTime = timeKnown ? time : '12:00'`).
 *   - ecliptic longitudes → GeoVector + Rotation_EQJ_ECT, as
 *     src/lib/engine/server-ephemeris.ts computes them.
 *   - aspects/orbs → @zodiacs/engine/internal/math, the site's own table.
 *
 *   node docs/phase5/people-pilot/tools/compute-astro.mjs
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { findAspects } from '@zodiacs/engine/internal/math';

const require = createRequire(import.meta.url);
const Astronomy = require('astronomy-engine');
const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT = join(HERE, '..');
const RAD = 180 / Math.PI;

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const SIGN_NAMES = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};
const BODIES = [
  ['Sun', Astronomy.Body.Sun], ['Moon', Astronomy.Body.Moon],
  ['Mercury', Astronomy.Body.Mercury], ['Venus', Astronomy.Body.Venus],
  ['Mars', Astronomy.Body.Mars], ['Jupiter', Astronomy.Body.Jupiter],
  ['Saturn', Astronomy.Body.Saturn], ['Uranus', Astronomy.Body.Uranus],
  ['Neptune', Astronomy.Body.Neptune], ['Pluto', Astronomy.Body.Pluto],
];

/**
 * Rulership, exaltation, detriment and fall — sign-based, so time-free.
 * Values and the exaltation-outranks-domicile precedence are copied from
 * src/lib/dignities.ts; validate-pilot.mjs asserts the two stay identical
 * so a People page can never disagree with a chart page.
 */
const DIGNITY = {
  Sun: { domicile: ['leo'], exaltation: ['aries'], detriment: ['aquarius'], fall: ['libra'] },
  Moon: { domicile: ['cancer'], exaltation: ['taurus'], detriment: ['capricorn'], fall: ['scorpio'] },
  Mercury: { domicile: ['gemini', 'virgo'], exaltation: ['virgo'], detriment: ['sagittarius', 'pisces'], fall: ['pisces'] },
  Venus: { domicile: ['taurus', 'libra'], exaltation: ['pisces'], detriment: ['scorpio', 'aries'], fall: ['virgo'] },
  Mars: { domicile: ['aries', 'scorpio'], exaltation: ['capricorn'], detriment: ['libra', 'taurus'], fall: ['cancer'] },
  Jupiter: { domicile: ['sagittarius', 'pisces'], exaltation: ['cancer'], detriment: ['gemini', 'virgo'], fall: ['capricorn'] },
  Saturn: { domicile: ['capricorn', 'aquarius'], exaltation: ['libra'], detriment: ['cancer', 'leo'], fall: ['aries'] },
};
const ELEMENT = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};
const MODALITY = {
  aries: 'cardinal', cancer: 'cardinal', libra: 'cardinal', capricorn: 'cardinal',
  taurus: 'fixed', leo: 'fixed', scorpio: 'fixed', aquarius: 'fixed',
  gemini: 'mutable', virgo: 'mutable', sagittarius: 'mutable', pisces: 'mutable',
};

const norm = (value) => ((value % 360) + 360) % 360;

function longitudeOf(body, date) {
  const time = Astronomy.MakeTime(date);
  const equatorial = Astronomy.GeoVector(body, time, true);
  const ecliptic = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time), equatorial);
  return norm(Math.atan2(ecliptic.y, ecliptic.x) * RAD);
}

function positions(date) {
  const out = [];
  for (const [name, body] of BODIES) {
    const lon = longitudeOf(body, date);
    const ahead = longitudeOf(body, new Date(date.getTime() + 3_600_000));
    let speed = (ahead - lon) * 24;
    if (speed > 180) speed -= 360 * 24;
    if (speed < -180) speed += 360 * 24;
    out.push({ body: name, lon, lat: 0, speed, retrograde: speed < 0 });
  }
  return out;
}

function signOf(lon) {
  const index = Math.floor(norm(lon) / 30) % 12;
  return { slug: SIGNS[index], name: SIGN_NAMES[SIGNS[index]], degree: norm(lon) - index * 30 };
}

/** UTC offset in minutes east for an IANA zone at a UTC instant (LMT-precise). */
function offsetMinutes(timeZone, utcMs) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(utcMs);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = name.match(/GMT([+-])?(\d{1,2})?(?::(\d{2}))?(?::(\d{2}))?/u);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) + Number(match[4] ?? 0) / 60);
}

/** Civil wall time at the birthplace → UTC instant, two-pass like localToUtc.ts. */
function civilToUtc(dateIso, hhmm, timeZone) {
  const [hour, minute] = hhmm.split(':').map(Number);
  const naive = Date.UTC(
    Number(dateIso.slice(0, 4)), Number(dateIso.slice(5, 7)) - 1, Number(dateIso.slice(8, 10)),
    hour, minute, 0, 0,
  );
  let guess = naive - offsetMinutes(timeZone, naive) * 60_000;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = naive - offsetMinutes(timeZone, guess) * 60_000;
    if (next === guess) break;
    guess = next;
  }
  return { utc: new Date(guess), offsetMinutes: offsetMinutes(timeZone, guess) };
}

function nextCivilDate(dateIso) {
  const next = new Date(Date.UTC(
    Number(dateIso.slice(0, 4)),
    Number(dateIso.slice(5, 7)) - 1,
    Number(dateIso.slice(8, 10)) + 1,
  ));
  return next.toISOString().slice(0, 10);
}

/** Julian calendar day → proleptic Gregorian ISO date. */
function julianToGregorian(iso) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  // Julian day number from a Julian-calendar date, then back to Gregorian.
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  let l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  l -= Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const gDay = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const gMonth = j + 2 - 12 * l;
  const gYear = 100 * (n - 49) + i + l;
  return `${String(gYear).padStart(4, '0')}-${String(gMonth).padStart(2, '0')}-${String(gDay).padStart(2, '0')}`;
}

/**
 * The operative cusp test: does a solar ingress fall anywhere inside the
 * birthplace's civil day? The UTC day is NOT a superset of it — the local
 * day is shifted by up to twelve hours either way — so a birth on an
 * ingress day away from Greenwich can cross a sign boundary locally while
 * the UTC window looks settled. Every other day-stability test in this
 * file samples the civil day; this one must agree with them. With no zone
 * resolvable the record is excluded anyway, so the UTC window is a safe
 * fallback for the screening record.
 */
function cuspCheck(gregorianIso, timeZone) {
  const start = timeZone
    ? civilToUtc(gregorianIso, '00:00', timeZone).utc
    : new Date(`${gregorianIso}T00:00:00.000Z`);
  const end = timeZone
    ? civilToUtc(nextCivilDate(gregorianIso), '00:00', timeZone).utc
    : new Date(`${gregorianIso}T23:59:59.999Z`);
  const startSign = Math.floor(norm(longitudeOf(Astronomy.Body.Sun, start)) / 30);
  const endSign = Math.floor(norm(longitudeOf(Astronomy.Body.Sun, end)) / 30);
  if (startSign === endSign) {
    // Distance in degrees to the nearer boundary across the window.
    const lonStart = norm(longitudeOf(Astronomy.Body.Sun, start));
    const lonEnd = norm(longitudeOf(Astronomy.Body.Sun, end));
    return {
      ambiguous: false,
      boundaryUtc: null,
      degreesInsideAtWindowStart: Number((lonStart - startSign * 30).toFixed(4)),
      degreesToNextBoundaryAtWindowEnd: Number((30 - (lonEnd - endSign * 30)).toFixed(4)),
    };
  }
  // Bisect to the ingress instant for the record.
  let lo = start.getTime();
  let hi = end.getTime();
  for (let step = 0; step < 60; step += 1) {
    const mid = (lo + hi) / 2;
    const midSign = Math.floor(norm(longitudeOf(Astronomy.Body.Sun, new Date(mid))) / 30);
    if (midSign === startSign) lo = mid; else hi = mid;
  }
  return {
    ambiguous: true,
    boundaryUtc: new Date(Math.round((lo + hi) / 2)).toISOString(),
    fromSign: SIGNS[startSign],
    toSign: SIGNS[endSign],
  };
}

/**
 * PEOPLE_SET=expansion switches every input/output to the 500-person
 * expansion set: candidates-expansion.json, evidence-expansion/,
 * computed-expansion/, screening-expansion.json. Zones for the expansion
 * come from coordinates via tz-lookup (the same modern-IANA-zone
 * convention the reviewed timezones.json applied by hand), and each
 * resolved zone is written into the record for review.
 */
const EXPANSION = process.env.PEOPLE_SET === 'expansion';
const CANDIDATES_FILE = EXPANSION ? 'candidates-expansion.json' : 'candidates.json';
const EVIDENCE_DIR = EXPANSION ? 'evidence-expansion' : 'evidence';
const COMPUTED_DIR = EXPANSION ? 'computed-expansion' : 'computed';
const SCREENING_FILE = EXPANSION ? 'screening-expansion.json' : 'screening.json';
const candidates = JSON.parse(await readFile(join(PILOT, CANDIDATES_FILE), 'utf8'));
const zones = EXPANSION ? {} : JSON.parse(await readFile(join(PILOT, 'timezones.json'), 'utf8'));
let tzLookup = null;
if (EXPANSION) {
  /* Research-only dependency, deliberately outside the production
     lockfile (the daily provenance record hashes package-lock.json).
     Install ephemerally when running the expansion pipeline:
       npm install --no-save tz-lookup@6.1.25 */
  const { createRequire: createTzRequire } = await import('node:module');
  try {
    tzLookup = createTzRequire(import.meta.url)('tz-lookup');
  } catch {
    throw new Error('tz-lookup is required for PEOPLE_SET=expansion: npm install --no-save tz-lookup@6.1.25');
  }
}
await mkdir(join(PILOT, COMPUTED_DIR), { recursive: true });

const screening = [];
for (const candidate of candidates) {
  const files = await readdir(join(PILOT, EVIDENCE_DIR));
  if (!files.includes(`${candidate.slug}.json`)) {
    screening.push({ slug: candidate.slug, verdict: 'excluded', reason: 'no-evidence-record' });
    continue;
  }
  const evidence = JSON.parse(await readFile(join(PILOT, EVIDENCE_DIR, `${candidate.slug}.json`), 'utf8'));
  if (evidence.status === 'no-wikidata-entity') {
    screening.push({ slug: candidate.slug, verdict: 'excluded', reasons: ['no-wikidata-entity'] });
    continue;
  }
  if (EXPANSION && evidence.living !== false) {
    screening.push({ slug: candidate.slug, qid: evidence.qid, displayName: evidence.displayName,
      verdict: 'excluded', reasons: ['living or death unrecorded — the expansion admits deceased public figures only'] });
    continue;
  }
  const reasons = [];

  // 1. Day precision.
  if (evidence.birth.precision !== 'day') reasons.push(`birth-date precision is ${evidence.birth.precision}, not day`);

  // 2. Conflicting evidence: distinct non-deprecated day-precision instants.
  const live = evidence.birth.allValues.filter((value) => value.rank !== 'deprecated' && value.precision === 11);
  const instants = new Set(live.map((value) => (
    value.calendar === 'proleptic-julian'
      ? julianToGregorian(value.time.slice(1, 11))
      : value.time.slice(1, 11)
  )));
  if (instants.size > 1) {
    reasons.push(`conflicting birth dates after calendar normalisation: ${[...instants].join(' vs ')}`);
  }

  // 3. Calendar model present, and the Option A Julian rule.
  const calendar = evidence.birth.calendarModel;
  if (!calendar || calendar.startsWith('unknown')) reasons.push('missing or unrecognised calendar model');
  if (calendar === 'proleptic-julian') reasons.push('Julian-dated birth — excluded by the Phase 5A Option A rule');

  // 4. Birthplace coordinates (with the recorded escalation fallback).
  const coordinates = evidence.birthPlace?.coordinates ?? null;
  if (!coordinates) reasons.push('no birthplace coordinates within the permitted escalation');
  if (coordinates && coordinates.escalationSteps > 1) {
    reasons.push(`coordinate escalation of ${coordinates.escalationSteps} steps exceeds the 1-step limit`);
  }

  if (!evidence.birth.time) reasons.push('no birth-date claim');
  const rawDate = evidence.birth.time ? evidence.birth.time.slice(1, 11) : null;
  if (rawDate && !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u.test(rawDate)) {
    reasons.push(`birth date is not a real calendar day (${rawDate})`);
  }
  if (reasons.length > 0) {
    screening.push({
      slug: candidate.slug, qid: evidence.qid, displayName: evidence.displayName,
      role: candidate.role ?? 'pilot', verdict: 'excluded',
      storedDate: rawDate, calendarModel: calendar, reasons,
    });
    continue;
  }
  const gregorianDate = calendar === 'proleptic-julian'
    ? julianToGregorian(evidence.birth.time.slice(1, 11))
    : evidence.birth.time.slice(1, 11);

  let timeZone = zones[candidate.slug] ?? null;
  if (!timeZone && EXPANSION && evidence.birthPlace?.coordinates) {
    try {
      timeZone = tzLookup(evidence.birthPlace.coordinates.latitude, evidence.birthPlace.coordinates.longitude);
    } catch { timeZone = null; }
  }
  if (!timeZone && (EXPANSION || candidate.role === 'pilot')) reasons.push('no IANA zone resolvable for the birthplace');

  // 5. Cusp determinability, measured on the birthplace's own civil day —
  // which is why it waits for the zone above.
  const cusp = cuspCheck(gregorianDate, timeZone);
  if (cusp.ambiguous) {
    reasons.push(`cusp-ambiguous: solar ingress ${cusp.fromSign}→${cusp.toSign} at ${cusp.boundaryUtc}`);
  }

  if ((!EXPANSION && candidate.role !== 'pilot') || reasons.length > 0) {
    screening.push({
      slug: candidate.slug,
      qid: evidence.qid,
      displayName: evidence.displayName,
      role: candidate.role,
      verdict: reasons.length > 0 ? 'excluded' : 'eligible-not-selected',
      storedDate: evidence.birth.time.slice(1, 11),
      calendarModel: calendar,
      gregorianDate,
      cusp,
      reasons,
    });
    if (reasons.length > 0) continue;
  }

  // ── Accepted: compute the chart at noon civil time at the birthplace ──
  const { utc: noonUtc, offsetMinutes: noonOffset } = civilToUtc(gregorianDate, '12:00', timeZone);
  const dayStart = civilToUtc(gregorianDate, '00:00', timeZone).utc;
  const dayEnd = civilToUtc(nextCivilDate(gregorianDate), '00:00', timeZone).utc;

  const noon = positions(noonUtc);
  const early = positions(dayStart);
  const late = positions(dayEnd);
  // The endpoints alone cannot prove a body did not cross a boundary and
  // return during a station. Sample the complete civil day hourly, including
  // both bounding midnights. This remains deterministic and comfortably
  // cheap for the 20-record pilot.
  const civilDaySamples = Array.from({ length: 25 }, (_, index) => (
    positions(new Date(dayStart.getTime() + ((dayEnd.getTime() - dayStart.getTime()) * index) / 24))
  ));

  const moonEarly = signOf(early.find((body) => body.body === 'Moon').lon);
  const moonLate = signOf(late.find((body) => body.body === 'Moon').lon);
  const moonUncertain = moonEarly.slug !== moonLate.slug;

  // Error band from the ±12h unknown-time window, per body. Summed over
  // the two half-days as shortest arcs, so a 0°/360° crossing does not
  // read as a full circle of motion.
  const arc = (from, to) => ((to - from + 540) % 360) - 180;
  const band = {};
  for (const body of noon) {
    const a = early.find((value) => value.body === body.body).lon;
    const b = late.find((value) => value.body === body.body).lon;
    band[body.body] = Number(Math.abs(arc(a, body.lon) + arc(body.lon, b)).toFixed(3));
  }

  // Aspects that hold across the whole civil day, reported at noon.
  const noonAspects = findAspects(noon);
  const sampledAspectKeys = civilDaySamples.map((sample) => (
    new Set(findAspects(sample).map((aspect) => `${aspect.a}|${aspect.b}|${aspect.type}`))
  ));
  const stableAspects = noonAspects
    .filter((aspect) => {
      const key = `${aspect.a}|${aspect.b}|${aspect.type}`;
      return sampledAspectKeys.every((keys) => keys.has(key));
    })
    .map((aspect) => ({ ...aspect, orb: Number(aspect.orb.toFixed(2)) }))
    .sort((a, b) => a.orb - b.orb);

  const placements = noon.map((body) => {
    const sign = signOf(body.lon);
    const dignity = DIGNITY[body.body];
    const sampledBodies = civilDaySamples.map((sample) => (
      sample.find((value) => value.body === body.body)
    ));
    let condition = null;
    if (dignity) {
      // Exaltation/fall outrank domicile/detriment where they overlap,
      // matching src/lib/dignities.ts (Mercury in Virgo reads exalted).
      if (dignity.exaltation.includes(sign.slug)) condition = 'exaltation';
      else if (dignity.fall.includes(sign.slug)) condition = 'fall';
      else if (dignity.domicile.includes(sign.slug)) condition = 'domicile';
      else if (dignity.detriment.includes(sign.slug)) condition = 'detriment';
    }
    return {
      body: body.body,
      sign: sign.slug,
      signName: sign.name,
      degree: Number(sign.degree.toFixed(2)),
      retrograde: body.retrograde,
      speedPerDay: Number(body.speed.toFixed(4)),
      dignity: condition,
      stableAcrossDay: sampledBodies.every((value) => signOf(value.lon).slug === sign.slug),
      retrogradeStableAcrossDay: sampledBodies.every((value) => value.retrograde === body.retrograde),
    };
  });
  const signUncertainTransitions = placements
    .filter((placement) => !placement.stableAcrossDay)
    .map((placement) => ({
      body: placement.body,
      signAtCivilDayStart: signOf(
        early.find((value) => value.body === placement.body).lon,
      ).slug,
      signAtCivilDayEnd: signOf(
        late.find((value) => value.body === placement.body).lon,
      ).slug,
    }));

  // Unknown-time aggregates may use only signs that hold for the complete
  // civil day. In particular, an uncertain Moon must never silently decide
  // an element balance, modality balance, or stellium.
  const settledPlacements = placements.filter((placement) => placement.stableAcrossDay);
  const stelliums = Object.entries(settledPlacements.reduce((acc, placement) => {
    acc[placement.sign] = (acc[placement.sign] ?? 0) + 1;
    return acc;
  }, {})).filter(([, count]) => count >= 3).map(([sign, count]) => ({ sign, count }));

  const elements = settledPlacements.reduce((acc, placement) => {
    acc[ELEMENT[placement.sign]] = (acc[ELEMENT[placement.sign]] ?? 0) + 1;
    return acc;
  }, {});
  const modalities = settledPlacements.reduce((acc, placement) => {
    acc[MODALITY[placement.sign]] = (acc[MODALITY[placement.sign]] ?? 0) + 1;
    return acc;
  }, {});

  const sun = placements.find((placement) => placement.body === 'Sun');
  const moon = placements.find((placement) => placement.body === 'Moon');
  const record = {
    schema: 'zodiacs.phase5.computed.v1',
    slug: candidate.slug,
    qid: evidence.qid,
    displayName: evidence.displayName,
    calendarModel: calendar,
    storedDate: evidence.birth.time.slice(1, 11),
    gregorianDate,
    displayedDate: gregorianDate,
    birthdayCrossLinkKey: gregorianDate,
    timeQuality: 'unknown',
    computation: {
      convention: 'noon civil time at the birthplace IANA zone, angles and houses omitted',
      timeZone,
      civilTime: '12:00',
      utcInstant: noonUtc.toISOString(),
      utcOffsetMinutesAtBirth: Number(noonOffset.toFixed(4)),
      civilDayStartUtc: dayStart.toISOString(),
      civilDayEndUtc: dayEnd.toISOString(),
      latitude: evidence.birthPlace.coordinates.latitude,
      longitude: evidence.birthPlace.coordinates.longitude,
      coordinateEscalationSteps: evidence.birthPlace.coordinates.escalationSteps,
      coordinateSourceEntity: evidence.birthPlace.coordinates.sourceEntity,
      ephemeris: 'astronomy-engine via GeoVector + Rotation_EQJ_ECT (server-ephemeris.ts convention)',
      aspectTable: '@zodiacs/engine/internal/math',
      anglesComputed: false,
      housesComputed: false,
      sectComputed: false,
    },
    sun: { sign: sun.sign, signName: sun.signName, degree: sun.degree },
    moon: {
      sign: moon.sign, signName: moon.signName, degree: moon.degree,
      uncertain: moonUncertain,
      signAtCivilDayStart: moonEarly.slug,
      signAtCivilDayEnd: moonLate.slug,
    },
    cusp,
    unknownTimeErrorBandDegrees: band,
    signUncertainTransitions,
    placements,
    aspectsStableAcrossCivilDay: stableAspects,
    aspectsAtNoonOnly: noonAspects
      .filter((aspect) => !stableAspects.some((stable) => stable.a === aspect.a && stable.b === aspect.b && stable.type === aspect.type))
      .map((aspect) => ({ ...aspect, orb: Number(aspect.orb.toFixed(2)) })),
    patterns: {
      settledBodyCount: settledPlacements.length,
      stelliums,
      elements,
      modalities,
      retrograde: placements
        .filter((placement) => placement.retrograde && placement.retrogradeStableAcrossDay)
        .map((placement) => placement.body),
      directionUncertain: placements
        .filter((placement) => !placement.retrogradeStableAcrossDay)
        .map((placement) => placement.body),
    },
  };

  await writeFile(
    join(PILOT, COMPUTED_DIR, `${candidate.slug}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8',
  );
  screening.push({
    slug: candidate.slug,
    qid: evidence.qid,
    displayName: evidence.displayName,
    role: candidate.role,
    verdict: 'accepted',
    storedDate: record.storedDate,
    calendarModel: calendar,
    gregorianDate,
    sun: `${sun.signName} ${sun.degree.toFixed(2)}°`,
    moonUncertain,
    cusp,
    reasons: [],
  });
}

await writeFile(
  join(PILOT, SCREENING_FILE),
  `${JSON.stringify({
    schema: 'zodiacs.phase5.screening.v1',
    generatedFrom: 'docs/phase5/people-pilot/evidence + repository ephemeris',
    julianRule: 'Option A — Julian-dated births are excluded from the Phase 5A pilot',
    cuspRule: 'excluded when a solar ingress falls inside the 24-hour UTC window of the birth date',
    candidates: screening,
  }, null, 2)}\n`,
  'utf8',
);

console.table(screening.map((row) => ({
  slug: row.slug,
  verdict: row.verdict,
  date: row.gregorianDate,
  calendar: row.calendarModel,
  sun: row.sun ?? '',
  moonUncertain: row.moonUncertain ?? '',
  reason: row.reasons?.[0] ?? '',
})));
