# C016 initial hosted CI and one retry

Exact draft#438 source9912e37bee3f20de691b6bed8165ff36189d1eca remains unchanged.
All722 actual PR paths/statuses/blob identities match the delivered Git tree;
36 are the accepted non-documentation paths. Eight actual API pages are retained.

Initial Site Check34232899292 has13 successful jobs and one failed Build & Check.
That job passed build, types, unit/numerical, caption, date/ownership, sharing,
privacy, bundle and visual gates. Lighthouse failed only /today/ and
/ru/birth-chart/: worst-of-three TBT218.5/203.5ms against unchanged200ms.
The subsequent foreign-origin widget and widget performance steps were skipped.
No initial all-green CI claim is made.

Six original Lighthouse reports are retrieved from artifact10059936208 using
HTTP byte ranges after a slow full download was stopped. The GitHub artifact
identity is retained. Each selected member matches ZIP CRC and length; range
request hashes and central-directory metadata are recorded. This verifies the
six members, not the full129MB archive digest. Credentials/signed URL are not
retained. The original full job transcript is stored losslessly compressed.

/today/ TBT samples are6.5,218.5,3ms; Russian birth-chart samples203.5,0,0ms.
The outliers contain isolated unattributed browser tasks while attributed script
work remains similar. This supports one transient-performance retry, not proof
of an OS or runner cause. Root requests only the failed job once, unchanged head,
thresholds and workflows. The13 successful jobs are reused. GitHub reruns the
whole failed job as its available retry unit; no separate local suite is repeated.
Final retry outcome is recorded separately. A second blind retry is not authorized
by this decision.

SDK#5 is freshly read on2026-09-12 and remains draft/open atcced0116 with its
explicit do-not-merge/do-not-publish hold. No publication or production promotion
is performed by this hosted-check recovery.
