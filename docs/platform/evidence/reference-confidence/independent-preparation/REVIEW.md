# Independent C-015 preparation at f803d254

No blocker was found in the inspected existing consumers for the root-selected policy: set `moonSignCandidates: []` on an unknown-time Chart before signature/share preparation, keep its reference calculation/receipt intact, and withhold the endpoint-derived singular Registry Sun bridge. This is preparation against exact `f803d2543ad81343b22d49326b8b46d0e2ea03a0`, not acceptance of the author's moving implementation.

Independent direct calls to the actual source modules reproduce both missing-sign counterexamples under Node 22.23.2:

| Requested local date | Admitted reference | Current verified candidates | Contradictory member |
| --- | --- | --- | --- |
| Toronto, 1919-03-31 | 16:00Z, local 12:00 | Aries only | 04:30Z formats March31 00:30; Moon longitude **359.7145003582242°**, Pisces. The preceding millisecond formats March30 23:29:59.999 and is not a member. |
| Juneau, 1867-10-18 | October17 20:57:41Z, local noon | Gemini only | October19 00:31:13Z formats October18 15:33:32; Moon **97.12696569323725°**, Cancer. The preceding millisecond formats October19 and is not a member. |

The actual C-014 membership helper accepts both reference instants and both contradictory witnesses. These finite witnesses invalidate the current singleton claims; they do not prove an exhaustive date interval or independently establish ephemeris accuracy. The longitude figures above are the actual `bodyLongitude` primitive outputs, not copied from the prior report. Toronto's last floating-point digits differ from its retained caller-body figure; no cross-path bit-equality or new numerical tolerance is asserted.

For both historical dates and an ordinary Bangkok control, changing only the in-memory presentation field to `[]` gives Moon status `unresolved`, null sign and no Moon-specific approach or communication advice. Toronto's signature changes from “Moon trine Neptune” to “Mercury trine Saturn”; Juneau's already non-Moon signature stays unchanged. Bangkok intentionally loses its previous singleton certainty. Two known-time controls remain established under the unchanged branch. Skipped Apia still fails the existing C-014 point-membership check.

The unknown-time controls retain **exact numerical JSON, receipt string, positions-token bytes and schema-shaped saved-input/summary projection**. The receipt is already an immutable string before presentation metadata is added. Saved projections were evaluated in memory; no store write, account access, network or persistence was performed. The birth-input link retains `timeKnown: false` on decode. This supports the proposed boundary but does not substitute for frozen actual-caller tests.

The current source consumer map is consistent:

| Consumer | Existing empty-candidate behavior |
| --- | --- |
| `moon-certainty.ts:12`, `chart-context.ts:83` | Explicit `[]` is unverified; no fallback to reference longitude; context retains the numeric receipt while clearing the Moon sign/dignity/dispositor claim. |
| `approach.ts:120`, `communication.ts:129`, `chart-signature.ts:275` | Moon-specific advice and Moon-aspect/signature eligibility are withheld. “May change” limitations do not assert that a crossing was demonstrated. |
| Chart hero/readings and `ReadingPath` | Hero uses “Needs a birth time”; Moon is omitted from settled totals/aspects and candidate-specific links. The dedicated new notice must replace the current Chart changed-sign sentence. |
| Scene/Inspector/Tour | Scene preserves `[]`; Moon/sign/aspect inspectors and tour receipts take uncertainty branches. Inspector's remaining `placementContext(...).where` is house-context only, not the sign-specific `how` or `synthesis`. Numeric reference geometry remains available. |
| Local share-card content and dialog | Big Three, Moon placement, approach, communication, signature and sheet helpers gate Moon advice/sign labels on `moonIsUncertain`. Direct helper controls produced empty Moon slugs and birth-time-needed labels. No canvas rendering was executed here. |
| Positions link / receiver | The existing wire deliberately omits candidate metadata. Unknown-time `angles: null` makes the receiver uncertain; its sign cell and strongest interpreted aspects remain guarded. The token is unchanged. |
| Saved input / handoff | Chart saves birth input and numeric summary, not candidate metadata (`ChartCalculator:1608`, schema). `profile-chart-handoff.ts` rebuilds the run from birth fields, then Chart reruns the current policy. Existing saved numeric summaries and other consumers are not retroactively rewritten. |

Two residual boundaries must remain explicit. The public OG model deliberately retains the numerical reference Moon sign under “12:00 reference / No houses / Tropical,” and its HTML description names reference Moon positions. It is not a date-wide candidate certificate; no API change is proposed. Chart's own `mode='moon'` still renders `moonPhaseAtBirth` from the reference instant at lines 2064–2067, independently of candidates. This pre-existing phase/reference wording should be tracked alongside the separately deferred MoonPhaseTool/page-caption work; the first C-015 slice must not claim to correct every unknown-time phase statement. Downstream reference Sun email context, saved Sun naming and remaining reference planetary positions are also separate by root policy.

No false Sun sign was demonstrated by these controls: endpoint/reference Sun agree as Aries, Libra and Capricorn respectively. Withholding the singular unknown-time Registry bridge is conservative, not a claimed Sun numerical correction. No provider, interval completeness theorem, polyfill, SDK/API/schema change, Registry source edit or global style change is required for the inspected empty-candidate behavior.

The exact source capture, consumed-source/dependency identities, standalone probe, bundle and raw Node output are retained. The probe calls actual modules with a controlled in-memory policy copy; it does not execute the Chart component or the author patch, render a product DOM, contact an endpoint or prove complete date coverage. The author/root were notified of the findings before freeze. Root remains integrator.
