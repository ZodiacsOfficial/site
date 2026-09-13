# C016 root executed commands

Workspace: /Users/chiburashka/.codex/worktrees/4806/site, branch codex/platform-reference-captions, starting root docs head831bc9e15ecaabbb4e163be60b9b3b7a2a276b1a with exact product9d180c9f. Each build/check/test/browser command explicitly prepends /private/tmp/zodiacs-platform-runtime/node_modules/node/bin and /private/tmp/zodiacs-platform-runtime/node_modules/.bin to PATH (Node22.23.2). Browser selection uses unchanged findChromium/STABLE_CHROMIUM_ARGS and actual Chrome152.0.7977.83. No dependency installation, preview deployment or external auth is part of this archive.

1. Independently verify author manifest/33 source files and exact base bytes. git apply --check then git apply the retained freeze1.patch; verify every final hash.
2. npm run data:i18n-additions → i18n-generation.log. Only one generated English default line changes.
3. npm run build → build.log.
4. node tests/phase1-acceptance-drive.mjs → captures.log; npm run check → check.log. Compare all18 fresh PNG bytes with the saved9d18 artifacts.
5. C016_SOURCE_MANIFEST=/private/tmp/zodiacs-platform-reference-caption-root-acceptance/source-manifest.json OUT_DIR=/private/tmp/zodiacs-platform-reference-caption-root-acceptance/normal-pages node /private/tmp/zodiacs-platform-reference-caption-root-acceptance/normal-pages.mjs → normal-pages.log. The preserved prior driver was corrected before execution for its request.method string access.
6. npm test → full-tests.log (5091tests/420files).
7. OUT_DIR=/private/tmp/zodiacs-platform-reference-caption-root-acceptance/native-reference node tests/reference-caption-drive.mjs → native-reference.log. No REFERENCE_BASELINE_DIR supplied.
8. OUT_DIR=/private/tmp/zodiacs-platform-reference-caption-root-acceptance/native-date node tests/local-date-reference-drive.mjs → native-date.log. No REFERENCE_BASELINE_DIR supplied.
9. OUT_DIR=/private/tmp/zodiacs-platform-reference-caption-root-acceptance/native-moon-ownership node tests/moon-result-ownership-drive.mjs → original misnamed external-temp log; exact completed copy is native-moon-ownership.log.
10. T17_SHARE_EVIDENCE=1 node tests/t17-positions-share.mjs → sharing.log. Generated tracked PNG archived and restored to its exact9d18 bytes; priorC015 sharing.log and source reconstruct proof qualify the stale sample.
11. Apply separately accepted metadata integration.patch a0c52aa23c1464858abada3db1b5bbfb4a8cedd5db7e409fb04016b84197d637. PHASE1_SCOPE_BASE=9d180c9f1a2f66893ccd6d73fcda106cb3894674 npm run test:phase1:scope → scope.log.
12. node node_modules/vitest/vitest.mjs run scripts/phase1-scope-guard.test.mjs scripts/daily-workflow.test.mjs scripts/audit-with-retry.test.mjs scripts/registry-selected-token-chart.test.mjs scripts/exchange-entry.test.mjs scripts/build-i18n-additions.test.mjs → metadata-tests.log (136tests/6files).
13. Root source/capture/served-file collection uses the retained seal-inputs.py. Initial mistaken capture manifest path and corrected rerun are retained. Raw images, drivers, reports, build outputs, selected source files and command logs are content-addressed in the root archive with original paths in raw-members.json. No tar extraction is needed to run code; every member is inert evidence.

No product change followed successful gates. CI/scope metadata was verified separately after the full suite. Independent frozen reviews and remote delivery records are linked separately in the program ledger.
