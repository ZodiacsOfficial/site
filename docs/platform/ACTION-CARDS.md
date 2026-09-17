# Two blocked operations, and exactly what unblocks each

Both were authorized by the owner. Neither can be done from this environment,
for reasons that are a missing capability rather than a missing decision. Each
card is self-contained: what to do, where, what to check afterwards, and how to
undo it.

Nothing here asks for a secret to be pasted into a chat, written into this
repository, or handed to an agent. Both cards are actions a person takes in a
console they are already signed into.

Recorded 2026-09-17. The access facts were established once, in this session,
and are not re-polled.

---

## Card 1 — Turn on saved calculation records

**What.** Set one environment variable on the Vercel project and redeploy.

| | |
| --- | --- |
| variable | `PUBLIC_SAVED_RECORDS_ENABLED` |
| value | `1` |
| environments | Production (and Preview, if previews should show it) |
| where | Vercel → the `zodiacs` project → Settings → Environment Variables |
| then | Redeploy the current production deployment so the build picks it up |

**Why it cannot be done here.** The Vercel tools available to this session are
read-only for project configuration. All 37 were enumerated: none writes an
environment variable. There is no Vercel CLI and no API credential in the
environment. This is an absent capability, not a denied request.

**Why it was not baked into the repository instead.** That was considered and
rejected. The flag is what makes the rollback documented in
[`ROLLBACK.md`](evidence/l3-saved-records/ROLLBACK.md) possible; hard-coding it
would remove the off switch, and it would also turn the flag-off CI build —
which carries every site integrity gate — into a flag-on one.

**Check afterwards.** The code is merged and deployed as of `52ae6eeb`; only the
flag is missing. After the redeploy:

1. `/profile/` renders the saved-records panel; before the flag it returns 200
   with no records surface at all.
2. `/birth-chart/` offers to save a calculation.
3. The verification and the off → on → off → on rollback drill are written out in
   [`ACTIVATION.md`](evidence/l3-saved-records/ACTIVATION.md). Run that, not an
   ad-hoc click-through.

**To undo.** Unset the variable and redeploy. Safe on any build at or after
`52ae6eeb`. **Promoting a deployment built before `52ae6eeb` is not a
rollback** — that code has no discovery, export, recovery or deletion, so
records already on a device become unreachable rather than removed.

**Expect one nuisance.** The Lighthouse gate takes the worst of three runs
across ~90 samples and fails arbitrary routes on a contended runner; it cost
#490 four attempts. Re-run it rather than changing a threshold.

---

## Card 2 — Publish the engine to npm

**What.** One authenticated `npm publish` of the prepared
`@zodiacs/engine@0.1.1-rc.6` artifact, by a maintainer with npm 2FA.

**Why it cannot be done here, and why no workflow fixes that.**

- **No npm authentication in this environment.** `npm whoami` fails with
  `ENEEDAUTH`. There is no `~/.npmrc`, and no `NPM_TOKEN` or `NODE_AUTH_TOKEN`
  in the environment.
- **A CI workflow cannot substitute for it on a first publication.** npm's
  trusted publishing (OIDC) is configured *per package*, under that package's
  settings page on npmjs.com — which means the package has to exist first.
  [`npm/cli#8544`](https://github.com/npm/cli/issues/8544) is the open request to
  allow an initial version over OIDC; it states the limitation directly: "The
  main problem is that the UI on npmjs.com requires a package to exist before
  you can edit its settings and enable OIDC publishing." PyPI permits
  pre-registration; npm does not. So the first release must be published with a
  credential, by hand or with a token, and trusted publishing can only take over
  from the second.

  **This corrects an earlier record.** `REMAINING.md` previously called an OIDC
  workflow the preferred fix. That is the right destination and the wrong first
  step, and the correction is the reason this card exists.

- **The scope is not the problem.** `@zodiacs/sdk@1.0.1` is published, so this is
  a first publication into an established scope, not a new-scope bootstrap.
- **`npm whoami` alone would not have settled this.** It answers whether *this
  shell* is authenticated. Whether CI could publish is a separate question about
  the registry's bootstrap rules, which is what the paragraph above answers.

**What is no longer a blocker.** An earlier record listed a second one: no write
access to `ZodiacsOfficial/sdk`. That access is available as of this session and
was verified here. The record is corrected below.

**Where the artifact is, exactly.**

| | |
| --- | --- |
| package | `@zodiacs/engine` `0.1.1-rc.6` |
| source | `ZodiacsOfficial/sdk`, `packages/engine`, on branch `codex/platform-release-integration-sdk` at `f747be5098d8f7bca86a4997d3dc0efd40a5828b` |
| **not on `main`** | sdk `main` (`b49e0f14`) contains only `packages/sdk`. The engine has to land on `main` first, or be published from that branch deliberately. |
| prepared tarball | `zodiacs-engine-0.1.1-rc.6.tgz`, sha256 `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e` |
| manifest | already correct: `repository` points at `sdk/packages/engine`, `publishConfig.access` is `public`, `engines.node` is `>=18` |
| publish workflow | none exists. sdk `main` has `app-ci.yml` and `ci.yml`; neither references `npm publish`, a token, or `id-token`. |

**The order that works.**

1. Land `packages/engine` on sdk `main`, or decide to publish from the branch.
2. A maintainer runs `npm publish` from `packages/engine` (2FA/OTP at the
   prompt). Nobody needs to send that OTP anywhere.
3. Configure the trusted publisher on the now-existing package's npmjs.com
   settings page, pointing at a workflow in `ZodiacsOfficial/sdk`.
4. Add the publish workflow with `id-token: write` and no stored token, so every
   release after the first needs no credential at all.

**Check afterwards.** `npm view @zodiacs/engine version` returns `0.1.1-rc.6`,
and the tarball npm serves has the sha256 above. Until then, every surface that
names the engine says `unpublished-candidate`, and
[the engine release record](evidence/engine-release/README.md) stays open.

**To undo.** `npm unpublish` within 72 hours of a first publish; after that,
deprecate rather than unpublish. Choose the version number with that in mind.

---

## What neither card is

Neither is a request for review, and neither is waiting on one. The owner
authorized both operations. What is missing is a console session that this
environment does not have, which is why the local work continued past both of
them rather than stopping.
