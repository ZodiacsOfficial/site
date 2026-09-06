# Mobile Race link clearance — September 6 reconciliation

PR #380 preserves its original thirteen CSS additions in `RaceRamp.astro`:
the mobile link has a 44px minimum height, wraps long sign names and leaves
room for the fixed Guide launcher through 560px. No feature flag is changed.

The original September 5 head `5197f2d7` records successful standard and
Games-enabled builds, 3,381 tests, eighteen acceptance captures, and a reviewed
390px deployment. Those checks belong to that historical tree.

This reconciliation merges released main `8ccf127ce4f8061db8a9569c1444a054723634e0`
while retaining its source, published data, visual baselines and screenshots.
Only the original RaceRamp product change remains relative to that main.
The screenshot conflicts are resolved with current-main evidence pending a
genuine fresh capture; the old receipt is not represented as current acceptance.

Current-head build/type checks, fresh capture receipt, required CI and actual
Games-enabled preview review remain release gates. The PR stays draft until
these pass, with production verification after merge. The neighboring crowded
wheel PR #392 owns its release independently; merge order is coordinated so
an intervening release cannot be lost.
