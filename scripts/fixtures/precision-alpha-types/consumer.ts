/**
 * A consumer, compiled against the alpha's shipped declarations.
 *
 * Every line here is a claim the package makes about its own types. If a
 * claim stops holding, this stops compiling -- which is how the narrowing
 * gap was found: `if (r.completeness.established)` was believed to make an
 * exact total reachable, and it did not, because TypeScript does not
 * discriminate a union on a nested property.
 */
import { openPackFile } from '@zodiacs/precision-alpha/node';
import { openPackFromBlob } from '@zodiacs/precision-alpha/browser';
import {
  CORRECTED, isProven, isUnproven, isFinished,
  type SearchResult, type ExecutionStatus, type Body, type PrecisionErrorCode,
} from '@zodiacs/precision-alpha';

declare const log: (...xs: unknown[]) => void;

export async function main(path: string): Promise<void> {
  const rt = await openPackFile(path);
  const body: Body = 'Mars';

  const place = rt.apparent(body, 8000, CORRECTED);
  const lon: number = place.lon;
  const lat: number = place.lat;
  log(lon, lat, place.distKm, place.isSystemBarycentre);

  const r: SearchResult = rt.searchGeometric({ body, targetDeg: 100, fromTtDays: 7000, toTtDays: 7800 });
  const status: ExecutionStatus = r.execution.status;
  log(status, isFinished(r));

  // The guard narrows; the nested boolean alone does not, which is the
  // whole reason the guard exists.
  if (isProven(r)) {
    const exact: true = r.eventCount.isExactTotal;
    const total: number = r.eventCount.found;
    const support: 'proven' = r.completeness.support;
    const none: readonly [] = r.completeness.conditionalOn;
    log(exact, total, support, none.length);
  } else {
    const notExact: false = r.eventCount.isExactTotal;
    const maybe: number | null = r.eventCount.conditionalTotal;
    log(notExact, maybe, r.accounting.unresolved.length);
  }

  const e: SearchResult = rt.search({
    kind: 'longitude', body, targetDeg: 100,
    fromTtDays: 7000, toTtDays: 7800, epsilonDeg: 1 / 3600, options: CORRECTED,
  });
  if (isUnproven(e)) {
    for (const a of e.assumptions) log(a.id, a.status, a.basis);
  }

  // A cancel is a RESULT, so the signal-bearing call is not in a try.
  const signal = { aborted: false };
  const c: SearchResult = rt.search({
    kind: 'longitude', body, targetDeg: 100,
    fromTtDays: 7000, toTtDays: 7800, epsilonDeg: 1 / 3600, options: CORRECTED, signal,
  });
  if (c.execution.status === 'cancelled') log(c.events.length);

  const code: PrecisionErrorCode = 'bad-geometry';
  log(code, typeof openPackFromBlob);
  rt.dispose();
}
