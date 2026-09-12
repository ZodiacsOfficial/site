# Unknown-time representative admission: bounded implementation preparation

Recommend a **requested-date membership guard on the already chosen reference**, immediately before numerical calculation in both callers. This stops the demonstrated skipped-date calculations in runtimes without native Temporal. It deliberately does not detect all empty dates, establish exact noon existence, repair date coverage, or prove whole-date Sun/Moon candidate completeness. No product source was changed or activated in this preparation.

## Exact small contract and call sites

Add one lazy, side-effect-free callable in `src/lib/time/localToUtc.ts`, reusing its existing Gregorian/Latin/era-aware wall formatter rather than creating another formatting policy:

`localDateContainsUtc(date: string, utc: Date, timeZone: string): boolean`

- Require a valid canonical civil date in `0000–9999`, a finite Date, and an explicit nonempty string timezone. Host-unsupported zone/formatting failure throws a sanitized error; it is not a negative date-existence finding.
- Return true only when the formatted **astronomical Gregorian local date** equals the requested date. Return false for an otherwise valid reference outside that date. Do not compare UTC ISO dates, locale display strings, minute-rounded offsets, gap flags, or era-less years.
- True means this instant witnesses at least one member of the requested date according to this host's data. False means this chosen representative is unavailable for that date. Neither result certifies date coverage. Do not export the private formatter unguarded: `undefined` currently uses the machine zone when that private function is called outside the validating resolver. The new boundary must not inherit that fallback. This is a proposed-boundary pitfall, not an existing public resolver defect.

Selected current source locations (snapshotted bytes, not a repository-wide immutable checkout):

| Path and location | Minimal placement and preserved behavior |
| --- | --- |
| `src/islands/ChartCalculator.tsx:1178` | Immediately after `resolveLocalToUtc`, require membership only when `!input.timeKnown`. Reject inside the existing run-owned try/catch, before `calculationInput`, `computeCalculatorReceipt`, legacy natal, endpoints, receipt/export capture, share preparation and computed notification. Existing engine/optional module loads can stay before it. |
| `src/islands/MoonPhaseTool.tsx:116` | In the city branch, after resolving `utc`, require membership only when `!hasTime`. Reject before both date endpoints and `bodyLongitude` calls. Keep no-city UTC behavior unchanged. |
| `src/islands/ChartCalculator.tsx:1285`, `src/islands/MoonPhaseTool.tsx:154` | Existing corrected ownership catches clear the current failed result and show/focus the error. Preserve input fields, revision checks and stale completion rejection. No partial result, receipt, old-result fallback, or persistent save is appropriate. |
| `src/islands/ChartCalculator.tsx:1062` | Positions-only decoding has no requested civil date; leave this path and its public/profile ownership fences untouched. |
| `src/lib/share.ts:86` | Existing birth links accept host-supported aliases/fixed offsets via Intl and years 1800–2199. Do not replace this with a new IANA-name-only regular expression or change the public link boundary. |

The existing generic localized calculation errors already communicate failure and preserve the UI structure. They misleadingly suggest retry for a deterministic date mismatch, so a later authorized wording choice could instead say: “A calculation time could not be established within this local date. Check the date and place.” Do not say the date never existed based on this check. A dedicated localized message is a small product-copy choice, not justification for introducing a new provider/dependency. This preparation makes no locale change.

## Executed evidence and active challenges

Main probes executed actual current resolver, private wall formatter, chart adapter and receipt module on Node 22.23.2 and 24.19.0 (ICU 78.2/tzdb 2026a). `identity.json` lists all 27 selected build/source inputs. The private export exists only in a read-only probe bundle. The candidate guard is a **model in the probe**, not an implemented caller or browser acceptance claim.

- Twelve date/zone calculation controls per runtime: Apia `2011-12-30` and Kwajalein `1993-08-21` currently compute a chart and receipt after resolving into the following local date. The proposed guard model rejects both before any modeled chart/receipt or Moon/Sun reference call. Its ten admitted ordinary/DST/LMT/fixed-offset/repeated/disconnected controls produce byte-equivalent serialized chart values to the existing path. The positive entry counters describe guarded orchestration, not instrumented public-natal call counts.
- Six calendar boundary controls per runtime cover `0000`, `0099`, `9999`, leap day, offsets ±23:59, and the millisecond before local midnight, including internal expanded UTC years. These are calendar controls, not astronomy/UI accuracy claims.
- Three historical-second-offset midnight controls per runtime preserve exact membership at midnight and reject the preceding millisecond. Rounding offsets to whole minutes gives a wrong date in a valid control. Fourteen identifier controls preserve accepted aliases and fixed offsets; unsupported second-bearing offset identifiers, invalid zones and malformed forms remain unresolved rather than empty. Five malformed-input controls demonstrate the required safe helper boundary.
- The child's separately sealed 17 real-zone/date controls run both actual Node and native Chrome 152. Four noon mismatches are native-provider empty (Apia, Kwajalein, Kiritimati and Guam). No nonempty date with a wrong-date noon was found in this finite set. Node's default interval provider is unavailable for all 17, distinctly unresolved even for the four Chrome-empty dates.
- Five actual dates still pass noon while retaining endpoint coverage defects: Toronto `1919-03-31` omits 30 minutes; St_Johns `2009-10-31` omits a returning 59 minutes and `2009-11-01` includes them from the wrong date; Juneau `1867-10-18/19` similarly omits/includes 8h26m28s. Apia `1892-07-04` and Kwajalein `1969-09-30` pass noon on 48/47-hour dates. Passing the witness must not be reported as fixing any candidate-certainty defect.
- A decisive **synthetic, not IANA** counterexample uses one complete UTC+00→UTC+15 transition at `2000-01-01T00:00Z`. The unchanged resolver selects Jan 2 03:00 for Jan 1 noon, while the actual interval primitive with this genuinely complete one-transition provider proves Jan 1 exists for nine hours. Therefore this policy deliberately refuses some nonempty date models. The proof obligation cannot be weakened to “failed noon means empty.” Exact source and synthetic adapter/proof are preserved separately.

Known-time gaps remain a separate accepted policy. The actual resolver still shifts explicit Apia `2011-12-30 12:00` to the next date and New York `2026-03-08 02:30` forward with `dst-gap`; the unknown-only check must not alter them. A same-date gap-shifted representative can also pass this check without being exactly noon; existing midpoint captions/context and gap behavior are not certified by date membership. Do not add stronger wording to this slice.

## Only two viable options

| Option | Benefit and material limit |
| --- | --- |
| **1. Reference membership guard (recommended bounded next slice).** Keep the complete interval API inactive. | Prevents calculation on a truly skipped requested date under the same host data, preserves ordinary non-Temporal operation, and avoids endpoint policy changes. Conservatively refuses an out-of-date reference even when that date may exist elsewhere. Leaves all date coverage and whole-date body-candidate claims unresolved. |
| **2. Require complete native interval admission and reference membership.** | Can distinguish native-provider `empty` from `unresolved` and describe disconnected/long dates. It would refuse ordinary unknown-time operation wherever native transition enumeration is missing/failing or disagrees with Intl. A nonempty interval set alone cannot justify keeping an out-of-date reference; selecting a new member changes the representative/receipt contract. Complete date intervals still do not prove whole-date Sun/Moon candidate completeness. This option needs a broader compatibility/representative policy decision. |

Root's only necessary decision is whether the deliberate conservative refusal in option 1 is acceptable while the broader date-coverage problem remains recorded. No owner-only action or new service is required. The narrow guard should not silently substitute an interval endpoint, change known-time resolution, fabricate a zone, use hourly samples to certify completeness, or label provider failure as empty.

## Meaningful implementation acceptance after authorization

Implement the helper and two call-site guards with focused validation/boundary tests and native caller controls. Prove all four real skipped-date unknown-time paths refuse before numerical/receipt work; ordinary and repeated-date controls keep identical outputs; invalid/failing formatters clear current results; pending loaders followed by edit/new run or profile revoke cannot revive a rejected result. Begin with a successful result then submit the skipped date to prove the old chart/Moon/receipt/share controls disappear and the existing alert receives focus. Preserve explicit known-time gap calculations, no-city UTC Moon, positions-only imports without engine/civil work, and a following corrected-date recovery. Reuse the already reviewed ownership fences rather than creating a second run-token system.

Original evidence, generated subjects, raw logs and manifests are copy-ready. The child real-case and synthetic deliveries remain separately sealed; their hashes are linked in `linked-evidence-verification.json`. No source, SDK, metadata, profile/save lifecycle, UI styling, locale or dependency was changed here. This is a reproducible implementation prerequisite, not implemented/release-ready/published/deployed behavior.
