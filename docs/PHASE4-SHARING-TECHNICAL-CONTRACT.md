# Phase 4 — Private sharing loop technical contract

Status: implementation-ready Sol contract  
Baseline: `734c36ff960d4743ac268ab6368bd915d063ed4f`  
Scope: Phase 4 compatibility invitations and shareable result cards only

This contract turns the Master Plan's Phase 4 sharing loop into a bounded,
testable implementation. It preserves the site's local-first privacy model:
birth inputs stay in the visitor's browser, invite links carry no raw birth
inputs, and a recipient's chart is never written to the server unless that
person separately chooses to save it through the existing account flow.

The reader experience and final English copy remain Fable's authority. If
Fable's Phase 4 handoff conflicts with a security, retention, or data-boundary
rule below, the safer rule in this document wins and the discrepancy must be
resolved explicitly before implementation.

## 1. Fixed release boundary

The first release is:

- English only.
- Available only to signed-in inviters who select one synchronized saved
  chart.
- Hidden unless both `PUBLIC_COMPAT_INVITES_ENABLED=1` and
  `COMPAT_INVITES_ENABLED=1`.
- Restricted in production by `COMPAT_INVITE_TEST_USER_IDS` until the canary
  is complete.
- A new private recipient route at `/c/`, with token exchange at `/c/{token}`.
- One orchestrated relationship-wheel motion, plus existing native share and
  PNG download behavior.

The first release is not:

- A public directory, social graph, contact importer, referral program, or
  messaging system.
- A replacement for account sync or the existing device-local saved-pair
  feature.
- A reason to enable public Daily Email, public Sky Alerts, Phase 4 in other
  locales, or any Phase 5/6 feature.
- Permission to store either person's birth date, birth time, place,
  coordinates, timezone, email, free-text message, or complete saved chart in
  an invite.

All non-English compatibility routes and the existing feature-off English
route keep their current behavior and rendered output.

## 2. Existing surfaces to reuse

Implementation must build on, not duplicate:

- `src/islands/SynastryCalculator.tsx` for the relationship calculator,
  bi-wheel, aspect grid, composite view, and device-local saved pairs.
- `src/lib/engine/synastry.ts` for engine-free comparison of computed body
  positions.
- `src/lib/profile/schema.ts` for the synchronized chart summary already
  available to a signed-in owner.
- `src/lib/share-card.ts` and `src/lib/compatibility-card.ts` for client-side
  PNG rendering.
- `src/lib/share.ts` for strict, fragment-only client handoff patterns.
- `src/lib/analytics.ts` and `src/lib/analytics-config.mjs` for cookieless,
  allowlisted analytics.

The current full-birth-input compatibility fragment remains available while
the new flags are off. With both Phase 4 flags on, the English invitation CTA
uses this contract. No other locale changes in this release.

## 3. Reader flow

### 3.1 Inviter

1. The inviter signs in.
2. They choose exactly one synchronized chart they own.
3. They see a concise disclosure of what will and will not be shared.
4. They optionally choose "Tell me when they finish." This consent applies
   only to this invitation and is off by default.
5. The server creates one 14-day invitation and returns its URL once.
6. The inviter may copy/share the URL, view its status, or revoke it from
   their profile.

No device-only chart is eligible. Creating an invitation never silently syncs
a chart.

### 3.2 Recipient

1. The recipient opens `/c/{token}`.
2. The server exchanges the token for a short-lived, private capability
   cookie and redirects to `/c/`, removing the token from the visible URL
   before page analytics can load.
3. `/c/` explains whose chart is waiting using only the inviter-selected
   label and Sun sign.
4. The recipient enters their own birth details in the existing local
   calculator.
5. Their chart and the compatibility result are computed locally.
6. Completion writes only the invitation's completion state and time.
7. The recipient may download/share a compatibility card, begin their own
   saved chart flow, or generate a positions-only private result link to send
   back.

The recipient's form submission must never make a network request containing
birth input, positions, a chart label, or calculated interpretation.

### 3.3 Return result

"Send result back" is a client-side action:

- Render the existing compatibility PNG locally.
- Offer native share when supported, with download fallback.
- Optionally create a versioned URL fragment containing the two minimum
  computed-position payloads.
- State plainly that anyone with that private link can read the result.

It performs no invitation-table update and sends no email or push.

## 4. Minimum invite payload

The only astrology payload stored for the inviter is:

```ts
export const COMPAT_INVITE_BODY_ALLOWLIST = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

export interface CompatibilityInvitePayloadV1 {
  version: 1;
  label: string;
  engineVersion: string;
  timeKnown: boolean;
  sunSign:
    | 'aries' | 'taurus' | 'gemini' | 'cancer'
    | 'leo' | 'virgo' | 'libra' | 'scorpio'
    | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';
  bodies: Array<{
    body: typeof COMPAT_INVITE_BODY_ALLOWLIST[number];
    lon: number;
    retrograde: boolean;
  }>;
  angles: { asc: number; mc: number } | null;
}
```

Validation is strict:

- `version` must equal `1`.
- `label` is trimmed, 1–48 Unicode characters, control characters removed.
- `engineVersion` is 1–32 characters from `[A-Za-z0-9._-]`.
- `bodies` contains exactly the ten allowlisted bodies, once each.
- Longitudes are finite numbers normalized to `[0, 360)`, with at most six
  decimal places.
- `angles` is required when `timeKnown=true` and must be `null` when false.
- `sunSign` must equal the sign derived from the submitted Sun longitude.
- Unknown keys, additional bodies, and oversized JSON are rejected.
- The canonical serialized payload must be no more than 4 KiB.

The server derives this payload from the synchronized chart row it reads. It
does not trust a browser-supplied payload or owner identity.

The invite must not store:

- Birth date or time.
- Place name, latitude, longitude, timezone, or country.
- The saved chart's full birth object or flags.
- The inviter's email.
- The recipient's label, birth input, positions, email, or account identity.
- A message, note, or other free text.

## 5. Token and browser capability

- Generate 32 random bytes with the platform cryptographic generator.
- Encode as base64url without padding.
- Return the raw token only in the one successful creation response.
- Store only `SHA-256(rawToken)` as 64 lowercase hexadecimal characters.
- Never log, trace, email, analyze, or persist the raw token.
- Use constant-shape failure responses for unknown, expired, revoked, and
  already-purged tokens.

`GET /c/{token}` is rewritten to the exchange function. On success it:

1. Hashes and validates the token.
2. Sets `zodiacs_compat_invite` to the raw bearer token using:
   `Secure; HttpOnly; SameSite=Lax; Path=/api/compatibility; Max-Age=<remaining>`.
3. Responds `303 See Other` to `/c/`.

The cookie lifetime never exceeds the invitation's remaining lifetime. The
cookie is cleared when the invite is expired, revoked, or purged.

The recipient page never receives the raw token in HTML or JavaScript.

## 6. Database contract

The implementation migration creates three server-owned tables. Every table
has RLS enabled, no browser policies, all privileges revoked from `public`,
`anon`, and `authenticated`, and only the minimum service-role privileges.

### 6.1 `compatibility_invites`

Required fields:

| Field | Contract |
| --- | --- |
| `id` | UUID primary key |
| `owner_user_id` | Auth user UUID, indexed |
| `owner_chart_id` | UUID for an existing chart owned by the same user |
| `token_hash` | Unique 64-char lowercase hex; nullable only after authority is destroyed |
| `payload` | Validated JSONB payload V1; nullable only after authority is destroyed |
| `notify_on_complete` | Boolean, default false |
| `created_at` | Server UTC |
| `expires_at` | Exactly `created_at + interval '14 days'` |
| `opened_at` | First valid exchange UTC, nullable |
| `completed_at` | First valid completion UTC, nullable |
| `revoked_at` | Owner revocation UTC, nullable |
| `authority_destroyed_at` | UTC when token/payload were nulled |
| `delete_after` | Thirty days after terminal state |

The owner chart relation must prove same-owner ownership. If the existing
charts schema cannot express a composite foreign key safely, the creation RPC
must lock and verify `(chart.id, chart.user_id)` in the same transaction.

Authority ends at the earlier of expiry or revocation. Revocation and expiry
immediately null both `token_hash` and `payload`; completion retains them only
until natural expiry so the recipient can reopen the result during the
original 14-day window. `delete_after` is thirty days after authority ends,
not thirty days after an early completion.

### 6.2 `compatibility_invite_delivery_claims`

One row per invite and channel:

| Field | Contract |
| --- | --- |
| `invite_id` | FK, cascade delete |
| `channel` | Initially only `email` |
| `state` | `reserved`, `sent`, or `failed` |
| `owner_token` | Random worker-claim UUID |
| `recipient_hash` | Keyed HMAC of resolved account email, never raw email |
| `provider_receipt` | Provider ID, nullable |
| `provider_status` | Bounded fixed enum/HTTP code, nullable |
| timestamps | Claim, finalize, and update UTC |

Primary key `(invite_id, channel)` makes completion notification at-most-once.
A failure is evidence, not permission for an unbounded automatic retry.

### 6.3 `compatibility_invite_events`

This is a bounded operational ledger, not product analytics:

| Field | Contract |
| --- | --- |
| `invite_id` | FK, cascade delete |
| `event` | `created`, `opened`, `completed`, `revoked`, `expired`, `purged` |
| `occurred_at` | Server UTC |

No IP, user agent, URL, token, label, chart ID, payload, or recipient data is
stored. At most one row per `(invite_id, event)`.

### 6.4 Transactional RPCs

The migration supplies service-role-only, `security definer` functions with a
locked `search_path`:

- `create_compatibility_invite(...)`
- `open_compatibility_invite(token_hash)`
- `read_compatibility_invite(token_hash)`
- `complete_compatibility_invite(token_hash)`
- `revoke_compatibility_invite(owner_user_id, invite_id)`
- `reserve_compatibility_invite_delivery(invite_id, recipient_hash)`
- `finalize_compatibility_invite_delivery(invite_id, owner_token, outcome, receipt)`
- `prune_compatibility_invites(limit)`

Public, anonymous, and authenticated roles have no execute privilege.

Creation is serialized per owner and enforces both:

- Maximum 12 active invitations.
- Maximum 20 creations in the exact rolling 24 hours.

An active invite is unexpired, unrevoked, and still has token authority.
Completed-but-unexpired invitations count toward the active cap because they
can still be reopened.

Cleanup:

- Revoked and expired authority is destroyed immediately.
- Non-sensitive status, event, and delivery evidence remains for 30 days.
- The next prune permanently deletes the invitation and cascades its ledgers.
- A scheduled job may call the bounded prune RPC, but correctness cannot
  depend on the scheduler: every create/read/open/complete/list operation
  performs bounded lazy cleanup first.

## 7. Server API contract

All endpoints fail as `404` when `COMPAT_INVITES_ENABLED` is not exactly `1`.
Owner endpoints additionally require a valid Supabase access token and the
production canary allowlist while that allowlist is set.

### `POST /api/compatibility/invites`

Input: `{ chartId: string, notifyOnComplete: boolean }`

- Authenticates the owner.
- Reads the owned synchronized chart server-side.
- Constructs and validates payload V1.
- Creates the invite transactionally.
- Returns `201` with `{ id, url, expiresAt, status: "active" }`.
- The `url` containing the raw token is returned only here.

Errors: `400 invalid_request`, `401 sign_in_required`, `404 chart_not_found`,
`409 active_limit`, `429 creation_rate_limit`, `503 unavailable`.

### `GET /api/compatibility/invites`

Returns the signed-in owner's status rows only:
`{ id, label, sunSign, createdAt, expiresAt, openedAt, completedAt, revokedAt, status }`.

It never returns payload, token hash, raw token, recipient information, or
delivery-provider information.

### `POST /api/compatibility/invite-revoke`

Input: `{ inviteId: string }`

Owner-scoped and idempotent. Returns `{ status: "revoked" }`. Cross-owner and
unknown IDs return the same `404`.

### `GET /api/compatibility/invite-exchange`

Receives the rewritten path token, never a token supplied by page JavaScript.
Success sets the capability cookie and `303` redirects to `/c/`. Terminal or
invalid states clear the cookie and redirect to `/c/?state=unavailable`.

Response headers include `Cache-Control: no-store` and
`Referrer-Policy: no-referrer`.

### `GET /api/compatibility/invite-session`

Reads the HttpOnly capability cookie, hashes it, and returns only:
`{ label, sunSign, payload, expiresAt, state }`.

It does not return owner user ID, chart ID, invite ID, token hash, or
notification preference.

### `POST /api/compatibility/invite-complete`

Accepts only an empty JSON object. Any additional key is rejected.

Atomically records the first completion. Returns:
`{ outcome: "completed" | "duplicate", notification: "sent" | "skipped" | "failed" }`.

The notification result is operational; the recipient never sees the
inviter's address or account state.

Every API:

- Allows only same-origin browser calls where applicable.
- Applies bounded body sizes and exact content types.
- Uses no request-body logging.
- Sets `Cache-Control: no-store`.
- Returns fixed error codes, not database/provider detail.

## 8. Recipient route, search, and cache contract

`/c/` is a programmatic private route:

- `<meta name="robots" content="noindex,nofollow,noarchive">`
- No sitemap entry.
- No hreflang alternates.
- Generic canonical to `https://zodiacs.org/c/`.
- Generic title, description, and OG image with no label, sign, or personal
  detail.
- Server and Vercel headers: `Cache-Control: private, no-store`,
  `Referrer-Policy: no-referrer`.
- No analytics until after token exchange; events use the canonical `/c/`
  path only.
- A complete no-JavaScript explanation that calculation requires JavaScript,
  without revealing invite details.

The locale availability system must explicitly classify `/c/` and
`/c/{token}` as English-only programmatic routes so they cannot gain selector
entries, alternates, or sitemap URLs through future locale expansion.

## 9. Completion notification

Notification consent is:

- Invitation-specific.
- Off by default.
- Reversible by revoking the invite.
- Separate from Daily Email, weekly digest, and Sky Alerts.

On first completion, the server:

1. Atomically claims the invite's email delivery.
2. Resolves the inviter's current verified Auth email by owner user ID.
3. Sends one transactional message containing no recipient identity, birth
   data, chart positions, result, score, or private link.
4. Finalizes the claim with provider evidence.

The message may say that the named invitation was completed and link to the
owner's profile invite-status area. It must not imply that the recipient
created an account or shared their data.

No push notification ships in the first release.

## 10. Positions-only return fragment

The return codec is new and versioned separately from the existing full-input
share codec.

Properties:

- URL fragment only; never query or path.
- Contains two payloads shaped like §4, but excludes account/chart IDs,
  engine flags, birth input, place, timezone, and email.
- Labels are optional, trimmed to 48 characters, and included only after the
  person explicitly chooses to create the link.
- Strict schema, allowed-body, longitude, version, and maximum-length checks.
- Fragment is stripped from browser history after successful decode, matching
  the existing share hygiene.
- A decoded result can be viewed and re-rendered, but the received fragment is
  never silently re-shared.

The UI must call this a private link, not an anonymous or secret link. Anyone
who receives it can view the contained computed positions.

## 11. Share-card and motion contract

### Share cards

The release activates and polishes existing renderers:

- Big Three card from a natal result.
- Full chart-wheel card.
- Compatibility card.

Requirements:

- Render entirely client-side at 1× and 2×.
- Use the canonical pastel sign icons and existing Cosmic Void materials.
- Include a compact Zodiacs.org signature and a truthful method/engine receipt.
- Never include birth date, time, place, coordinates, email, account ID, or
  invitation URL by default.
- Native share first when supported; PNG download fallback.
- One tap from birth-chart results and compatibility results.
- Preserve reduced-motion behavior and keyboard access.

### Relationship motion

There is one orchestrated moment: the two chart rings settle together before
the result is revealed.

- SVG/CSS transform and opacity only.
- No new animation dependency.
- Short, skippable, and never blocks access to the reading.
- Instant final state under `prefers-reduced-motion`.
- Pauses when offscreen or the page is hidden.
- Does not replay on ordinary tab changes, saved-result restore, or back
  navigation.

Fable owns the final timing, spacing, and copy. Sol owns lifecycle safety,
performance, focus management, and reduced-motion enforcement.

## 12. Analytics contract

Add only these events and fixed properties:

| Event | Allowed properties |
| --- | --- |
| `compat_invite_created` | `source` |
| `compat_invite_opened` | none |
| `compat_invite_completed` | none |
| `compat_invite_revoked` | none |
| `compat_invite_action` | `action` |
| `share_card_action` | `surface`, `variant`, `outcome` |

Allowed values are closed enums:

- `source`: `compatibility`, `profile`
- `action`: `copy`, `native_share`, `open_own_chart`, `send_back`
- `surface`: `birth_chart`, `compatibility`, `invite`
- `variant`: `big_three`, `chart_wheel`, `compatibility`
- `outcome`: `shared`, `downloaded`, `cancelled`, `failed`

Never send a token, invitation ID, URL, chart ID, label, sign, birth input,
position, email, provider receipt, free text, query, or fragment. The analytics
shim continues to replace the browser URL with its canonical path.

## 13. Failure and recovery matrix

| Condition | Reader outcome | Data outcome |
| --- | --- | --- |
| Both flags off | Existing compatibility experience | No invite call |
| Public flag on, server flag off | Invite CTA absent/disabled safely | No write |
| Signed out owner | Sign-in invitation | No write |
| Device-only chart | Sync explanation only | No write |
| Active/rate cap | Calm retry/manage message | No partial row |
| Invalid/expired/revoked token | Generic unavailable page | Cookie cleared |
| Recipient refresh | Result can be recomputed during validity | No new event beyond idempotent open |
| Recipient calculation error | Existing honest calculator error | No completion |
| Completion replay | Same completed experience | `duplicate`, no second send |
| Email provider failure | Result remains complete | Failed claim retained; no loop |
| Database unavailable | Fail closed, preserve local form values | No guessed state |
| JavaScript disabled | Generic explanation | No personal payload in HTML |
| Reduced motion | Immediate result | Same computation |
| Offline after session load | Local calculation may continue | Completion retries only with consent-safe empty request |

## 14. Required tests

### Unit and property tests

- Payload V1 accepts only the exact ten-body shape.
- Sun sign must match Sun longitude.
- Angles/time-known invariants.
- Canonical serialization and 4 KiB limit.
- 32-byte token entropy shape and SHA-256-only persistence.
- Positions-only fragment round trip, corruption rejection, size cap, and
  received-link re-share containment.
- Analytics allowlist drops every forbidden property.
- Share-card 1×/2× deterministic fixture rendering.

### Disposable PostgreSQL tests

- Fresh migration and idempotent replay.
- RLS enabled; anon/auth forged select/insert/update/delete denied.
- Service-role grants are minimal.
- Owner/chart ownership cannot be forged.
- 12-active and rolling-24-hour limits under concurrency.
- Open/complete/revoke races have one authoritative outcome.
- Revocation and expiry immediately destroy token/payload.
- Completion and delivery claims are idempotent under concurrency.
- Cleanup retains only bounded evidence for 30 days, then deletes it.
- Functions have fixed search paths and no public execute grants.

### API tests

- Feature-off, no-secret, malformed body, wrong origin, wrong content type.
- Signed-out and cross-owner behavior.
- Raw token appears in no database field, response after creation, log fixture,
  analytics payload, or built asset.
- Exchange produces 303, secure cookie, token-free destination, no-store, and
  no-referrer.
- Session response exposes only the public payload.
- Complete rejects all recipient data and sends at most one notification.

### Browser tests

- Owner creates, copies, lists, and revokes an invite.
- Recipient open strips token before analytics.
- Valid, expired, revoked, and malformed routes.
- B calculates locally with network inspection proving no birth-input write.
- Animation, skip, offscreen pause, tab visibility, and reduced motion.
- Keyboard-only and screen-reader compute-to-result path.
- Big Three, wheel, and compatibility cards at 1×/2×; native-share and
  download fallbacks.
- Positions-only return link and received-link containment.
- No-JS and offline/failure states.
- 360, 390, 781, 1280, and 1440 px with zero unexpected overflow.

### Existing release gates

Run the full build, typecheck, unit, browser, schema, bundle, visual,
Lighthouse, locale, Registry drift, thesis drift, and security gates. Existing
English and all non-English feature-off fixtures must remain byte-identical
except for files explicitly listed in the approved Phase 4 implementation
manifest.

## 15. Release ladder

1. Merge the Fable design/copy handoff into the integration branch.
2. Implement schema, strict types/codecs, and disposable SQL tests.
3. Implement server APIs with both flags off.
4. Implement owner and recipient UI behind both flags.
5. Integrate Fable's final copy and visual acceptance proofs.
6. Obtain full local gates and green PR CI.
7. Apply and verify the migration through the reviewed Supabase path.
8. Deploy with both public and server flags off; verify feature-off parity.
9. Set `COMPAT_INVITE_TEST_USER_IDS` to the approved owner only.
10. Enable the server flag and public flag for the allowlisted canary.
11. Run one genuine A-to-B canary using two controlled browsers:
    creation, open, local B calculation, completion, optional email,
    duplicate prevention, return card/link, revocation, and expiry fixture.
12. Record database/RLS evidence, provider evidence, screenshots, CI SHA,
    deployment, and UTC cutover.
13. Fable reviews the live canary against its handoff.
14. Public launch requires an explicit owner approval after the canary. It
    removes only the test allowlist; the paired flags and rollback remain.

Rollback is immediate: turn off the public flag, then the server flag. Existing
invites remain revocable and cleanup remains operational; recipient endpoints
return the generic unavailable state. Do not drop tables during rollback.

## 16. Implementation order and ownership

Parallel first wave:

- Fable: design, interaction, final English copy, email, card art direction,
  motion timing, responsive states, and static proofs.
- Sol: this contract, migration/RLS design, codecs, API contracts, analytics,
  threat model, tests, and release ladder.

Sequential second wave:

1. Sol integrates Fable's single docs/proofs commit onto latest `origin/main`.
2. Sol implements the complete feature on one isolated branch.
3. Fable performs a bounded implementation review and may commit only
   taste-critical corrections.
4. Sol resolves deterministic findings, runs full gates, and releases through
   the normal PR/CI/Vercel path.

There is one implementation branch and one final release candidate. Do not
split schema, APIs, and UI across independently releasable production branches.

## 17. Blockers before code implementation

The technical contract itself has no unresolved privacy or architecture
decision. Code implementation waits only for:

- Fable's final Phase 4 handoff commit and proof paths.
- Confirmation of the approved production canary user ID before live flag
  configuration.

Neither blocker prevents local schema, API, UI, or test implementation after
the Fable handoff is available.
