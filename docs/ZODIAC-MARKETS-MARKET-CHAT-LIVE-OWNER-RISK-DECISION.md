# Zodiac Markets — live Market Chat owner risk decision

Status: DRAFT — pending owner review and explicit ratification. No live-chat
implementation work, provider provisioning, migration, credential, environment
variable, endpoint, externally shared QA, or Production enablement is
authorized while this record is DRAFT.

Approved: (pending)

Scope proposed for decision: one optional, global, public Market Chat room
inside `/registry/pro/`; anonymous reading; explicit Sign-In With Solana solely
to post; generated aliases; plain-text messages; same-origin bounded polling;
dedicated Supabase project; server-only writes; human moderation; no connection
to quote or trade capability.

This record would supersede neither the Zodiac Markets quote decision nor the
static-preview decision. The quote workspace can operate with Market Chat off.
The static preview may remain inert even if this record is never ratified.

## Decision still required

The owner must decide whether the community benefit is worth permanent duties
around identity, public speech, scams, market manipulation, harassment,
privacy, moderation, retention, deletion, legal requests, provider cost, and
incident response. A wallet proof makes abuse more attributable but does not
prove a person, prevent Sybil wallets, or make a statement true.

Before ratification, qualified counsel must record the service's legal operator
and jurisdiction, permitted visitor ages and locations, applicable user-
generated-content and crypto-market rules, sanctions/eligibility controls,
content-removal and legal-request procedures, and approved Privacy, Terms,
conduct, retention, subprocessor and appeal text in every published locale.

The owner must also choose and record:

- the dedicated Supabase project region, plan, spend ceiling, backup posture,
  DPA/subprocessor treatment, secret rotation owner, and non-secret project ID;
- exact message, session, security-HMAC, report, evidence, moderation-audit,
  backup, deletion and legal-hold retention periods;
- named moderators, staffed hours, response targets, escalation coverage,
  appeal owner, incident lead, and when posting automatically becomes read-only;
- the Vercel plan and exact named rate-limit rules for challenge, session,
  posting, reports and feed abuse, including keys, limits, windows and action;
- the separate moderator identity provider, MFA/AAL2 policy, session lifetime,
  recovery process and roster authority, with no reuse of profile/email auth;
- whether an automatic temporary quarantine threshold is allowed and, if so,
  its exact independent-reporter threshold and review deadline;
- a bounded pilot start/end date, reader/poster ceiling, cost ceiling, success
  measures, daily review evidence and stop conditions.

## Mandatory controls if ratified

Ratification would authorize implementation only after the owner approves the
final technical contract and every item below is testable. It would not itself
authorize a public flag.

1. Market Chat uses its own Supabase project, migrations, server credential,
   session namespace and data inventory. Existing profile/email Supabase auth,
   the profile database, and the Registry trade wallet are never reused or
   linked.
   Migration/admin authority is separate from a least-privilege, non-`BYPASSRLS`
   runtime role that has no direct table DML and only reviewed function grants.
2. Public reading requires no wallet. Posting requires a separate, explicit
   consent action and a SIWS message that cannot be interpreted as a transaction.
   Quotes and trades remain fully available without joining chat. Production
   and protected QA each pin one exact domain and URI in server configuration;
   no Host-derived or wildcard preview origin is accepted. Supabase Web3 Auth
   is not used because the raw wallet is transient and the app owns the opaque
   chat session.
3. The raw wallet is transient during verification and never displayed. Stored
   identity is a dedicated keyed HMAC; public identity is a generated alias.
   Chat proves wallet control only, never identity, holdings or credibility.
4. Every browser write goes through a same-origin Vercel endpoint. Browser roles
   cannot insert, update, delete, moderate, call write RPCs or broadcast. RLS,
   revokes, atomic routines and role-matrix tests enforce this boundary.
5. The first transport is bounded polling. WebSockets, Realtime, SSE, presence,
   DMs, replies, reactions, tips, uploads, images, links, embeds, edits,
   notifications and custom profiles are excluded.
6. Plain-text length, byte, Unicode, address, link, contact, duplicate, spam and
   rate controls run before persistence. Closed report reasons include threats
   and unlawful content as well as spam, scams, manipulation, harassment,
   impersonation and privacy. Rendering uses text-safe DOM APIs. No visitor
   content or identifier enters Plausible or trade telemetry.
7. Named moderators and an appeal path exist before posting. Posting fails
   closed outside staffed coverage. Mutes, bans, session revocation, quarantine,
   removal, restoration, evidence handling and an append-only, hash-chained,
   externally receipted audit are operational and tested before public QA.
   Moderator auth is separate from both member SIWS and profile/email auth and
   requires fresh MFA/AAL2 plus a current database role. Audit roles cannot
   update or delete entries, and tamper tests are part of acceptance.
   A revoked or banned member can use a short-lived, single-use, appeal-only
   SIWS proof under the safety gate; it cannot create or restore a posting
   session and remains available while posting is shut down.
8. Privacy, Terms, conduct rules, retention, deletion/export, legal hold,
   subprocessor, abuse-contact, incident and law-enforcement procedures are
   approved and published before any visitor data is collected.
9. Independent client, member and edge limits; CAPTCHA or equivalent abuse
   controls; budget alerts; maximum reader/poster load; database timeouts; and
   server/database posting kill switches are configured and tested. Missing
   protection makes posting unavailable. Turning posting off leaves logout,
   reporting, blocking, appeals, moderation and emergency revocation available.
   A separate safety gate is mandatory whenever live reading is enabled; its
   failure returns the product to the inert preview.
10. The browser bundle contains no Supabase server key, raw provider origin,
    moderator secret or hidden write authority. Logs and errors contain no raw
    message, wallet, nonce, signature, cookie, report or alias.
11. Chat is independently gated and remains subordinate to the Zodiac Markets
    master flag and `noindex` posture. Turning chat off restores the existing
    inert shell without changing market or quote behavior.
    `PUBLIC_REGISTRY_PRO_CHAT_ENABLED` remains static-preview-only. Live mount,
    server reads, member posting and safety controls use the separately named
    gates in the live technical contract, and database posting has its own kill
    switch. The public feed is shared and cookie-independent; a separate private,
    no-store preferences response supplies only the signed-in member's block and
    local-hide state for client-side filtering.
12. A security review covers SIWS parsing and replay, exact environment origins,
    session fixation and CSRF, RLS/grants, forged moderator roles and AAL2
    freshness, private block/hide state, appeals after ban or revocation,
    XSS/Unicode bypass, ban evasion, audit tampering, database concurrency,
    logging, dependency and supply-chain risk before protected QA.
13. Abuse/load tests, moderation drills, data deletion, retention pruning,
    incident response and rollback are exercised in a protected environment.
    The launch receipt records results without visitor content or secrets.
14. The pilot stops immediately on identity or secret exposure, forged system
    or moderator authority, unmoderated posting, scam or manipulation controls
    failing materially, unlawful content with no response path, retention drift,
    unexpected browser writes, budget breach, or rollback failure.

## Explicit exclusions

This proposed decision does not authorize transaction signing, wallet balances,
holder or trader verification, trade advice, sentiment-to-execution links,
promoted messages, fees, tips, token-gated speech, private rooms, direct
messages, rich media, public wallet profiles, chat analytics on content, model
training on messages, sale of data, additional social providers, or reuse of
existing user/profile data.

## Phase boundary

While this record is DRAFT, the only permitted Market Chat artifact is the
independently gated static read-only preview already described by
`docs/REGISTRY-PRO-MARKET-CHAT-OWNER-RISK-DECISION.md`. The DRAFT live technical
contract is planning material, not implementation authority. The owner must
read the final documents and ratify this record by name before live-chat work
begins; a general request for a chatroom, a quote-workspace approval, or a flag
instruction does not substitute for that ratification.
