/**
 * The span the site's scans stay inside, half-open: 1800-01-01T00:00Z up to
 * 2200-01-01T00:00Z. Birth dates are limited to it, and the transit and
 * lunar-return windows already were; returns and year scans that would run
 * past it are clipped here and say so.
 */
export const REFERENCE_SPAN_START_MS = Date.parse('1800-01-01T00:00:00Z');
export const REFERENCE_SPAN_END_MS = Date.parse('2200-01-01T00:00:00Z');

export interface ClippedWindow {
  from: Date;
  to: Date;
  /** Whether either end was moved inside the span. */
  clipped: boolean;
}

/**
 * The part of the window [from, to] inside the span, or null when none of it
 * is. The end stays one millisecond short of the span's end.
 */
export function clipToReferenceSpan(from: Date, to: Date): ClippedWindow | null {
  const lo = Math.max(from.getTime(), REFERENCE_SPAN_START_MS);
  const hi = Math.min(to.getTime(), REFERENCE_SPAN_END_MS - 1);
  if (!(lo < hi)) return null;
  return { from: new Date(lo), to: new Date(hi), clipped: lo !== from.getTime() || hi !== to.getTime() };
}
