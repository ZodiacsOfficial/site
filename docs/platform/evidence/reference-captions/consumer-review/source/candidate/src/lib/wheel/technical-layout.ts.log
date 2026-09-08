/**
 * Collision fan shared by the technical export and interactive scene.
 * Circular isotonic regression preserves zodiac order while guaranteeing
 * enough angular separation for the sheet's planet bubbles.
 */
export function technicalCollisionFan(
  bodies: { body: string; lon: number }[],
  minimumGap = 11,
): Map<string, number> {
  if (bodies.length < 2) {
    return new Map(bodies.map((body) => [body.body, body.lon]));
  }

  const normalized = bodies
    .map((body) => ({ ...body, normalizedLon: ((body.lon % 360) + 360) % 360 }))
    .sort((a, b) => a.normalizedLon - b.normalizedLon);

  let largestGapIndex = 0;
  let largestGap = -1;
  normalized.forEach((body, index) => {
    const next = normalized[(index + 1) % normalized.length];
    // The closing gap is 360°, not 0°, when every longitude coincides.
    const gap = next.normalizedLon - body.normalizedLon + (index === normalized.length - 1 ? 360 : 0);
    if (gap > largestGap) {
      largestGap = gap;
      largestGapIndex = index;
    }
  });

  const start = (largestGapIndex + 1) % normalized.length;
  const ordered = Array.from({ length: normalized.length }, (_, index) => {
    const sourceIndex = (start + index) % normalized.length;
    const body = normalized[sourceIndex];
    const unwrapped = body.normalizedLon + (sourceIndex < start ? 360 : 0);
    return { ...body, unwrapped };
  });

  // PAVA projects target[i] - i*gap onto a non-decreasing sequence.
  const blocks: Array<{ start: number; end: number; sum: number; count: number }> = [];
  ordered.forEach((body, index) => {
    blocks.push({ start: index, end: index, sum: body.unwrapped - index * minimumGap, count: 1 });
    while (blocks.length > 1) {
      const right = blocks[blocks.length - 1];
      const left = blocks[blocks.length - 2];
      if (left.sum / left.count <= right.sum / right.count) break;
      blocks.splice(blocks.length - 2, 2, {
        start: left.start,
        end: right.end,
        sum: left.sum + right.sum,
        count: left.count + right.count,
      });
    }
  });

  const fitted = new Array<number>(ordered.length);
  blocks.forEach((block) => {
    const mean = block.sum / block.count;
    for (let index = block.start; index <= block.end; index += 1) fitted[index] = mean;
  });

  return new Map(ordered.map((body, index) => [
    body.body,
    fitted[index] + index * minimumGap,
  ]));
}
