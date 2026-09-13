# C02 house compatibility evidence — account/storage changes deferred

The accountable integrator selected an additive natal receipt codec as the next implementation slice. This record preserves the preceding compatibility investigation; its account payload, storage, downgrade and rollout alternatives are proposals, not implemented or adopted protocols. Account sync v1 and local profile storage remain unchanged by the selected slice. No legacy requested-house intent is inferred or backfilled.

The proof below uses synthetic local inputs and makes no account, storage or network request. The review separately consulted public Supabase documentation; it did not query a live database or account. This is model-assisted technical review, not human or practitioner review.

Durable executed results and the exact probe source are in [c02-house-compatibility.json](c02-house-compatibility.json). Source file hashes and the observed site commit are included there. Earlier scratch paths identify session artifacts and are not published dependencies.

---

# Requested / actual house systems: compatibility boundary

Read-only review of actual site source after the civil-input fix, 2026-09-07. No repository, database, account, access-policy or source changes. Synthetic local probes are in `compatibility-boundary.ts/json/log`, supplementing `reproduction.json` and `intent-counterexample.json`.

## Decisive result

A single-field, transparent read/write round trip through unchanged old clients cannot preserve both requested Placidus and actual Whole Sign. The new pure-function probe proves that a fallback re-save and a deliberate switch to Whole produce identical old upload objects, canonical plaintext bytes and mutation fingerprints. The server cannot distinguish them safely. Neither "always preserve the old request" nor "always replace it with the incoming actual system" is correct for both cases.

Also confirmed against actual parsers:

- Extra birth or derived fields are rejected at the account PUT boundary.
- The v1 canonical serializer drops extra birth/derived fields.
- An extra field in the decrypted ready projection is rejected by the browser.
- A new private-payload schema is rejected by the current v1 parser.

The original one-line normalization of remote-chart.ts remains withdrawn. A local optional field alone is groundwork, not completion of the portable requested/actual contract.

## Smallest coherent semantic model

Keep the old enum readable; add an explicit request record and an explicit actual result. A workable local shape is an optional top-level `houseSystemRequest: { system: HouseSystem, provenance: 'recorded-request' | 'legacy-replay' }` plus `summary.actualHouseSystem?: HouseSystem | null`.

- New explicit calculations record the original input request before any fallback. Actual comes from `chart.houses?.system ?? null`, not `chart.input.houseSystem`. Null means no houses were calculated, such as unknown time; absent means an old/unverified result. Those states are not interchangeable.
- On old records, absence of the request record means original intent is unknown. When a new client must replay, use the old summary setting as its compatibility fallback and record `legacy-replay`, not recovered user intent. Capture that fallback before replacing the old render summary.
- Preserve `summary.houseSystem` as a compatibility enum. New code must use a shared accessor for requested/replay input and a separate accessor for actual/unverified output. Do not relabel legacy cached output as current or manufacture actual results when recomputation fails.
- Explicit user selection makes the new request recorded. A settings default or inferred polar flag must not silently become historical user intent.
- Record identity must distinguish explicitly requested Placidus versus Whole at the same polar birth even though their resulting cusps match. Updating an existing chart ID remains an update; do not bulk re-key old records or merge two explicit requests on the basis of actual houses.

This shape is illustrative but sufficiently small to implement; the essential contract is separate request value/provenance, actual value/applicability, and retained legacy readability. A generic receipt redesign is not required for this bounded issue.

## Feasible implementation alternatives

### 1. Local model and adapter preparation only

Implement the shared semantic accessors, explicit new-save fields and requested/actual tests in an isolated patch. New clients can preserve local request intent and show truthful computed results. Leave account upload/restore behavior unchanged until its versioned path is ready, and clearly label this partial implementation.

This does **not** satisfy cross-device or old-client round trips. Existing account serialization strips the new local fields. Old calculator code also reconstructs an entire SavedChart in commitSave and drops fields it does not know. Therefore do not advertise portable preservation, silently upload new richer records through v1, or "fix" the remote single field independently.

### 2. Recommended coherent delivery: versioned local record plus versioned private payload/projection

Add a distinct canonical private-chart payload version with the request/provenance and actual fields. Keep existing v1 parser, serializer and pinned byte/hash behavior intact. The new parser accepts both versions explicitly, not arbitrary schema widening. New private payloads must have exact-key validation, the same byte limits and the same privacy boundary.

Use an explicit client capability/version on chart GET/PUT to choose the representation. Existing v1 requests and old v1 encrypted records must continue to work unchanged. For richer records, an incapable old client must receive a safe update-required response or a defined read-only projection; it must not silently downgrade the cloud source. Do not pass the extra fields to an unchanged strict v1 decoder.

For old writes targeting a richer current record, reject the potentially destructive downgrade. Do not guess intent from matching birth/positions. Preserve legitimate replay of already completed v1 mutations: the database deliberately checks mutation identity **before** current revision. An unconditional server preflight rejection would change that behavior.

The current database stores an opaque encrypted plaintext and has no house-system column, so storing a new plaintext schema does not itself require a new database table, RLS change or encryption-envelope format. A server-only downgrade guard is feasible with the existing owner/device/consent-gated chart GET plus the existing atomic baseRevision compare-and-swap: inspect the current payload version, reject a new v1 write when its baseRevision equals a richer current revision, and let stale-base requests reach the RPC's replay/conflict check. Monotonically increasing revisions prevent such stale-base calls from overwriting the current record. This requires explicit race/replay tests and a server-first rollout; it is a proposed design, not verified implementation. If this proof cannot be maintained for every write route, move the guard into an atomic version-aware RPC as a separately reviewed database change.

Same-browser old tabs are a second boundary: current `zodiacs.profile.v1` is read and written wholesale by old code. Additive metadata is preserved by untouched JSON round trips, but old recompute/save drops it. A hard preservation guarantee therefore also needs a version-owned local record store/namespace with explicit one-way legacy import and no automatic downgrade overwrite, or a declared supported-client cutoff. Merely adding an optional field to the same key does not solve that problem. This is a technical storage/access/deletion audit dependency, not permission to change account gates casually.

### 3. Rejected shortcut: optional fields inside unchanged v1 or server sidecar inference

Unchanged v1 parsers reject those fields; weakening exact-key checks sacrifices the established wire contract. Hidden server-side merging cannot distinguish a real user change from a lossy old-client re-save. A sidecar therefore still needs explicit version/capability and downgrade semantics, with more storage surface than the versioned encrypted payload.

## Exact affected source boundaries

All paths below are relative to `/Users/chiburashka/.codex/worktrees/4806/site`.

| Area | Files and current boundary |
| --- | --- |
| Local model / new saves | `src/lib/profile/schema.ts:29`; `src/islands/ChartCalculator.tsx:1340`, `:1380`, `:1455` currently store actual houses in the only summary enum and omit requested intent. |
| Identity / rerun | `src/lib/profile/store.ts:24`, `:86`; `src/lib/profile/profile-chart-handoff.ts:17`; `src/lib/profile/resolve.ts:41`. One enum currently drives deduplication and recomputation. |
| Read/render/export adapters | `src/islands/ProfileDashboard.tsx:183`; `src/islands/TransitTracker.tsx:108`, `:132`; `src/islands/SynastryCalculator.tsx:227`; `src/lib/assistant/open-assistant.ts:709`, `:792`. Audit actual-result consumers separately from request consumers. |
| Frozen repair | `src/lib/profile/polar-repair.ts:26`; `src/lib/profile/read-store.ts:14`. Keep old fixture bytes and legacy repair provenance; adding metadata must not relabel repaired output as a current complete receipt. |
| Legacy sync | `src/lib/profile/sync.ts:171`, `:197`; `src/lib/profile/merge.ts:32`, `:85`. Raw chart JSON travels through Supabase and timestamp-winner merge; old full-record writes can remove new fields. |
| Position export | `src/lib/share-positions.ts:24`, `:54`, `:146`; `src/islands/ChartShareDialog.tsx:110`. v2 position tokens have exactly b/a/h/v and intentionally omit inputs/flags. Keep them readable and do not call them complete receipts. A richer portable receipt needs its own version; no arbitrary keys in v2. |
| Birth-input links | `src/lib/share.ts:14`, `:69`, `:96`; `src/islands/ChartCalculator.tsx:1181`. This link carries the request setting and should continue doing so; do not replace it with the fallback actual system. |
| Browser upload / mutation | `src/lib/account-v2/chart-wire.ts:11`, `:40`; `src/lib/account-v2/mutation-fingerprint.ts:39`, `:123`; `src/lib/account-v2/client.ts:83`, `:125`; `src/islands/AccountSyncV2Panel.tsx:773`, `:804`; `src/lib/account-v2/pending-operation.ts:12`. New payload selection must also drive fingerprint selection and preserve uncertain v1 retry identity. |
| API exact parsers / canonical plaintext | `src/lib/account-api/sync-wire.ts:37`, `:227`, `:266`, `:368`, `:459`. Preserve v1 bytes; add a version-dispatched type/parser/serializer instead of changing historical v1 output. |
| Encrypted source / GET projection | `src/lib/account-api/sync-server.ts:355`, `:435`. The server decrypts current payloads into the exact snake-case projection; PUT encrypts canonical plaintext and passes opaque bytes to the existing RPC. |
| Browser restore | `src/lib/account-v2/remote-chart.ts:26`, `:54`, `:91`, `:116`, `:133`, `:170`. Recompute with the request/replay value; store actual output from the fresh engine; leave unrecomputable old source honest. |
| Owner JSON export | `src/lib/account-api/server.ts:551`, `:566`; `src/lib/account-api/types.ts:136`; `src/lib/account-v2/client.ts:134`. Export requires canonical reserialization equality and currently hardcodes private-chart.v1. Keep old exports readable and include the new version explicitly when present. |
| Atomic write contract, inspect first | `supabase/migrations/20260811153303_account_sync_v2_foundation.sql:1260`, `:1330`, `:1381`, `:1473`. Replay precedes revision checking; complete encrypted envelopes are replaced, not merged; PUT execution is service_role only. No SQL change is inherently needed merely for a new opaque plaintext schema. |

A new local namespace also requires inspecting the account profile boundary/vault, export and deletion allowlists before touching the key: `src/lib/account-v2/profile-boundary.ts`, `profile-access.ts`, `browser-storage.ts`, `storage-identity.ts`, and their tests. That work has not been represented as completed by this review.

## Decisive tests before implementation can be called coherent

1. New polar Placidus → actual Whole → save → load → rerun → position export → new account PUT/GET → restore. Preserve request/provenance and the fallback flag; match actual public-engine houses/angles; keep IDs/birth/timestamps as appropriate. Explicit Whole must remain a distinct request with no invented fallback flag.
2. Existing v1 record with p and with w, with/without polar flag; ordinary latitude; unknown time; missing place; failed recomputation. Original request is not asserted known. Actual is null for no houses and unverified for unrecomputed legacy data. Old cached bytes remain unchanged on read.
3. Identity: same birth with explicit p versus w does not coalesce solely because both produce Whole at the pole; same-ID updates stay stable; legacy matching follows an explicit compatibility rule.
4. Pin every old canonical plaintext, mutation preimage and hash exactly. Old v1 pending retries preserve their original semantics/ID; a changed request produces a new fingerprint and must not reuse a prior mutation ID.
5. Version matrix: old client/old server remains unchanged; new client reads old records; old server rejects richer writes before side effects; new server accepts explicit richer payloads; incapable old client cannot overwrite a richer record; new client can recover/export richer source after the attempted downgrade.
6. Race/replay: v1 preflight sees old record then v2 wins; stale v1 CAS cannot overwrite. A completed v1 mutation replay returns its prior result after a newer revision. Unknown/incompatible versions cause no write. Account deletion, consent withdrawal and device revocation keep their existing checks and remain available.
7. Same-browser old-tab and legacy raw-sync re-save: prove the version-owned source cannot be replaced by a field-dropping v1 payload. If this is not implemented, state the client limitation and do not claim old-client preservation.
8. Privacy/export: new assumptions remain inside the encrypted source/private owner export; no birth fields enter position links, analytics, routing rows, errors or HMAC verifier logs. No new network request is made by local-only calculations.

## Dependencies and authority

Preparing types, parsers, synthetic compatibility tests, isolated patches and draft review material is authorized engineering. A publication hold on SDK PR5 does not block this site/account contract work. The constraints above are technical compatibility dependencies, not an owner-only approval requirement.

Server rollout, any database/access-policy change, account feature enablement and production deployment must follow the mandate's review/publication/privacy gates; no such action was taken. New schema/database work is not necessary just to demonstrate the issue or build the local contract tests. Do not widen consent, self-only selection, privacy controls or optional ownership SDK behavior to carry this metadata.

Supabase skill was read. Its Markdown changelog/docs fetch was unsupported by the web tool; current HTML changelog and JSON guide were inspected instead: https://supabase.com/changelog and https://supabase.com/docs/guides/database/json . No relevant reviewed changelog item changed the source-backed opaque-envelope conclusion. This is a review of the repository's implementation, not a query of live Supabase data or a claim about deployed database state.
