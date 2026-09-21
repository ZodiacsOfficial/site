/**
 * The demonstration's precision backend. Source; `precision-runtime.mjs` is
 * the bundle built from it by `build.mjs`.
 *
 * This is the real runtime from `examples/precision-alpha`, not a seam and
 * not a re-implementation: the same core the Node tests run, bundled for the
 * browser with no shims, no `Buffer` polyfill and no filesystem stand-in. If
 * the core ever stopped being environment-neutral, this bundle would fail to
 * build, which is the point of building it this way.
 */
import { openPackFromBytes, CORRECTED, CONTRACT, SEARCH_CONTRACT, BARYCENTRE_NOT_CENTRE } from '../../../../../examples/precision-alpha/src/browser.mjs';

/**
 * TT - UTC, seconds. A STATED CONSTANT, not a model: this package does not
 * do Delta-T, and the demonstration says so on every result rather than
 * implying a leap-second table it does not have. 69.184 s is TT - UTC since
 * the 2017 leap second.
 */
const TT_MINUS_UTC_SEC = 69.184;
const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;

/** UTC instant -> TT days past J2000. */
const ttDaysFromDate = (date) => (date.getTime() - J2000_UTC_MS) / MS_PER_DAY + TT_MINUS_UTC_SEC / MS_PER_DAY;
/** TDB seconds past J2000 -> an approximate UTC instant, for display only. */
const utcFromEt = (et) => new Date(J2000_UTC_MS + (et - TT_MINUS_UTC_SEC) * 1000).toISOString();

export async function open(buffer, { expectDigest = null } = {}) {
  const runtime = await openPackFromBytes(new Uint8Array(buffer), { expectDigest });
  const { startEtSecTdb, stopEtSecTdb } = runtime.coverage;

  // The usable window is narrower than the declared coverage: light-time
  // reads the target earlier than the epoch. Seven hours covers Pluto's
  // light time with room to spare, and it is stated rather than assumed.
  const marginHours = 7;

  const info = () => ({
    coverage: {
      startUtc: utcFromEt(startEtSecTdb),
      stopUtc: utcFromEt(stopEtSecTdb),
      startEtSecTdb,
      stopEtSecTdb,
      marginHours,
    },
    integrity: {
      digest: runtime.integrity.computedDigest,
      selfConsistent: runtime.integrity.selfConsistent,
      matchesExpectedDigest: runtime.integrity.matchesExpected,
      authenticity: runtime.integrity.authenticity,
    },
    source: runtime.sourceKind,
    bodies: runtime.bodies,
    systemBarycentresNotCentres: BARYCENTRE_NOT_CENTRE,
    pack: {
      format: runtime.header.format,
      formatVersion: runtime.header.formatVersion,
      candidate: runtime.header.candidate ?? null,
      inputFile: runtime.header.input?.file ?? null,
      inputSha256: runtime.header.input?.sha256 ?? null,
    },
  });

  const assumptions = () => ({
    reduction: 'corrected: IAU 2000B nutation (77 terms), IAU 2006 precession, IAU 2000 frame bias, TDB-TT, light-time iteration, solar deflection, relativistic aberration',
    clock: `TT = UTC + ${TT_MINUS_UTC_SEC} s, a stated constant. Delta-T is not modelled here, so instants far from the present carry a clock error this demonstration does not correct.`,
    observer: 'geocentre: no topocentric parallax, no diurnal aberration, no refraction',
    barycentres: `returned for ${BARYCENTRE_NOT_CENTRE.join(', ')} — these are planetary-system barycentres, not body centres`,
    corrections: CONTRACT.corrections,
    notModelled: CONTRACT.notModelled,
    searchKinds: Object.keys(SEARCH_CONTRACT.kinds),
    integrityAuthenticity: runtime.integrity.authenticity,
  });

  return {
    info,
    assumptions,
    longitude: (body, date) => runtime.apparent(body, ttDaysFromDate(date), CORRECTED).lon,
    apparent: (body, date) => runtime.apparent(body, ttDaysFromDate(date), CORRECTED),
    /** Exposed so the driver can compare bit-for-bit with the Node run. */
    apparentAtTtDays: (body, ttDays) => runtime.apparent(body, ttDays, CORRECTED),
    search: (spec) => runtime.search({ ...spec, options: CORRECTED }),
    dispose: () => runtime.dispose(),
  };
}
