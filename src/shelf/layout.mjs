// Where the twelve sculptures stand.
//
// Pure arithmetic — no Three.js, no DOM — so the geometry that arranges the
// gallery can be exercised directly by scripts/shelf-layout.test.mjs. The
// scene module owns every rendering concern; this file owns only the numbers.
//
// The figures sit on a large-radius arc rather than a straight rail. At a
// radius of 26 units the twelve occupy about 42 degrees, so the row reads as
// very nearly straight while the sculptures at either end turn gently away.
// Bringing one to the front is a rotation of the whole arc, which keeps the
// focused figure square to the camera at all times.

export const GALLERY = Object.freeze({
  radius: 26,
  spacing: 1.72,
  /** The tallest a figure may stand. */
  height: 1.85,
  /**
   * The widest it may reach — a lion is low and long where a maiden is tall.
   * Held under the narrowest gap the arc produces (the row compresses in x
   * toward its ends), so no two casts can meet however they are proportioned.
   */
  maxWidth: 1.5,
  /** Depth of the cast. The figures are shallow, as struck pieces are. */
  depth: 0.07,
  /** Feet datum: the top of the plinth, which every figure stands on. */
  baseY: -0.72,
  plinthHeight: 0.14,
  plinthRadius: 0.66,
  focusLift: 0.05,
  focusOut: 0.22,
  neighbourEase: 0.14,
});

/** The floor the plinths rest on, and the plane that catches their shadows. */
export const floorY = (gallery = GALLERY) => gallery.baseY - gallery.plinthHeight;

/**
 * How far a figure of this proportion is scaled from its unit form (height 1).
 * Height is the usual limit; a wide cast is held back by its width instead, so
 * neighbours never collide however differently the twelve are proportioned.
 */
export function fitScale(aspect, gallery = GALLERY) {
  return Math.min(gallery.height, gallery.maxWidth / aspect);
}

/** Radians between adjacent figures. */
export function angleStep(gallery = GALLERY) {
  return gallery.spacing / gallery.radius;
}

/**
 * Outward nudge applied to the figures flanking the focused one, so the row
 * opens a little around whatever is being examined. Zero at the focus itself
 * (there is no direction to push), strongest at the immediate neighbours,
 * decaying from there.
 */
export function neighbourPush(distance, gallery = GALLERY) {
  if (distance === 0) return 0;
  const falloff = Math.exp(-((Math.abs(distance) - 1) ** 2));
  return gallery.neighbourEase * Math.sign(distance) * falloff;
}

/**
 * Pose of figure `index` when the row is focused at the (continuous) position
 * `focus`. Returns scene coordinates with the focused figure at the origin,
 * facing +Z — the direction the camera looks from. `y` is the feet datum: a
 * figure is placed by where it stands, not by its middle.
 */
export function figurePose(index, focus, gallery = GALLERY) {
  const step = angleStep(gallery);
  const distance = index - focus;
  const angle = (distance + neighbourPush(distance, gallery)) * step;

  // 1 at the focus, falling to 0 one slot away. Drives the lift-and-forward
  // emphasis that marks which figure the gallery is currently offering.
  const prominence = Math.max(0, 1 - Math.abs(distance));

  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const out = gallery.focusOut * prominence;

  return {
    x: (gallery.radius * sin) + (sin * out),
    y: gallery.baseY + (gallery.focusLift * prominence),
    z: (gallery.radius * cos) - gallery.radius + (cos * out),
    rotationY: angle,
    prominence,
    distance,
  };
}

/** Keep a focus value inside the row. The ends are hard stops, not a loop. */
export function clampFocus(focus, count) {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, focus));
}

/** The figure a given focus position would settle on. */
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
  return target + ((current - target) * Math.exp(-lambda * dt));
}

/**
 * A figure can be turned right around, so its angle accumulates past a full
 * turn. This picks the version of `to` nearest `from`, which lets a sculpture
 * spun three times round settle back by the short way instead of unwinding.
 */
export function shortestTurn(from, to) {
  const full = Math.PI * 2;
  return to + (Math.round((from - to) / full) * full);
}

/**
 * A wheel notch, a trackpad swipe and a horizontal scroll all mean the same
 * thing here: move along the row. Vertical deltas are the common case on a
 * mouse, so they count too.
 */
export function wheelToFocusDelta(deltaX, deltaY, pixelsPerFigure = 190) {
  const dominant = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  return dominant / pixelsPerFigure;
}

/** Pointer travel across the canvas, in figures. */
export function dragToFocusDelta(pixels, viewportWidth) {
  const width = Math.max(320, viewportWidth || 1024);
  // A drag across the full width of the stage walks about four figures.
  return (-pixels / width) * 4;
}

/**
 * Figures far enough off-screen that there is nothing to draw. Generous by a
 * slot on each side so one is never seen appearing.
 */
export function isVisible(index, focus, span = 7) {
  return Math.abs(index - focus) <= span;
}
