# The package half of Phase 1, as patches

Six commits for `@zodiacs/engine`, written for rc.7 while the engine lived in
the SDK repository. The engine now has its own repository,
`zodiacs-org/engine`, where these commits are the rc.7 pull request,
[zodiacs-org/engine#1](https://github.com/zodiacs-org/engine/pull/1). This
folder keeps them as patches until rc.7 is vendored here.

| patch | step | what it does |
| --- | --- | --- |
| `0001-…` | 1.2 | An aspect is applying when the orb is strictly decreasing, judged from the sign of the orb's rate. It is `stationary` when the relative speed is below 1e-9°/day. The old test moved both bodies 0.02 day, so every aspect read as separating for the last 14.4 minutes before exact. |
| `0002-…` | 1.8 | The planets and the Moon take their speeds from a ±0.001-day difference of the reported longitude, where the step was ±0.25 day. The Moon's step error falls from up to 7.55″ to 0.0015″ a day. The true node keeps ±0.25 day. The Saturn return scan takes natal Saturn's direction from the same speed. |
| `0003-…` | receipts | Receipts record the new speed and applying conventions. Receipts from rc.3 to rc.6 are still read: they carry the older set, frozen as `CONVENTIONS_RC3`, and are never judged by the new rule. |
| `0004-…` | 1.3 | The angles use the true obliquity of date (`e_tilt(time).tobl`) in place of the mean one. On the preregistered grid against the ERFA arbiter, the ascendant's largest difference falls from 506.8″ to 6.36″, and to 0.36″ within 45° of the equator. Receipts record `gast-and-true-obliquity`. Twelve ERFA anchors from `../corpora/angle-grid-erfa.json` are a test; eleven of them fail with the mean obliquity. |
| `0005-…` | 1.9 | Placidus is refused where \|latitude\| ≥ 90° − ε, with the true obliquity, in place of a fixed 66°. On the preregistered ladder the engine computes 320 of the 336 cases, each on the same side of ERFA's limit as the arbiter; it refused all 336 before. Measured here against Swiss 2.10.03 on Swiss's own inputs, and not committed: the status agrees on 336 of 336, and the cusps are within 0.0085″. The README states the new limit. |
| `0006-…` | 1.9 | The rest of rule 1h. `houseSystem: "porphyry"` trisects each quadrant between the angles, at any latitude. Whole sign stays the Placidus fallback, exported as `PLACIDUS_POLAR_FALLBACK` and returned by `computeHouses` as `fallbackSystem`. Swiss falls back to Porphyry instead, and the README says so. A supplied Chart's houses must be the system its input asked for. Receipts accept Porphyry only in the current conventions set, and check its trisection. Measured here against Swiss 2.10.03 on Swiss's own inputs, and not committed: the cusps agree to 6.1e-9″ at 1,632 cases from 55° to 85°. |

Each commit message gives the tests and figures in full.

- **Base:** `ac27761e6dea138842e6ef5c2c69129ead7af636`, the head of
  `origin/codex/platform-time-seconds`, which is the rc.6 source.
- **Applied tree:** applied there with `git am`, the six patches give tree
  `57934371219b9222d2a2a878e37126519668b66c`, which is the local branch
  `rc7-phase1` exactly.
- **Tests:** `vitest run` in `packages/engine` passes 510 of 510.
- **In the engine repository:** the same six commits sit on `main` there,
  which is rc.6 with its history plus the setup to build on its own. Apart
  from that setup the tree is the one above, and the 510 tests pass.

The package version is still `0.1.1-rc.6`. The version bump, the release
artifacts and the site's re-vendoring belong to the rc.7 release. The owner
delegated the fallback decision on 2026-09-23: whole sign stays the fallback,
so charts computed today keep their houses, and Porphyry is offered beside it.
The site's house-system choice stays whole sign and Placidus until someone
decides to offer Porphyry there.

`scripts/angles-grid.test.mjs` pins rc.6's angles and limit. It fails once
rc.7 is vendored, and is then rewritten as rules 1b and 1h.

```bash
git fetch origin codex/platform-time-seconds
git switch -c <branch> ac27761e6dea138842e6ef5c2c69129ead7af636
git am path/to/rc7-phase1/*.patch
```

Once rc.7 is vendored here, this folder can be removed.
