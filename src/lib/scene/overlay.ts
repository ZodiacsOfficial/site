/**
 * Build the transit overlay — the outer ring the Transit Ring draws around a
 * natal wheel. Pure and engine-free: it takes the already-computed transiting
 * positions and the already-computed transit→natal aspects, and lays them out
 * for the renderer. The astronomy (positions at an instant, the aspect search)
 * happens in the island via the lazy engine; this module only shapes and
 * fans the result, reusing the same `collisionNudge` every ring uses.
 */
import { collisionNudge } from './layout';
import { signForLongitude } from '../signs';
import type { InterAspect, MinimalBody } from '../engine/synastry';
import type { BodyName } from '../engine/types';
import type { OverlayAspect, OverlayBody, SignSlug, WheelOverlay } from './types';

export interface TransitInput {
  body: string;
  lon: number;
  retrograde?: boolean;
}

/**
 * @param label       localized name of the outer ring ("the sky right now" …)
 * @param transiting  the transiting bodies to draw on the outer ring
 * @param aspects     transit→natal contacts already filtered to the active orb
 *                    (InterAspect.a = transiting body, .b = natal body)
 * @param focus       highlighted contact id (overlayAspectId), or null
 */
export function buildTransitOverlay(
  label: string,
  transiting: TransitInput[],
  aspects: InterAspect[],
  focus: string | null = null,
): WheelOverlay {
  const draw = collisionNudge(transiting.map((b) => ({ body: b.body, lon: b.lon })));
  const bodies: OverlayBody[] = transiting.map((b) => ({
    body: b.body as BodyName,
    lon: b.lon,
    drawLon: draw.get(b.body) ?? b.lon,
    sign: signForLongitude(b.lon).slug as SignSlug,
    retrograde: Boolean(b.retrograde),
  }));
  const overlayAspects: OverlayAspect[] = aspects.map((h) => ({
    outer: h.a as BodyName,
    inner: h.b as BodyName,
    type: h.type,
    orb: h.orb,
  }));
  return { label, bodies, aspects: overlayAspects, focus };
}

/** Convenience: the natal side as MinimalBody list is what findInterAspects wants. */
export type { MinimalBody };
