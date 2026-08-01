# Growth Signal Desk

## Purpose

Produce a calm weekly decision view from aggregate acquisition, product, and
release signals. The desk identifies what changed, whether the change is real,
and which single follow-up deserves attention.

## Inputs

- Search Console aggregate query/page data with exact windows.
- Privacy-light page and event aggregates for tool starts, completions, local
  saves, second-chart creation, profile visits, and Collect wing entries.
- Release log, active experiments, incidents, page-velocity ledger, and known
  tracking changes.
- Optional campaign spend and aggregate outcomes when a campaign is active.

All sources must include owner, location, freshness, timezone, filters, and
known gaps. Do not ingest raw sessions, user IDs, emails, IPs, or birth data.

## Procedure

1. Validate that current and comparison windows are complete and comparable.
2. Check instrumentation changes, outages, bot spikes, and releases before
   interpreting movement.
3. Read the journey in order: landing -> tool start -> tool completion -> local
   save -> return/profile behavior. Do not optimize an upstream click while a
   downstream step is broken.
4. Segment only by safe aggregate dimensions with adequate cohort size.
5. Classify each notable movement as likely signal, instrumentation issue,
   expected seasonality, release effect, or unknown.
6. Select at most three opportunities and one primary action for the week.
7. Write [`../templates/weekly-review.md`](../templates/weekly-review.md) and
   link any new opportunity or experiment records.

## Core measures

| Measure | Definition | Why it matters |
| --- | --- | --- |
| Tool start rate | Tool starts / eligible landing sessions | Promise-to-action clarity |
| Tool completion rate | Completed results / tool starts | Early north-star measure |
| Local save rate | Local saves / completed results | Result usefulness |
| Second-chart rate | Visitors creating a second chart / eligible returning visitors | Depth and relationship intent |
| Profile-visit rate | Profile visits / visitors with a local save | Return utility |
| Organic CTR | Search clicks / search impressions | Query-page fit |
| Collect wing entry | Entries to `/collect/` / consumer sessions | Boundary health, not a maximization target |

Use the analytics system's documented denominators. If the denominator cannot
be reproduced, label the measure provisional.

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
