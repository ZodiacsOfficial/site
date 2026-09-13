# Actual execution record

The connected Vercel app listed the newly created deployment and fetched its details before and after the browser run. Exact read target: `dpl_HAJ4JzQd5wyNRPicr2YX6cLDqi7u`, team `team_Ue0ac8HT1b3TAzaDDZBTFhQt`, project `prj_nRTO3q3aNYLfaM3dotAowOc028fO`. The temporary protected-preview URL was written only to an owned mode-0600 file in a mode-0700 private directory. It was never logged in these records.

Source snapshot: selected 23 paths were read using `git show f803d2543ad81343b22d49326b8b46d0e2ea03a0:<path>` and their Git blob IDs using `git rev-parse` against the shared repository, then copied only into this scratch. The paths, byte lengths, SHA-256 and Git blob IDs are in `source-snapshot.json`. All original 12 frozen files matched. No local build or root source edit was performed.

Driver preparation reused the prior local normal-page driver as scaffolding, retained verbatim as `prior-local-driver.mjs.log`, and replaced transport/observation with actual remote-preview requests. An initial syntax check caught a reviewer variable/function name collision (`snapshot`) before browser launch. Its exact source and error are retained; only the manifest variable name was corrected. The final syntax check passed.

Executed from `/private/tmp/zodiacs-platform-local-date-preview-review`:

```sh
OUT_DIR=/private/tmp/zodiacs-platform-local-date-preview-review/browser-run1 ZODIACS_PREVIEW_AUTH_FILE=/private/tmp/zodiacs-platform-local-date-preview-auth/access.json /private/tmp/zodiacs-platform-runtime/node_modules/node/bin/node preview-drive.mjs > preview-run1.log 2>&1
python3 cleanup.py > cleanup.log 2>&1
python3 verify.py > verify.log 2>&1
```

The browser run used Node 22.23.2, Playwright from the existing dependency tree and actual Chrome 152.0.7977.83. Browser/profile creation needed the approved sandbox escalation. Every check used a separate disposable context. All contexts and the browser closed. No local server was started. The separate preview-auth bootstrap was unobserved and then closed; only its cookies were transferred to test contexts. No browser state or credential was saved.

Exact raw checks, requests, response byte identities, screenshots and downloads are in `browser-run1`. Public receipt parsing uses the already installed rc.6 package, and independent JSON checks confirm timeKnown=false, Pacific/Apia noon on December 31 and unknown-time house absence. There is no profiler or numerical call instrumentation in this driver.

Archives use explicitly constructed regular TarInfo entries with neutral uid/gid/names/time and no inherited filesystem metadata. All 71 module and 23 source members were reopened and checked. Cleanup scanned the private URL and nontrivial query values plus encoded forms against 187 then-existing raw files and all 94 decompressed regular members; zero matches. The owned private directory and in-memory access value were removed. Files created afterward contain only reviewer prose or copies of previously scanned records; no claim of a second exact-secret scan after deletion is made.

Fresh read-only PR pagination and blob recomputation were performed by the child reviewer; its commands, raw pages and full identity report are separately retained. No remote mutation, merge, publication, production access or SDK release operation occurred.
