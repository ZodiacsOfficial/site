import { ENGINE_VERSION, natalChart, transits } from '@zodiacs/engine';
import candidate from '../candidate.json' with { type: 'json' };

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function explicitInstant(value, label) {
  if (typeof value !== 'string' || !INSTANT.test(value) || value.trim() !== value) {
    throw new RangeError(`${label} must be an ISO date-time with Z or an explicit ±HH:mm offset.`);
  }
  return value; // Preserve the original: the engine rejects impossible dates before normalization.
}

function coordinate(value, label, minimum, maximum) {
  if (typeof value !== 'string' || !DECIMAL.test(value) || value.trim() !== value) {
    throw new RangeError(`${label} must be a nonempty finite decimal number.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum} degrees.`);
  }
  return number;
}

export function calculate(raw, mode = 'natal') {
  if (!['natal', 'transits'].includes(mode)) throw new RangeError('Unknown example mode.');
  if (ENGINE_VERSION !== candidate.version) throw new Error('Installed engine does not match this example candidate receipt.');
  if (!raw || typeof raw !== 'object') throw new RangeError('Inputs are required.');
  if (!['known', 'unknown'].includes(raw.timeKnown)) throw new RangeError('Select known or unknown birth time.');
  if (!['whole', 'placidus'].includes(raw.houseSystem)) throw new RangeError('Select whole-sign or Placidus houses.');
  const timeKnown = raw.timeKnown === 'known';
  let utc;
  if (timeKnown) utc = explicitInstant(raw.birthInstant, 'Birth instant');
  else {
    if (typeof raw.birthDate !== 'string' || !DATE.test(raw.birthDate) || raw.birthDate.trim() !== raw.birthDate) {
      throw new RangeError('Unknown-time birth date must use YYYY-MM-DD.');
    }
    utc = `${raw.birthDate}T12:00:00Z`;
  }
  const latitude = coordinate(raw.latitude, 'Latitude', -90, 90);
  const longitude = coordinate(raw.longitude, 'Longitude', -180, 180);
  if (Math.abs(latitude) === 90) throw new RangeError('Exact geographic poles are outside this example’s supported angle scope.');
  const snapshot = mode === 'transits' ? explicitInstant(raw.transitInstant, 'Transit instant') : null;
  const natal = natalChart({ utc, latitude, longitude, timeKnown, houseSystem: raw.houseSystem });
  const transit = snapshot === null ? null : transits(natal, snapshot);
  const receipt = {
    engine: { package: candidate.package, version: natal.engineVersion, status: candidate.status,
      artifactURL: candidate.url, artifactSHA256: candidate.sha256,
      artifactRepository: candidate.artifactRepository, artifactCommit: candidate.artifactCommit,
      sourceRepository: candidate.sourceRepository, sourceCommit: candidate.sourceCommit },
    submittedBirthInstant: timeKnown ? raw.birthInstant : null,
    birthUtc: natal.input.utc.toISOString(),
    birthTimeKnown: timeKnown,
    unknownTimeConvention: timeKnown ? null : '12:00 UTC on the entered date; approximate positions, no angles or houses',
    coordinates: { latitude, longitude },
    requestedHouseSystem: raw.houseSystem,
    actualHouseSystem: natal.houses?.system ?? null,
    flags: [...natal.flags],
    submittedTransitInstant: snapshot,
    transitUtc: transit?.at.toISOString() ?? null,
    conventions: {
      calendar: 'Proleptic Gregorian; explicit offsets are resolved instants, not birthplace timezone verification',
      zodiac: 'Tropical ecliptic of date', positions: 'Apparent geocentric; no topocentric parallax',
      units: 'Longitude degrees in [0, 360); speed degrees per day', nodes: 'True lunar nodes',
      transitAspects: transit ? 'Moving bodies to natal bodies; no natal ASC/MC contacts; instantaneous snapshot' : null,
    },
    limitations: 'Finite reference coverage; accepted date syntax is not a broad date-range accuracy claim. This is example metadata, not a complete durable calculation receipt.',
  };
  return transit
    ? { receipt, positions: transit.positions, aspects: transit.aspects }
    : { receipt, bodies: natal.bodies, angles: natal.angles, houses: natal.houses, aspects: natal.aspects };
}
