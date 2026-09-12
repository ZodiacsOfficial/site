# Executed main commands

Working directory: `/private/tmp/zodiacs-platform-skipped-date-preparation/main`.

Pinned runtime `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node` ran `build.mjs` and `probe.mjs`, writing `build.log`, `probe-node22.log`, `result-v22.23.2.json`. Runtime `/Users/chiburashka/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` independently ran `probe.mjs`, writing `probe-node24.log`, `result-v24.19.0.json`.

Both runtimes then ran `edge-probe.mjs` with stdout/stderr redirected respectively to `edge-node22.log` and `edge-node24.log`; result files are named by actual `process.version`. All four probe executions exited zero. There is no main browser execution or product/helper implementation claim; the separately linked child records contain the actual native Chrome controls and synthetic-model execution.

`build.mjs` uses the existing repository esbuild, with no installation. It reads the selected current root source and adds a private formatter export only in an in-memory transform used to build a probe subject. The exact selected bytes/hashes and generated subjects are retained. Node output records ICU/tzdb rather than assuming it from the executable name. Child commands, exact fixtures and native runtime identity are in its sealed deliveries.

`seal.mjs` independently rehashes every linked child record, original selected source, and generated subject, records the current source comparison without changing root, and produces the main copy manifest. No network/storage/product action was used by the main probes. Read-only exploratory searches included an unmatched shell glob and two nonexistent guessed source paths; no verification result depends on them.
