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
  /**
   * The tallest a figure may stand. Every figure is scaled to sit inside this
   * height, so the row has one known top edge whatever the twelve are shaped
   * like — which is what lets the camera be framed to a measured band.
   */
  height: 1.6,
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
 * A location hash names a sculpture: "#leo" opens the gallery on Leo. Exact
 * slug match, case folded; anything else is nobody.
 */
export function signFromHash(hash, slugs) {
  const slug = String(hash || '').replace(/^#/, '').toLowerCase();
  return slug ? slugs.indexOf(slug) : -1;
}

/**
 * Figures far enough off-screen that there is nothing to draw. Generous by a
 * slot on each side so one is never seen appearing.
 */
export function isVisible(index, focus, span = 7) {
  return Math.abs(index - focus) <= span;
}

// ---- framing -----------------------------------------------------------------
//
// The stage shares one viewport with a header above it, controls below it, and
// — once a sculpture is drawn out — a card beside or under it. Rather than
// guess a camera position and hope the tallest figure clears the title, the
// page measures the free band it actually has and the camera is fitted to it.
// Everything below is the arithmetic for that; main.mjs supplies the measured
// rectangles and scene.mjs applies the result.

export const VITRINE = Object.freeze({
  /** Vertical fov of the rig, in radians. A longish lens: 34 degrees. */
  fov: 0.5934119456780721,
  /**
   * How far the camera looks down on the row. Enough to see the tops of the
   * plinths and the shadows they sit in, not enough to foreshorten a figure.
   */
  tilt: 0.1047197551196598,
  /**
   * Air left around the content inside its band, as a multiplier. A cast is a
   * flat plate, so turning or tilting one only ever shrinks its silhouette:
   * the square-on pose is the widest and tallest it gets, and the margin is
   * air rather than headroom.
   */
  rowMargin: 1.12,
  stageMargin: 1.2,
  /** How much of that air a full zoom takes back. */
  zoomGain: 0.3,
  /** How far a figure steps out of the row to be examined. */
  stageZ: 0.9,
  /**
   * Bounds on the world height the camera resolves across the whole canvas.
   * The floor stops an unusually tall band from pushing the row into your
   * face; the ceiling stops a cramped one from reducing it to specks.
   */
  minWorldHeight: 3,
  maxWorldHeight: 7.2,
});

/** The world box the whole row occupies: plinth foot to tallest head. */
export function rowContent(gallery = GALLERY) {
  const bottom = floorY(gallery) - 0.1; // the shadows spread a little wider
  const top = gallery.baseY + gallery.height + 0.04;
  return {
    height: top - bottom,
    // A single cast plus air. The row is meant to run off both edges; this
    // only ever pulls the camera back on a viewport too narrow to hold one.
    width: gallery.maxWidth * 1.2,
    centerY: (top + bottom) / 2,
    centerZ: 0,
  };
}

/** The world box one figure occupies while it is being examined. */
export function stageContent(scale, aspect, vitrine = VITRINE) {
  return {
    height: scale,
    width: scale * aspect,
    // A figure on display is placed by its middle, not its feet: the camera
    // frames the box, so the box may as well sit on the axis.
    centerY: 0,
    centerZ: vitrine.stageZ,
  };
}

const mix = (a, b, t) => a + ((b - a) * t);

/** Between the row's box and one figure's, as it is drawn out. */
export function lerpContent(row, stage, t) {
  return {
    height: mix(row.height, stage.height, t),
    width: mix(row.width, stage.width, t),
    centerY: mix(row.centerY, stage.centerY, t),
    centerZ: mix(row.centerZ, stage.centerZ, t),
  };
}

/** Between the band the row gets and the band a card leaves it. */
export function lerpRect(a, b, t) {
  return {
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    width: mix(a.width, b.width, t),
    height: mix(a.height, b.height, t),
  };
}

/**
 * Fit a world box into a rectangle of the canvas.
 *
 * Returns the distance the camera must stand back for the box to fill that
 * rectangle, and the pan — a translation perpendicular to the view axis, which
 * shifts the image without distorting it — that puts the box at the
 * rectangle's centre rather than the canvas's.
 *
 * `rect` is in CSS pixels with its origin at the canvas's top-left corner.
 */
export function vitrineFrame(view, vitrine = VITRINE) {
  const { canvasWidth, canvasHeight, rect, content, margin = 1 } = view;
  const canvasW = Math.max(1, canvasWidth);
  const canvasH = Math.max(1, canvasHeight);
  const bandW = Math.max(1, rect.width);
  const bandH = Math.max(1, rect.height);

  // The world height the whole canvas must resolve for the box — margin and
  // all — to fill its band. Whichever axis binds first wins, so nothing is
  // ever cropped by the narrow side of an awkward viewport.
  const worldHeight = Math.min(vitrine.maxWorldHeight, Math.max(
    vitrine.minWorldHeight,
    (content.height * margin * canvasH) / bandH,
    (content.width * margin * canvasH) / bandW,
  ));

  const perPixel = worldHeight / canvasH;
  return {
    worldHeight,
    distance: worldHeight / (2 * Math.tan(vitrine.fov / 2)),
    // Panning the camera right moves the image left, hence the inversion.
    panX: ((canvasW / 2) - (rect.x + (bandW / 2))) * perPixel,
    panY: ((rect.y + (bandH / 2)) - (canvasH / 2)) * perPixel,
  };
}
