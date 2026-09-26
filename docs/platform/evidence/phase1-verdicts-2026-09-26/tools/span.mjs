/*
 * Step 1.7 on the installed (vendored) engine: the outside-reference-span
 * flag at the rule's years, 2300 and 900, and at both edges of the span.
 *
 *   node tools/span.mjs > results/step-1.7.json
 */
import { ENGINE_VERSION, REFERENCE_SPAN, natalChart, outsideReferenceSpan } from '@zodiacs/engine';

const instants = [
  '2300-06-15T12:00:00Z', '0900-06-15T12:00:00Z',
  '1799-12-31T23:59:59.999Z', '1800-01-01T00:00:00Z',
  '2199-12-31T23:59:59.999Z', '2200-01-01T00:00:00Z',
];
const rows = instants.map((utc) => {
  const chart = natalChart({ utc, timeKnown: true, latitude: 51.5, longitude: 0, houseSystem: 'whole' });
  return { utc, flagged: chart.flags.includes('outside-reference-span'), outsideReferenceSpan: outsideReferenceSpan(new Date(utc)) };
});
process.stdout.write(`${JSON.stringify({ engine: ENGINE_VERSION, span: REFERENCE_SPAN, rows }, null, 1)}\n`);
