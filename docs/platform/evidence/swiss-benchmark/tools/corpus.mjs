/**
 * The stratified comparison corpus, declared BEFORE any measurement was taken.
 *
 * Every case is synthetic: round public coordinates for well-known cities on
 * dates chosen for what they exercise. No real person's birth details appear
 * here or anywhere in this laboratory.
 *
 * The strata exist so that a headline number cannot be assembled out of the
 * easy cases. `measure` is the set the declared hypothesis is judged on;
 * `holdout` is not looked at until the measurement set is settled, so that a
 * tolerance cannot be tuned against the cases it will be reported on.
 */

/** Round, public, non-personal places. */
const PLACES = {
  newYork: { latitude: 40.7128, longitude: -74.006 },
  london: { latitude: 51.5074, longitude: -0.1278 },
  sydney: { latitude: -33.8688, longitude: 151.2093 },
  nairobi: { latitude: -1.2921, longitude: 36.8219 },
  longyearbyen: { latitude: 78.2232, longitude: 15.6267 },
  quito: { latitude: -0.1807, longitude: -78.4678 },
};

const c = (id, stratum, utc, place, extra = {}) => ({
  id, stratum, utc, ...PLACES[place], place, houseSystem: 'placidus', timeKnown: true, ...extra,
});

export const MEASURE = [
  // Ordinary modern cases — the bulk of real use.
  c('modern-01', 'ordinary', '1988-03-21T06:45:00Z', 'newYork'),
  c('modern-02', 'ordinary', '1990-06-15T13:30:00Z', 'london'),
  c('modern-03', 'ordinary', '2001-09-11T12:00:00Z', 'sydney'),
  c('modern-04', 'ordinary', '2015-11-02T23:59:00Z', 'nairobi'),
  c('modern-05', 'ordinary', '2024-02-29T00:00:00Z', 'london'),
  c('modern-06', 'ordinary', '2026-09-20T08:00:00Z', 'newYork'),
  // Equinox / solstice boundaries: the Sun crosses a sign boundary.
  c('ingress-01', 'boundary', '2024-03-20T03:06:00Z', 'london'),
  c('ingress-02', 'boundary', '2024-06-20T20:51:00Z', 'london'),
  // Historical — Delta-T grows and ephemeris quality changes.
  c('historic-01', 'historical', '1900-01-01T12:00:00Z', 'london'),
  c('historic-02', 'historical', '1850-07-04T18:00:00Z', 'newYork'),
  c('historic-03', 'historical', '1801-01-01T00:00:00Z', 'london'),
  // Future.
  c('future-01', 'future', '2100-01-01T00:00:00Z', 'london'),
  c('future-02', 'future', '2190-12-31T23:00:00Z', 'sydney'),
  // Equator and the anti-meridian — coordinate wraparound.
  c('geo-01', 'geometry', '2000-01-01T00:00:00Z', 'quito'),
  c('geo-02', 'geometry', '2000-01-01T00:00:00Z', 'sydney'),
  // Polar: Placidus is undefined; the engine must fall back and say so.
  c('polar-01', 'polar', '1990-12-15T09:00:00Z', 'longyearbyen'),
  c('polar-02', 'polar', '2020-06-21T00:00:00Z', 'longyearbyen', { houseSystem: 'whole' }),
  // Unknown birth time: angles and houses must be suppressed.
  c('unknown-01', 'unknown-time', '1975-05-05T12:00:00Z', 'london', { timeKnown: false }),
];

/** Held back until the measurement set is settled. Never used for tuning. */
export const HOLDOUT = [
  c('hold-01', 'ordinary', '1969-07-20T20:17:00Z', 'newYork'),
  c('hold-02', 'ordinary', '2010-10-10T10:10:00Z', 'nairobi'),
  c('hold-03', 'historical', '1820-03-15T06:00:00Z', 'london'),
  c('hold-04', 'future', '2150-08-08T08:08:00Z', 'quito'),
  c('hold-05', 'boundary', '2025-12-21T15:03:00Z', 'london'),
  c('hold-06', 'polar', '2005-01-10T12:00:00Z', 'longyearbyen'),
];

export const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
