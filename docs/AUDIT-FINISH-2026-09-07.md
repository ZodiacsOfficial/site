# Website audit finish — 7 September 2026

Base: released main `3ce109d2b36985d7f0463f1748f8aca7f5541615`.
The owner authorized completing the remaining website audit work. PR 394's
Waves 15–23 and the later PR 396 remain inherited. This is website work.

## People source integrity

Sun Yat-sen's cached birth/death dates and Soviet birthplace were false. A fresh
Wikidata/Wikipedia acquisition and the National Memorial Hall chronology support
1866-11-12, 1925-03-12 and Cuiheng, China. Recomputed the complete date-only chart
using Asia/Shanghai and rebuilt its readings, manifest and production data. The
Moon is Capricorn, replacing the old Pisces result. Birth time remains unknown.

The related source review corrected Carlos Chagas's adopted birth year to 1878
using Fiocruz's archival correction, and Rufino Tamayo's death year to 1991.
Artemisia Gentileschi's death is now qualified as 1654 or later. Tamayo's competing
birth days and Bessie Smith's uncertain birth year are disclosed as adopted-date
charts. Clarke and Siqueiros have explicit locality conflicts; existing reference
coordinates are not silently relabelled as verified birthplaces. Conditional
birth dates and disputed birthplaces are omitted from unqualified Person schema
assertions. Every institutional decision is separate from the pinned raw source.

The seven decisions are recorded in `phase5/people-pilot/source-reviews.json`.
Their source snapshot hashes fail closed on later upstream changes. Scoped
regeneration is available through the existing owning generators; the remaining
published corpus is preserved. Historical expansion snapshots remain historical
and Sun's old expansion record is superseded by the active correction ledger.

### Explicit selection-contract correction

The corrected Sun date is 360 days from Marie Curie's date. This does **not**
satisfy the 365-day same-sign separation assertion. Both people were already
published; neither is a new admission. The owner's authorization to correct and
finish the audit is applied to preserving true dates and both existing pages.

The 365-day minimum still governs admissions. Current release validation now
requires every close pair to be explained by the sole reviewed factual correction
and prints its actual below-minimum gap. A pinned historical cohort proves prior
membership and old dates. Fabricated releases, new members, unchanged dates,
changed companion dates, invalid sources and every other close pair fail.
Content depth and similarity limits are unchanged. This is a documented change
to the application of an editorial selection rule, not a claim that the original
365-day assertion passes under corrected facts.

## Verification in progress

The focused People suite passes 34 tests. Production-phase source validation
passes 12,109 checks, with the 360-day selection variance explicitly reported.
The owning OG renderer has a bounded seven-card review mode which preserves
production files while producing candidate images and provenance for inspection.
Share-image import, final source checks, browser evidence and deployment remain
pending at this preparation checkpoint.

Wave 24 remains outside the released product while its separate source review is
completed. The original failed Uranus exact-topology receipt remains failed.
Missing historical Wave 19 raw acquisition files and the later Wave 20 supplement
remain evidence limitations; compact committed fixtures are not called a fresh
raw-source audit.
