# Publishing `@zodiacs/engine` — what is ready, and the one thing that would go wrong

Checked 2026-09-20 against the real registry and the real artifact.

## Registry state, checked not assumed

`GET https://registry.npmjs.org/@zodiacs%2Fengine` → **404**.
`GET https://registry.npmjs.org/zodiacs-mcp-server` → **404**.

Neither package has been published, by Astra or by anyone. Nothing here
republishes or re-tags an existing release, because there is none.

## The artifact is sound

`vendor/zodiacs-engine-0.1.1-rc.6.tgz`, sha256
`09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e`,
36 591 bytes packed / 122 552 unpacked, 23 files.

Extracted to a scratch directory and exercised: every one of the five export
subpaths loads under Node 22.22.2, the entry computes a real natal chart
(12 bodies, Placidus cusps, 15 aspects, `ENGINE_VERSION` 0.1.1-rc.6), and every
`.d.ts` cross-reference resolves. No `src`, no tests, no sourcemaps, no
`node_modules`, no secrets — every shipped path is explained by `package.json`
`files`.

Licensing is coherent: `"license": "MIT"` matches the shipped `LICENSE`;
`astronomy-engine` is an external MIT dependency rather than vendored code; and
`NOTICE` correctly records that no GeoNames records ship.

## Two things are outstanding, and they are different in kind

1. **A review.** The candidate's own README says the release "remains held for
   review and operator publication authority"; the CHANGELOG says "SDK #5's
   explicit merge/publication hold and required review remain"; the starter's
   manifest says "review and publication gates remain open"; and SDK PR #5,
   *"WS7: engine and widgets packages (pending adversarial review)"*, is still
   open and still a draft. Four sources agree.

   The site previously said the opposite — that nothing was waiting on a review
   and only an authenticated publish remained. That was wrong and is corrected
   on `/developers/support/`.

2. **Authentication.** Publishing needs a maintainer signed in to npm. That is
   an owner action; no secret belongs in this repository or in a chat.

## The hazard to avoid

`package.json` has **no `publishConfig`**. A bare `npm publish` therefore puts
`0.1.1-rc.6` on the **`latest`** dist-tag, so `npm install @zodiacs/engine`
would hand every future user a release candidate. Publish with an explicit
prerelease tag:

```sh
npm publish ./zodiacs-engine-0.1.1-rc.6.tgz --tag next --access public
```

Publishing the **tarball** matters. `npm publish <tarball>` streams those exact
bytes; publishing a directory repacks and can produce different bytes than the
audited archive. The sha256 above is what should end up in the registry.

## Smaller defects worth fixing before the listing is public

These are cosmetic on disk and load-bearing on an npm page:

- the engine source is not on the SDK default branch, so `repository.directory`
  and every relative link in the README resolve to 404 on npm;
- the README *is* the npm listing page, and it currently tells readers the
  package is unpublished and to install a review tarball — which will be false
  the moment it is published;
- the `exports` map has no `"default"` condition, so `require()` fails with a
  misleading `ERR_PACKAGE_PATH_NOT_EXPORTED` rather than a clear ESM-only
  message.

## Owner action card

| | |
| --- | --- |
| what | publish the audited rc.6 tarball under a prerelease tag |
| where | a shell signed in to npm as a maintainer of the `@zodiacs` scope |
| command | `npm publish ./zodiacs-engine-0.1.1-rc.6.tgz --tag next --access public` |
| before | confirm the review in SDK #5 is complete, or decide explicitly to publish a candidate while it is open |
| after | `npm view @zodiacs/engine dist-tags` — `next` should carry 0.1.1-rc.6 and `latest` should not exist |
| undo | `npm dist-tag rm @zodiacs/engine next`; unpublishing within 72 hours is possible but disruptive |

Nothing in this session attempted an authenticated publish, and no credential
was requested, stored or printed.
