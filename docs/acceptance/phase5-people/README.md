# Phase 5A People — acceptance proofs

Twenty-one static boards, seventy-five renders. Every board is
self-contained: the only external references are the repository's own
fonts, the site's canonical pastel sign discs, and two licensed
Wikimedia Commons portraits committed under `assets/` with their
credits.

**The copy and figures on these boards are real.** Boards are generated
by `docs/phase5/people-pilot/tools/build-proofs.mjs` from the reviewed
manifest, so every reading, degree, orb, revision id and timestamp came
out of the pilot data rather than from mock text. Where a board shows a
state that no pilot record occupies — cusp-uncertain, dual-date,
conflicting-evidence — it uses the real screening output for a candidate
the rules excluded, and says so on the board itself.

## Widths

All boards render at **360, 390, 781 and 1280**, with two documented
exemptions:

- `og-card` renders once, at its canonical 1200×630 share size.
- `reduced-motion`, `keyboard-focus` and `zoom-200` render at 390 and
  1280 only.

`zoom-200` is captured at a halved viewport and doubled device pixel
ratio, which is what 200% browser zoom actually produces.

Every render asserts `scrollWidth - clientWidth <= 0`. All 75 pass with
zero horizontal overflow and zero page errors. Results are recorded in
`manifest.json`.

## Boards

| # | Board | Handoff section | Shows |
| --- | --- | --- | --- |
| 1 | `directory-default` | §3, §9.1 | The directory as it first loads |
| 2 | `directory-filtered` | §9.2 | A filter applied, and the way back out |
| 3 | `directory-empty` | §9.3 | No results, composed rather than apologetic |
| 4 | `profile-exact-fixture` | §9.7 | What an exact time adds — **design fixture, not a real person** |
| 5 | `profile-unknown-time` | §9.4 | The pilot's normal state (Vincent van Gogh) |
| 6 | `profile-uncertain-moon` | §9.5 | Moon undetermined (Katherine Johnson) |
| 7 | `profile-cusp-uncertain` | §8, §9.6 | Both signs at equal weight — state design |
| 8 | `profile-dual-date` | §6, §9.8 | Option B, specified but inactive |
| 9 | `provenance-expanded` | §9.14 | The disclosure open (Frida Kahlo — the coordinate-escalation case) |
| 10 | `portrait-missing` | §9.12, §10 | Two of the three real no-portrait cases |
| 11 | `portrait-attribution` | §9.13, §10 | Rendered credits, public domain and CC BY-SA |
| 12 | `birthday-crosslink` | §17 | Both directions, and the cap |
| 13 | `share-sheet` | §9.15 | Sharing a chart, not a person |
| 14 | `og-card` | §9.15, §17 | The card at 1200×630 |
| 15 | `no-javascript` | §15 | Directory and person page without JS |
| 16 | `withheld` | §9.11, §13 | Unlisted, without a word against the subject |
| 17 | `conflicting-evidence` | §9.10 | Two live dates, no chart computed |
| 18 | `error-states` | §9.16 | Broken portrait and offline |
| 19 | `reduced-motion` | §14 | Settled on first paint |
| 20 | `keyboard-focus` | §15 | Tab order and visible rings |
| 21 | `zoom-200` | §15 | Reflow at 200% |

## Regenerating

```bash
node docs/phase5/people-pilot/tools/build-proofs.mjs
node docs/phase5/people-pilot/tools/render-proofs.mjs
```

Rendering uses the repository's own browser tooling — `playwright-core`
from the committed lockfile driving a system Chromium through
`tests/visual/browser.mjs`. No rendering dependency was added.

## What these boards are not

They are design proofs, not an implementation. No `/people/` route
exists, nothing here is served, and no page in this directory is
reachable from the site.
