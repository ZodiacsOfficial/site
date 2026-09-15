# L3b/c plan and support matrix (2026-09-14)

Working branch `claude/eager-ramanujan-razak3` starts from main `74ae0f03` with
draft #486 (`99d22482`, L3a) merged verbatim. Its 60 unit tests and 20 native
Chromium groups pass unchanged on this base (evidence: `l3a-on-main/`).
Historical L3a evidence remains source-specific to `99d22482`.

## Product journey

Calculate a chart → explicit "Keep this calculation on this device" → find it
under Profile → "Calculation records on this device" → download the exact
calculation file → remove one record, or remove all records for this owner or
for the whole device → understand every failure state. Records are the exact
calculation file bytes (`NatalEnvelope` JSON) the calculator already offers for
download; they stay on this device only and never enter account sync. Legacy
saved charts (`zodiacs.profile.v1`), Living Chart moments (`zodiacs-living-chart-v1`)
and calculation records (`zodiacs-saved-natal-v1`) are three separate stores;
nothing is migrated, relabeled or reconstructed between them.

## Slices

| Slice | Scope | Activation |
| --- | --- | --- |
| L3b.1 | Native adapter v3: `admissions` rows with durable generations replace terminal `erasures`; target-bound two-phase erasure (intent → purge+acknowledge); explicit admission/readmission by compare-and-swap; capacity/exhaustion fail closed; fresh-v3 only, v1/v2/future refused intact. Native drive extended. | Inactive (no runtime caller). |
| L3b.2 | Strict receipt capability derived from the existing coordinator (grant + owner markers + sync session), synchronous evaluation fencing, async discovery/recovery before grant use, guest-boundary decision, awaited erasure inside existing exclusive transitions. | Inactive (no page/island mounts it). |
| L3c | Save action on the chart result, records inventory/export/delete on Profile, recovery/readmission/guest-return states, synthetic UI drives. | Behind `PUBLIC_SAVED_RECORDS_ENABLED=1` (committed state OFF). |

## Support matrix (first release)

| Mode | Owner key | Rights | Discovery / recovery |
| --- | --- | --- | --- |
| Account-sync-v2 off (today's production): no owner/retained marker | `guest:<device uuid>` (created at first explicit save) | save, list, export, delete, erase this device's records | recovery of pending erasure on Profile open; markers present → unavailable |
| v2 on, signed out, unowned browser | `guest:<uuid>` | same as above | same |
| v2 on, signed in as A, browser bound to A | `account:A` | save, list, export, delete, erase A's records; sign-out "clear all" erases the device | before auto-bind, guest records force keep / erase / cancel |
| v2 on, signed out after explicit retained sign-out | `account:A` (retained) | list, export, delete only; no new saves; "use this device as a guest instead" switches to the guest scope | retained records stay in A's namespace, never re-keyed |
| v2 on, involuntary sign-out, mismatch, blocked boundary, decision pending | none | locked (honest locked state) | — |
| Missing IndexedDB, `indexedDB.databases`, Web Locks (v2 on), denied storage, blocked upgrade, incompatible database, corrupt admission rows, >1000 owners | none | unavailable with a specific reason; legacy profile unchanged | — |

Named runtime targets: current Chromium (native drives), Firefox ≥ 126 and
Safari ≥ 16 by feature detection; no universal-support claim. Multiple tabs are
fenced by IndexedDB transaction serialization plus durable generations; Web
Locks are used only where the existing account coordinator already uses them.

## Invariants kept, mechanisms changed

- One coordinator: the bootstrap grant remains the authority; the receipt
  capability is a strict derived reader plus durable admission generations.
  `profileAccessAllowed() === true` is never receipt authority.
- Terminal `complete` markers become `erased` admission rows with a generation;
  readmission rotates the generation by compare-and-swap inside the first
  explicit save (no separate chore, no automatic readmission).
- The erasure journal is the admission row itself (`pending` = intent
  accepted, `erased` = purge confirmed) inside IndexedDB, immune to the
  localStorage prefix loop. Legacy localStorage cleanup is not journaled: it
  runs synchronously after the receipt intent commits and its outcome is
  reported separately. Recovery finishes only committed receipt intents.
- Guest namespace creation needs no exclusive Web Lock: overlapping
  IndexedDB readwrite transactions are serialized, so the admission
  compare-and-swap is the durable lock (proved natively).
- No guest-to-account transfer, no autosave, no dedup by birth input, no
  legacy migration. Uncertain saves are reconciled through the inventory.
