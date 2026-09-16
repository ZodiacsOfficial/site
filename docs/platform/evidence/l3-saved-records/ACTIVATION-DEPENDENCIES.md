# Saved receipt lifecycle: inactive prerequisite

> Status 2026-09-14: this document describes the L3a prerequisite (#486) and
> the dependencies it named. The L3b/c candidate on the same branch addresses
> them (schema 3 admission generations instead of terminal barriers, the
> coordinator-derived capability, discovery before auto-bind, awaited erasure
> in every transition, explicit readmission and the complete UI); see
> [L3BC-README](L3BC-README.md). The text below is kept as the historical
> statement of the problem, not as the current state.

This slice integrates the retained #426 immutable SDK-envelope record and
owner-bound IndexedDB primitive, and strengthens the native database with durable
erasure barriers. No calculator, profile, account, or page caller is activated.
Importing the modules does not discover storage, create a guest identity, migrate
records, subscribe to authentication, open IndexedDB, or contact a service.

The callable persistence layer accepts an explicit application owner/epoch
policy. That policy is not authentication. Its tests cannot certify the existing
application's account lifecycle, because that application does not call it yet.

## Native erasure and its limits

Owner-targeted and device-wide erasure use content-free pending barriers followed
by terminal complete barriers in the same dedicated native database. Ordinary
record operations must observe the barrier in their transaction; an old handle
or another connection cannot recreate erased content by relying on an earlier
access check. Recovery is erase-only and does not provide a way to read private
records while normal authority is unavailable. Queued intent and confirmed
physical deletion are distinct outcomes.

The schema uses database version 2 without upgrading an existing version-1
database. Earlier inactive v1 data remains preserved and unsupported, rather
than silently migrated. Old v1 writers cannot open the new v2 database and bypass
its barriers. A future compatibility decision must explicitly cover preserved
v1 data; this slice supplies no automatic migration or deletion of that database.

Terminal barriers deliberately have no readmission API. New handles, renewed
authentication, or a repeated save must not implicitly remove one. Before active
saves can resume after erasure, a later protected lifecycle must define an
explicit user-authorized readmission action, a new generation, cross-tab fencing,
and the meaning of owner versus full-device readmission. Simply deleting a
tombstone would allow pre-erasure authority to become effective again.

## Existing authority to integrate

`src/layouts/Base.astro` installs the pre-hydration `zodiacsProfileAccess` reader
only when both account-v2 flags are enabled. Each full navigation begins locked.
Its predicate checks an active shared lease, an exact session grant, and matching
local owner metadata. Retained access also needs the matching retained-owner
marker. `src/islands/AccountProfileAccessBootstrap.tsx` owns that tab's shared Web
Lock, subscribes before reading the initial session, and synchronously revokes
access before evaluating each changed auth state. Its auth/access versions fence
late shared-lock acquisition and session completion.

`src/lib/hooks/useProfileAccessGeneration.ts` advances a UI generation on every
profile-access event. The receipt store needs an authoritative owner plus a
monotonic generation from this coordinator, established before asynchronous
callsite loading. The final integration must revoke all corresponding receipt
handles and scrub rendered private state at the same boundary. A matching owner
after A to B to A is not the original authority. Deferred imports, receipt
creation, reads, export preparation, and the final download click need the
captured owner/result/access generation checked before using their result.

When account v2 is disabled, `profileAccessAllowed()` intentionally permits the
legacy account-free profile product and the bootstrap is absent. That boolean
cannot authenticate a receipt owner. Activation must address this mode through
the established coordinator without tightening legacy read/write behavior or
creating an unrelated parallel authority manager. Malformed owner, retention,
storage, or session state must not fall back to a new guest identity.

## Discovery, handoff, retention, and cleanup

`hasAccountBoundLocalProfileData()` in
`src/lib/account-v2/profile-boundary.ts` currently checks five localStorage
surfaces. It does not see receipt-only guest data in the new database. The
bootstrap can therefore regard such a browser as empty and bind its legacy
profile automatically. Before activation, add an asynchronous pre-grant receipt
discovery/recovery check or a rigorously durable protocol; a best-effort
has-records flag cannot authorize this transition.

`inspectLocalAccountBoundary()` distinguishes explicit unowned-data import,
clear, or cancel from account-mismatch isolate, clear, or cancel. Receipt records
must remain in their own guest/account namespaces. Do not fold them into the
five-key legacy profile archive, infer ownership from matching birth input, or
silently import a guest vault when the legacy profile is imported. Discovery and
recovery need an explicit path that does not orphan preserved guest records.

`runExclusiveAccountProfileTransition()` revokes cooperating tabs before an
exclusive profile-owner mutation. The following callers must join receipt
revocation and durable cleanup before saves become active:

- `completeAccountBoundaryDecision()` and account isolation/clear;
- explicit retained versus remove-from-device sign-out in
  `AccountSyncV2Panel.onSignOut()`;
- active and inactive account deletion through
  `completeDeletedAccountLocalData()` and confirmed deletion recovery;
- full-device cleanup in `clearAllZodiacsDataFromDevice()`;
- involuntary sign-out, account switching, unmount, and a fresh navigation.

Explicit retention must keep the former account namespace and owner marker.
Involuntary sign-out must not become retained access. Inactive account A cleanup
must preserve active account B. Prefix-based local/session storage deletion does
not erase IndexedDB. Existing Living Chart clear requests provide a convention,
but their fire-and-forget completion must not be treated as proof of physical
receipt erasure. A pending or failed barrier/recovery must remain visible to the
coordinator and block unsafe access, without losing deletion recovery intent.

## Legacy compatibility and product requirements

Legacy profile saves retain their current ID/input deduplication, saved name and
creation timestamp, explicit self classification, capacity, deletion tombstones,
and cache behavior. Richer immutable SDK records remain separate from
`SavedChart`, profile replacement, legacy merge/upload, and the current v2 chart
wire. An abbreviated historical summary is not a full receipt and must remain
readable as legacy data. No richer receipt is projected back into that schema.

The future UI must provide explicit save, local discovery, exact SDK-envelope
export, delete, and recovery together with the protected lifecycle. Current
account export downloads remote account data and must not claim to include
these local records. A stale operation that may have committed must receive no
payload or success and must not trigger an automatic save retry. Corrupt,
unsupported, blocked, or unavailable storage must not appear as an empty list.

The focused inactivity guard inspects runtime import edges, checks that receipt
dependencies cannot reach legacy writers or another private database, observes
import-time side effects, and exercises actual legacy read/save/merge functions.
It establishes this slice's separation. Native erasure tests establish only the
callable native primitive's transaction contract. Actual auth, cross-tab UI,
guest handoff, retained sign-out, download, and readmission acceptance remain
required before activation. SDK release work, L4–L6, Astrofolio, and Zodia remain
outside this slice.
