# Phase 3 Habit Layer — Fable implementation review (closeout)

Reviewer: Fable · Date: 2026-07-21 · Status: **implementation closeout — complete**

Reviewed baseline: `origin/main` at merge
`9ad1418f21129cfcd341859c168b4362b92e3a19` (PR #131 "Gate Phase 3 PWA
retention", merged 2026-07-21T13:11:23Z — the tip when Fable performed
the review).
Contract: `docs/PHASE3-HABIT-FABLE-HANDOFF.md`, byte-identical on main to
Fable's original handoff worktree copy and unchanged since `8affc2b`.
Prior interim review: commit `eea5cab0e4658520f07538aa133b0d21a78bc681`
(local branch `fable/phase3-implementation-review`, reviewed candidate
`f0809fe`), whose findings register this closeout re-verifies one by one.
That commit also holds the interim evidence set
(`docs/acceptance/phase3-habit/review/` — 23 headless captures, rendered
implementation emails, `evidence.json`); it was never merged, so the
findings tables below carry its substance into the record on main.

Operator integration update (2026-07-21): this review is being integrated
on `b3e3c80fc309486fae7814f8ceb47ac81753ce45`, after PR #132 added the
admin-only Daily Email bootstrap. The review-time validation and
non-action statements in §§5–6 remain Fable's historical record; current
external-gate state is recorded in §2 and the handoff in §4.

Operator formal-closure update (2026-07-23): every external Phase 3 gate
is now closed with live evidence. Three distinct Daily Email editions
reached the approved admin test address; a signed chart-tier unsubscribe
left the independently confirmed Sun-sign tier active and the selector
resumed it; the natural Mercury-direct Sky Alert received provider HTTP
`201`; and a same-day replay returned `duplicate=1` with zero additional
sends. The exact record is in §§2, 4, and 5. Public Daily Email enrollment
and public Sky-alert UI remain off, the push test allowlist remains in
place, and Phase 4 has not begun.

## 0. Closeout verdict

**Every implementation finding from the interim review is resolved on
main.** The P1 (push delivery contradicting the Sky-alerts promise) is
closed by a full rewrite of the delivery layer that implements Fable's
editorial-selection contract to the letter and moves the promised caps
into durable database authority. All seven P2s are closed — five as
specified, two by design amendments that improve on the specification and
are hereby blessed (§3). All committed gates pass on the baseline
(`npm run build && npm run check && npm test` → 168 files, **1273 tests**,
exit 0), including 94 new tests over the interim candidate.

**Phase 3 is implementation- and release-complete.** The remaining
external evidence named in Fable's 2026-07-21 review has now been obtained
without synthetic dates, backdating, broad delivery, or direct database
edits. Activation remains deliberately scoped after closure: public Daily
Email enrollment and public Sky-alert UI are off; the Daily Email canary
sender was disabled after its third qualifying receipt; and push remains
restricted to its explicit test allowlist. The evidence below satisfies
the Phase 3 Definition of Done without authorizing Phase 4.

## 1. What was verified and how

Read in full on the baseline: the handoff (unchanged), the complete
`f0809fe..9ad1418` delta (100 files, +13 761/−3 007), the rewritten
`scripts/send-daily-push.mjs` (717 lines), both Phase 3 migrations
(habit layer, now 737 lines changed; `20260720145526_phase3_delivery_guards.sql`,
797 lines) and the five new SQL test suites including concurrency tests,
the new `PostChartDailyBrief.tsx` + `post-chart-state.ts`, the amended
subscribe/confirm/provider flow, the updated email content model, the
workflows, and SETUP.md's revised Phase 3 sections. Executed locally:
`npm ci`, then the three committed gates (green, 168/1273). Verified
externally, read-only: PR #131 merged at exactly `9ad1418` (GitHub API);
Site Check run 29833324108 on that SHA concluded `success`; live
`https://zodiacs.org` serves the current versioned worker
(`CACHE_VERSION '4cd71689acaa'`, root scope) with `PUSH_ENABLED = false`
stamped and the push listener therefore unregistered; `/site.webmanifest`
returns 200 `application/manifest+json` (standalone, scope `/`, 3 icons);
`/api/email/unsubscribe` without a token fails closed with 400 while
remaining deployed. The remaining live PWA behaviors (second-chart offer,
dismissal persistence, offline Today, no stale Registry JSON) are accepted
from the operator's verification statement of 2026-07-21 and PR #131's
`tests/pwa-drive.mjs` CI gate; this review did not independently drive
those interactions and does not claim to have.

## 2. Findings table — P0–P3

Scale: **P0** release-blocking defect · **P1** blocks enabling a specific
Phase 3 flag · **P2** required before broad rollout · **P3** non-blocking
polish. Resolved items are implementation findings from the interim review
(`eea5cab`), re-verified on main. Pending items are **external evidence
gates, not implementation defects** — listed separately and deliberately
not numbered as code findings.

### Resolved implementation findings

| Interim finding | Closeout verification on main |
| --- | --- |
| **P1-1** Push delivery sent a daily note to everyone, no caps, quiet-day filler | **Resolved.** `send-daily-push.mjs` rewritten as the Sky-alerts event channel: selection exactly per Fable's editorial contract — family rank eclipse 1 > ingress 2 > aspect 3 > station 4 > lunation 5; tiebreak rank → anchor → subtype constants → id; sextiles ineligible; slow-body guards on ingress and both aspect bodies; floor-minute times (`slice(11,16)`); the hour≥12 "tonight" rule; 32/140-char payload guards; one event per UTC day; no "Next:" previews; quiet days send nothing. Caps are database authority (SETUP now says an in-memory counter "is not sufficient"): `push_alert_schedule` (`select_push_alert_event` → selected/`capped_7d`/`held_7d` reservation/conflict) plus per-subscription `push_delivery_claims` (`reserve_push_delivery` → reserved/duplicate/`capped_24h`/`capped_7d`/missing/stale; owner-token `finalize_push_delivery`; 404/410 → expired + prune). Real sends additionally require live-destination canonical verification (`verifyEventLive`, also exposed as `--verify-live-only` in the workflow) and are restricted to the current UTC day. `scripts/send-daily-push.test.mjs` byte-pins the contract fixtures: Buck Moon "Exact at **14:35** UTC" body, "Total solar eclipse today", "A rare exact alignment today", the quiet day 2026-07-22, the July-2026 stream with `mercury-stations-direct-2026-07-23 → capped_7d`, and `held_7d` reservation outcomes. The workflow smokes both an event day (2026-07-18) and the quiet day (2026-07-22) on every run. |
| **P2-1** Post-chart §2.2 states missing | **Resolved.** `src/islands/PostChartDailyBrief.tsx` (328 lines) + shared `src/lib/email/post-chart-state.ts` implement the six-state machine with §3.2 copy verbatim (device-only / signed-in-unsynced identical note in `EmailCapture.astro`; synced offer; pending "Almost on." with resend; active with profile link; paused with deliberate re-selection). Gated in CI by `tests/post-chart-daily-drive.mjs` (917 lines) since commit `775579d`. |
| **P2-2** Already-subscribed dead-end; §3.3.4 sign-change missing | **Resolved via a blessed amendment (§3).** A different-sign submit stages a `sign_change` request (separate `daily_sun_confirmation_requests` table — a pending change can never replace the active sign); the confirmation link renders §3.3.4 verbatim: "This address already gets the daily as {OldSign}. Switch it to {NewSign}?" with `Switch to {NewSign}` / `Keep {OldSign}` decisions. The subscribe boundary became **more** uniform: DOI work dispatches after the HTTP response (`waitUntil`), keeping "active, pending, throttled, and new addresses indistinguishable at the HTTP boundary", with a durable 15-minute recipient-HMAC cooldown against mail flooding. The inline/no-JS success copy is amended to stay truthful in every case: "You're set. If confirmation or a change is needed, check your inbox." |
| **P2-3** Chart email thinner than §3.5 | **Resolved.** The chart model now appends the Moon-house line from the committed `/today/` source (`houseLine` + `wholeSignHouseFromAsc`), the "Sky-wide: {collective line}" sentence, and a house-derived nearby-event line ("falls in your {nth} house — a checkpoint for {theme}.") computed against the chart's ascendant. |
| **P2-4** "Ahead:" could name a same-day event | **Resolved.** `futurePublishedEvents` starts the window at the day **after** the edition; `selectDailyEmailNearbyEvents` picks over that. |
| **P2-5** `pushProfileRow` missing | **Resolved.** `PushOptIn` renders "Sky alerts · {On/Off} — the dates that matter, by notification." in its profile context (`src/styles/push.css` additions), giving the channel its §2.6.13 profile home. |
| **P2-6** No-JS pending-page copy off-deck | **Superseded** by the P2-2 uniform-response amendment — §3.3.8's distinct pending page is retired with §2.5.7/8. Residual: the 400 sign-required page still says "Choose your sign / A sign is needed for the daily horoscope." rather than the deck's `emailCaptureMissingSign` → carried as P3-1. |
| **P2-7** Weekly digest unsubscribe kept old copy | **Resolved.** `api/unsubscribe.ts` now renders the §3.3.7 frame ("Unsubscribe?" / "This stops the weekly digest for this address. One click, effective immediately." / "Done — you're unsubscribed.") with the restart action adapted to the weekly's real home (`/profile/#weekly-digest`) — blessed. Covered by the new `weekly-unsubscribe-api.test.ts`. |

Also landed beyond the interim register, verified: a **single authoritative
daily segment** (`RESEND_DAILY_SEGMENT_ID`) replaces the twelve-sign
segment map — the sign is taken only from `daily_sun_preferences`, provider
membership is routing metadata, and split Resend capability keys
(`RESEND_API_KEY` send-only vs `RESEND_CONTACTS_API_KEY`) narrow the blast
radius of either credential, with weekly/daily segment equality rejected
fail-closed; a legacy push-subscription upgrade migration with its own SQL
fixtures; provenance-input normalization; the PWA retention drive
(`tests/pwa-drive.mjs`, 406 lines) gating installability, the second-chart
single offer, dismissal persistence, offline Today, and never-stale
Registry JSON in CI; and Phase 1 visual-evidence inputs scoped (`369f260`)
so Phase 3 edits stop churning Phase 1 screenshots — closing interim
backlog note B-10's root cause.

### Open implementation findings

| # | Sev | Finding |
| --- | --- | --- |
| P3-1 | P3 | No-JS sign-required 400 page copy ("Choose your sign / A sign is needed for the daily horoscope.", `api/email/subscribe.ts:52`) still isn't the deck's `emailCaptureMissingSign` sentence. One-string fix, next copy pass. |
| P3-2 | P3 | Chart email birth summary still omits the country (`content.ts:196`, `place?.name` only) where the profile identity line and the §3.5 example include it. |
| P3-3 | P3 | `emailCaptureError` keeps the straight-apostrophe "Couldn't…" amid curly neighbors (sanctioned by §2.5.11; unify eventually). |
| P3-4 | P3 | Interim backlog items not individually re-verified here and presumed open: email footer privacy-line order (B-2), "Read the event" trailing label (B-5), i18n catalog routing for EN-only Phase 3 strings (B-6), Outlook-desktop QA note (B-7), no-JS profile shell (B-8), transit-phrase fragment repetition (B-9), workflow arg quoting (B-12). None blocks anything. |
| OBS-1 | resolved observation | Live `/horoscopes/` pages currently ship **no** Daily Email capture (component CSS is hoisted but no markup). The current rollout deliberately stages this state: Vercel Production `DAILY_EMAIL_ENABLED` remains absent while the test-list sender gathers external evidence. No Daily Email action is due before the release ladder closes; whether to restore the separate legacy weekly capture remains a non-blocking owner/backlog decision. |

**P0: none. P1: none — no implementation defect blocks any Phase 3 flag.**
Public flags stay off pending the external gates below; server-side/test
sender capability is canary-scoped, which is the correct state, not a
finding.

### External evidence gates (not defects)

| Gate | State | What it blocks |
| --- | --- | --- |
| Postal Annex approval and sender address | **Closed.** Mailbox approved; GitHub `DAILY_EMAIL_POSTAL_ADDRESS` is `Zodiacs.org · 5013 S Louise Ave · Unit #943 · Sioux Falls, SD 57108`; the first delivered email rendered it verbatim. | Nothing further. Public enrollment remains independently gated. |
| Live daily-email ladder (SETUP §"Daily-email verification and release" 1–7) | **Closed: 3/3 distinct editions.** Runs `29849683804` (2026-07-21 Sun sign), `29908738347` (2026-07-22 chart), and `29995921748` (2026-07-23 chart) each reported `considered=1 reserved=1 sent=1 failed=0 duplicate=0`; the delivery ledger holds three matching `sent` rows and the admin mailbox holds all three messages. A signed chart unsubscribe removed only `daily_chart_preferences`, retained the confirmed Aries row, and dry-run `29998119153` selected `sun_sign` with no send. At `2026-07-23T10:16:10Z`, anonymous reads against all nine Phase 3 tables returned `401`, matching the committed RLS/grant contract. GitHub test sending was disabled at `2026-07-23T10:12:34Z`; Vercel public enrollment remains off. | Nothing in Phase 3. A future public enrollment launch still requires separate authorization. |
| Real Sky-alert scheduled-event canary | **Closed.** Natural run `29995058826` selected and sent `mercury-stations-direct-2026-07-23` (`reserved=1 sent=1 failed=0 duplicate=0`) after live destination verification. The one schedule row was selected at `2026-07-23T09:23:29.548655Z`; the one delivery row was finalized `sent` at `2026-07-23T09:23:30Z` with provider HTTP `201`. Safe replay `29998221975` returned `reserved=0 sent=0 failed=0 duplicate=1`; the ledger remained exactly one unchanged row. Production `sw.js` remains stamped `PUSH_ENABLED = false`, and `PUSH_TEST_SUBSCRIPTION_IDS=1` remains in place. | Nothing in Phase 3. Public Sky-alert UI and allowlist removal remain a separate launch decision. |
| Phase 1 external monitoring | Separate track | Nothing in Phase 3; listed to keep the ledgers distinct. |

Phase 4 is explicitly not begun.

## 3. Deck amendments blessed in this closeout

The handoff remains the copy authority; three deliberate deviations now on
main are ratified as amendments rather than defects: (1) the uniform
subscribe outcome — §2.5.7/8 inline statuses and the §3.3.8 pending page
are retired in favor of the truthful uniform "You're set. If confirmation
or a change is needed, check your inbox." (inline and no-JS), because the
per-state statuses would have been a subscription-status oracle and the
uniform boundary (with async dispatch and cooldown) is strictly more
private while the §3.3.4 email/page carries the real state to the only
person entitled to it; (2) the weekly unsubscribe restart action points at
the profile weekly checkbox rather than a capture ("Restart the weekly
digest" → `/profile/#weekly-digest`); (3) the single authoritative daily
segment supersedes §7's twelve-segment map and SETUP.md documents the
replacement contract. The interim review's blessed nits (station/aspect/
eclipse alert bodies built from committed summaries; the orb-bearing
why-line) stand.

## 4. Operator formal-closure record

### Daily Email

| Edition | Tier | Run / release SHA | Provider receipt | Sent UTC |
| --- | --- | --- | --- | --- |
| 2026-07-21 | `sun_sign` | `29849683804` / `b3e3c80fc309486fae7814f8ceb47ac81753ce45` | `22509174-e862-483f-ac2d-c3ad81d1b746` | `2026-07-21T16:41:50Z` |
| 2026-07-22 | `chart` | `29908738347` / `bcedd5374dc69d70ed9c9c43b6bf6981db56b674` | `d83e6991-5993-492d-9e22-c51124ce7b82` | `2026-07-22T09:38:30Z` |
| 2026-07-23 | `chart` | `29995921748` / `90b724722e3d8567647ab04397089fede7b091ea` | `c67dc5ef-7c41-428b-a94e-dadddadff5c6` | `2026-07-23T09:35:49Z` |

Each run used a distinct genuine publication, delivered only to
`admin@zodiacs.org`, ended
`considered=1 reserved=1 sent=1 failed=0 duplicate=0`, and has a matching
admin-mailbox receipt and `daily_email_deliveries` row.

The Aries Sun-sign double opt in is recorded at
`2026-07-21T16:34:36.291978Z`; the chart tier separately completed double
opt in before the 2026-07-22 delivery. The production chart unsubscribe
then removed the sole `daily_chart_preferences` row while the confirmed
Aries row remained unchanged. Dry-run `29998119153` selected that
surviving `sun_sign` recipient and ended
`considered=1 reserved=0 sent=0 failed=0 duplicate=0 dryRun=1`. No consent
or database row was fabricated. GitHub `DAILY_EMAIL_ENABLED` was removed
at `2026-07-23T10:12:34Z`; Vercel public enrollment and the dormant
all-recipient interlock remain off.

### Sky Alert

Natural run `29995058826` on
`90b724722e3d8567647ab04397089fede7b091ea` verified the live destination
and delivered `mercury-stations-direct-2026-07-23`:
`schedule=selected considered=1 reserved=1 sent=1 failed=0 duplicate=0`.
The schedule row is rank 4, selected at
`2026-07-23T09:23:29.548655Z`. The delivery claim is `sent`, claimed at
`2026-07-23T09:23:29Z`, finalized at `2026-07-23T09:23:30Z`, with provider
HTTP `201`.

Safe replay `29998221975` verified the same live destination and ended
`schedule=selected considered=1 reserved=0 sent=0 failed=0 duplicate=1`.
The post-replay ledger remained one unchanged claim, proving that the
database guard—not operator restraint—prevented a second send. Public
`sw.js` remains stamped `PUSH_ENABLED = false`; the test subscription
allowlist remains `1`.

### Live data boundary

Both Phase 3 migration object sets are live. At
`2026-07-23T10:16:10Z`, the publishable browser credential received `401`
for all nine Phase 3 tables, while the successful allowlisted workflows
used the service-only functions and ledgers. That is the expected live
RLS/revoked-grant contract. No public enrollment, public push UI, general
send, direct consent edit, Registry/localization/indexing change, or Phase
4 work was performed.

## 5. Validation record (Fable's review-time closeout)

| Command / check | Result |
| --- | --- |
| Review-time `git fetch origin` → `git rev-parse origin/main` | `9ad1418f21129cfcd341859c168b4362b92e3a19` — the expected production baseline when Fable ran the closeout |
| `npm ci` | clean (exit 0) |
| `npm run build && npm run check && npm test` | all green — 168 test files, 1273 tests, exit 0 |
| GitHub PR #131 (`gh pr view`) | MERGED, merge commit `9ad1418`, 2026-07-21T13:11:23Z |
| Site Check run 29833324108 (`gh run view`) | completed / **success**, headSha `9ad1418` |
| Live `sw.js` | current versioned worker (`4cd71689acaa`), root scope, `PUSH_ENABLED = false` stamped, push listener not registered |
| Live `/site.webmanifest` | 200 `application/manifest+json`, standalone, scope `/`, 3 icons |
| Live `/api/email/unsubscribe` (no token, GET) | 400 — deployed and fail-closed |
| Live `/horoscopes/leo/` | no capture markup (flag-off/unconfigured state; matches local no-env build) → OBS-1 |
| Operator integration base | `b3e3c80fc309486fae7814f8ceb47ac81753ce45` (PR #132); post-merge Site Check 29847182817 passed |
| First real Daily Email canary | 2026-07-21, run 29849683804, `considered=1 reserved=1 sent=1 failed=0`; authenticated admin Gmail receipt verified |
| Second and third Daily Email canaries | 2026-07-22 run `29908738347` and 2026-07-23 run `29995921748`; both `considered=1 reserved=1 sent=1 failed=0 duplicate=0`, with matching provider, ledger, and mailbox receipts |
| Signed chart unsubscribe | Production success page; chart preference count `1 → 0`; confirmed Aries preference retained at `2026-07-21T16:34:36.291978Z` |
| Chart-stop → Sun-sign resume | Dry-run `29998119153`, `dry-run sun_sign ad***@zodiacs.org`, `considered=1 reserved=0 sent=0 failed=0 duplicate=0 dryRun=1` |
| Live Phase 3 RLS/grant check | `2026-07-23T10:16:10Z`; nine of nine Phase 3 tables denied publishable-key reads with `401`; server-only workflows remained operational |
| Natural Sky Alert canary | Run `29995058826`; Mercury direct selected and sent once; provider HTTP `201`; one matching schedule row and one `sent` delivery claim |
| Sky Alert duplicate proof | Run `29998221975`; `reserved=0 sent=0 failed=0 duplicate=1`; post-run ledger remained one unchanged claim |
| Public release guardrails after closure | GitHub Daily Email test sender removed; Vercel public Daily Email enrollment absent; live worker `PUSH_ENABLED = false`; push test allowlist retained |
| Operator focused Vitest closure suite | 20 files, **202/202 tests passed** |
| Operator PostgreSQL 17 Phase 3 suite | Fresh-schema, concurrency, RLS/grants, consent isolation, durable delivery, and legacy push upgrade fixtures all passed |
| Operator post-chart browser gate | **291/291 checks passed** |
| Operator push browser gate | Flags-on mocked browser/API drive: **ALL PASS**; no real subscription or send |
| Operator PWA browser gate | **26/26 checks passed**, including installability, offline routes, and never-cached Registry authority JSON |
| Operator production build and checks | **3,670 pages**, `check-dist`, Russian R2, thesis drift, schema (2,508 JSON-LD documents / 9,857 graph nodes), and bundle budgets passed; Astro check reported 0 errors |

Fable's original review-time closeout changed only this document. The
operator's formal closure updates this record and `PLAN.md`; it changes no
product code or public flag. No new proofs were added under
`docs/acceptance/phase3-habit/review/` — the surfaces the interim evidence
covered are now gated by CI drives (`post-chart-daily-drive`, `pwa-drive`,
`push-drive`, the SQL suites), which is stronger than static re-captures;
the interim evidence remains available at commit `eea5cab`.

## 6. Non-action statement (Fable's review-time closeout)

This statement records Fable's closeout execution only: Fable pushed,
merged, deployed, configured, and sent nothing; its only change was this
document on an isolated local review branch. Subsequent operator actions
(PR #132, approved postal configuration, admin DOI, the three Daily Email
canaries, signed chart unsubscribe, resume proof, and the Sky Alert
delivery/duplicate proof) are reported above and are not attributed to
Fable. Phase 4 was not begun.
