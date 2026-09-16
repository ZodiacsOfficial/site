# Automated product and clean-room browser review (2026-09-16)

This is **AI review**, the third of the three concurrent reviewers described in
[REVIEW-2026-09-16.md](REVIEW-2026-09-16.md). No human practitioner, customer,
accessibility auditor or QA engineer examined this candidate, and none is
claimed. No real assistive technology was available in this environment: every
screen-reader finding below is a measured DOM and ARIA fact, and the
announcement behaviour that would follow in NVDA, JAWS or VoiceOver was not
observed.

**Scope:** real browser journeys, keyboard, screen-reader semantics, mobile
layout, honest claims, unhappy paths. Worktree checked out at
`ed585d3c2a1e891c64e4ad8003241044aa300322`, verified with `git rev-parse` after
the checkout (it arrived on `0edf8aa3` and was moved). Two real builds driven —
`PUBLIC_SAVED_RECORDS_ENABLED=1` and the flag unset — in Chromium 1194 and
Firefox 151.

**Recommendation on its own scope:** block, on one narrow defect in the removal
confirmation, not on the architecture.

## What held under attack

- Stored bytes were byte-identical to the receipt offered for download, in
  Chromium (4817 B) and Firefox (4816 B).
- IndexedDB denied degrades honestly — "Calculation records are not available in
  this browser, so nothing is shown. Your saved charts are unaffected." — with no
  page errors.
- An injected `QuotaExceededError` yields "This calculation could not be kept.
  Nothing was stored.", zero durable rows, and no automatic retry.
- Capacity at 40 refuses with the specific "at the maximum of 40" message and
  never writes a forty-first.
- Unknown-time charts say "time unknown".
- Mobile at 390×844 and 360×740: no horizontal scroll, no clipping, no overflow,
  including with 40 records and the long armed label.
- The flag-off build is clean: no Keep button, no panel in EN or ES, no
  `zodiacs-saved-natal-v1` created by any ordinary journey, no page errors,
  receipt download unaffected.
- No user-facing string promises sync, backup or permanence.

## Findings and dispositions

| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| C1 | release-blocking | The two-step destructive confirm latches forever. `armed` was set on the first activation and cleared only by a completed removal or a scope re-open: Escape did nothing, blur did nothing, clicking elsewhere did nothing, and there was no timeout and no Cancel. A person who armed a removal and walked away left a control that destroyed data on the next single tap. Reproduced in Chromium and Firefox; the remove-all instance went from 2 records to 0 on one later activation. | **Fixed.** An armed control now has a bounded, cancellable lifetime: Escape, a pointer down anywhere else (pointer rather than blur, because Safari does not focus a clicked button), moving focus away, and a 12-second expiry all return it to its safe label. Re-arming costs one activation and loses nothing. The handlers are installed in a layout effect, not an ordinary one: Preact defers ordinary effects past paint, which left a live armed control briefly uncancellable — caught by the new drive check, which exercises all four cancel paths in Chromium and Firefox. |
| C2 | major | A successful single removal announced nothing — `say()` ran only on failure — and focus fell to `<body>` when the row unmounted, so the natural recovery was to try the destructive action again. | **Fixed.** `removeDone` added to all six locales and said on the success branch, bound to the initiating namespace exactly as `removeAll` is; focus moves deliberately to the panel heading, and only when it was still inside the panel. An uncertain outcome stays unsaid on purpose — the fresh inventory is the honest answer and arrives either way. |
| C3 | major | The panel's only live region was created in the same mutation as its text (`{message && <p role="status" …>}`), the documented way to have an announcement missed. No live text existed for the armed state at all. | **Fixed.** A visually hidden `role="status"` region is present and empty from the panel's first render; only its text changes. It now also carries the armed state, so a control waiting for a second activation says so and says how to cancel. The visible paragraph keeps `data-records-message` and drops its roles, so nothing is announced twice. |
| C4 | major | `.pf-chart__action--danger` had only a `:hover` rule, so on touch the destructive Remove was visually identical to Download 8 px away, and the armed state changed no styling at all. | **Fixed**, scoped to `.pf-records` so the shared account-panel buttons are not restyled: a base-state danger treatment that does not depend on hover, a filled `[aria-pressed="true"]` state, and 8 px more separation between the safe and destructive controls in a record row. |
| C5 | minor | A successful Keep dropped focus to `<body>`, because the button disables itself while focused. | **Fixed.** On the kept transition, and only when the keep button itself was focused, focus moves to the confirmation paragraph that carries the Profile link. |
| C6 | minor | No string in any locale warned that clearing site data, private browsing or storage eviction destroys these records; the verb is "Keep". | **Fixed in copy.** The panel intro now states plainly that clearing this browser's site data removes them, that the browser can discard them if storage runs low, and to download anything worth keeping for good — in all six locales. `navigator.storage.persist()` is **not** called: requesting persistent storage changes eviction behaviour and can prompt, which is a product decision beyond this release. Honest copy is the fix here. |
| C7 | minor | The localized `hiddenGuest` notices quoted a translated sign-out button label, but `AccountSyncV2Panel` renders only on the English profile page, so five locales pointed at a control on no page the reader can see. | **Fixed.** The five localized strings now describe the action rather than quoting a button label. English, where the control does exist, is unchanged. |
| C8 | nonblocking | Records-panel tap targets are 34 px high — WCAG 2.5.8 (AA) but not 2.5.5 (AAA) or the 44 px platform guidance. | **Partly addressed, deliberately.** 34 px is the site-wide `.pf-chart__action` convention shared with the saved-charts list on the same page; making the records rows taller would single them out. The asymmetric half of the risk is fixed instead: the destructive control is now visually distinct without hover and sits 8 px further from Download. Raising the convention site-wide is a design decision for the owner, not this release. |
| C9 | nonblocking | The records island ships and hydrates on every Profile visit even with the flag off. | **Recorded, not changed** — and now load-bearing. Reviewer B raised the same cost (finding 11). Guarding the element server-side would reintroduce reviewer A's release-blocking finding 1: the flag-off build is exactly what lets a rolled-back device still find, export and remove what it holds. The cost is ~2.0 KB gzip, within budget, and no claim of "no cost when off" is made anywhere. |

## What this reviewer did not test

- Signed-in journeys: guest/account isolation, the retained read-only scope, the
  guest-view switches and the `hiddenGuest` notice. These need the
  account-coordinator interception that `tests/saved-records-account-drive.mjs`
  performs; the keyboard and mobile assessment covers the guest scope only.
- The erasure two-phase lifecycle, generation pinning, stale-capability replay
  and cross-tab broadcast — reviewer A's scope, deliberately not attacked twice.
- Real assistive technology (none available here).
- Destructive account actions on a signed-in browser — reviewer A's scope.
- The full state matrix after site data is cleared under an open tab. What was
  confirmed: the tab keeps listing a now-absent record, Download still succeeds
  from the in-memory bytes, and the tab recreates an empty database through its
  own activity. No user data is resurrected.
- Real disk-pressure quota exhaustion (the error was injected) and the
  owners-full path at 1000 owners.
- A full keep/remove journey in a non-English locale.
- The full vitest suite and a complete production build with pre/post gates:
  both builds used `--ignore-scripts`. Those are release gates the lead session
  runs on the final candidate.
