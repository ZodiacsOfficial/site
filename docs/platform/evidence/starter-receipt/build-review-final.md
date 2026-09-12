# Final build provenance verification

The integrator changed esbuild to `write: false` and writes its output files only
after the actual ephemeris module-path check passes. Reviewed final build source
SHA-256: `3da4170d63ab93cf1cd6b87e36fa79696c2785bd1d19718a801770fecbadc903`.

All six controls pass on Node 22.23.2 in a new scratch copy:

- The correct flat installation succeeds.
- Candidate, lock, installed-version, and installed-name mismatches reject.
- A nested same-version 2.1.19 ephemeris rejects through the metafile guard.
- Every rejected case preserves the prior valid `dist/app.js` hash.

A further nested-case check compares **all eight existing dist files** before
and after rejection. Their bytes are unchanged. See `all-output-stability.json`
and `nested-all-outputs.log`. The successful app hash remains
`e1e2240c4acdfcf5c6606cdf84a1241860037e2dde69b0ecb13531143d00dcb4`.

Run the six-control suite:

```sh
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node \
  /private/tmp/zodiacs-platform-starter-build-review/final/probe.mjs
```

`result.json` records commands, scratch path, exit codes, source hash, per-case
log names, and before/after bundle hashes. No shared source or dependencies were
modified. The original failed-output-write evidence remains untouched in the
parent review directory, including its separate source hash. This final result
supersedes that finding for this exact reviewed source only.

No further concrete defect was identified in this bounded build provenance
scope. This is not an assertion of full application security, authenticity of
arbitrarily modified dependencies, astronomical accuracy, or release approval.
