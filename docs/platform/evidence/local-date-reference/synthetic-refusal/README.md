# Synthetic conservative-rejection counterexample

The exact copied site resolver selects a noon outside a **nonempty** date in this explicitly synthetic model. This is not an IANA-zone occurrence or an additional real-world search result.

Define one offset transition at `2000-01-01T00:00:00Z`, from UTC+00 to UTC+15. The requested civil date `2000-01-01` exists for nine UTC hours, `[2000-01-01T00:00Z, 2000-01-01T09:00Z)`, representing local `15:00` through the date's end. The current earlier/shift-forward resolver instead maps requested `12:00` to `2000-01-01T12:00Z`, which is synthetic local `2000-01-02T03:00`. Its date witness therefore rejects this representative although the date itself exists.

The explicit complete provider defines this single change over the whole timeline; it does not infer completeness from sampling. Both offsets are integral milliseconds strictly inside ±24 hours. The unchanged interval primitive returns `existing` with the exact nine-hour interval. A scoped synthetic Intl adapter lets the unchanged site resolver use this same model; native Intl only formats the shifted Gregorian wall fields. The adapter is restored in finally.

Node 22.23.2 executed `probe.mjs`; `result.json` and `probe.log` retain exact inputs, checks, model, source-bundle hash and driver hash. No product/source edit, dependency installation, API change or network/browser operation occurred. This separately sealed addendum leaves the original seventeen-control delivery unchanged. It supports the existing qualification: a failed representative-date witness can be conservatively rejected but cannot alone prove an empty civil date.
