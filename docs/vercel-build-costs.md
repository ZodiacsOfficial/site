# Vercel build cost controls

The September 20, 2026 outage was a team spend-management pause. The billing
dashboard attributed approximately $198.79 of $200.03 infrastructure usage to
build CPU, with 885h30m on Turbo machines. This project accounted for 940h10m
of the team's 947h30m build CPU. These are CPU hours, not elapsed build hours.
The dashboard does not establish why pausing happened only after a 900% spend
notification; that requires clarification from Vercel.

Deployment history on September 11 contains both preview and production builds
for automated Daily Sky and Registry Market Snapshot commits. Repeated daily
jobs also fetched new same-day market observations, producing new timestamps,
commits and builds. Recent ephemeris research deployments were canceled by the
ignored-build rule or blocked; those records do not establish research as the
main source of the historical bill.

## Controls

- Project settings must retain fixed Basic build machines and disable elastic
  concurrency. Those settings were already active during this audit; they are
  managed in Vercel rather than this file.
- `vercel.json` permits automatic Git deployments only for `main`. `**` matches
  branch names containing slashes. The production-only `ignoreCommand` is a
  second guard; retain the equivalent project-level ignored-build rule to
  cover existing branches that do not yet contain this configuration.
- Daily Sky and its market-repair workflow share a concurrency group. They
  reuse a valid UTC-day observation through `scripts/daily-market-snapshot.mjs`.
  The next day, a missing observation, or inconsistent metadata still fetches
  a new observation. Outlook, research and catalogue generation and validation
  still run so a retry can repair incomplete publication.
- To deliberately replace today's observation, run the original
  `node scripts/build-registry-market-snapshot.mjs`, regenerate its downstream
  artifacts, and follow the normal reviewed publication process.
- Superseded pull-request Site Check runs are canceled. Release verification
  and the 30-day editorial replay remain in `npm run build` via `prebuild`;
  they no longer run twice within the same Build & Check job.

## Billing follow-up

The $20 on-demand budget is separate from the Pro seat price and is not a
guaranteed maximum total invoice. It was left unchanged. Already incurred
charges are not reversed by these fixes. Check the next daily publication's
deployment count and Basic CPU usage before revising a budget or changing
hosting. Do not enable Turbo or elastic builds to address a slow build without
first assessing the cost. Automatic previews can be re-enabled deliberately
for a specific branch when their cost is acceptable.
