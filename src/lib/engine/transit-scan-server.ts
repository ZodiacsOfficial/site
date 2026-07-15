/** Serverless transit scanner that never enters the browser-only SDK graph. */
import { findLongitudeCrossingsWith } from './longitude-crossings.js';
import { bodyLongitude, longitudeSpeed } from './server-ephemeris.js';
import { createTransitScanner } from './transit-scan-core.js';

export const { scanTransitContacts } = createTransitScanner({
  bodyLongitude,
  longitudeSpeed,
  findLongitudeCrossings: (body, targetLon, from, to, stepDays) =>
    findLongitudeCrossingsWith(
      bodyLongitude,
      body,
      targetLon,
      from,
      to,
      stepDays,
    ),
});
