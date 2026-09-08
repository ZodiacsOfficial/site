/**
 * Wheel layout math with zero imports — split from build.ts so the Wheel
 * (and therefore the homepage's demo chart) never drags the scene builder's
 * dependencies (dignities, house lookup) into its bundle closure.
 */

/**
 * The wheel's collision layout: bodies closer than 7° fan outward, four
 * relaxation passes. Byte-for-byte the algorithm the Wheel shipped with —
 * the serialization test on the share-card props guards that this extraction
 * changed nothing.
 */
export function collisionNudge(
  bodies: { body: string; lon: number }[],
): Map<string, number> {
  const sorted = [...bodies].sort((x, y) => x.lon - y.lon);
  const drawLon = new Map<string, number>();
  for (const b of sorted) drawLon.set(b.body, b.lon);
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < sorted.length; i += 1) {
      const a = sorted[i];
      const b = sorted[(i + 1) % sorted.length];
      if (a === b) continue;
      const la = drawLon.get(a.body)!;
      const lb = drawLon.get(b.body)!;
      const gap = ((lb - la) % 360 + 360) % 360;
      if (gap < 7) {
        const push = (7 - gap) / 2;
        drawLon.set(a.body, la - push);
        drawLon.set(b.body, lb + push);
      }
    }
  }
  return drawLon;
}
