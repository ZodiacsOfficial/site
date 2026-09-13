# Root integrated C-012 follow-up acceptance

Exact source inputs are in source-identity.json: accepted six-file Freeze2 plus
separately reviewed CI wiring, above the unchanged c7b9eb4 product source. This
is local integrated evidence; refreshed remote head, CI and preview are separate.

Node22.23.2 and Chrome152 execute the fixture build plus294/294 full-page checks,
21 scoped native groups, and17 existing chart ownership groups. The normal build,
check (1043files, zero errors/warnings,11hints),4969tests/416files and exact #434
base scope pass. All18 fresh approved-page captures are byte-identical to c7b9eb4;
the source receipt is e85d852a325e93e76a4a5d46249908da0f134819ccd030c13482b7c6457c6c18.
Existing engine bundle remains23.3KB within25KB. No numerical changes are included.

Four normal-build EN/RU desktop/mobile checks preserve editing/recovery and confirm
that feature-off result capture markup is absent. Those four do not test active
managed prompts; the fixture gate and separately scoped native tests do. Native
fixtures use synthetic account/response/input values with intercepted endpoints.
No real subscription, provider write or production deployment is performed.

The original #434 CI failure, rejected downstream Freeze1 and author/reviewer
original failures remain in their separate immutable records. This successful
run is not substituted for those failures. Previously recorded chart visual
height failures and one scored reduced-motion pixel remain qualified in the
preceding chart evidence; no baseline/mask/tolerance was changed or claimed fixed.
All raw records, screenshots, executed source inputs and native bundles are
preserved in raw.tar.gz, with each ordinary member verified in raw-members.json.
