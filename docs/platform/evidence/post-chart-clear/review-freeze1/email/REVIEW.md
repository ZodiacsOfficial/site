# Independent C-012 email presentation ownership review — Freeze 1

**Verdict: no blocking defect found in the bounded EmailCaptureEnhancement review.** All 20 independently written native DOM groups pass on Chrome 152.0.7977.83. The identical final fixture against the original source passes 10 groups and fails the 10 targeted obsolete-presentation controls. Main daily-island/context review and full-page acceptance remain separate; the author's reported full-page paused-state gate failure is under diagnosis and is not resolved by this fixture pass.

## Exact frozen subject

Source-freeze.json SHA256 is `e64eb26e34b1b5442a1a1e12f851b77a8a17d7d820a0e5a9b2b611c583cdd242`; implementation.patch SHA256 is `391af1a908fece28f57dfffe16ce435d1dce9ead828b9bcc77a505d1b6c0609b`, based on c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3. All six frozen files were copied and hash-checked before review. The reviewed enhancement is source/src/components/EmailCaptureEnhancement.astro, SHA256 `173f5ec0452cc25c4c9e4279fe203a9fabd79e965302ecab02990e1a070f2deb`.

The original enhancement SHA256 is `c3ea10e5495a769700808f80d2ef6b2fe131fe573d37f10ba0680b403fbe3f0b`. Read-only git-show comparisons establish byte equality between the author's c7 base and the root c3001114d4058ecb17e0274774ac465aa9f59dad observed during preparation. No moving author implementation was read before freeze. No product, root, backend, account or shared document was edited.

## Independent verification and concrete original failures

The fixture executes the complete actual Astro enhancement script, transpiled to JavaScript without replacing its callbacks or statements. Its representative native DOM has chart daily, footer weekly and standalone daily horoscope shells with the actual consumed control/data attributes. Native form validity, FormData serialization, radio defaults, reset/microtasks, visibility and focus execute in Chrome. Transport promises and animation-frame delivery are deliberately controlled. This is a structural native DOM fixture, not a production Astro page or an authenticated/provider-backed subscription.

The frozen correction fixes all 10 reproduced original failures:

- Chart clear now hides only chart-triggered shells and preserves typed input; old success and old rejection no longer mutate cleared status/button/form state.
- An old success no longer resets a replacement email address and Leo personalization back to the submitted Cancer selection. Old success or rejection/finally cannot enable or overwrite a newer pending submission; that newer submission can still succeed or fail normally.
- Old chooser focus cannot enter a cleared surface or a reopened replacement chooser. The stronger control flushes only the captured old frame while the new chooser is visible, then proves the new Leo frame still focuses correctly.
- An old reset microtask cannot collapse a newly opened replacement chooser. A full-computed replacement without an intermediate clear also invalidates the obsolete completion.

The other 10 groups preserve ordinary current success/reset, failure/retry, native validation, current chooser/reset behavior, positions-only non-reveal and unrelated standalone forms. Weekly footer completion still resets to its original optional-sign default. Standalone daily completion retains Virgo, and its pending chooser frame survives unrelated chart signals. All transport records and final DOM observations are retained in candidate-native-result.json and baseline-native-result.json. There are zero real page requests and zero page errors; all owned pages and the browser close in finally.

## Source contract and limits

The per-surface generation at lines 5–21 advances only for chart-triggered surfaces on full computed (129–143) or the plain clear event (145–151). It clears presentation status/busy state without clearing entered form fields. Captured generations fence chooser RAF (100–107), reset microtask (158–166) and response/error/finally UI (175–178, 204–225). Non-chart surface generations do not advance on these signals. Request payload and endpoint logic at 198–202 are unchanged; successful submitted operations retain the existing once-only placement analytics at 216–218 even when presentation is obsolete. There is no new storage, network endpoint, dependency, profile access or backend authority in the enhancement.

This is chart-generation ownership, **not cancellation on every email/sign edit**. A required positive control submits a current Cancer chart, edits the still-current address/sign to Leo, and settles the original success. Both original and frozen source reset those later edits and preserve the originally submitted Cancer choice. That existing behavior remains a documented limitation. The test does not claim rollback, cancellation, or prevention of any already submitted POST; all POSTs here are controlled in-memory requests, not actual backend commits.

Native reset dispatch is synchronous, but the exact-base source search finds only this component's reset listener. The inspected baseline analytics wrapper is the existing no-op/allowlisted Plausible forwarding wrapper (Base.astro:313, 348 onward); no supported chart-clear callback was found inside the reset completion path. Arbitrary added reset listeners, replaced global hooks or detached/reparented DOM can create other reentrancy conditions; they are not claimed as verified product paths or an authentication defect. No such synthetic callback was substituted into acceptance.

The six-file author scope also includes daily context/driver work, copied for identity but owned by the main reviewer. Separate CI wiring is reviewed in ci-wiring/REVIEW.md. This report does not approve publication, deployment, backend behavior, complete form-edit cancellation, or the still-separate full-page gate.
