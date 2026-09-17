# Rolling back saved calculation records

Two independent rollbacks exist. They are not interchangeable, and the flag one
is the one to reach for first.

## 1. Flag rollback — unset `PUBLIC_SAVED_RECORDS_ENABLED`

This is the cheap, reversible control. Remove the variable from the Vercel
project (or set it to anything other than `1`) and redeploy.

What a visitor gets afterwards:

- No "Keep this calculation on this device" button anywhere.
- No new records can be written. The store refuses `create` for the retained-data
  rights the flag-off build uses, so this is enforced below the UI.
- Records kept while the feature was on stay **findable, exportable byte-for-byte
  and removable** under Profile, behind a line that says keeping new calculations
  is not offered at the moment.
- A removal interrupted after its durable intent is still finished on the next
  visit, because recovery no longer depends on the flag.
- Destructive account actions keep their promise: "Sign out · clear all Zodiacs
  data", the boundary clear and confirmed account deletion really do erase the
  records they say they erase, instead of reporting a removal that did not happen.
- Remove and Remove all keep their confirmation behaviour: arming is announced
  and expires, and only a deliberate second activation removes anything.
- Signing in on a browser that still holds guest records asks for the hand-off
  decision instead of binding over them silently.
- A device that never had the feature on is untouched: enumerating databases
  creates nothing, the panel renders nothing, and no database is created.

Re-enabling later shows exactly what the rolled-back build left behind. Nothing
is stranded and nothing that was removed comes back.

This is gated in CI by `npm run test:saved-records:rollback`, which builds the
same source four times (off, on, off, on) and drives one persistent browser
profile through the whole sequence.

### Why the flag cannot gate cleanup

The first implementation gated *everything* on the flag, including discovery,
recovery and erasure. An adversarial review reproduced the consequence in a real
browser: after a rollback the records survived while "clear all Zodiacs data"
reported success, confirmed account deletion printed that this account's charts
in this browser were deleted, and an interrupted removal sat in `pending`
indefinitely. The flag now gates writing and the record surfaces only.

## 2. Code rollback — revert the merge

Use this only if the feature's code itself is implicated, not merely its flag,
and only after reading the version floor in section 3.

**Reverting #490 removes the cleanup path along with the feature.** The revert
takes the tree below `52ae6eeb`, so a visitor who already kept records is left
with a database no part of the product can list, export or delete, and with
destructive account actions that report success without touching it. If any
records may exist, the flag rollback in section 1 is the correct instrument and
this one is not; if the code itself must go, section 3's third case applies and
the remediation comes first.

`git revert -m 1 <merge commit>` alone is **not sufficient**: it restores the
previous `.github/phase1-scope-allowance.json`, whose `baseCommit` and
`protectedPaths` no longer describe the push being made, and the
`Phase 1 protected-scope guard` step then fails on every subsequent push to
main — precisely during the incident that prompted the rollback.

The revert commit must therefore carry a fresh allowance in the same commit:

1. `git revert -n -m 1 <merge commit>`
2. Rewrite `.github/phase1-scope-allowance.json` with
   - a new `id` (for example `l3bc-revert-<date>`),
   - `baseCommit` set to the SHA the push will be measured against (the merge
     commit for a push to main; the PR base tip for a pull request),
   - `protectedPaths` listing exactly the eight localized pages the revert
     touches: `src/pages/{es,fr,it,pt}/birth-chart/index.astro` and
     `src/pages/{es,fr,it,pt}/profile/index.astro`,
   - an `authorization` sentence naming the revert.
3. Verify locally before pushing:
   `PHASE1_SCOPE_BASE=<that SHA> node scripts/phase1-scope-guard.mjs`
4. Commit and push the revert and the allowance together.

A code rollback does not restore records that a committed removal already
purged, and it leaves any database on a visitor's device in place — unreachable,
for as long as the revert is deployed. Prefer the flag rollback whenever the
question is "should this be switched off".

## 3. Deployment rollback — and the version floor it must respect

Promoting an older production deployment reverts the served artifact without
touching the repository, and it is the fastest way to undo a bad release. It is
**not** unconditionally safe here, because the ability to find, export, recover
and remove records is a property of the code, not of the flag.

**The floor is `52ae6eeb2bfc0e5d2697e7a50205025b3f5d65b9`**, the merge of #490.
`savedRecordsRetainedOnDevice()` and the retained-data mode first appear in
`f34479c1` inside that pull request; the symbol is absent from
`src/lib/profile/saved-record-flags.ts` at `7fd42661`, the main commit before it.

| Target | Once records exist on a device |
| --- | --- |
| Unset the flag on a build at or after `52ae6eeb` | **Safe.** Discovery, export, recovery and deletion all keep working. |
| Deploy any commit at or after `52ae6eeb` | **Safe.** The cleanup path travels with the code. |
| Promote a deployment built before `52ae6eeb` | **Not a rollback. Do not do this.** |

A pre-`52ae6eeb` build has no records panel and no flag module. Records already
written stay in IndexedDB with no surface anywhere in the product that can list,
export or delete them, and "Sign out · clear all Zodiacs data", the boundary
clear and confirmed account deletion each report success without removing them —
precisely the defect #490 was merged to fix. Reverting to it during an incident
would reintroduce that defect on devices that already hold data.

### Choosing a target during an incident

1. **If `PUBLIC_SAVED_RECORDS_ENABLED` has never been `1` in production**, no
   records can exist on any visitor's device, and a pre-`52ae6eeb` deployment is
   an ordinary rollback target like any other.
2. **Once it has been on, even briefly**, treat `52ae6eeb` as a hard floor.
   Unset the flag and redeploy, or promote a deployment built from a commit at or
   after the floor. `dpl_CZsZBKawNkeiKMuF1NwJSWwsdsAS` (main `52ae6eeb`, flag
   unset) is the nearest such target and the correct one to reach for.
3. **If the incident genuinely requires code older than the floor**, that needs a
   separately validated remediation before the revert — for example shipping a
   minimal cleanup-capable build first, giving visitors a window to export and
   erase, and only then reverting. Never erase a visitor's records to make a
   rollback simpler; the point of the floor is that their data stays theirs to
   remove.

Follow any deployment rollback with the matching repository change, so the two
agree.
