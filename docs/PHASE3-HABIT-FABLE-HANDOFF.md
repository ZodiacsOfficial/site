# Phase 3 Habit Layer — Fable handoff (reader experience, final copy, states)

Author: Fable · Branch: `fable/phase3-habit-experience` · Base: `cce23d2`
(latest `origin/main`, the Phase 2 production baseline).

This is the decision-complete design, UX, and copy contract for the Phase 3
Habit Layer. Sol Ultra implements from this document and the static proofs
in `docs/acceptance/phase3-habit/` without inventing copy, states, layouts,
or interaction decisions. Nothing here is production code; no flags move.

Sources studied in full: the master brief (Phase 3, privacy architecture,
DoD, cross-cutting rules), SETUP.md, PLAN.md (context only),
docs/EMAIL-CAPTURE.md, docs/WEEKLY-DIGEST.md, docs/SUPABASE.md,
docs/ANALYTICS.md, `EmailCapture.astro`, `PwaInstallPrompt.tsx`,
`PushOptIn.tsx`, `TodayBrief.tsx`, `ChartCalculator.tsx`, the pwa/push
string catalogs and styles, and the committed Phase 1/2 fixtures
(`daily-publication.json` 2026-07-20 edition, `events-publication.json`,
`horoscope-program.json`, `src/lib/events/interpretations.ts`,
`demo-chart-frida.json`). Every astrology example below is drawn from that
committed material; no event, aspect, date, or transit is invented.

## 0. What changes, in one page

1. **The inline email capture changes product.** The three existing
   placements (horoscopes, post-chart, footer) currently sell the weekly
   forecast. They become the **sun-sign daily** — the natural daily habit
   offer. The `emailCapture*` string values in
   `src/lib/i18n/ui/growth.ts` are superseded by §3.1 (same keys, new
   English values, plus new keys). The weekly digest survives untouched as
   a separate account preference on /profile/ and is never offered inline.
2. **A second, clearly separate tier appears: the personal daily brief**
   (chart-tier). It exists only inside /profile/ for signed-in readers
   with synced charts, on explicit consent, for exactly one selected
   chart. Post-chart surfaces may point to it; they never enroll into it.
3. **Push is re-founded as “Sky alerts.”** The current push strings frame
   push as a generic daily note; that framing is retired (§3.6 supersedes
   `src/strings/push.ts` English values). Push carries only verified
   sky-event alerts and chart-tier high-signal transits, within Sol’s
   fixed caps (one per 24 h, two per rolling 7 days). No quiet-day filler.
4. **PWA install choreography is kept** (it already follows the rules:
   earned after the second chart, either sheet outcome is final) — §2.6
   specifies the full state set and how install relates to the later push
   offer. The existing `PWA_PROMPT_EN` copy stays as-is.
5. **One email per reader per day.** If one address holds both tiers, the
   chart-tier brief supersedes the sun-sign daily that day (§2.3.8).

The rule everywhere: **people came to enjoy the meal, not tour the
kitchen.** The reading leads; consent is explicit and calm; method and
privacy detail stay one quiet line or one disclosure away — present,
never headlining. Banned from primary copy: “actual sky”, “facts layer”,
“evidence proportion”, “computed server-side”, “AI-operated”,
“methodologically verified”, provider/database names, and all existing
voice-rule tells (no exclamation marks, no “delve/unlock/…”, no smug
tells, no “the universe says”, no urgency theater, no shame at declining).

## 1. Consent hierarchy and tier boundary

| | Sun-sign daily | Personal daily brief (chart-tier) |
| --- | --- | --- |
| Who | Anyone with an email | Signed-in readers who already sync charts |
| Stored | Email + one self-declared sign, nothing else | Account email + the one selected synced chart + timezone preference + consent state |
| Sign source | Reader declares it (optionally preselected from a computed chart, still editable) | The selected synced chart itself |
| Delivery time | UTC morning, fixed | Reader-chosen timezone (account preference), 07:00 local |
| Consent | Double opt-in by email confirmation | Explicit in-profile enrollment **plus** the same email confirmation when the address is not yet confirmed |
| Ends when | One-click unsubscribe | Opt-out in profile, unsubscribe link, or selected-chart deletion (delivery stops; nothing is substituted) |

Boundary rules Sol must enforce exactly:

- A **device-only chart can never enter email**. No surface may list a
  device-only chart as selectable for the personal brief, imply future
  eligibility, or auto-sync it. The only path is the reader’s own
  deliberate sync choice, made in the existing sync UI.
- The personal brief reads **exactly one** selected chart. Deleting that
  chart pauses delivery the same day; the reader is told in profile (and
  in the next profile visit’s banner), and **no other chart is ever
  substituted silently**.
- Weekly digest and daily brief are separate preferences with separate
  copy blocks and separate toggles; neither ever changes the other.
- One address, both tiers → the personal brief supersedes the sun-sign
  daily (single daily email). If the personal brief later stops (opt-out
  or chart deletion), the sun-sign daily resumes on its own without a new
  confirmation — the reader is told this at opt-out time (§2.4.7).
- Every consent is reversible from the same place it was given, plus from
  every email’s footer.

## 2. Reader journey and state contract

Shared layout rules for all capture surfaces: existing component
structure and classes (`.email-capture`, `--horoscopes|chart|footer`
modifiers); capture always **after** the content it accompanies; one
primary action per surface; no popups, no exit intent, no scroll-jacking;
44 px minimum touch targets (the current 44–46 px controls already
comply); visible focus (existing `outline: 2px solid var(--ink-0)`
pattern); no new colors; pastel `SignIcon` discs are the only sign
rendering; no orchestrated animation — the only motion is the existing
180 ms disc/press feedback, disabled under reduced motion.

### 2.1 Daily horoscope placement (`placement="horoscopes"`)

Where: unchanged — after the reading and the FAQ on /horoscopes/ pages
and the twelve sign dailies, before the sign-grid footer navigation.
Never between the headline and the reading.

Content: §3.1 daily strings, with the sign preselected on per-sign pages
(`sign` prop already supports this) and the chooser open on the hub.
Visual emphasis: the existing quiet `--hair-2` bordered card; the reading
above it keeps the display typography; the capture heading stays
`--text-xl` serif — subordinate to the page’s h1 and reading.

State machine: §2.5. Analytics: existing `email_capture_viewed` /
`email_subscribed` with `placement: 'horoscopes'` — no new events.

### 2.2 Post-chart-result placement (`placement="chart"`)

Where: unchanged — inside the birth-chart result flow, revealed after a
full chart computes (`zodiacs:chart-computed`, mode `full`), below the
reading and receipts, above the page footer. The computed Sun sign
preselects the capture sign (existing behavior); the reader can change
it — a declared sign, not an inferred obligation.

The surface renders exactly one of six states. States 3–6 replace the
capture card’s right column with the personal-brief panel (§3.2 copy);
the sun-sign capture form remains available beneath it in states 3–4 as
the lighter alternative, and disappears in states 5–6 (the reader already
has a daily; §1 single-email rule).

1. **Device-only chart** (not signed in, or signed in with sync off for
   this chart): the sun-sign daily capture, exactly as §2.1, sign
   preselected. Beneath the privacy line, one quiet secondary line —
   `postChartDeviceOnlyNote` — states that a matched-to-this-chart brief
   exists only for account-synced charts and links “How chart sync works”
   to the existing sync explainer. No button, no pressure, no implication
   that this chart is eligible. The note never renders as a form control.
2. **Signed in, this chart unsynced**: identical to state 1 (an unsynced
   chart is device-only). The note’s link points at the same sync
   explainer; signing in changes nothing about this chart’s eligibility.
3. **Synced chart, no daily preference yet**: the personal-brief offer
   panel — `postChartSyncedTitle` + `postChartSyncedBody` + single
   primary action `postChartSyncedCta` linking `/profile/#daily-brief`.
   Enrollment happens only in profile (§2.4); this surface never collects
   consent itself. Sun-sign capture stays below as the alternative.
4. **Synced chart, personal brief pending confirmation**: status panel
   `postChartPendingTitle/Body` naming the masked address, with the
   single action `postChartPendingResend` (same resend rules as §2.5.7).
5. **Synced chart, personal brief active for this chart**: quiet
   confirmation panel `postChartActiveBody` naming the chart name and a
   text link to profile. No form, no second CTA.
6. **Personal brief active but its selected chart deleted/unavailable**:
   paused-state panel `postChartPausedTitle/Body` with single action
   `postChartPausedCta` → `/profile/#daily-brief`. Never auto-selects the
   currently displayed chart; the choice is made in profile.

### 2.3 Profile preference (`/profile/#daily-brief`)

A new “Personal daily brief” section on the existing profile page,
directly above the existing weekly-digest preference, separated by the
standard hairline rule. The weekly block keeps its exact current copy
and toggle; the two sections never share controls, and the daily section
never mentions the weekly except in `profileDailyVsWeekly` (one line, so
the two cannot be confused).

Composition (states below share this frame): section heading
`profileDailyTitle` (serif, `--text-xl`), one-line dek
`profileDailyBody`, then:

1. **Signed out** → the section renders the existing signed-out profile
   treatment (sign-in first); no daily-brief controls.
2. **No synced charts** → `profileDailyNoChartsBody` + text link to the
   sync explainer. Device-only charts are not listed — ever.
3. **Eligible, not enrolled** → a radio list of synced charts (chart
   name in `--text` weight 550; identity line beneath in `--text-sm
   --muted` from the chart’s stored birth summary, e.g. “July 6, 1907 ·
   8:30 AM · Coyoacán, Mexico”), a timezone `<select>` labeled
   `profileDailyTimezoneLabel` defaulting to `profileDailyTimezoneUtc`
   (“UTC morning”), and the single primary action `profileDailyEnroll`.
   The consent sentence `profileDailyConsentNote` sits directly above the
   button. Radio + select + button are all ≥44 px, native controls.
4. **Pending confirmation** → `profileDailyPendingTitle/Body` (masked
   address) + `profileDailyPendingResend` + text cancel link
   `profileDailyPendingCancel` (cancels the pending enrollment, keeps
   nothing).
5. **Active** → summary card: `profileDailyActiveLine` naming chart +
   delivery time; controls: change chart (opens the same radio list with
   the current selection; switching applies immediately with status line
   `profileDailyChartChanged`), change timezone (same select, immediate,
   `profileDailyTimezoneChanged`), and the opt-out button
   `profileDailyStop` with its consequence line `profileDailyStopNote`
   (also states that the sun-sign daily, if that address has one, resumes
   on its own). Opt-out is one click plus no confirmation modal — it is
   reversible, not destructive.
6. **Selected chart deleted** → banner `profileDailyPausedBanner` at the
   top of the section + state 3’s chart list to choose a replacement
   deliberately. Delivery remains stopped until the reader chooses.
7. **Weekly digest** → untouched existing block, below, with its current
   strings. `profileDailyVsWeekly` renders once between the sections.

### 2.4 Footer placement (`placement="footer"`)

Where: unchanged (above SiteFooter on high-intent pages). Lowest
emphasis: kicker + one-line title + email row + collapsed sign chooser +
privacy line. It never grows the personal-brief panel, never names the
chart tier, and must not compete with footer navigation — the existing
`--footer` modifier’s tighter margins stay. Copy: §3.1 footer variants.

### 2.5 Form and lifecycle states (all capture placements)

The capture form’s states, with copy in §3.1. Status messages render in
the existing `role="status"` live region; error styling uses `--text-2`
on the status line and the browser-native invalid outline — no new error
chrome, no red (no new colors).

1. **Untouched** — form as rendered; submit enabled (validation on
   submit, not on keystroke).
2. **Valid** — no special chrome; the submit simply works.
3. **Invalid email** — native `reportValidity()` bubble plus status line
   `emailCaptureInvalidEmail` after a failed submit attempt. Focus
   returns to the email field.
4. **Missing sign** — the sun-sign daily requires a sign (unlike the old
   weekly). The “Skip the sign” option is replaced by
   `emailCaptureNoSignDaily` (“I’ll pick later — send the all-signs
   edition” is **not** offered; there is no all-signs daily). If no sign
   is chosen at submit: status `emailCaptureMissingSign`, focus moves to
   the sign group. On per-sign and post-chart placements a sign is
   already selected, so this state is reachable only on the hub/footer.
5. **Submitting** — button disabled with `emailCaptureSubmitting`;
   inputs stay enabled; no spinner beyond the label swap.
6. **Confirmation sent** (success) — `emailCaptureSuccessDaily` in the
   status region; form resets; the sign summary keeps the chosen sign.
7. **Duplicate pending request** — same address resubmits before
   confirming: the API responds success-shaped; status shows
   `emailCapturePendingAgain` (a fresh link was sent; only the newest
   works). Never an error, never “already requested” shame.
8. **Already subscribed** — success-shaped response; status
   `emailCaptureAlreadyOn`. If the submitted sign differs from the stored
   one, the confirmation email offers the sign change (§3.3.4) — the
   inline surface stays calm either way.
9. **Expired confirmation** (48 h) — confirmation page state
   `emailConfirmInvalid*` (§3.3.6) with the resubscribe path; the inline
   form is not involved.
10. **Tampered confirmation** — same rendering as expired (one calm
    invalid-link state; no forensic detail).
11. **Provider unavailable** — POST failed/5xx: status
    `emailCaptureError` (existing string kept), form values preserved,
    button re-enabled.
12. **Confirmed** — confirmation page (§3.3.5); the inline surfaces show
    nothing new until the next render with subscriber context.
13. **Unsubscribed** — one-click from email → §3.3.7 page; no guilt, an
    unemphasized resubscribe affordance.
14. **Explicit resubscribe** — from the unsubscribed page or a fresh
    form submit; runs the normal double opt-in again (§3.3.8).

No-JS: the form is a plain POST (existing `action="/api/email/subscribe"`);
the server answers with the scanner-safe pending page (§3.3.2) instead of
inline status. Feature-off (no provider configured): the component is
absent entirely — pages remain complete (existing behavior, kept).

### 2.6 PWA and push states

**Install (existing island, kept; storyboard proof `pwa-install/`):**

1. **Eligible** — second successful chart on a supported browser, not
   standalone, not previously dismissed → the quiet 12-disc card
   (existing `PWA_PROMPT_EN` copy) below the result. One offer.
2. **Unsupported** (no `beforeinstallprompt`, not iOS) — nothing renders.
3. **Already installed** (standalone) — nothing renders, ever.
4. **Dismissed** — either sheet outcome or “No, do not ask again” is
   final; recorded locally; never re-offered.
5. **iOS install-first** — same card with the Share → Add to Home Screen
   instruction instead of a button (existing `ios` copy).

**Push (“Sky alerts”; copy §3.6 supersedes `push.ts` EN):**

6. **Permission default, offer not yet made** — nothing renders until a
   contextual moment: after a chart save (`chart-save`) or a return
   visit to /today/ (`today-return`), once, claim-based (existing
   mechanics). The offer is a quiet card, never a native prompt.
7. **Intentional permission request** — the native prompt appears only
   after the reader presses `pushAccept` on the offer card. No other
   path may trigger it. On iOS Safari without standalone, the offer is
   replaced by the install-first card (state 5’s copy + `pushIosNote`).
8. **Granted** → subscribe flow; on success, state 10.
9. **Denied** — card shows `pushDenied`; recorded as dismissed; the
   channel is never re-offered by us (browser settings are the way
   back — the copy says so without instructions-nagging).
10. **Subscribed** — confirmation card `pushOn` with `pushOff` control;
    thereafter the surface stays silent except in profile-like contexts.
11. **Unsubscribed** — `pushOff` pressed → server + browser subscription
    removed; card collapses to nothing; local state `dismissed` (no
    re-offer; the reader knows where it lives).
12. **Expired subscription** — endpoint gone (delivery-side 404/410):
    server prunes silently; on the next eligible contextual visit the
    claim is reopened and the offer may appear once more (`pushReOffer`
    body). Never a “something broke” message for the reader.
13. **Later re-offer** — only after expiry (state 12) or a fresh profile
    visit to a dedicated alerts row; dismissals and denials are final on
    the contextual surfaces.

Cap disclosure: the offer card and the subscribed card both carry the
plain cap sentence (`pushCapLine`) — at most one notification a day, two
a week, most days none. Sol’s delivery layer enforces it; the copy
promises it.

Operational notes folded into this contract (verified against the repo):
the footer capture is already suppressed on /birth-chart, /horoscopes,
and /profile routes (`SiteFooter.astro:35`) — keep that, so no page ever
carries two captures. Duplicate/pending submits already return a
success-shaped `{ ok, pending }` (§2.5.7 builds on it). Confirmation
links live 48 hours (`EMAIL_OPT_IN_TTL_MS`). The standalone list’s
unsubscribe is provider-managed today; **Phase 3 requirement:** both new
dailies use the digest’s first-party pattern instead — RFC 8058
one-click `List-Unsubscribe-Post` plus a scanner-safe GET page with a
confirm button (`/api/unsubscribe` idiom) — so §3.3.7’s copy applies to
every list. No timezone is stored anywhere today; the chart-tier
timezone preference is net-new account state (Sol adds the migration),
and the sun-sign tier stores none — it is UTC-morning by definition.
Analytics stays inside the existing allowlist (`email_capture_viewed`,
`email_subscribed` with `placement`; `push_prompt`, `push_subscribe`);
no new events are required for launch.

## 3. Final English copy deck

Rules of use: strings are final and implementation-ready; `{braces}` are
runtime substitutions; nothing here may gain exclamation marks, urgency,
or method language in transit. Masked addresses render as first letter +
three dots + domain (`f…@example.com`). Em dashes are spaced (` — `)
per house style. Sign names are Title Case; “Sun sign” capitalizes Sun.

### 3.1 Capture strings (supersede `emailCapture*` EN values in `growth.ts`)

| Key | Final English |
| --- | --- |
| emailCaptureKicker | Free daily forecast |
| emailCaptureTitle | Your day ahead. |
| emailCapturePersonalTitle | Your {sign} day ahead. |
| emailCaptureCopy | Each morning, the day’s reading for your sign — one email, free, unsubscribe anytime. |
| emailCaptureEmailLabel | Email address |
| emailCaptureEmailPlaceholder | you@example.com |
| emailCaptureSignLegend | Your Sun sign |
| emailCaptureUsingSign | Using your Sun sign: {sign} |
| emailCaptureChangeSign | Change |
| emailCaptureSubmit | Start my daily |
| emailCaptureSubmitting | Starting… |
| emailCaptureSuccess | Check your email — nothing starts until you confirm. |
| emailCaptureMissingSign | Pick your sign first — the daily is written per sign. |
| emailCaptureInvalidEmail | That email address doesn’t look complete. |
| emailCapturePendingAgain | Another confirmation link is on its way. The newest link is the one that works. |
| emailCaptureAlreadyOn | This address already gets the daily. The next one arrives tomorrow morning. |
| emailCaptureErrorTitle | Subscription unavailable |
| emailCaptureError | Couldn’t start the subscription. Please try again. |
| emailCapturePrivacy | We store your email and your chosen sign — nothing else. Never your birth details. |
| emailCaptureHoneypot | Leave this field blank |
| emailCaptureFooterTitle | The daily, by email. |
| emailCaptureFooterCopy | Your sign’s reading each morning. Free, unsubscribe anytime. |

Structural change from the weekly capture: **the sign is required** (there
is no all-signs daily), so the “Skip the sign” radio is removed and the
legend drops “(optional)”. The footer placement uses `FooterTitle` /
`FooterCopy` with the kicker omitted; the other placements use the
standard set. Everything else about the component (honeypot, live
region, disc chooser, analytics) is unchanged.

### 3.2 Post-chart and profile strings (new keys)

| Key | Final English |
| --- | --- |
| postChartDeviceOnlyNote | Prefer a brief matched to this exact chart? That exists only for account-synced charts — syncing is always your call, and this chart stays on your device until you make it. {link:How chart sync works} |
| postChartSyncedTitle | This chart can have its own daily brief. |
| postChartSyncedBody | A personal morning email for {chartName} — where each day’s sky touches its saved placements, not just its Sun sign. |
| postChartSyncedCta | Set it up in your profile |
| postChartPendingTitle | Almost on. |
| postChartPendingBody | Confirm from the email we sent to {maskedEmail} and the daily brief begins. |
| postChartPendingResend | Resend the link |
| postChartActiveBody | The personal daily brief is on for {chartName}. Manage it in your profile. |
| postChartPausedTitle | Your daily brief is paused. |
| postChartPausedBody | The chart it read was deleted, so delivery stopped. Choose another synced chart whenever you’re ready — nothing is chosen for you. |
| postChartPausedCta | Choose in your profile |
| profileDailyTitle | Personal daily brief |
| profileDailyBody | One synced chart, read against each morning’s sky, in your inbox. |
| profileDailyNoChartsBody | This needs a synced chart. Charts saved only on this device never enter email — sync one first if you want the brief. {link:How chart sync works} |
| profileDailyChartLegend | Which chart should the brief read? |
| profileDailyTimezoneLabel | Deliver around 7:00 in |
| profileDailyTimezoneUtc | UTC (the default morning) |
| profileDailyConsentNote | One email each morning for this chart. Stop anytime here, or from any email’s unsubscribe link. |
| profileDailyEnroll | Start my daily brief |
| profileDailyPendingTitle | Confirm from your inbox. |
| profileDailyPendingBody | We sent a link to {maskedEmail}. The brief begins after you confirm — until then, nothing is sent. |
| profileDailyPendingResend | Resend the link |
| profileDailyPendingCancel | Cancel this request |
| profileDailyActiveLine | On · reading {chartName} · arriving around 7:00, {timezoneLabel} |
| profileDailyChangeChart | Change chart |
| profileDailyChartChanged | Switched. Tomorrow’s brief reads {chartName}. |
| profileDailyTimezoneChanged | Saved. Tomorrow arrives around 7:00, {timezoneLabel}. |
| profileDailyStop | Stop the daily brief |
| profileDailyStopNote | Stops the personal brief immediately. If this address also has the sun-sign daily, that one resumes on its own. |
| profileDailyPausedBanner | Paused — the chart this brief read was deleted. Delivery stays stopped until you choose another below. |
| profileDailyVsWeekly | Separate from the weekly: the “Personalized weekly sky email” below remains its own choice. |

The weekly digest block below the daily section keeps its live strings
verbatim (`digestTitle` “Personalized weekly sky email”, `digestCopy`
“A forecast based on your synced saved chart. Off until you check this
box.”, `digestSaved`, `digestFailed`, `weeklyDigestAria`).

### 3.3 Email lifecycle pages and messages

1. **Confirmation email — sun-sign daily.** Subject:
   `Confirm your Zodiacs.org daily forecast`. Body (text-first):

   > Confirm that you want the free Zodiacs.org daily forecast for
   > {SignName}:
   >
   > [Confirm subscription] ({confirmUrl})
   >
   > The link works for 48 hours. If you did not request this, ignore
   > this email — nothing will be subscribed.

2. **Confirmation email — personal daily brief.** Subject:
   `Confirm your Zodiacs.org personal daily brief`. Body as above with
   the first line: “Confirm that you want the personal daily brief for
   {chartName}:”.

3. **Scanner-safe confirmation page (GET — read-only).** Title
   `One last check.` Body: “Confirm this subscription to start the free
   daily forecast. Until you do, nothing is active.” Single button:
   `Confirm subscription` (POST). Chart-tier body variant: “…to start
   the personal daily brief for {chartName}. Until you do, nothing is
   sent.”

4. **Sign-change confirmation (already-subscribed, different sign).**
   Same page frame; body: “This address already gets the daily as
   {OldSign}. Switch it to {NewSign}?” Button: `Switch to {NewSign}`.
   Secondary text link: `Keep {OldSign}` (closes to the confirmed page).

5. **Confirmed page.** Title `Subscription confirmed.` Sun-sign body:
   “Your {SignName} daily starts tomorrow morning. Every email includes
   an unsubscribe link.” Chart-tier body: “The personal daily brief for
   {chartName} starts tomorrow morning. Manage it anytime in your
   profile.” One action: `Return to Zodiacs.org`.

6. **Invalid or expired link page.** Title `This link is not valid.`
   Body: “It may have expired — links work for 48 hours — or already
   been used. Request a fresh one from any daily signup on the site.”
   One action: `Request a new link` → /horoscopes/ (capture anchor).
   Tampered links render this same page; no distinction is surfaced.

7. **Unsubscribe.** One-click (RFC 8058 POST) unsubscribes immediately.
   Browser GET page — title `Unsubscribe?` body: “This stops the
   {listName} for {maskedEmail}. One click, effective immediately.”
   button `Confirm unsubscribe`. Done page — title `Done — you’re
   unsubscribed.` body: “No more {listName}. If you change your mind,
   restart below — a fresh confirmation email comes first.” action
   `Restart the daily` (secondary emphasis; runs full double opt-in).
   {listName} values: “sun-sign daily”, “personal daily brief”,
   “weekly digest”. No guilt copy, no “sorry to see you go”.

8. **Resubscribe.** `Restart the daily` submits the stored address to
   the normal subscribe flow → §2.5.6 pending state page copy: title
   `Check your email.` body “Use the confirmation link we sent — the
   daily starts after you confirm.”

### 3.4 Sun-sign daily email (complete example — committed 2026-07-20 Leo edition)

Every sentence below is drawn from `daily-publication.json` (2026-07-20)
and `events-publication.json`; the template slots generalize. Subject
formula: `{Sign} today — {three-to-six-word theme from the edition’s
headline}`. Never a cliffhanger, never “you won’t believe”.

- **Subject:** `Leo today — messages come to the front`
- **Preheader:** `The Moon works your third house; Jupiter’s trine to
  Neptune is exact at 07:47 UTC.`

**HTML composition (600 px artboard; single column; dark void surface):**

1. Identity row — pastel Leo disc (the committed
   `/assets/zodiac-icons/128/leo.webp`, rendered 44 px, alt “Leo”),
   `LEO · MONDAY, JULY 20, 2026` in mono caps 11 px `#7A8397`,
   wordmark `Zodiacs.org` right-aligned, 13 px.
2. Reading — serif headline (EB Garamond, Georgia fallback), the
   edition’s own line:
   > The Moon spends today in your third house — errands, siblings,
   > messages, and the near neighborhood.
   Then the edition’s collective lines as two short paragraphs:
   > Jupiter’s trine to Neptune is exact today — sky-wide weather,
   > worth knowing the hour: 07:47 UTC.
   >
   > Jupiter also stands exactly opposite Pluto this afternoon,
   > 14:45 UTC — the second of the week’s two big alignments.
3. Nearby-event line (optional; present when the events publication has
   one inside nine days) — hairline-topped row:
   > Ahead: the Buck Moon — full moon in Aquarius, July 29.
   linked to `/full-moon/2026-07-29/`.
4. One primary action — button `Read the full Leo daily` →
   `https://zodiacs.org/horoscopes/leo/` (ink-on-pale button; the only
   button in the email).
5. Footer, 12 px `#7A8397`: “You asked for the Leo daily at
   zodiacs.org.” · `Unsubscribe` (one-click link) · “Your email and your
   chosen sign are all we store — never birth details.” ·
   Zodiacs.org postal line placeholder `{senderPostalAddress}`.

**Ordinary-day state:** block 3 is simply absent — nothing replaces it,
no “quiet day” filler. The reading carries the email.

**Plain-text version (full parity, sent as the text part):**

```
LEO · MONDAY, JULY 20, 2026

The Moon spends today in your third house — errands, siblings,
messages, and the near neighborhood.

Jupiter's trine to Neptune is exact today — sky-wide weather, worth
knowing the hour: 07:47 UTC.

Jupiter also stands exactly opposite Pluto this afternoon, 14:45 UTC —
the second of the week's two big alignments.

Ahead: the Buck Moon — full moon in Aquarius, July 29.
https://zodiacs.org/full-moon/2026-07-29/

Read the full Leo daily:
https://zodiacs.org/horoscopes/leo/

—
You asked for the Leo daily at zodiacs.org.
Unsubscribe: {unsubscribeUrl}
Your email and your chosen sign are all we store — never birth details.
{senderPostalAddress}
```

### 3.5 Chart-tier daily email (complete example — demo chart, committed facts)

Grounding: the committed demo chart (`demo-chart-frida.json`: natal
Mercury 6°20′ Leo, Leo rising) against the committed 2026-07-20 sky
(Jupiter 4°25′ Leo — inside two degrees of that natal Mercury; Moon
16°41′ Libra — the chart’s third house by the declared whole-sign
method; Jupiter–Neptune trine exact 07:47 UTC). The quiet-day sentence
is the live TodayBrief string. Subject formula: `Your chart today —
{the day’s strongest contact, plainly}`; quiet days use `Your chart
today — a quieter sky`.

- **Subject:** `Your chart today — Jupiter reaches your natal Mercury`
- **Preheader:** `Within two degrees today, and the Moon crosses your
  third house.`

**HTML composition (600 px; same frame as §3.4):**

1. Identity row — `FOR FRIDA KAHLO · MONDAY, JULY 20, 2026` mono caps;
   beneath, 12 px muted: `July 6, 1907 · 8:30 AM · Coyoacán, Mexico`
   (the chart’s own stored summary — the reader chose to sync this).
   Wordmark right.
2. Personal comparison first — serif lead:
   > Jupiter is closing on your natal Mercury — within two degrees
   > today. Conversations, plans, and paperwork get a tailwind; it is
   > a good day to say the bigger thing.
   Then:
   > The Moon crosses your third house — errands, siblings, messages,
   > and the near neighborhood.
   >
   > Sky-wide: Jupiter’s trine to Neptune is exact at 07:47 UTC.
3. “Why this appeared” — one muted mono line after the reading, 11 px
   `#7A8397`, no box, no heading:
   `Jupiter 4°25′ Leo · your natal Mercury 6°20′ Leo · conjunction
   building · method → https://zodiacs.org/methodology/`
4. One primary action — button `Open your full brief` →
   `https://zodiacs.org/today/`.
5. Footer — “This brief reads {chartName}, the chart you chose to
   sync. Manage or stop in your profile.” · `Manage` →
   /profile/#daily-brief · `Unsubscribe` · postal line.

**Quiet-personal-transit state:** block 2 opens with the live quiet
copy — “Today looks quieter against your chart. There is less pressure
to act on anything immediately.” — followed by the chart’s Sun-sign
baseline line from the day’s edition (kicker `Cancer Sun-sign
baseline`). Block 3 is omitted (nothing to receipt).

**Nearby-personal-event state:** when a published event inside nine
days lands on the chart’s points or houses, one hairline-topped line
after block 2, house-derived only (the declared method):
> Ahead: the July 29 full moon falls in your seventh house —
> partnerships get a checkpoint.
linked to the event page. Never more than one such line.

**Plain-text version (parity):**

```
FOR FRIDA KAHLO · MONDAY, JULY 20, 2026
July 6, 1907 · 8:30 AM · Coyoacán, Mexico

Jupiter is closing on your natal Mercury — within two degrees today.
Conversations, plans, and paperwork get a tailwind; it is a good day
to say the bigger thing.

The Moon crosses your third house — errands, siblings, messages, and
the near neighborhood.

Sky-wide: Jupiter's trine to Neptune is exact at 07:47 UTC.

Why this appeared: Jupiter 4°25' Leo · your natal Mercury 6°20' Leo ·
conjunction building. Method: https://zodiacs.org/methodology/

Open your full brief:
https://zodiacs.org/today/

—
This brief reads Frida Kahlo, the chart you chose to sync.
Manage: https://zodiacs.org/profile/#daily-brief
Unsubscribe: {unsubscribeUrl}
{senderPostalAddress}
```

### 3.6 Push copy — “Sky alerts” (supersedes `push.ts` EN values)

Push is an event channel, not a daily channel. The existing “daily
note” framing is retired to avoid colliding with the daily email.
Delivery obeys Sol’s fixed caps (≤1 per 24 h, ≤2 per rolling 7 days);
most days send nothing, and no notification is ever manufactured to
fill the quiet. Every notification opens a page that fully answers it.

**Notification copy (title / body / opens):** — all examples grounded
in the committed events publication.

| Event | Title | Body | Opens |
| --- | --- | --- | --- |
| Full moon | Full moon tonight | The Buck Moon peaks in Aquarius at 14:35 UTC. Where it lands for you: | /full-moon/2026-07-29/ |
| New moon | New moon today | Sun and Moon meet in Leo — the month’s reset point. | /new-moon/2026-08-12/ |
| Eclipse | Total solar eclipse today | The Moon covers the Sun at 20° Leo, 17:45 UTC — the year’s most emphatic new moon. | /eclipses/2026-08-12/ |
| Station | Mercury turns direct today | The review window closes at 22:56 UTC. Stalled plans start moving. | /mercury-retrograde/2026-06-29/ |
| Major event | A rare exact alignment today | Uranus and Pluto reach an exact trine — years in the making. | /events/uranus-trine-pluto-2026-07-18/ |
| Chart-tier personal (high-signal only) | Jupiter reaches your natal Mercury | Exact this week for {chartName}. Your brief has the reading. | /today/ |

Personal alerts fire only for chart-tier subscribers, only for contacts
the brief itself leads with, never more than the shared caps allow, and
never name birth data in the notification body beyond the chart name.

**Surface copy (offer card, states — same island frame):**

| Key | Final English |
| --- | --- |
| pushHeading | Sky alerts, when they’re earned? |
| pushBody | A notification only for the dates that matter — full moons, eclipses, retrograde turns. Most days, nothing. |
| pushCapLine | Never more than one a day, or two a week. |
| pushIosNote | On iPhone and iPad, alerts work only after you add Zodiacs to your Home Screen. Install first, then return here. |
| pushAccept | Turn on sky alerts |
| pushBusy | Turning on… |
| pushDismiss | Not now |
| pushDismissLabel | Dismiss the sky-alerts offer |
| pushOn | Sky alerts are on — only the dates that matter, never more than one a day. |
| pushOff | Turn off |
| pushDenied | Notifications are blocked in this browser, so sky alerts can’t reach you. Your browser’s site settings can change that whenever you like. |
| pushError | Sky alerts are unavailable right now. Try again later. |
| pushReOffer | Your sky alerts lapsed with this browser’s subscription. Turn them back on? |
| pushProfileRow | Sky alerts · {status: On/Off} — the dates that matter, by notification. |

The heading drops for the subscribed state (existing island behavior).
The chart-tier personal alert category is mentioned nowhere in the
offer copy — it simply arrives for chart-tier subscribers as part of
“the dates that matter”; the profile row is where its existence is
visible (`pushProfileRow` sits beside the daily-brief section as a
quiet status line, not a new consent surface — permission remains the
browser’s, granted through the same deliberate button).

## 4. Visual and layout specification

**Site surfaces** reuse the existing system verbatim: `.email-capture`
card grammar, `--hair-2` borders on `--void-1`, serif `--text-xl`
headings, mono micro-labels, pastel `SignIcon` discs (24 px chooser,
20–30 px identity), `.btn--primary` as the one primary action,
`.btn--ghost` and text links for everything secondary. The
personal-brief panels (§2.2 states 3–6) are the same card with the form
column swapped for copy + one action — no new chrome, no `.shell`
bezels (captures are not elevated moments), no status dots, no new
colors, no orchestrated animation. Long chart names and long emails
truncate with CSS ellipsis at one line inside status lines and never
break layout (stress proofs cover 60-char names and 40-char address
masks).

**Email** is its own constrained medium; the proofs are the reference
implementation. Rules: single 600 px column, fluid to 320 px; the void
surface `#060709` set with `bgcolor` + inline styles, body text
`#C6CCDA`, headings `#EEF1F7`, muted `#7A8397`, hairlines
`1px solid #26282E`; the one pastel accent is the sign disc image and a
pale button (`#EEF1F7` background, `#060709` text — readable if color
is stripped). Fonts: Georgia serif stack for headings, system sans for
body (no webfonts in email). **Images-blocked rule:** the only images
are the sign disc and wordmark, both with meaningful `alt`; every
reading, date, link, and the unsubscribe path are HTML text, so a
fully-blocked render loses nothing but the disc. Plain-text part
mirrors the HTML exactly (§3.4/3.5 blocks). Dark-mode clients that
force light backgrounds get the same text on white — colors are
specified so both polarities pass contrast (the proofs annotate the
forced-light case). No layout tables beyond one wrapper; no tracking
pixels — opens are deliberately unmeasured.

## 5. Accessibility contract

Everything keyboard-first: the capture form, sign chooser (radios),
profile radios/select/buttons, install and push cards, and every
lifecycle page operate with visible focus (`outline: 2px solid
var(--ink-0)`, offset 3 px — existing pattern) and no hover-only
information. Status changes announce via the existing `role="status"`
aria-live regions; the push/install cards keep `aria-live="polite"`.
Touch targets ≥44 px (audit note: current sign discs measure 44 px via
their grid cell — keep). Reduced motion removes the disc/press
transitions (already specified in component CSS). No-JS: captures POST
natively and land on the pending page; the install and push cards
simply never render (they are enhancements); profile consent controls
are native form elements inside a form that POSTs. Feature-off: no
provider → no capture markup at all; push flag off → no offer ever;
pages remain complete in every case. Email accessibility: semantic
heading order, alt text, links written as actions (“Unsubscribe”, not
“click here”), and the plain-text part as the universal fallback.

## 6. Acceptance proofs inventory (`docs/acceptance/phase3-habit/`)

Self-contained static HTML (site tokens inlined; no site CSS imports;
pastel icons copied locally into `assets/`) plus rendered screenshots.
Prototypes: `capture-horoscopes.html`, `capture-post-chart.html` (six
states), `capture-footer.html`, `profile-daily.html` (seven states),
`email-sun-sign.html` (+ `email-sun-sign.txt`), `email-chart-tier.html`
(+ `email-chart-tier.txt`), `pwa-push-storyboard.html` (install five
states, push eight states, iOS install-first), `states-a11y.html`
(keyboard focus, reduced motion, no-JS, feature-off, long-content
stress). Screenshots per required viewport: captures at 360/1280,
emails at 320/600, storyboard and a11y sheets at 1280 (and 360 where
layout differs). Each prototype carries an annotation rail naming the
state, the strings used, and the acceptance criterion it proves.

## 7. Implementation notes for Sol Ultra

- Supersessions: §3.1 replaces `emailCapture*` EN values (keys stable;
  four locales need matching translation later — English-first release
  ships EN only, existing non-EN weekly strings stay until then and the
  non-EN captures keep advertising the weekly until translated — an
  accepted, documented seam). §3.6 replaces `push.ts` EN. `pwa.ts`
  unchanged.
- The sun-sign daily reuses the existing subscribe endpoint contract
  (§2.5 maps 1:1 onto today’s 200-pending/400/502/503 semantics); the
  sign becomes required server-side.
- Chart-tier state is account data: selected chart id (uuid), timezone
  (IANA string), consent + confirmation state — net-new migration;
  device-only charts have no id server-side and structurally cannot be
  selected. Chart deletion already tombstones; the daily sender must
  treat a missing/tombstoned selected chart as paused, permanently,
  until re-selection (§2.3.6).
- Single-email rule (§1) is sender-side: one address, both lists → send
  chart-tier only that day.
- First-party unsubscribe for both dailies (digest idiom, §3.3.7);
  provider-managed unsubscribe remains only for the legacy weekly list.
- Push delivery caps are delivery-side and absolute; the copy promises
  them. Event alerts source from `events-publication.json` entries the
  day they occur; personal alerts only from contacts the brief leads
  with.
- Flags: everything stays off (`DAILY_EMAIL_ENABLED` reserved,
  `PUSH_ENABLED` pair off) until Phase 3’s own DoD evidence; nothing in
  this handoff changes a flag.
- Analytics: existing events only; if an install-funnel event is ever
  wanted it needs an allowlist addition first (backlog).

## 8. Assumptions and non-goals

- This handoff is written against the brief’s declaration that Phase 2
  is the live baseline (`cce23d2`); PLAN.md’s phase ledger still shows
  the Phase 1 external monitor open — reconciling the ledger is not
  part of this task and nothing here touches it.
- English-first: no locale expansion is designed; non-EN captures keep
  the current weekly strings until a sanctioned translation pass.
- The committed 2026-07-20 edition and events publication are frozen
  example material; the templates generalize by slot, and Sol should
  regression-pin the examples’ facts the way Phase 1/2 tests already
  pin theirs.
- No new routes, endpoints, providers, migrations, or flags are created
  here; where the design requires one (timezone column, first-party
  daily unsubscribe list param), it is named as Sol’s work, not built.

## 9. Backlog (explicitly out of scope now)

Install-funnel analytics event (needs allowlist addition) · a
“yesterday’s brief” web archive for subscribers · per-sign send-time
preference for the sun-sign tier · translated capture strings for the
four non-EN locales · a digest→daily migration nudge for long-time
weekly readers · profile-side sky-alerts management beyond the status
row.

## 10. Blockers

None. Everything Sol needs is specified here and in the proofs; open
questions were resolved in-document (single-email rule, sign-required
capture, push re-founding, unsubscribe pattern unification).
