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
   explanations actually claim, so an unrelated difference cannot absorb one it
   could not have caused.

## The rules that keep it honest

- **The display verdict is decided on what the page prints**, not on a
  tolerance. Rounding at six decimals is a step function and no epsilon sits on
  it: two values `8e-7` apart can print identically and two values `2e-8` apart
  can print differently. `compareAngles` compares `toFixed(6)` strings.
- **`reproduced` requires the engine that produced the receipt.** A recalculation
  runs only when the page's engine version matches the version the left receipt
  names, compared by SemVer precedence so build metadata is not mistaken for a
  different engine. A newer engine recomputing an older receipt is a different
  calculation and is never presented as the original.
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
  file makes about itself**, not proof that it is genuine.

## Privacy, as tested

Files are read with `file.text()`, compared in memory and dropped on reset or
page close. A Chromium drive recorded every request across load, all four
presets, two imports, a comparison, an export and a reset:

- no off-origin request, and no non-`GET` request of any kind;
- `localStorage`, `sessionStorage` and cookies empty at every step;
- the URL never carries birth details;
- the comparison still runs with the network cut after load.

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

## One thing that costs more than it should

The island reads none of the site's shared locale catalog — its copy is entirely
its own — but the site-wide rule is that every page carrying an island installs
exactly one catalog, so this page installs ~22KB of inline payload it never
reads. The rule lives in `src/lib/i18n`, which is under the Phase 1
protected-scope freeze. An exemption derived from the page's own chunk graph was
written and proved, then reverted: editing a frozen path to install a better
test is not a call to make from inside the change that benefits from it. Worth
revisiting whenever that freeze is lifted.
