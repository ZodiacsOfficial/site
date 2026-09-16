# L3b/c: protected local calculation records (candidate, inactive by flag)

Branch `claude/eager-ramanujan-razak3` from main `74ae0f03` with draft #486
(`99d22482`, L3a) merged verbatim. Commits in order: L3a merge; plan
(`bcce493d`); L3b.1 (`650768a9`); L3b.2 (`f1efe17f`); usability fixes
(`a5b1e5e2`, separate deliverable); review-driven hardening of the store,
capability and account boundary (`35da3485`); L3c UI, journey drive and
CI job (`b5666134`). The historical L3a evidence in `README.md`, `HOSTED.md`,
`LOCAL-PREVIEW.md` and `PREVIEW.md` stays pinned to `99d22482` and is not
reused as evidence for this candidate. The adversarial review and every
disposition are in [REVIEW-2026-09-14.md](REVIEW-2026-09-14.md).

## What a visitor gets (only when `PUBLIC_SAVED_RECORDS_ENABLED=1` at build)

1. On a full birth-chart result, under "More ways to use this chart", a button
   "Keep this calculation on this device" beside the existing receipt download.
   It stays disabled until the record scope is known. The stored bytes are
   exactly the calculation receipt the download offers; the button reads
   "Kept ✓" with the line "Kept on this device. Find it under Profile" only
   when the stored bytes equal those bytes. A line says whose scope the record
   belongs to: this device only (guest), this device for the signed-in account
   (never synced), or read-only while signed out with retained access. A keep
   that may or may not have committed is stated and never retried; a keep
   refused because another tab changed the records says nothing was stored
   and offers an explicit second keep. The label is derived from the
   calculation, never copied from a saved chart's name.
2. Under Profile, "Calculation records on this device": each record with its
   date, time (or "time unknown"), zone and when it was kept; Download (exact
   bytes, `zodiacs-calculation-record-<date>.json`); Remove (arm, then confirm);
   Remove all of these records (arm, then confirm; the listed namespace only).
   An armed control is unmistakable and short-lived: it fills, announces what it
   is waiting for and how to cancel, and returns to its safe label on Escape, on
   a pointer down anywhere else, on losing focus, or after twelve seconds. A
   removal that happens is said, and the keyboard stays inside the panel.
   Signed in, the panel names guest records kept before sign-in that stay on
   the device unlisted, and that "Sign out · clear all Zodiacs data" removes
   them. Empty, erased, locked, unavailable, unsupported-storage and
   unfinished-removal states each say what they are, scoped to the listed
   records; an unfinished removal is finished on the next visit.
3. Signed out with retained account access: records stay readable, keeping is
   refused, and "Use this device as a guest instead" switches only the record
   scope for this tab; "Show the account's records again" switches back.
4. Signing in to a browser that holds guest records shows the existing hand-off
   choice (keep as guest records, hidden while signed in; clear; cancel) instead
   of binding silently. "Sign out · clear all Zodiacs data" removes every record
   namespace on the device; confirmed account deletion with "remove from this
   browser" removes that account's records only.

With the flag unset (committed state) nothing above renders, no database is
created, and the account bootstrap behaves exactly as on main.

## Support matrix as built

| Mode | Namespace | Rights | How it is established |
| --- | --- | --- | --- |
| Account-sync-v2 off (production today) | `guest:<device uuid>` | keep, find, download, remove, remove all | no `local-owner`/`retained-owner` marker present; markers from an account-capable build make records unavailable, never guest |
| v2 on, signed out, unowned browser | `guest:<uuid>` | same | coordinator grant `unowned` and `profileAccessAllowed()` |
| v2 on, signed in as A, browser bound to A | `account:A` | same | grant `account` matching the owner marker |
| v2 on, explicitly retained sign-out | `account:A` | find, download, remove, remove all; no keep | grant `retained` plus matching retention marker; guest view is a per-tab explicit selection |
| Involuntary sign-out, mismatch, decision pending, no grant | none | locked | no grant, or guest records pending a hand-off decision |
| No IndexedDB / `indexedDB.databases()`, denied storage, blocked upgrade, v1/v2/future or malformed database, >1000 owner rows, unfinished removal | none | unavailable / unsupported / pending, each stated | fail-closed reads; legacy saved charts unaffected. Unsupported storage (no discovery API or an unreadable schema) cannot hold records this client kept, so it never blocks binding an account; a pending or failed discovery on a supported runtime does |

Runtime targets: current Chromium (all drives) and Firefox 151 (native
drive and representative lifecycle checks, `ENGINE=firefox`), browsers with
IndexedDB, `indexedDB.databases()` and (in v2 mode) Web Locks. No wider claim
is made.

## Mechanism decisions and deviations from the handoff proposal

- Admission rows `{target, generation, status}` replace terminal erasure
  markers. Readmission is a compare-and-swap inside the first explicit keep
  (consent is the click, explained beforehand when a set was erased); no
  separate readmission chore, no automatic readmission.
- The erasure journal is the admission row in IndexedDB (`pending` = intent
  accepted, `erased` = purge acknowledged). Legacy localStorage cleanup is not
  journaled: the record intent commits first, the existing synchronous legacy
  cleanup follows, and a failure before intent stops the action with nothing
  removed. Rationale: a crash between the two leaves the user still signed in
  with legacy data intact and records fenced until recovery finishes; no
  cross-owner exposure is possible, and replaying legacy cleanup from a
  journal would add the exact "old A journal erases B" risk the handoff warns about.
- Guest namespace creation needs no exclusive Web Lock: IndexedDB serializes
  overlapping readwrite transactions, so the compare-and-swap is the durable
  lock (native group "concurrent readmissions compare-and-swap").
- Guest view keeps the legacy retained access the user chose at sign-out and
  switches only the record scope, per tab. Locking legacy charts behind a new
  grant mode would protect nothing (the same person can switch back without
  authenticating) and would add a fourth grant mode to the pre-hydration reader.
- Erasure tickets are pinned to the observed generation and authorized by the
  caller's own transition epoch, not by the access evaluation the transition
  revokes. Owner intents (handles and tickets) are also pinned to the device
  generation they were observed under: owner rows are recreated after every
  device erasure, so an intent from before a device cycle can never reach the
  same owner string readmitted after it. A device ticket is not pinned to
  owner admissions made after it was prepared; a whole-device clear is what
  the visitor asked for. An observed absence is not authority to skip: it is
  re-checked under the exclusive transition and a namespace admitted in
  between refuses completion (2026-09-15 hardening).
- Read-only authority (retained sign-out) is enforced by the store, which
  refuses `create`; the UI only mirrors it. A per-tab guest-view selection is
  consumed by the next account grant.
- Record-scope changes are announced to other tabs through a localStorage key
  (erasure, every confirmed keep, every committed single removal); the
  same-tab evaluation counter is unaffected by the tab's own admission. A
  calculator withdraws "Kept" when its record is removed elsewhere, and the
  records panel binds removal feedback to the namespace it describes
  (2026-09-15 hardening). Only a queued write can report
  "may have committed"; the first failure cause is kept when a transaction is
  aborted; a browser-forced connection close is treated like a version change.

## Verification (this checkout, Node 22.22.2, Chromium 141 via playwright-core 1.61.1)

- Unit: `saved-record-store.test.ts` 52, `saved-record-access.test.ts` 15,
  `AccountProfileAccessBootstrap.test.ts` 10, `saved-record-inactive.test.ts` 4
  (explicit caller allowlist), `SavedRecordsPanel.test.tsx` 3 (every locale
  carries its own text), `AccountSyncV2Panel.test.tsx` 13,
  `chart-handoff.test.ts` 10, plus the retained calculator suites; the full
  suite is recorded in STATUS.
- Native: `tests/saved-natal-storage-drive.mjs` 30 groups
  (`native-result.json`): intent/purge/acknowledgment aborts with reload,
  cross-page fencing, concurrent readmission, stale acknowledgment, 25
  erase/readmit cycles with bounded rows, exhaustion and capacity, one guest
  per device, v1/v2/v4/wrong-shape refusal, old v2 client VersionError,
  blocked upgrade from another page, device-cycle fence for device-era
  handles and pre-wipe tickets, revocation while a write is queued,
  acknowledgment abort recovered after reload, device readmission racing a
  pre-wipe owner erasure.
- Journey: `tests/saved-records-lifecycle-drive.mjs` 12 checks on a flag-on
  build (`lifecycle-result.json`): no database before an explicit keep and
  legacy saved-chart bytes unchanged by keep/remove; exact-byte download
  equality; remove all, erased state across reload, explicit readmission;
  uncertain keep; interrupted removal finished on the next visit; removal in
  another tab seen by an open calculator; two tabs keeping at once; simulated
  v2 guest/account/retained/guest-view scopes with hidden guest records named,
  retained download and remove, A→B→A staleness; locked; blocked storage;
  missing `indexedDB.databases()`; schema-2 refusal.
- CI: the existing native step plus a new flag-on job
  `saved-records-lifecycle-drive` in `site-check.yml`.
- 2026-09-16: `tests/saved-records-rollback.mjs` builds this source four times
  (off → on → off → on) and drives one persistent browser profile through the
  whole sequence (`rollback-result.json`); the lifecycle drive gained the
  armed-confirm check. Re-run on the reviewed candidate: 5,320 unit tests, 31
  native groups, 17 lifecycle checks in Chromium and 17 in Firefox 151, 6
  account-coordinator journeys, 4 rollback phases, 18 of 18 Phase 1 captures,
  and the flag-off build within its bundle budgets.
- 2026-09-15 hardening: 31 native groups in Chromium and Firefox, 16
  lifecycle checks, and the account-coordinator drive
  `tests/saved-records-account-drive.mjs` (real bootstrap and panel, fixture
  auth origin, its own CI job); numbers and dispositions in
  [HARDENING-2026-09-15](HARDENING-2026-09-15.md).

## Compatibility and rollback

- New code, new database: fresh schema 3 only. The build flag gates writing and
  the record surfaces, never cleanup: a flag-off build still finds, exports and
  removes records kept while the feature was on, still finishes an interrupted
  removal, still honours destructive account actions, and still refuses to bind
  an account over a browser that holds records. It never writes, so an older
  client cannot overwrite or corrupt newer rows. A device that never had the
  feature on creates no database. The full procedure and the reasoning behind it
  are in [ROLLBACK.md](ROLLBACK.md); the sequence is gated by
  `npm run test:saved-records:rollback`. Rollback never restores records that a
  committed removal already purged.
- The unreleased schema 2 from L3a tests and any v1 database are refused
  intact (native and journey drives), with the "unsupported" state shown.
- A blocked upgrade from another page closes the live connection; the older
  page's next operation opens a fresh connection (and succeeds when the schema
  is unchanged) or fails closed with `stale`; it never writes through the
  closed connection.
