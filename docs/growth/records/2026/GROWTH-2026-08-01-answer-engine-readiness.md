---
record_id: GROWTH-2026-08-01-answer-engine-readiness
record_type: opportunity
status: approved
owner: site owner
created: 2026-08-01
updated: 2026-08-01
decision_due: null
source_window: 2026-08-01..2026-08-01
evidence_window: 2026-08-01..2026-08-01
source_locations:
  - https://ploy.ai/workspaces/eb1bfbad-72dc-41fe-8fca-7506c94d5172/ploys/a8a2281e-c9e2-42c2-9bbb-dffa09b8755e
  - https://zodiacs.org/llms.txt
  - https://zodiacs.org/llms-full.txt
  - https://zodiacs.org/horoscopes/
  - https://zodiacs.org/privacy/
  - https://zodiacs.org/methodology/
url: https://zodiacs.org/
query_cluster: Zodiacs.org entity, private birth chart, chart accuracy, daily horoscope
related_urls:
  - https://zodiacs.org/birth-chart/
  - https://zodiacs.org/compatibility/
  - https://zodiacs.org/registry/
  - https://zodiacs.org/data/daily-publication.json
related_records: []
evidence_quality: medium
privacy_class: aggregate-only
baseline: Independent answer-engine citation and rank baseline is unknown; Ploy's four-query spot check is directional, not decision-grade.
hypothesis: Correcting machine-readable contradictions and publishing precise citable evidence will make answer engines less likely to misstate Zodiacs.org and more able to resolve the brand.
expected_impact: Higher factual consistency and answer-engine retrievability; acquisition impact remains unmeasured.
confidence: medium
effort: medium
risk: Over-optimizing for optional AI-discovery conventions, broadening claims, or creating duplicate entity signals.
deployment_identifier: null
measurement_date: 2026-08-29
result: pending
decision: approved by the site owner on 2026-08-01; implement the corroborated trust and machine-readable corrections through the Release & Trust Gate
next_action: Deploy and verify the aligned public and assistant-facing claims, then promote the release receipt through Daily Action v2.
---

# Opportunity: Answer-engine readiness

## Visitor job and problem

People and answer engines need a consistent explanation of what Zodiacs.org does, how its calculations work, and what leaves the browser. The live site has strong crawlable infrastructure, but several AI-facing statements lag the product or overstate precision.

## Evidence

| Signal | Window | Value | Source | Limitation |
| --- | --- | --- | --- | --- |
| Horoscope cadence contradiction | 2026-08-01 | `llms.txt` and `llms-full.txt` describe monthly horoscope pages while the live hub and sign pages publish daily editions | Live AI-context files and horoscope pages; corroborated against source | Current working branch is older than the live deployment |
| Assistant privacy omission | 2026-08-01 | Live AI-context copy says calculations stay local and describes account sync, but does not disclose the privacy policy's transmission of assistant messages and a computed-placement summary to Anthropic | Live AI-context files and privacy policy; corroborated | This is an omission in the live files, not a literal claim that no assistant data ever leaves the device |
| Unknown-time precision overclaim | 2026-08-01 | Birth-chart, compatibility, and methodology copy says planets are "exact to the day"; code substitutes noon, marks the Moon as estimated/ambiguous, and allows degree uncertainty | Live pages and source corroboration | The phrase may intend day/sign-level accuracy, but reads as degree/aspect precision |
| UTC edition metadata | 2026-08-01 | Ploy flagged missing UTC context, but live JSON-LD, `<time>` values, visible evidence rows, and the daily publication record already include UTC timestamps | Independent live verification | A UTC-vs-local "Today" UX question remains, but absence of UTC metadata is not confirmed |
| Entity graph boundary | 2026-08-01 | The root Organization already has `alternateName: Zodiacs.org`; the Registry has distinct WebPage and Dataset IDs, but no explicit `hasPart` boundary | Independent live/source verification | Ploy's missing-`alternateName` assertion is false; further separation is only an opportunity |
| AI-context discovery hints | 2026-08-01 | No homepage HTTP `Link` header, HTML alternate to `llms.txt`, or content negotiation was observed; direct AI-context files correctly return plain text | Independent live verification | These are optional discoverability conventions, not protocol defects |
| Calculation-validation evidence | 2026-08-01 | Public engine tests document JPL Horizons vectors, frame, dates, and tolerances, but there is no standalone report with raw responses, deltas, provenance URLs, and a recorded CI result | Public source and independent review | Tests could not be rerun in the inspected working branch because `vitest` was unavailable |
| Four-query Ploy spot check | 2026-08-01 | Ploy reported no top-ten Zodiacs.org result for four brand/discovery queries | Ploy audit | Search surface, engine, location, personalization, and repeatability were not sufficient for an independent baseline |

- Evidence window: 2026-08-01.
- Canonical URL: https://zodiacs.org/.
- Owned query/intent cluster: Zodiacs.org entity, private birth chart, chart accuracy, and daily horoscope.
- Reproducible baseline: Unknown. Do not convert Ploy's spot check into a zero baseline.
- Hypothesis: Removing the three corroborated contradictions will improve factual retrieval before any speculative AI-SEO work; validation artifacts require a separate approved follow-up.

## Intent and current destination

- Intent class: branded entity, trust, calculation accuracy, privacy, and daily horoscope discovery.
- Current canonical page: homepage, with `/birth-chart/`, `/methodology/`, `/privacy/`, and `/horoscopes/` as supporting destinations.
- Existing pages with possible overlap: `/registry/` is a collector/public-record wing, not a replacement consumer landing page.
- Public result/competitor observations: Ploy's four-query snapshot is retained as seed evidence only.

## Proposed response

- Improve: update `llms.txt` and `llms-full.txt` from monthly-only horoscope language to the actual daily publication model.
- Improve: align AI-context privacy summaries with the assistant-data disclosure in the privacy policy.
- Improve: replace "exact to the day" with precise unknown-time language that separates stable placements from Moon/angle/house uncertainty.
- Deferred follow-up: consider a standalone, versioned engine-validation artifact derived from the existing JPL-backed tests; it is not part of this approved release.
- Deferred follow-up: investigate one explicit, non-duplicative semantic boundary between the consumer site and Registry wing; it is not part of this approved release.
- Defer unless measured: HTTP discovery hints/content negotiation and broad answer-engine optimization.
- Intended next step: implement the owner-approved copy and evidence changes, then release them through the normal trust gate.
- Why this is preferable to changing an existing page differently: it fixes contradictions at their sources and avoids creating thin pages for unverified queries.

## Priority assessment

| Dimension | Score 0–3 | Evidence |
| --- | ---: | --- |
| User value | 3 | Privacy and unknown-time precision directly affect trust |
| Evidence | 3 | Three core contradictions were independently corroborated |
| Strategic fit | 3 | Supports private, transparent, evidence-led positioning |
| Differentiation | 2 | Consistent, evidence-bound trust copy is more defensible than broad accuracy claims |
| Effort | 2 | The three approved copy fixes are small; deferred validation and entity work are excluded |
| Measurement | 1 | Answer-engine visibility baseline is not yet reproducible |

## Constraints and risks

- Roadmap/wing boundary: keep Registry clearly separate from the consumer product while preserving shared publisher provenance.
- Privacy review: do not weaken or generalize the Anthropic disclosure; use the privacy policy as the source of truth.
- Cannibalization risk: do not create new overlapping horoscope or accuracy pages without query evidence.
- Page-velocity impact (0 or 1): 0.
- Rolling seven-day total after approval: to be computed by the canonical state writer.
- Other dependencies: the exact approved merge revision, the release trust gate, and sanctioned Daily Action v2 promotion.

## Baseline and success

- Primary measure and exact definition: consistency pass rate across AI-context files, public trust pages, and machine-readable metadata; acquisition outcome remains directional and unmeasured at the 2026-08-29 review.
- Baseline window/value: unknown/null for answer-engine acquisition; three high-value copy inconsistencies confirmed on 2026-08-01.
- Expected impact and unit: fewer factual contradictions; search/citation impact unquantified.
- Confidence: medium.
- Effort: medium.
- Risks and severity: medium risk of schema duplication or unsubstantiated accuracy claims; low risk for precise copy corrections.
- Review window: 28 days after the approved 2026-08-01 release window.
- Measurement date: 2026-08-29.
- Guardrails: no user-level tracking, no fabricated rankings, no new public claims without evidence, and no conflation of Registry with the consumer site.

## Decision

- Decision: approved; implement the three corroborated copy corrections through the Release & Trust Gate while keeping speculative discovery hints deferred.
- Human decision owner/date: site owner / 2026-08-01.
- Rationale: Ploy surfaced useful contradictions, but two of its material claims were overstated and its query snapshot is not a reproducible baseline.
- Next durable record: a sanctioned Growth Portfolio opportunity followed by matching studio-brief and release-gate records for the exact deployed revision.
- Deployment identifier (`null` until released): null.
- Result (`pending` until measured): pending.

## Audit provenance and boundaries

- Ploy artifact: `GROWTH-2026-08-01 AI Readiness Exit Audit`.
- Independent validation: live public pages plus the local repository, with deployment/source drift recorded above.
- No production page, analytics account, OAuth grant, publication, deployment, or external messaging was changed by this audit.
