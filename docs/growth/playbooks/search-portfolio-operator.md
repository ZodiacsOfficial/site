# Search Portfolio Operator

## Purpose

Turn aggregate search demand and the existing content inventory into a small,
prioritized set of improvements. This playbook covers query opportunities,
cluster planning, cannibalization, internal links, public competitor evidence,
and quarterly pruning.

It does not authorize drafting or publishing a page. Its output is an approved
opportunity record and, when appropriate, a content brief.

## Use when

- Search Console shows impressions without proportionate clicks.
- A useful tool needs a supporting learning cluster.
- Two or more pages appear to compete for the same intent.
- A page has decayed or never earned meaningful engagement.
- A quarterly portfolio decision is due.

Do not use search volume alone to justify a page. Do not create compatibility
pair pages before the synastry experience exists.

## Inputs

Required:

- exact analysis window and comparison window, if any;
- current URL inventory with indexability and canonical URL;
- aggregate query/page metrics;
- current product capabilities and roadmap constraints from
  [`../context.md`](../context.md);
- public result pages or competitor URLs when comparison is relevant.

Optional:

- aggregate tool-completion and local-save rates by landing page;
- crawl findings, internal-link graph, citation observations, and release log;
- manual notes from support or research, with no identity-level data.

## Connector-independent GSC intake

Accept the data through any method the operator controls: a native connector,
API response, scheduled sheet, CSV export, or pasted aggregate table. The
analysis must not depend on a named vendor.

Normalize to this minimum schema:

```yaml
property: "verified site property"
window_start: "YYYY-MM-DD"
window_end: "YYYY-MM-DD"
comparison_start: "YYYY-MM-DD or null"
comparison_end: "YYYY-MM-DD or null"
rows:
  - query: "aggregate query string"
    page: "canonical URL"
    clicks: 0
    impressions: 0
    ctr: 0.0
    average_position: 0.0
    device: "optional aggregate dimension"
    country: "optional coarse aggregate dimension"
```

Validate before analysis:

1. Confirm property, timezone, filters, search type, and exact dates.
2. Compare equal-length windows and note seasonality or partial days.
3. Canonicalize URLs and keep query-page relationships intact.
4. Check that totals reconcile with the export summary within expected API or
   privacy-threshold differences.
5. Mark omitted or unavailable rows as unknown; never infer zero.
6. Remove visitor, account, or birth-related fields before intake.

## Procedure

1. **Frame the job.** Name the cluster, visitor intent, current page, and
   decision to make.
2. **Establish a baseline.** Record current clicks, impressions, CTR, position,
   indexability, internal links, tool completion, and saves where available.
3. **Group by intent.** Combine close query variants. Separate informational,
   calculator, forecast, and collector intent rather than mixing them.
4. **Match intent to the portfolio.** Prefer improving an existing canonical
   page. Propose a new page only when the intent is distinct and the page can
   earn the index with a tool, computed fact, or unique visual.
5. **Inspect the public result set.** Record formats, entities, unanswered
   questions, freshness, and trust signals. Do not copy competitor phrasing or
   structure mechanically.
6. **Score the opportunity.** Use the rubric below and show the evidence.
7. **Check constraints.** Verify roadmap order, the 10-page velocity cap,
   content overlap, privacy, and wing boundaries.
8. **Write the decision.** Complete
   [`../templates/opportunity.md`](../templates/opportunity.md). Create a
   [`../templates/content-brief.md`](../templates/content-brief.md) only after
   the opportunity is approved.

## Prioritization rubric

Score each dimension 0–3 and keep the notes. The total is a comparison aid, not
an automatic decision.

| Dimension | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| User value | Cosmetic | Minor clarity | Completes a useful job | Unlocks a core tool journey |
| Evidence | Assumption | One weak signal | Two supporting signals | Strong first-party evidence |
| Strategic fit | Off-roadmap | Adjacent | In an active cluster | Directly advances the current priority |
| Differentiation | Commodity text | Better explanation | Unique visual or data | Working tool/computed experience |
| Effort | Large/unknown | Multi-week | Several days | Small reversible change |
| Measurement | Unclear | Proxy only | Defined outcome | Defined outcome and reliable baseline |

Record risks separately; do not hide them by subtracting points.

## Outputs

- Ranked opportunity records with approve/reject/defer decisions.
- Existing-page recommendation, new-page brief, consolidation map, or prune
  action.
- Query-to-page intent map and proposed internal links.
- Baseline and a dated measurement window.
- Explicit page-velocity impact.

## Quarterly pruning

Every quarter, review all indexable consumer pages using at least two full
comparison windows where possible. Give each page one outcome:

- **Keep:** useful and healthy.
- **Improve:** sound intent, weak execution or conversion.
- **Consolidate:** overlapping intent is splitting value.
- **Redirect:** a better canonical destination exists.
- **Noindex:** useful to users but not suited to search.
- **Remove:** no durable user value and no replacement need.

Traffic alone is not a deletion rule. Protect pages that complete a product
journey, support methodology/trust, or serve a narrow but real task. Every
redirect, noindex, or removal requires human review and a release check.

## Guardrails

- Aggregate data only; no visitor identities or birth data.
- No thin doorway pages, keyword swapping, or fabricated expertise.
- No more than 10 net-new indexable pages in a rolling seven-day period.
- No autonomous edits, publishing, redirects, or indexation changes.
- Deliver implementation through a human-reviewed branch and pull request.
