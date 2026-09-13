Read exact freeze2/freeze.json, verify every SHA256, physically copy four source files and the patch into a new scratch. Copy already reviewed exact-base dependencies and local tool packages from owned prior review; no installation or network download.

First native run, all18 controls:

    OUT_DIR=native-freeze2-run1 /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-profile-save.mjs > native-freeze2-run1.log 2>&1

Final native run adds actual native profile-write observation:

    OUT_DIR=native-freeze2-final /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node native-profile-save.mjs > native-freeze2-final.log 2>&1

These local Chrome/loopback commands were run under approved escalation with all external browser requests blocked. No sandbox rejection occurred in this new scratch. Static persistence call extraction used the copied TypeScript AST library under default Node; it is a source byte comparison, not a numerical/runtime acceptance claim. Browser acceptance above used explicit Node22.23.2.
