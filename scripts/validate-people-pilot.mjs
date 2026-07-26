/**
 * Production entry point for the complete reviewed People validator.
 * The source-of-truth checks remain beside the research records they audit;
 * this wrapper fixes the active phase contract to the 5B noindex pilot.
 */
if (!process.argv.includes('--phase5b')) process.argv.push('--phase5b');
await import('../docs/phase5/people-pilot/tools/validate-pilot.mjs');
