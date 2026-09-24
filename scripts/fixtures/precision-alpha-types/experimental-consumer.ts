/**
 * A consumer of the EXPERIMENTAL subpath, compiled against the shipped
 * declarations.
 *
 * `types/experimental.d.ts` shipped for three rungs without ever being
 * compiled: the suite's `paths` mapped `.`, `/node` and `/browser` and not
 * `/experimental`, so nothing checked it. This is the fixture that does.
 *
 * Every line is a claim the declarations make. The deflected rung's
 * claims are the ones worth compiling: it is the first mode that can
 * decline part of a request, and a consumer that reads `events` without
 * reading `accounting.excluded` gets a wrong answer rather than an error.
 */
import { openPackFile } from '@zodiacs/precision-alpha/node';
import { isProven, type SearchResult, type Body } from '@zodiacs/precision-alpha';
import {
  experimental, EXPERIMENTAL, RETARDED_CONTRACT, ABERRATED_CONTRACT,
  OF_DATE_CONTRACT, DEFLECTED_CONTRACT, OF_DATE_MODEL_RANGE_TDB_SEC,
  type RetardedSearchSpec, type ExperimentalSearches,
} from '@zodiacs/precision-alpha/experimental';

declare const log: (...xs: unknown[]) => void;

export async function main(path: string): Promise<void> {
  const rt = await openPackFile(path);
  const x: ExperimentalSearches = experimental(rt);
  const body: Body = 'Mars';

  // TDB seconds, not TT days. The spec type is what enforces that.
  const spec: RetardedSearchSpec = { body, targetDeg: 95, fromTdbSec: -3.2e6, toTdbSec: 3.2e6 };

  const a: SearchResult = x.searchRetarded(spec);
  const b: SearchResult = x.searchRetardedAberrated(spec);
  const c: SearchResult = x.searchRetardedAberratedOfDate(spec);
  const d: SearchResult = x.searchRetardedAberratedDeflectedOfDate(spec);
  log(a.mode, b.mode, c.mode, d.mode);

  // The same narrowing helper the released modes use.
  if (isProven(d)) {
    const exact: true = d.eventCount.isExactTotal;
    log(exact, d.eventCount.found);
  } else {
    // The declining path: a lower bound, and the spans it is exhaustive
    // over. `excluded` is optional because the released modes have no
    // restricted domain and do not carry it -- so the compiler makes a
    // consumer say what it means by its absence, which is the right
    // pressure to apply.
    const notExact: false = d.eventCount.isExactTotal;
    const excluded = d.accounting.excluded ?? [];
    for (const span of excluded) {
      const from: number = span.fromTdbSec;
      const to: number = span.toTdbSec;
      log(from, to, span.why);
    }
    log(notExact, excluded.length, d.interval.decidedTdbSec ?? [], d.interval.decidedFraction);
  }

  // An experimental event carries TDB, not TT. The declarations make both
  // optional, which is exactly the check a consumer should be made to do.
  const first = d.events[0];
  if (first !== undefined && first.tdbSec !== undefined) {
    const at: number = first.tdbSec;
    const bracket: [number, number] | undefined = first.bracketTdbSec;
    log(at, bracket, first.bracketWidthSec, first.direction);
  }

  // Declared on the subpath, so a caller can decide before asking.
  const floor: number = x.deflectionMinElongationRad;
  const restricted: readonly string[] = EXPERIMENTAL.restrictedDomain.modes;
  const modes: readonly string[] = EXPERIMENTAL.modes;
  log(floor, restricted.length, modes.length, EXPERIMENTAL.restrictedDomain.behaviour);

  // Every contract is reachable, from the module and from the handle.
  log(RETARDED_CONTRACT, ABERRATED_CONTRACT, OF_DATE_CONTRACT, DEFLECTED_CONTRACT);
  log(x.contracts.deflected, x.contracts.ofDate, OF_DATE_MODEL_RANGE_TDB_SEC[0]);

  // A cancel is a RESULT here too, so the signal-bearing call is not in a try.
  const signal = { aborted: false };
  const cancelled: SearchResult = x.searchRetardedAberratedDeflectedOfDate({ ...spec, signal });
  if (cancelled.execution.status === 'cancelled') log(cancelled.events.length);

  x.dispose();          // detaches the handle
  rt.dispose();         // the runtime still owns the buffers
  log(x.disposed);
}
