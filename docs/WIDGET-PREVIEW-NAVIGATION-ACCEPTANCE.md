# Widget preview navigation prerequisite

The existing Explorer drive repeatedly observed Mini birth chart selected while
the iframe continued showing The sky today. Exact-head diagnostic run
34026532878 recorded the expected chart URL and actual sky URL after the unchanged
30-second navigation wait, at 390px with the frame visible. No request failure or
browser error explained it; the saved screenshot confirms the visible mismatch.
This is not a passing capture or an ignored flaky assertion.

Explicit settings changes now promote the preview iframe from lazy to eager
loading. Input/change events and embed-mode changes do not reassign an identical
URL. The initial iframe remains lazy; generated public embed code and the external
widget loader are unchanged. Existing exact-URL, load, image/font, error, native
control, mobile and keyboard checks remain intact. On failure, the helper saves
actual/expected URLs, frame geometry, request failures and a screenshot, then
rethrows the original timeout.

This three-file prerequisite is based on actual main
8166a051cbb4846bbe0d495cee283014d2efdc9b and is separate from Wave 13's natal work.
The initial Phase 1 receipt still matches source fingerprint
a805566f20bc6d0271215e64242245163c2812044e2c7934b396a2c303391652. No protected
paths, baseline files, performance budgets or test limits change. Type check
passes: 918 files, zero errors/warnings and ten existing hints. Full local
build/unit, exact-head browser/CI and production acceptance are pending.

The diagnostic run also failed Russian Aries Lighthouse sample 1 (performance90,
TBT389.632ms; same-head controls99/TBT0), and the independent post-chart job failed
one of291 focus checks. Those failures are preserved. This widget correction does
not claim to explain or remedy either independent failure.
