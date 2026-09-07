# Starter build provenance review

Reviewed source: `examples/platform/scripts/build.mjs`, SHA-256
`17d0e89ed441af36c461149fedc8cc0031b55c02f40a1437914ceac46caee13a`.
The probe copied source, metadata, the vendored engine archive, and installed
dependencies into its own scratch directory. It did not mutate the shared
workspace or shared `node_modules`. Runtime: Node 22.23.2.

Run:

```sh
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node \
  /private/tmp/zodiacs-platform-starter-build-review/probe.mjs
```

The script records every executed build command, exit status, stdout/stderr, and
before/after output hash in `result.json`, `probe.log`, and per-case logs. Its
reported `passed` status concerns the six requested success/rejection controls:

- Correct flat installation succeeds and reports engine candidate rc.3.
- Candidate version differing from the lock rejects.
- Locked ephemeris version differing from the candidate rejects.
- Installed ephemeris version differing from the candidate rejects.
- Installed ephemeris name differing from the candidate rejects.
- A nested `@zodiacs/engine/node_modules/astronomy-engine` with the same 2.1.19
  version rejects through the actual esbuild metafile input-path check.

## Concrete output-write finding

The nested case exits 1, but `build()` has already written its output before the
metafile check. An existing successful `dist/app.js` changed from SHA-256
`e1e2240c4acdfcf5c6606cdf84a1241860037e2dde69b0ecb13531143d00dcb4` to
`04c34b4aa2c1a5059452ebf4eff2f2e73868c41a1a8636c4662b740b0cc74c4b`.
The previous HTML remains. The local server reads those files without this build
check, so starting it after the failed command can serve rejected output.
No successful-build message is printed; the documented fail-fast setup still
stops. The finding is partial output mutation after rejection, not a bypass of
the process exit status.

The bounded correction is `write: false`, followed by validation of
`bundled.metafile`, then writing `bundled.outputFiles` only after that guard
passes. A follow-up test should verify the rejected nested case preserves the
previous good output hash. The reviewer did not modify active build source.

This review checks metadata consistency and actual dependency resolution. It
does not authenticate arbitrary locally edited dependencies, establish
astronomical accuracy, or imply publication or external adoption.
