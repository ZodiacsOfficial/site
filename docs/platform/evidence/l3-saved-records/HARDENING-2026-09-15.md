# L3 deletion and activation hardening (2026-09-15)

Follow-up on the L3b/c candidate in draft
[#490](https://github.com/ZodiacsOfficial/site/pull/490), continuing from
`8e340b97` with main `9c9e232f` merged in (automated daily data only). Five
findings from the activation review, each closed with a code change and a
test that reproduces the original gap, or recorded as still unverified. The
flag `PUBLIC_SAVED_RECORDS_ENABLED` stays unset; nothing is merged, deployed
or activated. Every identity and birth input in the drives is synthetic; no
request leaves loopback.

Source candidate: `9c8bf67b` carries every `src/` change of this pass (the
later commits add drives, the CI job, captures and this evidence; STATUS.md
and the pull request name the final head).

## Findings

| # | Finding | Status | Change | Evidence |
| --- | --- | --- | --- | --- |
| 1 | An enabled records module that failed to load was treated like a disabled feature: `planSavedRecordErasure` returned `none`, so sign-out with "clear all Zodiacs data", the boundary clear and confirmed deletion skipped the records step and could report a whole-device removal that left records behind. | Fixed, tested | `loadSavedRecordAccess` distinguishes `disabled` (flag off) from `unavailable` (import failed with the flag on). An unavailable module yields a `blocked` plan; a blocked plan that ever reached a transition returns `failed`. In `initialize`, an unavailable module counts as unavailable discovery, so an empty-looking browser is not bound. Genuinely disabled behaviour is unchanged (`none`, skip). | `AccountSyncV2Panel.test.tsx`: the real loader with the flag off → `none`; flag on with a failed dynamic import → `blocked`; every destructive handler stops on `blocked` and on a `failed` outcome (source assertions). Account drive check 5: the real `onSignOut(true)` with the records chunk refused from the first request shows "…could not be prepared for removal safely…Sign-out was stopped", does not reload, sends no logout request, and keeps the session, the owner marker and the record. |
| 2 | `prepareSavedRecordErasure` reported absence before the exclusive transition and the panel turned it into an unconditional skip: a keep in another tab between the observation and the transition survived a "clear all Zodiacs data". | Fixed, tested | `confirmSavedRecordsAbsent(target, authorized)` re-checks the absence under the transition (nothing created, nothing admitted, nothing retargeted): a namespace admitted in between is `stale`, a pending intent is `erasure-pending`, an erased row or a still-missing row is `absent`. The panel carries an observed absence as an `absent` plan and refuses completion on anything but a confirmed absence; generation-pinned tickets are unchanged. A fresh attempt observes the new rows and erases exactly them. | `saved-record-access.test.ts`: deterministic T1 observe → T2 keep elsewhere → T3 refuse schedule, device/guest/account targets, erased and pending rows, lost authority. Native group 31 (`saved-natal-storage-drive.mjs`, real IndexedDB, Chromium and Firefox): the same schedule against the bundled production modules, refusal removes nothing, the fresh ticket pins generation 1 and erases it. Account drive check 6: the real panel's observation is stalled while the calculator tab keeps a record; the transition refuses, the record survives, the session stays, and the next clear-all removes it. |
| 3 | A single-record removal was not announced to other tabs: open inventories kept listing the record, its download button stayed, and an open calculator kept saying "Kept". | Fixed, tested | `SavedRecordsPanel.remove` broadcasts a removal that committed or may have committed; the calculator records the kept record's id and, on a same-namespace reopen, withdraws "Kept" once the store reads the record as absent (uncertain reads change nothing; no retry, no re-creation); every confirmed keep is broadcast too. | Lifecycle check "a single removal in another tab reaches open inventories and the calculator without reload": three tabs; the other inventory shows no record and no download button; the calculator returns to idle without an erased note; keeping again propagates to both inventories. |
| 4 | Removal feedback outlived its scope: invalidation and reopen never cleared `message`, and `removeAll` published its result after the await without checking that the same namespace was still shown, so "All listed records were removed" could appear over another account's listing. | Fixed, tested | Feedback is bound to the owner namespace it describes. A reopen that settles on a different namespace, or on none (locked, disabled), drops it; a reopen that keeps the namespace keeps it, including reopens that fail at the storage level (an unfinished removal stays reported). A result arriving while a reopen is in flight is bound and reconciled by that reopen; one arriving after the tab settled on another namespace is not said. | Lifecycle check "removal feedback stays with the namespace that asked for it" (ownership moves to B the moment A's purge commits: B's inventory carries no message; back on A the erased state shows and the dropped feedback is not resurrected). Same-scope completion feedback is still asserted by the existing remove-all and interrupted-removal checks. Account drive check 4: a real cross-tab sign-in as B while A's removal is pending locks the tab, shows the hand-off decision, and carries no removal feedback. |
| 5 | Browser coverage gaps: no journey through the real `AccountProfileAccessBootstrap`/`AccountSyncV2Panel`, no unknown-time keep, no full-capacity refusal, Chromium only. | Fixed, tested (see limits) | New `tests/saved-records-account-drive.mjs` on a fixture build with the account coordinator built in and a synthetic auth origin: the real bootstrap, panel, pre-hydration reader, Web Locks leases and exclusive transitions run unchanged; only the auth origin and the account API are answered by the drive. Lifecycle checks added for an unknown-time keep with exact-byte download and for the 40-record limit. `ENGINE=firefox` runs the native drive and the lifecycle drive in a Playwright-managed Firefox. | Account drive: bind + keep + retained sign-out (read-only, exact bytes); guest record before sign-in → hand-off decision → keep for A → "clear all Zodiacs data" purges both namespaces and every `zodiacs` key; confirmed account deletion with browser removal erases only A's namespace, guest records stay; account change during a pending removal; module load failure (finding 1); admitted-in-between refusal (finding 2). Firefox: native 31/31; lifecycle "keep, find, exact download, remove, reload" and "single removal" checks. Limits: the account drive ran in Chromium only; hosted runs are pending until the checks on the candidate complete. |

Observed and left as is: after a refused destructive transition (findings 1
and 2) the tab's reader lease stays revoked until the next navigation or auth
change, so the records panel reads "locked" until the page is reloaded. This
is the pre-existing behaviour of every failed exclusive transition and is not
a data-safety issue; it is recorded here so it is not mistaken for one.

## Verification

| Item | Result |
| --- | --- |
| Source candidate | `9c8bf67b` (`src/` unchanged afterwards) |
| Unit (targeted while fixing) | `saved-record-access.test.ts` 16, `saved-record-store.test.ts` 52, `AccountSyncV2Panel.test.tsx` 16, `SavedRecordsPanel.test.tsx` 3, `saved-record-inactive.test.ts` 4 |
| Full unit suite (final source, flag-off build in place) | 5317 of 5317 tests in 430 files |
| Native storage drive, Chromium 141 | 31 of 31 (`native-result.json`) |
| Native storage drive, Firefox 151 (`ENGINE=firefox`) | 31 of 31 (`native-firefox-result.json`) |
| Lifecycle drive, flag-on build, Chromium | 16 of 16 (`lifecycle-result.json`) |
| Lifecycle drive, Firefox 151, representative checks | 2 of 2: "keep, find, exact download, remove, reload" and "a single removal in another tab reaches open inventories and the calculator" (`lifecycle-firefox-result.json`) |
| Account-coordinator drive, fixture build, Chromium | 6 of 6 (`account-result.json`) |
| Flag-off build, typecheck, check-dist, scope guard, Phase 1 captures | Build within bundle budgets; `astro check` 0 errors, 0 warnings; check-dist, consumer-boundary and footer checks pass; scope guard passes with the allowance pinned to main `9c9e232f`; 18 of 18 captures regenerated on the final source |
| Hosted checks | On the preceding heads: the flag-on lifecycle job 16 of 16 and the account-coordinator job 6 of 6 on its first hosted run; Build & Check was red only on a stale capture digest, corrected by the regenerated manifest (`cfd79265`). The run on the final head is the remaining hosted gate; the pull request checks carry its outcome. |

Fixture builds used locally: `PUBLIC_SAVED_RECORDS_ENABLED=1` for the
lifecycle drive; that plus `PUBLIC_ACCOUNT_SYNC_V2_ENABLED=1`,
`PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK=1`, `PUBLIC_SUPABASE_URL=https://saved-records-test.supabase.co`
and a fixture publishable key for the account drive (the same values the CI
job `saved-records-account-drive` sets). No hosted preview exists: the
Vercel production-only policy is unchanged, so hosted verification of these
journeys is the CI job, not a deployed URL.

## Remaining activation gates

1. Hosted checks passing on the candidate head, including the two flag-on
   drive jobs.
2. Human review of #490.
3. The owner's flag decision (`PUBLIC_SAVED_RECORDS_ENABLED=1` in a
   production build), separate from the merge.
4. A hosted preview, if wanted, needs an owner decision under the Vercel
   production-only policy; nothing here changes that policy.

## Usability improvements: independent reviewability

The usability fixes can be reviewed and released without the records
feature. Their complete diff is commit `a5b1e5e2` (chart hand-off, FAQ copy,
Today chart-source line, Living Chart copy, Developers navigation, Registry
bridge placement, keyboard focus, Virgo Moon wording, plus their evidence under
`docs/platform/evidence/usability-2026-09-14/`) together with the Today
refinements in `8e340b97` (`src/pages/today/index.astro`,
`src/islands/today/TodayBrief.tsx`, `src/islands/today/TodayBrief.loading.test.ts`
and the Phase 1 capture manifest). The other files in `8e340b97`
(`calculator-receipt.ts`, `saved-record-access.ts`, the lifecycle drive, the
workflow) belong to the records feature. Nothing in this hardening pass
touches the usability files.

## Draft #486 overlap

This branch contains #486's commit `99d22482` (L3a) verbatim as its first
commit. If #490 merges, #486 must be closed without merging (GitHub will show
it as already merged, and merging it separately would be a second landing of
the same change); if #486 merges first, #490 carries the same commit and
merges on top without conflict. Never merge both as separate changes.
