/** Accept only real UTC instants inside the supported chart year range. */
export function parseEventTransitInstant(value: string | null): number | null {
  if (!value || !/^(?:18|19|20|21)\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  return new Date(ms).toISOString() === canonical ? ms : null;
}

/** The link carries an event instant, never a visitor's birth information. */
export function eventTransitHref(value: string): string | null {
  const ms = parseEventTransitInstant(value);
  return ms === null ? null : `/transits/?at=${encodeURIComponent(new Date(ms).toISOString())}`;
}

export function eventTransitQuery(search: string): { at: number | null; invalid: boolean } {
  const values = new URLSearchParams(search).getAll('at');
  if (values.length === 0) return { at: null, invalid: false };
  const at = values.length === 1 ? parseEventTransitInstant(values[0]) : null;
  return { at, invalid: at === null };
}
