# Monthly Horoscope Generation

Use this when writing the next monthly horoscope set. The committed transit
JSON is the source of truth; prose is editorial, not a second ephemeris.

## Inputs

1. Generate or confirm the target month:
   `node scripts/build-transits.mjs YYYY-MM`
2. Read the generated `src/data/transits-YYYY-MM.json`.
3. Read the latest complete month in `src/content/horoscopes/` as the style
   exemplar.

## Required shape

- Create exactly twelve files: `src/content/horoscopes/YYYY-MM-{sign}.mdx`.
- Frontmatter: `sign`, `month: "YYYY-MM"`, `updated: YYYY-MM-DD`.
- Body: no headings; roughly the same length as the current exemplar month.
- Include the solar-house clause once per file:
  "reading your Sun sign as the first house the way monthly horoscopes do".
- Every dated event in prose must be present in the generated JSON. Check
  weekday names against a UTC calendar before committing.
- Do not regenerate `public/assets/og/`; horoscope pages and feeds pick up the
  latest complete month automatically.

## Drafting prompt

```text
Write the twelve monthly horoscopes for YYYY-MM for zodiacs.org.

Use only the events in src/data/transits-YYYY-MM.json for dated claims.
For each event you mention, preserve the date and event facts exactly:
planet/body, aspect or ingress/lunation type, sign, and degree when the JSON
provides one. Do not invent stations, retrogrades, moon phases, aspects, signs,
or degrees. Check weekday names against the UTC date.

Match the current horoscope voice: plain, dry, warm, specific, no headings,
no woo-woo certainty, no token/market language, and none of the banned tells
from CLAUDE.md. Use solar whole-sign houses for each Sun sign and include this
clause once in every file: "reading your Sun sign as the first house the way
monthly horoscopes do".

Do not recycle last month's sentences with sign names swapped. Make each sign's
through-line specific to the month's actual house emphasis.
```

## Manual QA before PR

- Run a date audit: every `Month N` in the prose must be a day with at least
  one event in `transits-YYYY-MM.json`.
- Run a weekday audit for any `Weekday, Month N` phrase.
- Search the new files for banned tells from `CLAUDE.md`.
- Run the full gates:
  `npm run build && npm run check && npm test`,
  `node scripts/check-dist.mjs`,
  `node scripts/report-bundles.mjs`.
