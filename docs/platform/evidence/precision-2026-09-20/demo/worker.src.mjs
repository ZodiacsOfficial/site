/**
 * The demonstration's calculation boundary.
 *
 * Everything numerical happens in here, off the main thread, so the page stays
 * responsive and so "cancel" can mean something. Cancellation is cooperative
 * and real: long runs check a generation counter between chunks and stop,
 * rather than being advertised as cancellable while running to completion.
 *
 * This worker never fetches anything. The precision pack arrives as an
 * ArrayBuffer the user chose from their own disk; there is no URL in this file
 * and no persistence of any kind.
 */
import * as A from 'astronomy-engine';

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const AEB = {
  Sun: A.Body.Sun, Moon: A.Body.Moon, Mercury: A.Body.Mercury, Venus: A.Body.Venus,
  Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn,
  Uranus: A.Body.Uranus, Neptune: A.Body.Neptune, Pluto: A.Body.Pluto,
};

/** The lightweight backend: what the site ships today, longitude of date. */
function lightLongitude(body, date) {
  const t = A.MakeTime(date);
  const e = A.RotateVector(A.Rotation_EQJ_ECT(t), A.GeoVector(AEB[body], t, true));
  const d = (Math.atan2(e.y, e.x) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
}

/** The precision backend, present only once a pack has been supplied. */
let precision = null;
let packInfo = null;
/** Bumped by every cancel; a run whose generation is stale stops. */
let generation = 0;

const post = (msg) => self.postMessage(msg);

/**
 * Refusals are explicit and typed. Silently returning something plausible for
 * an unsupported request is the failure this demonstration exists to avoid.
 */
function refuse(reason, detail) {
  return { ok: false, refused: reason, detail };
}

function checkSupported(iso) {
  if (!precision) return refuse('no-pack', 'Load a precision pack before asking for precision output.');
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return refuse('bad-instant', `Not an instant this can parse: ${iso}`);
  const lo = Date.parse(packInfo.coverage.startUtc);
  const hi = Date.parse(packInfo.coverage.stopUtc);
  // The usable window is narrower than the stated coverage: light-time reads
  // the target earlier than the epoch, and the velocity step reads either side.
  const margin = (packInfo.coverage.marginHours ?? 7) * 3600000;
  if (ms < lo + margin || ms > hi - margin) {
    return refuse('out-of-coverage',
      `${iso} is outside the usable window ${new Date(lo + margin).toISOString()} .. ${new Date(hi - margin).toISOString()}. `
      + `The pack's raw coverage is ${packInfo.coverage.startUtc} .. ${packInfo.coverage.stopUtc}; the margin is light-time lookback and the derivative step.`);
  }
  return null;
}

self.onmessage = async (event) => {
  const { type, id } = event.data;
  try {
    if (type === 'cancel') { generation += 1; post({ id, type: 'cancelled', generation }); return; }

    if (type === 'load-pack') {
      const { buffer } = event.data;
      const mod = await import('./precision-runtime.mjs').catch(() => null);
      if (!mod) { post({ id, type: 'result', payload: refuse('no-runtime', 'The precision runtime was not bundled into this demonstration.') }); return; }
      try {
        precision = mod.open(buffer);
        packInfo = precision.info();
        post({ id, type: 'result', payload: { ok: true, packInfo } });
      } catch (error) {
        precision = null; packInfo = null;
        // A truncated, corrupt or mismatched pack must fail here, loudly.
        post({ id, type: 'result', payload: refuse('bad-pack', String(error && error.message ? error.message : error)) });
      }
      return;
    }

    if (type === 'compare') {
      const { iso } = event.data;
      const guard = checkSupported(iso);
      if (guard) { post({ id, type: 'result', payload: guard }); return; }
      const date = new Date(iso);
      const t0 = performance.now();
      const light = BODIES.map((b) => [b, lightLongitude(b, date)]);
      const tLight = performance.now() - t0;
      const t1 = performance.now();
      const prec = BODIES.map((b) => [b, precision.longitude(b, date)]);
      const tPrec = performance.now() - t1;
      const rows = BODIES.map((b, i) => {
        let d = prec[i][1] - light[i][1];
        if (d > 180) d -= 360; if (d < -180) d += 360;
        return { body: b, lightweight: light[i][1], precision: prec[i][1], differenceArcsec: d * 3600 };
      });
      post({ id, type: 'result', payload: { ok: true, rows, lightweightMs: tLight, precisionMs: tPrec, assumptions: precision.assumptions() } });
      return;
    }

    if (type === 'bench') {
      const { reps } = event.data;
      const mine = generation;
      const date = new Date('2020-06-15T12:00:00Z');
      const light = []; const prec = [];
      for (let i = 0; i < reps; i += 1) {
        // Cooperative cancellation, checked every chunk rather than claimed.
        if (i % 25 === 0) {
          if (generation !== mine) { post({ id, type: 'result', payload: { ok: false, refused: 'cancelled', detail: `stopped after ${i} of ${reps}` } }); return; }
          await new Promise((r) => setTimeout(r, 0));
          post({ id, type: 'progress', done: i, total: reps });
        }
        const d = new Date(date.getTime() + i * 3600000);
        let s = performance.now(); for (const b of BODIES) lightLongitude(b, d); light.push(performance.now() - s);
        if (precision) { s = performance.now(); for (const b of BODIES) precision.longitude(b, d); prec.push(performance.now() - s); }
      }
      const p50 = (a) => { a.sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
      post({ id, type: 'result', payload: { ok: true, lightweightP50Ms: p50(light), precisionP50Ms: p50(prec), n: reps } });
      return;
    }

    post({ id, type: 'result', payload: refuse('unknown-request', type) });
  } catch (error) {
    post({ id, type: 'result', payload: refuse('error', String(error && error.stack ? error.stack : error)) });
  }
};

post({ type: 'ready', bodies: BODIES });
