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
  /**
   * How far apart the twelve may stand in height, fitted. Left to their own
   * limits they differ by 46% — a maiden towers over a crab — and that
   * swamps the only size difference that should mean anything, which is
   * which piece the row is offering. Compressing the set into a narrow band
   * costs nothing on screen: the camera frames the row's box, so a shorter
   * tallest figure simply brings it closer.
   */
  heightSpread: 0.14,
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
 * How far a figure of this proportion is scaled from its unit form (height 1)
 * before the set is levelled. Height is the usual limit; a wide cast is held
 * back by its width instead, so neighbours never collide however differently
 * the twelve are proportioned.
 */
export function fitScale(aspect, gallery = GALLERY) {
  return Math.min(gallery.height, gallery.maxWidth / aspect);
}

/**
 * The twelve, fitted as a set rather than one at a time: every figure takes
 * its own limit, then the whole row is capped into `heightSpread` of the
 * shortest the limits allow. Scales only ever shrink, so the collision
 * clearance that `fitScale` guarantees survives untouched — and size stops
 * saying "this is a maiden" and starts saying "this is the one in front".
 */
export function fitScales(aspects, gallery = GALLERY) {
  const limits = aspects.map((aspect) => fitScale(aspect, gallery));
  const ceiling = Math.min(...limits) * (1 + gallery.heightSpread);
  return limits.map((limit) => Math.min(limit, ceiling));
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
export function dragToFocusDelta(pixels, viewportWidth, figuresPerViewport = 4) {
  const width = Math.max(320, viewportWidth || 1024);
  return (-pixels / width) * figuresPerViewport;
}

/**
 * Decide whether a pending touch means to browse the row or scroll the page.
 * Diagonal movement stays pending until one axis clearly wins.
 */
export function dragIntent(dx, dy, threshold = 9, axisRatio = 1.2) {
  if (Math.hypot(dx, dy) < threshold) return 'pending';
  if (Math.abs(dx) > Math.abs(dy) * axisRatio) return 'horizontal';
  if (Math.abs(dy) > Math.abs(dx) * axisRatio) return 'vertical';
  return 'pending';
}

/**
 * Turn a release velocity into a small, predictable continuation.
 * A pause before release cancels the fling; even a fast flick carries no more
 * than one-and-a-quarter figures.
 */
export function flingCarry(
  velocity,
  idleMs,
  { threshold = 0.11, multiplier = 1.1, maximum = 1.25, staleAfter = 80 } = {},
) {
  if (!Number.isFinite(velocity) || Math.abs(velocity) < threshold || idleMs > staleAfter) {
    return 0;
  }
  return Math.max(-maximum, Math.min(maximum, -velocity * multiplier));
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
 * The row band of an embedded stage: the section is its own room, with no
 * masthead inside it and no card ever, so the band runs from the section's
 * top down to its controls. Same floor discipline as the page's own bands —
 * a collapsed section must never produce a degenerate rectangle.
 */
export function embedBand(width, height, chromeTop, gap = 20, floor = 140) {
  const bottom = Math.min(height, chromeTop) - gap;
  return {
    x: 0,
    y: gap,
    width: Math.max(floor, width),
    height: Math.max(floor, bottom - gap),
  };
}

/**
 * Figures far enough off-screen that there is nothing to draw. Generous by a
 * slot on each side so one is never seen appearing.
 */
export function isVisible(index, focus, span = 7) {
  return Math.abs(index - focus) <= span;
}

/**
 * The spotlight. A gallery offers one piece at a time: whatever the row is
 * holding forward stands at full size and full strength, and the rest step
 * back into the dark. Without this, focus is worth about four percent of
 * apparent size — nothing next to the difference between one sculpture and
 * the next — and the row reads as arbitrary.
 */
export const SPOTLIGHT = Object.freeze({
  focus: 1,
  near: 0.78,
  far: 0.65,
  dim: 0.62,
});

/**
 * The stronger profile the consumer rectangle wears. There, the row is not a
 * shelf to browse but a single piece being offered, with the others present
 * only as the room it stands in — so the fall-off is steep and the dark
 * closes in faster.
 *
 * `focus` stays at 1. Above it the piece outgrows the box the camera frames,
 * and a head is the first thing to leave the picture.
 */
export const SPOTLIGHT_STAGE = Object.freeze({
  focus: 1,
  near: 0.5,
  far: 0.3,
  dim: 0.26,
  // The landing is a presentation of one object, not a miniature catalogue.
  // Keep only its immediate context in the room and give the offered piece a
  // little more lift and depth than the general-purpose shelf.
  visibleSpan: 1.35,
  lift: 0.09,
  out: 0.12,
});

const smoothstep = (t) => t * t * (3 - (2 * t));

/**
 * How large and how present figure `distance` slots from the focus stands.
 * Smooth and monotonic: full at the focus, `near` one slot out, `far` from
 * two slots on, so nothing pops as the row slides between figures.
 */
export function emphasis(distance, spotlight = SPOTLIGHT) {
  const away = Math.min(2, Math.abs(distance));
  const first = Math.min(1, away);
  const second = Math.max(0, away - 1);
  const scale = second > 0
    ? spotlight.near + ((spotlight.far - spotlight.near) * smoothstep(second))
    : spotlight.focus + ((spotlight.near - spotlight.focus) * smoothstep(first));
  const reach = smoothstep(away / 2);
  return { scale, opacity: 1 + ((spotlight.dim - 1) * reach) };
}

// ---- the rail ----------------------------------------------------------------

/**
 * The rail magnifies like a dock: whatever the cursor is nearest swells
 * most, its neighbours less, the next less again — a wave that travels with
 * the pointer, so which of the twelve is under the hand is never in doubt.
 */
export const DOCK = Object.freeze({
  // The peak stays within the rail's vertical paint box, so the horizontally
  // scrollable pill never shears the top off a hovered disc.
  amplitude: 0.42,
  spread: 1.9,
  /** How far the current sign stands proud when no cursor is on the rail. */
  rest: 0.28,
});

// The opened Thesis sculpture turns like a dealer's turntable. The Registry
// spotlight is always on display, so its perpetual version is deliberately
// slower and yields for a short inspection pause after direct manipulation.
export const TURNTABLE = Object.freeze({
  openedRate: 0.22,
  spotlightRate: 0.12,
  resumeAfter: 2400,
});

export function turntableActive({
  spotlight,
  open,
  targetOpen,
  switchFrom,
  focus,
  targetFocus,
  stageVisible,
  paused,
  handTurned,
  reducedMotion,
  dragging,
}) {
  if (!stageVisible || paused || handTurned || reducedMotion || dragging) return false;
  return spotlight
    ? switchFrom < 0 && Math.abs(focus - targetFocus) < 0.0005
    : targetOpen === 1 && open > 0.98;
}

/** Magnification for a tick `distance` ticks from the cursor. */
export function dockMagnify(distance, dock = DOCK) {
  const away = Math.abs(distance) / dock.spread;
  return 1 + (dock.amplitude * Math.exp(-(away * away)));
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

/**
 * The rig for the consumer rectangle. The row's own box is about 1.9 units
 * tall, so `minWorldHeight` — not the margin — is what actually decides how
 * large a figure lands there: the camera resolves 2.35 units across the canvas
 * instead of 3, which is the difference between a sculpture on a shelf and a
 * sculpture being shown to you. Both are kept honest by the same clamp, so a
 * cramped viewport still cannot push the row into the reader's face.
 */
export const SPOTLIGHT_VITRINE = Object.freeze({
  fov: VITRINE.fov,
  tilt: VITRINE.tilt,
  rowMargin: 1.05,
  stageMargin: VITRINE.stageMargin,
  zoomGain: VITRINE.zoomGain,
  stageZ: VITRINE.stageZ,
  minWorldHeight: 2.35,
  maxWorldHeight: VITRINE.maxWorldHeight,
});

/**
 * The world box the whole row occupies: plinth foot to tallest head. The
 * tallest is passed in because the set is levelled at runtime — framing the
 * cap instead would leave dead air above the row.
 */
export function rowContent(gallery = GALLERY, tallest = gallery.height) {
  const bottom = floorY(gallery) - 0.1; // the shadows spread a little wider
  const top = gallery.baseY + tallest + 0.04;
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
