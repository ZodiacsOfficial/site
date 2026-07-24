# Phase 4 sharing loop — integration decisions

Status: binding reconciliation for implementation
Fable handoff: `9809c3d247c0c6a0c1ecaf20cbddd51c0cea0795`
Sol contract: `c78cd18`

Fable's handoff controls reader experience, final English copy, layout,
motion, and acceptance proofs. The Sol contract controls secrets, stored
data, authentication, authorization, retention, and failure behavior. This
record resolves the few places where the two documents describe different
hidden mechanics.

## Decisions

1. **Invitation secret:** use 32 random bytes (256 bits), encoded as
   43-character unpadded base64url. The 22-character example in the Fable
   handoff is not used as invitation authority. A separate 22-character
   browser-session handle is described below. The visible component expands
   to the available width, so this changes no copy or interaction.
2. **Secret persistence:** persist only the SHA-256 digest. The raw secret is
   returned once at creation and may be kept by that browser for its Copy
   action. The account register remains available across devices for status
   and revocation, but another device cannot reconstruct or copy the original
   link. This is the deliberate cost of making a database leak insufficient
   to open invitations.
3. **Path exchange and tab isolation:** `/c/{secret}/` mints a separate random
   128-bit, 22-character session handle. It stores the raw invitation secret
   only in a Secure, HttpOnly, SameSite=Lax cookie whose name is scoped by that
   handle and whose path is `/api/compatibility`, then redirects with `303` to
   `/compatibility/#invite={handle}`. The fragment contains a non-secret
   selector, never invitation authority. The compatibility island validates
   the handle, removes it from the address bar, and identifies the matching
   cookie on session and completion calls with `?session={handle}` and an
   empty request body. Different invitation tabs therefore cannot overwrite
   or complete one another. Malformed handles fail closed without a network
   request; completion replays retain the same handle-to-cookie binding. This
   preserves Fable's arrival experience while removing the raw secret before
   page analytics and client code run.
4. **Payload source:** the browser submits only the synchronized chart ID,
   consent, and notification choice. The server authenticates the
   account, reads that account's chart row, and derives the positions wire.
   It never trusts client-supplied positions or owner identity.
5. **Positions grammar:** reuse `share-positions.ts` exactly: twelve canonical
   bodies, house system, engine version, and the optional ASC/MC pair. The
   time-known value is derived from whether angles exist. Retrograde state is
   not required by the existing relationship reading and is not stored.
6. **One reading:** the first accepted completion atomically marks the
   invitation completed and destroys both positions and secret digest.
   Later opens return `used` without label, sign, or positions. Revocation and
   expiry perform the same authority destruction.
7. **Retention:** positions and secret authority disappear at close.
   Positions-free operational status, event, and delivery evidence remains
   for 30 days, then is deleted. This supersedes Fable's seven-day skeleton
   example and matches the owner-approved Sol contract.
8. **Completion email:** use a separate delivery claim plus the provider's
   idempotency key. `notify_sent_at` alone is not sufficient across a worker
   crash. The message and consent remain exactly as Fable specified.
9. **Owner chart reference:** verify the synchronized chart in the create
   request and then discard its ID. The invitation stores no birth input and
   no chart ID.
10. **Feature partition:** `COMPAT_INVITES_ENABLED` gates create and open.
    Status, revocation, completion replay, notification finalization, and
    cleanup remain available whenever the server contract exists. Public UI
    remains independently gated by `PUBLIC_COMPAT_INVITES_ENABLED`. Creation
    also requires an exact `COMPAT_INVITE_TEST_USER_IDS` match; a missing or
    empty list denies everyone and is never an implicit public mode.
11. **Return links:** Fable's `#s=` positions-only codec remains fully
    client-side. It carries no birth input and makes no invitation-server
    write.
12. **No score:** no numeric compatibility score is introduced anywhere.
13. **Terminal response:** completed, revoked, expired, malformed, and unknown
    links share one unavailable response after authority is destroyed. The
    page does not expose a token-status oracle. Fable's closed/used/invalid
    boards remain visual references for the single calm unavailable treatment.
14. **Owner hiding:** a positions-free `owner_hidden_at` timestamp supports
    Fable's “Remove from this list” action without deleting required
    operational evidence early.
15. **Analytics names:** use Fable's reader-funnel names (`invite_created`,
    `invite_opened`, `invite_completed`, `invite_returned`,
    `invite_converted`, `invite_revoked`) with its exact closed enums.
    Cancelled native share emits nothing. The Sol privacy filter and forbidden
    property rules remain binding.
16. **Existing fragments:** current fragment invitations remain available and
    decodable. The account invitation panel is an additive signed-in upgrade,
    not a migration or removal.
17. **Expiry sweep:** the hourly authenticated sweep is required release
    infrastructure, not optional cleanup. Lazy cleanup remains defense in
    depth.
18. **Completion share set:** the existing compatibility picture remains the
    send-back artifact. When B's chart has angles, the already reviewed Big
    Three picture is also available on the completed invitation and uses
    positions only; no birth input is reconstructed. A saved invitation
    comparison restores settled and retains the send-back actions, while the
    one-time conversion prompt and server completion signal remain fresh-open
    only.

These decisions require no new reader-facing copy before Fable's bounded
implementation review. The register's Copy action is simply unavailable on a
device that does not possess the creation secret; the review will ratify the
quiet unavailable treatment.
