# Phase 4 Compatibility Invitation and Share Loop — Fable handoff (experience, copy, motion, states)

Author: Fable · Branch: `fable/phase4-sharing-loop-experience` · Base: `734c36f`
(latest `origin/main`, 2026-07-24, post-launch-remediation).

This is the decision-complete design, UX, motion, and copy contract for the
Phase 4 invitation loop, the send-back, and the share surfaces. Sol Ultra
implements from this document and the static proofs in
`docs/acceptance/phase4-sharing/` without inventing copy, states, layouts,
endpoints, or interaction decisions. Nothing here is production code; no
flags move; no schema is applied by this branch.

**Supersession.** This handoff supersedes the unpushed
`docs/PHASE4-COMPAT-INVITE-FABLE-HANDOFF.md` (branch
`fable/phase4-invite-experience`, `ef55953` + amendment `cb9e887`). Four
contract changes drive the rewrite — the owner's fixed product contract of
2026-07-24 — and everything not touched by them carries forward deliberately:

| Changed | Was (prior handoff) | Now (this contract) |
| --- | --- | --- |
| Ownership | No account; device capability secret; cross-device management was backlog | **A must be signed in and choose a saved, synchronized chart.** Invitations belong to the account; manage from any signed-in device. The storage-preflight/rollback ladder (old A3) is retired — the session is the credential. |
| Payload | A's full birth input (date, time, place) in one server record | **Computed positions only**: label, planetary longitudes, time-known state, ASC/MC only when known. No birth date, time, place, coordinates, or email — the invite record cannot leak what it never holds. |
| Completion email | Eligibility borrowed from the confirmed Phase 3 daily-brief consent | **Per-invitation opt-in**, one email to the account address. Daily Email consent is neither read nor touched. |
| The result | A's email said "run it together" — the loop ended at B | **B explicitly sends the result back**: a client-generated compatibility image plus a positions-only private link. The completion email truthfully says the reading lives with B until they send it. |

Carried forward from the prior handoff, verbatim in substance (its amendment
record A1–A6 remains the reasoning of record): the `/c/{token}/` slashed
canonical and `rewrites` contract; the stored-expiry closure trio (inline,
opportunistic, hourly sweep) and the one-hour deletion pin; the flag
partition with never-gated withdrawal; the completion-signal hardening
(keepalive + persisted queue + `sendBeacon`); the closed/used/invalid/
offline/unavailable arrival states; the flag-off byte-identical noscript
rule; the meeting animation; "no numeric score, ever."

Sources studied in full: the master brief (Phase 4, share cards, DoD,
cross-cutting rules); the owner's fixed product contract (2026-07-24);
PLAN.md (Phase 3 formally complete 2026-07-23; Phase 4 not begun); SETUP.md
(reserved flag names); docs/MASTER-PLAN.md; both PHASE3 habit documents;
docs/ANALYTICS.md (frozen allowlist and privacy invariant); docs/SUPABASE.md;
the live privacy and terms pages; `SynastryCalculator.tsx`,
`RelationshipWheel.tsx`, `CompatibilityShareControl.tsx`,
`PrefilledPairNotice.tsx`, `SomeoneElseChart.tsx`, `ProfileManager.tsx`,
`ProfileDashboard.tsx`, `profile/{schema,store,sync,pairs}.ts`, `share.ts`,
`share-positions.ts` (the v2 codec this design extends), `share-card.ts`,
`share-card-copy.ts`, `compatibility-card.ts`, `analytics.ts`; the prior
Phase 4 handoff and its proofs; and the shareable-output gallery
(zodiacs-shareable-review.vercel.app) for the card and OG inventory. Every
astrology example below is computed by the repo's own engine
(`docs/acceptance/phase4-sharing/assets/fixture-frida-diego.json`,
regenerable via `compute-fixture.mts` beside it); no aspect, orb, sign,
degree, or date is invented, and no fixture birth date, time, or place
appears in any proof or in this document.

## 0. What changes, in one page

1. **Inviting becomes a first-class, signed-in act.** Person A signs in,
   picks one saved, synced chart, consents in plain words, and gets a short
   link `/c/{token}/`. The anonymous fragment invite (`#a=`) keeps working
   exactly as today for everyone else — the server invitation is the
   signed-in upgrade, not a replacement.
2. **What travels is the sky, not the paperwork.** The invitation carries
   A's label and computed chart positions only — twelve longitudes, the
   house system, ASC/MC when the birth time is known, and a time-known
   flag. Birth date, time, place, coordinates, and email structurally
   cannot leak from the record because they are never in it.
3. **B's privacy is absolute and unchanged.** B sees A's label and Sun
   sign, enters their own details, and everything computes in B's browser.
   B's data makes zero network writes unless B explicitly saves. The
   completion signal carries the token alone; server completion records
   contain no B chart data.
4. **The loop now closes.** A cannot see B's reading — it exists only on
   B's device. So the result page gives B one honest, generous action:
   **Send the result back** — a client-rendered compatibility image plus a
   private positions-only link (`#s=` token). A's completion email says
   exactly this: there is nothing to show A until B sends it.
5. **One email, per invitation, opt-in.** A may tick "Email me once, when
   their reading is ready." It goes to the account address, fires once on
   completion, and has nothing to do with Daily Email consent — different
   checkbox, different promise, different lifecycle.
6. **The meeting** — this phase's one orchestrated animation, unchanged
   from the prior design: A's ring rises, B's ring joins it, the contact
   lines light tightest-first. 1.4 s, transforms and opacity only,
   skippable on any input, settled-on-first-paint under reduced motion.
7. **Share surfaces are a reviewed set of four.** Full Chart and
   Compatibility cards stand as shipped; the **Big Three card returns to
   the live share sheet** (it exists in code, tested, currently unexposed —
   this loop is the reason to surface it: it is the lightest thing B can
   share); the daily reading keeps link-plus-OG sharing with no canvas
   card. All pixel-reviewed at 1×/2× mobile.
8. **Feature-off is today, exactly.** Without the flags: no panel, no
   `/c/` opening, byte-identical builds. Revocation and status stay live
   whenever the server contract exists — a kill switch stops sharing, not
   an owner's right to end their own invitation. English-only: the four
   locales keep today's compatibility experience untouched.

The rule everywhere: the reading leads; consent is explicit and calm;
method and storage detail stay one quiet line or one disclosure away.
Banned from primary copy: "token", "payload", "record", "RLS", provider
names, "computed server-side", exclamation marks, urgency, guilt, and the
banned-word and smug-tell lists.

## 1. The invitation contract and privacy boundary

| | Fragment link (today, kept) | Signed-in invitation (flag-on, EN) |
| --- | --- | --- |
| Who can invite | Anyone, after a full two-side comparison | A signed-in reader with at least one saved, synced chart |
| What travels | A's birth details inside the URL fragment | A short opaque link; label + computed positions in one server record |
| Birth data in transit | Yes (the fragment is the data) | **Never** — no date, time, place, coordinates, or email exists in the invitation |
| Consent | A note beneath the copy button | A checked box naming exactly what travels, for whom, for how long, and the way out |
| Lifetime | Forever | One completed reading, or 14 days, or A ends it early |
| Revocation | Impossible | One click in `/profile/#compat-invites`, from any signed-in device, effective immediately — live even during a kill switch |
| B's data | Never leaves B's browser | Never leaves B's browser; completion carries the token alone |
| A learns of completion | Never | Optional single email to the account address, per-invitation opt-in |
| The result's path back | — | B's explicit send-back: client-rendered image + `#s=` positions-only private link |
| Server stores | Nothing | `owner user_id`, `label (≤24)`, Sun-sign slug, positions wire (+ time-known), `notify` flag, token hash, timestamps. Positions are deleted at close; the positions-free status row is pruned 7 days after expiry. |

Boundary rules Sol must enforce exactly:

- **Sign-in and a synced chart are the gate to create — nothing else moved
  behind it.** The calculator, fragment links, and every current behavior
  stay available signed-out. The panel's signed-out rendering is an
  invitation to sign in, never a wall (§2.1 state 0).
- **The positions payload is computed client-side from the selected synced
  chart and validated server-side against the v2 positions grammar** (the
  `share-positions.ts` rules: twelve known bodies, canonical order,
  longitudes in [0, 360), optional ASC/MC pair, whole/placidus, engine
  version). The create endpoint rejects anything shaped like birth input —
  there is no field for it.
- **A received side is never re-shareable.** A chart that arrived in an
  invitation or an `#s=` return can never seed a new invitation. B invites
  with their own entered side — that is the loop.
- **B's completion signal is anonymous**: token only, hardened delivery
  (keepalive fetch at render; persisted queue `zodiacs.invites.pending.v1`;
  `sendBeacon` flush on pagehide/visibilitychange; replays on later visits
  until 200 or the invitation's own expiry). If the signal never arrives,
  the record stays open until the 14-day closure and A's register says
  `Opened` — never a closure that did not happen.
- **Positions delete at close; expiry is a stored close.** Completed and
  revoked null the positions in the same statement as the transition;
  expiry closes via the carried trio — inline on any touch, opportunistic
  bounded batches from create/open/status, and the hourly sweep — pinning
  deletion within one hour of `expires_at`. Deletion-claiming copy renders
  only after a response that performed or verified the closure; the client
  never clock-promotes a cached `Waiting`/`Opened` to `Expired`.
- **Withdrawal is never flag-gated.** `COMPAT_INVITES_ENABLED` gates create
  and open only. Revoke, status, completion replays, and the sweep run on
  the server contract alone.
- **The completion email is transactional and singular.** Consent is the
  per-invitation checkbox; the address is the account's, resolved at send
  time from the session-stamped `owner` — never stored on the invitation,
  never taken from the client body, never related to
  `daily_sun_preferences` / `daily_chart_preferences` in either direction.
  `notify_sent_at` guards exactly-once. Revoked and expired invitations
  never notify.
- **Tokens are high-entropy capabilities** (128-bit, base64url, stored as
  SHA-256 hex). Raw token appears in the creation response and A's
  register rows (for Copy link). API calls put tokens in POST bodies; the
  `/c/{token}/` path is the one URL-borne use, as designed.
- **No numeric compatibility score exists anywhere in this loop** — not on
  the result, not on the card, not in the email. House law.

## 2. Reader journey and state contract

Shared layout rules: everything renders inside the existing calculator and
profile grammar (`.calc`, `.shell`/`.core`, `.field`, `.btn` tiers,
`.notice`, `NextActionCard`, `pf-*` rows); one primary action per surface;
no popups, no modals; ≥44 px touch targets; visible focus
(`outline: 2px solid var(--ink-0)`, offset 3 px); pastel `SignIcon` discs
are the only sign rendering; kickers are sentence-case serif-italic; no new
colors, no new chrome. New strings are module-local (`INVITE_COPY`,
`PF_INVITE_COPY`, `RETURN_COPY`) typed over `en` with EN fallback; the four
locales never render these surfaces in this release.

### 2.1 Person A — creating an invitation (`/compatibility/`, flag-on, EN)

Two entry points, one panel:

- **Form entry (primary).** When slot A is ready, slot B is empty, and the
  locale is `en`, the invitation panel renders below the form card, before
  the FAQ. It hides while any B field is touched — the panel is the
  alternative to entering B, not a competitor while they type.
- **Post-result entry.** After any comparison, a collapsed ghost button
  `invOpenPanel` ("Invite someone to compare with {name}") expands the same
  panel. The seed side follows the existing rule: A's own data only; a
  received side offers no invitation.
- **Profile entry.** `/profile/#compat-invites` (§2.5) opens with
  `pfInvNew` ("Make an invitation") linking `/compatibility/` — the
  register manages; the calculator creates.

Panel states (copy §3.1–3.2):

0. **Signed out** — the panel renders as a quiet two-line card: `siTitle`,
   `siBody`, text link `siCta` → `/profile/`. No form controls, no wall;
   the calculator above is untouched. Signing in and returning re-renders
   state 1 or 2. (Proof: `entry-consent.html`.)
1. **Signed in, no synced chart** — `siNoSyncedTitle` + `siNoSyncedBody`
   + text link `siNoSyncedCta` → `/profile/`. Device-only charts are never
   listed and never named as almost-eligible — syncing is the reader's
   deliberate act, made where sync lives.
2. **Consenting** — heading `invTitle`, body `invBody`, then:
   - **Chart picker** — legend `invChartLegend`, radio rows (one per synced
     chart, newest first): Sun disc (24 px) + chart name. No birth summary
     renders here — an invitation moment is exactly when someone else may
     be looking at the screen. ≥44 px rows, native radios; single synced
     chart preselects itself.
   - **Consent checkbox** `invConsentLabel` (unchecked), then the three
     term lines `invTerm1/2/3` in `--text-sm`.
   - **Email checkbox** `invNotifyLabel` (unchecked) + fine line
     `invNotifyNote`. Independent of consent; never implies it.
   - Primary `invCreate`, disabled until consent is checked and a chart is
     selected.
3. **Creating** — button label `invCreating`; single-flight; controls
   stay enabled except the button.
4. **Ready** — the panel swaps to: mono read-only link field (the slashed
   canonical, selectable), `invCopy` primary (announces `inviteCopied`),
   `invShare` ghost (Web Share of the URL where `navigator.share` exists;
   hidden otherwise), status line `invReadyNote` (or `invNotifyOn` when
   the email box was ticked), quiet line `invManageNote` linking
   `/profile/#compat-invites`, and the privacy line `invPrivacyLine` in
   mono — the one quiet line that says what the link carries.
5. **Provider failure** — `invError`; checkbox and picker preserved;
   button re-enabled.
6. **Throttled** — 429: `invThrottled`, same recovery.
7. **Account cap** — 12 active invitations on the account:
   `invCapNote` + profile link replaces the create button.
8. **Feature-off / non-EN** — the panel never renders; the fragment-link
   invite renders exactly as today.

### 2.2 The link and the `/c/{token}/` shell — carried contract

Minted canonical: `https://zodiacs.org/c/{token}/` (22-char base64url).
The full routing reasoning, the `rewrites` pair, the `/api/c/` grep gate,
the no-store/noindex/no-referrer headers, the meta-refresh +
`location.replace` + visible fallback handoff to `/compatibility/#i={token}`,
the sitemap exclusion, and the eight-case routing acceptance table carry
from the prior handoff §2.2/A4 unchanged. The shell reads no database,
loads no analytics, and judges no token — the island's `open` call is the
validator.

### 2.3 Person B — arrival (`/compatibility/#i={token}`)

On `#i=`, the island strips the fragment (`history.replaceState`), renders
the arrival area above the form, POSTs `open`. States (copy §3.3):

1. **Loading** — arrival card frame at fixed min-height (zero CLS),
   status `arrLoading`; the form below stays usable.
2. **Ready** — A's Sun disc (44 px), heading `arrTitle` ("{label} wants to
   read your charts together."), body `arrBody` (names the Sun sign, says
   the side was shared on purpose **as chart positions only**, and that
   B's details stay in this browser), fine print `arrFine`. When A shared
   without a birth time, one extra quiet line `arrNoTimeLine` sets the
   expectation honestly. Slot A locks with the `place__chip` treatment —
   value `sharedWithYou` ("{label} · shared with you"), clearable
   (`removeSharedChart`; clearing discards the invitation side, announces
   `arrCleared`, and the page becomes the plain calculator). Slot B is the
   normal birth form; B's compute button label stays `compareCharts`.
   `opened_at` stamps server-side on first ready response.
3. **Computing** — existing behavior, untouched.
4. **Completed** — §2.4.
5. **Invalid** — `arrInvalidTitle/Body`; plain calculator beneath. Every
   terminal state keeps the page fully usable.
6. **Closed** (revoked or expired — one rendering, deliberately
   indistinguishable to B) — `arrClosedTitle/Body`.
7. **Already used** — `arrUsedTitle/Body`; the response carries no label,
   sign, or positions — late holders learn nothing about A.
8. **Unavailable** (5xx or server flag off while links circulate) —
   `arrDownTitle/Body` + `arrRetry`.
9. **Offline** — `arrOfflineTitle/Body` + `arrRetry`.
10. **No-JS** — the meta refresh already landed B here; the noscript block
    gains `noscriptInviteLine`, stamped at build time only when
    `PUBLIC_COMPAT_INVITES_ENABLED=1` and locale `en` (flag-off builds
    byte-identical — carried A5 rule).
11. **Reduced motion** — identical content; §4 renders settled.
12. **Second open before completion** — ready again; opens are not
    single-use, the reading is.

### 2.4 Completion, the meeting, the send-back, and the one conversion moment

When an invitation-seeded comparison computes:

1. The result renders exactly as today — people cards, bi-wheel, aspect
   grid, composite, save-pair, share controls — nothing gated behind the
   animation (§4 choreographs elements that are interactive from the first
   frame). A-side house overlays render only when A's angles exist; the
   existing no-time semantics apply and the notice names the label only,
   never a date.
2. The island reports completion (token only; hardened delivery per §1).
3. **The send-back block** — a `NextActionCard` directly under the result
   actions, present on every invitation-seeded completion (fresh or
   restored-from-save; the reading's owner may send it whenever they
   choose): kicker `sendCue`, title `sendTitle` ("Send the result back."),
   body `sendBody` (names that {label} cannot see this reading and that
   the send carries a picture and a positions-only link), then one primary
   and two quiet actions:
   - `sendShare` (primary; visible when `navigator.share` with files or
     url support): shares the client-rendered compatibility card PNG and
     the `#s=` link with `sendShareText`.
   - `sendCopy` (ghost): copies the `#s=` link; announces `sendCopied`.
   - `sendImage` (ghost): downloads the card PNG (the existing
     `CompatibilityShareControl` download path).
   The `#s=` link is minted client-side (`share-synastry.ts`, §8): both
   sides as v2 positions wires + labels + time-known flags. No birth data
   exists to carry. The block never auto-fires anything — "explicitly
   sends" means B presses it.
4. **The conversion card** (once per completion, never re-asked after
   decline): kicker `convCue`, title `convTitle` ("Keep your half."), body
   `convBody`, primary `convSave` ("Save my chart") saving B's side as a
   normal local `SavedChart`; text action `convPair` ("Keep the whole
   comparison") running the existing `savePair`; quiet line `convAccount`
   linking `/profile/` for the account path — the single gentle prompt,
   sitting after the send-back so generosity precedes conversion.
5. **The loop turn** — ghost action `loopStart` ("Start your own — invite
   someone to compare with you"): resets the comparison, seeds slot A with
   B's own entered side, scrolls to the form; flag-on and signed-in, the
   §2.1 panel is naturally there; signed-out, its state 0 shows the way.
6. A's notification dispatches server-side on the completed transition
   (§2.6). B's surface says nothing about it.

### 2.5 Person A — `/profile/#compat-invites` (the invitation register)

A new section rendered by `ProfileInvites` between the saved-comparisons
strip and `#daily-brief`. Signed-in it reads the account's invitations via
one authenticated `status` call (no local capability records exist in this
design); signed-out it renders the profile's standard signed-in-first
treatment. States (copy §3.5):

1. **Hidden** — flag off and no invitations on the account.
2. **Empty** — `pfInvEmpty` + `pfInvNew` link to `/compatibility/`.
3. **List** — rows, newest first: "{label} · {created date}" + status word
   + detail line + actions:
   - *Waiting* — `pfInvWaiting` (names the close date). Actions:
     `pfInvCopy` · `pfInvEnd`.
   - *Opened* — `pfInvOpened`. Same actions.
   - *Reading done* — `pfInvDone` (positions deleted; the result returns
     only if B sends it). Action: `pfInvHide`.
   - *Ended by you* — `pfInvEnded`. Action: `pfInvHide`.
   - *Expired* — `pfInvExpired` ("unopened" dropped when `opened_at`
     exists). Action: `pfInvHide`.
4. **Revoking** — one click, no modal; optimistic flip to *Ended by you*;
   announced `pfInvEndedAnnounce`; failure flips back with `pfInvEndError`;
   focus stays on the row's surviving action.
5. **Status fetch failed / offline** — cached rows render with `pfInvStale`;
   `pfInvEnd` disabled (revocation must not pretend), `pfInvCopy` stays.
6. **Flag off, invitations exist** — list renders with `pfInvPaused`;
   `pfInvCopy` disabled; `pfInvEnd` fully live (withdrawal partition).
7. **Cross-device** — nothing special to render: the register is the
   account's. `pfInvAnyDevice` states it in mono fine print.

### 2.6 Completion-email lifecycle

- Eligibility: the creator is signed in by definition. The checkbox
  renders for everyone in §2.1 state 2; no consent inheritance exists.
- On create with the box ticked: `notify = true` stamped with the session's
  `owner` — never an address, never from the client body.
- On completed: the server resolves the owner's current account email at
  send time and sends §3.6 once (`notify_sent_at` guard). Deleted account
  or unresolvable address → silent skip.
- Revoked and expired invitations never notify. Nothing recurring exists;
  there is no list and no unsubscribe machinery — the footer says so in
  words.
- Push is reserved, wording unchanged from the prior handoff §3.6; public
  push remains off and the Sky-alerts consent is never borrowed.

### 2.7 Person A — receiving the result (`/compatibility/#s={token}`)

When a `#s=` link opens: fragment stripped, both sides decode client-side
(hostile input → the existing invalid-link notice), and the comparison
renders **settled** (restores never animate) with a quiet provenance band
above the result: kicker `retCue`, line `retTitle` ("A reading, sent back
to you."), body `retBody` (positions only; if one side is yours, the rest
of your chart is a minute away — linking `/birth-chart/`). Labels render
as sent; missing labels render `retSideA`/`retSideB` ("Their side"). The
band is dismissible (`retDismiss`), never re-rendered for the session.
No server request occurs — the link is the data, and it contains none of
anyone's birth details by construction.

### 2.8 Duplicate action and failure matrix

| Action | Guard | Repeat outcome |
| --- | --- | --- |
| Create ×2 | disabled-while-busy + single-flight | Two invitations only via two deliberate presses after ready; panel shows the newest link |
| Create at cap | server count per account | 400-cap → `invCapNote` |
| Open ×n pre-completion | none needed | Ready each time; `opened_at` stamps once |
| Complete ×n | idempotent transition | First wins; later calls 200 |
| Complete vs revoke race | single-statement terminal transition | One terminal state; both callers 200; B's rendered reading stands |
| Complete delivery fails | persisted queue + beacon + later-visit replays | Closes on first delivered attempt; else expiry closes and the register says `Opened` |
| Revoke ×2 / stale row | idempotent; owner-scoped | 200 both times; non-owner or unknown → generic failure, no oracle |
| Send-back share cancelled | native sheet dismissal | Block unchanged; nothing fired; no analytics event for a cancelled sheet |
| Copy ×n (invitation or `#s=`) | CopyLink state machine | Re-announces; harmless |
| Notify send fails | provider error at dispatch | `notify_sent_at` stays null; one retry on next status touch of the completed row; never blocks the completion transition |

## 3. Final English copy deck

Strings are final and implementation-ready; `{braces}` are runtime
substitutions; em dashes spaced; no exclamation marks; sign names Title
Case; "Sun" capitalized. Masked nothing — no emails render in this loop.

### 3.1 Invitation panel (Person A)

| Key | Final English |
| --- | --- |
| invOpenPanel | Invite someone to compare with {name} |
| invTitle | Invite them to fill in their half. |
| invBody | Your side travels as chart positions — where everything sits in your sky — carried by a private link. They add theirs, and the reading appears for them right away. |
| invChartLegend | Which chart carries your side? |
| invConsentLabel | Share this chart's positions with whoever opens the link |
| invTerm1 | The link carries your chart's name or label and its computed positions. It never carries your birth date, time, or place. |
| invTerm2 | Meant for one person — it closes once their reading is made, and after 14 days at the latest. |
| invTerm3 | You can end it early anytime from your profile, on any device you're signed in to. |
| invNotifyLabel | Email me once, when their reading is ready |
| invNotifyNote | One email for this invitation, to your account address. It isn't a subscription, and it doesn't touch your daily email choices. |
| invCreate | Create the invitation link |
| invCreating | Creating… |
| invCopy | Copy link |
| invShare | Share… |
| invReadyNote | Ready. One reading, until {expiryDate}. |
| invNotifyOn | Ready. One reading, until {expiryDate} — and one email to you when it happens. |
| invManageNote | Watch or end it from your profile. |
| invPrivacyLine | The link carries a label and chart positions. No birth details. |
| invError | Couldn't create the link. Please try again. |
| invThrottled | Too many new links just now — give it a minute. |
| invCapNote | Twelve invitations are open on your account. End one in your profile before making another. |

`{expiryDate}` renders month + day ("August 7"), reader-locale format, no
year inside a 14-day window.

### 3.2 The gentle sign-in path (Person A, signed out / unsynced)

| Key | Final English |
| --- | --- |
| siTitle | Invitations need an account. |
| siBody | An invitation keeps your side ready for up to 14 days, so it needs a place that belongs to you. Sign in, sync the chart you'd share, and the invitation button appears right here. |
| siCta | Sign in from your profile |
| siNoSyncedTitle | Sync a chart to invite with it. |
| siNoSyncedBody | Invitations read a saved, synced chart. Charts kept only on this device stay here — sync one from your profile if you want it to carry an invitation. |
| siNoSyncedCta | Open your profile |

### 3.3 Arrival (Person B)

| Key | Final English |
| --- | --- |
| arrLoading | Opening the invitation… |
| arrTitle | {label} wants to read your charts together. |
| arrBody | Their side is already here — a {sign} Sun, shared by them on purpose as chart positions only. Add yours and the reading appears below, worked out in your browser. Your details stay here — {label} won't see them, and neither do we. |
| arrNoTimeLine | They shared without a birth time, so their Moon is close rather than exact, and houses sit this reading out. |
| arrFine | Invitation links close once they're read — and after 14 days at the latest. |
| sharedWithYou | {label} · shared with you |
| arrCleared | Shared side removed. The page is a normal comparison now. |
| arrInvalidTitle | This invitation link isn't right. |
| arrInvalidBody | It may have been copied incompletely. Ask them to send a fresh one — or read any two charts below. |
| arrClosedTitle | This invitation has closed. |
| arrClosedBody | Invitations close once they're read, after 14 days, or when the person who made one ends it. Ask them for a fresh link — or read any two charts below. |
| arrUsedTitle | This invitation was already used. |
| arrUsedBody | It carried one reading, and that reading has happened. If that was you, your comparison may still be saved where you read it. Otherwise, ask for a fresh link — or read any two charts below. |
| arrDownTitle | Invitations aren't reachable right now. |
| arrDownBody | The link itself may be fine. Try again in a little while — or read any two charts below. |
| arrOfflineTitle | You're offline. |
| arrOfflineBody | Opening an invitation needs a connection once, to fetch their side. Reconnect and try again. |
| arrRetry | Try again |
| noscriptInviteLine | Invitation links open here too, and need JavaScript for the same reason. |

### 3.4 Completion — the send-back, the conversion, the loop turn (Person B)

| Key | Final English |
| --- | --- |
| sendCue | Before anything else |
| sendTitle | Send the result back. |
| sendBody | {label} can't see this reading — it happened here, on your device. One tap makes a picture of it and a private link that carries the positions back, and nothing else. |
| sendShare | Share it back |
| sendShareText | Our charts, read together — from zodiacs.org |
| sendCopy | Copy the private link |
| sendCopied | Link copied. It carries chart positions only. |
| sendImage | Download the picture |
| convCue | Before you go |
| convTitle | Keep your half. |
| convBody | Save your chart on this device and your full reading — houses, aspects, the year ahead — is one tap away anytime. {label}'s side isn't kept unless you save the comparison too. |
| convSave | Save my chart |
| convSaved | Saved on this device. Your full chart is in your profile. |
| convPair | Keep the whole comparison |
| convAccount | Prefer it on every device? An account syncs it. |
| loopStart | Start your own — invite someone to compare with you |

### 3.5 Profile — the invitation register (Person A)

| Key | Final English |
| --- | --- |
| pfInvTitle | Compatibility invitations |
| pfInvDek | Links you've made that carry one chart's positions. Each closes once it's read — or after 14 days at the latest. |
| pfInvEmpty | No invitations yet. Make one from any comparison on the compatibility page. |
| pfInvNew | Make an invitation |
| pfInvStatusWaiting | Waiting |
| pfInvStatusOpened | Opened |
| pfInvStatusDone | Reading done |
| pfInvStatusEnded | Ended by you |
| pfInvStatusExpired | Expired |
| pfInvWaiting | Not opened yet. The link works until {expiryDate}. |
| pfInvOpened | Opened, no reading yet. Closes {expiryDate}. |
| pfInvDone | Their reading happened {date}. The link closed and its positions are deleted. The result comes back only if they send it. |
| pfInvEnded | You ended this on {date}. Its positions are deleted. |
| pfInvExpired | Expired {date} unopened. Its positions are deleted. |
| pfInvCopy | Copy link |
| pfInvEnd | End this invitation |
| pfInvEndedAnnounce | Invitation ended. The link no longer works. |
| pfInvEndError | Couldn't end it just now. Please try again. |
| pfInvHide | Remove from this list |
| pfInvHidden | Removed. |
| pfInvStale | Statuses may be out of date — this device is offline or the check didn't go through. |
| pfInvPaused | Invitations are off right now, so these links won't open. You can still end one — ending always works. |
| pfInvAnyDevice | Invitations belong to your account — manage them from any device you're signed in to. |

Truth-rendering rule, carried: the three deletion-claiming strings render
only from a status response that performed or verified closure; cached
active rows keep their cached word under `pfInvStale`.

### 3.6 Completion email (Person A — transactional, one-shot)

- **Subject:** `Your invitation was read`
- **Preheader:** `The reading happened on their device — ask them to send
  it back.`

HTML composition (the Phase 3 600 px dark frame, verbatim frame rules:
single column fluid to 320 px, `#060709` ground, `#C6CCDA` body,
`#EEF1F7` headings, `#7A8397` muted, one pale button, Georgia serif /
system sans, images limited to one pastel disc and the wordmark, both
with alt text, no tracking pixel, opens unmeasured):

1. Identity row — `COMPATIBILITY INVITATION · {WEEKDAY, MONTH D, YYYY}`
   mono caps 11 px; wordmark right.
2. Body, serif:
   > The invitation carrying your side as {label} was opened, and the
   > reading happened just now — on their device, where it stays.
   >
   > The link has closed, and the positions it carried are deleted.
   >
   > There's nothing to show you here, and that's on purpose — the
   > reading never touched us. On their result there's a button that
   > sends it back: a picture of the reading and a private link that
   > carries chart positions only. Ask them for it.
3. One action — button `Open the compatibility page` →
   `https://zodiacs.org/compatibility/`.
4. Footer, 12 px muted: "You asked for one email when this invitation was
   read — this is it. Nothing recurring, nothing else to manage." ·
   `Your invitations` → `https://zodiacs.org/profile/#compat-invites`

Plain-text part mirrors the blocks exactly. With images blocked the email
loses one decorative disc and nothing else — every sentence, date, link,
and the closing state are HTML text.

### 3.7 The returned reading (Person A, `#s=` arrival)

| Key | Final English |
| --- | --- |
| retCue | Sent back to you |
| retTitle | A reading, sent back. |
| retBody | Two sides, compared — carried here as chart positions only. If one of them is yours, the rest of your chart is a minute away. |
| retChart | Get your free birth chart |
| retSideA | Their side |
| retSideB | The other side |
| retDismiss | Dismiss |
| retInvalid | This result link isn't right — it may have been copied incompletely. |

### 3.8 The `/c/` shell — carried

`<title>` `An invitation — Zodiacs.org` · `og:title` `Two charts, read
together` · `og:description` `A private compatibility reading — their side
is entered, yours stays in your browser.` · fallback heading `Opening your
invitation…`, link `Open the reading`. OG image:
`/assets/og/v2/tool/compatibility-invite.png` (§5).

## 4. The meeting — motion specification (carried verbatim)

Plays once per freshly computed comparison (pressed Compare or an
invitation completion); restores and `#s=` arrivals render settled.

| t | Element | From → to |
| --- | --- | --- |
| 0–420 ms | People cards + result heading | opacity 0→1, translateY 8px→0 |
| 120–540 ms | Inner wheel (A's ring group) | opacity 0→1, scale 0.94→1 |
| 280–840 ms | Outer ring (B's ring group) | opacity 0→1, rotate −8°→0° |
| 700–1,400 ms | Contact lines | opacity 0→1, staggered 60 ms, tightest orb first |
| 700–1,400 ms | Aspect tally + grid | opacity 0→1, one group |

Binding rules, unchanged: nothing blocks (all elements interactive from
frame one; classes `.syn-meet`/`.is-settled`, CSS-only); skippable on any
`pointerdown`/`keydown` (no skip chrome — the interaction is the skip);
reduced motion gets settled geometry on first paint inside a
`no-preference` query; hiding styles gated on `html.js`; line drawing is
opacity, never stroke-dashoffset; `will-change` during play only; 60 fps
on mid-range mobile; no analytics event for presentation.

## 5. Share surfaces — the reviewed set of four

| Surface | Vehicle | Status | Decision |
| --- | --- | --- | --- |
| Full Chart | `share-card.ts` full-wheel card, 1080×1350 PNG, client-rendered, no birth details | Shipped | Stands as-is; pixel review re-run at 1×/2× |
| Big Three | `share-card.ts` big-three renderer — in code, tested, currently unexposed | **Re-exposed** | Joins the live share sheet on chart results and B's completion. Rationale: it is the lightest personal artifact in the loop — the thing B can share without sharing a whole wheel — and the code, tests, and geometry already exist. Composition unchanged from the reviewed geometry (discs 178 px, rows y 245+292·i, receipt y 1238, wordmark right). |
| Compatibility | `compatibility-card.ts`, 1080×1350, two columns, tightest contacts, **no numeric score** | Shipped | The send-back's picture. Stands as-is; the send-back adds no new composition. |
| Daily reading | `ShareRow` link sharing + the per-page OG card (1200×630) | Shipped | Deliberately no canvas card — a daily is a page, not a personal artifact; the OG card is its picture. Recorded as a decision, not an omission. |

Pixel-review criteria (proof `share-gallery.html`, and Sol re-verifies on
device): at 1× in a 360 px share sheet the smallest mono (11 px effective)
stays legible and unclipped; 24-char labels fit via `fitText` without
touching gutters; both DPRs are one bitmap (2× render, platform
downscale). Fixture card content is engine-computed (§0 sources): headline
`compatibilityCharge`, contacts `Neptune square Uranus · 0.6°`,
`Jupiter conjunction Saturn · 1.0°`, `Mars trine Moon · 1.0°`.

OG static: `build-og-void.mjs` gains `tool/compatibility-invite.png`
(title `Two charts, read together`, description per §3.8), referenced only
by the `/c/` shell.

## 6. Accessibility contract

- **A-side order:** chart picker radios → consent checkbox → email
  checkbox → create. On ready, focus moves to the link field (selected);
  the persistent `role="status"` node announces "Invitation link ready."
  Errors focus the status line's control.
- **Signed-out card** is two lines and one link — tabbable, no trap.
- **B-side:** arrival never steals focus; card precedes the form in DOM
  order; the status region announces the ready heading and terminal-state
  headings once each. After compute, the existing result-heading focus
  applies. The send-back block is a normal card in the tab order; native
  share failures fall through to visible copy/download actions.
- **`#s=` band** precedes the settled result in DOM order; `retDismiss`
  returns focus to the result heading.
- **Announcements** ride the always-mounted `role="status"` node:
  `invReadyNote`/`invNotifyOn`, `inviteCopied`, `arrCleared`, arrival
  headings, `sendCopied`, `convSaved`, `pfInvEndedAnnounce`, `pfInvHidden`.
- **44 px** minimum on every new control: picker rows, both checkboxes
  (padded label rows), create/copy/share/retry, send-back trio, register
  row actions, the arrival clear chip, `retDismiss`.
- **Keyboard:** all native elements; the link fields are read-only
  `<input>`s; no custom widgets; the animation never delays focus.
- **No hover-only information; status words are text, not color; pastel
  discs are decorative beside text sign names.**
- **Email:** heading order, action-phrased links, full plain-text parity.
- **Stress copy:** proofs render a 24-char label and a 40-char chart name
  in every surface that shows one (picker row, arrival title, send-back
  body, register rows, email body) — ellipsis at one line, no layout break.

## 7. Analytics — exact events and enums

Additions to the frozen allowlist (`analytics-config.mjs`, `analytics.ts`,
docs/ANALYTICS.md), landing with the feature:

| Event | Props (bounded) | Fired when |
| --- | --- | --- |
| `invite_created` | `notify`: boolean | Create succeeds (A) |
| `invite_opened` | `state`: `ready \| invalid \| closed \| used \| unavailable \| offline` | Open resolves (B), once per load |
| `invite_completed` | — | Invitation-seeded comparison renders |
| `invite_returned` | `method`: `share \| copy \| download` | B fires a send-back action (a cancelled native sheet fires nothing) |
| `invite_converted` | `action`: `saved_chart \| saved_pair \| own_chart` | B taps a conversion action |
| `invite_revoked` | — | A's revoke succeeds |

Existing events, values only: `compat_computed` gains `source: 'invite'`
and `source: 'returned'` (the `#s=` settled render); `chart_saved` gains
`source: 'invite'`. Privacy invariants: no token, label, name, positions,
or free text on any event; the `/c/` shell fires nothing.

## 8. Implementation map for Sol Ultra (file level)

**Flags (SETUP.md reserved names, partition carried):**
`PUBLIC_COMPAT_INVITES_ENABLED=1` — EN entry UI (panel, arrival handling,
noscript sentence, register section, send-back block, `#s=` band).
`COMPAT_INVITES_ENABLED=1` — create/open only. Revoke, status, completion
replays, notify dispatch, and the sweep run on the server contract alone
(`PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
`COMPAT_INVITE_SWEEP_SECRET` (≥32 chars) + hourly
`.github/workflows/compat-invite-sweep.yml` — carried unchanged.

**Migration** — `supabase/migrations/<stamp>_phase4_compat_invites.sql`:

```sql
create table public.compat_invites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique
    check (octet_length(token_hash) = 64 and token_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (char_length(label) between 1 and 24),
  sun_sign text not null check (sun_sign in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces')),
  positions jsonb,                     -- v2 positions wire + timeKnown; nulled at close
  time_known boolean not null,
  status text not null default 'active'
    check (status in ('active','completed','revoked','expired')),
  notify boolean not null default false,
  notify_sent_at timestamptz,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  constraint compat_invites_positions_presence
    check ((status = 'active') = (positions is not null))
);
alter table public.compat_invites enable row level security;
-- Server-owned (the Phase 3 idiom): RLS on, zero policies; every access
-- path is a server endpoint. Create/revoke/status verify the session JWT
-- server-side and scope to owner; open/complete are token-capability paths.
```

Plus the carried maintenance pair (`close_expired_compat_invites`,
`prune_compat_invite_skeletons`), the single-statement terminal-transition
function, partial indexes on `(status, expires_at) where status='active'`
and `(owner, status)`, and a 12-active-per-owner check in create.

**Endpoints** (`api/invite/*`, header discipline carried; tokens in POST
bodies only):

| Route | In | Out |
| --- | --- | --- |
| `POST api/invite/create` | session JWT + `{ chartId, label, sunSign, positions, timeKnown, notify }` — positions validated by the v2 grammar; `chartId` verified against the owner's synced charts; any birth-shaped field rejected | `201 { token, expiresAt }` · `400` · `401` · `403 not-your-chart` · `409 cap` · `429` · `503 flag off` |
| `POST api/invite/open` | `{ token }` | `200 { state:'ready', label, sunSign, positions, timeKnown } \| { state:'used'\|'closed'\|'invalid' }` · `429` · `503` — closes touched overdue rows inline |
| `POST api/invite/complete` | `{ token }` (fetch keepalive + sendBeacon Blob accepted) | `200 { ok:true }` idempotent; dispatches notify via `waitUntil`; contract-gated only |
| `POST api/invite/revoke` | session JWT + `{ id }` | `200 { ok:true }` idempotent, owner-scoped; contract-gated only — never flag-gated |
| `POST api/invite/status` | session JWT | `200 { invites:[{ id, token, label, state, createdAt, openedAt?, closedAt?, expiresAt }] }` — owner-scoped; closes touched overdue rows inline; contract-gated only |
| `POST api/invite/sweep` | `Authorization: Bearer COMPAT_INVITE_SWEEP_SECRET` | `200 { closed, pruned }` |
| `GET api/c/[token]` | — | 200 HTML shell (carried §2.2; no DB, no flag check) |

**Client** — `src/lib/invite/`: `types.ts`, `client.ts` (fetch wrappers,
single-flight, offline detection, the pending-completion queue),
`validate.ts` (v2 positions grammar shared with the server).
**New codec** — `src/lib/share-synastry.ts`: `s1.`-prefixed token carrying
`{ p: [wireA, wireB], l: [labelA?, labelB?], k: [timeKnownA, timeKnownB] }`
under the exact `share-positions.ts` discipline (canonical base64url,
canonical JSON, exact keys, labels ≤24 sanitized, token cap 640, hostile
input → null). Loaded on demand beside the result chrome.
**Islands:** `SynastryCalculator.tsx` (panel §2.1, `#i=` §2.3, completion +
send-back + conversion §2.4, `#s=` §2.7, meeting classes §4, `loopStart`);
`ProfileInvites.tsx` (§2.5), receiving `inviteUiEnabled` the way
`dailyEmailEnabled` is passed. Styles: `calculator.css` additions
(`.syn-invite__*`, `.syn-meet*`, `.syn-return__*`), register rows in the
`pf-*` grammar.
**Email:** the transactional send rides the Phase 3 provider path
(`RESEND_API_KEY` send-only key) as a distinct template; no segment, no
list, no unsubscribe machinery; `notify_sent_at` in the same transaction
pattern as delivery receipts.

**Gates that will move:** `/compatibility/` bundle budget (panel +
send-back + `#s=` codec lazy-loaded with result chrome; measure, bump
minimally); the analytics allowlist delta (§7) lands with the feature;
routing acceptance on a real preview deployment (carried table); Phase 1
screenshot regeneration on `src/` edits (expected);
`publicationCanonicalSha256` constant; no sitemap or schema churn.

## 9. State machines (authoritative)

Record: `ACTIVE ─open→ ACTIVE(opened_at) ─complete→ COMPLETED` ·
`ACTIVE ─revoke(owner)→ REVOKED` · `ACTIVE past expires_at ─inline |
batch | sweep→ EXPIRED` · every terminal transition nulls `positions` in
one statement · skeletons pruned at `expires_at + 7d` · create/open gated
by `COMPAT_INVITES_ENABLED`; complete/revoke/status/sweep/notify on the
server contract alone.

A panel: `signed-out → signed-in(no synced) → consenting ─pick+check→
armed ─create→ creating ─201→ ready` · `creating ─4xx/5xx/429→
consenting(+line)` · `12 active → capped`.

B surface: `idle ─#i→ loading ─ready→ ready ─compute→ computing →
completed(+signal; send-back offered; conversion once)` · `loading ─else→
invalid | closed | used | unavailable | offline(retry)` · `ready ─clear→
plain calculator`.

`#s=`: `idle ─#s→ decode ─ok→ settled result(+provenance band) ─dismiss→
result` · `decode ─fail→ retInvalid notice + plain calculator`.

## 10. Acceptance proofs (this branch) and checklist for Sol Ultra

Static, self-contained proofs in `docs/acceptance/phase4-sharing/`
(inline tokens; pastel discs under `assets/`; every board annotated with
state, strings, and the criterion it proves; screenshots at
360/390/781/1280 — email additionally at 320/600):

| Proof | Covers (task requirement) |
| --- | --- |
| `entry-consent.html` | A's entry on Compatibility + Profile action; signed-out and unsynced sign-in paths; chart picker; explicit consent (1, 2, 3) |
| `invite-created.html` | Created state: native share, copy, expiry, privacy explanation (4) |
| `profile-register.html` | Register states: waiting, opened, completed, expired, revoked (+ paused, stale) (5) |
| `arrival.html` | B's landing with A's pastel Sun identity; locked A side; B's local entry; no-time variant (6, 8) |
| `edge-states.html` | Invalid, expired/revoked (closed), used, feature-off, offline, loading, server-error, no-JS (7) |
| `meeting-motion.html` | Storyboard frames t=0/420/840/1400 + settled; skip; reduced-motion (9, 10) |
| `result-sendback.html` | Completed result; Send the result back (share/copy/download); the `#s=` returned view; the single conversion prompt (11, 12) |
| `completion-email.html` + `.txt` | The email, HTML and plain-text parity, images-blocked truth (13) |
| `share-gallery.html` | Full Chart, Big Three (re-exposed), Compatibility, daily reading surfaces at 1×/2× (14) |
| `states-a11y.html` | Focus maps, announcements, 44 px audit, stress-length copy (16) |

Widths 360/390/781/1280 per proof (15); zero horizontal overflow asserted
by the render script and re-checked by eye.

Implementation checklist (each line a test or recorded observation before
the Phase 4 DoD is claimed):

1. **B never writes birth data** — drive with request recording: the only
   non-GET requests on B's path are `open` and `complete`, bodies token
   alone, including the forced-failure replay path; repeat with save
   declined and accepted (local store only).
2. **The invitation never holds birth data** — DB assertion on a created
   row: no date/time/place/coordinate/email-shaped field exists; the v2
   grammar rejects birth-shaped input at create.
3. A→B→send-back→conversion end-to-end, including `#s=` opening settled
   on a second context with the provenance band.
4. Consent gates create; unchecked = disabled; unsynced/signed-out render
   their §2.1 states; `chartId` of another user → 403.
5. Expiry trio + one-hour pin + truth-rendering (carried tests).
6. Revocation from a second signed-in device; kill-switch drive: create
   and open 503 while revoke/status 200 and the register's End stays live.
7. Single-use durability; used responses carry nothing about A.
8. Complete/revoke race; duplicate matrix (§2.8).
9. Notify: exactly-once (`notify_sent_at` double-complete proof), silent
   skip on deleted account, revoked/expired never notify, no address in
   any table, Daily Email tables untouched by the entire flow.
10. Send-back: native-share success and cancel (cancel fires nothing),
    copy announces, download names the file per the existing card path;
    the `#s=` token round-trips; hostile `#s=` renders `retInvalid`.
11. Motion: plays once, 1.4 s, settles; input settles instantly;
    reduced-motion contexts read settled geometry on first paint;
    restores and `#s=` never animate.
12. A11y: keyboard-only over both flows and the register; announcements
    observed; ≥44 px measured on every new control; stress strings.
13. Cards: fixture renders at 1×/2×; Big Three re-exposure appears on
    chart results and B's completion only; no numeric score anywhere.
14. Analytics: §7 events with exactly their props; nothing on `/c/`;
    no token/label/positions in any payload.
15. Flag matrix: UI off → panel/register/send-back absent and builds
    byte-identical; server off → arrival `unavailable` while withdrawal
    lives; both off → the site is today. Non-EN surfaces byte-identical
    in every configuration.
16. `npm run build && npm run check && npm test` clean; no-secret build
    green; bundle receipts; Lighthouse ≥95 ×3 on `/compatibility/`
    mobile; routing table on a real preview deploy; the phase-close
    ritual (360/1280 screenshots, three cold reads, one accessory
    removed).

## 11. Decisions, assumptions, non-goals, backlog

**Decisions made here (the deltas):** account-anchored ownership (D-1);
positions-only payload with time-known flag (D-2); per-invitation
completion email on the account address (D-3); the explicit send-back
with the `#s=` synastry positions codec (D-4); Big Three card re-exposed,
daily reading stays link+OG (D-5); chart picker shows names and discs,
never birth summaries — screen-adjacency privacy (D-6); the conversion
prompt renders after the send-back, once (D-7); `#s=` arrivals render
settled with a dismissible provenance band (D-8).

**Assumptions:** PLAN.md's Phase 4 gate is now formally open (Phase 3
closed 2026-07-23) but flags stay off until Sol's own DoD evidence; the
account email is deliverable via the Phase 3 provider configuration; the
existing `#a=`/`#b=`/`#p=` codecs continue to work everywhere,
indefinitely; `RelationshipWheel` can render an A-side without houses when
angles are absent (it already renders no-time sides today).

**Non-goals now:** numeric scores (never); B-side notification; storing
anything of B's; per-invitation custom OG images; invitation re-arming or
use-count >1; cross-account invitation transfer; localization of this
deck; a shared-screen "run it together" mode.

**Backlog:** invitation push category with its own consent surface and
cap ledger; locale expansion; a register view of returned `#s=` readings
(currently they live where the reader keeps the link); notify-me added
after creation; an A-side "re-invite" shortcut from an expired row.

## 12. Blockers

None for implementation planning. Sequencing facts: the analytics
allowlist delta lands with the feature; the sweep secret and hourly
workflow are provisioning inside the feature's DoD; both flags stay off
until Sol's evidence lands in PLAN.md. The completion email requires the
already-provisioned Resend send key — no new provider.
