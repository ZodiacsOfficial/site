import type { NatalTransitChart, TransitContact } from '../../lib/engine/transit-scan';
import { loadModule, ModuleLoadError } from '../../lib/module-load';

type Scanner = typeof import('../../lib/engine/transit-scan');
export type SlowTransitScan =
  | { status: 'loading' }
  | { status: 'ready'; events: TransitContact[] }
  | { status: 'error'; moduleFailed: boolean };

/** A scan owns its completion callback. Cancelling it prevents any result or
 * failure from a previous chart (or an unmounted ring) reaching the UI. */
export function startSlowTransitScan(
  chart: NatalTransitChart,
  from: Date,
  to: Date,
  settle: (result: SlowTransitScan) => void,
  load: () => Promise<Scanner> = () => loadModule(() => import('../../lib/engine/transit-scan')),
  breathe: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 0)),
): () => void {
  let cancelled = false;
  void (async () => {
    try {
      const scan = await load();
      const found: TransitContact[] = [];
      for (const body of scan.SLOW_TRANSIT_BODIES) {
        if (cancelled) return;
        found.push(...scan.scanTransitContacts(chart, from, to, { transitBodies: [body] }));
        await breathe();
      }
      if (!cancelled) settle({ status: 'ready', events: found.sort((a, b) => a.exactUtc.localeCompare(b.exactUtc)) });
    } catch (cause) {
      if (!cancelled) settle({ status: 'error', moduleFailed: cause instanceof ModuleLoadError });
    }
  })();
  return () => { cancelled = true; };
}
