# C02: one house field conflates calculation result and replay setting

**Confirmed unresolved contract defect:** a freshly recomputed remote chart
can carry whole-sign results with a Placidus summary label. **Withdrawn fix:**
replacing that label with the actual system alone loses the Placidus setting
used for the next calculation and account round trip. No remote adapter or
schema change was applied as part of this investigation.

The original synthetic records are
[reproduction](c02-remote-house-reproduction.json) and
[intent counterexample](c02-remote-house-intent-counterexample.json).
The first was observed at 2026-09-07 20:31 UTC on site
`8343f173e4db2e8ab6628bd04590e41b056872ce`; the counterexample followed at
20:36 UTC. The recorded `remote-chart.ts` SHA256 is
`74bd4bf17e810712d8f5406971f8e98fe467cbc11a1bf87de33a84525135cb8b`,
which still matched that source when these records were archived.

Engine `0.1.1-rc.1` archive SHA256:
`f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17`.
Runtime: Node 22.23.2, ICU 78.2, tzdata 2026a; synthetic birth inputs explicitly
use `Etc/UTC`. These records were archived without rerunning their probes.

## Concrete reproduction

Construct a schema-valid `ready` projection for a synthetic self chart with:

- UUID `11111111-1111-4111-8111-111111111111`, revision 3, creation/update
  timestamps `2026-01-01T00:00:00.000Z` / `2026-01-02T00:00:00.000Z`.
- Birth `2001-12-21`, `09:00`, known time, latitude `78.2232`, longitude
  `15.6267`, zone `Etc/UTC`; all name/place fields are synthetic labels.
- Derived house system `placidus`, time-known true, Sun sign `aries`, engine
  version `synthetic-remote-v1`; positions `b: [0,20,40,60,80,100,120,140,160,180,200,220]`,
  `a: [42,140]`, `h: "p"`, `v: "synthetic-remote-v1"`.

The sentinel positions/version distinguish successful local recomputation
from retention of the remote projection. They are not ephemeris references.
`parseReadyRemoteChart` accepts the synthetic projection. Calling
`savedChartFromRemote` and comparing with public-root `natalChart` shows:

| Field | Actual fresh engine result | Restored summary |
| --- | --- | --- |
| House system | `whole` | `placidus` |
| ASC | `23.871984112302016` | same |
| Flags | `polar-fallback` | same |
| Engine version | `0.1.1-rc.1` | same |
| Bodies / angles | fresh calculation | exact match |

`savedChartFromRemote` uses `parsed.positions.houseSystem` as the calculation
request, then copies it into `summary.houseSystem` after recomputation.
`resolveSavedChart` accepts the current-version summary without another engine
load. Local `selfChartPutWire` serialization repeats `placidus` and `h: "p"`.
No account request was sent.

Six cases were exercised: polar requested Placidus, polar requested whole,
ordinary-latitude Placidus (`40.7128`), unknown time, absent place, and an
invalid-zone recomputation failure. Only the known-time Placidus-to-whole
case had the observed actual/result-label mismatch. All cases preserved the
input projection, id, birth, revision and timestamps. Missing-place and
failed-resolution cases retained the original projection's derived data.

The JSON field `expectedSummaryHouseSystem` records the actual-result
comparison used by the initial probe. It is **not** an approved instruction
to overwrite the sole stored house field. Unknown-time calculations have no
actual houses, even though their existing summary still carries a setting.

## Why the one-line fix was withdrawn

The counterexample changed only an in-memory synthetic result:

```diff
- houseSystem: parsed.positions.houseSystem,
+ houseSystem: computed.houses?.system ?? computed.input.houseSystem,
```

It then exercised the actual handoff, serialization and restore functions.
Before normalization, `profileChartRunInput` requested Placidus. After the
change, the rerun requested whole-sign; `selfChartPutWire` emitted only
whole-sign and `h: "w"`; restoring that payload requested whole-sign and no
longer carried `polar-fallback`. Adding an optional local
`summary.requestedHouseSystem = "placidus"` did not help: both the current
wire builder and canonical private-payload serializer dropped it.

This is a counterfactual local round trip, not an observed loss in a real
account. It proves that preserving the original JavaScript projection alone
does not preserve the setting through a later authorized sync.

## Contract constraints for the next bounded change

`profile/schema.ts` has one summary house field and no requested setting in
birth. `profile-chart-handoff.ts` reuses that field as input; `profile/store.ts`
also includes it in chart identity. The calculator and saved-chart resolver
already store actual systems in other paths, exposing an existing inconsistency.

`account-v2/chart-wire.ts` copies the single field into the positions codec.
`account-api/sync-wire.ts` requires an exact derived shape and agreement with
`positions.h`. `mutation-fingerprint.ts` serializes explicit v1 fields, whose
exact bytes and hashes have tests. A local extension cannot by itself preserve
both meanings across these boundaries.

The next implementation needs a bounded compatibility decision for requested
and actual systems, unavailable/legacy provenance, rerun and identity behavior,
and versioned serialization accepted by old/new clients. Tests should cover
Placidus → whole fallback → save → rerun → local upload serialization → restore,
plus the five controls above. Existing v1 payloads and fingerprints must remain
readable. A high latitude and a legacy whole-sign value cannot establish that
Placidus was originally requested; that intent must not be invented.

The definite defect is an inconsistent fresh-result receipt. Discarding a
retained replay setting is not a complete correction. No replacement schema,
migration, service, account operation or frozen engine change was performed
by this investigation.

## Limits

These are finite source-level tests of synthetic decrypted projections on one
Node/ICU/tzdata runtime, using the installed public package as a comparison.
They do not independently certify astronomy, all polar conditions, historical
timezone accuracy, browser behavior, a deployed account flow or external
adoption. Fallback summaries also have unverified noon-UTC/retrograde defaults;
they must not be described as complete calculation receipts. Those defaults
were observed in source and were not corrected in this work.
