# T-17 — Positions-only chart sharing

Acceptance evidence for `docs/MASTER-PLAN.md` §19 T-17 and §11.8.

## Delivered

- A strict v2 `#p=` codec carries exactly twelve tropical longitudes in a fixed body order, optional ASC/MC, house-system code, and engine version.
- The codec allowlists its wire fields, rounds to 0.001°, accepts only canonical base64url and canonical JSON, rejects malformed/duplicate/escaped-key input, and never throws on hostile tokens.
- The existing v1 `#c=` codec is byte-unchanged from PACKET C6.
- The chart share action opens a native, labelled dialog. `Hide birth details` defaults off: v1 links and the existing dated card remain unchanged. When enabled, links use `#p=`, the card receipt becomes the engine version, and its filename becomes `zodiacs-chart-positions.png`.
- The privacy mode is locked while a card is rendering, preventing a mode change from racing an in-flight export.
- A received v2 token renders a reduced read-only wheel and placements table. It does not reconstruct houses, motion, aspects, applying/separating state, saving, or the interactive Inspector. Successful fragments are stripped; mixed `#c` + `#p` fragments are rejected.
- The receiver shows the required notice: `Positions only — birth details not included.` Copy is available in EN and ES without adding routes or extending `LOCALIZED_PATHS`.
- Analytics use the existing allowlisted `chart_share` event with fixed, non-sensitive variants only.

The token omits date, time, timezone, coordinates, name, place, flags, latitude, speed, and retrograde state. The UI does not call it anonymous: planetary positions can still be identifying, and v2 links are intentionally unsigned/read-only receipts rather than recomputable natal inputs.

## Verification

- Production build: 943 pages.
- Astro check: 0 errors, 0 warnings, 3 pre-existing hints.
- Distribution integrity: 960 HTML files, 9 feed items, registry intact.
- Focused privacy coverage: 39/39 codec and card tests passed.
- Full local suite: 211 passed; the one failing Kahlo float snapshot is the inherited Darwin-only `astronomy-engine` delta already reproduced on clean main/C6. No scene or engine file changed; Linux CI is the authoritative full-suite gate.
- T-17 browser flow passed: default-off dialog, v1/full link, v2 positions link, exact four-key wire, no private inputs, 14 body/angle rows, hash stripping, ambiguity rejection, invalid-token safety, non-sensitive analytics, privacy-toggle render lock, and a real forced-download fallback named `zodiacs-chart-positions.png`.
- C6 regression harness: complete eight-calculator transcripts are byte-identical between commit `399d6a2` and T-17.
- Bundle gates: `/` 40.5/42 KB gz; `/birth-chart/` 50.2/50.3 KB; largest chunk 51.3/60 KB; engine chunk 21.2/25 KB. The v2 codec, dialog, and receiver remain behind one dynamic boundary.
- Lighthouse: `/` 0.77 s LCP, `/birth-chart/` 0.48 s, `/aries/` 0.44 s; CLS 0.001 and TBT 0 throughout.
- Visual regression: home and Aries pass. T-17's three birth-chart actual captures are byte-identical to C6; both expose the same stale Darwin expected-height baseline that predates T-17.
- Independent privacy/quality audit: clean after fixing canonical-JSON duplicate-key handling and the in-flight privacy-toggle race.
- `git diff --check`: clean. No runtime dependency was added.
