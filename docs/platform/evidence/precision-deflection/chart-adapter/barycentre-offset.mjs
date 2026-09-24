/**
 * How far is a planetary-SYSTEM barycentre from the planet's centre, in
 * kilometres and in the angle it subtends from Earth?
 *
 * Inputs are published masses and mean semi-major axes; the offset is the
 * mass-weighted sum of satellite displacements, quoted two ways:
 *
 *   max      every satellite aligned -- an upper bound, not a typical value
 *   rms      root-sum-square, which is what independent phases give
 *
 * Neither is a measurement of a particular date. They are here to answer
 * one question: is the CONVENTION difference between a body centre and a
 * system barycentre small compared with the deflection correction, or not?
 */
const ARCSEC = (180 * 3600) / Math.PI;
const AU = 1.495978707e8;

const SYSTEMS = [
  ['Mars', 6.4171e23, [['Phobos', 1.0659e16, 9376], ['Deimos', 1.4762e15, 23463]], 0.52],
  ['Jupiter', 1.89813e27, [['Io', 8.9319e22, 421800], ['Europa', 4.7998e22, 671100],
    ['Ganymede', 1.4819e23, 1070400], ['Callisto', 1.0759e23, 1882700]], 4.20],
  ['Saturn', 5.6832e26, [['Titan', 1.3452e23, 1221870], ['Rhea', 2.3065e21, 527108],
    ['Iapetus', 1.8056e21, 3560820]], 8.00],
  ['Uranus', 8.6811e25, [['Titania', 3.400e21, 435910], ['Oberon', 3.076e21, 583520],
    ['Ariel', 1.251e21, 190900], ['Umbriel', 1.275e21, 266000]], 17.30],
  ['Neptune', 1.02409e26, [['Triton', 2.1389e22, 354759]], 28.80],
  ['Pluto', 1.303e22, [['Charon', 1.586e21, 19596]], 28.70],
];

process.stdout.write('system    max offset  rms offset   at min geocentric distance:  max      rms\n');
for (const [name, mass, moons, minAu] of SYSTEMS) {
  const total = mass + moons.reduce((s, m) => s + m[1], 0);
  const terms = moons.map(([, m, a]) => (m / total) * a);
  const max = terms.reduce((s, t) => s + t, 0);
  const rms = Math.sqrt(terms.reduce((s, t) => s + t * t, 0));
  const dist = minAu * AU;
  process.stdout.write(`${name.padEnd(9)} ${max.toFixed(1).padStart(9)} km ${rms.toFixed(1).padStart(9)} km `
    + `  ${String(minAu).padStart(5)} au           ${((max / dist) * ARCSEC).toFixed(4).padStart(7)}\" ${((rms / dist) * ARCSEC).toFixed(4).padStart(7)}\"\n`);
}
process.stdout.write(`\nfor comparison, the largest deflection the supported domain admits: 0.094847"\n`);
