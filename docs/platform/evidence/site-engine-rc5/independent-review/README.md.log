# Vendored @zodiacs/engine artifact

`zodiacs-engine-0.1.1-rc.5.tgz` is the exact npm pack artifact consumed by this
site. The standalone starter keeps its separate engine `0.1.1-rc.3` pin and
immutable project archive. The optional ownership SDK remains separate.

- Package: `@zodiacs/engine@0.1.1-rc.5` (unpublished candidate)
- Source repository: `https://github.com/ZodiacsOfficial/sdk`
- Source package: `packages/engine`
- Source commit: `97f5e8d01828f4b85ffa845825dee9acff4695e4`
- Artifact carrier commit: `333369256af683c560603dd1e6411dd7a07adb1f`
- Artifact SHA-256: `1809c1686843a6be148eb185535e32059a20c35896e29ccfc7583a6b2738da65`
- [Immutable anonymous download](https://raw.githubusercontent.com/ZodiacsOfficial/sdk/333369256af683c560603dd1e6411dd7a07adb1f/artifacts/zodiacs-engine-0.1.1-rc.5.tgz)
- Archive: 23 files, 36,065 packed bytes, 121,212 unpacked bytes.

The public SDK archive was downloaded without credentials and checked against
the recorded SHA-256. Its source identity and artifact carrier identify separate
commits. The candidate adds the optional draft natal-envelope codec and
GeoNames/input validation fixes while retaining the site-only internal adapter
boundaries. The site does not yet connect the receipt codec to account or
saved-chart storage. An imported receipt remains an untrusted claim.

New checks of this artifact are recorded in [the rc.5 adoption evidence](../docs/platform/evidence/site-engine-rc5/README.md).
Earlier evidence and immutable artifacts retain their original identities.
The site pin is not evidence of npm publication, production deployment,
required human review, or external adoption.

## Previous site candidate

`zodiacs-engine-0.1.1-rc.1.tgz` and its checksum remain unchanged. Source commit:
`03bf77990f3014b9125eed4976d7a41200aac80d`; SHA-256:
`f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17`.
It supplied the initial corrected polar implementation. Its recorded Stage A
checks do not establish verification of later candidate bytes.

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
boundaries. Public integrations use `@zodiacs/engine`, optional
`@zodiacs/engine/geo`, and optional `@zodiacs/engine/receipt`.

The intermediate `0.1.1-rc.0` tarball is also retained unchanged (SHA-256
`4b16eeac2e8c82e5fb3a5b3756b2ed31f8fec93a37728a722b9ef81ce8f5c20d`).
It passed numerical/consumer checks but was superseded by `rc.1` to clarify
one-sided endpoint direction in the packaged reference documentation. Neither
candidate was published to npm.
