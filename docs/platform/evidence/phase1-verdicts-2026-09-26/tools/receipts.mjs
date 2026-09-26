/*
 * Step 1.4 gate 2 and step 1.11 on the installed (vendored) engine: what an
 * rc.8 receipt carries, and which altered receipts the validator refuses.
 * With a path to an install of the rc.7 tarball, also checks that an rc.7
 * receipt, which predates the ephemeris field, still parses.
 *
 *   node tools/receipts.mjs [<rc.7 install directory>] > results/receipts.json
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE_VERSION, natalChart } from '@zodiacs/engine';
import { createNatalEnvelope, parseNatalEnvelope, serializeNatalEnvelope } from '@zodiacs/engine/receipt';

const birth = { utc: '1990-06-15T18:30:00Z', timeKnown: true, latitude: 40.71, longitude: -74, houseSystem: 'placidus' };
const envelope = createNatalEnvelope(natalChart(birth));
const text = serializeNatalEnvelope(envelope);
const parsed = parseNatalEnvelope(text);
const out = {
  engine: ENGINE_VERSION,
  birth,
  gate2: {
    conventionsDeltaT: envelope.receipt.conventions.deltaT,
    engine: envelope.receipt.engine,
    resultDeltaT: envelope.result.deltaT,
    roundTrip: parsed.ok && JSON.stringify(parsed.envelope.result.deltaT) === JSON.stringify(envelope.result.deltaT),
  },
  altered: {},
};
const base = JSON.parse(text);
const cases = {
  'engine.ephemeris removed': (e) => { delete e.receipt.engine.ephemeris; },
  'engine.ephemeris.name emptied': (e) => { e.receipt.engine.ephemeris.name = ''; },
  'engine.ephemeris.version changed to 2.1.18': (e) => { e.receipt.engine.ephemeris.version = '2.1.18'; },
  'result.deltaT removed': (e) => { delete e.result.deltaT; },
  'result.deltaT.model changed': (e) => { e.result.deltaT.model = 'other'; },
  'result.deltaT.tableDigest changed': (e) => { e.result.deltaT.tableDigest = '0000000000000000'; },
  'engine.version set to 0.1.1-rc.7 with rc.8 conventions': (e) => { e.receipt.engine.version = '0.1.1-rc.7'; },
};
for (const [name, alter] of Object.entries(cases)) {
  const copy = structuredClone(base);
  alter(copy);
  const result = parseNatalEnvelope(JSON.stringify(copy));
  out.altered[name] = result.ok ? 'accepted' : `refused: ${result.code}`;
}
const legacyRoot = process.argv[2];
if (legacyRoot) {
  const root = resolve(legacyRoot, 'node_modules/@zodiacs/engine/dist');
  const old = await import(pathToFileURL(`${root}/index.js`).href);
  const oldReceipt = await import(pathToFileURL(`${root}/receipt.js`).href);
  const legacy = oldReceipt.serializeNatalEnvelope(oldReceipt.createNatalEnvelope(old.natalChart(birth)));
  const legacyParsed = parseNatalEnvelope(legacy);
  out.legacy = {
    engine: old.ENGINE_VERSION,
    hasEphemeris: 'ephemeris' in JSON.parse(legacy).receipt.engine,
    parsedByRc8: legacyParsed.ok ? 'accepted' : `refused: ${legacyParsed.code}`,
  };
}
process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
