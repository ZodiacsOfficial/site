# C016 release blockers and bounded maintenance preparation

C016 remains at accepted draft#438 source9912e37bee3f20de691b6bed8165ff36189d1eca.
The required hosted checks have run, but release acceptance is blocked. The second
attempt stops before performance on five newly reported vulnerable production
dependencies. Root does not issue a second blind retry or change a threshold.
The original14-group hosted preview remains valid for9912, not for a new dependency
tree. The13 other original hosted jobs remain successful.

## Dependency proposal — prepared, not integrated

The blocking installed versions and minimum selected fixes are Astro7.2.4→7.2.8,
Sharp0.35.3→0.35.4,js-yaml4.3.1→4.3.2,smol-toml1.7.0→1.7.1 andSVGO4.0.2→4.1.0.
Primary advisory pages were checked on2026-09-12:
- https://github.com/advisories/GHSA-26w7-cxv4-gfx2
- https://github.com/advisories/GHSA-rgj7-g3m4-5g8c
- https://github.com/advisories/GHSA-2883-xcg3-v3hh
- https://github.com/advisories/GHSA-7w5x-hrqm-74c2
- https://github.com/advisories/GHSA-w27v-7q3p-w38r
- https://github.com/advisories/GHSA-4vpr-x523-8j87
The advisories describe conditional untrusted-input risks, not evidence of an
exploit against this site. No adversarial exploit was attempted.

The first scratch resolution unnecessarily selected Astro7.3.2 and unrelated
updates; it was rejected. Exact temporary constraints selected the minimum fixes,
then the original package declarations were restored and lockfile compatibility
rechecked. No permanent override, forced upgrade or advisory suppression is added.
The proposal changes59 lock records including required compiler/platform binaries;
package.json, all33 caption files and the immutable engine artifact stay exact.
It installs successfully and passes both existing audit gates: zero production
findings; zero high/critical in the full tree. Two moderate dev-only Vitest findings
remain explicitly within the existing gate, not a claim of zero total findings.

## Why the proposal does not complete release acceptance

The fresh build requires regenerating a daily provenance hash that includes the
lockfile. Existing generator execution changes only that hash while preserving
the edition/copy. The next build correctly refuses the September8 edition on
September12. Existing daily/publication/program generators then compute explicit
September12 facts, but the build also requires a paired Registry outlook/research
edition. Root uses those existing generators, retaining market-read timestamps
and approval inputs, without changing code or fetching/relabeling market prices.
That prospective tree fails three existing Registry research tests:
1. The market-mutation comparison sees the same unavailable-snapshot text.
2. The no-pilot-approval assertion receives six scheduled event items.
3. The observation fixture cannot find the selected market asset.
The full failing transcript is retained. No assertion, publication policy or
freshness gate is weakened to accept that proposal. Further paired-edition/
Registry integration is a release blocker outside the accepted caption slice.
No new numerical or Registry implementation is started during this closeout.

Root preserves the complete tracked proposal patch plus all eight new generated
items, then restores only its ten tracked maintenance paths to9912 and removes
only its eight newly generated files. The delivery checkout now has documentation
changes only; the shared checkout's accepted source and dependencies were never
replaced. The temporary delivery checkout's node_modules still represents the
unaccepted proposal: run npm ci before any future execution after restoring its
accepted lockfile. No test result is claimed for that mismatched installed tree.
No maintenance source is pushed, merged, deployed or published.

The initial create-process attempt used a not-yet-created scratch working directory
and failed before running; setup was corrected. The build failures above remain
separate from the earlier accepted caption evidence. The full slow hosted artifact
download was stopped after a successful scoped range retrieval, and an owned
stalled brief reread was stopped; neither changes repository source.
