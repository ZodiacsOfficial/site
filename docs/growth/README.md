# Zodiacs Growth OS

This directory is the canonical, tool-neutral operating system for growing
zodiacs.org. It converts search, product, and campaign signals into small,
reviewable changes without giving an AI service permission to publish.

The system is designed to survive a change of vendors. ChatGPT, a spreadsheet,
an analytics connector, a CSV export, or a human analyst can run the same
playbooks because the inputs, decisions, and records live here.

## Operating principles

1. **Help the visitor finish a useful task.** Tool completion and local saves
   matter before traffic volume.
2. **Earn every indexed page.** A new page needs a working tool, computed data,
   or a genuinely useful visual—not a longer word count.
3. **Keep private data private.** Use aggregate signals only. Never ingest or
   retain visitor identities, birth dates, birth times, birth locations, saved
   charts, email addresses, IP addresses, or user-level event trails.
4. **Keep humans in the release path.** AI may research, draft, analyze, and
   prepare a branch or pull request. It may not publish, merge, deploy, send a
   campaign, or change production settings.
5. **Work at a controlled pace.** Ship no more than 10 net-new indexable pages
   in any rolling seven-day period. Fixes to existing pages do not consume the
   cap, but must still pass review.
6. **Remove what does not earn its place.** Review the content portfolio every
   quarter and keep, improve, consolidate, redirect, noindex, or remove weak
   pages based on evidence.
7. **Protect the two wings.** Consumer astrology surfaces contain no token,
   market, or crypto language. Collect material stays inside `/collect/` and
   its established related surfaces.

## The operating loop

```text
context -> signals -> opportunity -> brief or experiment -> pull request
        -> release gate -> human merge/deploy -> measurement -> quarterly prune
```

Start with [context.md](context.md), then choose the smallest playbook that can
answer the question. Save material decisions in a durable record using the
templates in [`templates/`](templates/).

## Playbook registry

| Playbook | Use it when | Primary durable record |
| --- | --- | --- |
| [Search Portfolio Operator](playbooks/search-portfolio-operator.md) | Search demand, query gaps, clusters, cannibalization, or pruning need a decision | Opportunity + content brief |
| [Growth Signal Desk](playbooks/growth-signal-desk.md) | A weekly view of acquisition and product behavior is needed | Weekly review |
| [Page & Creative Studio](playbooks/page-creative-studio.md) | An approved opportunity needs page copy, metadata, or launch creative | Content brief + PR |
| [Release & Trust Gate](playbooks/release-trust-gate.md) | A growth change is ready for technical, editorial, privacy, SEO, and AEO review | Release check |
| [Journey & Experiment Lab](playbooks/journey-experiment-lab.md) | A conversion-flow hypothesis can be tested safely | Experiment record |
| [Conditional Distribution Pack](playbooks/conditional-distribution-pack.md) | A shipped, useful asset deserves measured distribution | Distribution plan recorded in the brief or weekly review |

## Capability migration

The table maps useful jobs formerly explored in Ploy to original Growth OS
workflows. It maps outcomes, not vendor prompts or proprietary wording.

| Prior capability | Growth OS home | Decision |
| --- | --- | --- |
| SEO/AEO strategy, keyword opportunities, content clusters | Search Portfolio Operator | Adopt and consolidate |
| Search Console query optimization | Search Portfolio Operator | Adopt with connector-independent aggregate intake |
| Competitor and comparison research | Search Portfolio Operator | Adopt as evidence, never as copy source |
| Content-page briefs and first drafts | Page & Creative Studio | Adopt after opportunity approval |
| Above-the-fold and conversion review | Journey & Experiment Lab | Adopt as a hypothesis, not a one-click rewrite |
| Technical SEO, publish readiness, and machine-readable surface checks | Release & Trust Gate | Adopt and consolidate |
| OG and social asset planning | Page & Creative Studio | Adopt for approved launches |
| Experiment design and readout | Journey & Experiment Lab | Adopt |
| Analytics alerts and campaign ROI summaries | Growth Signal Desk | Adopt only when aggregate data and a named owner exist |
| Social/ad distribution | Conditional Distribution Pack | Conditional: use only for a shipped page with a goal, budget, and measurement plan |
| Homepage creation or broad redesign | Product roadmap + Page & Creative Studio | Not a recurring growth job; require explicit product/design approval |
| Personalized ABM pages and company-level outreach | None | Skip: poor fit for a consumer astrology product |
| Identifying or emailing website visitors | None | Skip: conflicts with the privacy posture; no visitor identities |
| Automatic publishing or autonomous campaign sending | None | Prohibited |

## Shared record model

Every recommendation must be reconstructable without chat history. Use a
Markdown file, issue, or pull-request description that contains these common
fields:

```yaml
record_id: "GROWTH-YYYY-MM-DD-short-name"
record_type: "opportunity | weekly-review | content-brief | experiment | release-check"
status: "proposed | approved | in-progress | released | rejected | archived"
owner: "human name or role"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
decision_due: "YYYY-MM-DD or null"
source_window: "explicit date range"
source_locations: []
related_urls: []
related_records: []
evidence_quality: "high | medium | low"
privacy_class: "aggregate-only"
decision: "one sentence"
next_action: "one concrete action"
```

Add the record-specific fields defined by its template. Prefer repository
records under `docs/growth/records/YYYY/`, if that directory is introduced, or
link to a stable issue/PR. Do not treat a chat transcript as the only record.

Every opportunity record also requires this lifecycle block:

```yaml
evidence_window: "YYYY-MM-DD..YYYY-MM-DD"
url: "canonical URL"
query_cluster: "owned query/intent cluster"
baseline: "reproducible metric value and definition"
hypothesis: "change, expected behavior, and reason"
expected_impact: "direction and materiality, with unit where possible"
confidence: "high | medium | low"
effort: "small | medium | large"
risk: "specific failure modes and severity"
deployment_identifier: null
measurement_date: "YYYY-MM-DD"
result: "pending until measured; then observed outcome and decision"
```

`deployment_identifier` remains `null` until a human-approved release exists;
`result` remains `pending` until the predeclared measurement date.

The connector-neutral durable datasets and their human owners are defined in
the [durable state catalog](state/README.md).

## Decision rights

| Action | AI/automation | Human owner |
| --- | --- | --- |
| Read aggregate exports and public pages | May perform | Sets scope |
| Draft analysis, briefs, copy, code, and assets | May perform | Reviews |
| Open a branch or pull request | May perform when explicitly authorized | Reviews and approves |
| Merge, deploy, publish, index, or change production configuration | Must not perform autonomously | Required |
| Send email, post social content, or spend ad budget | Must not perform autonomously | Required at action time |
| Access identity-level or birth data | Prohibited | Not an approval path for this OS |

## Cadence

- **Weekly:** run Growth Signal Desk, triage opportunities, and check the
  seven-day page-velocity ledger.
- **Per change:** use the relevant brief/experiment record, work through a pull
  request, and complete Release & Trust Gate.
- **Monthly:** review cluster movement, experiment learnings, data quality, and
  distribution efficiency.
- **Quarterly:** inventory indexable pages and make an explicit keep, improve,
  consolidate, redirect, noindex, or remove decision for weak content.

## ChatGPT adapter

Use [CHATGPT-PROJECT-INSTRUCTIONS.md](CHATGPT-PROJECT-INSTRUCTIONS.md) as the
small instruction layer in a ChatGPT project. The adapter points back to these
documents; it must not become a fork of them.
