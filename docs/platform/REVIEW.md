# Platform release review packet

This is prepared review material, not a sign-off or publication request.
No reviewer has been contacted. Current candidates are implemented and tested;
they are **not release-ready** while applicable engineering findings, required
review and SDK #5's explicit hold remain open. [Current status](STATUS.md)
separates source, artifacts, previews, production and adoption.

## Reviewable deliveries

- SDK [#6](https://github.com/ZodiacsOfficial/sdk/pull/6) corrects the shared
  polar/convergence/input/search behavior; [#7](https://github.com/ZodiacsOfficial/sdk/pull/7)
  adds rejected-request recovery; [#8](https://github.com/ZodiacsOfficial/sdk/pull/8)
  adds the optional natal receipt; [#9](https://github.com/ZodiacsOfficial/sdk/pull/9)
  validates GeoNames data and protects cached metadata;
  [#10](https://github.com/ZodiacsOfficial/sdk/pull/10) validates public flags and
  aligns civil settings. These are a dependency
  stack above held [#5](https://github.com/ZodiacsOfficial/sdk/pull/5).
- Site [#415](https://github.com/ZodiacsOfficial/site/pull/415),
  [#417](https://github.com/ZodiacsOfficial/site/pull/417),
  [#418](https://github.com/ZodiacsOfficial/site/pull/418) and
  [#419](https://github.com/ZodiacsOfficial/site/pull/419) contain the shared
  candidate, developer entry/examples, civil-input correction and standalone
  receipt integration. Each has recorded local, CI and preview evidence.
  Site [#422](https://github.com/ZodiacsOfficial/site/pull/422) adopts the verified
  rc.5 archive, separates provenance identities, labels the archived API reference
  and fixes a demonstrated developer-note overflow at native 400% zoom. Its exact
  READY preview and local acceptance pass; the remaining CI job is still active.
- Latest frozen SDK artifact is engine rc.5, source `97f5e8d0`, distribution
  `33336925`, SHA-256 `1809c1686843a6be148eb185535e32059a20c35896e29ccfc7583a6b2738da65`.
  The site draft application now contains engine rc.5. Standalone starter rc.3
  contains engine rc.3; generated TypeDoc remains an explicitly archived rc.1
  reference. Their full identities and commands are in [EVIDENCE](EVIDENCE.md).
  The following optional portable-calculation boundary is locally implemented
  and tested, including actual browser acceptance. It preserves
  complete receipts before compact projection, and activates no saved storage
  or account migration.

## Findings requiring disposition

| Review area | Concrete material and acceptance question | Current disposition |
| --- | --- | --- |
| Numerical conventions and limits | Inspect the [fixed independent references/policies](../engine-validation/swiss-node-polar/README.md), [measured report](evidence/independent-node-polar-node22.json), source changes and declared support matrix. Are node/frame/house conventions, tolerances, polar behavior and historical/date-range claims justified for the advertised scope? | Finite model-assisted checks pass. Required human expert acceptance is absent; exact poles/tangencies and broader range policy remain open. |
| Time and portability | Inspect [civil-input evidence](EVIDENCE.md), the SDK draft receipt contract and [account downgrade counterexamples](evidence/c02-house-compatibility.md). Verify unknown-time references, historical runtime provenance, requested/actual houses, safe rejection and redaction. | Standalone receipts pass. Account v1 migration is deliberately unwired. Public input-flag compatibility is delivered in SDK #10/rc.5; packed consumer/browser acceptance passes. Its site adoption is separate. Account local-save and old-writer downgrade probes remain open engineering requirements. |
| Privacy and security | Inspect malformed/oversize/duplicate-key and stale-read controls, packed browser isolation, and the [GeoNames review](https://github.com/ZodiacsOfficial/sdk/blob/ef846c82dd284559f1574f69ee901a221a7a722a/docs/platform/EVIDENCE.md#geonames-schema-and-cache-integrity-candidate). Are the stated data boundaries and limitations acceptable? | Full files contain birth data; diagnostics are redacted, not anonymous. Imported provenance is unauthenticated. GeoNames v1 cannot detect a structurally valid mixed-generation dataset; shard selection reveals an initial. No hosted beta is approved. |
| Source and licensing | Review package LICENSE/NOTICE/LICENSING, dependency inventory and reference acquisition records. Confirm redistribution and public claims for the exact final artifact. | No dependency or license change was made to bypass review. Model review is not a legal opinion or required external sign-off. |
| Release authority | Record the accountable review decision and exact source/artifact to release. Separately resolve SDK #5's hold through its owner process and authorize npm publication/production as applicable. | Missing. Repository write access and passing CI do not supply this authority. |

For each disposition, record reviewer identity, date, exact source/artifact,
accepted scope, unresolved findings and evidence links. A changed candidate must
be assessed for the affected scope; do not transfer a sign-off by version label.

## Integration and rollback constraints

Refresh both mains and overlapping PRs before integration. Preserve #413's
additive inventory/sitemap work, #289's footer work and unrelated contributor
changes. Merge only through the applicable reviewed path; never clear a hold,
weaken a test or overwrite another branch to make the stack proceed.

Keep old candidate bytes immutable. Reverting the site's engine adoption must
revert its pin and adapter together. The receipt starter can return to its
previous source/metadata and immutable rc.2 archive without migrating account
records; preserve both archive versions. A production rollback is a separately
verified deployment operation, and an npm correction requires a new authorized
package version or other permitted registry action. No rollback, publication,
deployment or account migration is executed by this packet.
