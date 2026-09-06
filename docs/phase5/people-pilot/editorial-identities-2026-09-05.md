# Principal identity review — 5 September 2026

Audit A20 identified secondary occupations being used as the principal People labels. This correction changes the editorial selection for exactly three people. All selected strings already occur in the cached occupation evidence; no Wikidata claims, birth inputs, life-date suffixes, calculations, portraits or indexing decisions are rewritten.

| Person | Reviewed selection | Primary source |
| --- | --- | --- |
| Neil Armstrong | Astronaut and test pilot | [NASA biography](https://www.nasa.gov/humans-in-space/astronauts/former-astronauts/former-astronaut-neil-a-armstrong/) identifies Armstrong as a research pilot and astronaut. University teaching remains part of the original evidence. |
| Amelia Earhart | Aircraft pilot | [Smithsonian National Air and Space Museum](https://airandspace.si.edu/explore/stories/amelia-earhart) identifies Earhart as a record-setting aviator. Journalism and other original claims remain in the evidence. |
| Maya Angelou | Writer | [Caged Bird Legacy biography](https://www.mayaangelou.com/biography/) describes Angelou's literary work, including poetry and memoir. The broader existing claim `writer` is selected; the cached evidence is not relabeled to imply it supplied a different claim. |

Sources were checked on 5 September 2026. The Smithsonian page was available in search text; direct page retrieval returned an error. The NASA and Caged Bird Legacy biographies were readable. No biography prose or achievement is inferred from an astrological placement.

`candidates.json` owns the editorial selections. `tools/principal-identities.mjs` bounds the reviewed migration to these three records and validates every selection against the cached evidence. Run `node docs/phase5/people-pilot/tools/compose-copy.mjs --migrate-identities`, then `node docs/phase5/people-pilot/tools/build-manifest.mjs`, then `node scripts/build-people-pilot.mjs`. The copy migration changes only `identity`; the manifest preserves every field except `shortDescription` and `disciplines`. Existing frozen reading text and source data remain intact. `compose-copy.mjs --check` detects drift in the migrated identities.

The People index and profile templates also remove redundant mono-caps eyebrows, including the self-evaluating “The day, read honestly” line. Existing headings and data labels retain their roles.
