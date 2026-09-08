/** Connect the true tick to a displaced bubble without cutting through
 * neighbouring bubbles. Radius and unwrapped longitude change monotonically;
 * the outer end stays at the astronomical position, the inner at its marker.
 */
export function bodyLeaderPath(
  lon: number,
  drawLon: number,
  outerRadius: number,
  innerRadius: number,
  point: (lon: number, radius: number) => { x: number; y: number },
): string | null {
  const delta = ((drawLon - lon) % 360 + 540) % 360 - 180;
  if (Math.abs(delta) < 1e-7) return null;
  return Array.from({ length: 9 }, (_, index) => {
    const progress = index / 8;
    const p = point(lon + delta * progress, outerRadius + (innerRadius - outerRadius) * progress);
    return `${index ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(' ');
}
