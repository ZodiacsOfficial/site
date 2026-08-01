---
record_id: GROWTH-2026-08-01-private-aggregate-measurement
record_type: opportunity
status: approved
owner: site owner
created: 2026-08-01
updated: 2026-08-01
decision_due: null
source_window: 2026-08-01..2026-08-01
evidence_window: 2026-08-01..2026-08-01
source_locations:
  - https://ploy.ai/workspaces/eb1bfbad-72dc-41fe-8fca-7506c94d5172/ploys/9f441b92-4e5c-4bfe-9fcf-2de648adbe33
  - https://zodiacs.org/
  - https://zodiacs.org/birth-chart/
  - https://zodiacs.org/today/
  - https://zodiacs.org/compatibility/
  - https://zodiacs.org/widgets/
  - https://zodiacs.org/privacy/
  - https://github.com/ZodiacsOfficial/site/tree/1c8d35a79cc98b85e0a1b72cf83a35c079f50f49
  - https://plausible.io/data-policy
  - https://plausible.io/docs/events-api
url: https://zodiacs.org/birth-chart/
query_cluster: private aggregate product measurement
related_urls:
  - https://zodiacs.org/today/
  - https://zodiacs.org/compatibility/
  - https://zodiacs.org/widgets/
related_records: []
evidence_quality: medium
privacy_class: aggregate-only
baseline: Unknown/null. Active outbound Plausible requests were verified, but dashboard receipt, retention, queryability, and historical counts were not.
hypothesis: A minimal no-identity daily event contract can show product-action volume without collecting chart data or creating visitor journeys.
expected_impact: Decision-useful aggregate action counts with substantially lower privacy and interpretation risk than session-based funnels.
confidence: medium
effort: medium
risk: Referrer-query leakage until the pending fix is deployed, provider-method drift, duplicate events, pre-success triggers, personalized URLs, or misleading funnel claims.
deployment_identifier: null
measurement_date: 2026-08-29
result: pending
decision: accept Plausible's bounded daily deduplication under explicit conditions, set every outbound referrer to null, and keep measurement aggregate-only
next_action: Deploy and verify the referrer-null regression fix, disclose Plausible's transient IP/User-Agent processing, then review the minimal event contract; only Daily Action v2 may promote approved definitions.
---

# Opportunity: Private aggregate conversion measurement

## Visitor job and problem

The product has meaningful client-side actions—chart calculation, local save, compatibility, Today, sharing, calendar intent, and widget copy—and active Plausible delivery code. The current implementation mixes success events, pre-success attempts, aliases, and unused allowlist names. A raw referrer query can leave the browser, while the hosted service briefly processes IP address and User-Agent to derive a daily deduplication identifier. The referrer must be removed. Plausible's bounded daily method is accepted only because the raw inputs are not stored, its salt rotates and is deleted every 24 hours, it cannot create a persistent cross-day identity, and Growth OS receives aggregates rather than visitor records.

## Evidence

| Signal | Window | Value | Source | Limitation |
| --- | --- | --- | --- | --- |
| Instrumentation delivery | 2026-08-01 | All inspected routes load Plausible; isolated browser interception observed attempted `pageview` and `chart_computed` POSTs to `https://plausible.io/api/event` | Live build plus remote `main` at `1c8d35a`; independent validation | Requests were aborted before delivery, so dashboard receipt and historical counts remain unknown/N/A |
| Referrer privacy defect | 2026-08-01 | A same-origin navigation from `/?audit_query=discard#discard` caused both pageview and custom-event payloads to include `r: https://zodiacs.org/?audit_query=discard` | Isolated intercepted requests; `src/layouts/Base.astro` on remote `main` | Confirms query transmission and a one-step cross-page trail; fragment was removed by browser referrer behavior |
| Bounded daily deduplication | 2026-08-01 | Hosted Plausible derives a site/device/day identifier from IP, User-Agent, domain, and a salt that rotates and is deleted every 24 hours | Plausible data policy and Events API documentation | Accepted only for aggregate counting: raw IP/UA are not stored, no cross-day identity is available, and the method must be disclosed and re-reviewed if it changes |
| Chart success | 2026-08-01 | Timed and unknown-time charts render client-side and fire both `result_rendered` and `chart_computed` with only `mode` | `ChartCalculator.tsx` on remote `main`; Ploy live QA | Duplicate calls describe one product outcome; unknown-time cannot and should not be linked across events |
| Local save | 2026-08-01 | `chart_save` fires before the attempt; `chart_saved` follows a successful local-storage write | `ChartCalculator.tsx` and `profile/store.ts` on remote `main`; Ploy live QA | Optional account sync may follow; failure paths were not deliberately induced |
| Sharing | 2026-08-01 | Chart cards fire `chart_share` plus `share_card_downloaded`; compatibility fires the latter only; detail-link copy has no event | Share controls on remote `main`; Ploy partial live QA | `share_card_downloaded` conflates native share and download; copied links can contain private birth details and must never enter analytics |
| Today | 2026-08-01 | Empty and locally personalized states fire the same property-free `today_view` | `TodayBrief.tsx` on remote `main`; Ploy live QA | Saved/no-saved state is DOM-only, which appropriately prevents save-to-return measurement |
| Compatibility | 2026-08-01 | Client-side comparison fires `compat_computed` for form, restored, invite, and returned paths | `SynastryCalculator.tsx` on remote `main` | Dashboard delivery/count remains unverified |
| Explorer and guide | 2026-08-01 | `explorer_interaction` is unused; the full tour fires `tour_complete` upon entering the last chapter and the quick guide uses `first_reading_completed` | Explorer source on remote `main` | Ploy's claim that `tour_complete` lacked a trigger was false; entering the last chapter is not necessarily an explicit finish click |
| Calendar intent | 2026-08-01 | A valid personalized-calendar link click fires `calendar_subscribe` | `CalendarSubscribe.tsx`; Ploy live QA | Proves link activation, not browser/OS acceptance |
| Widget and email | 2026-08-01 | Widget copy fires after clipboard/fallback copy is attempted; `email_subscribed` fires after a successful email-capture response | Widgets and email-capture source on remote `main` | Weekly account-digest opt-in is a separate control with no analytics event |

- Evidence window: 2026-08-01 UTC.
- Canonical URL: https://zodiacs.org/birth-chart/.
- Owned query/intent cluster: private, anonymous aggregate product measurement.
- Reproducible baseline: unknown/null; no current count is assumed to be zero.
- Hypothesis: after deploying the referrer-null fix, one success event per meaningful action aggregated only by UTC day and route family is enough for release comparison without persistent identity.

## Intent and current destination

- Intent class: internal product measurement and release learning.
- Current canonical page: `/birth-chart/`; parallel surfaces are `/compatibility/`, `/today/`, and `/widgets/`.
- Existing pages with possible overlap: none; this is a measurement contract, not a public landing page.
- Public result/competitor observations: not applicable.

## Proposed response

The privacy resolution approved on 2026-08-01 is:

1. In every Plausible `transformRequest` path, set `payload.r = null`; cover the Astro layout, legacy generators, and checked-in static pages with one regression test.
2. Accept Plausible's daily IP/User-Agent-derived deduplication only while raw inputs are not stored, the salt rotates and is deleted every 24 hours, the identifier remains site/device/day-scoped, Growth OS receives no identifier, and public privacy copy discloses the transient processing.
3. Keep all current counts N/A until dashboard receipt, retention, and queryability are verified without sending test conversions into production.

Then review this minimal event contract:

| Event | Exact success boundary | Allowed properties | Disposition |
| --- | --- | --- | --- |
| `chart_computed` | One usable timed or intentionally untimed chart is visible | None | Keep as the sole chart-completion event |
| `result_rendered` | Same boundary as `chart_computed` | None | Retire or historical-alias; never count as a second step |
| `chart_saved` | Local-storage write returns success | Optional coarse `surface` only | Keep; do not use pre-write `chart_save` as a conversion |
| `compat_computed` | Usable compatibility result is visible | None | Add to the canonical proposal |
| `today_view` | Public or local-personalized Today shell renders | None | Keep as one indistinguishable aggregate view event |
| `share_card_downloaded` | Local card share/download returns a non-cancel outcome | Optional public `variant` only | Rename or redefine because it currently conflates native share and download; retire the duplicate `chart_share` |
| `calendar_subscribe` | Enabled calendar link is activated | None | Keep and label as click intent, never confirmed subscription |
| `widget_embed_copied` | Clipboard write succeeds; manual fallback only after explicit confirmation | Optional fixed `widget` and `mode` | Keep, but do not count a fallback attempt without confirmed copy |
| `tour_complete` | The intended full-tour completion boundary succeeds | None | Move from entering the last chapter to the approved finish boundary; keep quick-guide completion semantically distinct or standardize explicitly |
| `explorer_interaction` | Explorer selection or lens changes successfully | Optional coarse control type, never selected value | Omit unless interaction depth will change a decision |
| `email_subscribed` | Server confirms general email capture succeeded | Optional fixed placement only | Keep provisional; do not mislabel it as weekly account-digest opt-in |

- Intended next step: approve the forbidden-data list and event aliases before any implementation.
- Why this is preferable to changing an existing page differently: it cleans the semantic contract first and prevents instrumentation from legitimizing duplicate or privacy-risky data.

## Privacy threat model

One confirmed live blocker remains until deployment: raw referrer queries can leave the browser. Hosted Plausible's daily identifier is a reviewed, bounded exception rather than a person-level profile; it must never be exposed to Growth OS or extended into cross-day journeys.

The broader risk is reconstructing or linking a chart from fields that seem harmless alone. Prohibit all of the following in events, page fields, logs, retries, and dashboards:

- Birth date, time, place, coordinates, timezone, or derived UTC instant.
- Placements, aspects, house data, wheel geometry, chart payloads, or result text.
- Names, email, account/user/visitor/session/event IDs, chart/pair/save IDs, or IP-derived profiles.
- Free text, clipboard/embed/share contents, raw URLs, referrers, query strings, fragments, invite links, calendar URLs, or tokens.
- Cross-page trails, cross-user trails, exact timestamps attached to any identifier, session replay, or identity stitching.

Required controls: strict event/property allowlist, unknown-key rejection, canonical route families, `payload.r = null`, prohibited-key/value fixtures, daily UTC aggregation, N/A for missing data, no persistent/user/session identifier, no daily provider identifier exposed to Growth OS, and small-cell suppression if any optional coarse property is retained.

## Minimal aggregate model

After a compliant aggregation path exists, the defensible output is a daily volume ladder, not a user funnel:

1. Home route views.
2. `/birth-chart/` route views.
3. `chart_computed`.
4. `chart_saved`.
5. Optional depth counts: `share_card_downloaded` and calendar-link activation.

Parallel line: `/compatibility/` route views → `compat_computed` → compatibility save/share-card counts.

Daily action-per-route-view ratios may be directional, with denominator zero reported as N/A. Do not label them unique-user conversion, session conversion, retention, attribution, causal progression, or a step-to-step user journey.

## Priority assessment

| Dimension | Score 0–3 | Evidence |
| --- | ---: | --- |
| User value | 2 | Better release decisions can improve the product without surveillance |
| Evidence | 3 | Active requests, payload filtering, trigger locations, and the referrer leak were independently reproduced |
| Strategic fit | 3 | Directly supports private-by-default positioning |
| Differentiation | 2 | No-identity aggregate learning is consistent with the product promise |
| Effort | 2 | Contract cleanup and QA are moderate; no new identity layer is required |
| Measurement | 1 | Daily actions are technically measurable, but current privacy behavior blocks clean adoption |

## Constraints and risks

- Roadmap/wing boundary: keep this in the consumer product Growth OS; do not join it to Registry contributor or person records.
- Privacy review: mandatory; raw referrers must be fixed before expansion. Plausible's bounded daily method is approved only under the documented conditions and must be re-reviewed if the provider changes it.
- Cannibalization risk: not applicable.
- Page-velocity impact (0 or 1): 0; this record authorizes no page change.
- Rolling seven-day total after approval: to be computed by the canonical state writer.
- Other dependencies: named engineering/privacy owners, a compliant aggregation path, dashboard verification without production test conversions, two clean UTC QA days, and release annotations.

## Baseline and success

- Primary measure and exact definition: daily count of each approved success event by canonical route family and UTC day only.
- Baseline window/value: unknown/null. Active outbound delivery is confirmed, but historical receipt/counts were not inspected and must not be inferred.
- Expected impact and unit: trustworthy daily action counts with no persistent identity.
- Confidence: medium.
- Effort: medium.
- Risks and severity: confirmed high privacy risk from referrer-query leakage until the fix is deployed; provider-drift risk if the accepted daily-deduplication boundary changes; high interpretation risk if aggregates are called user funnels; medium duplication risk until aliases are removed.
- Review window: begin only after contract approval and clean QA.
- Measurement date: null.
- Guardrails: automated payload rejection, one event per success, no event on failure/cancel, no personalized link contents, and N/A rather than fabricated zeros.

## Decision

- Decision: accept Plausible's bounded daily deduplication, remediate referrers, and keep this record from authorizing any expansion beyond aggregate-safe allowlisted events.
- Human decision owner/date: project owner / 2026-08-01.
- Rationale: Plausible's raw IP/User-Agent inputs are not stored, its salt rotates and is deleted every 24 hours, and its identifier cannot link a visitor across days or sites. That is acceptable for aggregate counting when disclosed; the raw referrer leak is not. Ploy's blank-endpoint conclusion and tour-trigger finding were both incorrect.
- Next durable record: approved analytics definition or experiment record written through the sanctioned Growth OS state-writer path.
- Deployment identifier (`null` until released): null.
- Result (`pending` until measured): pending.

## Audit provenance and boundaries

- Ploy artifact: `Growth OS Opportunity — Private Aggregate Conversion Measurement — 2026-08-01`.
- Independent validation: live public pages, isolated intercepted requests, remote `main` at `1c8d35a`, and Plausible's published data policy. The checked-out local branch is stale and was not treated as production truth.
- No analytics connection, OAuth grant, account, cookie, dashboard, production setting, deployment, publication, or external message was created or changed.
