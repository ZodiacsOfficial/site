# Conditional Distribution Pack

## Purpose

Prepare measured social, community, email, or paid-distribution assets for a
page that has already shipped and proved useful. Distribution is optional; it
does not rescue an undifferentiated page.

## Activation conditions

Run this playbook only when all are true:

- the destination is live, passes Release & Trust Gate, and works on mobile;
- a specific audience and useful promise are defined;
- the primary conversion event and baseline are reliable;
- a human owns the channel, budget, replies, and stop decision;
- tracking uses aggregate-safe parameters and contains no personal data;
- the page is not thin, speculative, or waiting on a promised feature.

If paid spend is proposed, record the budget ceiling and approval before any
campaign is created. If these conditions are not met, return “not ready” with
the missing condition.

## Inputs

- Released URL, content brief, release check, and approved positioning.
- Audience/channel fit and current channel constraints.
- Approved visual assets and usage rights.
- Aggregate measurement plan, attribution window, and optional budget ceiling.

## Procedure

1. Select the minimum viable channel set. Do not publish everywhere by default.
2. Write one message matrix: audience job, truthful promise, proof, destination,
   and next step.
3. Adapt copy and format to each channel without changing the claim.
4. Create or reuse approved imagery through Page & Creative Studio.
5. Define aggregate-safe URL parameters and a channel-level reporting schema.
6. Review brand, privacy, platform policy, accessibility, and landing-page
   continuity.
7. Present a send/post/launch packet to the human owner.
8. A human performs the external action.
9. Growth Signal Desk reads the aggregate outcome after the planned window.

## Distribution record schema

```yaml
destination_url: "released canonical URL"
audience_job: "specific non-sensitive job"
channels:
  - channel: "channel name"
    owner: "human"
    format: "post | email | ad | community"
    planned_at: "YYYY-MM-DD or null"
    status: "draft | approved | sent | canceled"
message_claim: "truthful promise"
proof: "tool, computed data, or useful visual"
primary_metric: "aggregate measure"
attribution_window: "explicit window"
budget_ceiling: "amount/currency or null"
stop_rule: "preapproved condition"
assets: []
```

## Outputs

- Channel-ready copy and asset manifest.
- Human approval checklist, schedule, and optional budget ceiling.
- Aggregate tracking plan and readout date.
- Post-window learning in the weekly review.

## Guardrails

- No autonomous posting, email sending, list upload, or ad spend.
- No scraped audiences, visitor identities, company identification, lookalikes
  built from sensitive data, or birth/chart targeting.
- No urgency, guaranteed outcomes, or claim that astrology is scientific fact.
- No token/market messaging on consumer channels or destinations.
- Stop distribution when the destination breaks or a guardrail degrades.
