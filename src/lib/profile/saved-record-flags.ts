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

/**
 * The dedicated database name, duplicated here on purpose: this module is
 * always shipped and must carry no dependency on the record store, which the
 * flag-off build never loads. `saved-record-store.test.ts` pins the two
 * spellings together so they cannot drift.
 */
export const SAVED_RECORDS_DATABASE_NAME = 'zodiacs-saved-natal-v1';

/**
 * Whether records kept while the feature was switched on are still on this
 * device. Enumerating databases creates nothing, so a browser that never had
 * the feature enabled stays exactly as it is today.
 *
 * This exists for one reason: the build flag must gate writing and the record
 * surfaces, never cleanup. If activation is rolled back, a visitor must still
 * be able to find, export and remove what was already kept, destructive
 * account actions must keep their promise instead of reporting a removal that
 * did not happen, and an interrupted removal must still be finished.
 *
 * A runtime without `indexedDB.databases()` reports false: this client could
 * not have kept records there either, so there is nothing to retain.
 */
export async function savedRecordsRetainedOnDevice(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return false;
    const databases = await indexedDB.databases();
    return databases.some((entry) => entry?.name === SAVED_RECORDS_DATABASE_NAME);
  } catch {
    // An unreadable storage boundary is not evidence that records exist.
    return false;
  }
}
