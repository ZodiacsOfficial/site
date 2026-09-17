# Engine release state (2026-09-16)

The owner authorized publication of the reviewed engine package to the verified
owned namespace under its existing license. The work that can be done from this
environment is done; the publication step itself is blocked by a missing
credential, recorded exactly below.

## What the package is

| Fact | Value |
| --- | --- |
| Package | `@zodiacs/engine@0.1.1-rc.6` |
| License | MIT, `Copyright (c) 2026 Zodiacs.org` (`packages/engine/LICENSE`, with `NOTICE` and `LICENSING.md` retained) |
| Namespace | `@zodiacs`, owned (the sibling `@zodiacs/sdk@1.0.1` is already published under it) |
| Source repository | `ZodiacsOfficial/sdk`, `packages/engine` |
| Source commit | `fb57af7a2cd7c30983cc8fb655183d5a11f9cf30` (branch `codex/platform-release-integration-sdk`) |
| Artifact | `vendor/zodiacs-engine-0.1.1-rc.6.tgz`, 23 files, 36,591 packed bytes |
| Artifact SHA-256 | `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e` |

## Verified here

- **Artifact integrity.** `sha256sum vendor/zodiacs-engine-0.1.1-rc.6.tgz`
  equals the recorded `vendor/zodiacs-engine-0.1.1-rc.6.sha256` exactly.
- **Clean external installation.** In an empty directory with a bare
  `package.json` and no workspace configuration,
  `npm install /path/to/zodiacs-engine-0.1.1-rc.6.tgz` succeeds and produces
  `node_modules/@zodiacs/engine/dist` with the published entry points.
- **Ordinary use through documented public entry points.** A clean-room consumer
  importing `natalChart`, `ENGINE_VERSION`, `SIGN_NAMES` and `signForLongitude`
  from `@zodiacs/engine` computed a complete natal chart: engine version
  `0.1.1-rc.6`, Sun 84.1891° (Gemini), Moon 346.1941° (Pisces), Ascendant
  191.2397°, 12 bodies, for `1990-06-15T13:30:00Z` at 51.5074 / -0.1278 with
  Placidus houses. No workspace, no private path, no build step.

## The publication blocker, exactly

`@zodiacs/engine` is **not on the public registry**:

```
$ npm view @zodiacs/engine versions
npm error 404 Not Found - GET https://registry.npmjs.org/@zodiacs%2fengine
```

Publication cannot run from this environment:

```
$ npm whoami
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in.
```

There is no `~/.npmrc`, and no `NPM_TOKEN` / `NODE_AUTH_TOKEN` in the
environment. Attaching `ZodiacsOfficial/sdk` for push was separately refused by
the session's permission layer, so the engine repository can be read (it was
cloned anonymously) but not written.

### Rechecked 2026-09-17

- `npm whoami` → `ENEEDAUTH`; no `~/.npmrc`; no `NPM_TOKEN` or `NODE_AUTH_TOKEN`.
- `npm view @zodiacs/engine versions` → 404, still unpublished.
- `npm view @zodiacs/sdk version` → **1.0.1**. The scope exists and is owned, so
  this is a first publication *into an established scope*, not a new-scope
  bootstrap, and no scope-creation step is needed.
- **No publish workflow and no trusted publishing anywhere.** Nothing in
  `.github/workflows/` references `npm publish`, `NPM_TOKEN`, `NODE_AUTH_TOKEN`
  or `id-token`. That matters for where the fix goes: the engine's source is in
  `ZodiacsOfficial/sdk`, so an OIDC publish workflow belongs in that repository,
  not this one — and attaching that repository for write was refused by this
  session's permission layer.

**Two distinct blockers, not one.** Missing npm authentication in this
environment, and missing write access to `ZodiacsOfficial/sdk`. Either alone
would stop publication.

**Smallest missing action, in preference order:**

1. Add an npm trusted-publishing (OIDC) workflow to `ZodiacsOfficial/sdk` and
   publish from it. No long-lived token is stored anywhere, which is why this is
   preferred.
2. Or a maintainer runs `npm publish` locally on the prepared artifact.
3. Or an npm automation token with publish rights to `@zodiacs` is made
   available to a release environment — not to this session, and never pasted
   into chat or committed.

Every path still passes npm's own account and two-factor checks; nothing here
bypasses them.

After publication the remaining steps are mechanical and must actually be
performed before any public claim changes: download the published tarball from
the registry, verify its version and integrity against the SHA-256 above,
install it in a fresh external project, and only then update the site's install
instructions and pins.

## What is deliberately not claimed

The site does not depend on publication: it consumes the vendored artifact
directly, and that path is released and verified. Nothing in this record
establishes npm publication, external installation from the registry, or any
external adoption. The bounded numerical and support hardening that the
advertised release still needs (recorded ranges, degenerate angles, invalid
inputs, timezone limits, bounded return and event searches, validated against
independently sourced reference cases) is tracked as backlog item A in
[REMAINING](../../REMAINING.md) and is not complete.
