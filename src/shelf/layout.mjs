// Where the twelve volumes stand.
//
// Pure arithmetic — no Three.js, no DOM — so the geometry that positions the
// shelf can be exercised directly by scripts/shelf-layout.test.mjs. The scene
// module owns every rendering concern; this file owns only the numbers.
//
// The volumes sit on a large-radius arc rather than a straight rail. At a
// radius of 16 units the twelve occupy about 41 degrees of arc, so the shelf
// reads as very nearly straight while the volumes at either end turn gently
// away from the viewer. Bringing a volume to the front is a rotation of the
// whole arc, which keeps the focused volume square to the camera at all times.

export const SHELF = Object.freeze({
  radius: 16,
  spacing: 0.78,
  height: 1.76,
  depth: 1.28,
  thickness: 0.4,
  // The row stands a little above the camera's aim so its feet, and the
  // shadows under them, clear the controls at the foot of the stage.
  baseY: 0.21,
  focusLift: 0.04,
  focusOut: 0.14,
  neighbourEase: 0.15,
});

/** Radians between adjacent volumes. */
export function angleStep(shelf = SHELF) {
  return shelf.spacing / shelf.radius;
}

/**
 * Outward nudge applied to the volumes flanking the focused one, so the shelf
 * opens a little around whatever is being read. Zero at the focus itself
 * (there is no direction to push), strongest at the immediate neighbours,
 * decaying from there.
 */
export function neighbourPush(distance, shelf = SHELF) {
  if (distance === 0) return 0;
  const falloff = Math.exp(-((Math.abs(distance) - 1) ** 2));
  return shelf.neighbourEase * Math.sign(distance) * falloff;
}

/**
 * Pose of volume `index` when the shelf is focused at the (continuous)
 * position `focus`. Returns scene coordinates with the focused volume at the
 * origin, facing +Z — the direction the camera looks from.
 */
export function volumePose(index, focus, shelf = SHELF) {
  const step = angleStep(shelf);
  const distance = index - focus;
  const angle = (distance + neighbourPush(distance, shelf)) * step;

  // 1 at the focus, falling to 0 one slot away. Drives the lift-and-forward
  // emphasis that marks which volume the shelf is currently offering.
  const prominence = Math.max(0, 1 - Math.abs(distance));

  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const out = shelf.focusOut * prominence;

  return {
    x: shelf.radius * sin + sin * out,
    y: shelf.baseY + shelf.focusLift * prominence,
    z: shelf.radius * cos - shelf.radius + cos * out,
    rotationY: angle,
    prominence,
    distance,
  };
}

/** Keep a focus value inside the shelf. The ends are hard stops, not a loop. */
export function clampFocus(focus, count) {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, focus));
}

/** The volume a given focus position would settle on. */
export function nearestIndex(focus, count) {
  return Math.round(clampFocus(focus, count));
}

/**
 * Frame-rate independent damping: the fraction of the remaining distance to
 * close scales with elapsed time, so a slow frame moves as far as the several
 * fast frames it replaced. `lambda` is the decay rate in units of 1/second.
 */
export function approach(current, target, lambda, dt) {
  if (dt <= 0) return current;
  return target + (current - target) * Math.exp(-lambda * dt);
}

/**
 * A wheel notch, a trackpad swipe and a horizontal scroll all mean the same
 * thing here: move along the shelf. Vertical deltas are the common case on a
 * mouse, so they count too.
 */
export function wheelToFocusDelta(deltaX, deltaY, pixelsPerVolume = 190) {
  const dominant = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  return dominant / pixelsPerVolume;
}

/** Pointer travel across the canvas, in volumes. */
export function dragToFocusDelta(pixels, viewportWidth) {
  const width = Math.max(320, viewportWidth || 1024);
  // A drag across the full width of the stage walks about six volumes.
  return (-pixels / width) * 6;
}

/**
 * Volumes far enough off-screen that there is nothing to draw. Generous by
 * one slot on each side so a volume is never seen popping into place.
 */
export function isVisible(index, focus, span = 7) {
  return Math.abs(index - focus) <= span;
}
