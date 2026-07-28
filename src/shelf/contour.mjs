// Silhouettes.
//
// The registry's sculptures exist as photographs, not geometry: twelve renders
// on transparent ground under public/assets/nuggets/. To stand one up in three
// dimensions we trace the edge of its alpha channel and extrude that outline
// into a shallow cast.
//
// Pure arithmetic — no sharp, no Three.js, no DOM. That keeps the tracing
// testable against synthetic masks, and lets CI re-derive the committed
// geometry straight from the art to prove the two still agree. (PNG decoding
// is bit-exact and this file is plain IEEE arithmetic, so the derivation is
// reproducible anywhere. Nothing here may resize — resampling is where
// platform differences creep in.)

/** Alpha at or above this counts as cast metal. */
export const MASK_THRESHOLD = 128;

/** Ramer–Douglas–Peucker tolerance, in source pixels. */
export const SIMPLIFY_EPSILON = 1.15;

/** Rings smaller than this share of the image are speckle, not sculpture. */
export const MIN_CONTOUR_AREA_RATIO = 1e-4;

/** Normalised coordinates are stored as integers on this grid. */
export const QUANT = 4096;

/** Just the alpha plane, out of interleaved pixel data. */
export function alphaField(data, width, height, channels) {
  const field = new Uint8Array(width * height);
  const alphaOffset = channels - 1;
  for (let i = 0; i < field.length; i += 1) {
    field[i] = data[(i * channels) + alphaOffset];
  }
  return field;
}

// Marching squares over the four corners of each cell. Corner bits are
// v0 top-left (1), v1 top-right (2), v2 bottom-right (4), v3 bottom-left (8);
// edges are A top, B right, C bottom, D left. Every segment is directed so the
// cast metal lies to its right, which makes the segments chain end-to-start
// into closed rings without any further sorting.
const CASE_SEGMENTS = new Map([
  [1, [['A', 'D']]],
  [2, [['B', 'A']]],
  [3, [['B', 'D']]],
  [4, [['C', 'B']]],
  [6, [['C', 'A']]],
  [7, [['C', 'D']]],
  [8, [['D', 'C']]],
  [9, [['A', 'C']]],
  [11, [['B', 'C']]],
  [12, [['D', 'B']]],
  [13, [['A', 'B']]],
  [14, [['D', 'A']]],
]);

// The two ambiguous cells, where opposite corners are metal. The average of
// the four corners decides whether the diagonal is joined or pinched.
const SADDLE_JOINED = new Map([
  [5, [['A', 'B'], ['C', 'D']]],
  [10, [['D', 'A'], ['B', 'C']]],
]);
const SADDLE_SPLIT = new Map([
  [5, [['A', 'D'], ['C', 'B']]],
  [10, [['B', 'A'], ['D', 'C']]],
]);

/**
 * Trace every closed contour of `field` at `threshold`. Crossings are placed by
 * linear interpolation on the alpha values, so an edge quantised to a handful
 * of alpha steps still yields a smooth outline. Returns rings of [x, y] points
 * in source-pixel coordinates, y down.
 */
export function traceContours(field, width, height, threshold = MASK_THRESHOLD) {
  const at = (x, y) => (
    x < 0 || y < 0 || x >= width || y >= height ? 0 : field[(y * width) + x]
  );
  // Where along an edge the alpha crosses the threshold.
  const cross = (a, b) => (a === b ? 0.5 : (threshold - a) / (b - a));

  const segments = new Map();

  // One cell of padding on every side, so a figure running off the edge of the
  // canvas still closes rather than leaving an open chain.
  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const v0 = at(x, y);
      const v1 = at(x + 1, y);
      const v2 = at(x + 1, y + 1);
      const v3 = at(x, y + 1);

      const code = (v0 >= threshold ? 1 : 0)
        + (v1 >= threshold ? 2 : 0)
        + (v2 >= threshold ? 4 : 0)
        + (v3 >= threshold ? 8 : 0);
      if (code === 0 || code === 15) continue;

      let pairs = CASE_SEGMENTS.get(code);
      if (!pairs) {
        const centre = (v0 + v1 + v2 + v3) / 4;
        pairs = (centre >= threshold ? SADDLE_JOINED : SADDLE_SPLIT).get(code);
      }

      const edges = {
        A: { key: `h${x},${y}`, point: [x + cross(v0, v1), y] },
        B: { key: `v${x + 1},${y}`, point: [x + 1, y + cross(v1, v2)] },
        C: { key: `h${x},${y + 1}`, point: [x + cross(v3, v2), y + 1] },
        D: { key: `v${x},${y}`, point: [x, y + cross(v0, v3)] },
      };

      for (const [from, to] of pairs) {
        segments.set(edges[from].key, { point: edges[from].point, next: edges[to].key });
      }
    }
  }

  // Each crossing is the end of exactly one segment and the start of exactly
  // one other, so following `next` walks a ring and returns to its start.
  const rings = [];
  const walked = new Set();
  for (const start of segments.keys()) {
    if (walked.has(start)) continue;
    const ring = [];
    let key = start;
    while (!walked.has(key)) {
      const segment = segments.get(key);
      if (!segment) break;
      walked.add(key);
      ring.push(segment.point);
      key = segment.next;
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

/** Shoelace. Positive and negative distinguish the two windings. */
export function signedArea(ring) {
  let total = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    total += (x1 * y2) - (x2 * y1);
  }
  return total / 2;
}

/** Ray casting, counting crossings to the right of the point. */
export function ringContains(ring, [px, py]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) === (yj > py)) continue;
    if (px < (((xj - xi) * (py - yi)) / (yj - yi)) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Sort traced rings into shapes. A ring sitting inside an even number of others
 * is an outline; an odd number makes it a hole in the innermost outline that
 * contains it. Handles a figure in several pieces (Pisces' loose beads) and a
 * piece standing inside a hole.
 */
export function classifyRings(rings) {
  const depth = rings.map((ring) => rings.reduce(
    (count, other) => (other !== ring && ringContains(other, ring[0]) ? count + 1 : count),
    0,
  ));

  const shapes = [];
  const shapeOfRing = new Map();
  rings.forEach((ring, index) => {
    if (depth[index] % 2 !== 0) return;
    shapeOfRing.set(index, shapes.length);
    shapes.push({ outer: ring, holes: [] });
  });

  rings.forEach((ring, index) => {
    if (depth[index] % 2 === 0) return;
    let parent = -1;
    for (let other = 0; other < rings.length; other += 1) {
      if (other === index || depth[other] % 2 !== 0) continue;
      if (!ringContains(rings[other], ring[0])) continue;
      if (parent === -1 || depth[other] > depth[parent]) parent = other;
    }
    if (parent !== -1) shapes[shapeOfRing.get(parent)].holes.push(ring);
  });

  return shapes;
}

function segmentDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = (dx * dx) + (dy * dy);
  let t = 0;
  if (lengthSquared > 0) {
    t = Math.max(0, Math.min(1, (((px - ax) * dx) + ((py - ay) * dy)) / lengthSquared));
  }
  const qx = ax + (t * dx);
  const qy = ay + (t * dy);
  return Math.hypot(px - qx, py - qy);
}

/** Ramer–Douglas–Peucker over an open chain, iterative so long rings are safe. */
function reduceChain(points, epsilon) {
  const count = points.length;
  if (count < 3) return points.slice();

  const keep = new Uint8Array(count);
  keep[0] = 1;
  keep[count - 1] = 1;

  const stack = [[0, count - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let furthest = -1;
    let distance = epsilon;
    for (let i = start + 1; i < end; i += 1) {
      const measured = segmentDistance(points[i], points[start], points[end]);
      if (measured > distance) {
        distance = measured;
        furthest = i;
      }
    }
    if (furthest === -1) continue;
    keep[furthest] = 1;
    stack.push([start, furthest], [furthest, end]);
  }

  const reduced = [];
  for (let i = 0; i < count; i += 1) if (keep[i]) reduced.push(points[i]);
  return reduced;
}

/**
 * Simplify a closed ring. The ring is cut at its two most distant points before
 * reduction — anchoring it that way stops a nearly-round outline from
 * collapsing to a sliver.
 */
export function simplifyRing(ring, epsilon = SIMPLIFY_EPSILON) {
  if (ring.length < 4) return ring.slice();

  let opposite = 0;
  let furthest = -1;
  for (let i = 1; i < ring.length; i += 1) {
    const measured = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (measured > furthest) {
      furthest = measured;
      opposite = i;
    }
  }

  const front = reduceChain(ring.slice(0, opposite + 1), epsilon);
  const back = reduceChain([...ring.slice(opposite), ring[0]], epsilon);
  return [...front.slice(0, -1), ...back.slice(0, -1)];
}

function boundsOf(rings) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/**
 * Trace, filter and simplify one figure. `threshold` may be lowered per sign
 * where the cast has thin members — Libra's chains sever at the default.
 */
export function figureShapes(field, width, height, {
  threshold = MASK_THRESHOLD,
  epsilon = SIMPLIFY_EPSILON,
  minAreaRatio = MIN_CONTOUR_AREA_RATIO,
} = {}) {
  const minimum = width * height * minAreaRatio;
  const rings = traceContours(field, width, height, threshold)
    .filter((ring) => Math.abs(signedArea(ring)) >= minimum);
  if (!rings.length) throw new Error('contour: no visible silhouette in this source');

  return classifyRings(rings).map(({ outer, holes }) => ({
    outer: simplifyRing(outer, epsilon),
    holes: holes.map((hole) => simplifyRing(hole, epsilon)),
  }));
}

function quantiseRing(ring, centreX, floorY, scale) {
  const flat = [];
  let lastX = null;
  let lastY = null;
  // Rounding a small negative yields -0, which JSON writes as 0. Left alone,
  // a fresh trace and the committed file would compare unequal while
  // serialising identically — so settle it here.
  const settle = (value) => (value === 0 ? 0 : value);
  for (const [x, y] of ring) {
    // Source pixels are y-down; the scene stands the figure up, y-up, with its
    // feet on zero and its height at one.
    const qx = settle(Math.round((x - centreX) * scale * QUANT));
    const qy = settle(Math.round((floorY - y) * scale * QUANT));
    if (qx === lastX && qy === lastY) continue;
    flat.push(qx, qy);
    lastX = qx;
    lastY = qy;
  }
  // A ring that quantised down to a line is no longer a face.
  return flat.length >= 6 ? flat : null;
}

/**
 * Put a traced figure into the scene's own units: height exactly 1, feet on
 * y = 0, centred on x, coordinates rounded onto an integer grid so the
 * committed geometry is small, diffable and identical run to run.
 */
export function normaliseFigure(shapes) {
  const bounds = boundsOf(shapes.flatMap(({ outer, holes }) => [outer, ...holes]));
  const scale = 1 / bounds.height;
  const centreX = (bounds.left + bounds.right) / 2;

  const normalised = [];
  for (const { outer, holes } of shapes) {
    const ring = quantiseRing(outer, centreX, bounds.bottom, scale);
    if (!ring) continue;
    normalised.push({
      outer: ring,
      holes: holes
        .map((hole) => quantiseRing(hole, centreX, bounds.bottom, scale))
        .filter(Boolean),
    });
  }
  if (!normalised.length) throw new Error('contour: figure vanished under quantisation');

  return {
    shapes: normalised,
    aspect: Number((bounds.width / bounds.height).toFixed(6)),
    source: {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    },
  };
}

/** Points kept across a whole figure — the number the bundle has to carry. */
export function pointCount({ shapes }) {
  return shapes.reduce(
    (total, { outer, holes }) => (
      total + (outer.length / 2) + holes.reduce((sum, hole) => sum + (hole.length / 2), 0)
    ),
    0,
  );
}
