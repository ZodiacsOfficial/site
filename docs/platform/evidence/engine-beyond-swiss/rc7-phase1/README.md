# The package half of Phase 1, as patches

Four commits for `@zodiacs/engine` in the `ZodiacsOfficial/sdk` repository,
written for rc.7. They are kept here because pushing a branch to that
repository waits for the owner's permission, and a local branch does not
survive this session's container.

| patch | step | what it does |
| --- | --- | --- |
| `0001-…` | 1.2 | An aspect is applying when the orb is strictly decreasing, judged from the sign of the orb's rate. It is `stationary` when the relative speed is below 1e-9°/day. The old test moved both bodies 0.02 day, so every aspect read as separating for the last 14.4 minutes before exact. |
| `0002-…` | 1.8 | The planets and the Moon take their speeds from a ±0.001-day difference of the reported longitude, where the step was ±0.25 day. The Moon's step error falls from up to 7.55″ to 0.0015″ a day. The true node keeps ±0.25 day. The Saturn return scan takes natal Saturn's direction from the same speed. |
| `0003-…` | receipts | Receipts record the new speed and applying conventions. Receipts from rc.3 to rc.6 are still read: they carry the older set, frozen as `CONVENTIONS_RC3`, and are never judged by the new rule. |
| `0004-…` | 1.3 | The angles use the true obliquity of date (`e_tilt(time).tobl`) in place of the mean one. On the preregistered grid against the ERFA arbiter, the ascendant's largest difference falls from 506.8″ to 6.36″, and to 0.36″ within 45° of the equator. Receipts record `gast-and-true-obliquity`. Twelve ERFA anchors from `../corpora/angle-grid-erfa.json` are a test; eleven of them fail with the mean obliquity. |

Each commit message gives the tests and figures in full.

- **Base:** `ac27761e6dea138842e6ef5c2c69129ead7af636`, the head of
  `origin/codex/platform-time-seconds`, which is the rc.6 source.
- **Applied tree:** applied there with `git am`, the four patches give tree
  `48fadbadfe14209ef1db13360a1a89e603f134c3`, which is the local branch
  `rc7-phase1` exactly.
- **Tests:** `vitest run` in `packages/engine` passes 495 of 495.

The package version is still `0.1.1-rc.6`. The version bump, the release
artifacts and the site's re-vendoring belong to the rc.7 release. Step 1.9,
the Placidus limit at 90° − ε, is not in these patches yet.
`scripts/angles-grid.test.mjs` pins rc.6's angles and limit. It fails once
rc.7 is vendored, and is then rewritten as rules 1b and 1h.

```bash
git fetch origin codex/platform-time-seconds
git switch -c <branch> ac27761e6dea138842e6ef5c2c69129ead7af636
git am path/to/rc7-phase1/*.patch
```

Once the branch is pushed to the SDK repository, this folder can be removed.
