# Zodiacs Growth Context

Read this before running any Growth OS playbook. Product and implementation
truth remains in [`../STRATEGY.md`](../STRATEGY.md) and the repository. This
file narrows that truth to the decisions a growth operator needs repeatedly.

## Product promise

zodiacs.org is a free astrology platform built around useful tools, clear
guides, and private client-side chart calculation. Saved charts are local-first;
optional account sync is available for people who deliberately choose it. The
token registry is a separate collector's wing, not the consumer proposition.

## Audiences and jobs

| Audience | Immediate job | Useful next step |
| --- | --- | --- |
| Astrology beginner | Understand a sign or the Big Three | Complete a calculator |
| Chart-curious visitor | Calculate a birth, moon, or rising sign | Read the result and save locally |
| Chart-literate visitor | Inspect placements and method | Use a deeper tool or guide |
| Returning visitor | Revisit a saved chart or forecast | Continue a personal journey without re-entry friction |
| Collector | Inspect the registry | Enter `/registry/` deliberately |

## Current growth priorities

The strategy build order is largely shipped: sign authority; birth, moon,
rising, compatibility, phase, return, and transit tools; local saves and
optional sync; dated sky calendars; and transit-grounded daily and monthly
horoscopes. Treat the live repository and production routes as authority over
older phase language. Current operator priorities are:

1. Keep trust, privacy, calculation, freshness, and machine-readable claims
   consistent across every surface.
2. Measure successful product actions only through aggregate, non-identifying
   events; establish honest baselines before proposing optimization.
3. Improve the path from useful tool result to local save, return visit,
   relationship/Today use, and optional sync.
4. Strengthen the most useful existing sign, calculator, calendar, and guide
   clusters; consolidate or prune weak pages instead of simulating coverage.
5. Treat daily and monthly horoscopes as a freshness-gated retention system,
   not a license for thin or undated content.

Never create a page merely because a keyword exists. Never use thin pages to
simulate coverage.

## Conversion model

The intended sequence is:

1. Complete a useful tool.
2. Save a chart locally without signup.
3. Return to the saved profile or create a second chart.
4. Use a relationship experience or the Today brief.
5. Offer account sync only when it solves a real multi-device need.
6. Keep the collector's wing quiet and optional.

Primary early measures are tool completion rate and local saves. Search
rankings are a lagging signal, not the first definition of success.

## Voice and experience boundaries

- Plain, warm, specific, and calm; never woo-woo or salesy.
- Explain astrology terms inline.
- State computed facts with dates, times, and degrees where useful.
- Do not claim certainty, therapeutic benefit, or scientific validation.
- Do not use token, market, financial, or crypto language outside the Collect
  wing.
- Do not manufacture urgency or gate basic results behind signup.
- Treat consumer and Registry/Collect as distinct brand modes. Use the current
  repository-defined consumer tokens on consumer surfaces; do not transplant
  the Registry's dark system into the consumer product. Record the selected
  mode and its source-of-truth tokens in every page or creative brief.

Before drafting copy, re-read the canonical voice rules and labels in
[`../STRATEGY.md`](../STRATEGY.md) and [`../../CLAUDE.md`](../../CLAUDE.md).

## Data and privacy boundary

Growth OS accepts aggregated, non-identifying data such as page/query totals,
event counts, conversion rates, device classes, and coarse markets when a
cohort is large enough to be non-identifying.

Growth OS must never receive or retain:

- names, email addresses, account identifiers, IP addresses, or visitor IDs;
- row-level sessions or click trails;
- birth dates, birth times, birth locations, saved charts, or placements tied
  to a person;
- company-level visitor identification or enrichment.

The public site has separately accepted Plausible's disclosed aggregate
deduplication method as a bounded operational privacy exception: the provider
may briefly process request IP address and User-Agent to derive a salted
site/device/day identifier, while the raw inputs are not stored and the salt is
deleted every 24 hours. That site-level decision does not make the resulting
measurement admissible to Growth OS. Under the current runtime contract, any
proposal that depends on provider-side IP or User-Agent processing must be
`DEFERRED`; no Plausible-derived identifier, event row, or aggregate may be
promoted into Growth Portfolio or Analytics Events until an approved no-IP
path exists or an authorized contract revision explicitly permits it. Public
privacy wording must disclose the transient processing, and a provider-method
change requires a new privacy review.

If an input includes prohibited fields, stop, remove the fields at the source,
and resume only with an aggregate export. Do not paste sensitive rows into a
chat in order to redact them there.

## Source hierarchy

Use the strongest source available and label uncertainty:

1. Repository code, tests, strategy, and released pages.
2. First-party aggregate product analytics and Search Console data.
3. Public search results and public competitor pages.
4. Third-party research with a visible date and method.
5. Assumptions, clearly labeled and scheduled for validation.

Never invent metrics. A missing value is `unknown`, not zero.
