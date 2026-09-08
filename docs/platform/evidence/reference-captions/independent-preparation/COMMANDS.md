# Local preparation execution

Exact Git source was read with git archive 9d180c9 and targeted git show dependencies; commands and file hashes are in capture records. No root or author working files were changed.

Node22 build.mjs was first attempted with an invalid esbuild define value, followed by an attempted missing probe.cjs. The originals are initial-build.* and initial-result.*. Correcting the define exposed omitted component/style imports; second-build.log and third-build.log preserve those actual failures. Component and style directories were captured from the same immutable commit, and the build format was changed to ESM to preserve import.meta. fourth-build.log preserves the subsequent evidence collector's attempted filesystem read of esbuild's virtual define input. The collector now records real input files and preserves the virtual definition in build.mjs/build-metafile.json.

Final commands: Node22 build.mjs > build.log 2>&1; after build succeeded, Node22 probe.mjs > result.json 2> result.stderr. Both final commands passed. The local HTML handler executes in process; no web request or image-rendering call occurs. No further runtime matrix, browser run or remote action was performed.

Node22 is /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node. Esbuild and existing dependencies are from the prior owned catalog-count-independent-review/site/node_modules. No dependency installation occurred.
