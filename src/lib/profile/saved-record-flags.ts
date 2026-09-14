export const SAVED_RECORDS_PUBLIC_FLAG = 'PUBLIC_SAVED_RECORDS_ENABLED';

export interface SavedRecordsPublicEnv {
  PUBLIC_SAVED_RECORDS_ENABLED?: string;
}

/**
 * Build-time switch for the local calculation-record lifecycle. Committed
 * state is off; activation is a separate release decision. Astro pages read
 * `process.env`, islands read `import.meta.env`; both come from one build.
 */
export function savedRecordsEnabled(
  env: SavedRecordsPublicEnv = {
    PUBLIC_SAVED_RECORDS_ENABLED: import.meta.env.PUBLIC_SAVED_RECORDS_ENABLED,
  },
): boolean {
  return env.PUBLIC_SAVED_RECORDS_ENABLED === '1';
}
