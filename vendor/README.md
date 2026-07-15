# Vendored @zodiacs/engine artifact

`zodiacs-engine-0.1.0.tgz` is the exact npm pack artifact consumed by this
site. Keeping the immutable tarball in-repository lets the site and package
share one calculation implementation without requiring an external npm
publication during this build.

- Package: `@zodiacs/engine@0.1.0`
- Source repository: `https://github.com/ZodiacsOfficial/sdk`
- Source package: `packages/engine`
- Source branch at pack time: `codex/engine-expansion`
- Source commit: `cced011659d48877b8b73b8a85796815234cf741`
- Artifact SHA-256: `8da3e0f2eb3818fe2c5833e05331be61da9b605ffa118a8462182821412e7cbe`
- Pack command: `npm pack --pack-destination <zodiacs-growth>/vendor`

The tarball was packed from the same package tree recorded by the source
commit. The checked-in tarball plus SHA-256 file is the deterministic site
input until an authorized maintainer publishes the package. This artifact is
not evidence of an npm release, and this work does not claim publication
authority.

The package is MIT licensed. Its `LICENSING.md`, `NOTICE`, and `LICENSE` are
inside the tarball. Consumers of the optional GeoNames adapter must retain the
CC BY 4.0 attribution in `NOTICE`.

The exported `@zodiacs/engine/internal` and
`@zodiacs/engine/internal/math` subpaths are explicitly site-only compatibility
boundaries. Public integrations must use `@zodiacs/engine` and
`@zodiacs/engine/geo`.
