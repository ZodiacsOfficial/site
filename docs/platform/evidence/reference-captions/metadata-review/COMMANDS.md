# Executed commands and scope

- `python3 prepare.py`: read-only Git object extraction at exact9d180c9, proposal identity validation, copy of immutable source and exact33 frozen overlays into owned `fixture/`; existing dependency-directory symlink only.
- `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node --experimental-strip-types scripts/build-i18n-additions.mjs` in fixture: wrote its own generated record; 579 keys, no root write.
- `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node audit.mjs`:23 positive/negative guard, exact-source, workflow, driver and generated-byte checks passed.

No author native driver, actual CI job or repository-scope CLI was rerun. The captured actual final driver was read for compatibility; separate source/browser reviews certify their own observed boundaries.
