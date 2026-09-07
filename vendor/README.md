# Vendored @zodiacs/engine artifact

`zodiacs-engine-0.1.1-rc.1.tgz` is the exact npm pack artifact consumed by this
site. Keeping the immutable tarball in-repository lets the site and package
share one calculation implementation without requiring an external npm
publication during this build.

- Package: `@zodiacs/engine@0.1.1-rc.1` (unpublished candidate)
- Source repository: `https://github.com/ZodiacsOfficial/sdk`
- Source package: `packages/engine`
- Source branch: `codex/platform-stage-a`, [SDK draft PR #6](https://github.com/ZodiacsOfficial/sdk/pull/6)
- Source commit: `03bf77990f3014b9125eed4976d7a41200aac80d`
- Artifact SHA-256: `f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17`
- Build: `corepack pnpm --filter @zodiacs/engine build`
- Pack: `npm pack --ignore-scripts --pack-destination <candidate-directory>`
- Runtime: Node 22.23.2, pnpm 9.15.0; SDK `pnpm-lock.yaml` unchanged.

The tarball was packed from the same package tree recorded by the source
commit. The checked-in tarball plus SHA-256 file is the deterministic site
input until an authorized maintainer publishes the package. This artifact is
not evidence of an npm release, and this work does not claim publication
authority.

The core now selects the rising polar intersection before deriving houses;
the site adapter only reshapes its output. Candidate verification and remaining
release holds are in [the platform evidence](../docs/platform/EVIDENCE.md).
The optional ownership SDK remains separate. No production deployment or npm
publication is implied by this pin.

## Archived rollback artifact

`zodiacs-engine-0.1.0.tgz` and its checksum remain unchanged. Original source:
`codex/engine-expansion` at `cced011659d48877b8b73b8a85796815234cf741`;
SHA-256 `8da3e0f2eb3818fe2c5833e05331be61da9b605ffa118a8462182821412e7cbe`.
Rollback requires reverting the dependency/lock and adapter change together;
the old artifact alone needs the former site polar correction. The frozen
`src/lib/engine/fixtures/legacy-polar-saved.json` records 49 synthetic legacy
chart summaries produced from that artifact before replacing the dependency.
They exercise saved-record migration, not independent numerical accuracy.

The package is MIT licensed. Its `LICENSING.md`, `NOTICE`, and `LICENSE` are
inside the tarball. Consumers of the optional GeoNames adapter must retain the
CC BY 4.0 attribution in `NOTICE`.

The exported `@zodiacs/engine/internal` and
`@zodiacs/engine/internal/math` subpaths are explicitly site-only compatibility
boundaries. Public integrations must use `@zodiacs/engine` and
`@zodiacs/engine/geo`.

The intermediate `0.1.1-rc.0` tarball is also retained unchanged (SHA-256
`4b16eeac2e8c82e5fb3a5b3756b2ed31f8fec93a37728a722b9ef81ce8f5c20d`).
It passed numerical/consumer checks but was superseded by `rc.1` to clarify
one-sided endpoint direction in the packaged reference documentation. Neither
candidate was published to npm.
