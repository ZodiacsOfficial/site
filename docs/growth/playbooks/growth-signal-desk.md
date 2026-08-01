# Growth Signal Desk

## Purpose

Produce a calm weekly decision view from aggregate acquisition, product, and
release signals. The desk identifies what changed, whether the change is real,
and which single follow-up deserves attention.

## Inputs

- Search Console aggregate query/page data with exact windows.
- Privacy-light page-view and action aggregates for chart completion, local
  save, compatibility completion, sharing, and Registry wing entry.
- Release log, active experiments, incidents, page-velocity ledger, and known
  tracking changes.
- Optional campaign spend and aggregate outcomes when a campaign is active.

All sources must include owner, location, freshness, timezone, filters, and
known gaps. Do not ingest raw sessions, user IDs, emails, IPs, or birth data.

## Procedure

1. Validate that current and comparison windows are complete and comparable.
2. Check instrumentation changes, outages, bot spikes, and releases before
   interpreting movement.
3. Read the independent aggregate volume ladder in product order: landing route
   view -> completed action -> local save or share. Use the order only to find
   where the product may need investigation; never infer that the same visitor
   moved between steps.
4. Segment only by safe aggregate dimensions with adequate cohort size.
5. Classify each notable movement as likely signal, instrumentation issue,
   expected seasonality, release effect, or unknown.
6. Select at most three opportunities and one primary action for the week.
7. Write [`../templates/weekly-review.md`](../templates/weekly-review.md) and
   link any new opportunity or experiment records.

## Core measures

| Measure | Definition | Why it matters |
| --- | --- | --- |
| Birth-chart action/view ratio | `chart_computed` actions / `/birth-chart/` route views in the same UTC window | Directional tool usefulness |
| Birth-chart save/view ratio | `chart_saved` actions / `/birth-chart/` route views in the same UTC window | Directional result usefulness |
| Compatibility action/view ratio | `compat_computed` actions / `/compatibility/` route views in the same UTC window | Directional comparison usefulness |
| Share action/view ratio | `share_card_downloaded` actions / eligible tool route views in the same UTC window | Directional result utility |
| Organic CTR | Search clicks / search impressions | Query-page fit |
| Registry wing entry/view ratio | `wing_entry` actions / consumer route views in the same UTC window | Boundary health, not a maximization target |

Every numerator and denominator above is an independently aggregated count,
never a linked visitor or session trail. Treat each ratio as directional only:
do not label it a user funnel, unique-user or session conversion, retention,
attribution, causal progression, or a step-to-step journey. Growth OS must not
receive Plausible's daily deduplication identifier. If a documented denominator
is absent, zero, or cannot be reproduced for the exact window, report the ratio
as `N/A`, never zero or an inferred value.

## Alert rules

An alert is a request to investigate, not permission to act. Every alert must
contain metric definition, observed value, baseline, window, sample size,
recent releases, and an owner. Prefer materiality bands and sustained changes
over single-day noise.

Send no automated external notification unless a human has approved the
channel, audience, threshold, and message template. The default output is a
repository record or private project note.

## Campaign readout

Only calculate campaign efficiency when spend, attribution window, goal, and
aggregate outcomes are available. Report both the platform-attributed result
and the first-party aggregate outcome. Do not claim causality from last-click
attribution. Pause or change spend only through a named human owner.

## Outputs

- One weekly review with data-quality notes.
- A short list of confirmed changes and unknowns.
- One primary action, with linked opportunity/experiment record.
- Updated page-velocity count and next quarterly-prune date.

## Guardrails

- Never identify, enrich, or contact an individual visitor.
- Never use birth or saved-chart data for segmentation.
- Never invent missing numbers or silently change a metric definition.
- Never let an alert merge code, publish content, or change campaign spend.
