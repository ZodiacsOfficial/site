# Activating `PUBLIC_SAVED_RECORDS_ENABLED`

The owner authorized activation on 2026-09-16. The code is merged
(`52ae6eeb2bfc0e5d2697e7a50205025b3f5d65b9`) and deployed to production
(`dpl_CZsZBKawNkeiKMuF1NwJSWwsdsAS`), and the acceptance and rollback gates that
activation was conditioned on all pass. The switch itself is a Vercel project
setting, and **this environment cannot write it**, so the feature is live in the
codebase and off on the site.

## What activation is

`PUBLIC_SAVED_RECORDS_ENABLED` is read at build time. Astro pages read
`process.env`, islands read `import.meta.env`, and both halves come from the
same build, compared as strict `=== '1'`. There is no runtime toggle: the site
is static, so activation means a new production build with the variable set.

`vercel.json` carries no `env` or `buildCommand` block, and no `.env` file is
committed. Every production flag on this project is set in the Vercel project's
environment variables. That is deliberate — it is what makes the flag rollback a
dashboard change rather than a code change.

## The steps

1. In the Vercel project `zodiacs-org` (`prj_nRTO3q3aNYLfaM3dotAowOc028fO`,
   team `team_Ue0ac8HT1b3TAzaDDZBTFhQt`), add `PUBLIC_SAVED_RECORDS_ENABLED=1`
   to the Production environment.
2. Redeploy production from the current `main` (the project builds production
   only; preview deployments are Ignored).
3. Verify on the live site, not on the deployment record:
   - `/birth-chart/` with a full result carries `[data-keep-calculation-record]`.
   - `/profile/` carries `[data-saved-records]`, and its state settles to
     something other than `loading`.
   - Keeping a synthetic calculation, downloading it from Profile, and removing
     it all work, and the removed record stays removed across a reload.
   - The same on one localized profile page.
4. Record the resulting deployment id beside the pre-activation one below.

The deployment used as the flag-off verification snapshot, taken at release, is
`dpl_CZsZBKawNkeiKMuF1NwJSWwsdsAS` (main `52ae6eeb`). Production has advanced
past it since — as of 2026-09-18 the current production deployment is
`dpl_EzDeW584ExyJGwmo6fvhiPQaqLjK` — which changes nothing below, because
`52ae6eeb` is a floor rather than a target. At the time it was verified live: `/profile/`
in en, es and ru and `/birth-chart/` all return 200 and carry no
`data-saved-records`, no `data-keep-calculation-record` and no records heading,
and the deployed `/_astro/SavedRecordsPanel.--giIpmA.js` is byte-identical
(SHA-256 `64f41d8c324ce4510d18db98f62a21da0dba4ff7495b4ce366d3f5d3baeec71f`) to
the local build that the browser drives ran against.

## Rolling back

Remove the variable (or set it to anything other than `1`) and redeploy. What a
visitor gets afterwards, and why the flag cannot gate cleanup, is in
[ROLLBACK](ROLLBACK.md).

**Do not reach for the pre-activation deployment once the flag has been on.**
`dpl_Fj7nBapUmw4vshEy8HycqKRXNQRy` (main `7fd42661`) predates #490, so it has no
retained-data path at all: records already on a device would become unreachable,
and destructive account actions there report success without removing them. The
correct target is `dpl_CZsZBKawNkeiKMuF1NwJSWwsdsAS` (main `52ae6eeb`, flag
unset) or any later build — `52ae6eeb` is the version floor, and
[ROLLBACK §3](ROLLBACK.md) gives the incident procedure. Before the flag has ever
been `1` in production no records can exist, and the older deployment is an
ordinary rollback target.

## The blocker, exactly

The Vercel surface available to this session has **no environment-variable
tool**. All 37 tools were enumerated and none creates or updates one. The reads
that are useful here are `get_project`, `list_deployments`, `list_projects`,
`get_deployment_build_logs`, `get_runtime_logs` and
`get_project_deployment_protection`. The surface is not read-only overall —
`pause_project`, `unpause_project` and `update_project_deployment_protection`
do write project configuration — it simply has no way to set a variable. The
Vercel CLI is not installed
here, `~/.vercel` does not exist, and there is no `VERCEL_TOKEN`,
`VERCEL_ORG_ID` or `VERCEL_PROJECT_ID` in the environment.

Two paths would have worked around it and both were rejected on purpose:

- Baking `PUBLIC_SAVED_RECORDS_ENABLED=1` into `vercel.json` or the build script
  would activate the feature, but it would also make the flag a code change,
  break the rollback procedure written down here, and turn the flag-off CI
  build — which holds every site integrity gate — into a flag-on one. That is a
  redesign of the release mechanism, not an activation.
- Deploying files directly from this environment would publish an artifact that
  did not come from `main` through the project's own pipeline.

**Smallest missing action:** someone with write access to the Vercel project
adds `PUBLIC_SAVED_RECORDS_ENABLED=1` to Production and redeploys — or provides
this environment with a Vercel token scoped to that project. Nothing here
bypasses the platform's own authentication.

## A note on the Lighthouse gate, found during this release

Getting this change merged took four CI attempts, and main's own post-merge run
then failed the same gate. In every case the failing routes were arbitrary and
the numbers contradicted each other on identical bytes:

| Run | Route | TBT |
| --- | --- | --- |
| PR attempt 1 | `/people/marie-curie/` | 288 ms |
| PR attempt 3 | `/people/marie-curie/` | 0 ms |
| PR attempt 1 | `/today/` | 186 ms |
| PR attempt 3 | `/today/` | 271 ms |
| main post-merge | `/people/marie-curie/` | 458 ms |
| main post-merge | `/today/` | 4 ms |
| main post-merge | `/birth-chart/` | 0 ms |

`/people/marie-curie/` mounts no islands and loads no `/_astro/` JavaScript at
all, so its main thread has nothing to block on. In main's post-merge run, 27 of
30 routes reported exactly 0 ms and three reported 203–458 ms. Measured locally
on the same build and the same harness, `/today/` is 1 ms, `/` is 9 ms and
`/aries/` is 0 ms.

`tests/visual/lighthouse.mjs:147-153` takes the **worst** of three runs per
route, deliberately, "rather than allowing a median to hide one failed run".
Across ~30 routes that is ~90 samples per job, so one CPU-contended sample fails
the whole workflow — and on a shared runner that happens often enough to block
merges on unrelated changes.

This is a pre-existing property of the gate, not of this release, and it was
**not** touched to get this change merged: no route was calibrated, no threshold
moved, nothing skipped. Worth a separate, deliberate change — for example
re-measuring only the routes that fail, rather than relaxing the budget, which
would keep the strictness and remove the false failures. That is an owner
decision about a gate that guards every merge, so it is recorded here rather
than made.
