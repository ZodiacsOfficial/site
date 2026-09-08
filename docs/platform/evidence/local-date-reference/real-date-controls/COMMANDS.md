Source snapshot used exact committed HEAD abcf1a44e52040db79a369b49bc9b55d78099b22 and verified current bytes. Local build/runtime packages were physically copied from the preceding independent review; no install or download.

Executed bounded driver:

    /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node run.mjs > run.log 2>&1

Chrome ran under approved local escalation in an owned about:blank context with every page request blocked. The driver executes only fixtures.json, does not enumerate zones, and does not search a date matrix. Early source-location guesses geo/time.ts, timezone.ts and local-date-intervals.ts at the lib root were absent; the actual ChartCalculator import resolved src/lib/time/localToUtc.ts. These were read-only location misses, not product failures.
