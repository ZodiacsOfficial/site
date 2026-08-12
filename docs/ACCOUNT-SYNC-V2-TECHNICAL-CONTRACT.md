# Zodiacs account sync v2 technical contract

Status: local implementation draft. Nothing in this document authorizes a
production migration, deployment, data copy, or user-facing rollout.

## Product boundary

The Zodiacs site and future iOS app remain useful without an account. An
account adds continuity, recovery, and explicitly selected cloud features; it
does not become a prerequisite for calculating, viewing, or saving a chart on
one device.

This phase builds private account infrastructure only. It does not build a
public profile, discovery, followers, reactions, comments, direct messages, or
a feed.

## Non-negotiable invariants

1. A chart stays local until its owner selects it for synchronization, grants
   the current `chart_sync` consent, and attests that it is their own chart.
   The first canary permits exactly one active synced self chart per account.
2. Signing in never claims every chart already present in the browser.
3. Local synchronization metadata is scoped to one authenticated account. A
   second account must explicitly import or clear unbound data; it cannot
   inherit the first account's cloud copy.
4. Chart label, exact birth input, placements, and engine receipt are one
   private encrypted payload. Public presentation data is a future, separate
   projection and may never read this owner payload directly.
5. Sync changes, tombstones, telemetry, and logs contain identifiers and
   revisions only—never birth inputs, chart labels, placements, email
   addresses, or free text.
6. Server revisions, not device clocks, decide ordering. A client mutation is
   idempotent only for the same operation, base revision, and canonical
   semantics; a stale base revision returns a conflict.
7. Withdrawing chart-sync consent immediately blocks future v2 writes and
   removes the remote chart copy. Local charts remain untouched.
8. Account deletion is terminal and recoverable across response loss: an
   authenticated, recently reauthenticated prepare erases product data and
   creates a short-lived recovery receipt before an unauthenticated
   proof-bearing finish retries the Auth hard delete.
   Provider cleanup is a separate durable reconciliation step and cannot
   delay or roll back first-party erasure or Auth deletion.
9. Existing v1 charts are never copied to v2 automatically. The single v2
   chart requires a fresh selection and `self_declared_v1` attestation.
10. No private v2 table is directly available through the browser Data API.
11. The internal web canary accepts remote chart storage only for an adult
    self chart (18+ by UTC calendar date). Local/account-free charts are not
    subject to this server gate.

## Feature gates

All gates default closed and must be enabled independently:

- `ACCOUNT_SYNC_V2_API_ENABLED=1` enables optional chart-sync enrollment and
  ordinary sync operations on the server-only account API.
- `PUBLIC_ACCOUNT_SYNC_V2_ENABLED=1` and
  `PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK=1` together expose the canary client.
  Either flag missing or malformed leaves the v1 client untouched.
- `ACCOUNT_SYNC_V2_CANARY_USER_IDS` is a comma-separated list of at most 100
  Auth user UUIDs allowed to create or use v2 sync state. Missing, malformed,
  or empty lists deny admission, upload, and read calls. Export,
  prepare/status/finish account deletion, consent withdrawal, and deletion of
  an existing remote chart remain available privacy controls and are not
  restricted by this list.

`ACCOUNT_SYNC_V2_API_ENABLED` is a sync-canary kill switch, not a privacy
rights switch. Same-origin export and deletion prepare/status/finish remain
available when it is disabled, so rollback cannot strand a deletion receipt
or prevent an owner from exporting or erasing data.

`ACCOUNT_SYNC_V2_CLEANUP_SECRET` is a separate server/GitHub secret of 32–512
characters. It authenticates only `POST /api/account/cleanup-receipts`; the
endpoint processes one fixed batch of at most 256 expired receipts and expired
provider leases. It remains callable while the sync feature flags are off.
Missing or mismatched configuration returns a not-found response and performs
no database call. Committing the path does not provision or deploy the secret.

The database migration may be applied before any gate is enabled. The
current v1 synchronization path remains unchanged until a reviewed canary
cutover.

While the server allowlist is restrictive, the two public client flags may be
enabled only in an access-controlled preview deployment. They must remain off
in the public production build: this site is statically rendered, so a global
client flag cannot preserve v1 for non-cohort visitors. A future public cohort
requires session-aware eligibility routing before v1 is suppressed.

## Data planes

| Plane | Contents | Browser access | Retention |
| --- | --- | --- | --- |
| Identity | Supabase Auth user ID and provider identity | Auth SDK only | Until account deletion |
| Lifecycle and consent | Account state, current purpose grants, append-only decisions | Server API, owner only | Until account deletion |
| Private chart | One self-attested opaque envelope containing label, birth input, placements, and engine receipt | Server API, owner only | Until chart removal, consent withdrawal, or account deletion |
| Sync authority | Devices, revisions, idempotency keys, cursor changes, tombstones | Server API, owner only | Bounded; tombstones survive stale devices |
| Provider cleanup | Opaque encrypted email locators and request-bound deletion outbox payloads | Service-only RPCs; never returned by HTTP | Through the seven-day deletion receipt reconciliation window |
| Presentation | Not part of this phase | None | Not applicable |

The complete private chart uses service-managed envelope encryption. Each write
gets a fresh random 32-byte data-encryption key and 12-byte AES-256-GCM nonce.
The data key is independently wrapped with the active 32-byte server key. Both
AEAD operations bind their purpose, authenticated user ID, chart ID, and
server revision as associated data; the key wrap additionally binds the key
version. The database receives only ciphertext, nonces, the versioned wrapped
key, and `key_scope = 'service'`.

Server keys are supplied only through `ACCOUNT_SYNC_V2_ENCRYPTION_KEYS`, a JSON
keyring of canonical base64 32-byte keys, and
`ACCOUNT_SYNC_V2_ACTIVE_KEY_VERSION`. New writes use the active version while
reads may use retained older versions. An old key may not be retired until all
records using it have been re-encrypted or deleted. Neither variable may use a
`PUBLIC_` prefix or enter a browser bundle.

The same versioned service keyring encrypts two additional minimal payloads,
with separate authenticated-data purposes from charts and from each other:

- A bootstrap alias locator contains only canonical `{ "email": "…" }` and
  binds `purpose=daily-sun-alias`, authenticated user ID, and opaque recipient
  hash. It lets deletion recover an address for each bounded alias without
  storing plaintext email.
- A deletion outbox payload contains the same minimal object but binds
  `purpose=deletion-provider`, deletion request UUID, and recipient hash. The
  database stores only its AES-256-GCM envelope. It cannot be moved to another
  request, alias, account, or AEAD purpose without authentication failure.

Data-key wrapping uses corresponding `*-key-wrap` purposes and binds the key
version. Missing keys or invalid envelopes fail closed for provider removal
and leave reconciliation required; they never expose an email or block core
account erasure.

Mutation receipts never store the browser's unsalted semantic SHA-256, which
would be an offline oracle for guessed birth details. The server instead HMACs
the canonical mutation preimage with a dedicated keyring from
`ACCOUNT_SYNC_V2_FINGERPRINT_KEYS` and
`ACCOUNT_SYNC_V2_ACTIVE_FINGERPRINT_KEY_VERSION`. The database stores only the
active `version:lowercase-hex` verifier and accepts candidates produced with
retained versions during rotation. These keys are separate from the chart
encryption keys and never enter the database or browser.

The HTTP boundary is `/api/account/:action`. `bootstrap`, `consent`,
`chart-put`, `chart-delete`, `pull`, and `chart-get` are same-origin POSTs with
bounded exact JSON bodies and a Supabase bearer token. The server validates the
token, derives the user ID, and then calls service-only RPCs; no request body
may name an owner. `chart-get` decrypts on the server and omits ciphertext,
nonces, wrapped keys, and key versions from its owner response.

`delete-prepare` is also authenticated and requires an authentication method
used within five minutes. `delete-status` and `delete-finish` are same-origin
POSTs that require a request UUID plus a canonical client-generated 32-byte
base64url recovery secret, but not a bearer token after Auth deletion. Only a
server HMAC verifier is stored. Receipts expire after seven days; neither the
secret nor service-only user ID is returned to the browser. The legacy
single-step `delete` action is not routed.
The database serializes rotation under the existing recipient/account lock
order, prunes that account's expired receipts, and permits at most three live
receipts per account. A fourth fresh request returns
`receipt_limit_reached`; exact receipt replay remains idempotent.
Each receipt also persists `daily_sun_revoked` and
`daily_sun_reconciliation_required`, so status and finish retries preserve the
same cleanup truth after a lost response. Reconciliation is informational and
never blocks core account erasure.

Deletion prepare atomically creates the receipt, erases first-party data,
revokes database email authority, and stages one non-cascading provider-outbox
row per known alias. Immediately before each Admin Auth deletion attempt, a
service-only terminal cleanup RPC reasserts the terminal database state and
stages any newly observed aliases. No provider network call occurs between
that RPC and Auth deletion.

After Auth deletion and receipt completion, `delete-finish` performs a bounded
best-effort outbox drain. It decrypts one request-bound payload at a time,
calls the existing Resend segment-removal path with a per-attempt timeout, and
records success only after the provider confirms the idempotent removal.
Failure or timeout remains pending and truthful in the receipt. Retrying the
same finish proof resumes the outbox even after Auth is gone or a prior HTTP
response was lost. The browser retains that proof while reconciliation is
pending; status never returns encrypted locators, cleanup payloads, emails, or
the service-only user ID.

Every confirmed Daily Sun provider add first acquires a five-minute
service-only database lease bound to recipient hash and
`confirmed_by_attempt_id`. Provider cleanup rechecks that lease under the same
recipient advisory lock before acknowledging removal. An active lease leaves
the outbox pending; an expired lease can be pruned and retried. In the other
direction, listing provider work creates a 30-second claim. A confirmation
provider add cannot begin while that claim is active, and a failed/ambiguous
removal retains the claim until expiry; successful acknowledgement clears it.
If a newer committed preference generation exists after this deletion revoked
its bound generation, the old outbox becomes `superseded` and is never sent to
the provider again. An unconfirmed request or cooldown is not consent and
cannot suppress removal of the deleted owner's provider subscription.

Bootstrap snapshots the current Daily Sun `confirmed_by_attempt_id` on each
opaque alias. The verified current address is fenced during initial prepare;
a historical alias is revoked only when its stored generation still matches,
or when no committed preference exists. This makes email recycling and later
consent generations take precedence over an old account receipt without
letting an unconfirmed opt-in request block a privacy cleanup.

The provider inventory is capped at 16 entries per deletion attempt. The
current verified email is always prioritized ahead of historical aliases. An
explicit, monotonic `inventory complete` bit becomes false if alias listing,
decryption, re-encryption, or the cap loses any candidate; reconciliation can
then never be reported complete for that receipt. Overflow never blocks core
erasure.

## Consent purposes

Initial purposes are narrowly defined:

- `chart_sync`: store selected charts for recovery and cross-device access.
- `weekly_digest`: send the existing weekly email.
- `daily_chart_email`: send a chart-specific daily email.
- `compatibility_invites`: create the existing private, expiring invitation.

Later purposes such as AI memory or public presentation require new consent
copy and may not reuse `chart_sync`.

An account with no consent row is treated as pending, never granted. Consent
events are immutable and current state is derived or updated transactionally.

## Local account hand-off

The account-v2 namespace stores only a random per-account device ID and
account-scoped sync metadata. It does not reuse a global installation ID
across accounts. Existing local-only charts remain in the
site's local profile store; account-v2 metadata never duplicates their birth
inputs, email address, or bearer token.

When the authenticated account differs from the stored owner, the client must
stop before synchronization. Data already bound to the previous account may
only stay isolated, be cleared from the browser, or cancel the hand-off; it is
never offered for import into the new account. Only charts that have always
been account-free may be selected for a new account after an explicit preview.

Account-v2 starts private profile access locked. A tab may read or write the
five account-bound local profile surfaces only while it holds a tab-lifetime
shared Web Lock and its session grant still matches the stored owner. Every
owner-changing action first revokes all same- and cross-tab grants, waits for
their shared leases to release, and then performs the checked transition under
the exclusive lock. Missing or failed Web Locks/storage fail closed. Async work
that captured a chart, pair, session, or derived reading also carries a
tab-local access generation; a revocation scrubs rendered copies and prevents
late completions from writing, sending, or repainting prior-owner data.

An involuntary missing/error session only locks and unmounts account-owned
local data. Signed-out access is granted solely after the explicit keep-on-this-
device choice records a matching retained-owner marker. Reauthentication
relocks that marker before restoring account access.

Sign-out separately asks whether to keep charts on this browser or remove all
Zodiacs data from it. The canary uses a local session scope so signing out of
one browser does not silently revoke sessions on other devices. A deliberate
"sign out everywhere" control is a later account-security enhancement.

## Conflict and deletion behavior

- Updates include a client-generated mutation ID and the last server revision.
- Replaying a mutation ID returns its original result.
- Reusing that ID for another operation, base revision, or semantic payload
  returns `mutation_conflict`; PUT and DELETE never share an ID.
- Two writes from one base revision produce one winner and one conflict.
- Birth fields are never merged independently. A conflict preserves a complete
  chart version for an explicit user choice.
- A deletion creates server authority that prevents an offline device from
  recreating the chart.
- Pull drains all bounded upstream pages and collapses them to the latest
  operation per entity before returning. A new device therefore observes a
  create-then-delete as a delete and is not stranded by a stale upsert.
- Consent withdrawal outranks concurrent chart writes and deletes the remote
  source and derived copy in one transaction.
- A second active chart receives the stable `chart_limit_reached` outcome. A
  tombstoned chart is not active, so the owner may deliberately select one
  replacement while the old tombstone still defeats stale devices.
- Bootstrap binds the authenticated account's lowercase HMAC-SHA256 recipient
  hash to its encrypted locator. Private account state retains at most 16
  aliases across email changes or HMAC-key rotation. Prepare and terminal
  cleanup revoke the verified current address plus historical aliases whose
  stored consent generation still matches; later/recycled authority is marked
  superseded and retained. Request-bound encrypted provider work lives on the
  non-cascading seven-day receipt. Missing locators, unavailable encryption or
  provider credentials, timeouts, and provider failures keep
  `daily_sun_reconciliation_required=true`; they never block account erasure.
  Receipt status is refreshed after each provider attempt and survives Auth
  deletion and lost responses.

## Staged cutover

1. Apply and verify the additive private schema with both feature gates off.
2. Exercise service-only RPCs in a disposable database and a non-production
   preview.
3. Enable the API for internal accounts; keep the UI off.
4. In an access-controlled preview only, enable the client for allowlisted
   fresh accounts and require selection of one self chart plus the
   `self_declared_v1` attestation. Bootstrap performs
   an ID-only legacy `charts` existence check; any legacy row returns
   `legacy_migration_required` without creating v2 state or reading payloads.
5. Keep all consumers behind owner-authorized server decryption; do not add a
   purpose-specific plaintext placement projection in this slice.
6. Stop v1 writes, verify export/deletion and stale-device behavior, then
   remove legacy cloud payloads after a recovery window.

Long-lived dual writes are not allowed because they preserve the sensitive
fused payload and create two competing authorities.

## Approved canary decisions

- Label, raw birth input, placements, and engine receipt use the single
  service-managed AES-256-GCM envelope described above. Keys remain outside
  the database and client.
- Sync is self-chart-only and limited to one active chart per account.
- No legacy chart is auto-migrated; every v2 chart starts with an explicit
  selection and self attestation.
- Account deletion uses prepare/status/finish recovery receipts. A fresh
  authenticated prepare may issue another request UUID and recovery secret
  while the Auth identity still exists, so loss of one browser capability does
  not strand an account already in deleting state. Existing receipts remain
  valid until their seven-day expiry, with at most three live receipts at once.

The approved canary export is a versioned JSON owner export containing an
allowlisted decrypted private-chart representation plus the opaque service
envelopes for completeness. Any decryption, schema, or revision mismatch fails
the complete export rather than silently omitting data. It also decrypts each
available historical Daily Sun alias locator into an allowlisted email and
binding timestamps; recipient HMACs are omitted. A legacy alias without a
locator is represented explicitly as unavailable rather than silently omitted,
while an invalid non-null locator fails the export closed.
