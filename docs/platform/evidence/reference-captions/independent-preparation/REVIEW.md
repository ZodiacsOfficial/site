# Independent C016 caption-boundary preparation

The smallest coherent correction is to describe unknown-time output as **reference positions / phase at the reference time**, and remove exact local-clock claims from surfaces that do not carry that clock. Keep the local-noon convention in input/method help, where it can explicitly say that clock gaps can shift the requested reference. Do not add time, zone or provenance fields to the public positions token.

This is read-only preparation against exact commit 9d180c9f1a2f66893ccd6d73fcda106cb3894674. No candidate implementation or copy freeze is approved here.

## Concrete executed boundary controls

Four actual engine/helper controls passed on Node 22.23.2, ICU 78.2, tz 2026a: 2000-01-15 at 06:17 and 18:43 UTC, each with supplied-time and no-time settings, coordinates 0/0. These deliberately bounded library inputs are not a claim that ChartCalculator's current UI chooses those reference clocks. The no-time charts were given the C015 empty-candidate state for presentation.

For both non-noon no-angle tokens, the actual public codec returns only bodies, angles, houseSystem and engineVersion. No date, clock, timezone or flags survive. Nevertheless, actual previewModel returns `12:00 reference / No houses / Tropical`; the actual locally invoked HTML handler returns the description `Sun and 12:00 reference Moon positions — birth details not included.` These are reachable responses for valid tokens, and the tokens cannot establish the claimed clock. The handler was invoked directly with a Request object; no network request or OG image rasterization occurred.

Actual shareCardTimeNotes, chartSheetSettings and opted-in chartSheetProvenanceLines also say 12:00 for these reference inputs. The latter already includes the correct Reference UTC line (06:17 or 18:43), showing that its local-noon statement is not derived from the represented instant. Hidden provenance remains exactly Birth details hidden.

Actual Inspector SSR uses the common noTimeNotice for an uncertain Moon and says 12:00 local civil time. The actual scene model has neither input nor a UTC/local clock, so Inspector cannot establish that statement from its own input. **The public #p receiver does not open Inspector**: current ChartCalculator selects PositionsOnlyResult for that branch. Its actual SSR already says Positions only and has no 12:00 claim. The Inspector control tests its clockless scene contract separately, not an invented public receiver path.

Both supplied-time positives omit the 12:00 notices, show their actual provided local clock and Resolved UTC provenance, and retain the full Sun/Moon/Rising OG description. The local Chart UI itself requires a city (compute lines 1315–1334); these UTC engine/helper positives do not establish a no-city Chart UI path. The independently assigned Moon tool review owns its real no-city UTC convention.

All four source/helper/SSR controls pass; raw inputs, token values, local HTML responses, Inspector and receiver markup, bundle, consumed source identities and runtime results are retained. This is not browser UI execution or a numerical correctness oracle. The separate author's actual Khartoum 13:00 witness was not rerun or substituted for these independent controls.

## Source boundaries and smallest output set

| Source at the exact commit | Consequence and smallest change |
| --- | --- |
| ChartCalculator.tsx:1177–1197 | Requests 12:00 for unknown time, resolves that wall time and applies the C014 same-date guard. It stores actual UTC in the chart and requested time/reference kind in the receipt. Preserve all numerical, resolver, receipt and admission behavior. |
| Six `src/lib/i18n/ui/{en,es,fr,it,pt,ru}.ts` catalogs: `noTimeNotice` and `chartTimeHelp` | Result/Inspector notice should say reference positions without promising an actual noon clock. If method help names noon, label it the requested convention and allow clock-gap adjustment; do not label it a whole-date fact. |
| ChartCalculator.tsx:2055–2058 and the same six catalogs | Moon mode currently says Moon phase at birth even when input.timeKnown is false. Select a reference-time phase label for unknown time and retain the existing birth label for known time. Coordinate one shared locale key with the Moon tool author; count-test adjustments follow only if a key is added. |
| Inspector.tsx:188–195 and 425–432 | It has a clockless scene and uses noTimeNotice in uncertain Moon body/aspect details. Generic reference wording in the shared existing key fixes this without adding scene provenance or a new component API. Exact numerical position remains a receipt. |
| `src/lib/share-card-copy.ts`: six `referenceTimeNote` entries | Use a clock-neutral reference/birth-time-unknown caption. All normal card variants and the dialog use this common function; no variant-specific numerical change is required. |
| `src/lib/share-card.ts`:51, 1025 and 1083 | Correct the option comment and two technical-sheet strings. Unknown-time settings can say Reference positions; opted-in provenance can say Birth time unknown and retain its existing actual Reference UTC line. Do not invent a resolved local clock or expose additional details. The flag line already identifies a gap adjustment when present. |
| `src/server/chart-preview-model.ts`:55 and `src/server/chart-preview.ts`:127 | Clock-neutral no-angle model settings and Sun/Moon positions description; preserve the known-angle branch. This is output text in existing server code, not a codec/route/schema change. Root must include these exact two output sources in the authorized slice. |

`ChartShareDialog.tsx:143` and `PositionsShareSurface.tsx:197` already pass the reference flag from the computed chart; they need no new provenance fields. The public receiver's positions-only copy and codec should remain unchanged. This avoids claiming that absence of transferred birth details proves the sender's birth time or local convention.

The export caption catalog has a real integration dependency: `scripts/build-i18n-additions.test.mjs` requires runtime PT/FR/IT shareCard strings to match `src/strings/additions.pt.mjs:296`, `additions.fr.mjs:290`, and `additions.it.mjs:296`. Thus changing referenceTimeNote coherently also requires only that exact key in those three protected canonical sources and the generator-owned manifest refresh. The same test checks manifest currency. No canonical source or generated file was edited here; prior C015 scope allowance does not authorize these additional paths. Root should explicitly account for them in the new bounded scope.

Relevant existing regression assertions are in share-card.test.ts:163–234 and 358; they pin the old noon strings and privacy provenance. Preserve known-time and hidden-detail positives while correcting those expectations. New controls should verify a shifted local-noon result, a valid clockless/non-noon positions token, the unknown-vs-known phase label, and unchanged numerical/envelope bytes. Complete-date candidate certainty and the reference-Sun downstream context remain separate C015 follow-ups; caption edits must not imply either is solved.

## Retained setup limitations

Initial targeted lookups guessed nonexistent i18n/share-cards.ts and share-copy.ts names; actual imports led to share-card-copy.ts and PositionsShareSurface's local catalog. Those lookup errors were not product failures.

Four fixture setup corrections are preserved with their original scripts/logs: an invalid esbuild define literal (and the immediately following missing-output execution), omitted component/style files from the initial exact-source capture, switching the fixture to ESM to avoid unused image-path import.meta warnings, and recognizing esbuild's virtual define input rather than trying to read it as a file. Component/style dependencies were then captured from the same exact Git commit. Final build and all runtime assertions pass without warnings. No source statement was patched or mocked; only the fixture build environment selects SSR and marks the unused @vercel/og image package external. The actual local HTML path is exercised; image rendering is not.
