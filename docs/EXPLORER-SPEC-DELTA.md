# Chart Explorer — deltas from MASTER-PLAN.md §11 (Fable Tasks 1–2)

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

## Budget actuals (Task 1)

`/birth-chart/` 48.0 KB gz of 50.3 budget (+5.4 over the pre-slice 42.6);
homepage 40.1 of 42 (i18n dictionary growth shared across pages; the Wheel's
scene imports were split into `scene/layout.ts` so the demo chart drags in no
scene-builder dependencies). Zero new dependencies.

---

# Task 2 — the Guided Chart Tour (deltas from §11.5)

## 9. Discrete chapters, no scroll-sync

§11.5 offered scroll-synced prose as an option. Shipped: explicit prev/next,
a dot rail (tablist, roving tabindex), keyboard, and horizontal swipe on the
sheet handle. Scroll-sync fights the compute-scroll and sticky-inspector
machinery and turns page scroll into an input with side effects; explicit
navigation keeps the reader in charge and makes every transition announceable.

## 10. Chapter-2 wheel tilt dropped

The storyboard's playful tilt would put a CSS transform on the wheelbox,
which corrupts the click-resolver's rect math (delta #1's geometric resolver
maps client coordinates through the svg's bounding box). The anchor rotation
to 0° Aries — a scene-level rebuild, not a CSS transform — carries the same
teaching beat safely.

## 11. URL chapter state deferred

`?ch=` deep links into a chapter are postponed: the tour depends on a
computed chart, so a cold deep link lands on a form, not a chapter. When
saved-chart auto-restore lands, revisit.

## 12. The house morph is a render-only preview

§11.5's Whole↔Placidus toggle is shipped as a preview that recomputes the
alternate system through the cached engine loader and hands the calculator a
`TourVisual` override — it never calls `runChart` or `setHouseSystem`, so
the auto-clear effects, the URL, and the form stay untouched. Leaving the
chapter (or exiting) reverts it. The diff line ("N placements change house")
comes from comparing the two scenes directly.

## 13. Tour copy lives in the lazy module

Chapter prose ships as module-local `TOUR_COPY` (en+es, key parity enforced
by `satisfies`) inside the dynamically imported tour chunk, per the
`SHARE_COPY` precedent. Only the entry-button label (`tourStart`) joins the
shared i18n dictionary. This is what keeps the tour's ~9 chapters of prose
out of every page's static closure.

## 14. Bundling rule: the lazy chunk must not import shared modules

Any static import from the tour chunk into a module the calculator already
ships (scene/build, the Inspector, natal's ranking) makes Rolldown split that
module into its own chunk, costing 0.5–1.5 KB of gzip context in the
`/birth-chart/` static closure. Those three are injected as props instead
(`buildScene`, `renderInspector`, `topAspects`). Modules that were already
separate shared chunks (i18n, interpretations, glyphs, scene/types) are safe
to import directly. Measured: closure identical chunk count to pre-tour (26).

## Budget actuals (Task 2)

`/birth-chart/` 50.8 KB gz of 51 budget (+0.6 for the entry button, view
fallbacks, loader stub, and analytics emitters; §11.9's sanctioned ceiling is
51.6). The tour chunk itself (7.8 KB gz) is dynamic-import-excluded and gated
only by `chunk-max`. Homepage unchanged at 40.5 of 42. Zero new dependencies.

---

# The Transit Ring — the bi-wheel (T-28, `/transits/`)

The animated "sky moving over your chart": the natal chart is the Wheel's
pinned inner ring; the transiting sky is an outer ring that a time scrubber
moves through ±1 year, with transit→natal contact chords that light as they
form. This is the second-ring foundation the synastry Relationship Wheel
reuses.

## 15. The outer ring is an overlay SLOT, not baked into the Wheel

The obvious approach — an `overlay` data prop that `Wheel` renders itself —
was measured and rejected: the overlay's rendering (10 transit marks, glyphs,
chords) landed in the shared `Wheel` chunk and pushed `/birth-chart/` from
50.8 to 51.5 and the homepage up 0.6 KB, because the wheel is shared by the
birth chart, the homepage demo, and the share card. Instead `Wheel` exposes
`renderOverlay?(geo: WheelGeometry)` — a slot handed the wheel's geometry
(`pt`, radii, anchor). The transit-specific rendering (`renderTransitOverlay`)
lives in the lazy transit chunk and is passed in, so its weight never touches
the shared bundle. `Wheel`'s only added cost is the slot call + a viewBox that
grows **only** when a slot is present — the pinned static/interactive paths
stay byte-identical (`wheel-serialization.test.ts` unchanged; a new test pins
the slot contract and the byte-identical no-slot path). Net flagship cost:
`/birth-chart/` 50.8 → 51.1 (the geometry-object construction), well under the
51.6 ceiling; homepage 40.5 → 40.7.

## 16. The natal ring reuses the Wheel's STATIC path — no scene model

The inner ring is drawn from plain `bodies/asc/mc/cusps` (the share-card
path), not a `ChartSceneModel`. So a saved chart without a full recompute
still draws, and no `buildSceneModel` is pulled onto `/transits/`. Intra-natal
aspects are hidden (`aspects={[]}`) so only the transit chords show — the
story is the sky against the chart, not the chart's own geometry.

## 17. One compute path; motion is the scrub, not a tween

The scrubber sets a day-offset; a memo turns the instant into the outer ring
via the already-loaded engine (`computeBodies`). Dragging moves the planets
continuously (a compute per input, cheap for 10 bodies); the steppers and
"Now" *glide* by rAF-tweening the offset, which drives the same compute path —
instant under `prefers-reduced-motion`. The Moon rides the outer ring (you can
watch it circle) but stays out of the contact list. The active-transit list is
the accessible, reduced-motion-safe view and doubles as tap targets; a live
region announces the scrubbed date.

## Budget actuals (Transit Ring)

`/transits/` 27.7 KB gz of a new 30 budget; the ring chunk (Wheel + overlay +
scrubber) is a 2.3 KB dynamic import excluded from that closure. `/transits/`
gets no visual baseline — the outer ring is `Date.now()`-dependent, so it
can't be snapshotted; the committed `tests/transit-ring-drive.mjs` covers it
instead. Zero new dependencies.
