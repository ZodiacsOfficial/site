# Zodiac Markets — Market Chat live technical contract

Status: DRAFT design contract. No live-chat implementation, datastore,
credential, environment variable, migration, endpoint, auth flow, or public
configuration is authorized while the corresponding owner risk decision is
DRAFT.

This contract describes a possible one-room Market Chat pilot. It is separate
from the static read-only preview in `src/pro/chat/` and from every quote or
trade capability. Chat failure must never affect charts, quote comparison, or
the Registry trade panel.

## Product boundary

The first live phase has one global public room. Reading does not require a
wallet. Posting requires a separate, explicit `Join Market Chat` action and a
Sign-In With Solana proof. That proof establishes control of one wallet only;
it does not verify a person, age, identity, holdings, expertise, or statement.

The first live phase has no direct messages, replies, reactions, tips, uploads,
images, links, embeds, presence, notifications, edits, custom handles, holder
badges, trading badges, or message-to-order action. Quotes and trades never
depend on joining chat. Chat does not feed price, sentiment, ranking, routing,
or execution logic.

## Isolation and providers

Market Chat uses a dedicated Supabase project, region, billing boundary,
server key, migration root, and data inventory. It must not use
`src/lib/supabase/client.ts`, the existing profile project, the profile auth
session, the trade-wallet session, or existing `supabase/migrations`.

The browser receives no Supabase key and has no direct table write, RPC write,
or broadcast permission. Vercel functions are the only application path to
chat data. A Supabase `service_role` or secret key is migration/admin authority
only and is never loaded by the Vercel runtime. Runtime functions use a
dedicated non-`BYPASSRLS` Postgres role through the project's pooled connection;
that role has no direct table DML and may execute only the reviewed chat
routines and read the bounded public-feed function. Migration/admin and runtime
credentials are separately stored, rotated, audited, and never appear in HTML,
a browser bundle, analytics, a response, or logs.

The first delivery mechanism is bounded, visible-tab, same-origin polling of a
public feed. It is not WebSocket, Server-Sent Events, or a long-held Vercel
function. A later realtime phase requires a new review of authentication,
channel authorization, quotas, CSP, cost, removal convergence, and broadcast
forgery; it is not implied by this contract.

## Independent gates

The existing `PUBLIC_REGISTRY_PRO_CHAT_ENABLED` flag belongs only to the static
preview and never gains live authority. A future implementation would use new,
initially absent gates:

- `PUBLIC_REGISTRY_PRO_MARKET_CHAT_LIVE_ENABLED` to mount the live browser UI;
- `REGISTRY_PRO_MARKET_CHAT_READ_ENABLED` to serve the public feed; and
- `REGISTRY_PRO_MARKET_CHAT_POSTING_ENABLED` to issue challenges, create
  sessions, and post; and
- `REGISTRY_PRO_MARKET_CHAT_SAFETY_ENABLED` to issue purpose-bound appeal
  challenges, end or revoke sessions, report, block, appeal, quarantine,
  remove, restore, mute, or ban.

All are subordinate to `PUBLIC_REGISTRY_PRO_ENABLED`. Public mount, server read,
server posting, safety control, and the database's `reads_enabled`/
`posting_enabled` switches are independent. Posting additionally requires a
current moderator heartbeat. Turning posting off must leave logout, reporting,
blocking, appeals, moderation, and emergency revocation available. The safety
gate is mandatory whenever the live UI or feed is enabled; if it is absent or
unhealthy, live chat fails back to the inert preview rather than operating
without its control plane. Neither a build flag nor a read flag confers posting
authority. All four new env gates remain undefined while this contract is
DRAFT.

## Sign-In With Solana and session boundary

Posting uses the official Wallet Standard Sign-In With Solana flow where
available, with a separately reviewed message-signing fallback only if needed.
The application never asks for a transaction signature to authenticate chat.

The server issues a random challenge with at least 128 bits of entropy and
pins the exact domain, URI, `solana:mainnet` chain, version, consent statement,
issued time, and an expiry no longer than five minutes. Production accepts only
domain `zodiacs.org` and URI `https://zodiacs.org/registry/pro/`. Protected QA
accepts only one exact, owner-authorized deployment hostname and its exact
`/registry/pro/` URI, recorded in the launch receipt and supplied through
server-only environment configuration. The verifier selects one explicit
environment record; it never derives authority from `Host`, `Origin`, or
forwarding headers and permits no wildcard, suffix, branch, or arbitrary
preview hostname. Unknown or mismatched environments fail closed. The server
verifies the complete signed message with a maintained SIWS verifier and
atomically consumes the nonce once. It does not hand-roll Ed25519, base58, or
message parsing. Supabase Web3 Auth is explicitly not used because it would
persist a wallet identity and issue a Supabase session, violating the transient
wallet and opaque application-session boundary here.

The raw wallet exists transiently only during verification. Persistent member
identity uses a keyed HMAC held by the dedicated chat service. The public UI
shows only a generated cosmic alias and never a wallet address. Successful
verification creates a random opaque session whose digest, not plaintext, is
stored. The cookie is host-only, `Secure`, `HttpOnly`, `SameSite=Strict`, and
limited to `/api/market-chat`; sessions rotate on authentication and support
logout, revocation, idle expiry, and absolute expiry.

A revoked or banned member may request one separate, purpose-bound appeal SIWS
challenge while posting is disabled. Its exact consent statement says that it
submits one moderation appeal and does not create or restore a posting session.
Successful verification identifies the existing wallet HMAC only for a bounded
appeal submission; it issues no general session or posting authority and is
rate-limited, single-use, short-lived, and governed by the safety gate. This
path remains available when member session creation or posting is off.

## Data model and database authority

The dedicated database separates public display data from private authority:

- `chat_public.messages` contains a random message ID, fixed global-room ID,
  random public author ID, generated alias, optional topic sign, nullable
  body, closed moderation state, database-authored timestamps, and no wallet,
  IP, auth token, or private identifier.
- `chat_private.members` contains the versioned wallet HMAC, public author ID,
  generated alias, status, rate counters, and mute or ban expiry.
- private challenge, session, message-owner, report, evidence, moderator,
  moderation-audit, member-block, appeal, and configuration tables contain only
  the fields required for their named purpose.

Row Level Security is enabled on every table. Default privileges are revoked.
`public`, `anon`, and `authenticated` receive no table, sequence, function, or
private-schema write grants. Browser roles have no policy that can insert,
update, delete, moderate, or broadcast. The runtime database role has no
`BYPASSRLS` and no direct table DML; it can execute only reviewed, atomic
routines that consume a challenge, open or close a session, post, report,
block, appeal, moderate, read the safe feed, and prune retention data. Routines
are `SECURITY DEFINER` only where the no-DML runtime role requires it. They are
owned by a dedicated no-login, non-`BYPASSRLS` function role, use an empty fixed
`search_path` and fully qualified objects, revoke `EXECUTE` from every default
role, validate all authority internally, and use transactional row locks. Table
RLS is forced where ownership could otherwise bypass it. Migration/admin roles
cannot be selected by the runtime connection.

Moderator identity uses a separate moderator-only auth tenant and session in
the dedicated chat project, with MFA/AAL2 and a cookie namespace distinct from
both member SIWS and profile/email auth. Every moderation action performs a
current server-side `chat_private.moderators` lookup. Client metadata, member
wallet status, generated aliases, and stale token claims never grant authority.

## Same-origin API

The proposed API is limited to:

- `POST /api/market-chat/challenge` for a short-lived SIWS challenge;
- `POST /api/market-chat/session` for proof verification and session creation;
- `POST /api/market-chat/logout` for rotation-safe session revocation;
- `GET /api/market-chat/feed` for the latest bounded public rows;
- `POST /api/market-chat/messages` for one plain-text message;
- `POST /api/market-chat/reports` for one message ID and closed reason;
- `GET /api/market-chat/preferences` for the signed-in member's blocked public
  author IDs and locally hidden message IDs only;
- `POST` or `DELETE /api/market-chat/blocks` for a member's private block list;
- `POST /api/market-chat/appeal-challenge` for the appeal-only SIWS proof;
- `POST /api/market-chat/appeals` for one bounded appeal against a member action,
  authenticated by either a current member session or that appeal-only proof;
- a separately protected moderator API with current role and MFA checks.

Every route enforces exact method, same origin, content type, body shape and
size, independent server and database kill switches, a named Vercel Firewall
rule, short downstream deadlines, and closed error enums. It logs no raw body,
message, wallet, nonce, signature, cookie, alias, report, or provider secret.
Every non-feed response is `private, no-store`. The preferences response is
private, bounded, contains no wallet or another member's private identifier,
and is filtered client-side against the public rows. The feed ignores cookies,
never varies by member, returns at most 200 safe public rows, and is shared-
cached for no more than two seconds so a removal converges promptly. A cookie-
varying or personalized response must never enter that shared cache.

## Posting and abuse limits

Messages are plain text, at most 280 grapheme clusters and 1,024 UTF-8 bytes.
Display uses text-safe DOM operations. Normalization and policy scanning reject
bidi overrides, zero-width abuse, external URLs or domains, Solana and EVM
addresses, transaction signatures, contact handles, referrals, and known
scam/impersonation patterns. The first three accepted posts use a 30-second
slow mode; later posts are limited to one per eight seconds, ten per rolling
ten minutes, and forty per UTC day per member. An exact normalized duplicate
is rejected for 24 hours.

Reports use the closed reasons `spam`, `scam`, `manipulation`, `harassment`,
`impersonation`, `privacy`, `threats`, and `unlawful_content`; they are limited
to one per reporter and message and five per hour per member. A report hides
the message locally for that reporter but never creates an automatic permanent
ban. Any automatic temporary quarantine threshold requires explicit owner
approval and human review.

Database member limits are atomic across tabs. A higher Vercel Firewall limit
uses source IP and available bot signals to slow wallet Sybil attacks. Missing
firewall, database, moderator heartbeat, or configuration fails posting closed
without degrading public reading or any market feature.

## Moderation and retention

Before posting opens, named moderators can quarantine, remove and restore
messages; issue 15-minute, one-hour and 24-hour mutes; apply timed or permanent
bans; revoke sessions; pause posting; review reports; and record appeals. Every
action appends a closed-field, tamper-evident audit entry containing a monotonic
sequence, the previous entry hash, and a hash of its canonical content. A
dedicated no-login audit owner permits append only through one reviewed routine;
the runtime and moderator roles cannot update or delete audit rows, and database
triggers reject either operation. A periodic digest is exported to a separate
append-only receipt boundary so later administrative tampering is detectable;
the receipt contains no message text or visitor identifier. Public removals are
tombstones; a reported or removed original may exist only in the private
evidence store. Posting automatically becomes read-only when no moderator
heartbeat is current.

Proposed retention periods are decision inputs, not approved values: challenges
ten minutes; sessions 24 hours idle and seven days absolute; IP/rate HMACs 24
to 48 hours; ordinary messages and public author linkage 30 days; member wallet
HMAC, alias linkage and ordinary counters 30 days after the last retained post
or session unless a longer active ban applies; closed report metadata 90 days;
reported evidence 90 days after closure unless subject to legal hold; expired
bans 90 days; moderation audit one year. Private blocks persist until removed
or the member account is deleted; appeals follow their associated evidence
schedule. The owner and counsel must approve exact periods, deletion/export
behavior, legal holds, backup retention, and incident access before
implementation.

Every wallet HMAC stores a key version. Rotation keeps retired keys encrypted
only long enough to match and atomically migrate a returning member or to honor
an active ban/evidence schedule; it cannot reconstruct a raw wallet. The launch
plan defines key compromise response, retirement, deletion, and how unmatched
historical member rows are expired rather than silently orphaned.

## Testing and launch evidence

Tests must cover SIWS alteration, wrong domain/URI/chain, an exact protected-QA
origin and rejection of wildcard or Host-derived previews, expiry, replay and
concurrent replay; cookie scope, rotation and revocation; logout while posting
is disabled; API method/origin/body fuzzing; missing WAF/database/configuration;
RLS and grant matrices; forged roles; moderator AAL2 freshness; atomic counters;
bans and mutes; private block and local-hide confidentiality; purpose-bound
appeals by banned or session-revoked members while posting is off, with no
posting-session creation; Unicode, address, link, XSS and duplicate bypasses;
moderation races and tombstones; attempted audit update/delete, hash-chain and
external-receipt verification; retention and legal hold; keyboard, screen-
reader, autoscroll and 320px behavior; abuse/load/cost limits; posting shutdown
with the safety plane still available; and rollback to read-only.

The launch receipt records the dedicated project and region, non-secret key
identifier, migration hash, published firewall rules, moderator roster and
heartbeat test, Privacy/Terms/conduct publication, security review, load test,
retention job, spend alerts, kill-switch drill, and exact pilot start/stop
times. It records no secret or visitor content.

## Change boundary

This DRAFT permits design review only. Schema creation, migrations, provider
provisioning, auth or wallet code, endpoints, browser networking, moderation
tools, secrets, environment flags, analytics, and deployment all wait for the
separate owner decision to be read and explicitly ratified. Realtime delivery,
additional rooms, custom profiles, rich content, DMs, monetization, trade
integration, or 24/7 operation each require another dated review.

Primary implementation references:

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Securing the Supabase Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Sign-In With Solana reference](https://github.com/phantom/sign-in-with-solana)
