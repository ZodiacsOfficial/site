# Phase 1 cold-read acceptance

Reviewed on 2026-07-19 against the committed deterministic horoscope program. This is an editorial acceptance record for the master brief’s requirement to read three new pages cold and rewrite any paragraph that could pass as generic competitor copy.

## Pages read

### `/horoscopes/aries/` — Aries daily, July 19, 2026 UTC

**Cold-read finding:** The earlier second paragraph explained how to handle symbolism instead of helping the reader make a decision. The final paragraph also used an interchangeable “test one real conversation, task, or choice” instruction.

**Revision accepted:** The 108-word edition now starts with the live decision: put the agreement or disagreement on the table. It then asks Aries to name what home or family needs before volunteering more time. The final action is no longer an interchangeable checkpoint: “Put the message in writing, then choose the smallest first move that matches it” translates this edition’s communication-and-self-direction contact into an Aries-sized decision. The Moon, Mercury retrograde, and exact Mars–Saturn evidence remain attached to their passages. The reading serves the reader before exposing the astrology.

### `/horoscopes/aries/tomorrow/` — Aries tomorrow, July 20, 2026 UTC

**Cold-read finding:** The previous Tomorrow edition was a relabeled daily reading. Its first paragraph changed only “Today” to “Tomorrow” and the Moon phase, while its full home-and-family paragraph was byte-identical to Today. Across all signs, Today↔Tomorrow trigram Jaccard similarity ranged from approximately 0.51 to 0.59.

**Revision accepted:** The 110-word Tomorrow edition now uses the lead time: identify the agreement that needs an answer, decide which home condition must remain firm, and give the next day’s creative or affectionate invitation an actual time. It names the first-quarter Moon, Mercury retrograde, and Jupiter–Neptune contact without borrowing Today’s Mars–Saturn action sequence. Aries Today↔Tomorrow trigram Jaccard is 0.102; the current twelve-sign maximum is 0.130.

### `/horoscopes/virgo/weekly/` — Virgo weekly, July 13–19, 2026 UTC

**Cold-read finding:** The old opening and early-week paragraph repeated the same friends-and-future instruction. Its turning-point paragraph could have appeared unchanged in almost any weekly horoscope.

**Revision accepted:** The 272-word edition now has a legible sequence: friends and future plans first, protected quiet at midweek, then a quantified resource review at the close. The Venus–Uranus passage asks Virgo to compare the intended move with the move actually being made before deciding what is worth beginning publicly. Each section has a different job, and the final test—stop before precision turns punitive—is specific to the Virgo register rather than generic encouragement.

### `/horoscopes/capricorn/2027/` — Capricorn 2027

**Cold-read finding:** The previous 1,743-word edition was a flat event ledger. Twenty-three paragraphs repeated a question, one of four sign refrains, an event name, a house theme, and one of two disclaimers. The facts were sound, but the reading had no editorial hierarchy and made the reader do the synthesis.

**Revision accepted:** The 1,777-word edition now opens with a Capricorn-specific thesis about sustainable structure, then moves through four chronological chapters and four reader-led syntheses: relationships, work and money, private life, and personal direction. It closes with an honestly labeled three-date plan. Full dates and named events remain in the copy, while decisions such as pricing capacity, defining shared obligations, protecting home conditions, and choosing visible work come first. The page has ten unique section headings rather than 23 interchangeable event paragraphs. Every named first/second checkpoint now runs forward in time, and repeated house areas are collapsed rather than printed twice in the opening comparison.

## Program-wide acceptance

The rewrite is shared, not a Capricorn exception. Renderer v5 gives every sign a distinct editorial profile, named yearly chapters, diversified event phrasing, and practical house-level decisions. Daily and tomorrow checkpoints, weekly progress checks, relationship responses, and career review actions now vary with the cited solar house instead of repeating one editorial sentence for all twelve signs. The page renderer no longer appends a generic “One useful move” card after those evidence-backed sections; the practical guidance is the reading, not uncited padding. All 12 yearly readings are deterministic, 1,763–1,799 words, and cite every 2027 catalog event they discuss. The builder refuses to pad a short yearly edition with generic filler. Validation also requires at least eight unique headed sections, chronological thematic checkpoints, deduplicated opening areas, and complete yearly event citation coverage.

The independent serialized-copy verifier now normalizes complete sentences across all six surfaces and blocks an exact sentence used by more than three signs. The current package sits materially below that ceiling: no normalized editorial sentence appears for more than two signs. House actions are written into their daily, weekly, relationship, career, or yearly context instead of surviving as portable all-surface sentences.

Short-form readings also have an independent within-reading action check. Imperative clauses are normalized and compared with unigram Jaccard similarity; a score above 0.50 blocks publication. When two evidence passages return to the same house, the later passage must now advance the earlier instruction. For example, Aquarius first reserves time for the person, pleasure, or draft, then decides what would make that invitation or draft worth continuing instead of receiving the same reservation twice.

The independent verifier also compares Today and Tomorrow for each sign as complete rendered editions. Same-sign trigram Jaccard must be at most 0.40, matching the program’s existing daily cross-sign ceiling: shared facts may recur, but less than half of the combined three-word phrasing may overlap. Current scores range from 0.063 to 0.130.

No reviewed passage uses the master brief’s banned voice tells, an exclamation mark, an unsupported deterministic promise, or publishing-plumbing language. All three readings open with meaning or action rather than astronomical mechanics. The independent read-side verifier recognizes the named claims, full event dates, solar-house themes, and evidence receipts without importing the prose renderer.

Accessory removed: third sky-strip marker. Horoscope pages retain at most two useful markers, and the targeted page-data test enforces that limit.

## Verification

- `npm run editorial:horoscopes:build` — regenerated all 12 signs and six surfaces from the current facts, producing 528 evidence receipts.
- `npm run editorial:horoscopes:verify` — passed independent copy checks and deterministic replay.
- `npx vitest run scripts/independent-copy-verifier.test.ts src/lib/horoscope-program.test.ts scripts/horoscope-program-files.test.ts src/lib/horoscope-page-data.test.ts` — 4 files and 36 tests passed, including the independent exact-sentence, within-reading action-reuse, Today↔Tomorrow relabeling, chronological-yearly-checkpoint, and exact-sky-marker regressions.

**Decision:** accepted for the Phase 1 editorial cold-read gate.
