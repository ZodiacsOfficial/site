---
record_id: GROWTH-2026-08-01-ploybook-delta-audit
record_type: weekly-review
status: approved
owner: site owner
created: 2026-08-01
updated: 2026-08-01
decision_due: null
source_window: 2026-08-01..2026-08-01
evidence_window: 2026-08-01..2026-08-01
source_locations:
  - https://ploy.ai/workspaces/eb1bfbad-72dc-41fe-8fca-7506c94d5172/ploys/290392b0-49bb-42de-9e2e-17c0fda473ab
  - docs/growth/README.md
  - docs/growth/playbooks/
  - docs/growth/templates/
related_urls: []
related_records:
  - GROWTH-2026-08-01-answer-engine-readiness
  - GROWTH-2026-08-01-private-aggregate-measurement
evidence_quality: medium
privacy_class: aggregate-only
decision: approved by the site owner on 2026-08-01; adopt the selected provider-neutral mechanics in the existing Growth OS without adding redundant playbooks
next_action: Merge the complete Growth OS documents, keep prohibited and deferred Ploy workflows excluded, and promote the accepted records through Daily Action v2.
---

# Ploybook delta audit

## Outcome

Growth OS already covered the core value of the available Ploybooks. No new standalone playbook was justified. A Ploy workspace-only comparison and an independent repository review identified a small set of durable, provider-neutral improvements, which are included on the review branch alongside this record.

## Coverage matrix

| Ploybook | Coverage before this review | Decision |
| --- | --- | --- |
| Build a Content Page | Full | Keep the existing Search Portfolio → Content Brief → Page & Creative Studio → Release Gate path |
| Social Ad Asset Generation | Full and intentionally gated | Keep human approval, privacy, budget, and channel-owner gates; add only a reproducible fixed-canvas production option |
| AEO Comparison Pages — Narrow Concession | Strong but implicit | Add an explicit evidence-first comparison and honest-concession block; reject blanket superiority |
| Create an OG Image | Strong on briefs | Add exact-canvas guidance and rendered OG/Twitter delivery QA |
| AI Agent Readiness Audit | Strong | Add cross-surface claim parity and separate required standards from optional discovery hints |
| Optimize Above the Fold | Full | No new mechanic |
| SEO & AEO Strategy / APTK | Strong | Add a fixed answer-engine panel and a focused 90-day GSC page-refresh loop |
| Publish Readiness | Full for routine releases | Add provider-neutral post-release live-byte proof; reject Ploy hosting and cutover specifics |

## Adopted deltas

1. **Durable brand modes.** Consumer and Registry/Collect are distinct. Each brief records the current repository-defined mode and token source rather than freezing a vendor's styling advice.
2. **Focused GSC refresh.** For an owner URL with sufficient verified 90-day data, identify high-impression terms that the page does not answer clearly, record exact before-to-after placement, and stop if data is thin or intent belongs elsewhere.
3. **Reproducible answer-engine panel.** Use a fixed 5–10-query panel with engine/model, locale, date, answer/citation state, cited URL, and evidence capture. One run remains directional.
4. **Comparison integrity.** State the real decision job, the alternative's strongest fit, Zodiacs.org's strongest fit, and dated sources for every compared dimension.
5. **Reproducible social assets.** When programmatic rendering is appropriate, use a fixed canvas driven by real brand tokens and prop-based variants; keep preview routes unlinked and `noindex`.
6. **Social-card delivery gate.** Verify public absolute URLs, MIME type, 1200×630 dimensions, file size, crop-safe thumbnail legibility, alt text, and an actual rendered preview.
7. **Cross-artifact AI consistency.** Rendered copy, JSON-LD, metadata, `llms.txt` variants, sitemap, and canonical privacy/methodology claims must agree; cadence, privacy, accuracy, timezone, and entity contradictions block release.
8. **Source is not live proof.** After a separately approved release, record the deployment marker and verify live canonical, robots, sitemap, redirects, and representative bytes before calling the change complete.

## Explicit exclusions

- Reject Company Swarm, identified-visitor email, company identification, scraped audiences, identity-based notifications, and consumer ABM pages.
- Reject Ploy hosting, DNS, fallback-origin, domain-cutover, or deployment mechanics while Zodiacs.org remains on its approved hosting path.
- Defer paid-campaign ROI reporting until real spend, stable campaign naming, and privacy-approved aggregate outcomes exist.
- Defer aggregate analytics notifications until delivery and the private event contract are independently verified.
- Do not replace baseline-derived experiment design with a universal sample-size heuristic.
- Do not create new routes when the canonical-owner and unique-intent tests favor improving an existing page.

## Evidence and limitations

| Source | Contribution | Limitation |
| --- | --- | --- |
| Ploy cancellation-safe delta audit | Read all workspace Ploybooks and prior outputs; classified covered, adopt, defer, and reject | Compared partly against Ploy workspace documents that are not the canonical repository Growth OS |
| Independent repository review | Mapped the eight named Ploybooks to local playbooks and templates | Did not inspect private Ploy implementation internals beyond available descriptions and outputs |
| Local Growth OS diff | Proves the selected mechanics have a concrete repository destination | Changes remain a review branch until a human merges them |

## Boundaries

- No integration, analytics connection, outreach, account, campaign, site edit, hosting change, publication, deployment, or external message was created by this audit.
- Ploy outputs are seed evidence. The repository review determined what entered the durable Growth OS.
- Canonical Drive state was not bypassed; only the sanctioned state writer may promote approved definitions.
