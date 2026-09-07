# Astrofolio verification checkpoint

2026-09-08 Asia/Bangkok. Isolated branch `codex/astrofolio-verification`.
Base: `7f953e3fca0e7d5009e5602a1dad69edff0f54cc` (refreshed main).
This is a bounded verification experience, not a restart of the platform program.

## Ownership manifest

- Owned: `src/pages/registry/verify/**` (page and public facts endpoint),
  `src/registry/astrofolio-verification/**` (local evidence/checker/UI),
  `tests/astrofolio-verification/**`, `docs/astrofolio-trust/**`.
- Read-only: canonical `public/registry/zodiacs.registry.json`,
  `src/data/registry-origin-receipts.json`, disclosure records/catalogue,
  shared wallet address parser, Registry builders, shared Base/SEO/footer/styles,
  all engine, SDK, API, developer platform, package/lock and deployment files.
- Integration owner: primary platform session. No shared edits here. This manifest
  is a coordination record, not a lock or a claim about unpushed work.
- Route decision: `/registry/verify/` fits the existing wing boundary;
  `/astrofolio/verify/` is not an approved consumer carve-out.
- Deferred integration patches: contextual Registry link; exact-path Phase 1
  scope allowance; eventual discovery/indexing changes after review. New page is
  explicitly noindex during this review. No root AI guide changes.

## Refreshed parallel work

- Site [draft PR #415](https://github.com/ZodiacsOfficial/site/pull/415),
  `codex/platform-stage-a`, `4bb0d70eaaf21ea950a8fe708a0e1a91f8fb1f4f`, open.
- [Actual platform status](https://github.com/ZodiacsOfficial/site/blob/4bb0d70eaaf21ea950a8fe708a0e1a91f8fb1f4f/docs/platform/STATUS.md)
  read; candidate/testing reports are source claims, not this session's tests.
- SDK [draft PR #6](https://github.com/ZodiacsOfficial/sdk/pull/6),
  `03bf77990f3014b9125eed4976d7a41200aac80d`, open; stacked release hold remains.
- Open PR file lists checked: #415 engine/developers/package/AI guide; #413
  sitemap/routes/assistant; #289 footer; #226/#227 Registry transaction surfaces.
  Owned namespace does not overlap these; shared integration is deferred.
- README's Warm Gilt guidance is superseded by current CLAUDE.md Cosmic Void rules.

## Plan and verification

1. Consume Registry/disclosure/origin sources with immutable references; preserve
   attestation dates, missing evidence and candidate status. No second address list.
2. Read-only local comparison with explicit network/representation; no query-string
   address persistence. Fail closed on source errors and version mismatch.
3. Static readable evidence plus page-scoped JSON from the same model; accessible
   desktop/mobile view using the existing design and shared footer.
4. Focused source, semantic, normalization, failure and adversarial tests; browser
   keyboard/no-JS/mobile/privacy tests and captures; affected build/check gates.
5. Approximately 20 evaluation fixtures; distinguish deterministic extraction from
   source-grounded and unprimed browsing evaluations. No paid live model workload.

## Delivery state

Implementation in progress. No production merge/deploy or package publication.
Draft PR, test results, preview evidence and material questions will be recorded here.
