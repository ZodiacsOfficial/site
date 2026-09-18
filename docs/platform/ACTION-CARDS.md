# Two blocked operations, and exactly what unblocks each

Both were authorized by the owner. Neither can be done from this environment,
for reasons that are a missing capability rather than a missing decision. Each
card is self-contained: what to do, where, what to check afterwards, and how to
undo it.

Nothing here asks for a secret to be pasted into a chat, written into this
repository, or handed to an agent. Both cards are actions a person takes in a
console they are already signed into.

Recorded 2026-09-17, re-verified 2026-09-18. Each access fact below now names
the command that establishes it, so the next re-check is one line rather than a
fresh investigation.

---

## Card 1 — Turn on saved calculation records

**What.** Set one environment variable on the Vercel project and redeploy.

| | |
| --- | --- |
| variable | `PUBLIC_SAVED_RECORDS_ENABLED` |
| value | `1` |
| environments | Production (and Preview, if previews should show it) |
| where | Vercel → the `zodiacs-org` project → Settings → Environment Variables |
| then | Redeploy the current production deployment so the build picks it up |

**Why it cannot be done here.** The Vercel surface available to this session
has no environment-variable tool. All 37 tools were enumerated and none creates
or updates one; the three project-configuration writes it does have
(`pause_project`, `unpause_project`, `update_project_deployment_protection`)
cover pausing and deployment protection only. There is no Vercel CLI and no API
credential in the environment. This is an absent capability, not a denied
request — and not, as an earlier wording had it, a read-only surface.

**Why it was not baked into the repository instead.** That was considered and
rejected. The flag is what makes the rollback documented in
[`ROLLBACK.md`](evidence/l3-saved-records/ROLLBACK.md) possible; hard-coding it
would remove the off switch, and it would also turn the flag-off CI build —
which carries every site integrity gate — into a flag-on one.

**Check afterwards.** The code is merged and deployed as of `52ae6eeb`; only the
flag is missing. Production has since advanced past that commit, which does not
matter here — `52ae6eeb` is the version floor, not the target. After the
redeploy:

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

**What.** One authenticated publication of the prepared
`@zodiacs/engine@0.1.1-rc.6` **archive** — the exact audited bytes, not a fresh
pack of a working tree — by a maintainer with npm 2FA, under an explicit `rc`
dist-tag.

**Why it cannot be done here, and why no workflow fixes that.**

- **No npm authentication in this environment.** `npm whoami` fails with
  `ENEEDAUTH`. There is no `~/.npmrc`, and no `NPM_TOKEN` or `NODE_AUTH_TOKEN`
  in the environment. Re-checked 2026-09-18; unchanged.
- **A CI workflow cannot substitute for it on a first publication.** npm's
  trusted publishing (OIDC) is configured *per package*, under that package's
  settings page on npmjs.com — which means the package has to exist first.
  [`npm/cli#8544`](https://github.com/npm/cli/issues/8544) is the open request to
  allow an initial version over OIDC; it states the limitation directly: "The
  main problem is that the UI on npmjs.com requires a package to exist before
  you can edit its settings and enable OIDC publishing." PyPI permits
  pre-registration; npm does not. So the first release must be published with a
  credential, by hand or with a token, and trusted publishing can only take over
  from the second. Issue still open when re-read 2026-09-18.

  **This corrects an earlier record.** `REMAINING.md` previously called an OIDC
  workflow the preferred fix. That is the right destination and the wrong first
  step, and the correction is the reason this card exists.

- **The scope is not the problem.** `@zodiacs/sdk@1.0.1` is published, so this is
  a first publication into an established scope, not a new-scope bootstrap. Its
  dist-tags are `{rc: 1.0.0-rc.1, latest: 1.0.1}` — the `rc` convention below is
  the one already in use.
- **`npm whoami` alone would not have settled this.** It answers whether *this
  shell* is authenticated. Whether CI could publish is a separate question about
  the registry's bootstrap rules, which is what the paragraph above answers.
- **The npm here is too old to rehearse on.** `npm --version` is 10.9.7, which
  has no prerelease-tag guard (see step 6). Rehearsing the command here would
  teach the wrong reflex.

**What is no longer a blocker.** An earlier record listed a second one: no write
access to `ZodiacsOfficial/sdk`. That entry is retired. What was actually
established, and how to re-establish it in one command:

```
curl -sS -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/ZodiacsOfficial/sdk | jq .permissions
# => {"admin":true,"maintain":true,"push":true,"triage":true,"pull":true}
```

That is the **account's** role on the repository, re-confirmed 2026-09-18. It is
not a test of this session's own push path: the one probe that would have tested
that (attaching the repository for push) was refused by this session's
permission layer, not by GitHub, and several GitHub API paths are blocked by the
outbound proxy here. So: the maintainer account can push; whether this
environment could is untested and does not need to be, because the publication
is a maintainer action either way.

**Where the artifact is, exactly.**

| | |
| --- | --- |
| package | `@zodiacs/engine` `0.1.1-rc.6` |
| the bytes to publish | `vendor/zodiacs-engine-0.1.1-rc.6.tgz` in **this** repository, sha256 `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e`. This is the archive the whole site is built and tested against — `package.json` depends on `file:vendor/…`. |
| same bytes, immutably | `https://raw.githubusercontent.com/ZodiacsOfficial/sdk/51129a197cd3f2a2a8c966fb797ea4da1e147b3d/artifacts/zodiacs-engine-0.1.1-rc.6.tgz` |
| source | `ZodiacsOfficial/sdk`, `packages/engine`, at commit `fb57af7a2cd7c30983cc8fb655183d5a11f9cf30` — reachable from branch `codex/platform-time-seconds`, which also carries the artifact commit `51129a19`. |
| **an earlier row here was wrong** | This card previously named branch `codex/platform-release-integration-sdk` at its then-head `f747be50`. That branch's `packages/engine` tree is byte-identical (`e655e5c5…`) so nothing built from it would differ, but `f747be50` is a moving branch head and is not the commit [the candidate record](../../src/data/platform-engine-candidate.json) pins. The pinned commits above are the authoritative ones. |
| **not on `main`** | sdk `main` (`b49e0f14`) contains only `packages/sdk`. The engine has to land on `main` first, or be published from the archive deliberately. |
| manifest | already correct: `repository` points at `sdk/packages/engine`, `publishConfig.access` is `public`, `engines.node` is `>=18` |
| publish workflow | none exists. sdk `main` has `app-ci.yml` and `ci.yml`; neither references `npm publish`, a token, or `id-token`. |

**Publish the archive, not a directory.** This is the single most important
correction to this card. `npm publish <path-to-.tgz>` streams that file from
disk and base64s it into the upload unchanged — pacote's file fetcher is a plain
read stream, and none of `prepack`, `prepublishOnly`, `publish` or `postpublish`
runs, because those are gated on a *directory* spec. `npm publish` from
`packages/engine` instead repacks the working tree, and that package's manifest
declares `"prepack": "npm run build"`, so it would rebuild `dist/` and upload an
archive that is not the one every gate in this repository has been run against.

**The order that works.**

1. Land `packages/engine` on sdk `main`, or decide to publish the archive from
   the pinned commit deliberately. (Publishing the archive does not require a
   checkout at all — step 1 below is the only thing that has to be true.)
2. Publish, per the commands below.
3. Configure the trusted publisher on the now-existing package's npmjs.com
   settings page, pointing at a workflow in `ZodiacsOfficial/sdk`.
4. Add the publish workflow with `id-token: write` and no stored token, so every
   release after the first needs no credential at all.

**The commands.**

```bash
# 0. Use npm >= 11.5.1 (Node >= 22.14.0). Trusted publishing in step 3 requires
#    it, and every npm from 11.0.0 onward refuses to tag a prerelease `latest`
#    by accident. npm 10.x has no such guard.
npm --version

# 1. Confirm the bytes are the audited bytes, before anything else.
sha256sum vendor/zodiacs-engine-0.1.1-rc.6.tgz
# must equal 09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e

# 2. Note the two values npm WILL report for this archive. Both are already
#    committed and test-enforced, so there is nothing to trust here:
#    package-lock.json records the sha512 (scripts/platform-candidate-docs.test.mjs
#    asserts it equals sha512 of the archive), and the sha1 recomputes locally.
#      integrity: sha512-W3zxJPAjG699AP/9xLXf5iKxSg9o+DMSUQzyLf5yrCjlubr/mWGIO4SOOHfx1VKFC9k+s5bqt34kMi4E2j5n5g==
#      shasum:    5075b286acc1ce76c44f40fda4eb699f432eb0c6
echo "integrity: sha512-$(openssl dgst -sha512 -binary vendor/zodiacs-engine-0.1.1-rc.6.tgz | openssl base64 -A)"
echo "shasum:    $(openssl dgst -sha1 -r vendor/zodiacs-engine-0.1.1-rc.6.tgz | awk '{print $1}')"

# 3. Read the archive's file list without touching the registry. --json is not
#    optional: the human-readable output truncates the integrity value.
npm pack --dry-run --json ./vendor/zodiacs-engine-0.1.1-rc.6.tgz

# 4. Authenticate. 2FA/OTP at the prompt. Nobody needs to send that OTP anywhere.
npm login
npm whoami

# 5. Dry run. This does make one read-only registry request (a packument fetch
#    for the version-collision and implicit-tag checks). It cannot publish.
npm publish ./vendor/zodiacs-engine-0.1.1-rc.6.tgz --tag rc --access public --dry-run

# 6. Publish. `--tag rc` is mandatory, not stylistic: without it npm 10 silently
#    makes 0.1.1-rc.6 the `latest` tag, and a bare `npm install @zodiacs/engine`
#    starts resolving to a release candidate. (npm >= 11 errors instead. `--force`
#    and a `publishConfig.tag` both disable that guard; this archive has neither.)
npm publish ./vendor/zodiacs-engine-0.1.1-rc.6.tgz --tag rc --access public
```

**Check afterwards.** An earlier version of this card said to run
`npm view @zodiacs/engine version` and compare "the sha256 npm serves". Both were
wrong, and wrong in the quiet way: **npm never reports a SHA-256** —
`dist.shasum` is SHA-1 hex and `dist.integrity` is `sha512-<base64>` — and a
bare `npm view <pkg> version` resolves the `latest` dist-tag, which correct
tagging deliberately leaves absent, so it exits 0 printing nothing rather than
failing. Use these instead:

```bash
npm dist-tag ls @zodiacs/engine
# expect exactly:  rc: 0.1.1-rc.6        and no `latest:` line

npm view @zodiacs/engine@0.1.1-rc.6 dist.integrity   # == the sha512 from step 2
npm view @zodiacs/engine@0.1.1-rc.6 dist.shasum      # == the sha1 from step 2
npm access get status @zodiacs/engine                # expect: public

# The SHA-256 this repository records can only be checked by fetching and hashing.
curl -sSL "$(npm view @zodiacs/engine@0.1.1-rc.6 dist.tarball)" -o /tmp/served.tgz
sha256sum /tmp/served.tgz   # must equal 09c3e634…
cmp /tmp/served.tgz vendor/zodiacs-engine-0.1.1-rc.6.tgz && echo "byte-identical"

# And prove a bare install does NOT pick up the candidate:
npm view @zodiacs/engine@latest version   # expect E404 "No match found for version"
```

Each `npm view <pkg>@<exact-version> <field>` either prints the value or fails
with E404 — unlike the tag-resolving forms, it cannot pass silently.

**What publishing changes in this repository.** Not automatic, and not optional
— several gates assert the unpublished state and will fail the moment it stops
being true:

- `src/data/platform-engine-candidate.json` and `examples/mcp-server/candidate.json`
  carry `releaseStatus: "unpublished-candidate"`.
- `scripts/platform-engine-candidate.mjs:22-23` rejects any other value, and
  `scripts/platform-candidate-docs.test.mjs` asserts it, along with the archive
  README's "not a published release".
- `src/mcp/tools.ts` reports that status through `get_capabilities`, with
  `src/mcp/tools.test.ts`, `scripts/mcp-artifact.test.mjs` and
  `tests/mcp-protocol-drive.mjs` pinning it — and the bundled
  `examples/mcp-server/server.mjs` has to be rebuilt, republished and re-pinned,
  not hand-edited.
- [The engine release record](evidence/engine-release/README.md), `STATUS.md`
  and `REMAINING.md` say `unpublished-candidate` in prose.

**To undo.** `npm unpublish @zodiacs/engine@0.1.1-rc.6` is allowed within 72
hours of publication **only if** no package in the public registry depends on it.
After 72 hours it needs all three of: no dependents, under 300 downloads in the
last week, and a single owner. Two things are permanent either way: the exact
string `@zodiacs/engine@0.1.1-rc.6` can never be published again, and
unpublishing the *whole* package locks the name for 24 hours. Choose the version
number with that in mind — the string is spent the moment it is used.
---

## What neither card is

Neither is a request for review, and neither is waiting on one. The owner
authorized both operations. What is missing is a console session that this
environment does not have, which is why the local work continued past both of
them rather than stopping.
