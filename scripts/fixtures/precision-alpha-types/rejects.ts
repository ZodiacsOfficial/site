/**
 * What must NOT compile. Each line is followed by @ts-expect-error, so if
 * the declarations ever start allowing it, tsc fails on the unused
 * suppression -- the assertion is the suppression itself.
 */
import { openPackFile } from '@zodiacs/precision-alpha/node';
import { CORRECTED, isProven, type SearchResult } from '@zodiacs/precision-alpha';

declare const log: (...xs: unknown[]) => void;

export async function main(path: string): Promise<void> {
  const rt = await openPackFile(path);

  // @ts-expect-error a body outside the contract
  rt.apparent('Ceres', 0, CORRECTED);

  // @ts-expect-error the empirical search has no default allowance
  rt.search({ kind: 'longitude', body: 'Mars', targetDeg: 1, fromTtDays: 0, toTtDays: 1, options: CORRECTED });

  // @ts-expect-error the validated search takes no epsilon: it does not have one
  rt.searchGeometric({ body: 'Mars', targetDeg: 1, fromTtDays: 0, toTtDays: 1, epsilonDeg: 1 });

  // @ts-expect-error an unknown reduction option
  rt.apparent('Mars', 0, { ...CORRECTED, nutaion: '2000b' });

  const r: SearchResult = rt.searchGeometric({ body: 'Mars', targetDeg: 1, fromTtDays: 0, toTtDays: 1 });
  if (!isProven(r)) {
    // @ts-expect-error an unproven result has no exact total to read as true
    const exact: true = r.eventCount.isExactTotal;
    log(exact);
  }
  // @ts-expect-error the events are readonly
  r.events.push(r.events[0]);
  log(r);
}
