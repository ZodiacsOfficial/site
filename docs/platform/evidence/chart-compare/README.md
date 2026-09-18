# The chart-difference tool at `/developers/compare/`

A browser-local answer to "why do these two charts differ?". Two
`zodiacs.natal-envelope.draft-v1` calculation records go in; every value that
disagrees comes out, followed by the causes that can be offered for them and
the evidence behind each one.

This file records how it decides, what it was tested against, and what it
cannot do. The user-facing version of the same material is on the page itself.

## How a verdict is reached

1. **Differences are read, not inferred.** Both files are parsed with the
   engine's own `parseNatalEnvelope` and its size, depth and node limits, and
   every field that disagrees becomes a row: inputs, conventions, provenance,
   angles, house cusps, every field of every body (`lon`, `lat`, `speed`,
   `degree`, `sign`, `retrograde`), and the aspect list keyed by pair and type
   so a reordered list is not a difference.

2. **Three kinds of row.** `numeric` (the values differ), `display` (the values
   differ below the six decimals these records print), `metadata` (a stated
   value differs). Longitudes compare around the circle: 359° and 1° are two
   degrees apart.

3. **Causes are matched to the rows they can account for**, each with an
   evidence level:

   | Evidence | What it means |
   | --- | --- |
   | `reproduced` | Recalculated on this device, varying one setting, and every row that moved came back matching. |
   | `reported` | Stated by the two files; nothing to compute. |
   | `hypothesis` | Fits the evidence. Not demonstrated. |
   | `unresolved` | Nothing in either file accounts for it. |

4. **Whatever is left over is named.** Coverage is computed from what the
   explanations actually claim, in both directions: an unrelated difference
   cannot absorb one it could not have caused, and a cause cannot claim a row it
   could not have moved. A different moment or place moves computed values; it
   does not change which house system was asked for, and is not allowed to say
   it did.

## The rules that keep it honest

- **The display verdict is decided on what the page prints**, not on a
  tolerance. Rounding at six decimals is a step function and no epsilon sits on
  it: two values `8e-7` apart can print identically and two values `2e-8` apart
  can print differently. `compareAngles` compares `toFixed(6)` strings.
- **`reproduced` requires BOTH receipts to name a version this installation
  has.** Not one of them: an audit found the rule checking only the left, which
  let a right-hand receipt naming an engine nobody here has be matched against a
  local recalculation and called demonstrated — and made the verdict depend on
  which file was passed first. What that gate establishes is narrow and worth
  stating narrowly: it makes a replay meaningful rather than a different
  calculation. **Equal SemVer precedence is not executable identity.** Two files
  carrying the same version string may have come from different builds; §10
  orders them equally, which is an ordering rule, not a finding about what code
  ran. So the verdict rests on what the replay produced, never on the string.
- **`reproduced` requires each receipt to reproduce its own values first.**
  Before a recalculation can say anything about why two files differ, it has to
  reproduce what each file already says, from that file's own declared inputs.
  The codec checks a record's internal coherence, not that its result follows
  from its inputs — a genuine chart with its declared instant rewritten to
  another time is accepted — so without this baseline the comparison called such
  a pair reproduced while the house system explained none of it.
- **The verdict does not depend on argument order.** The controlled alternative
  is checked in both directions, and `sameVerdictWhenReversed` runs on every
  scenario in the synthetic corpus.
- **`reproduced` also requires that something moved.** The replay must reproduce
  the angle and cusp rows that actually differ. Two polar charts that both fell
  back to whole sign have identical cusps however they were requested; matching
  values neither file disputes demonstrates nothing.
- **The replay reproduces the receipt's own conditions**, including whether the
  birth time was known. A time-unknown receipt has no angles and no houses, and
  is never replayed as though it had them.
- **Only the house system is re-run.** A different moment or place stays a
  hypothesis even when both records name the same engine.
- **Agreement between two receipts from one engine is consistency**, not an
  independent check of astronomical accuracy. The page says so.
- **A version, checksum or source URL inside an imported file is a claim that
  file makes about itself**, not proof that it is genuine. Nothing here treats
  one as authentication, in either direction: two receipts naming the same build
  have established nothing about their provenance, and two naming different
  builds have not established that either. A differing claim is therefore not a
  gate — it is said out loud in `limits`, and the verdict rests on the
  recalculation. Reproducing some of a record's values locally says that this
  engine produces those numbers from those inputs; it says nothing about where
  the record came from.
- **"This engine produces those numbers" and "this setting explains the
  difference" are kept apart.** When the arithmetic works and only the identity
  behind it cannot be established, the cause stays a hypothesis and the detail
  says what the installed engine does, naming it as a fact about the engine
  rather than a demonstration about the two files.

## Privacy, as tested

Files are read with `file.text()`, compared in memory and dropped on reset or
page close. A Chromium drive recorded every request across load, all four
presets, two imports, a comparison, an export and a reset:

- no non-`GET` request of any kind — nothing is ever sent anywhere;
- `localStorage`, `sessionStorage` and cookies empty at every step;
- the URL never carries birth details;
- the comparison still runs with the network cut after load.

**Off-origin requests need a distinction the first draft of this file missed.**
The local drive recorded none, and that was reported here as though it settled
the question. It did not: analytics is off in a local preview and on in
production, so the first drive of the *deployed* page recorded a request to
`plausible.io` for the site-wide measurement script — page-level chrome present
on nearly every route, which never saw chart data. The page nonetheless now
carries `privateSurface`, the same opt-out `/profile/` and `/ask/` use, so the
one page whose claim is that your records never leave the device is not also the
one still calling a third-party origin.

That the opt-out works is demonstrated, not assumed. A local build cannot show
it — the analytics variables are unset locally, so *every* page emits zero
references and the control proves nothing. Building with
`PUBLIC_PLAUSIBLE_SCRIPT_URL` set separates them: `/developers/compare/` emits
0, `/developers/` emits 12, and `/profile/` — the established `privateSurface`
page — emits 0. The deployed page then confirmed it: 0 references in the served
HTML, and a live Chromium drive recording no off-origin request at all
(`live-drive.json`).

The lesson is worth keeping: a local drive cannot answer a question about
production configuration, and reporting a local result as a live one is the
same overstatement this tool exists to avoid.

The optional summary download is redacted — no dates, coordinates or positions —
which is **not** the same as anonymous. It keeps the exact signed difference for
every row, so anyone holding one of the two charts can recover the other. The
page says this rather than implying otherwise, and the export describes the
comparison on screen rather than whatever files happen to be loaded.

## Supported, and not

Supported: records this site offers for download from a birth chart, and records
the developer starter produces. Both are `zodiacs.natal-envelope.draft-v1`. A
record naming a different engine version of that same schema is read, and the
version difference is reported.

Not supported, and not silently reinterpreted: charts from other software in
their own formats, PDFs, images, screenshots. There is no claim of general
third-party compatibility.

## Tested limitations

- Aspect rows compare orb and `applying` for pairs present in both files, and
  presence otherwise. Orbs are scalars, not angles.
- A hostile file is rejected by the parser, not by this module: non-finite
  values, out-of-range coordinates, duplicate body names, unknown body names,
  wrong-length cusp arrays and mismatched `sign`/`degree`/`lon` are all refused
  upstream. Oversized and deeply-nested files are refused by the envelope
  limits. This module's defences (own-property lookups on imported keys) are a
  second line, not the first.
- Two receipts that differ only in an engine version this page does not hold
  cannot be decided here at all; the limit is stated rather than guessed past.
- The four presets are synthetic. They describe nobody.

## Review

Two bounded adversarial reviews were run by **AI reviewers** against candidate
`fef5f9bf` — one on numerical and comparison semantics with adversarial imports,
one on browser behaviour, privacy and whether the explanations are
understandable. This is AI review. It is not human, practitioner,
accessibility-auditor or independent-auditor signoff, and no such signoff is
claimed.

Eight defects they reported were reproduced independently before any fix was
made, and each now has a regression test that fails on `fef5f9bf`:

| Defect | Consequence on `fef5f9bf` |
| --- | --- |
| `lat`, `speed`, `degree` and the aspect list were never compared | "These two records describe the same calculation" for files that differ in 12 latitudes, 12 speeds or 17 aspects |
| `DISPLAY_EPSILON = 5e-7` | two values printing identically were called a different calculation, and told the reader to treat both as unverified |
| the same epsilon, the other way | two values printing differently were labelled "agrees to displayed precision" |
| the promotion guard matched values that had not moved | "Reproduced" on a polar pair whose cusps were identical |
| `replay` dropped `timeKnown` | a time-unknown receipt was replayed as time-known and the result used as evidence about it |
| a `does any input differ?` test decided abstention | one unrelated house-system row silenced an unexplained 3° position difference |
| the export read the loaded files, not the result | a preset's summary silently carried redacted metadata about the user's own records |
| a file chosen mid-comparison did not cancel it | an error message was replaced by the abandoned comparison's result |

One more of the same family was found afterwards, by probing the fix for its
inverse: the corrected coverage let a different place or moment claim the
house-system rows, which neither can cause. Same error as the one it replaced,
pointing the other way. Three scenarios now assert that no explanation claims a
row it could not have moved, while every row still has a claimant.

The epsilon defect is not a corner case. Two ordinary calculations ten
milliseconds apart — the realistic shape of "two programs disagree slightly" —
carry both misclassifications at once: Mars moves 8e-8° and prints differently
while the Sun moves further and prints the same, so no threshold on distance
could separate the two sets. The regression test for it uses exactly that pair,
with nothing edited.

Also fixed from the same reviews: the rounding-only verdict read "These differ
in 0 places"; the engine was pulled onto the page at load (73 KB) to read four
preset titles, so the presets are plain data now and the page renders its
controls without JavaScript; the `<details>` summary was a 22 px tap target;
`aria-pressed` announced a preset nobody had run; the run control was
unreachable by keyboard while inert; a bundler's chunk-load exception was shown
to the reader verbatim; and six sentences narrating the tool's own scrupulousness
were cut for the voice rules.

`browser-drive.json` in this directory is the drive's own output: 33 checks, all
passing, at 1280×900 and at 390×844 / 360×740 with touch.

## The audit of the reproduced contract, and what it found

An audit asked whether `reproduced` can be reached without establishing that the
recalculation is entitled to speak for both files. It can, three ways. Each was
reproduced against the code on `main` with fixtures the engine's own parser
accepts — a record the parser refuses can never reach the comparison, so a
counterexample built out of one proves nothing — and each is now a regression
test in `diff.test.ts` verified to fail without its fix.

A bounded AI review of that fix then found two ways it was wrong, and both are in
the table below under "first fix". They are recorded here at the same weight as
the original findings, because a correction that introduces a new false statement
is worse than the defect it replaced.

| case | before | first fix | after review |
| --- | --- | --- | --- |
| ordinary house-system difference | `reproduced` | `reproduced` | `reproduced` |
| right receipt names engine `99.0.0`, values match the installed engine | **`reproduced`** | `hypothesis` | `hypothesis` |
| the same pair, reversed | `hypothesis` | `hypothesis` | `hypothesis` |
| both sides foreign, naming *different* versions | limit names one of them | limit names one of them | limit names both |
| equal precedence, different build metadata on both sides | `reproduced` | `hypothesis` | `reproduced`, recorded as a limit |
| one side claims a build, the other claims none | `reproduced` | **`hypothesis`, described falsely** | `reproduced` |
| both sides claim the same build, metadata included | — | `reproduced` | `reproduced` |
| a receipt whose values are from another instant than it declares, placidus | **`reproduced`** | `hypothesis` | `hypothesis` |
| the same, with **whole-sign** houses on the drifted side | `hypothesis` | **`reproduced`** | `hypothesis` |
| the same, with the *place* rewritten instead of the moment | `hypothesis` | **`reproduced`** | `hypothesis` |
| a pair that both requested different systems and lost one house table | statement wrong | **statement denies the requested difference** | both said |
| a chart with a place against one with none | `angles-presence`, `cusps-shape` unresolved | still unresolved | claimed by the location cause |
| receipts declaring different conventions | **cannot be built** | **cannot be built** | **cannot be built** |

Four things are worth saying plainly about that table.

**The argument-order rows are the finding, not a detail.** The same two files
reached `reproduced` one way round and `hypothesis` the other, because only the
left receipt's engine was ever checked. A verdict that depends on which file the
reader happened to select first is not a verdict.

**The baseline row is the worst of the three.** The engine's codec accepts a
record whose declared instant is not the one its values came from: it checks
internal coherence — that the houses match the declared system, that the aspects
match the bodies — not that the result follows from the inputs. Verified
directly: a genuine chart with its `receipt.instant` rewritten to another time
parses, and so does one with its coordinates rewritten. So the comparison could
be handed a file whose values describe a different calculation from the one it
records, replay the declared inputs, match the other file, and report the house
system as a demonstrated cause while it explained nothing at all.

**The first fix opened a hole of its own, and a review found it.** The baseline
it added compared the cusps, and only the cusps. Whole-sign cusps sit on sign
boundaries, so they are quantised: at London they are byte-identical from 13:30Z
through 14:30Z. A record with a rewritten instant therefore reproduces its own
whole-sign cusps trivially, the baseline passes, and the pair reached
`reproduced` while sixty-five rows — every body and every angle — sat in the
unresolved bucket. The old code caught that pair by accident, because it required
the angles to match too. The angles and the body longitudes move continuously
with the moment and the place, which is exactly what makes them the
discriminating evidence, so the baseline now checks every value the replay also
produces rather than the one family that cannot tell. The same hole reached
through the coordinates is closed by the same change.

**The build-claim gate was the other mistake, and it was reversed.** The first
fix made a differing build claim refuse the replay outright. That contradicted
the rule already written in `diff.ts` — SemVer build metadata does not make a
different engine and "must not be reported as different ones, or be refused a
replay as if they were" — and it contradicted the response itself, which printed
"build metadata does not change which version a receipt was produced by" beside a
limit saying those two claims made the replay unusable. It also treated a record
claiming *nothing* as claiming something *different*, which is simply false. The
audit's own instruction is not to infer authentic provenance from a version or
checksum supplied inside a receipt; that cuts both ways, so an unauthenticated
claim now goes where an unauthenticated claim belongs — `limits` — and the
verdict rests on evidence this installation can actually gather. That expectation
reversal is recorded in `benchmark-expectations.json` under `amendments`, with
its reason, rather than quietly edited.

**The conventions row is a refutation, and is recorded as one.** The audit asked
for a differing-conventions case. It cannot be built: this draft implements
exactly one convention set, and a record declaring any other — a different angle
convention, a sidereal zodiac, a widened coverage claim — is refused with
`unsupported_feature` before the comparison sees it. Two parser-accepted records
therefore always agree on conventions. The `conventions` explanation in
`diff.ts` is unreachable for any input this tool can receive, and is left in
place as a guard rather than deleted.

### What the fix costs, and what it keeps

A promotion runs four recalculations rather than one: each receipt's own
baseline, and the controlled alternative in both directions. The count is capped
at four whatever the input. Measured on this machine, an ordinary house-system
pair costs 1.86 ms against 0.59 ms before — 3.2×, and +1.27 ms in absolute
terms, against tens of milliseconds of module loading the page already pays to
reach this code at all. Reported as measured, not assumed.

Withholding never throws away the useful part — when the arithmetic works and
only the identity behind it is unestablished, the cause stays a hypothesis whose
detail says what the installed engine does, and the stated limit says which gate
was not met.

The synthetic corpus grew from ten scenarios and 59 assertions to **eighteen and
112**, with an order-independence check on every scenario that asks for one —
and that check now compares what each cause *claims*, not only its evidence
rank, because comparing ranks alone would have passed a swap that moved rows
into the unresolved bucket. One previous expectation was **reversed**, for the
reason given above, and it is recorded as an amendment with that reason rather
than edited away; nothing else was weakened or removed, and the original ten
still pass unchanged.

Both consumers were re-accepted, because one module serves both: the protocol
side by `tests/mcp-protocol-drive.mjs` (84/84), and the browser side by
`tests/chart-compare-drive.mjs` — which is new, because the first drive of this
page was ad hoc. Its 33 checks were recorded and the drive itself was not, so
there was nothing to re-run. It now runs 34 checks at 1280×900 and 390×844 with
touch, reads the contract off the rendered page, drives the quantised-cusp
counterexample in both argument orders, and re-establishes the privacy claims
below. Run it with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… npm run test:compare:browser`.

## One thing that costs more than it should

The island reads none of the site's shared locale catalog — its copy is entirely
its own — but the site-wide rule is that every page carrying an island installs
exactly one catalog, so this page installs ~22KB of inline payload it never
reads. The rule lives in `src/lib/i18n`, which is under the Phase 1
protected-scope freeze. An exemption derived from the page's own chunk graph was
written and proved, then reverted: editing a frozen path to install a better
test is not a call to make from inside the change that benefits from it. Worth
revisiting whenever that freeze is lifted.
