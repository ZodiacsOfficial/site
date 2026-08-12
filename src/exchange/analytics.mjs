/**
 * Privacy-bounded operating signals for the Registry Trading Room.
 *
 * These events answer whether the room and its public providers work. The
 * contract deliberately has no place for an address, amount, mint, route
 * payload, transaction, URL, free text, or persistent identifier.
 */

export const EXCHANGE_ANALYTICS_CONTRACT = Object.freeze({
  exchange_room_mount: Object.freeze({}),
  exchange_market_state: Object.freeze({
    surface: Object.freeze(['chart', 'tape', 'ladder', 'panel']),
    outcome: Object.freeze(['ready', 'empty', 'partial', 'not_indexed', 'rate_limited', 'unavailable']),
  }),
});

export function sanitizeExchangeEvent(name, properties = {}) {
  const contract = EXCHANGE_ANALYTICS_CONTRACT[name];
  if (!contract) return null;
  const safe = {};
  for (const [key, values] of Object.entries(contract)) {
    const value = properties[key];
    if (typeof value !== 'string' || !values.includes(value)) return null;
    safe[key] = value;
  }
  return safe;
}

export function trackExchangeEvent(
  name,
  properties = {},
  track = globalThis.window?.plausible,
) {
  const safe = sanitizeExchangeEvent(name, properties);
  if (!safe || typeof track !== 'function') return false;
  try {
    track(name, { props: safe });
    return true;
  } catch {
    return false;
  }
}
