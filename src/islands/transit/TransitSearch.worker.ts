import {
  scanTransitContacts,
  type NatalTransitChart,
  type NatalPoint,
  type TransitBody,
  type TransitContact,
} from '../../lib/engine/transit-scan';
import type { AspectType } from '../../lib/engine/types';

interface SearchWorkerRequest {
  natal: NatalTransitChart;
  fromUtc: string;
  toUtc: string;
  bodies: TransitBody[];
  natalPoint: NatalPoint;
  aspect: AspectType | null;
}

type SearchWorkerResponse =
  | { type: 'progress'; body: TransitBody }
  | { type: 'result'; contacts: TransitContact[] }
  | { type: 'error'; message: string };

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SearchWorkerRequest>) => void) | null;
  postMessage: (message: SearchWorkerResponse) => void;
};

scope.onmessage = (event) => {
  void (async () => {
    try {
      const request = event.data;
      const from = new Date(request.fromUtc);
      const to = new Date(request.toUtc);
      const contacts: TransitContact[] = [];

      for (const body of request.bodies) {
        scope.postMessage({ type: 'progress', body });
        contacts.push(...scanTransitContacts(request.natal, from, to, {
          transitBodies: [body],
          includeMoon: body === 'Moon',
          natalPoints: [request.natalPoint],
          aspects: request.aspect ? [request.aspect] : undefined,
        }));
        // Let progress delivery settle before starting the next synchronous
        // scan. All ephemeris work stays on this worker thread.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      contacts.sort((a, b) => a.exactUtc.localeCompare(b.exactUtc));
      scope.postMessage({ type: 'result', contacts });
    } catch (error) {
      scope.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Transit search failed.',
      });
    }
  })();
};
