/**
 * This package's aberration against ERFA's eraAb.
 *
 *   node tools/measure/aberration-cases.mjs > /tmp/ab-cases.json
 *   PYTHONPATH=<pyerfa> python3 tools/measure/erfa-ab.py /tmp/ab-cases.json > /tmp/ab-erfa.json
 *   node tools/measure/aberration-vs-erfa.mjs /tmp/ab-cases.json /tmp/ab-erfa.json
 *
 * ERFA is a MEASURING INSTRUMENT here. Nothing ERFA produces is a fitting
 * target, no coefficient is tuned towards it, and none of its output is
 * redistributed.
 *
 * The two implementations are not expected to be identical, and the
 * difference is the point:
 *
 *   withPotential: true   should match eraAb to rounding -- same formula
 *   withPotential: false  should differ by exactly the Klioner solar-
 *                         potential term, which ERFA documents as at most
 *                         about 0.4 microarcsecond
 *
 * Reporting both is what distinguishes "we implemented the same thing" from
 * "we implemented a documented subset of the same thing".
 */
import { readFileSync } from 'node:fs';
import { aberrate, SRS } from '../../src/core/aberration.mjs';

const ARCSEC = (180 * 3600) / Math.PI;
const sepArcsec = (a, b) => {
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  const s = Math.sqrt(cx * cx + cy * cy + cz * cz);
  return Math.atan2(s, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * ARCSEC;
};

const cases = JSON.parse(readFileSync(process.argv[2], 'utf8')).cases;
const erfa = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const byId = new Map(erfa.cases.map((c) => [c.id, c]));

const rows = [];
let worstWith = 0;
let worstWithout = 0;
for (const c of cases) {
  const ref = byId.get(c.id);
  if (!ref) throw new Error(`ERFA side is missing case ${c.id}`);
  const withP = aberrate(c.pnat, c.v, { withPotential: true, sunDistanceAu: c.sunAu });
  const without = aberrate(c.pnat, c.v, { withPotential: false });
  const dWith = sepArcsec(withP, ref.ppr);
  const dWithout = sepArcsec(without, ref.ppr);
  worstWith = Math.max(worstWith, dWith);
  worstWithout = Math.max(worstWithout, dWithout);
  // The omitted term is w2 (v - (p.v) p), whose component across the line of
  // sight is w2 |v_perp|. To first order that IS the angular difference, so
  // the difference can be PREDICTED rather than merely bounded.
  const pl = Math.sqrt(c.pnat[0] ** 2 + c.pnat[1] ** 2 + c.pnat[2] ** 2);
  const ph = [c.pnat[0] / pl, c.pnat[1] / pl, c.pnat[2] / pl];
  const pdv = ph[0] * c.v[0] + ph[1] * c.v[1] + ph[2] * c.v[2];
  const vp = [c.v[0] - pdv * ph[0], c.v[1] - pdv * ph[1], c.v[2] - pdv * ph[2]];
  const vperp = Math.sqrt(vp[0] ** 2 + vp[1] ** 2 + vp[2] ** 2);
  const speed = Math.sqrt(c.v[0] ** 2 + c.v[1] ** 2 + c.v[2] ** 2);
  const predicted = (SRS / c.sunAu) * vperp * ARCSEC;
  rows.push({
    id: c.id, sunAu: c.sunAu, speedOverC: speed,
    withPotentialArcsec: dWith,
    withoutPotentialArcsec: dWithout,
    predictedPotentialArcsec: predicted,
    ratioObservedOverPredicted: predicted > 0 ? dWithout / predicted : null,
  });
}
const report = {
  what: 'this package aberrate() vs ERFA eraAb, same inputs',
  erfaBinding: erfa.binding,
  erfaSource: 'liberfa/erfa src/ab.c, revision 2021-02-24',
  cases: rows.length,
  worstWithPotentialArcsec: worstWith,
  worstWithoutPotentialArcsec: worstWithout,
  matchesErfaWhenPotentialIncluded: worstWith < 1e-9,
  // ERFA's note says "about 0.4 microarcsecond". That is its size at 1 au for
  // an EARTH-LIKE observer, not a universal bound: the term is SRS/s times the
  // transverse speed, so it grows as the Sun is approached and as the observer
  // speeds up. An earlier version of this tool compared every case against
  // 4e-7 arcsec and reported a spurious failure at beta = 0.5.
  earthlikeAt1AuArcsec: rows.find((r) => r.id === 'transverse-earthlike')?.withoutPotentialArcsec ?? null,
  erfaStatedEarthlikeFigureArcsec: 4e-7,
  // The real check: the omitted difference must BE the potential term.
  // Only where the term is large enough to MEASURE. Below about 1e-9 arcsec
  // the separation of two unit vectors is a few ulp of the arithmetic, so a
  // ratio there reports the noise floor of the comparison rather than any
  // disagreement: the worst offenders sit at 1e-10 arcsec, i.e. ~5e-16 rad.
  measurableFloorArcsec: 1e-9,
  measurableCases: rows.filter((r) => r.speedOverC < 1e-3 && r.predictedPotentialArcsec > 1e-9).length,
  worstRelativeDeviationWhereMeasurable: Math.max(
    ...rows.filter((r) => r.speedOverC < 1e-3 && r.predictedPotentialArcsec > 1e-9)
      .map((r) => Math.abs(r.ratioObservedOverPredicted - 1)),
  ),
  differenceIsExactlyThePotentialTerm: rows
    .filter((r) => r.speedOverC < 1e-3 && r.predictedPotentialArcsec > 1e-9)
    .every((r) => Math.abs(r.ratioObservedOverPredicted - 1) < 5e-3),
  rows: rows.filter((r) => !r.id.startsWith('sweep-')).concat(rows.filter((r) => r.id.startsWith('sweep-')).slice(0, 3)),
};
process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
