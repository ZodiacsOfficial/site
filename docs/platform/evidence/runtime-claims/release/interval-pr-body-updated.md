A local calendar date can be skipped, repeated, or split into separate UTC periods. The existing two-midnight helper cannot represent all of those cases. Add an inactive interval primitive that preserves exact half-open date membership, with explicit empty and unresolved outcomes.

The source scope is three new files: the interval API, focused tests and a native browser driver. A trusted complete-transition provider partitions a bounded 72-hour window; the optional native Temporal adapter is detected only on call and checks observed Intl offset agreement. Invalid/failing providers and transition exhaustion return unresolved without partial results. This does not activate callers, load a polyfill, change existing calculations, alter accounts/locales/design, or establish whole-date Sun/Moon candidate completeness.

Validation:
- Root normal build, all 4,938 tests / 414 files, check (1,041 files; zero errors/warnings), strict types and exact-base scope pass.
- All 18 acceptance captures are byte-identical to #428; existing bundle budgets remain unchanged.
- Actual root Chrome passes 22 native date fixtures, 100 adjacent boundary checks and four signed offsets. No observed import work or storage/network API effects; only owned fixture requests.
- Independent Node 22/24 runs each pass 1,500 critical-point oracle schedules (1,059 disconnected, 19 empty), 20 edge/bound, six cap and five no-partial-result controls. Independent Chrome passes 16 dates, six offsets and 4,699 finite membership checks.

Completeness is conditional on the provider honoring its contract; the omitted-transition negative control is retained. Native availability and all historical timezone data are not certified. Activation requires a separate reviewed policy for missing native capability, empty/complex dates, representative instants, truthful uncertainty and stale results.

Stacked on #428, exact source `30b41cd8f1a353cce0cee36bc76c1e9fa21b4c14`. Frozen patch SHA-256 `9854a47e9a2d60845cf023f4b12eb16f7defe8b4ca81083f1f6a4ec6d4667e78`. Durable author, independent and root evidence is under `docs/platform/evidence/local-date-intervals/`, with current decisions/status/plan/review linked in `docs/platform/`.

Exact-source Site Check 34201151004 passes all 14 jobs. READY preview dpl_GLVF1b21yYBFfMo8eWXfGAbMaxBr (https://zodiacs-e3j5fcv5g-zodiacsofficial.vercel.app), source65418003c07efc0c435ce1010e3c9ec05b478eb4, passes 13 existing-surface browser/API regression checks. The interval API remains inactive; these hosted checks do not claim caller activation. Temporary access was removed. This is a draft prerequisite, not caller activation, a production deployment, publication or external adoption. SDK #5's hold remains intact; the separately owned Astrofolio #416 workstream is excluded.

