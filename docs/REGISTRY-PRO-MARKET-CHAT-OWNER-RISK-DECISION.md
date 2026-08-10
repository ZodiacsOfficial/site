# Market Chat for Zodiac Markets — owner risk decision

Status: DRAFT — pending owner ratification. The Market Chat flag stays off in
every public environment while this record is DRAFT. Merging a read-only shell
does not authorize enabling it, accepting messages, identifying visitors, or
creating a chat datastore.

Approved: (pending)

Scope: an independently gated, static, read-only `Market Chat` preview inside
`/registry/pro/`; project-authored fixture/status messages only; no network
request, realtime subscription, authentication, wallet request, composer
submission, user-generated content, persistence, moderation action, or chat
analytics.

This decision is deliberately separate from the Zodiac Markets quote decision.
A market terminal does not create authority to collect speech or identity, and
a quote-workspace approval does not authorize a market chat.

The visitor-facing and internal feature label is `Market Chat`, with
`read-only preview` stated beside it. The earlier category nickname is retired
and must not appear in shipped source, a generated bundle or visitor copy. The
label must not imply that displayed fixture messages came from visitors or are
live.

## What this record could authorize

If ratified, this record could authorize only the static shell already bounded
in the Phase 1 technical contract. It may demonstrate layout, density, empty
states, rules, and moderation affordance vocabulary using project-authored
fixtures. It cannot send or receive a message.

The shell has no `fetch`, WebSocket, EventSource, Supabase client, wallet
adapter, sign-in, session, composer submission, local-storage queue, service
worker message cache, or server endpoint. Fixture text is rendered as text,
not HTML. Any apparent compose control is absent or unambiguously disabled and
explains that posting is not available.

`PUBLIC_REGISTRY_PRO_CHAT_ENABLED=1` is an independent build-time gate and has
no effect while `PUBLIC_REGISTRY_PRO_ENABLED` is off. Neither flag is currently
authorized in a public environment. This preview flag can never enable posting
or be repurposed as a live-chat gate; the DRAFT live contract reserves separate
public, read, write, and database switches.

## Why live chat is not a small follow-up

Live market chat creates a new trust boundary even if it never touches a
trade:

- wallet sign-in links a durable public key to speech and may cause visitors to
  mistake authentication text for a transaction request;
- usernames and messages can contain personal data, harassment, spam, scams,
  impersonation, manipulated market claims, malicious links, and wallet-address
  bait;
- realtime presence and metadata can expose activity patterns;
- deletion, retention, user blocking, moderator access, appeals, evidence
  preservation, legal requests, and incident response become operating duties;
- sharing an auth client with existing profile/email features could replace or
  link sessions across contexts that visitors reasonably expect to be
  separate;
- reusing the trade wallet could make a voluntary social identity appear
  necessary for quote or trade access.

For these reasons, this record cannot be amended by merely changing `read-only`
to `live`. The proposed live boundary is documented separately in
`docs/ZODIAC-MARKETS-MARKET-CHAT-LIVE-TECHNICAL-CONTRACT.md` and
`docs/ZODIAC-MARKETS-MARKET-CHAT-LIVE-OWNER-RISK-DECISION.md`; both remain
DRAFT and confer no implementation authority.

## Mandatory controls for the read-only preview

1. The Market Chat flag is off by default, absent from committed flag-on bytes,
   and independently reversible. Enabling Zodiac Markets does not implicitly
   enable Market Chat.
2. The rendered label says `read-only preview`; no fixture is labelled as a
   visitor, trader, verified holder, moderator action, or live message.
3. The shell makes zero chat-related network requests and opens no realtime
   connection. Tests pin the absence of fetch, WebSocket, EventSource,
   Supabase, wallet signing, auth, and write paths. They also pin the exact
   two-file `src/pro/chat/` inventory and the absence of Market Chat APIs or a
   migration root while the live record is DRAFT.
4. The existing `src/lib/supabase/client.ts` profile session and the existing
   Registry trade wallet state are not imported, observed, or reused.
5. There is no enabled composer, reaction, report, reply, direct-message,
   profile, presence, mention, link-preview, upload, or notification control.
6. Fixture content is repository-authored, length-bounded, sanitised, and
   inserted with text-safe DOM operations. It contains no clickable external
   link, wallet address, price exhortation, impersonated endorsement, or claim
   of real-time market activity.
7. No fixture interaction writes cookies, local storage, IndexedDB, Cache
   Storage, a database, analytics free text, or a server log beyond ordinary
   page-request infrastructure.
8. Market Chat remains subordinate to the Zodiac Markets master gate, `noindex`,
   and subject to the route's CSP and emergency rollback.
9. The preview is turned off immediately if it is mistaken for live visitor
   speech, if any chat network request appears, or if a disabled interaction
   accepts or persists input.

## Minimum decision package for future live chat

No implementation work on live chat starts until the owner receives and
ratifies a separate package covering at least:

- an isolated auth/session boundary, preferably a separate Supabase project or
  equivalently isolated client and storage namespace, so chat cannot replace or
  join profile/email sessions;
- a precise Sign-In With Solana challenge contract if wallet identity is used:
  domain, URI, nonce, issued/expiry times, chain, statement, replay prevention,
  server verification, session rotation, logout, and a clear distinction from
  transaction signing;
- optional rather than coercive identity, with quote access independent of
  posting and no transmission of a wallet merely to read;
- server-authoritative roles and Row Level Security, least-privilege grants,
  migration review, and tests proving users cannot forge moderator identity,
  edit others' messages, bypass bans, or read non-public moderation data;
- rate limits, duplicate/spam controls, Unicode and confusable handling, length
  and byte limits, link and wallet-address policy, reporting, blocking, mutes,
  bans, appeals, moderator audit trails, and an emergency global write kill;
- clear market-manipulation, promotion, impersonation, threat, harassment,
  privacy, and illegal-content rules plus named human moderation coverage;
- retention periods for messages, reports, auth challenges, sessions, IP/security
  logs, bans, and moderator evidence; deletion/export paths and legal-hold
  behavior;
- updated Privacy, Terms, disclosure, CSP, data inventory, subprocessors,
  incident response, abuse contact, launch staffing, and rollback exercises;
- privacy-safe telemetry that never captures message text, wallet addresses, or
  auth challenges.

Choosing Supabase, another datastore, or a wallet-signature library is an
implementation decision only after these policy decisions exist. A provider
integration does not supply moderation or legal posture by itself.

## Phase boundary

If ratified, this record authorizes only an independently gated, static,
read-only Market Chat preview. It does not authorize reading visitor messages,
posting, identity, SIWS, Supabase, persistence, realtime delivery, presence,
moderation powers, analytics on speech, uploads, notifications, or any linkage
between a wallet and public speech.
