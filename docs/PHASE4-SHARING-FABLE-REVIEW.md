# Phase 4 sharing loop — Fable implementation review

Status: bounded design/UX/motion/copy/accessibility/visible-privacy review
Reviewed candidate: `12525c7399f7b3c509136eba4de663dae2d39439`
(PR #151, branch `codex/phase4-sharing-loop`, base `734c36f`,
Site Check run 30062266537 green)
Fable handoff under review: `9809c3d` (`docs/PHASE4-SHARING-FABLE-HANDOFF.md`)
Binding reconciliation: `docs/PHASE4-SHARING-INTEGRATION-DECISIONS.md`
Review branch: `fable/phase4-sharing-loop-review` (this document is its only
change)

## Verdict

**PASS AFTER BLOCKERS.**

One P1 layout defect blocks release: the completed-invitation state
overflows horizontally at tablet and desktop widths and crushes the
conversion card's copy to an unreadable sliver. It is a contained CSS
omission with a two-selector correction inside an idiom the stylesheet
already uses. Everything else reviewed — copy, states, ordering, motion,
accessibility, analytics, and every visible privacy boundary — faithfully
realizes the handoff.

## How this review was performed

- Review branch created at the exact candidate SHA in the existing
  worktree; `npm ci` from the candidate lockfile.
- Required commands, all green at `12525c7`:
  - `npm run test:phase4:sharing` — feature-off build 8/8, fixture-enabled
    build and browser drive 35/35 (including "chart share sheet never
    displays fixture birth details" and "enabled drive makes no unexpected
    fixture request").
  - `npm run test:phase4:invites-sql` — PostgreSQL 17 suite passed
    (`supabase/tests/phase4_compat_invites.sql` and the concurrency file).
  - `npm run check` — 0 errors, 0 warnings, 3 pre-existing hints.
- Fixture-enabled implementation inspected live, not only static boards: a
  scratchpad fork of `tests/phase4-sharing-drive.mjs` (repo copy untouched)
  added full-page screenshots and a `scrollWidth` overflow probe at six
  checkpoints — invite panel consenting, invite panel ready, arrival ready,
  arrival unavailable, completed invitation with send-back and conversion,
  and the returned `#s=` band — at 360, 390, 781, and 1280. Twenty-four
  captures were compared directly against the 40 handoff proof screenshots.
- Full-file reads of `InviteExperience.tsx`, `SendBackExperience.tsx`,
  `ProfileInvites.tsx`, `share-synastry.ts`, `invite/local-links.ts`,
  `invite/email.ts`, the settle/ordering regions of
  `SynastryCalculator.tsx`, the Phase 4 rules in `calculator.css`, the
  migration's constraint layer, both Phase 4 docs, and the PLAN/SETUP
  deltas.
- Provenance checks: the 40 proof PNGs, 10 boards, `proof.css`, and the
  handoff document are byte-identical between `9809c3d` and the candidate.
  No non-EN locale file, Registry wing file, or nav/footer component
  changes in the 138-file diff. Daily-reading share surfaces have no diff;
  `tests/t17-positions-share.mjs` was strengthened (not weakened) for the
  sanctioned Big Three addition and now also asserts the 1080×1350 card and
  a birth-input-free filename. The two regenerated Phase 1 screenshots are
  the documented gate procedure after `templateSourceSha256` changed; their
  manifest records the recapture.

## Findings

### P0 — none.

No privacy, security, destructive, or unusable-state defect was found in
the reviewed surfaces. Specifically verified: the creation request carries
only `{chartId, consent, notify}`; the one-time URL appears exactly once;
the arrival fragment is consumed before any request; malformed handles fail
closed with zero network calls; the completion body is empty; the send-back
URL and stored pairs contain no birth data, email, account id, or token;
the register rejects any server row carrying forbidden keys; the email has
no images and reads correctly with images blocked; no numeric score exists
anywhere; analytics stay inside the frozen allowlist and a cancelled native
share emits nothing.

### P1 — completed invitation overflows and crushes the conversion card at ≥720px

- **Route/state:** `/compatibility/` after a fresh invitation reading
  completes (send-back and conversion cards visible). Widths 781 and 1280.
  Widths 360 and 390 are unaffected (+0px).
- **Evidence:** live fixture capture, `document.documentElement.scrollWidth`
  exceeds the viewport by **+379px at 781** and **+145px at 1280**; the
  conversion card body renders one word per line ("kept / unless / you /
  save / the / comparison / too."). Measured element demands at 781:
  `.syn-sendback .next-action__actions` 1071px,
  `.syn-conversion .next-action__actions` 1040px, `.calc__result` 1140px.
  The handoff requires zero horizontal overflow at all four widths, and the
  `result-sendback` proofs show both cards stacked full-width.
- **Cause:** `base.css` gives every `.next-action__actions` cluster
  `min-width: max-content`, measured as one unwrapped line. The stylesheet
  already neutralizes this for the existing card
  (`.syn__next-action` block, `calculator.css` — "stack its controls so two
  secondary labels never squeeze the explanation"). The new
  `.syn-sendback` override stacks the core but does not reset
  `__actions`; `.syn-conversion` has no override at all.
- **Smallest safe correction:** add `.syn-sendback` and `.syn-conversion`
  to the existing `.syn__next-action` reset block in
  `src/styles/calculator.css` (single-column `__core`; `__actions`
  `min-width: 0; width: 100%; justify-items: start`; `__primary`/
  `__secondary` `justify-content: flex-start`). Pure CSS, no markup or copy
  change, restores the proof layout. After the fix, re-run the enabled
  drive and confirm `scrollWidth` equals the viewport at 781 and 1280 on
  the completed state.

### P2 — none.

### P3 — none requiring action.

One visual deviation from the proofs is noted and **ratified as-is**: the
returned-reading band renders "Get your free birth chart" as the primary
button, where the proof board used a text link. The implemented weight is
calm, single, and consistent with the band's one-action intent; changing it
now would be churn without reader benefit.

## Ratifications requested of this review

- **Merged unavailable terminal state** (integration decision 13):
  ratified. The single calm treatment — "This invitation isn't available."
  with the fresh-link suggestion and the open calculator below — reads
  honestly, discloses no server reason, and the live capture matches the
  proof register. The fixture drive confirms no token-status oracle and no
  fragment residue.
- **Device-scoped Copy in the register** (integration decision 2):
  ratified. On a device without the creation secret the Copy button simply
  does not render — no dead control, no error — while status, End, and
  Remove remain, and the standing line "Invitations belong to your account —
  manage them from any device you're signed in to." carries the
  explanation. End is never gated by the public flag; the paused notice
  keeps its promise.
- **30-day positions-free evidence retention** (decision 7, superseding the
  handoff's 7-day sketch): ratified; the register's copy never states a
  number, so no reader-facing text is affected, and the migration enforces
  `delete_after = authority_destroyed_at + interval '30 days'` as a
  constraint.

## Does the implementation faithfully realize the handoff?

**Yes, with the single P1 exception above.** Every reader-facing string I
specified appears verbatim: the invite panel's five states and consent
gate; the ready receipt ("Ready. One reading, until August 7 — and one
email to you when it happens."), the fine print ("The link carries a label
and chart positions. No birth details."); the arrival greeting and
boundary; all five register status words and every detail line including
the deletion receipts; the send-back card ("Send the result back.",
"{label} can't see this reading — it happened here, on your device…"); the
conversion card ("Keep your half."); the return band ("A reading, sent
back."); and the completion email body, footer, and subject with exact
plain-text parity. The meeting animation is 1.4 seconds, transform/opacity
only, settles on first input, skips under reduced motion, and restores
settled. Send-back precedes conversion in the DOM; conversion and the
completion signal are fresh-open only. The `s1.` codec enforces canonical
round-trips and a grammar that cannot represent birth data. The migration
turns the retention and destruction promises into CHECK constraints rather
than application habits.

## Non-blocking backlog (no action required for release)

1. Restored invitation comparisons keep send-back but, by ratified design,
   no conversion card — so the "Start your own" loop entry is absent on
   revisits. The standing invite panel on `/compatibility/` remains the
   loop path; a quiet loop entry on restored comparisons could be weighed
   in a later phase.
2. The register's End action is disabled while statuses are stale
   (offline). Honest, but a later pass could allow the attempt and report
   the failure instead.
3. `tests/phase4-sharing-drive.mjs` runs only at 390×844 and captures no
   screenshots. Folding this review's width sweep and overflow probe into
   the drive would have caught the P1 mechanically and would guard the fix.
4. The profile register is verified here by full code read, its unit suite,
   and the static proof; a fixture browser journey for `/profile/`
   (register rows, End, manual-copy fallback) would complete the drive's
   coverage.

## Bounded handoff back to Sol Ultra

1. Apply the P1 correction in `src/styles/calculator.css` exactly as
   scoped above (extend the existing `.syn__next-action` reset block to
   `.syn-sendback` and `.syn-conversion`); no markup, copy, or behavior
   changes.
2. Re-run `npm run test:phase4:sharing`, `npm run test:phase4:invites-sql`,
   and `npm run check`; verify the completed state at 781 and 1280 has
   zero horizontal overflow and the conversion copy fills the card width.
3. Optionally adopt backlog item 3 in the same pass so the regression is
   gated; items 1, 2, and 4 need no action before release.
4. Everything else in the candidate is approved from the
   design/UX/copy/accessibility/visible-privacy side; after the P1 fix this
   review's blocker is discharged and no re-review of unchanged surfaces is
   required — a screenshot of the fixed completed state at 781 and 1280
   attached to PR #151 is sufficient evidence.

## Non-action confirmation

Nothing was released, enabled, emailed, migrated, or deployed. No
implementation file, migration, flag, environment variable, route, proof,
or PR content was modified. Production was not touched. The fixture drive
fork lives outside the repository and contacted only the local preview
with fixture interceptors. This document, on
`fable/phase4-sharing-loop-review`, is the only change.
