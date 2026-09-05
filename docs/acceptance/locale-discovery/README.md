# Locale discovery acceptance — 5 September 2026

English, Spanish and Portuguese daily forecasts are reachable from their local navigation. French and Italian entry points identify English-only destinations; translated Tools pages retain their own language. The mobile Birthday link has one language cue, a full 44px target, and native keyboard focus remains visible at 320px and 390px. Guide is hidden while the menu is open and restored on close.

Reviewed capture: [Browser Evidence 33976960548](https://github.com/ZodiacsOfficial/site/actions/runs/33976960548), attempt 1, exact head `9667f96ee3f1363de3b056aee4ffada7f9f7def9`, source `27fad82d7488a66a46aab7395d9597828edcc711e344241cc9bab90ad4199f91`.

Artifact 9972860736 is 91,125,650 bytes; SHA-256 `323bf3548943b5af6ffd978883eb3965d4f5d115f2c540d0cb2c74883fe64078`. The archive checksum and CRC pass. Its source-bound provenance and recorded file hashes are verified independently. All workflow steps passed, including 15 visual comparisons, Lighthouse and all 231 locale assertions.

The release reviewer inspected all 53 locale captures using full-page contact sheets, original-size mobile Birthday focus captures, selected-sign overview/reading images and translated Tools heading crops. The menu language labels and focus rectangles are unobstructed; selected headings and readings remain below the real navigation; footers are styled. All 18 Phase 1 images are byte-identical to the previously inspected capture and are imported with this run's genuine manifest. No visual baseline is changed.

This receipt establishes the exercised browser states. It is not a manual screen-reader session, a native-phone session, or a claim that English-only destinations have been translated. Earlier failed captures and transfer errors remain in the audit record; they are superseded only by this verified capture.

Final Site Check33980339005 exposed a stale assertion in the older R0 browser driver: it still classified Today and daily Aries as English-only deferred routes. All3381 unit tests and the Phase1 receipt passed; eight route-metadata assertions failed, and later gates were skipped. The driver now checks exact EN/ES/PT alternatives, canonical URLs and same-route footer entries for Today, the horoscope hub and daily Aries at both existing widths. Core/programmatic and genuinely deferred Events/Registry checks remain intact. This test-only correction leaves the reviewed product source and screenshots unchanged; a new exact-head Site Check must pass.
