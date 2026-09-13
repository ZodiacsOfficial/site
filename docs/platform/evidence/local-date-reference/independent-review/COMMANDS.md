# Main independent execution record

Working directory: `/private/tmp/zodiacs-platform-local-date-reference-independent-review/native`.

- Pinned `/private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node setup.mjs` copied immutable base source using `git archive`, then overlaid only the twelve exact frozen author files after checking the freeze and patch hashes. The root/author source was never written.
- The same pinned Node ran `build.mjs baseline` and `build.mjs candidate`. Initial output-identity collection failed on a virtual esbuild define input; the original `build-initial.mjs.log`, `build-baseline.log` and `build-candidate.log` are retained. Corrected builds write separate logs and 213-input identities. Existing dependencies were reused; no installation or production build occurred.
- The pinned Node ran `drive.mjs > native-initial.log 2>&1` in approved owned Chrome execution, with all non-navigation requests aborted and a synthetic document fulfilled locally. Actual original/candidate product components execute inside that document. Original output is preserved as `result-initial.json` and original driver as `drive-initial.mjs.log`.
- Only the disabled-time-field driver interaction was corrected. The affected command was `REVIEW_CASE=chart-old-result-refusal-recovery REVIEW_OUT=result-chart-recovery-corrected.json /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node drive.mjs > native-chart-recovery-corrected.log 2>&1`. It exited zero: candidate passes, baseline fails the expected missing-refusal assertion.
- `source-review.mjs` independently checks every author/private frozen byte, unchanged numerical blocks, old time functions and import module specifiers. Its raw report/log are retained.
- Child helper review has its own exact drivers, Node22/24/native results and commands. It did not execute the author unit suite as its independent proof. Main and helper scopes are attributed separately.

The seal procedure rechecks all inputs and child records and constructs an archive with explicit ordinary file members only, using Python tarfile/GzipFile rather than macOS archive metadata. Main executable/source copies use inert `.log` names; a mapping retains exact original paths/hashes. No source edit, SDK/API activation, external write, account operation, publication or deployment occurred during review.
