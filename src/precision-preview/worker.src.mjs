/**
 * The preview's calculation boundary. Everything numerical happens here,
 * off the main thread, so cancel can mean something.
 *
 * This worker never fetches anything. A pack arrives as an ArrayBuffer the
 * person chose from their own disk, or is built in-process from the
 * synthetic fixture. There is no URL in this file, and nothing is written
 * to storage of any kind.
 */
import {
  openPackFromBytes, CORRECTED, CONTRACT, SEARCH_CONTRACT, GEOMETRIC_CONTRACT,
  BARYCENTRE_NOT_CENTRE, SEARCH_RESULT_CONTRACT,
} from '@zodiacs/precision-alpha/browser';
import { buildSyntheticPack, SYNTHETIC_NOTE } from './synthetic.mjs';

const MS_PER_DAY = 86400000;
const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
/** TT - UTC, a stated constant. This package does not model Delta-T. */
const TT_MINUS_UTC_SEC = 69.184;
const ttDays = (iso) => (Date.parse(iso) - J2000_UTC_MS) / MS_PER_DAY + TT_MINUS_UTC_SEC / MS_PER_DAY;
const utcOf = (tt) => new Date(J2000_UTC_MS + (tt - TT_MINUS_UTC_SEC / 86400) * MS_PER_DAY).toISOString();

let runtime = null;
let synthetic = false;
let generation = 0;

const post = (m) => self.postMessage(m);
const refuse = (reason, detail) => ({ ok: false, refused: reason, detail });

function info() {
  return {
    synthetic,
    syntheticNote: synthetic ? SYNTHETIC_NOTE : null,
    source: runtime.sourceKind,
    integrity: {
      digest: runtime.integrity.computedDigest,
      selfConsistent: runtime.integrity.selfConsistent,
      matchesExpectedDigest: runtime.integrity.matchesExpected,
      authenticity: runtime.integrity.authenticity,
    },
    coverage: {
      startEtSecTdb: runtime.coverage.startEtSecTdb,
      stopEtSecTdb: runtime.coverage.stopEtSecTdb,
      startUtcApprox: utcOf(runtime.coverage.startEtSecTdb / 86400),
      stopUtcApprox: utcOf(runtime.coverage.stopEtSecTdb / 86400),
      usableMarginHours: 7,
    },
    pack: {
      format: runtime.header.format,
      formatVersion: runtime.header.formatVersion,
      declaredSynthetic: runtime.header.synthetic === true,
      inputFile: runtime.header.input?.file ?? null,
      inputSha256: runtime.header.input?.sha256 ?? null,
      compiler: runtime.header.compiler?.version ?? null,
    },
    bodies: runtime.bodies,
    systemBarycentresNotCentres: BARYCENTRE_NOT_CENTRE,
    conventions: {
      apparent: CONTRACT.coordinates,
      corrections: CONTRACT.corrections,
      notModelled: CONTRACT.notModelled,
      clock: `TT = UTC + ${TT_MINUS_UTC_SEC} s, a stated constant. Delta-T is not modelled.`,
      searchKinds: Object.keys(SEARCH_CONTRACT.kinds),
      geometric: GEOMETRIC_CONTRACT.operation,
      resultContract: SEARCH_RESULT_CONTRACT,
    },
  };
}

function guard(iso) {
  if (!runtime) return refuse('no-pack', 'Load a pack, or start the synthetic fixture, before asking for a calculation.');
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return refuse('bad-instant', `Not an instant this can parse: ${iso}`);
  const tt = ttDays(iso);
  const margin = (7 * 3600) / 86400;
  const lo = runtime.coverage.startEtSecTdb / 86400 + margin;
  const hi = runtime.coverage.stopEtSecTdb / 86400 - margin;
  if (tt < lo || tt > hi) {
    return refuse('out-of-coverage',
      `${iso} is outside the usable window ${utcOf(lo)} .. ${utcOf(hi)}. The pack's raw coverage is wider; the margin is light-time lookback and the derivative step.`);
  }
  return null;
}

self.onmessage = async (event) => {
  const { type, id } = event.data;
  try {
    if (type === 'cancel') { generation += 1; post({ id, type: 'result', payload: { ok: true, cancelled: true, generation } }); return; }

    if (type === 'load-synthetic') {
      if (runtime) { runtime.dispose(); runtime = null; }
      const bytes = await buildSyntheticPack();
      runtime = await openPackFromBytes(bytes);
      synthetic = true;
      post({ id, type: 'result', payload: { ok: true, info: info() } });
      return;
    }

    if (type === 'load-pack') {
      if (runtime) { runtime.dispose(); runtime = null; }
      synthetic = false;
      try {
        runtime = await openPackFromBytes(new Uint8Array(event.data.buffer));
        post({ id, type: 'result', payload: { ok: true, info: info() } });
      } catch (error) {
        runtime = null;
        post({ id, type: 'result', payload: refuse(error?.code ?? 'bad-pack', String(error?.message ?? error)) });
      }
      return;
    }

    if (type === 'unload') {
      if (runtime) runtime.dispose();
      runtime = null;
      synthetic = false;
      post({ id, type: 'result', payload: { ok: true, unloaded: true } });
      return;
    }

    if (type === 'places') {
      const bad = guard(event.data.iso);
      if (bad) { post({ id, type: 'result', payload: bad }); return; }
      const tt = ttDays(event.data.iso);
      const rows = runtime.bodies.map((b) => {
        const r = runtime.apparent(b, tt, CORRECTED);
        return { body: b, lon: r.lon, lat: r.lat, distKm: r.distKm, isSystemBarycentre: r.isSystemBarycentre, lightTimeSec: r.lightTimeSec };
      });
      post({ id, type: 'result', payload: { ok: true, synthetic, ttDays: tt, rows } });
      return;
    }

    if (type === 'search') {
      if (!runtime) { post({ id, type: 'result', payload: refuse('no-pack', 'Load a pack, or start the synthetic fixture, first.') }); return; }
      const mine = generation;
      const { mode, body, targetDeg, fromIso, toIso, epsilonDeg, maxRateDegPerDay } = event.data;
      const bad = guard(fromIso) ?? guard(toIso);
      if (bad) { post({ id, type: 'result', payload: bad }); return; }
      const signal = { get aborted() { return generation !== mine; } };
      try {
        const verdict = mode === 'geometric'
          ? runtime.searchGeometric({ body, targetDeg, fromTtDays: ttDays(fromIso), toTtDays: ttDays(toIso), signal })
          : runtime.search({
            kind: 'longitude', body, targetDeg,
            fromTtDays: ttDays(fromIso), toTtDays: ttDays(toIso),
            epsilonDeg, options: CORRECTED, signal,
            ...(maxRateDegPerDay ? { maxRateDegPerDay } : {}),
          });
        post({ id, type: 'result', payload: { ok: true, synthetic, verdict, events: verdict.events.map((e) => ({ ...e, utc: utcOf(e.ttDays) })) } });
      } catch (error) {
        post({ id, type: 'result', payload: refuse(error?.code ?? 'error', String(error?.message ?? error)) });
      }
      return;
    }

    post({ id, type: 'result', payload: refuse('unknown-request', type) });
  } catch (error) {
    post({ id, type: 'result', payload: refuse(error?.code ?? 'error', String(error?.message ?? error)) });
  }
};

post({ type: 'ready', contract: SEARCH_RESULT_CONTRACT });
