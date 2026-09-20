# Takeover from the Astra/Codex session — 2026-09-20

Recorded by the Opus session that picked the work up. Every row below was
established by running something, not by reading a summary. Where a document
and an observation disagree, the observation wins and the document is listed
as stale.

## What was checked, and with what

| component | verified state | evidence identity | remaining action |
| --- | --- | --- | --- |
| site `main` | `6f91f819` | `git rev-parse origin/main` | none; this is the base |
| site PR #524 (Opus) | merged `dfed7c6c` | `git log origin/main` | none |
| site PR #531 (Astra) | merged `7c5a128f` | `git log`; `docs/platform/evidence/release-closeout-2026-09-19/MAINTENANCE.md` | none |
| four locale privacy notes | **fixed by Astra in #531** | `60a772f8`, `src/strings/additions.{es,fr,it,pt}.mjs` | none — the item this session left open is closed |
| `docs:build-report` 541/579 | **fixed by Astra in #531** | `f47553d2`, `docs/build-report-2026-07-15/` | none |
| `@zodiacs/engine` | `0.1.1-rc.6`, MIT, ESM, dep `astronomy-engine ^2.1.19` | `git cat-file -p fb57af7a:packages/engine/package.json` | unpublished |
| `@zodiacs/engine` on npm | **absent** | `GET registry.npmjs.org/@zodiacs%2Fengine` → `404` | owner authentication |
| `zodiacs-mcp-server` on npm | **absent** | `GET registry.npmjs.org/zodiacs-mcp-server` → `404` | owner authentication |
| vendored engine artifact | digest matches manifest exactly | `sha256 09c3e634…3db3e`, 36 591 bytes, vs `src/data/platform-engine-candidate.json` | none |
| MCP adapter | `0.1.0-rc.6` | `public/examples/mcp-server.json`; production page | unpublished |
| MCP adapter in production | serves rc.6 | `GET zodiacs.org/developers/mcp/` | none |
| saved calculation records | **enabled in production** | `/profile/` carries `data-saved-records="true"` | none |
| `PUBLIC_ACCOUNT_SYNC_V2_ENABLED` | absent | `/profile/` only *tests* for `data-account-sync-v2` | none; out of scope here |
| engine source location | `packages/engine` at `fb57af7a`, on the `codex/engine-expansion` lineage | `mcp__github__get_file_contents` at that SHA; `git ls-tree` | see decision below |
| SDK `main` | `b49e0f14`; contains **only** `packages/sdk` | `git -C /home/user/sdk ls-tree main packages/` | see decision below |
| SDK open PRs | 9, all draft, under a publication hold; #12 integrates engine+widgets | `list_pull_requests` | owner decision |
| Astra shared-session link | **unavailable** | `GET chatgpt.com/s/cx_6aaf…` → `403` | not retried; contents not guessed |

## Documents that are stale, and are not instructions

- `docs/platform/STATUS.md:20` still says `zodiacs-mcp-server@0.1.0-rc.4` and
  describes saved records as inactive. Both are wrong against the manifest and
  against production. This is the hazard the handoff warned about. It is a
  documentation defect to correct, never a reason to downgrade rc.6 or to
  re-run the activation.
- `docs/platform/ACTION-CARDS.md` Card 1 asks for `PUBLIC_SAVED_RECORDS_ENABLED`
  to be switched on. It already is. The card describes a completed action.

## The structural finding

The engine package has never been merged to the SDK's default branch. It exists
at `fb57af7a` on a draft-PR lineage, and the published artifact is served from
`artifacts/` at `51129a19`. A public launch that tells readers "here is the
source, the licence and the changelog" cannot point at a draft pull request and
call that a home for the code.

Merging the nine held PRs is not a documentation fix and is not something this
session should do unilaterally. It is recorded here as an owner decision with
its consequences stated, and the launch surface is written so that it remains
accurate whichever way that decision goes.

## Attribution

The locale-catalogue correction and the historical-report repair are Astra's
(Codex) work in #531, carrying its own evidence and its own scoped AI review.
Nothing in that work was redone here. Work from this session is attributed to
this session and dated 2026-09-20.

## Session handoff — state at the end of this working block

Branch `claude/eager-ramanujan-razak3`, restarted from `main` `6f91f819`,
head `3080a18e` plus this commit, pushed. Working tree clean at each push. A
detached worktree at `/home/user/research` was used to keep research off the
launch branch; nothing depends on it.

Done and verified, in the order it was done:

1. **Takeover table above** — every row checked by running something.
2. **Four false release-state claims corrected on live surfaces.** Three on
   `/developers/support/` and the hub card, one more found later in
   `public/llms-full.txt`, which told AI agents that publication was
   authorized and only an authenticated publish remained. The candidate's own
   README ("remains held for review and operator [authority]") and CHANGELOG
   ("SDK #5's explicit merge/publication hold and required review remain")
   say otherwise. Also the stale `rc.4` in `STATUS.md`.
3. **`docs/platform/evidence/swiss-benchmark/`** — pinned configuration,
   conventions matched by toggling rather than assumed, baseline distribution,
   a DE440s prototype, a holdout set, resource cost, licensing posture and
   adoption gates. The prototype is not adopted and production is unchanged.
4. **`PUBLICATION.md`** — the owner action card, including the dist-tag hazard
   that would otherwise put a release candidate on `latest`.
5. **`/methodology/` accuracy claim corrected.** The page said Astronomy
   Engine is "accurate to about one arcminute". That is the upstream library's
   own design target against NOVAS, stated on the page as though it described
   a chart here. It now quotes the measurement, and
   `scripts/methodology-accuracy-claim.test.mjs` recomputes every figure from
   `report-measure.json` so the page cannot drift from the data.
6. **`/developers/engine/`** — the engine's own page, the largest gap in the
   launch. Its install block was executed against the live GitHub archive in
   an empty directory and installed rc.6; its worked example prints output
   that a test produces by running it. Bundle figures come from
   `scripts/measure-engine-bundle.mjs`. Evidence: `ENGINE-PAGE.md`.
7. **`docs/engine-validation/README.md`** — one accuracy-and-support report
   over positions, angles and houses, local time, event search and runtime
   support, with measured residuals rather than gates, and the failing
   transit-window contract stated in it. Linked from both developer pages.
8. **Discoverability** — `llms.txt` and `llms-full.txt` now name the engine
   and the MCP adapter; developer sitemap `lastmod` dates match the commits
   that changed their pages.
9. **`LAUNCH-COPY.md`** — the announcement, reply, long-form post and release
   note, prepared and **not posted**, gated on four conditions including the
   page being live.
10. **Two bounded AI reviewers** (one numerical-methodology, one release/DX),
    the limit section 3 allows. Both found real defects in the work above and
    both found them the same way: by writing broken code my tests accepted.
    The accuracy guard passed five factually wrong pages, including the exact
    regression it was written to prevent. The install-block suite passed a
    block that installs unverified bytes where `node` is missing, and one
    whose guard evaporates under `dash` — silently overwriting a file the user
    already had while reporting success. Both suites were rebuilt and the
    twelve mutations between them now fail. The largest product correction
    came from the same pass: the page claimed the engine accepts 1800–2199,
    which is this site's form validation; the package bounds nothing and
    returns a confident chart for year 3500. One reviewer detail was itself
    wrong and is noted in the commit rather than absorbed. Separate model
    contexts are not independent human reviewers, and nothing here is recorded
    as one.

Dispositioned rather than done:

- **The desktop header is left alone.** `/developers/` is absent from the
  link row above 920px, but that row has a deliberately budgeted lockup
  (`SiteNav.astro`: "a desktop row opens only when its complete reserved
  shell fits"), and the footer carries the link on every page at every width.
  Adding a seventh top-level item is a change to the approved design, not a
  bug fix, so it was not made unilaterally.
- **`/sdk/engine/` still holds the rc.1 TypeDoc** that the package's
  `homepage` field points at. The HTML is generated output and the package
  manifest lives in the SDK repository, which is outside this session's
  repository scope. `llms-full.txt` now marks it superseded; repointing
  `homepage` at `/developers/engine/` is an SDK-side edit.

Not done, in the order worth doing:

1. **Publication.** `npm view @zodiacs/engine` still returns 404. The action
   card is written and the archive is audited; it needs an authenticated
   maintainer, and the review it is held behind is open.
2. **A screen recording** of the install-and-run sequence, if one is wanted.
   The terminal transcripts are real and committed; a video was not made, and
   `LAUNCH-COPY.md` says to record the sequence live rather than reconstruct
   it.
3. **The failing transit-window contract.** Uranus D exact topology remains
   `failed-incomplete` with a 0.044188° turning-point margin under the
   original 0.05° budget. Now stated publicly; still not resolved.

Unresolved and not this session's to settle: whether the nine held SDK PRs
should merge so the engine source reaches a default branch, and the JPL
redistribution question in the benchmark's `LICENSING.md`.

Untouched on purpose: the shared-sky connector and its configuration, token
and Registry identities, Astrofolio economics, production chart values, the
default browser bundle, and every unrelated production feature. No outreach
was sent, nothing was purchased, no post was published.
