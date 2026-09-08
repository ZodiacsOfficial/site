# Reproduction and original outcomes

Working directory: `/private/tmp/zodiacs-platform-chart-preview-review`.

1. `snapshot.mjs` ran with `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node`, reading selected immutable objects with `git show c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3:<path>`. No root source/dist reads are used as a browser server.
2. Vercel `get_deployment` confirmed the exact READY deployment before/after. An initially unverified team scope returned 403; `list_teams` supplied the actual accessible scope. `get_access_to_vercel_url` provided temporary access, retained only in a private directory outside this evidence tree.
3. The first `preview-drive.mjs` invocation used OUT_DIR `browser-run1` and exited before creating that directory or a browser because `require.resolve('@zodiacs/engine/receipt')` has no CommonJS export condition. Original driver/log are retained. After correction, the exact executed driver is `preview-drive.mjs`.
4. The successful command was `OUT_DIR=/private/tmp/zodiacs-platform-chart-preview-review/browser-run2 ZODIACS_PREVIEW_AUTH_FILE=/private/tmp/zodiacs-platform-chart-preview-auth/access.json /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node preview-drive.mjs > preview-run2.log 2>&1`. It exited zero with 9/9 controls. Chrome launch/network used approved execution. Existing Playwright/TypeScript dependencies were reused; no install or local build occurred.
5. `cleanup.mjs` scanned the evidence/source tree for exact private URL/query values, removed the temporary access directory and recorded zero matches. In-memory tool access values were cleared. The private URL is intentionally absent from these commands.
6. `seal.mjs` revalidates immutable source, provider/source identity, exact remote module hashes, receipt files and the child's complete PR manifest, then copies inert records and archives raw remote modules with a hash manifest. No new browser run is implied by sealing.

The driver records intentionally controlled host-API faults and transport holds explicitly. It never rewrites product modules, imports local product code in the page, makes external writes, or exercises production/account endpoints. Browser bootstrap has separate network qualification in the review.
