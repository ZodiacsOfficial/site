# PACKET C6 acceptance — island foundations

Baseline: `origin/main` at `95093b1` (frozen scene contracts and Explorer free mode).

## Mechanical foundations

- One lazy `useEngine()` cache replaces five island-local full-engine caches.
- One SSR-safe `useProfile()` subscription replaces six island-local profile listeners.
- `BirthFields` preserves the existing controlled date/time/place DOM and IDs in the chart, synastry, and transit forms.
- `CopyLinkButton` preserves the chart and invite clipboard/manual-fallback hooks.
- `resolveSavedChart()` lives outside the common profile-store chunk, so stale-summary recomputation does not tax the homepage or birth-chart store path.
- No island statically imports the full engine.

Island LoC, measured with the same command before and after (including the two new shared components and Explorer islands): **4,044 → 4,014** (`−30`). The smaller number includes all replacement abstractions rather than hiding them in another directory.

## Behavior changes required by C6

- Saving the same `(date, time, latitude, longitude, effective house system)` updates the existing chart name, calculation, and timestamp while retaining its ID and creation time.
- Local deletions prune that chart's year-ahead cache; remote profile replacements prune cache entries for charts removed on another device.
- `DailyForYou` now uses its existing `sign` prop and selects the newest saved chart whose natal Sun matches the horoscope page.
- Saturn-return seasons/crossings and saved-chart options now have stable keys.
- `SkyTicker` uses the committed `daily.json` receipt for Sun, Moon, and retrograde state, labels that receipt with its localized date and `12:00 UTC`, and gives the next lunation an absolute date. Server HTML and hydration therefore use the same deterministic instant; neither path performs current-clock computation or makes relative-time claims.

## Before/after calculator parity

`tests/c6-parity.mjs` ran against clean `origin/main` and the C6 build with a fixed clock and the same saved-chart fixtures. The complete JSON transcripts were byte-identical across all eight routes:

| Case | Busy transition | Result focus | Additional invariant |
|---|---|---|---|
| Birth chart | false → true → false | Birth chart heading | received `#c=` stripped; copy fallback remains `#c=1.` |
| Moon sign | false → true → false | Moon heading | form semantics unchanged |
| Rising sign | false → true → false | Rising heading | known time remains required |
| Moon phase | false → true → false | Moon-phase heading | result hash/structure unchanged |
| Baby zodiac | false → true → false | Due-date heading | required date unchanged |
| Saturn return | false → true → false | Saturn heading | season count unchanged |
| Synastry | false → true → false | Compatibility heading | saved pair and `#a=1.` fallback unchanged |
| Transits | false → true → false | Transits heading | first saved chart remains preselected |

## Gates

- Build: 943 pages.
- Astro check: 0 errors, 0 warnings, 3 pre-existing hints.
- Unit tests: 187 pass with the pre-existing platform-sensitive Kahlo scene snapshot excluded; 15 new store/resolver tests pass.
- Distribution: 960 HTML files, 9 feed items, registry intact.
- Bundles: `/` 40.5/42 KB; `/birth-chart/` 49.9/50.3 KB; max chunk 51.3/60 KB; engine chunk 21.2/25 KB.
- Lighthouse: `/` 0.77 s LCP; `/birth-chart/` 0.61 s; `/aries/` 0.45 s; CLS 0.001 and TBT 0 on all three.
- Visuals: all C6 birth-chart captures are byte-identical to clean-main captures. Clean main and C6 both expose the same stale Darwin expected-height baseline from the Fable merge; Linux CI owns the current committed baseline. The intentional dated SkyTicker delta remains below the 0.1% threshold (0.0415% desktop, 0.0448% mobile, 0.0429% reduced motion).

The local full suite's sole failure is also present on clean main: the frozen Kahlo scene snapshot differs on macOS by floating-point dust (plus a small North Node speed delta). C6 does not change scene or engine files; the Linux CI run is the merge gate for that snapshot.
