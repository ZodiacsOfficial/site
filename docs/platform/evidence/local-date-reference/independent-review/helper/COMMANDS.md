# Reproduction record

Work directory: /private/tmp/zodiacs-platform-local-date-reference-independent-review/helper.

1. Copied and hash-checked the twelve frozen-source files and source-freeze.json / implementation.patch. Read the original resolver and three dependencies with `git -C /Users/chiburashka/.codex/worktrees/4806/site show c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3:<path>` into owned scratch. Read-only source accesses; no source rebuild in another agent's output directory.
2. Physically copied existing esbuild, @esbuild/darwin-arm64, TypeScript and playwright-core tool packages into this scratch. No network install.
3. `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node build.mjs > build.log 2>&1`
4. `RESULT_PATH=node22-result.json /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node node-review.mjs > node22.log 2>&1`
5. `RESULT_PATH=node24-result.json /Users/chiburashka/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node-review.mjs > node24.log 2>&1`
6. `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-review.mjs > native.log 2>&1`, with approval for an owned native Chrome process. Blank page only; all page requests blocked; no account or production state.

All four executable commands exited 0. Logs and resulting bundles are retained. Build tools are excluded from the delivery copy; exact package/runtime hashes and versions are in final-identity.json. The directory-inspection typo looking for the unrelated preview manifest in browser/ returned file-not-found; it did not affect any helper test or artifact.
