# Executed review actions

All product content was read from immutable Git objects; only this scratch was written. No repository checkout, root source/dist, dependency or publication was mutated.

- `python3 capture-source.py`: captured selected `git show 9d180c9f…:<path>` bytes, recomputed Git blob/SHA-256 identities and matched all 16 frozen files. No build/install.
- `python3 prepare-driver.py`: copied the prior #435 driver as an attributed inert input and prepared the new exact-target driver. Its runtime imports use the existing dependency directory; there was no package install.
- `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node --check preview-drive.mjs > syntax.log 2>&1`: passed.
- The same Node invocation without `ZODIACS_EXECUTE_PREVIEW=1` intentionally failed closed before access/browser work; `disabled-guard.log` retained.
- Actual provider `list_deployments` identified BUILDING; `get_deployment` later identified exact READY source. Access was then requested for that exact URL, written only to the temporary private directory and never printed or retained in evidence.
- `ZODIACS_EXECUTE_PREVIEW=1 ZODIACS_PREVIEW_AUTH_FILE=/private/tmp/zodiacs-platform-reference-confidence-preview-auth/access.json OUT_DIR=/private/tmp/zodiacs-platform-reference-confidence-preview-review/browser-run1 /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node preview-drive.mjs > preview-run1.log 2>&1`: 6/8 passed, original selector failures retained. Disposable Chrome execution was explicitly approved by the tool boundary.
- After preserving `preview-drive.run1.mjs.log`, only hero selector scope, EN case filter and expected filtered group count changed.
- `ZODIACS_EXECUTE_PREVIEW=1 ZODIACS_PREVIEW_AUTH_FILE=/private/tmp/zodiacs-platform-reference-confidence-preview-auth/access.json REVIEW_CASE_PREFIX=en-chart OUT_DIR=/private/tmp/zodiacs-platform-reference-confidence-preview-review/browser-run2 /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node preview-drive.mjs > preview-run2.log 2>&1`: 2/2 affected EN groups passed.
- `python3 audit-pr.py`: initial preserved paginated-array TypeError; corrected six-page shape/status/blob recomputation passed all 534 rows against exact immutable Git contents. Root performed remote pagination; reviewer consumed those unchanged response bytes.
- A guessed read-only `git show …:src/islands/ReadingPath.tsx` returned path-not-found; repository search located `src/islands/explorer/ReadingPath.tsx`, whose exact source is retained. This did not affect browser execution.
- `python3 verify.py`: initial overstrong complete-body assertion failed; revised verification reports the four unavailable image bodies explicitly and passes source/modules/city/screenshot/receipt/accepted-group/neutral-archive checks. Original verifier and log retained.
- Provider `get_deployment` after browser execution again returned READY at the same source.
- `python3 cleanup.py`: exact private-string scan across raw files and decompressed members while credentials existed; zero matches, private directory deleted. Tool session memory access reference set null.

The first complete and corrected drivers, actual result JSON, command output, source records, provider records, raw module/data bytes and screenshots are retained separately. The final copied delivery is hashed/sealed, not digitally signed.
- Existing public rc.6 parser package identity was recorded with the pinned Node runtime in `dependency-identity.json`; the actual receipt entry and retained package-file hashes establish the codec used, without installing or modifying dependencies.
- The separate evidence reviewer executed its own source/driver/payload/receipt audit in `preview-evidence-audit`; its commands and qualifications are retained separately.
- `python3 seal.py`: copies exact payloads into a new delivery directory, maps executable script suffixes to inert `.log` names, writes the copy manifest and rehashes every copied record.
