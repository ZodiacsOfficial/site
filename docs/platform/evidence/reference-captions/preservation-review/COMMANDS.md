# Executed command record

All commands ran in `/private/tmp/zodiacs-platform-reference-caption-review`. Runtime paths are explicit. Browser execution used an owned disposable Chrome context with all routes locally fulfilled and no server/network issued request. No installation, remote mutation or product edit was performed.

`python3 capture-base.py` captured the exact base source using `git archive 9d180c9f1a2f66893ccd6d73fcda106cb3894674` from the connected repository, extracting only regular source/package/instruction/browser-helper members. The author identity/patch and 33 source files were copied and checked against the declared SHA256 values. Existing root node_modules is a read-only dependency source via scratch symlink; actual selected bundle inputs are captured in the final payload archive.

The first `prepare-numerical.mjs baseline` failed because its initial CJS format rejected top-level await. Both attempted baseline bundle invocations failed with MODULE_NOT_FOUND. The original script and three raw logs are preserved. The corrected ESM command sequence was:

```text
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node prepare-numerical.mjs baseline > build-baseline-numerical.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node baseline-numerical.mjs baseline-node22.json > baseline-node22.log 2>&1
/Users/chiburashka/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node baseline-numerical.mjs baseline-node24.json > baseline-node24.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node prepare-numerical.mjs candidate > build-candidate-numerical.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node candidate-numerical.mjs candidate-node22.json > candidate-node22.log 2>&1
/Users/chiburashka/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node candidate-numerical.mjs candidate-node24.json > candidate-node24.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node build-native.mjs baseline > build-native-baseline.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-drive.mjs baseline native-baseline > native-baseline.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node build-native.mjs candidate > build-native-candidate.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-drive.mjs candidate native-candidate > native-candidate.log 2>&1
REVIEW_ONLY=captured-caption-edits /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-drive.mjs candidate native-candidate-rerun > native-candidate-rerun.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node source-review.mjs > source-review.log 2>&1
/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node compare.mjs > parity.log 2>&1
```

The first candidate execution failed only the language assumption documented in the report. Original baseline and candidate-run1 driver copies retain their exact executed hashes; the correction and one-group rerun are separate. The first parity comparator correctly refused to accept the original failed candidate, retained as `compare.initial.mjs.log` and `parity.initial.log`. Final comparison admits only the one identified corrected group and records both executions.

`source-review.mjs` reconstructs entire component bytes and records actual bundle-input differences. `seal.py` rechecks original/copy source and selected dependencies, captures their exact bytes into neutral regular tar members, copies raw records without byte edits, and independently reads back every archive member and delivery manifest entry. Executable source/script suffixes in the delivery tree gain `.log`; original bytes and archive mapping remain exact. No cryptographic signing is claimed.
