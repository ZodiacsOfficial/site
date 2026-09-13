# R3 bounded release integration

Status: in progress, 2026-09-12. Main-target integration drafts are being verified;
no release, npm publication, production change or external adoption is claimed.

## Source and scope

Site main `1d7d0d0e3baf06f813e9f164aa8ec5394bbd6af7`; accepted #469
`35301d24907b6eb7117a1f4b0ae690ca42c57de6`; evidence-only closeout `60f9c779b69935e93dd14b7f8aac90dbbd4a6d35`.
SDK main `b49e0f14f9f17bc84db39486f2c4bb075e0ae3ff`; selected #11
`ac27761e6dea138842e6ef5c2c69129ead7af636`. All selected heads are refreshed
from GitHub; detailed identity and preservation records accompany this file.

Main's paired September 12 edition already matches the maintenance edition.
The integration preserves main's market history and every published immutable
research item rather than replacing published same-ID bytes with R1 variants.
Only the daily manifest's current source/dependency provenance is regenerated.
Main's newer dependency versions and provider/Registry/Today fixes are retained.
The exact-base, exact-path one-time scope allowance is updated; its guard is unchanged.

The optional read-only ownership SDK remains 1.0.1. Engine rc.6 archive SHA-256
is `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e`;
source `fb57af7a2cd7c30983cc8fb655183d5a11f9cf30`, immutable carrier
`51129a197cd3f2a2a8c966fb797ea4da1e147b3d`. Package publication remains held.
Astrofolio #416's actual 36 paths were inspected and remain separate. Optional
saved-record #426 and later L1–L6 features are excluded.

## Verification boundaries

Reuse source-identical numerical, receipt, ownership and historical-time evidence.
Compiler, current dependency tree, Today/Registry integration invalidate final
build, typecheck, suite, rendered captures, hosted CI and preview acceptance.
Original failures and finite limitations remain recorded, with no budget or
security/freshness/provenance relaxation. Local disk pressure was resolved only
by removing owned disposable old build output; source/evidence were preserved.

## Release approval checklist

- Accept exact final site/SDK source identities and their required hosted results.
- Obtain explicit owner authorization for each main merge/release action and
  resolve SDK #5's do-not-merge/do-not-publish hold before any affected action.
- Obtain required practitioner/numerical, legal/licensing and language signoffs
  for the chosen public scope; finite automated checks are not those signoffs.
- Approve a production release and the tested whole-tree rollback target.
- After authorization, independently verify public package installation and
  production behavior. Candidate download and preview do not establish either.

Final evidence and concrete blockers will be appended after verification.

## Local integration acceptance

Build and typecheck pass (1,047 files; zero errors/warnings, 11 hints). Both
unchanged audit gates pass: zero production findings, no high/critical full-tree
findings; the two existing moderate development findings remain within policy.
Eighteen fresh exact-width captures pass, with render receipt
`0228449107945ba6742a3a35aed33a3edd088bfca652091169580cda05b90df8`.
Root inspected Today mobile and Love desktop captures. The Today browser drive
passes SSR, saved-chart personalization, deferred dependency failures, compact
fallbacks, storage/privacy and exact-zero CLS assertions.

The first full suite passed 5,092 tests but three tests exceeded their unchanged
five-second timeout while the browser drive ran concurrently. Failures are kept
in the original log; only those three affected files are rerun after the browser
finishes, serially and without changing any timeout or assertion. Hosted CI still
must pass the full configured suite. A diff whitespace check reports one inherited
extra blank line in `src/lib/today/contacts.ts`; that accepted source is retained.

The [independent preservation review](independent-review/FINAL-REVIEW.md) accepts
the six newly composed non-documentation paths. It confirms all 28 main immutable
items and all 33 frozen caption source/tests, exact dependency closure and package
integrity, main's concurrent fixes, and exclusion of all 36 Astrofolio paths.

The three affected files now pass all 18 tests serially, under their unchanged
five-second limits (event horizon 1.02s, evidence invalidation 0.87s, built locale
ordering 2.64s). Every one of the 5,095 distinct tests has passing evidence on this
unchanged tree. The original full-run timeouts remain retained and qualified.
SDK draft #12 at `f747be5098d8f7bca86a4997d3dc0efd40a5828b` passes required
CI 34702178888 and App CI 34702178877; exact preview and auxiliary configuration
status are recorded in the paired SDK closeout.
