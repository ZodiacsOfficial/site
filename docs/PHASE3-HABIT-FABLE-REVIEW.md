# Phase 3 Habit Layer — Fable implementation review (closeout)

Reviewer: Fable · Date: 2026-07-21 · Status: **implementation closeout — complete**

Reviewed baseline: `origin/main` at merge
`9ad1418f21129cfcd341859c168b4362b92e3a19` (PR #131 "Gate Phase 3 PWA
retention", merged 2026-07-21T13:11:23Z — main has not advanced past it).
Contract: `docs/PHASE3-HABIT-FABLE-HANDOFF.md`, byte-identical on main to
Fable's original handoff worktree copy and unchanged since `8affc2b`.
Prior interim review: commit `eea5cab0e4658520f07538aa133b0d21a78bc681`
(local branch `fable/phase3-implementation-review`, reviewed candidate
`f0809fe`), whose findings register this closeout re-verifies one by one.
That commit also holds the interim evidence set
(`docs/acceptance/phase3-habit/review/` — 23 headless captures, rendered
implementation emails, `evidence.json`); it was never merged, so the
findings tables below carry its substance into the record on main.

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

**Phase 3 is implementation-complete but not release-complete.** What
remains is exclusively external evidence, not code: the Postal Annex
approval, the live daily-email release ladder (double-opt-in, per-tier
unsubscribe, three distinct-edition test-list canaries), and the real
scheduled Sky-alert canary. All Phase 3 flags remain off, correctly, until
those gates close. Nothing in this review claims otherwise, and nothing
here substitutes for the SETUP.md release evidence.

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
| OBS-1 | note | Live `/horoscopes/` pages currently ship **no** email capture at all (component CSS is hoisted but no markup — the documented absent-when-unconfigured state; a local no-env build renders identically). This is environment, not code: the production build has no complete capture provider configured. If the weekly capture is *meant* to be live pre-launch, the build env needs the weekly provider variables; if it is deliberate staging, no action. Owner to confirm intent — flagged only so the silence is a decision, not an accident. |

**P0: none. P1: none — no implementation defect blocks any Phase 3 flag.**
The flags stay off pending the external gates below, which is the correct
state, not a finding.

### Pending external evidence gates (not defects)

| Gate | State | What it blocks |
| --- | --- | --- |
| Postal Annex approval | Pending, ~2–3 business days from 2026-07-21 | Any real daily-email send. `DAILY_EMAIL_POSTAL_ADDRESS` must remain unset — no placeholder, no substitute address, anywhere, until approval is confirmed. The sender hard-requires it for real sends; it is a GitHub variable, currently absent. |
| Live daily-email ladder (SETUP §"Daily-email verification and release" 1–7) | Not started | Both `DAILY_EMAIL_ENABLED` values. Needs: both migrations applied + RLS checklist against the live project, dry-run dispatch, three consecutive distinct-edition test-list sends, live per-tier one-click unsubscribe proof, and the chart-stop → Sun-resume proof, all recorded in PLAN.md. |
| Real Sky-alert scheduled-event canary | Pending, monitored asynchronously | The push flag trio (`PUBLIC_WEB_PUSH_ENABLED`/`PUSH_ENABLED` + GitHub `PUSH_ENABLED=true`). Runs through `PUSH_TEST_SUBSCRIPTION_IDS` without enabling the schedule. |
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

## 4. Handoff to Sol — exact next actions

**After Postal Annex approval (and only then):**

1. Set `DAILY_EMAIL_POSTAL_ADDRESS` as a GitHub Actions variable to the
   approved annex address, exactly as approved — never a placeholder. Do
   not set any Vercel flag yet.
2. Apply and verify both Phase 3 migrations against the live project per
   SETUP §Supabase (RLS on, zero browser policies, ownership FK, timezone
   constraint, receipt uniqueness, guards tables + RPCs present), then run
   the Supabase security checklist.
3. Walk SETUP §"Daily-email verification and release" strictly in order:
   fixture smoke → workflow dispatch `dry_run=true` → set GitHub
   `DAILY_EMAIL_ENABLED=1` + `DAILY_EMAIL_TEST_ALLOWLIST` → three
   consecutive real test-list sends on distinct eligible editions (a
   duplicate/skip does not count; a gap breaks the streak) → prove each
   live first-party unsubscribe revokes only its named tier → prove
   chart-tier stop lets the confirmed Sun daily resume. Record every piece
   in PLAN.md.
4. Only after that evidence: enable the Vercel `DAILY_EMAIL_ENABLED=1`
   enrollment flag. The `all` cohort stays locked behind a separately
   approved workflow change regardless.

**After the Sky-alert scheduled-event canary:**

1. The canary path is already built: on a true event day, populate
   `PUSH_TEST_SUBSCRIPTION_IDS` with the explicit test subscription ids
   and dispatch with `dry_run=false` — `authorizeRealDelivery` permits the
   send without `PUSH_ENABLED`, `verifyEventLive` gates on the live
   destination, and the claims ledger records it. Next natural windows
   from the committed timeline: 2026-07-23 (Mercury turns direct) and
   2026-07-29 (Buck Moon).
2. On success, record in PLAN.md: the `sky-alert:` report line
   (`schedule=selected`, sent/capped counts), the provider status, the
   received notification (device screenshot), the `push_alert_schedule`
   and `push_delivery_claims` rows, and a same-day re-dispatch showing
   `duplicate` — proving the caps ledger, not asserting it.
3. Only then flip the push trio per SETUP §Push provisioning step 7
   (Vercel `PUBLIC_WEB_PUSH_ENABLED=1` + `PUSH_ENABLED=1`, GitHub
   `PUSH_ENABLED=true`), and clear `PUSH_TEST_SUBSCRIPTION_IDS` for the
   enabled schedule. On any failure: flags stay off; the claims table is
   the failure receipt; fix forward, re-canary.
4. Independently of both: P3-1…P3-3 in the next copy/polish pass, and the
   owner confirms OBS-1 (live weekly-capture absence) is intentional.

## 5. Validation record (this closeout)

| Command / check | Result |
| --- | --- |
| `git fetch origin` → `git rev-parse origin/main` | `9ad1418f21129cfcd341859c168b4362b92e3a19` — equals the expected production baseline; no descendants |
| `npm ci` | clean (exit 0) |
| `npm run build && npm run check && npm test` | all green — 168 test files, 1273 tests, exit 0 |
| GitHub PR #131 (`gh pr view`) | MERGED, merge commit `9ad1418`, 2026-07-21T13:11:23Z |
| Site Check run 29833324108 (`gh run view`) | completed / **success**, headSha `9ad1418` |
| Live `sw.js` | current versioned worker (`4cd71689acaa`), root scope, `PUSH_ENABLED = false` stamped, push listener not registered |
| Live `/site.webmanifest` | 200 `application/manifest+json`, standalone, scope `/`, 3 icons |
| Live `/api/email/unsubscribe` (no token, GET) | 400 — deployed and fail-closed |
| Live `/horoscopes/leo/` | no capture markup (flag-off/unconfigured state; matches local no-env build) → OBS-1 |

This closeout changed only this document. No new proofs were added under
`docs/acceptance/phase3-habit/review/` — the surfaces the interim evidence
covered are now gated by CI drives (`post-chart-daily-drive`, `pwa-drive`,
`push-drive`, the SQL suites), which is stronger than static re-captures;
the interim evidence remains available at commit `eea5cab`.

## 6. Non-action statement

Nothing was pushed, merged, or deployed; no product code, copy, flag,
environment variable, navigation, email or push configuration was changed;
no email was sent and no push notification was triggered; no postal
address was published, configured, or substituted; no migration was
applied; Phase 4 was not begun. All zodiacs.org access was read-only GET
requests. The only change is this docs-only commit on an isolated local
review branch.
