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
