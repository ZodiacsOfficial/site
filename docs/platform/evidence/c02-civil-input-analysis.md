# C02: impossible birth dates at the share and local-time boundaries

This is the **recorded pre-fix defect**, observed on 2026-09-07 at
`80dff5f16ec17045bcb52110a8105a9ad3492a99`. The civil-date correction has since
been applied to the working tree; this record does not certify its final
release, deployment, or adoption. All inputs below are synthetic.

The original, unmodified observation is
[c02-civil-input-reproduction.json](c02-civil-input-reproduction.json), SHA256
`2b7e35a4a20edd427bd63f98101d782e70a68f0f0bfe5aeec7e405ee39deac33`.
It records the source-file hashes, timestamp, runtime, exact fragment and
results. The runtime was Node 22.23.2, ICU 78.2, tzdata 2026a, with explicit
UTC for the malformed-date reproduction.

## Observed failure

The syntactically valid v1 birth-share wire was:

```json
{"d":"2001-02-29","t":"08:30","z":"UTC","la":13.7563,"lo":100.5018}
```

`src/lib/share.ts` accepted day 29 because it checked only day 1–31, not the
month's actual length. `ChartCalculator.tsx` accepts a decoded `#c=1.…` input
and autoruns it. `src/lib/time/localToUtc.ts` then passed the impossible date
to `Date.UTC`, producing `2001-03-01T08:30:00.000Z`. The original wall string
could not match that instant, so the resolver incorrectly added `dst-gap`.

The resulting engine `0.1.1-rc.1` chart carried the March 1 instant and false
gap flag. Its body positions exactly equaled a deliberate March 1 calculation.
The same public engine rejected the original `2001-02-29T08:30:00Z` string
with `RangeError`; it cannot detect the discarded invalid date after the site
has already converted it into a valid `Date` object.

The original source also accepted February 29 in 1900 and 2100, April 31,
and direct resolver clocks 24:00 / 08:60. Trailing-newline date and time
inputs were tested and **already rejected**; they are negative controls,
not additional vulnerabilities.

## Reproduction and verification boundaries

The synthetic probe bundled the actual site share and local-time entry points
with the installed esbuild and imported the public `@zodiacs/engine` root.
Its essential operations were:

```ts
const token = `1.${Buffer.from(JSON.stringify(wire)).toString('base64url')}`;
const input = decodeChartLink(token);
const resolved = resolveLocalToUtc(input.date, input.time, input.tz);
const chart = natalChart({
  utc: resolved.utc, latitude: input.lat, longitude: input.lon,
  houseSystem: input.houseSystem, timeKnown: input.timeKnown,
  flags: resolved.flags,
});
```

The original twelve-test regression run had six expected failures and six
passing controls. Controls covered the real leap day in 2000, unknown time,
synthetic non-ASCII labels, requested Placidus, New York's 2024 spring gap and
fall fold, and Mexico City's historical LMT seconds. This was an internal
source-level reproduction, with no network, account access, browser-storage
changes, real birth records, or publication.

The later isolated six-file civil patch passed 151 tests and a focused strict
TypeScript check. Its proposed share/resolver regressions produced 28 expected
failures and 59 passes against the captured original source. These counts
describe that isolated patch, before the integrator added timezone guards and
stored-receipt fallback tests; they are not the final integrated gate counts.

## Correction and compatibility

The bounded correction introduces an import-free civil date/clock parser and
uses it in both share decoding and the shared UTC resolver. The decoder keeps
its 1800–2199 window and null-on-invalid contract. The resolver rejects invalid
fields before Date normalization or timezone conversion, without echoing
private birth input in its validation error. Genuine DST and LMT resolution
still uses the host's Intl timezone data.

The resolver's existing four-digit date shape also required preserving years
0000–0099 with `setUTCFullYear`, and comparing era-aware, padded Gregorian
parts instead of a formatted display string. These are civil-field correctness
checks, not an extension of the consumer birth-date window or an astronomical
accuracy claim for ancient dates.

Existing v1 encoding, v2 positions-only links and export schemas are unchanged.
Stale saved-chart resolution already catches recomputation errors and retains
the stored summary; rejecting an impossible stored date follows that fallback
instead of silently recalculating another date. No stored birth, identity,
timestamp or legacy receipt is rewritten by this correction. A complete hostile
profile validator remains separate work.

A finite set of dates on one Node/ICU/tzdata runtime cannot establish all
historical timezone behavior, cross-browser equivalence, or numerical accuracy.
The public-engine comparison establishes the concrete rollover failure; it is
not an independent astronomical reference.
