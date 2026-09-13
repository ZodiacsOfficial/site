# Actual local review execution

All working commands ran in the owned freeze2 scratch. assemble.py created a local shared-object detached checkout at f803, copied and verified all author files, and applied author and metadata patches with git apply --check before applying them. The unchanged scope CLI was executed at that exact base; raw command/result records are retained in assembly and scope logs. The separate metadata delivery contains the exact Node22 driver --check command and result.

1. Node22 extract.mjs > extraction.log 2>&1
2. The retained probe.ts was adapted from the previous immutable preparation probe to call the actual extracted branches, include London and actual consumer SSR; build.mjs uses the prior owned esbuild runtime and no installs.
3. Node22 build.mjs > build.log 2>&1
4. Node22 probe.cjs > node22-result.json 2> node22.stderr
5. Node24 probe.cjs > node24-result.json 2> node24.stderr
6. Node22 verify-consumers.mjs > consumer-verification.log 2>&1
7. Node22 catalog-build.mjs > catalog-build.log 2>&1
8. Node22 catalog-probe.cjs > catalog-result.json 2> catalog.stderr
9. A direct JSON/artifact assertion checked signature bodies exclude Moon and Moon context is unresolved with null house and no dignities in both runtimes; signature-context-check.json retains all eight actual outcomes.
10. python3 seal.py copied exact raw evidence, rehashed original author and own frozen files, and captured all consumed inputs. No full site, node_modules tree, or generated site was archived.

Node22 = /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node.
Node24 = /Users/chiburashka/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.
Both numerical/SSR probes and the catalog probe completed on their first execution; build warnings are preserved. No browser, network, remote mutation or product-source edit was performed by this review.
