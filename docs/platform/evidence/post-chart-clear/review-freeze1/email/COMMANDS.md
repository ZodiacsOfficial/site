# Reproduction and raw execution record

Owned directory: /private/tmp/zodiacs-platform-downstream-context-independent-review/email.

- Read original EmailCapture/EmailCaptureEnhancement with exact `git show` at c3001114d4058ecb17e0274774ac465aa9f59dad, then compare both byte-for-byte with exact c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3. Captures/parity are in preparation/.
- Physically copied existing esbuild, @esbuild/darwin-arm64 and playwright-core tool packages from the reviewer's prior owned scratch. No network install. Their package hashes/versions are in final-identity.json.
- `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node build.mjs baseline preparation/EmailCaptureEnhancement.base.astro > baseline-build.log 2>&1` exited 0.
- `SUBJECT=baseline /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-review.mjs > baseline-native.log 2>&1` exited 1 for the expected 10 original failures and 10 passing controls. Earlier 18-group and 19-group runs/logs are retained, with the stronger focus and root-requested same-chart edit additions explained in preparation/PREPARATION.md. No fixture setup error was hidden.
- Copied all six frozen files, identity and patch from /private/tmp/zodiacs-platform-post-chart-clear-evidence only after the author supplied the exact sealed identities. Verified all hashes before execution and again during final sealing.
- `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node build.mjs candidate source/src/components/EmailCaptureEnhancement.astro > candidate-build.log 2>&1` exited 0 with no warnings.
- `SUBJECT=candidate /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-review.mjs > candidate-native.log 2>&1` exited 0: 20 passing groups. Final baseline/candidate use the same unmodified fixture and driver. Native processes were explicitly approved; owned blank pages only, fake example.invalid form values and fully controlled transport, no account or production access.
- Source review used the full exact email diff and read-only exact-base searches for reset listeners and analytics construction. `git diff --no-index` exits 1 when it reports differences, which is expected here.
- CI review copied the proposed workflow/patch/identity, read exact-base workflow/browser helper/package files, checked all supplied hashes and proved deleting only the four added lines restores exact original workflow bytes. No workflow or CI job was modified or dispatched.

Raw complete results and bundles are retained. The author's own 17-group fixture, typechecks and page-gate outcome are not counted as independent passes. CI inspection is read-only and does not establish Linux execution or remote CI success.
