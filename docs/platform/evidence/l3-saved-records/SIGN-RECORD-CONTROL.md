# Inherited sign-record precision-test control

Base/main inspected: `693c2ac90b5be78c0f0885c22763dcafff53c00e`.
The focused original test was run before editing it:

```text
node_modules/.bin/vitest run scripts/sign-records.test.mjs -t 'keeps small prices precise'
1 failed, 9 skipped
scripts/sign-records.test.mjs:354
Expected /data-live-price>\$0\.0{2,}\d+</u; generated quote was $0.
```

`git show` with `GIT_NO_LAZY_FETCH=1` and byte comparison confirmed that all four
inputs below were identical to that main commit before the correction. Thus the
focused execution used unchanged main test, builder, generated page, and market
data; no saved-record module is involved in this test.

| File | SHA-256 at the failing control |
| --- | --- |
| `scripts/sign-records.test.mjs` | `e80982e239379870f3b8aa908b83ee151181eaa392fe0bb676727df823ab6f24` |
| `scripts/build-sign-pages.mjs` | `28facbbc0ea70bae5b67a90e0790242a09b3cc17103391bee4866f7616ebd20c` |
| `public/registry/scorpio/index.html` | `f4eecc48dcad435dcb384974ee89078a75306afb8666b7a815986242cd3b2890` |
| `public/assets/data/registry-market-history.v1.json` | `faa840ae47a339208a35ad79623d3127e0709c718aaa70692e399a97086eb87a` |

The latest committed snapshot is dated `2026-09-14`, read at
`2026-09-14T04:39:32.082Z`. Scorpio has `priceUsd: null` and zero indexed pools.
The inherited test assumes that today's Scorpio quote is a small positive
number. That assumption is invalid for missing data, zero, or a price outside
the asserted range. The existing server formatter converts `null` to zero through
`Number(value)`, explaining the committed `$0`; that separate product behavior
is not corrected or endorsed by this test-only change.

The correction evaluates only the existing pure server `formatPrice` declaration
and the committed page's `finiteNumber`/`fmtPrice` declarations. It executes
neither the builder nor a market request. Fixed numeric and string inputs cover
eight-decimal small prices, the precision threshold, six-decimal prices, and
trailing-zero removal. Exact expected strings replace the mutable quote regex.
The existing no-acquisition-event and no-Jupiter-purchase-link assertions remain
unchanged, as do the rank-availability assertions.

No generated HTML, market snapshot, builder, product code, package, or protected
asset was changed. The only test edit is `scripts/sign-records.test.mjs`.

Focused verification after correction:

```text
node_modules/.bin/vitest run scripts/sign-records.test.mjs
1 file passed; 10 tests passed; 372 ms total.
```
