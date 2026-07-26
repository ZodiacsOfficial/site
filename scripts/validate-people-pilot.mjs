/**
 * Production entry point for the complete reviewed People validator.
 * The source-of-truth checks remain beside the research records they audit;
 * this wrapper fixes the active phase contract to the conservative 5C release.
 */
if (!process.argv.includes('--phase5c')) process.argv.push('--phase5c');
await import('../docs/phase5/people-pilot/tools/validate-pilot.mjs');
