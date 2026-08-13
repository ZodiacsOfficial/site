/**
 * Retired compatibility entrypoint.
 *
 * The old selector drive described the combined market-and-gallery landing
 * that predated the Astrofolio / Terminal split. Keep direct invocations
 * useful by forwarding them to the current focused browser gate.
 */
await import('./registry-browser-drive.mjs');
