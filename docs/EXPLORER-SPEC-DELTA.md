# Chart Explorer — deltas from MASTER-PLAN.md §11 (Fable Task 1)

Everything not listed here shipped as specified. Each delta states what
changed and why; none weakens an invariant.

## 1. Hit-testing: one geometric resolver instead of per-mark targets

§11.6 specified invisible per-entity hit shapes (44px body circles, house
wedges, sign arcs). Driving the build end-to-end showed the geometry can't
support it: the collision fan guarantees only ~7° between markers (~16px at
render width), so honest 44px touch circles steal each other's taps, and
house wedges spanning the planet band swallow planet taps. The shipped model
is a single svg-level resolver — radius band → angle → entity (sign ring /
nearest body within 10° / house wedge), with aspect chords and ASC/MC labels
keeping their own precise targets. Selection quality is better than the spec:
any tap near the planet band picks the *nearest* planet, which is what a
thumb means. The static (share-card) rendering is untouched — pinned by
`wheel-serialization.test.ts`.

## 2. Layer chips expose aspects + houses only

§11.4 sketched four layer toggles (zodiac/houses/planets/aspects). Zodiac and
planets ARE the chart — hiding them answers no question and invites a broken-
looking state. v1 ships the five aspect-type chips and a houses toggle. The
`LayerState` contract keeps all four fields so chapters (part 2) can still
dim structurally.

## 3. No auto-scroll from wheel selection to the reading

§11.6 had selection scroll the matching reading item into view. On a page
this tall the yank is disorienting (especially mobile, where the reading sits
far below the sheet). Shipped: the reading and table *highlight* on selection
and stay put; the table row and aspect rows are the accessible DOM selectors.
Revisit in guided chapters where scroll position is the chapter's business.

## 4. Anchor toggle (ASC ↔ 0° Aries) deferred to chapters

It's a teaching move (§11.5 chapter 1), not a free-mode control. The scene
model carries `anchor.mode` end-to-end, so the chapter build flips it without
contract changes.

## 5. House-number midpoint fix is interactive-only for now

The wedge-midpoint correction applies in Explorer mode. The static path
(share card, demo chart) keeps the historical cusp+15° so pinned output stays
byte-identical. When the share card is regenerated intentionally (chapters
release), promote the fix to both paths and refresh the pinned snapshot in
the same commit.

## 6. Positions-only share (`#p=`) not in this slice

It was always Codex's T-17 (disjoint files: `share.ts` codec + card toggle).
Interfaces it needs (`ChartSceneModel`, engine summary shapes) are now frozen.

## 7. Roles: wheel is `role="group"` on a focusable wrapper

The keyboard model lives on the `.xplr__wheelbox` wrapper (tabindex=0,
arrows/Enter/Escape), not on SVG internals — screen-reader flow stays: table
= canonical structure, live region announces selections, inspector heading
takes focus on Enter. `role="application"` was rejected (it hijacks SR
navigation for the whole region).

## 8. Emphasis opacities

Shipped 1.0 / 0.7 / 0.35 exactly as §11.6, via `emphasisFor`/`emphasisOpacity`
so chapters and future renderers reuse the same lighting rule.

## Budget actuals

`/birth-chart/` 48.0 KB gz of 50.3 budget (+5.4 over the pre-slice 42.6);
homepage 40.1 of 42 (i18n dictionary growth shared across pages; the Wheel's
scene imports were split into `scene/layout.ts` so the demo chart drags in no
scene-builder dependencies). Zero new dependencies.
