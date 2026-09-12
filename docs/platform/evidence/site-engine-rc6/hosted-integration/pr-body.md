Historical timezone shifts of only seconds could be missed or mislabeled by minute-only wall-time matching, preventing truthful calculation receipts. Adopt the immutable engine 0.1.1-rc.6 archive with the matching site resolver precision correction. Existing UTC results remain stable in the retained counterexamples; gap/fold flags and receipt context now include the historical seconds.

The bounded source change is 13 reviewed files plus the standard generated daily manifest. Receipt-helper executable behavior is unchanged: inconsistent legacy context is still rejected, while corrected context can be exported from the original calculation. Current developer metadata links the real SDK source, archive and site evidence carrier; prior artifacts remain immutable. No unknown-time endpoint policy, account/storage behavior, design, navigation, Registry or Astrofolio source is changed.

Validation:
- Normal build, check (1,039 files; zero errors/warnings) and all 4,859 tests / 413 files pass.
- Actual Chrome passes 27 receipt groups, including all 16 historical downloads; 13 developer/API checks and 12 existing share cases pass.
- Independent source review passes 385 valid time cases and 41 actual receipt-helper controls on each of Node 22 and 24. All 23 installed package files match the archive.
- All 18 acceptance captures and the three affected chart outputs are byte-identical to #427. Existing macOS baseline-height failures are retained, without rebaselining or threshold changes. The complete static engine remains 23.3 KB under its unchanged 25 KB budget.
- An extra cross-runtime exact-equality assertion exposed runtime Math differences. Controlled replay of only Node's sin/cos/atan2 values reproduces the full Node chart in Chrome; same-runtime rc.5/rc.6 numerical output remains exact. Original failures, exact traces, measured limits and primary references are retained. No cross-runtime bit equality or general accuracy bound is claimed.

Stacked on #427 (`804c70309d2508e67e8462df526b5f9e71a112e9`). Root evidence carrier: `68412f16140f9986b11767d271eda6e14b6aba48`. SDK archive carrier: `51129a197cd3f2a2a8c966fb797ea4da1e147b3d`; archive SHA-256 `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e`.

Exact-source hosted CI and preview validation will be recorded separately. This is a draft candidate; SDK #5's do-not-merge/do-not-publish hold and required human numerical/legal review remain unresolved. Nothing is merged, npm-published or deployed to production, and no external adoption is claimed. The separate Astrofolio #416 release remains independent.

Durable evidence: `docs/platform/evidence/site-engine-rc6/`; program checkpoints: `docs/platform/{STATUS,PLAN,DECISIONS,EVIDENCE,REVIEW}.md`.
