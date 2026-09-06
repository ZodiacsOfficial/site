---
record_id: GROWTH-2026-09-01-vercel-web-analytics-flag
record_type: decision
status: proposed
owner: site owner
created: 2026-09-01
updated: 2026-09-01
decision_due: null
source_window: 2026-09-01..2026-09-01
evidence_window: 2026-09-01..2026-09-01
source_locations:
  - https://zodiacs.org/privacy/
  - https://github.com/ZodiacsOfficial/site/blob/main/docs/ANALYTICS.md
  - https://github.com/ZodiacsOfficial/site/blob/main/src/layouts/Base.astro
  - https://github.com/ZodiacsOfficial/site/blob/main/src/lib/web-analytics.mjs
url: https://zodiacs.org/
query_cluster: aggregate visitor measurement
related_urls:
  - https://zodiacs.org/privacy/
privacy_class: aggregate-only
---

# Vercel Web Analytics behind a build flag

## What changed in the repository

A second, cookieless pageview counter is wired into `src/layouts/Base.astro`
behind `PUBLIC_VERCEL_WEB_ANALYTICS=1` (`src/lib/web-analytics.mjs`). It is off
in every build until the owner turns it on. Plausible remains the directive
analytics: the allowlisted product events in `docs/ANALYTICS.md` go only to
Plausible through `zodiacsAnalytics.track`; Vercel receives pageviews only.

The loader applies the same surface exclusions as Plausible (noindex pages,
private surfaces, the encrypted-sync preview, a private Guide session) and
removes the query string and fragment from every pageview URL in the
`beforeSend` hook before the request leaves the browser. The embeds stay
analytics-free; `scripts/verify-widgets.mjs` now rejects a Vercel insights
loader in the same breath as Plausible.

The English and localized privacy pages describe the counter in one
conditional paragraph that renders only when the flag is on, so the public
explanation and the deployed configuration cannot disagree.

## Why

The weekly growth review (`docs/growth/templates/weekly-review.md`) reports
aggregate visitor counts, and the hosting platform's counter is the cheapest
independent source of those numbers. Under the analytics runbook this is a
provider-method change and needs a recorded review before deployment; this
record is that review, and the flag is the deployment gate.

## Data boundary, in the runbook's terms

- No cookie, no persistent identifier, no cross-site identifier.
- Same-day deduplication uses a hash derived from the request (IP address and
  User-Agent) that the provider discards after the day.
- Page path only; no query string, fragment, referrer-derived visitor data, or
  product event properties.
- Aggregate reporting only. Growth OS never ingests visitor identities, IPs,
  or user-level event trails (Growth OS principle 3).

## What the owner does to turn it on

1. Vercel dashboard → project `zodiacs-org` → Analytics → Enable.
2. Set `PUBLIC_VERCEL_WEB_ANALYTICS=1` in the project's production environment
   variables and redeploy.
3. Bump the "last updated" date on the six privacy pages in the same change,
   since their visible text changes when the flag turns on.
4. Mark this record `accepted` with the date.

Until those steps happen the counter does not run and the privacy pages do
not mention it.
