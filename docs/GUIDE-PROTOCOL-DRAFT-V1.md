# Guide protocol draft v1

Status: **contract plus hard-disabled server foundation; iOS reconciliation required**.

This document specifies the dormant website-side contract represented by
`src/lib/guide-protocol/types.ts`, `validators.ts`, `context-state.ts`, and
`adapters.ts`, plus the hard-disabled server-only transport foundation in
`src/lib/guide-server`. Nothing here enables Guide, publishes an iOS wire
format, changes `/ask/`, changes the account-v2 privacy boundary, authorizes a
database migration, or claims that Guide is included in the current account
export or account-deletion implementation. All account and Guide rollout
flags remain off. The foundation cannot call a provider while the protocol
status is `ios_reconciliation_required`, even if its environment gates are
misconfigured on.

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative for
this draft. A later cross-platform version MUST replace the `draft.v1` schema
names only after the website and final iOS implementation have reconciled the
open items near the end of this document.

## Product and trust boundary

- **Guide** is the only user-facing product name. **Luna** and
  `gpt-5.6-luna` identify the current model, not the feature.
- `/ask/` remains the one canonical website surface. The protocol's service
  paths are APIs, not a second user-facing route.
- The website and app MUST remain useful without an account.
- Both clients MUST call a protected Zodiacs server. No OpenAI credential,
  service-role credential, encryption key, prompt, or entitlement authority
  may enter browser JavaScript or an iOS binary. Only the Zodiacs server calls
  OpenAI, and every OpenAI request MUST set `store: false`.
- Authenticated ownership is the Supabase Auth user ID derived from the
  validated bearer token. A client request MUST NOT select or override its
  account owner.
- Cloud-processing consent, conversation-sync consent, and generation
  entitlement are independent authorities. `chart_sync` consent does not
  grant any of them.
- Read, export, conversation deletion, and full account deletion MUST remain
  available to the authenticated owner regardless of generation entitlement,
  Guide rollout eligibility, or a generation kill switch.

## Version and strict decoding

Every externally decoded object MUST use the exact schema discriminator from
`GUIDE_SCHEMAS`:

| Object | Schema |
| --- | --- |
| Conversation | `zodiacs.guide.conversation.draft.v1` |
| Trusted/local context mutation | `zodiacs.guide.context-mutation.draft.v1` |
| Authenticated-client context mutation | `zodiacs.guide.account-context-mutation.draft.v1` |
| Draft handoff | `zodiacs.guide.handoff.draft.v1` |
| Authenticated turn | `zodiacs.guide.account-turn.draft.v1` |
| Non-persistent turn | `zodiacs.guide.ephemeral-turn.draft.v1` |
| Logical-turn receipt | `zodiacs.guide.turn-receipt.draft.v1` |
| Explicit anonymous import | `zodiacs.guide.anonymous-import.draft.v1` |
| Stream event | `zodiacs.guide.stream-event.draft.v1` |
| Pre-stream turn rejection | `zodiacs.guide.turn-rejection.draft.v1` |
| Conversation page | `zodiacs.guide.conversation-page.draft.v1` |
| Message page | `zodiacs.guide.message-page.draft.v1` |
| Standalone Guide export | `zodiacs.guide.export.draft.v1` |

Decoders MUST reject unknown, missing, misspelled, or differently typed
members. They MUST reject malformed Unicode, bidi override controls in prose,
disallowed control characters, non-canonical timestamps, invalid ordering,
and payloads outside the UTF-8 bounds below. An HTTP boundary MUST cap the raw
request at 65,536 UTF-8 bytes before JSON parsing, then apply the exact-shape
decoder. It MUST NOT parse an unbounded body, silently truncate, or reinterpret
a legacy `/api/assistant` payload as this protocol.

The draft uses canonical lowercase UUIDs for conversation, message, turn,
operation, attempt, handoff, account, local-owner, and saved-person IDs. The
validator accepts standard UUID versions 1 through 8 with an RFC variant.
Timestamps use UTC with milliseconds, for example
`2026-08-12T01:00:00.000Z`. Source IDs are stable, opaque, lowercase ASCII
identifiers of at most 120 bytes. Private source kinds (`owner_chart`,
`chart`, `saved_person`, `historical_date`, `reading`, `calibration`, and
`shared_check_in`) use UUID source IDs. Only the public `today_sky` and `today`
kinds use date-bearing `sky:YYYY-MM-DD` and `today:YYYY-MM-DD` IDs. A Learn
term uses a bounded `learn:` lowercase slug. A public Zodiacs page uses a
bounded, nonlocalized `page:` slug; it never contains a URL, query, or referrer.
An ID MUST contain no display
name, prompt, chart facts, or other private text.

## Conversation and local-day identity

A `conversationId` identifies the durable or in-memory transcript. A
conversation is `general` by default. A general conversation is not day-bound
and MUST carry both `session: null` and `dailyAnchor: null`.

`daily` is an optional conversation kind. It alone carries a local-day
`session` with an opaque UUID `sessionId`, `YYYY-MM-DD` civil date, IANA time
zone, and `gregorian` calendar, plus a `dailyAnchor` whose date and time zone
exactly match that session. Neither conversation nor session ID is derived
from an account, date, time zone, language, or private content. The session
records the client's day boundary; it is not derived from UTC and does not by
itself define account-wide deduplication.

The iOS product policy is one root-owned, memory-only conversation for the
local day. That client SHOULD retain the same `conversationId` as the user
moves among Today, Chart, People, Look Back, Readings, Learn, and Guide, and
SHOULD create a new daily conversation only when its reconciled local-day
rule says the day changed. This draft does not impose that UI policy on the
website: an authenticated website may list general and daily conversations.
The exact cross-device collision rule for two devices in different time zones
is intentionally unresolved.

`ownerBoundary` and `persistence` form one invariant:

- `{kind: "anonymous", localOwnerId}` is `memory_only` and MUST never be
  written to Zodiacs conversation storage.
- `{kind: "account", accountId}` MAY be `account_synced`; the server supplies
  `accountId` in records after deriving it from authentication.
- An anonymous owner can never select `account_synced`, and an
  `account_synced` record can never have an anonymous owner.

## Ordering, revisions, pagination, and conflicts

Messages have immutable UUIDs, turn UUIDs, positive increasing `sequence`
numbers, authors `user` or `guide`, the context revision under which they were
created, and canonical creation times. A Guide-authored message additionally
has allowlisted generation metadata. Each turn starts with exactly one user
message and has at most one later Guide message at the same context revision;
message context revisions never move backward. Device clocks do not decide
ordering.

The authoritative account service MUST serialize writes using:

- `revision` for the whole conversation,
- `nextSequence` for the next message position,
- `contextRevision` for visible context changes,
- `contextEpoch` for invalidating an in-flight turn, and
- `modelHistoryStartSequence` for the earliest message still eligible for a
  future model call.

Each mutation supplies a client-generated `operationId` and `baseRevision`.
For account-synced state, the server MUST bind its idempotency result to the
canonical operation, revision, and semantics with a server HMAC verifier.
Memory-only state instead uses a canonical local SHA-256 verifier solely to
detect replay inside that in-memory session; it MUST NOT be persisted,
uploaded, logged, or treated as server authority. Replaying the exact
operation returns the prior receipt. Reusing an operation ID with different
semantics is `mutation_conflict`. A stale base is `revision_conflict`. The
service MUST NOT merge message text or individual source fields. A client
resolves a conflict by reloading the authoritative state and deliberately
reapplying or discarding its local change.

Conversation and message lists use an opaque server cursor, at most 100
records per page. A cursor MUST contain no conversation text and MUST be
treated as untrusted, expiring pagination state. A conversation page fixes
`snapshotAt` and `order: last_activity_desc_conversation_id_desc`; the opaque
cursor carries that deterministic compound position. A message page fixes
`snapshotRevision` and `order: sequence_asc`. Callers MUST NOT use device
timestamps for message ordering or gap detection. Every conversation item
must be at or before `snapshotAt`; message IDs are unique within a page. The
server cursor is authenticated and binds the snapshot, compound order, and
last emitted position.

Deletion MUST create revisioned server authority, such as a tombstone, that
prevents an offline client from recreating the deleted conversation. The
exact tombstone compaction window is a backend decision that must be long
enough to fence every supported offline client.

## Base context, visible sources, and ownership

Every Guide state has two permanent **slots**:

1. `ownerChart`, containing an `owner_chart` source when available; and
2. `todaySky`, containing a `today_sky` source when available.

Permanent means the slots always exist, not that stale content remains valid.
A slot is `active`, `unavailable`, or `revoked`; only an active slot has a
source. Profile editing or deletion, consent withdrawal, or another authority
change MUST invalidate the affected slot before a subsequent model call.

Up to five visible attachments MAY supplement those base slots. Draft source
kinds are:

| Kind | Intended origin | Ownership rule |
| --- | --- | --- |
| `owner_chart` | Root owner's base birth chart | `root_user`, `subjectId: self`, `subjectIsUser: true` |
| `today_sky` | Today's public sky | `public_reference`, never the user |
| `today` | Today surface detail | Public reference, never inferred to be the user |
| `site_page` | The current approved Zodiacs page | Public reference; title and facts resolve from the server catalog |
| `chart` | Chart surface | Account reference is initially allowed only for the root user's self chart |
| `saved_person` | People | `saved_person`, UUID subject, `subjectIsUser: false`, `local_only` |
| `historical_date` | Look Back | One explicit subject; its private source ID is a UUID, not a date |
| `reading` | Saved reading | One explicit subject boundary, never a mixed-subject summary |
| `learn_term` | Learn | Public reference, never the user |
| `calibration` | User calibration | Root-user ownership only when explicitly sourced from the root profile |
| `shared_check_in` | Shared check-in | One explicit subject; no participant is silently promoted to root user |

Every source includes stable `sourceId`, positive `sourceRevision`, title,
facts, one subject, `containsThirdPartyData`, persistence classification, and
a content digest. Subject name and `subjectIsUser` travel together. A saved
person MUST never be represented as the user, even if its name or chart
resembles the owner's. Draft v1 accepts `containsThirdPartyData: true` only
for a `saved_person` subject and requires it to be false for root/public
subjects. A source that combines the root user with another person, or
otherwise mixes subject boundaries, is rejected and must be split into
separately visible sources before a future version can consider it.

Full `facts` exist only in a `local_only` source. An `account_reference`
source MUST carry `facts: null`; the account snapshot stores a trusted,
revisioned reference rather than a second copy of model facts. The server
hydrates the owner's self chart from the existing account-v2 encrypted
self-chart authority and hydrates public sources from a trusted public source
catalog only after deriving the account from the bearer token. Guide MUST NOT
duplicate the account-v2 chart payload in Guide storage or let a client
provide purported chart facts for an account-synced source.

Titles, local facts, subject names, and content digests are private content:
when they are stored, they MUST be encrypted at rest and excluded from
telemetry. A stored idempotency verifier MUST be a keyed server HMAC rather
than the client's unsalted digest.

The initial shared-chart policy is self-chart-only. The website adapter MUST
not infer self ownership from the newest saved chart or from a display name.
Saved-person context is typed for UI/source-tray interoperability, but its
cloud payload and authenticated-turn transport remain disabled pending iOS
reconciliation. Draft validation permits it only in a `memory_only`
conversation, rejects it from an `account_synced` snapshot, and rejects it
from the initial ephemeral cloud payload. A final contract may keep it
on-device or add a separately consented, authenticated, non-persistent
per-turn overlay. It MUST NOT solve this by persisting someone else's chart
under the owner's chart authority.

An authenticated client uses only
`zodiacs.guide.account-context-mutation.draft.v1`. Its attach/replace payload
contains a trusted source reference—kind, source ID, and source revision—not
title, facts, subject claims, or a content digest. Draft v1 permits those
client references only for public `today`, `site_page`, `historical_date`, and `learn_term`
attachments; the server resolves and revalidates the reference before
converting it to an internal trusted context mutation. `ownerChart` and
`todaySky` base slots are server-managed: a browser cannot call `set_base` or
`restore_model_context`, and the self chart is obtained from account-v2 rather
than attached through the public mutation wire.
Every authenticated context mutation also carries `clientAuthEpoch`; the
server compares it to the current bearer-derived account/session fence before
looking up a conversation or returning a revision result. Its server HMAC
semantics bind that epoch, the bearer-derived account/session, and the exact
trusted reference/result; a stale A-era mutation cannot be replayed under B.

All source facts, user messages, prior Guide messages, handoff drafts, and
hydrated chart text are untrusted **data**, never system or developer
instructions. Provider assembly MUST keep them in data/user-message
boundaries and MUST NOT concatenate them into the system or developer prompt.
The server-owned prompt MUST explicitly tell the model to ignore instructions
embedded in source or transcript data. Quoted source text cannot select a
model, change safety policy, request secrets, enable tools, or override
`store: false`.

## Context operations and model-history cutoff

The trusted/local reducer defines seven operations:

- `attach` appends a new, non-colliding visible source when capacity permits.
- `replace` atomically replaces one visible source. It never produces a
  half-old, half-new source. Reusing a stable source ID with a lower revision
  is stale; reusing the same ID/revision for different content is a conflict.
- `remove` removes one visible source by stable ID.
- `clear` removes all visible attachments and does not silently delete base
  slots or visible transcript bubbles.
- `set_base` is a trusted server/local-root operation that activates or marks
  unavailable exactly one base slot. It is not accepted from an authenticated
  client mutation.
- `restore_model_context` is a trusted operation used only after consent is
  newly granted or entitlement is restored. It starts a fresh model epoch; it
  does not silently replay the prior model history.
- `invalidate` revokes one base slot, one attachment, or all model context,
  with an explicit reason such as profile change/deletion, source
  change/deletion, consent withdrawal, calibration clear, shared check-ins
  disabled, entitlement loss, or owner-boundary change.

The authenticated-client mutation schema exposes only attach, replace,
remove, and clear, with the trusted-reference restrictions above. Base-slot
updates, whole-context disablement, and restoration remain server/root
authority.

For this conservative draft, every applied semantic context change increments
`revision`, `contextRevision`, and `contextEpoch`, and advances
`modelHistoryStartSequence` to at least `nextSequence`. This guarantees that
removal, replacement, clearing, consent revocation, profile change,
calibration clearing, disabling shared check-ins, or entitlement loss stops
the old context and its derived history from influencing future model turns.
Earlier bubbles MAY remain visible to the user, but the model projection MUST
exclude every message before the cutoff. An unchanged operation records an
idempotent receipt without advancing revisions. A cutoff dominates ordinary
window trimming.

Invalidating `all_model_context` deliberately preserves the visible base
slots and attachment tray. It sets `modelContextState: disabled`, advances the
epoch and cutoff, makes model history empty, and cancels/fences any in-flight
attempt. Thus revoking consent or losing entitlement does not disguise what
the user had selected, but none of that visible state can influence the model
until a separately authorized restore starts another fresh epoch. Removing or
revoking an individual source still removes or revokes that source as stated
above.

The conversation's `contextOperations` array is a bounded projection cache of
the latest 1,000 receipts, not the durable account idempotency authority. The
reducer compacts the oldest projected receipt as a newer one arrives. A
privacy-critical invalidation MUST never fail because that projection is full;
a future account service MUST keep authoritative owner-scoped receipts
separately and may compact them only under a reviewed replay/tombstone policy.

Any in-flight attempt with an older `contextEpoch` MUST be cancelled or its
late completion discarded. The server MUST re-check consent, entitlement,
owner, base revision, and context epoch immediately before committing a Guide
message.

## Draft handoff

Today, Chart, People, Look Back, Readings, and Learn hand information to the
same root Guide with a `GuideDraftHandoffDraftV1`. A handoff contains a UUID,
the existing conversation ID, origin, bounded draft text, source ID/revision
references, and a timestamp.

`delivery` has the sole legal value `requires_user_action`. Accepting a handoff
MUST make the draft and attached sources visible; it MUST NOT send, enqueue,
stream, sync, or call the model. The user must explicitly submit it. A source
reference that is missing or stale at submission time must be replaced,
removed, or rejected visibly rather than resolved to unrelated content.

## Turns, retries, streaming, cancellation, and errors

A logical turn uses one `turnId`, `operationId`, and user `messageId`. Each
transport try has a new `attemptId`; a retry names the immediately prior
attempt in `retryOfAttemptId` while preserving logical-turn identity. The
server MUST deduplicate the logical operation and MUST NOT append the user
message twice after a lost response.

When the authenticated backend is implemented, it MUST store a
`zodiacs.guide.turn-receipt.draft.v1` keyed by the logical operation. It binds
conversation, operation, turn, user-message ID, and canonical turn semantics
with a server HMAC and records `reserved`, `completed`, `cancelled`, or
`failed_before_provider`. Receipt lookup and semantic comparison MUST happen
**before** ordinary base-revision admission checks. Therefore an exact
completed, cancelled, or in-progress replay can return its existing result
after the original turn advanced the revision, without calling the provider
again. It still requires the exact live owner fence. A conflicting semantic
preimage is `mutation_conflict`; only `failed_before_provider` may proceed as
a new transport attempt after the full current preflight succeeds. That new
attempt MUST differ from the failed attempt and name that exact active attempt
in `retryOfAttemptId`; otherwise it is a conflict rather than another provider
start.

An authenticated request uses `account-turn` and contains IDs, the expected
revision and context epoch, the user message, and cloud-consent evidence. The
server hydrates account ownership, active sources, and eligible history. It
MUST accept no hidden client-selected owner and MUST check generation
entitlement server-side. Owner/session/auth-epoch checks happen before any
revision, context, receipt, or existence result is returned, and all database
lookups are scoped by the bearer-derived account.

A signed-out request uses `ephemeral-turn` and carries the bounded active base
context, visible attachments, and post-cutoff history needed for that call.
Every source in this request MUST be `local_only`; an account reference cannot
be relabelled as anonymous or resolved outside its account boundary.
The protected Zodiacs server MAY hold it only in memory for the active
request; it MUST NOT insert a conversation, message, source, retry, analytics,
or recovery record from that content. The protected server MAY retain a
content-free quota receipt for 48 hours, keyed by a server-HMAC of the logical
conversation and operation IDs and containing only opaque hashes, UTC quota
day, and reservation time. That global receipt serializes duplicate provider
starts across serverless instances and UTC midnight. Because anonymous output
is not persisted, an exact replay is rejected before `accepted` as a
non-retryable `revision_conflict`; it cannot recover the prior answer, but it
also cannot charge quota or call the model again.

The model window contains at most eleven eligible post-cutoff history
messages plus the new user message: twelve total. The complete model-data
projection—base context, visible attachments, those history messages, and the
new user content—MUST fit within 49,152 UTF-8 bytes. The cutoff is applied
before newest-first window selection; a leading orphaned Guide message is
dropped.

Stream event sequence starts at zero:

1. exactly one `accepted`,
2. zero or more `delta` events,
3. exactly one `completed`, `cancelled`, or `error` terminal event.

A request rejected before `accepted` is not a stream. It uses the exact,
text-free `zodiacs.guide.turn-rejection.draft.v1` envelope with the logical
conversation/turn/attempt identity, current auth epoch, stable error code, and
retryable bit. Only this pre-stream envelope may set `retryable: true`; the
client then creates a new attempt under the receipt-first rules above. This
keeps preflight failures typed without weakening the accepted-first stream
state machine or duplicating an already-appended user turn.

An exact duplicate of the most recent event is harmless. A conflicting
duplicate, gap, stale event, identity mismatch, or transition after a terminal
state MUST be rejected. Cancellation reasons are `client_cancelled`,
`context_invalidated`, `consent_revoked`, and `entitlement_lost`. Stable error
codes are `disabled`, `unauthorized`, `consent_required`,
`entitlement_required`, `revision_conflict`, `context_changed`,
`request_too_large`, `rate_limited`, `temporarily_unavailable`, and
`invalid_response`. Error bodies and telemetry MUST contain no message,
source, subject, draft, or generated text.
Every post-`accepted` stream `error` carries `retryable: false`. Acceptance has
already advanced the conversation and appended/reserved the user turn, so
reusing its stale base revision is not a safe retry path in draft v1.

Every stream is fenced to the exact live authority captured at admission. For
an account this is the tuple `(accountId, sessionId, clientAuthEpoch)`, where
this `sessionId` identifies the live authenticated session rather than the
optional Guide local-day session; for an anonymous owner it is
`(localOwnerId, clientAuthEpoch)`. Both also require the
unchanged conversation `contextEpoch`. Each event repeats `clientAuthEpoch` and
the conversation/turn/attempt identity. An account switch, session change,
auth-epoch change, context mutation, consent withdrawal, or entitlement loss
MUST cancel the accumulator, scrub partial/completed text, and reject late
events before they reach the UI or transcript. An accepted event must advance
the request revision exactly once; completion must carry the expected Guide
sequence, context revision, and next revision.
Fencing also removes the remembered last event because it may contain a delta
or completed message from the prior owner.

Delta text is lossless protocol content. A valid non-empty delta may begin or
end with whitespace; decoders MUST preserve those bytes while still rejecting
malformed Unicode, disallowed controls, and byte overflow.
The accumulator enforces both cumulative message limits—2,400 code points and
9,600 UTF-8 bytes—across all deltas, not only on each event or completion.

The current draft accumulator exposes `waiting`, `streaming`, `completed`,
`cancelled`, and `failed`. Network loss leaves no invented assistant bubble.
A retryable failure MUST use the pre-stream rejection envelope before any
`accepted` event. A post-accept failure is terminal for that logical turn;
continuing requires an explicit new user turn rather than silently resending
the already-accepted one.

## Consent, entitlement, persistence, import, and account switching

Generation is allowed only when cloud-processing consent is `granted` and the
server-verified generation entitlement is `allowed`. Conversation sync is
allowed only for an authenticated owner with separate sync consent `granted`.
An account can read, export, or delete its existing conversations when
generation is denied, expired, disabled, or unavailable.

Consent evidence on a turn names purpose `guide_cloud_processing`, the exact
copy/policy version shown to the user, positive consent revision, UUID
`disclosureId`, disclosed context epoch, and canonical `contextScopeDigest`.
The scope digest binds the conversation ID, epoch, history cutoff, each base
slot's state and source kind/ID/revision/content digest/subject ownership, the
ordered visible attachments, and the ID/sequence/author/content digest of every
eligible history message. For local sources the server first recomputes the
content digest from the exact title, facts, subject, ownership marker, kind,
ID, and revision; it never trusts the supplied digest. For authenticated
references the digest comes from the trusted account-v2 or public-catalog
hydration. The server recomputes both this scope and its final hydrated model
input byte count immediately before admission; matching only a policy version
is insufficient. Any context or eligible history change requires a disclosure
whose epoch and digest match the new scope.

Granting cloud processing MUST accurately describe what active chart, person,
reading, message history, or other source will leave the device. Withdrawal
MUST fence new processing, cancel an active attempt, disable model context,
and advance the cutoff while leaving the visible tray available for review.
The generation entitlement is not a client assertion. For iOS production,
server-side StoreKit verification is required before it can become `allowed`.

Signed-out history remains device-local and `memory_only`. Signing in MUST NOT
upload it. Explicit import uses
`zodiacs.guide.anonymous-import.draft.v1` and only a conversation proven
`anonymous_never_bound`. Before import, the authenticated server produces a
preview authority bound to the bearer-derived destination account, exact
`clientAuthEpoch`, preview/conversation/local-owner IDs, conversation revision,
context epoch, canonical snapshot digest, and server HMAC. The UI MUST display
that server-bound preview and require the literal confirmation `IMPORT`.
Checkboxes, sign-in, sync consent, or restoring connectivity cannot substitute
for that literal action.

The preview also binds an opaque `lineageId` to an account-v2 boundary-derived
`anonymous_never_bound` claim and a server-HMAC lineage verifier. Import MUST
atomically consume that unclaimed lineage in an owner-independent, content-free
claim table before writing the account conversation. A consumed lineage can
only replay its original import and can never be offered to another account.
Full account deletion removes the account link but retains the minimum
content-free consumed-lineage tombstone needed to prevent A-to-B relabelling;
it stores no account ID, conversation text, source data, or snapshot digest.
The final iOS contract must define an equivalent device boundary/lineage
authority before enabling anonymous import there.

The submitted preview ID, revision, epoch, and snapshot digest must still
match an independently recomputed digest of the exact candidate conversation;
otherwise the server returns `preview_changed` and requires another preview.
Admission also rechecks the current live authenticated account, session, and
auth epoch against the preview authority, so a sign-out, reauthentication, or
account A-to-B switch cannot reuse it.
Content previously bound to account A may never be imported into
account B, even after A signs out or is deleted. Draft v1 also rejects a
preview containing saved-person sources. A successful future import must
revalidate and convert eligible source material into server-trusted references
(rehydrating the self chart from account-v2), issue fresh account revisions
and server receipts, and discard all memory-only operation receipts/local
digests. The current code only reviews this contract; it performs no upload.

On an A-to-B switch, the browser or app MUST lock, archive, or clear A's local
Guide state before exposing B's state. All local keys and leases must be
account-scoped; a retained A archive stays tagged A and is inaccessible to B.
Late reads, stream events, background sync, and queued mutations from A need
an exact account/session/client-auth-epoch fence before they can affect the
active UI.

Offline clients MAY compose a visible draft and use local source controls.
They MUST NOT claim a cloud completion, entitlement decision, sync result, or
server revision while offline. An account client may retain a bounded pending
operation locally, but on reconnect it must first revalidate owner, consent,
entitlement, authoritative revision, context epoch, and source revisions.
Nothing queued offline is automatically sent merely because connectivity or
sign-in returns.

## UTF-8 and collection bounds

The HTTP boundary counts and caps the raw UTF-8 body before JSON parsing.
Field and aggregate bounds are then checked on the exact decoded shape;
code-point limits apply in addition. A decoder rejects an oversized value
instead of truncating it.

| Item | Draft v1 bound |
| --- | ---: |
| Whole mutation, handoff, or turn request | 65,536 UTF-8 bytes |
| Complete model-data projection | 49,152 UTF-8 bytes |
| Messages in one model window | 11 eligible history + 1 new user = 12 |
| Visible attachments | 5 |
| Source ID | 120 ASCII/UTF-8 bytes |
| Source or subject display name | 80 code points / 320 UTF-8 bytes |
| Source facts | 3,500 code points / 14,000 UTF-8 bytes |
| User or Guide message | 2,400 code points / 9,600 UTF-8 bytes |
| Draft handoff text | 2,000 code points / 8,000 UTF-8 bytes |
| One stream delta | 2,400 code points / 9,600 UTF-8 bytes |
| Model/prompt/policy version label | 128 UTF-8 bytes |
| Page size | 100 records |
| Opaque cursor | 1,024 UTF-8 bytes |
| Messages retained in one draft conversation object | 1,000 |
| Context-operation receipts per draft object | 1,000 |
| Conversations in one standalone draft export | 1,000 |

The service SHOULD start no looser than the audited iOS relay's 30 accepted
requests per minute, two concurrent generations, and 700 output-token cap,
with more restrictive anonymous controls if needed. Enforcement must use
opaque account/session/device abuse keys, not prompt text, chart facts, email,
or analytics content. Exact production quotas and retry headers remain server
configuration, not client authority.

## Proposed private storage contract (not implemented)

The future backend SHOULD add private, owner-scoped tables conceptually
equivalent to:

| Table | Plaintext operational fields | Encrypted private payload |
| --- | --- | --- |
| `guide_conversations` | opaque conversation/account IDs, kind, revisions, sequence/cutoff, timestamps, deletion state | any private title or settings |
| `guide_messages` | opaque IDs, sequence, author enum, context revision, timestamps | user/Guide content and generation metadata if it could reveal behavior |
| `guide_context_sources` | opaque source/conversation IDs, trusted kind/revision reference, slot/state, timestamps; account references have `facts: null` | any private title/subject metadata; no duplicate account-v2 self-chart facts |
| `guide_context_operations` | operation ID, base/result revision, keyed semantic verifier, outcome | no raw semantic preimage |
| `guide_turn_receipts` | logical operation/turn/message IDs, status, result references, keyed semantic verifier | no raw semantic preimage or conversation text |
| `guide_turn_attempts` | opaque attempt/retry IDs, generic state/error code, timestamps | no prompt or response text; ephemeral turns create no row |
| `guide_conversation_tombstones` | owner/conversation IDs, terminal revision, deletion time | none |
| `guide_import_lineage_claims` | opaque lineage ID, consumed bit, claim HMAC, timestamps; account link removed on account deletion | none; never stores content or a snapshot digest |

This is a logical design, not approved SQL or final table naming. Private
tables MUST not be directly exposed to the browser Data API. Row-level
policies and explicit grants MUST constrain authenticated reads to
`auth.uid() = owner_id`; writes SHOULD go through bounded server-only
functions. Service-role access remains server-only. Every write derives
`owner_id` from validated authentication and rejects a body that attempts to
name an owner.

Guide storage MUST reference the account-v2 self chart as its source of truth.
A generation service may decrypt that existing owner chart after checking the
bearer-derived account and current chart/Guide consent, but it MUST NOT insert
a second Guide-owned copy of chart facts. Public references are similarly
hydrated from the trusted catalog. Local-only facts are never written by the
account synchronization path.

Conversation content, source facts, titles, subject names, and other private
Guide material MUST use service-managed AES-256-GCM envelope encryption at
rest. Each record write gets a fresh random data-encryption key and nonce; the
data key is wrapped by the active server key. Associated data binds a
Guide-specific purpose, authenticated account ID, conversation ID, entity ID,
entity type, and server revision. Guide needs its own purpose domain and
keyring; it must not call the account chart helper whose associated data is
hard-coded to `private-chart`.

New writes use the active key version; reads accept retained older versions.
Rotation introduces a new active key, re-encrypts records with new DEKs, and
retires an old key only after all records using it have been re-encrypted or
deleted. Missing keys, invalid authentication tags, schema mismatch, or
partial decryption MUST fail closed. Keys and plaintext never enter the
database together, a browser bundle, an iOS binary, or a migration file.

The server decrypts only for an authenticated owner response or immediately
before building an authorized model request, and holds plaintext for the
shortest practical lifetime. No decrypted cache may outlive its owner,
consent, context epoch, or request.

## Proposed API contract and dormant route

Only `POST /v1/guide/turn` is now routed to a hard-disabled server foundation.
It has no website client and cannot pass its compile-time reconciliation gate.
Every other row remains a review target, not an implemented route:

| Operation | Proposed same-origin API | Authority and behavior |
| --- | --- | --- |
| Generate/stream | `POST /v1/guide/turn` | Route and strict request/provider adapters exist, but the handler is reconciliation-blocked and its default authority adapter always denies; no live generation path exists |
| Cancel attempt | `POST /v1/guide/turn/cancel` | Opaque attempt identity only; final wire still to reconcile |
| List conversations | `POST /v1/guide/conversations/list` | Authenticated owner, opaque cursor |
| List messages | `POST /v1/guide/messages/list` | Authenticated owner, conversation ID and opaque cursor |
| Mutate sources | `POST /v1/guide/context/mutate` | Authenticated client sends only `account-context-mutation` trusted refs; server hydrates and applies an internal mutation |
| Preview/import anonymous conversation | paths to reconcile | Authenticated server preview plus literal `IMPORT`; atomically consumes an unclaimed lineage; no automatic upload |
| Delete conversation | `POST /v1/guide/conversation/delete` | Owner-only tombstone; callable while rollout is off |
| Export Guide | versioned owner export path to reconcile | Owner-only decrypted `zodiacs.guide.export.draft.v1`; callable while rollout is off |

Account-turn requests intentionally contain no account ID, model selector,
system prompt, raw entitlement assertion, or provider setting. Model choice,
prompt assembly, safety policy, maximum output, and `store: false` remain
server-owned. Untrusted context/transcript data never enters the system or
developer prompt and cannot override those controls. The completed message
may expose bounded `modelId`, `promptVersion`, `policyVersion`, protocol
schema, and generation time for
support/export. It MUST NOT expose prompt text, hidden instructions, provider
keys, entitlement tokens, or internal routing secrets.

## Export, deletion, retention, and privacy telemetry

The standalone draft export is `zodiacs.guide.export.draft.v1`. Its decoder
requires the expected account ID derived from the authenticated bearer and
rejects a payload naming any other owner. It contains only that owner's
decrypted active conversations, includes metadata-only deleted-conversation
tombstones, and declares `retention: "P12M"`. It rejects anonymous,
memory-only, and
mixed-account records. A tombstone contains no erased transcript or context.
The draft deliberately does **not** widen the current closed
`zodiacs.account.export.v1` response. Before any Guide persistence is enabled,
a reviewed new aggregate account-export version or an equally discoverable
owner export MUST include Guide explicitly and fail closed rather than
silently omit or partially decrypt it.

Conversation deletion removes encrypted content and establishes a tombstone
or equivalent stale-device fence. Full account deletion MUST atomically erase
all Guide content, sources, mutation authority, turn state, and keys/receipts
owned by the account before Auth deletion is finalized. The existing
account-v2 deletion SQL does not yet know about these proposed Guide tables;
adding them to the prepare/status/finish and recovery contract is mandatory
future work, not a completed property of this draft. The only retained import
artifact is the owner-independent consumed-lineage tombstone described above;
it is unlinkable to the deleted account and contains no user content.

Authenticated Guide conversations expire after **12 calendar months** of
inactivity measured from authoritative `lastActivityAt`. `P12M` means calendar
addition in UTC—preserve the time of day and clamp an invalid month-end date
to that target month's last day—not 365 days or 8,760 hours. Purging becomes
eligible at the first server cleanup at or after that instant. A new message or
applied user context mutation may advance activity; passive reads, model
retries that do not commit, export, and telemetry MUST NOT. Explicit
conversation or account deletion takes priority
over retention. Anonymous requests have no server retention because they are
never persisted.

No conversation text, source title/facts, subject name, chart input, draft,
prompt, or model output may appear in analytics, application logs, access-log
query strings, URLs, notification bodies/previews, crash reports, traces,
metrics labels, or error telemetry. Logs MAY contain bounded opaque IDs,
schema version, revisions, byte counts, duration, status/error enum, and
coarse quota counters. HTTP responses carrying private Guide data MUST be
private/no-store and protected against content sniffing. Notifications, if
added later, must be generic and reveal no conversation existence or text on
a lock screen by default.

## Website ephemeral Guide and deferred shared-account rollout

The website now has a deliberately narrower live runtime than the complete
shared draft. `/ask/` remains the canonical Guide page, and the same browser
client may open Guide from eligible site surfaces. It sends only an exact,
bounded `ephemeral` turn to `POST /v1/guide/turn` after the person submits a
message and accepts the displayed cloud-processing disclosure. That disclosure
states that the question, recent Guide messages, and visible sources are sent
to OpenAI for an input safety check and reply generation, and that the generated
draft reply is sent back to OpenAI for a second safety check before display. The
greeting and invitation are local UI and make no provider call. The browser may
retain the current local-day conversation in session storage, but Zodiacs does
not persist signed-out transcript or context on the server.

The anonymous website authority is not account authority. It accepts only a
server-signed, HttpOnly, same-site browser-session principal, the exact
same-origin transport, a valid disclosure digest for the current context, and
the initial self-only context policy. The client-visible `site_page` source is
only an opaque selector; its supplied facts are discarded and the server
hydrates a bounded projection from the reviewed public Guide catalog. The
server validates raw bytes before JSON parsing, applies privacy-preserving
quota keys, streams the app-owned event envelope, cancels on disconnect, and
uses a pinned OpenAI classifier before and after calling the pinned
`gpt-5.6-luna` model for user-facing generation. Every provider request uses
server-owned policy, `background: false`, and `store: false`. Failure to obtain
Luna for generation is a terminal availability failure, never a fallback to
another generation model.

The website ephemeral path is available when its server prerequisites are
correctly provisioned and is disabled only by the emergency negative switch
`GUIDE_KILL_SWITCH=1`. No positive browser or provider flag exists. This does
not retrieve, copy, expose, or rename the existing encrypted Vercel
`OPENAI_API_KEY`; only server code refers to that credential name. The retired
Anthropic `/api/assistant` compatibility endpoint requires both its historical
positive flag and the separate `LEGACY_ASSISTANT_COMPAT_ENABLED=1`, so an old
environment value cannot silently leave two providers active.

This activation does **not** publish the draft as a cross-platform account
wire. Browser modules do not import `guide-protocol`; they construct only the
reviewed ephemeral envelope. There is no Guide Supabase migration, encrypted
conversation store, account read/sync/import/export/delete adapter, durable
turn receipt, or iOS network integration in this website milestone. Existing
account-v2 rollout flags and privacy boundaries remain unchanged and off.
Signed-in visitors therefore use the same clearly local browser conversation;
sign-in never uploads it. Shared web/iOS history remains unavailable until the
remaining lifecycle work below is complete.

Deferred shared-account rollout order:

1. Reconcile this draft with iOS production-gateway draft PR #2 at head
   `82726c8c1582fbad50f244c7490c2ec3891c7a5e` (stacked on PR #1), then freeze
   matching cross-language fixtures, error names, bounds, authority envelopes,
   event sequences, and day/source rules.
2. Review additive private SQL, RLS/grants, server-only functions, a distinct
   Guide encryption purpose and key rotation, retention cleanup, export,
   conversation deletion, and terminal account-deletion integration. Keep
   account sync unavailable throughout this work.
3. Add exact Supabase owner/session, Guide consent, server entitlement,
   durable idempotency/quota, revision, deletion-state, and stale-epoch
   enforcement. Read, export, deletion, and consent withdrawal must remain
   independent of generation entitlement and emergency generation switches.
4. Add explicit anonymous-import preview and confirmation; never infer import
   from sign-in and never offer account A's data to account B as anonymous.
5. Integrate iOS only after its wire is frozen and App Attest, server-side
   StoreKit verification, and the app-specific privacy policy are ready.
   Voice and `gpt-live-1` remain future work.
6. Before claiming shared history, run an allowlisted canary covering export,
   conversation/full deletion, key rotation, A-to-B isolation, explicit
   import, consent/entitlement loss, offline conflicts, retention, rate limits,
   and content-free log/telemetry inspection.

## PR #1 reconciliation table

This table compares the audited [iOS Guide/Luna draft PR #1](https://github.com/zodiacs-org/zodiacs/pull/1)
with this website contract. PR #1 is architectural evidence, not the final
wire format being implemented in the separate iOS task.

| Area | Audited PR #1 behavior | Website draft v1 | Required reconciliation |
| --- | --- | --- | --- |
| Product/model naming | UI uses Guide; relay selects `gpt-5.6-luna` | Guide is product; model ID is server metadata only | Confirm no user-facing Luna labels remain and exact metadata names match |
| Root lifetime | Root-owned, in-memory `AstrologyConversation` continues for the local day | `general` has `session: null`/`dailyAnchor: null`; only `daily` has an opaque local-day session and matching anchor | Decide whether the iOS root maps to `daily`, then freeze midnight/time-zone-change and cross-device collision behavior |
| Message identity | PR conversation messages use UUID identity, role, and text | UUID message/turn IDs plus server sequence, revisions, context revision, timestamps, and generation metadata | Map Swift message fields and decide which values are server-assigned after sync |
| Base/visible context | `GuideCoordinator.Context` supplies visible contexts; subject name is bounded to 80; context suffix is bounded to five | Trusted owner-chart/today-sky slots plus five visible attachments; account snapshots store `facts: null` refs and hydrate the self chart from account-v2 | Publish matching Swift source IDs/revisions and confirm the app never uploads a duplicate self-chart fact payload |
| Saved person and mixed subjects | PR passes explicit `subjectIsUser`; saved people must remain distinct | Saved person is false/local-only and excluded from draft cloud turns; mixed-subject sources are rejected | Publish a single-subject Swift wire and decide whether saved-person context stays on-device or gets a separately consented non-persistent overlay |
| Account context mutation | PR has local coordinator context but no account reference wire | Client account mutation accepts only public trusted refs; server alone manages base slots and hydration | Reconcile Swift commands with `account-context-mutation` without exposing internal `set_base`/restore operations |
| Context revocation | PR advances its model-history start index while retaining prior bubbles | Every applied change advances epoch/cutoff; whole-context disable preserves the visible tray, empties model history, and fences streams | Confirm attach cutoff, visible disabled-state UX, restore trigger, and Swift index-to-server-sequence mapping |
| Model history | PR sends a recent history suffix of nine; relay accepts at most twelve messages | At most 11 post-cutoff history messages plus the new user message, all model data within 48 KiB | Freeze Swift selection to the same counting and byte-order fixtures |
| Request sizing | Relay rejects bodies over 64 KiB, system text over 48,000 characters, and messages over 2,400 characters | Raw UTF-8 body is capped at 64 KiB before parse; messages/deltas are 2,400 code points and 9,600 UTF-8 bytes | Replace ambiguous Swift/JavaScript character counting with matching multibyte fixtures |
| Relay/privacy | Loopback relay alone holds the OpenAI key, uses streaming and `store: false`; production proxy is dormant | Only protected Zodiacs server calls OpenAI; provider policy is server-owned and `store: false` | Replace loopback wire with protected production API only after App Attest and privacy prerequisites |
| Usage controls | Relay uses 30 requests/minute, two concurrent requests, and 700 completion tokens | Treats these as initial no-looser server ceilings; emits generic `rate_limited` | Freeze authenticated/anonymous quota keys, retry headers, and privacy-safe abuse controls |
| Streaming | PR relay streams provider output and iOS exposes cloud/cancellation errors | Sequenced events are fenced by exact account/session/auth epoch plus context epoch | Map Swift event/error names, account session identity, cancel/reconnect, and late-event scrubbing |
| Retry/idempotency | PR is memory-only and does not publish a durable shared retry contract | Account turn receipt lookup precedes stale-base checks; retries keep logical IDs and use a new attempt ID | Decide anonymous best-effort behavior and implement matching authenticated receipt lookup |
| Consent/entitlement | PR requires cloud consent; production is blocked on App Attest, StoreKit verification, and app privacy policy | Disclosure binds exact context epoch and canonical source/history scope digest; sync and entitlement remain separate | Freeze consent copy/receipt fields and server-to-app entitlement response after StoreKit work |
| Anonymous import | PR is memory-only and has no account-import wire | Server-bound preview plus literal `IMPORT`; saved-person/mixed-account data is rejected; lineage is atomically burned | Decide whether iOS exposes import and share cross-language snapshot/lineage fixtures and device-boundary authority |
| Sync/export/deletion | PR is in-memory and publishes no account sync or owner export/deletion wire | Drafts account ownership/pages/export and requires tombstoned deletion/full-account integration | Reconcile final iOS storage adapter; no current account export/deletion claim may be inferred |
| Provider metadata | Relay fixes model and prompt behavior server-side | Returns only bounded model/prompt/policy version metadata; never hidden prompt or secrets | Agree on exported/support metadata fields while keeping model selection out of clients |

The wire remains `ios_reconciliation_required` until every row above has an
owner and matching Swift/TypeScript fixtures. No schema name in this document
should be treated as a published compatibility promise before that review.

## PR #2 production-gateway reconciliation snapshot

The current read-only comparison target is the hard-disabled
[iOS production Guide gateway PR #2](https://github.com/zodiacs-org/zodiacs/pull/2)
at commit `82726c8c1582fbad50f244c7490c2ec3891c7a5e`. It is stacked on PR
#1 and adds a typed App Attest/StoreKit gateway foundation, not account sync.
Its iOS transport is compiled off, its Worker has no live route or provider
adapter, and it made no provider request or deployment. The PR explicitly
states that its gateway and this website draft are **not wire-compatible**.

The shared safety direction is already aligned: Guide is the product name,
`gpt-5.6-luna` is server-owned model identity, the provider uses the Responses
API with `store: false`, context is untrusted data, saved people are not the
owner, context is bounded and visible, consent and entitlement are separate,
and both rollouts fail closed. The exact remaining wire reconciliation is:

| Area | iOS PR #2 at `82726c8` | Website draft v1 | Exact reconciliation before a live adapter |
| --- | --- | --- | --- |
| Transport authority | Single-use 120-second App Attest challenges, attestation registration, exact raw-body assertion binding, counter replay defense, strict iOS 27 validation-category/build allowlists, and 180-day inactive-key retirement | Supabase bearer-derived account authority or bounded anonymous authority; no client-selected owner | Wrap one shared turn core in separate iOS App Attest/StoreKit and web bearer/anonymous authority envelopes. Never copy App Attest fields into browser authority or accept an account ID from either client body |
| Entitlement | Exact StoreKit transaction JWS; server verifies current product, subscription, grace, refund, and revocation state | Generation entitlement is server-authoritative and separate from account read/sync/export/delete access | Freeze one allow/deny result and stable error mapping while retaining platform-specific proof. A local Plus boolean or account sign-in never grants generation |
| Route and version | `schemaVersion: 1` on `/v1/guide/challenge`, `/v1/guide/attest`, and `/v1/guide/turn` | Named `zodiacs.guide.*.draft.v1` objects and proposed `/v1/guide/turn`, cancel, sync, import, export, and deletion operations | Decide whether transport authority is an outer envelope around one named Guide version, then freeze route/version negotiation and strict unknown-field behavior. Do not alias either draft silently |
| Turn identity | Turn body has locale, base context, attachments, a message suffix, and StoreKit proof; it has no conversation, turn, message, operation, attempt, revision, or context-epoch IDs | Logical and transport IDs, server ordering/revisions, context epoch, consent evidence, and durable replay receipts | Add the shared identity/revision core before account sync or cross-device retry. Preserve PR #2's assertion over the exact final raw bytes |
| Base context | Client sends owner name plus raw `instructions` and `computedFacts` | Account sync stores `facts: null` references and hydrates the self chart from account-v2; prompts are server-owned | Split server instructions from untrusted context data. An authenticated iOS/web turn must reference the account-v2 self chart rather than upload or persist a duplicate chart-facts snapshot |
| Visible source shape | `{id, kind, title, subject, computedFacts}` with kinds `today`, `chart`, `person`, `lookBack`, `reading`, `learn`; subject is `owner` or named `savedPerson` | Stable kind-namespaced IDs/revisions, explicit subject ID/name/`subjectIsUser`, third-party marker, persistence class, and trusted digest/reference | Publish a lossless Swift-to-shared mapping for kind spelling, opaque IDs, source revision, subject boundary, replacement, and invalidation. Names or localized text cannot become identity |
| Saved-person cloud policy | Gateway accepts a named saved person for `person` or `chart` | Draft v1 types the source but rejects it from synced and ephemeral cloud turns under the initial self-chart-only rule | Product/security review must choose either on-device-only saved-person context or a separately disclosed, authenticated, non-persistent overlay. Until then, the shared server rejects it |
| Consent | App has explicit cloud-consent state, but the gateway turn has no consent receipt or exact disclosed-scope binding | Turn evidence binds policy, revision, disclosure ID, context epoch, eligible history, and canonical source-scope digest | Freeze the disclosure copy and evidence fields, bind them inside the App Attest-signed body, and require a new disclosure whenever visible model scope expands. Revocation must cancel/fence and advance the cutoff |
| Daily conversation | Root coordinator remains one memory-only conversation for the device-local day, owner source, and selected language | `general` is not day-bound; optional `daily` has opaque conversation/session IDs plus civil date and IANA zone | Decide that iOS root's mapping, midnight/language/owner rollover, and two-device time-zone collision behavior. Never derive durable conversation identity from a private owner/source key |
| History and cutoff | Sends at most twelve role/content messages and keeps PR #1's local model-history cutoff behavior | Sends eleven eligible post-cutoff history messages plus the new user message; cutoff is a server sequence fenced by context epoch | Freeze role mapping, leading-orphan handling, attach/remove/replace cutoff semantics, and Swift index-to-server sequence fixtures |
| Request limits | 65,536 raw body bytes; 1–12 messages; 0–5 attachments; 8,192 bytes per message; 14,336 bytes per attachment facts; 60,000 aggregate text bytes | Same raw-body and attachment-count ceilings; 9,600 bytes/2,400 code points per message; 14,000 bytes/3,500 code points per facts field; 49,152 bytes for complete model data | Choose one UTF-8/code-point table and share multibyte boundary fixtures. The stricter shared result must be enforced before App Attest signing and again on the server |
| Output | Provider output is capped at 700 tokens and 32,768 UTF-8 bytes | Final Guide message is capped at 2,400 code points/9,600 bytes | Freeze one persisted/displayed message cap and deterministic behavior when provider output exceeds it; do not stream text the final validator cannot commit |
| Streaming | App-owned SSE only: `delta`, `done`, or terminal `error`, without turn/attempt IDs or event sequence | `accepted`, sequenced `delta`, `completed`, `cancelled`, or `error`, plus a separate pre-stream rejection, all owner/context fenced | Freeze one app-owned event envelope with logical identity, sequence, terminal metadata, cancellation, duplicate/gap rules, and late A-to-B/context-revocation scrubbing |
| Errors | HTTP/app codes include attestation, entitlement, spend, concurrency, rate, upstream, timeout, size, cancellation, and internal failures | Stable privacy-safe preflight/stream codes include auth, consent, entitlement, revision/context, size, rate, temporary failure, cancellation, and invalid response | Publish one cross-platform mapping without leaking provider text. Keep App Attest and StoreKit failures transport-specific where clients need distinct recovery |
| Retry and cancellation | Network cancellation and controlled App Attest key rotation exist; no durable logical-turn receipt or provider idempotency is published | Same logical operation replays a reserved/completed/cancelled receipt; only pre-provider failure may start a named new attempt | Add shared logical IDs and receipt-first admission for authenticated turns. Anonymous retries remain best-effort and replace one bubble rather than append another |
| Provider metadata | Server pins `gpt-5.6-luna`, immutable policy, Responses API, `store: false`, and resource ceilings; `done` currently carries no support metadata | Completion permits bounded model, prompt, policy, protocol, and generation-time metadata without prompt text | Freeze the terminal/export metadata fields while keeping model choice, hidden prompt, provider routing, and keys out of both clients |
| Account lifecycle | No conversation account sync, import, paging, export, deletion, retention, or offline conflict wire | Drafts Supabase ownership, explicit anonymous import lineage, paging, encrypted storage, P12M retention, tombstoned conversation deletion, export, and full account deletion | Treat these as a later shared backend milestone. No iOS or website client may claim cross-device history until the storage/deletion contract and cross-language fixtures are implemented |

This PR #2 snapshot is the exact current cross-platform reconciliation point.
The protocol status stays `ios_reconciliation_required`; no website runtime
may import this module and neither client may claim wire compatibility until
the rows above have matching Swift/TypeScript fixtures and reviewed server
adapters.
