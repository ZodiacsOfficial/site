import { bodyLongitude } from '../../lib/engine/full';
import { createTransitWindowScanner, type TransitWindow } from '../../lib/engine/transit-window-core';
import { SLOW_TRANSIT_BODIES, type TransitBody } from '../../lib/engine/transit-scan-shared';
import type { NatalTransitChart } from '../../lib/engine/transit-scan-core';

export interface ItineraryRequest { natal: NatalTransitChart; fromUtc: string; toUtc: string; timeKnown: boolean }
export type ItineraryResponse = { type: 'progress'; body: TransitBody }
  | { type: 'result'; windows: TransitWindow[] } | { type: 'error'; message: string };
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ItineraryRequest>) => void) | null;
  postMessage: (response: ItineraryResponse) => void;
};
scope.onmessage = ({ data }) => {
  void (async () => {
    try {
      const scanner = createTransitWindowScanner({ bodyLongitude });
      const windows: TransitWindow[] = [];
      for (const body of SLOW_TRANSIT_BODIES) {
        scope.postMessage({ type: 'progress', body });
        windows.push(...scanner.scanTransitWindows(data.natal, new Date(data.fromUtc), new Date(data.toUtc), {
          transitBodies: [body], timeKnown: data.timeKnown === true,
        }));
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      scope.postMessage({ type: 'result', windows });
    } catch (error) {
      scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'The itinerary could not finish.' });
    }
  })();
};
