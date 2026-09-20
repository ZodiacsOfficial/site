/**
 * Emits the Zodiacs side of the comparison: one record per corpus case.
 *
 *   node docs/platform/evidence/swiss-benchmark/tools/dump-zodiacs.mjs > zodiacs.json
 *
 * This reads the installed @zodiacs/engine — the same vendored rc.6 artifact
 * the site runs — and nothing else. It does not touch production data, does
 * not write into the repository, and makes no network request.
 */
import { natalChart, ENGINE_VERSION } from '@zodiacs/engine';
import { createNatalEnvelope } from '@zodiacs/engine/receipt';
import { MEASURE, HOLDOUT, BODIES } from './corpus.mjs';

const set = process.argv.includes('--holdout') ? HOLDOUT : MEASURE;

const out = { engine: ENGINE_VERSION, node: process.version, set: process.argv.includes('--holdout') ? 'holdout' : 'measure', cases: [] };

for (const kase of set) {
  const record = { id: kase.id, stratum: kase.stratum, utc: kase.utc };
  try {
    const chart = natalChart({
      utc: kase.utc,
      latitude: kase.latitude,
      longitude: kase.longitude,
      houseSystem: kase.houseSystem,
      timeKnown: kase.timeKnown,
    });
    const envelope = createNatalEnvelope(chart, { sourceInstant: kase.utc });
    record.conventions = envelope.receipt.conventions;
    record.bodies = Object.fromEntries(
      BODIES.map((b) => {
        const hit = chart.bodies.find((x) => x.body === b);
        return [b, hit ? { lon: hit.lon, lat: hit.lat, speed: hit.speed } : null];
      }),
    );
    record.angles = chart.angles;
    record.cusps = chart.houses?.cusps ?? null;
    record.houses = { requested: kase.houseSystem, actual: chart.houses?.system ?? null };
    record.resultFlags = chart.resultFlags ?? null;
  } catch (error) {
    record.error = error instanceof Error ? error.message : String(error);
  }
  out.cases.push(record);
}

process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
