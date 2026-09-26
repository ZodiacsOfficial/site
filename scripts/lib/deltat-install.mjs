/**
 * Scripts that call astronomy-engine directly must run on the same clock as
 * every chart. Since @zodiacs/engine 0.1.1-rc.8 that clock is the engine's
 * observed ΔT (model "zodiacs-deltat/1", step 1.4 of the engine brief), which
 * the engine installs in astronomy-engine before each of its own calls. A
 * script that computes with astronomy-engine before, or without, calling the
 * engine would otherwise use astronomy-engine's 2004 polynomial, 6.3 s off
 * the observed value in 2026. Import this module first:
 *
 *   import './lib/deltat-install.mjs';
 *
 * `scripts/deltat-install-guard.test.mjs` holds every direct importer of
 * astronomy-engine to it.
 */
import { SetDeltaTFunction } from 'astronomy-engine';
import { deltaT } from '@zodiacs/engine/deltat';

SetDeltaTFunction(deltaT);

export { deltaT };
