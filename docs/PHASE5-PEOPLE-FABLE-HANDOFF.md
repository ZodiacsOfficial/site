# Phase 5A — People directory: design, provenance and gold-pilot handoff

Status: decision-complete design handoff. Nothing here is implemented.
Branch: `fable/phase5-people-experience`
Base: `c6113b65e01bc63dff7a8dc2d215163e462ce09c` (Phase 4 closeout, tip of `origin/main`)
Scope: Phase 5A only — 20 gold-standard people, the contracts around them,
and static proofs. No route, collection, flag, sitemap row, navigation
entry, search record or indexing exists or is created by this work.

---

## 1. Product promise and exclusions

**The promise.** For a small number of clearly notable public people, the
site shows what the sky actually looked like on the day they were born,
computed by the same engine that computes a visitor's own chart, and it
is candid about the parts it cannot know. A reader arrives curious about
one person and leaves understanding one real thing about how a chart is
read — degrees rather than sign labels, angles rather than adjectives,
and the difference between a fact and an assumption.

**What the feature is called.** *People*, or *public charts*. It is not a
celebrity database, not a chart mill, and not a directory of famous
birthdays. The copy never uses the word "celebrity".

**Exclusions — what a person page will never contain:**

- biography, career summary, or achievements dressed as astrology;
- any claim that a placement caused, explains or predicted an event;
- health, sexuality, relationships, family conflict, criminality,
  finances or any other sensitive material, in any framing;
- a numeric personality score, compatibility score, or ranking;
- a rising sign, house, angle, or sect claim on an unknown-time record;
- a birth time that any source did not explicitly state;
- copied Wikipedia prose;
- an invented human editor, or a prominent "AI-operated" badge;
- third-person pronouns for the subject. The name or "the chart" carries
  every sentence, so no page ever guesses a living person's pronouns.
  This is a hard editorial rule, enforced in validation.

---

## 2. Reconciling PLAN.md with docs/MASTER-PLAN.md

`PLAN.md` sets the Phase 5 Definition of Done at "500 people + 366
birthday pages live … no thin indexed pages". `docs/MASTER-PLAN.md`
lists "more programmatic clusters (celebrity charts at scale …)" among
the things *not* to build, and names "a *curated, sourced* chart museum"
as the acceptable form (lines 591 and 666).

These do not actually conflict once "500" is read as what it says — a
**curated-directory milestone**, not a generation target:

1. 500 is a ceiling on ambition, not a licence to generate 500 pages.
   The directory reaches 500 by adding reviewed people, or it does not
   reach 500. Both outcomes are acceptable; a padded 500 is not.
2. Static templates are permitted — `MASTER-PLAN`'s objection is to
   *mass programmatic clusters*, not to templating. Every person is
   individually reviewed, sourced and measured before publication.
3. A page is indexable only when it independently passes provenance,
   data-quality, uniqueness and content-depth checks. Failing any one of
   them means `noindex`, not a lowered threshold.
4. Phase 5A is 20 people. No expansion begins until Sol Ultra has
   implemented and verified the pilot contract behind `noindex`.

`PLAN.md`'s authority clause already supersedes `MASTER-PLAN` where they
differ, so this is a reading rather than an override. **No unresolved
plan conflict remains, and no blocker is recorded on this point.**

One consequence worth stating plainly: the Definition of Done says "20
sampled charts verified". The pilot is exactly those 20, verified in
full rather than sampled.

---

## 3. Route and information architecture

Two future routes, neither built here:

| Route | Purpose | Indexing at Phase 5B |
| --- | --- | --- |
| `/people/` | The directory: browse, filter, search | `noindex` until the whole set passes |
| `/people/{slug}/` | One person's chart | `noindex` per record until it passes |

`{slug}` is lowercase kebab of the display name (`ada-lovelace`), stable
for the life of the record, and never reused after a removal.

**Directory hierarchy.** One page, three ways in, in this order:

1. **By sign** — twelve pastel discs across the top, the site's existing
   sign identity. This is the only ordering shown by default, because it
   is the one a visitor of an astrology site actually wants.
2. **By discipline** — a quiet row of chips (`science`, `writing`,
   `music`, `art`, `architecture`, `sport`, `public life`), derived from
   each person's own sourced occupation claims.
3. **By name** — an A–Z list, and a text filter that narrows the same
   list in place.

There is no "trending", no "popular", no ranking, and no infinite feed.
The directory is a reading room, not a leaderboard.

**Person page order** — the reader's reason for visiting comes first:

1. Name, one-line identifying description, pastel Sun disc, portrait
   when one is licensed. The description is
   `{discipline} · {country of birth} · {life years}` — the country is
   the **birthplace's** country, taken from the birthplace entity, and
   is never presented as nationality or citizenship, which the pilot
   does not source.
2. **The reading.** The lede, then three to five observation blocks.
3. The chart wheel, in the existing chart-wheel visual language, with
   the house ring absent rather than empty on unknown-time records.
4. The data-quality label — prominent, adjacent to the chart, calm.
5. Birthday cross-link and sign guide.
6. **Evidence disclosure**, closed by default: sources, revisions,
   retrieval time, calendar model, coordinates and their escalation,
   computation convention, error band, and the correction route.
7. Share row.

Method, sourcing and machinery live in step 6 and never in the hero.

---

## 4. Editorial-selection contract

A candidate may enter the directory only when **all** of these hold:

1. Clearly notable, and notable for work rather than for notoriety.
2. An adult. Current minors are excluded outright.
3. Identity unambiguous — one Wikidata entity, one English article, no
   competing person of the same name in the same field.
4. A day-precise birth date carrying an explicit calendar model.
5. Exactly one non-deprecated birth-date value after calendar
   normalisation. Two competing values means conflicting evidence.
6. A birthplace entity with coordinates, or coordinates one
   administrative step up with the downgrade recorded.
7. Sun sign determinable — no solar ingress inside the 24-hour UTC
   window of the birth date.
8. Gregorian-dated, under the Option A rule in §6.
9. Sources limited to Wikidata, Wikipedia and Wikimedia Commons.

**Era separation.** Twenty people across twelve signs means eight signs
carry two. Two same-sign contemporaries share every outer-planet
placement, and with houses, angles and biography excluded their pages
would legitimately converge — a selection failure, not a copy failure.
**Where a sign carries two people, their birth years must differ by at
least forty.** The pilot's tightest pair is Cancer at 45 years; the
widest is Libra at 112.

**Selection is not tokenistic.** The set spans 1815 to 1981, five
continents of birth, and eleven disciplines. Two subjects are living.
Nobody is included for scandal, and nobody's page mentions anything they
are controversial for.

---

## 5. The 20-person pilot

All twenty are unknown-time records: **no allowed source publishes a
birth time for any of them.** That is stated honestly rather than
patched — see §7 and the exact-time design fixture in §9.

| Sign | Person | Born (Gregorian) | Birthplace | Moon | Portrait |
| --- | --- | --- | --- | --- | --- |
| Aries | Vincent van Gogh | 1853-03-30 | Zundert, Netherlands | settled | none (credit names the subject) |
| Aries | Wangari Maathai | 1940-04-01 | Nyeri, Kenya | **uncertain** | CC BY-SA 2.0 |
| Taurus | Rabindranath Tagore | 1861-05-07 | Kolkata, India | settled | public domain |
| Taurus | Ella Fitzgerald | 1917-04-25 | Newport News, USA | **uncertain** | public domain |
| Gemini | Walt Whitman | 1819-05-31 | West Hills, USA | **uncertain** | public domain |
| Gemini | Chien-Shiung Wu | 1912-05-31 | Taicang, China | settled | none (licence outside the set) |
| Cancer | Ida B. Wells | 1862-07-16 | Holly Springs, USA | **uncertain** | public domain |
| Cancer | Frida Kahlo | 1907-07-06 | Coyoacán, Mexico | **uncertain** | public domain |
| Leo | Emily Brontë | 1818-07-30 | Thornton, England | settled | public domain |
| Leo | Rosalind Franklin | 1920-07-25 | Notting Hill, England | **uncertain** | CC BY-SA 4.0 |
| Virgo | Clara Schumann | 1819-09-13 | Leipzig, Germany | settled | public domain |
| Virgo | Katherine Johnson | 1918-08-26 | White Sulphur Springs, USA | **uncertain** | public domain |
| Libra | Mohandas K. Gandhi | 1869-10-02 | Porbandar, India | settled | public domain |
| Libra | Serena Williams | 1981-09-26 | Saginaw, USA | settled | CC BY 2.0 |
| Scorpio | Zaha Hadid | 1950-10-31 | Baghdad, Iraq | settled | none (licence outside the set) |
| Sagittarius | Ada Lovelace | 1815-12-10 | London, England | **uncertain** | public domain |
| Capricorn | Simone de Beauvoir | 1908-01-09 | Paris, France | **uncertain** | CC BY-SA 3.0 |
| Capricorn | Rigoberta Menchú | 1959-01-09 | Laj Chimel, Guatemala | **uncertain** | public domain |
| Aquarius | Virginia Woolf | 1882-01-25 | London, England | **uncertain** | public domain |
| Pisces | Albert Einstein | 1879-03-14 | Ulm, Germany | settled | public domain |

Era separation per doubled sign: Aries 87, Taurus 56, Gemini 93, Cancer
45, Leo 102, Virgo 99, Libra 112, Capricorn 51.

**Eleven of twenty have an undetermined Moon sign.** The uncertain-Moon
state is therefore the common case, not an edge case, and it is designed
as a normal, well-made state rather than a warning.

**Six candidates were screened and excluded**, each by a rule that a
machine can re-check (`docs/phase5/people-pilot/screening.json`):

| Candidate | Excluded because |
| --- | --- |
| Johann Sebastian Bach | Julian-dated (1685-03-21 O.S.) — Option A |
| Leo Tolstoy | Julian-dated (1828-08-28 O.S.) — Option A |
| Srinivasa Ramanujan | Solar ingress Sagittarius→Capricorn at 1887-12-22T03:04:50Z, inside the birth-date window |
| Pelé | Solar ingress Libra→Scorpio at 1940-10-23T13:39:13Z, inside the birth-date window |
| Ludwig van Beethoven | Two live day-precision values: 1770-12-16 and 1770-12-17 |
| Umm Kulthum | Two live day-precision values: 1898-12-31 and 1904-05-04 |

---

## 6. Research and provenance contract

**Allowed sources, and only these:** the Wikidata API/exports, the
Wikipedia API/exports, and Wikimedia Commons for licensed portraits.
Requests identify themselves as
`Zodiacs.org Phase 5 research (admin@zodiacs.org)`. No astrology site,
no Astro-Databank, no celebrity database, no search snippet, no social
network, no fan site, no general web page — not as a source, not as a
cross-check, not as a tiebreak.

**No scheduled ingestion.** There is no cron, no refresh workflow and no
build-time fetch. `docs/phase5/people-pilot/tools/fetch-evidence.mjs` is
run by a person, its output is reviewed, and it lands through an
ordinary pull request. **A production build reads the committed manifest
and nothing else.**

**Cached per accepted fact** (`evidence/{slug}.json`): QID and entity
URL, Wikidata `lastrevid`, the exact properties used (P569, P19, P625,
P106, P18, P570, P17, P131), the English article URL, page id, revision
id and revision timestamp, retrieval UTC, birth-date precision, birth-date
calendar model, every non-deprecated birth-date value, birthplace entity
and normalised label, coordinates with their source entity and
escalation depth, birth-time evidence (or its explicit absence), and full
portrait licence metadata. **No article prose is stored** — validation
fails if any cached string exceeds 400 characters; the longest today is
269.

### Calendar model — mandatory

Every accepted birth date records its Wikidata calendar model verbatim
(`proleptic-gregorian` or `proleptic-julian`). A missing or unrecognised
model fails closed. Where a Julian value is accepted in a later phase,
the conversion is Julian-calendar date → Julian Day Number → proleptic
Gregorian date, and the conversion is stored on the record rather than
recomputed at render time.

### Displayed date versus computed instant — **Option A: exclude**

**No Julian-dated birth enters the Phase 5A pilot.**

Why: for a 20-person set the dual-date state costs a dedicated copy
block, a proof board, a third date field in every downstream surface,
and a permanent three-way consistency check between the displayed date,
the birthday cross-link and the computed instant — to serve zero pilot
records. Excluding is honest, cheap, and leaves the harder decision to
the phase that actually needs it. The rule is written down so the
500-person expansion inherits a decision instead of rediscovering the
problem mid-flight.

Under Option A, displayed date = birthday cross-link key = the date of
the computed instant, and validation asserts all three agree for every
record (the instant may differ by at most one calendar day from the
displayed date, since noon at the birthplace can fall either side of
midnight UTC — Chien-Shiung Wu's noon in Shanghai is 04:00 UTC on the
same day; nobody in the pilot crosses).

**Option B is specified but not active.** When the expansion admits
Julian dates: the displayed date and the birthday cross-link key both
use the historically stated date; the chart is computed from the
converted Gregorian instant; and both dates, the calendar model and the
conversion appear together in the evidence disclosure with the copy in
§9.8. A proof board for that state is rendered so the decision is not
re-litigated later. **Whichever option is active, the same validation
runs: displayed date, cross-link key and computed instant must be
mutually consistent under the stated rule.**

Where a source presents conflicting Old Style / New Style dates and the
correct one cannot be determined from the allowed sources, the person is
excluded or routed to the conflicting-evidence state. Never guessed.

---

## 7. Unknown-time contract

### What the engine actually does

Traced from `src/islands/ChartCalculator.tsx:893`:
`const effectiveTime = input.timeKnown ? input.time : '12:00'`, then
`resolveLocalToUtc(date, effectiveTime, city.tz)`, then
`computeChart({ …, timeKnown: false })`.

- Unknown time is stored as **null**, never as a fabricated 12:00 fact.
  The noon value is a computation boundary, not a claim.
- **The timezone frame is 12:00 civil time at the birthplace's IANA
  zone**, resolved through the complete tzdb history by `Intl`
  (`src/lib/time/localToUtc.ts`). It is *not* noon UTC and *not* a
  modern fixed offset. For pre-standardisation births this yields local
  mean time: Frida Kahlo's noon resolves at −396.6 minutes
  (America/Mexico_City LMT, −6:36:36), Rabindranath Tagore's at
  +353.3 minutes, Ada Lovelace's at −1.25 minutes.
- **A documented imprecision inside that:** tzdb's LMT is the local mean
  time of the *zone's* reference meridian, not of the settlement. Emily
  Brontë's Thornton sits 1.5° west of London's meridian. The pilot
  records this residual per person; the largest is Serena Williams at
  −95.8 minutes (a modern zone, not LMT), worth **0.88° of Moon
  motion** — an order of magnitude smaller than the noon assumption it
  sits inside. Where a birthplace predates modern zone boundaries, the
  zone's own historical LMT applies, because that is what the site's
  engine does for a visitor entering the same city.
- **Rising sign, houses, angles and house-derived interpretation are
  omitted** — not rendered empty, not rendered as zero. The chart wheel
  drops its house ring entirely.
- **Sect is omitted too.** Sect asks whether the Sun was above the
  horizon; under the noon convention the answer would always be "day
  chart", which is an artefact of the assumption rather than a fact.
  Sect returns only when a real birth time does.
- **Nothing implies noon is the birth time.** The words "born at noon"
  never appear. The disclosure says the reference instant is noon and
  says why.

### Error band, measured across the pilot

Maximum apparent motion across the full civil day at the birthplace:

| Body | Max motion across the day | Consequence |
| --- | --- | --- |
| Moon | 11.85°–14.48° | sign can change; degree is a neighbourhood |
| Mercury | ≤ 1.95° | sign stable unless within ~2° of a boundary |
| Venus | ≤ 1.26° | as above |
| Sun | ≤ 1.02° | sign stable by the cusp rule in §8 |
| Mars | ≤ 0.78° | stable |
| Jupiter | ≤ 0.24° | stable |
| Saturn | ≤ 0.13° | stable |
| Uranus / Neptune / Pluto | ≤ 0.06° | stable |

Two rules follow, both enforced in the pilot data:

- **A placement is stated only if its sign holds at both ends of the
  civil day.** Otherwise the uncertain state applies.
- **An aspect is stated only if it holds within orb at both ends of the
  civil day**, and its orb is reported at the noon reference. Aspects
  that exist only at noon are recorded separately and never published.
  Between eight and seventeen aspects survive this test per pilot page.

**Phase 5B accuracy amendment (2026-07-26).** The implementation found
that endpoint-only testing was not conservative enough: a fast body can
change sign and return, or an aspect can leave and re-enter its orb,
inside the same civil day. The committed computation now samples every
hour from the exact opening midnight through the exact next midnight
(25 samples, including both boundaries). A placement, direction or
aspect is publishable only when the relevant state holds across every
sample. Stelliums, elements, modalities, retrograde counts and missing
elements are computed only from placements whose signs are settled
across all 25 samples. This amendment supersedes the endpoint-only
wording above and is enforced by the production validator.

### Missing-coordinate fallback

1. Birthplace entity carries `P625` → use it, escalation 0.
2. No coordinates → escalate **one** step via `P131` to the parent
   administrative entity, record `escalationSteps: 1`, the source entity,
   and a human-readable precision downgrade. One pilot record uses this:
   Frida Kahlo's Coyoacán has no coordinate claim, so Mexico City's are
   used. The displacement is under 10 km — well below the noon
   assumption's own error, and irrelevant to longitudes since angles are
   omitted.
3. Still nothing after one step → **the record is excluded** and routed
   to the insufficient-source state. Two or more escalation steps fails
   closed in validation.
4. Never default to 0,0 and never use a country centroid.

---

## 8. Cusp determinability

**The operative test:** a candidate is cusp-ambiguous if a solar sign
ingress falls anywhere inside the 24-hour UTC window of the accepted
birth date. Birthplace longitude deliberately does not enter — the
window is conservative and will occasionally exclude a candidate whose
sign is in fact determinable. That over-exclusion is accepted.

Every candidate is tested and the result is recorded, including the
ingress instant when one is found. Cusp-ambiguous candidates are
**excluded from the pilot**; two of the six screened exclusions are cusp
cases.

**The cusp-uncertain state is nonetheless designed** (copy in §9.5,
proof board 7), because the 500-person expansion will meet these
constantly — roughly one date in twelve carries an ingress.

Display: the person page names both signs, shows both pastel discs at
equal weight, states the ingress instant in UTC, and reads only the
placements that do not depend on which side the Sun fell. Index
eligibility: **a cusp-uncertain record is never indexable.** It may
exist as a reachable page — the Sun sign is genuinely unknown, which is
a legitimate thing to show — but it does not enter the sitemap or the
search index, because a page whose headline fact is undetermined is not
a page a search engine should be sent.

---

## 9. States and copy deck

Every string below is final English. Placeholders in `{braces}` are
filled from the manifest.

### 9.1 Directory — default

- H1: **People**
- Lede: "Charts for people whose birth dates are a matter of public
  record. Each one is computed here, from a sourced date, with the parts
  we cannot know left visibly empty."
- Sign filter label: "By sign"
- Discipline filter label: "By discipline"
- Search field label: "Find a name"
- Search placeholder: "Start typing a name…"
- Count line: "{n} people. All birth times unknown unless a page says
  otherwise."
- Card: name, one-line description, pastel Sun disc, and a mono line
  reading "{Sign} · born {date}".
- Footer line: "Something wrong on one of these pages? Ask us to correct
  or remove it." → `people@zodiacs.org`

### 9.2 Directory — filtered

- Applied-filter chip: "{Sign}" / "{Discipline}", each with a clear
  control labelled "Clear {filter}".
- Result line: "{n} of {total} people."
- Reset: "Show everyone"

### 9.3 Directory — empty result

- H2: "Nothing matches that yet."
- Body: "This directory is small on purpose — every person here was
  researched and reviewed one at a time. Try another sign, or clear the
  filters."
- Action: "Show everyone"

### 9.4 Person page — unknown time (the pilot's normal state)

- H1: "{Name}"
- Identity line: "{Discipline} · {Country} · {years}"
- Data-quality label, beside the chart:
  **"Birth date sourced. Birth time unknown."**
  Sub-line: "Without an hour there is no rising sign, no houses and no
  angles. Everything below is what the day itself settles."
- The reading: lede plus three to five observation blocks, composed from
  that person's own facts (§11).
- Chart caption: "Positions at 12:00 civil time in {Place} — a reference
  instant, not a birth time."

### 9.5 Person page — uncertain Moon (11 of 20)

Replaces the Moon block, and the data-quality label gains a third line:

- Label: **"Birth date sourced. Birth time unknown. Moon sign
  undetermined."**
- Block heading: "The Moon is genuinely open"
- Body: "The Moon crossed from {SignA} into {SignB} during that day at
  the birthplace, travelling {n}° between one midnight and the next. A
  birth time would settle it in a second; there isn't one. So the Moon
  stays unnamed here — the alternative is a guess wearing the clothes of
  a fact."

### 9.6 Person page — cusp-uncertain (designed, unused in the pilot)

- Label: **"Birth date sourced. Sun sign undetermined."**
- Heading: "Two signs, and the day cannot choose"
- Body: "The Sun crossed from {SignA} into {SignB} at {utc} — inside
  the day {Name} was born. Which sign the Sun was in depends on the
  hour, and the hour is not recorded. Both discs are shown at equal
  weight because the honest answer is both."
- Index consequence, shown in the disclosure: "This page is not listed
  in search. Its central fact is undetermined."
- `{utc}` is rendered **to the minute** (`1887-12-22 03:04 UTC`).
  Millisecond precision is spurious for an ephemeris boundary and reads
  as machine spill inside a sentence; the full value stays in the
  record and in the disclosure.

### 9.7 Person page — exact time (design fixture only)

- Label: **"Birth date and time sourced."**
- Sub-line: "With an hour, the chart gains its rising sign, houses and
  angles."
- **Every proof of this state is marked "Design fixture — not a real
  person" in the board and in the page's own chrome.** It uses the
  repository's existing non-production fixture values (1990-06-15,
  08:30, New York) and appears in no manifest, no directory and no
  index. If a real exact-time person is ever sourced under the allowed
  policy, the fixture is retired the same day.

### 9.8 Person page — dual date (specified, inactive under Option A)

- Label: **"Birth date sourced, Old Style."**
- Body: "{Name}'s birth was recorded as {julianDate} in the Julian
  calendar, which was still in local use. The same moment is
  {gregorianDate} in the calendar we use now — the two run {n} days
  apart. The date shown is the one that was written down; the chart is
  computed from the moment it names."
- Disclosure rows: stated date, calendar model, converted instant,
  conversion method, and which of the two keys the birthday cross-link
  uses.

### 9.9 Person page — insufficient source

- H2: "Not enough to compute a chart"
- Body: "The public record gives {Name}'s birth as {what is known} —
  which is not precise enough to place a single sky. Rather than round
  it to a day and pretend, this page stops here."
- No wheel, no placements, no sign disc. Never indexable.

### 9.10 Person page — conflicting evidence

- H2: "The sources disagree"
- Body: "Two different birth dates are on the public record for {Name}:
  {dateA} and {dateB}. Neither is marked as superseded, and we have no
  way to choose between them from the sources this site allows. Both are
  shown; no chart is computed from either."
- Never indexable.

### 9.11 Person page — withheld

Reached when `suppression.status` is `noindex`.

- H2: "This page is not listed"
- Body: "At the subject's request, this page is no longer listed in
  search or in the directory. Nothing about that request implies
  anything about the subject."
- The page renders normally otherwise. **The copy never suggests
  wrongdoing.** After a full removal the route returns 410 Gone.

### 9.12 No licensed portrait (3 of 20)

No placeholder silhouette, no initials block, no generated likeness.
The lockup uses the pastel Sun disc at 96 px against the existing
atmospheric surface, and the space the portrait would occupy is simply
not there. A quiet mono line in the disclosure states the reason:
"No portrait: {reason}."

### 9.13 Rendered portrait attribution

Beneath every displayed portrait, always visible, never hover-only:

> {Creator} · {Licence} · Wikimedia Commons

Creator links to the Commons file page. Licence links to the licence
deed for CC BY and CC BY-SA; public-domain files link the file page
instead. Font is the mono data face at 11px, `--ink-mute`. It is part of
the image lockup, so it cannot be cropped away.

- **Share cards:** the credit is baked into the card image for any
  CC BY / CC BY-SA portrait. Where the card layout cannot carry a legible
  credit, **the portrait is dropped from the card** and the pastel disc
  is used instead. The card never ships an attributed image without its
  attribution.
- **Print:** the credit prints. `@media print` keeps it visible and
  expands the licence link to its URL.

### 9.14 Evidence disclosure

Uses the existing `EvidenceDisclosure.astro` pattern, closed by default,
keyboard- and no-JS-safe.

- Summary label: "Where this comes from"
- Description: "Sources, revisions, and exactly what the chart assumes"
- Rows: source article + revision id + retrieval UTC; Wikidata entity +
  revision; birth date as stored; calendar model; birthplace entity;
  coordinates and their source entity (with the escalation note where
  one applies); IANA zone and the resolved offset; reference instant;
  what was omitted and why; the per-body error band; engine and aspect-table
  versions; portrait licence; and the correction route.
- Closing line: "Something wrong here? Ask us to correct or remove it."

### 9.15 Share row and OG card

- Share text: "{Name}'s chart, computed from a sourced birth date"
- OG card, 1200×630, in the existing v2 card language: name, pastel Sun
  disc, `{Sign} {degree}°`, and the mono line "Birth time unknown". No
  portrait unless the licence is public domain or CC0 — attribution on a
  social card cannot be relied upon to travel with the image.

### 9.16 Error and edge states

- **Broken portrait image:** the `<img>` carries width/height and an
  `onerror` that removes the figure entirely, falling back to the
  no-portrait lockup. No broken-image icon, no empty box.
- **Offline:** the person page is an ordinary static HTML navigation, so
  the existing network-first service worker serves the offline fallback.
  Chart positions are already in the HTML; nothing about the page needs
  the network.
- **No JavaScript:** everything above is server-rendered. Filters
  degrade to real links (`/people/?sign=leo` renders server-side), the
  search field is `hidden` without JS, and the disclosure is a native
  `<details>`.

---

## 10. Portrait, licensing and attribution rules

Portraits are optional. A page must be beautiful without one.

**Accepted licences:** public domain, CC0, CC BY (any version), CC BY-SA
(any version). Nothing else. Fair use, unverified thumbnails, copied
search results and AI-generated likenesses are prohibited outright.

**Four fail-closed rules, all exercised by the pilot:**

1. Licence outside the accepted set → no portrait. *(Chien-Shiung Wu,
   "No restrictions"; Zaha Hadid, "FAL".)*
2. Attribution-bearing licence with no licence-deed URL on the file page
   → no portrait.
3. No creator recorded → no portrait.
4. **Creator equals the subject → no portrait.** Commons often records
   the subject as the `Artist` when the file is a photograph of that
   person's own work; rendering "Vincent van Gogh · CC BY-SA 4.0" would
   misstate who licensed the reproduction. *(Vincent van Gogh.)*

Seventeen of twenty pilot records carry a usable portrait; three do not,
and their reason is recorded on the record.

**Storing licence metadata is not compliance.** CC BY and CC BY-SA
impose an obligation on the published page, so the manifest carries a
`renderedAttribution` string and validation asserts it contains the
creator and the source. §9.13 governs where it appears.

---

## 11. Content-depth thresholds, and the proof they are satisfiable

Measured across the actual 20 pilot pages, excluding every shared
boilerplate string:

| Measure | Threshold | Measured | Headroom |
| --- | --- | --- | --- |
| Original words per page | ≥ **250** | 332–404 (median 365) | +33% at the minimum |
| Distinct substantive statements | ≥ **8** | 12–15 | +50% at the minimum |
| Pairwise similarity | ≤ **0.32** | max **0.3048** | 5% |

**Metric.** 5-word shingle Jaccard similarity — the metric
`scripts/check-programmatic-uniqueness.mjs` already applies to the 78
compatibility pages, where the accepted ceiling is 0.42. People pages
are held to a stricter number because they concern named individuals.
The worst pair is `rosalind-franklin` / `katherine-johnson` at 0.3048;
the second-worst is `emily-bronte` / `clara-schumann` at 0.2309.

**What counts as a substantive statement:** degree-level placement
detail, aspect geometry with orb, classical dignity, and chart-pattern
observation (stellium, element/modality balance, retrograde state,
missing element). **Excluded:** restated sign keywords, and anything
derived from houses, angles or sect — none of which exist on an
unknown-time record.

**Sect is excluded despite appearing in the brief's list**, because it
is time-dependent (see §7). The floors are met comfortably without it.

**Jointly satisfiable: yes, empirically.** The thresholds were set after
measuring, at roughly 15–25% inside the observed extremes — loose enough
that ordinary variation in a future person cannot trip them, tight
enough that a genuinely thin page fails closed. No copy was padded to
reach them: the word counts fall out of five fact-keyed blocks.

**How the variety is produced.** Deterministic composition from a
curated phrase library keyed to the facts — the same house practice the
daily engine uses (`PLAN.md`, Phase 1). Each block draws its sentence
frame and its interpretive gloss from independent per-page seeds, so two
pages sharing one fact still differ everywhere else. The first
composition pass, with single-rendering glosses, measured 0.5152 — above
even the compatibility ceiling. Expanding each gloss to three renderings
and decorrelating the selectors brought it below the 0.32 ceiling. **That first
number is why era separation is a selection rule and not a copy
tweak.**

---

## 12. Personal data — practitioner draft, requires legal review

> **This section is a practitioner's draft, not legal advice. It must be
> reviewed by a qualified adviser before any People route leaves
> `noindex`.** Writing it down does not clear the question.

**What is processed.** Name, birth date, birthplace and coordinates,
disciplines, life dates, and a portrait where licensed — for identified
public figures, two of whom are living. Everything derives from
Wikidata, Wikipedia and Wikimedia Commons, all of which publish it
already.

**Why this is thought lawful.** Legitimate interests: publishing
sourced, publicly available factual information about public figures,
for a reference and educational purpose, in a form that adds
computation rather than new personal disclosure. No special-category
data is processed; §1 forbids health, sexuality, criminality and
comparable material outright, and validation enforces the vocabulary
ban.

**The honest complication.** An astrological "reading" of a named
individual sits closer to profiling than the astrology framing makes it
feel. Three design choices are the mitigation, and are load-bearing
rather than cosmetic: no page makes a claim about the person's
character, health, relationships or conduct; no page asserts causation
between a placement and a life event; and the copy describes the sky,
not the subject.

**Retention.** The manifest is versioned in the repository, so history
is permanent by construction — which is a fact to disclose, not to hide.
A removal deletes the person's record from the generated surfaces and
sets a retained tombstone; the git history still contains the earlier
commit, and that limitation is stated in §13 rather than glossed.

**Subject rights.** §13 is the access, rectification, erasure and
objection path. It is deliberately low-friction — no account, no form,
no proof-of-identity demand for a removal request.

**Open questions for the adviser:** whether legitimate interests is the
right basis or consent is required for living subjects; whether an
astrological reading of a named person constitutes profiling under
Article 4(4); whether a repository history satisfying erasure needs a
history-rewrite commitment; and whether any pilot subject's jurisdiction
imposes a stricter personality right.

---

## 13. Subject correction and removal

Full procedure and intake format:
`docs/phase5/people-pilot/corrections/README.md`. Summary:

- **Published route:** `people@zodiacs.org`, linked from the evidence
  disclosure on every person page, from the directory footer, and from
  `/about/`.
- **Commitment:** best-effort review, removal requests first. **No
  numeric SLA is published** — a missed public deadline on a page about
  a living person is worse than no deadline. The internal target
  (acknowledge in a week, act on subject removals in two) stays in this
  handoff and never appears in reader-facing copy.
- **Correction:** re-verify, edit the manifest, re-run the four tools,
  rebuild, confirm the fact changed on the page, its cross-link, its OG
  card and its search record.
- **Withholding:** `suppression.status: noindex` — route resolves,
  `noindex, nofollow`, out of the sitemap, out of the search index, out
  of the birthday cross-link.
- **Removal:** `suppression.status: removed` — route stops generating
  and returns 410; sitemap row, search record, birthday cross-link,
  related-people rails, OG asset and share artifacts all removed;
  submitted through IndexNow and the search console removal tool.
- **Removal is honoured regardless of whether the Wikidata record still
  exists**, and regardless of whether the facts were correct.
- **The decision is retained forever.** Validation fails closed if a
  removed slug reappears in any generated surface, so a later ingestion
  pass cannot silently reinstate a person.

---

## 14. Responsive, visual and motion specification

Reuses the existing Cosmic Void system entirely. **No new design
dependency, no new colour, no new font, no new component library.**

- **Materials:** `#060709` void surfaces, `.shell`/`.core` bezels for the
  person hero only, `.tile` for directory cards, hairline borders, the
  twelve pastel sign hues as the only chroma, EB Garamond display,
  Instrument Sans body, JetBrains Mono for data rows. No gold anywhere.
- **360 / 390 px:** single column. Portrait 96 px round, inline with the
  name. Sign filter is a horizontally scrollable disc rail. Directory
  cards stack full width. Data rows wrap to two lines.
- **781 px:** directory becomes two columns. Person page keeps one
  column; the chart wheel caps at 460 px and centres.
- **1280 px:** directory becomes three columns with the sign rail across
  the top. Person page becomes reading column plus a sticky right rail
  carrying the identity lockup, portrait, credit and data-quality label.
- **Motion:** transform and opacity only, using the existing 180/420/800 ms
  tokens. The directory's filter transition is a 180 ms opacity change on
  the result list. The person page has **one** orchestrated moment — the
  chart wheel's existing entrance — and nothing else. No parallax, no
  count-ups, no scroll-jacking.
- **`prefers-reduced-motion: reduce`:** every state renders settled and
  final on first paint. The wheel entrance does not play. Nothing depends
  on an animation completing.
- **The removed accessory** (phase discipline, one per phase): the
  directory carries no "related people" carousel. Related people appear
  only as a plain list of at most three same-sign names at the foot of a
  person page.

---

## 15. Accessibility and no-JavaScript contract

- Every interactive control is a real `<a>` or `<button>`, minimum 44×44
  px touch target, visible focus ring using the existing 2px `--ink-0`
  outline at 3px offset.
- Heading order is strict: one `h1` per page, blocks are `h2`, block
  sub-parts `h3`. The evidence disclosure summary is not a heading.
- The pastel Sun disc is decorative (`alt=""`); the sign is always
  present as text beside it.
- Portraits carry `alt="{Name}"` and nothing else — no description of
  appearance.
- The data-quality label is a `<p>` with `role="status"` only when it
  changes client-side; on a static page it is ordinary prose, announced
  in reading order immediately after the chart.
- Screen-reader wording for the uncertain-Moon state reads the full
  sentence, not a symbol: "Moon sign undetermined. The Moon crossed from
  Aries into Taurus during that day."
- 200% zoom reflows to a single column with no horizontal scrolling and
  no clipped controls at every required width.
- **No JavaScript:** the complete directory, all filter results, every
  person page, the chart wheel (server-rendered SVG), the data-quality
  label and the evidence disclosure all work. Only the type-ahead search
  field requires JS and is hidden without it.
- Zero horizontal overflow at 360, 390, 781 and 1280 px, asserted in the
  proofs.

---

## 16. Search and index eligibility

A person page is indexable only when **every one** of these passes:

1. `suppression.status === 'active'`
2. Sun sign determinable (no cusp ambiguity)
3. Birth date day-precise, one live value, explicit calendar model
4. Displayed date, cross-link key and computed instant consistent
5. Birthplace coordinates present within one escalation step
6. Original words ≥ 250
7. Substantive statements ≥ 8
8. Pairwise similarity ≤ 0.32 against every other person page
9. Birthday cross-link resolves to a committed page
10. Portrait either absent or fully licensed with a rendered credit

Any failure → `noindex, nofollow`, absent from the sitemap, absent from
the search index. **The threshold is never lowered to admit a page.**

The directory is indexable only when at least twenty person pages are.

**Every Phase 5A record is `indexEligibility.eligible: false`**, blocked
by `phase-5a-is-design-only — no People route exists yet`. That is not a
quality judgement; it is the phase boundary.

---

## 17. Schema, sitemap, OG, canonical and cross-link contract

- **JSON-LD.** `/people/{slug}/`: `Person` (name, description, birthDate,
  birthPlace, sameAs → Wikidata + Wikipedia) plus `BreadcrumbList`; the
  page itself is `WebPage`, not `Article`. `/people/`: `CollectionPage`
  + `ItemList`. Author is the existing truthful Organization; no human
  editor is invented. **`birthDate` is emitted only when day-precise**,
  and never for a conflicting-evidence record.
- **Sitemap.** Added to `src/pages/sitemap.xml.ts` alongside the other
  families, with truthful `lastmod` from `reviewedAtUtc`. Only eligible
  pages appear. Nothing is added in Phase 5A.
- **Canonical.** Self-canonical, `https://zodiacs.org/people/{slug}/`,
  trailing slash, matching the site's existing convention.
- **hreflang.** None. Phase 5 is English-first; no localised People
  route, translation or alternate is created, and Russian/Arabic
  activation is out of scope.
- **OG.** One 1200×630 card per person, generated by the existing
  `scripts/build-og-void.mjs` pipeline into `public/assets/og/v2/people/`
  and verified by `scripts/verify-og-cards.mjs`. Card set stays inside
  the documented 15 MB generated-asset ceiling.
- **Birthday cross-link, both directions.** Person → birthday: the
  `/birthday/{month}-{day}/` route derived from the Gregorian date; all
  20 pilot links resolve against committed pages. Birthday → person: a
  quiet "People born on this date" list appended to the birthday page,
  **built from the manifest, capped at three names, and omitted entirely
  when empty.** The existing 366 birthday pages are otherwise unchanged;
  Phase 5A changes none of them.
- **Search index.** One record per eligible person, name and identity
  line only. No record for withheld or removed people.

---

## 18. Repository check commands

Taken verbatim from `SETUP.md` ("Local baseline", "production-equivalent
integrity gates") and `CLAUDE.md` ("Checks"). These are the exact
commands, not approximations:

```sh
npm ci
npm run build
npm run check
npm test
```

```sh
node scripts/check-dist.mjs
npm run schema:check
node scripts/report-bundles.mjs --fail
```

`npm run build` already runs the drift gates through `prebuild` and
`postbuild`: the editorial verify/replay/freshness suite, the events and
OG verifiers, the registry/analytics/widget generators, then
`check-dist.mjs`, `check-i18n-r2-ru.mjs`,
`bake-thesis-disclosure-static.mjs --check`, `schema:check`, and
`report-bundles.mjs --fail`.

Pilot-specific tooling (research only, never part of a build):

```sh
node docs/phase5/people-pilot/tools/fetch-evidence.mjs
node docs/phase5/people-pilot/tools/compute-astro.mjs
node docs/phase5/people-pilot/tools/compose-copy.mjs
node docs/phase5/people-pilot/tools/build-manifest.mjs
node docs/phase5/people-pilot/tools/validate-pilot.mjs
```

**Browser and rendering tooling** for the Stage 2 proofs is the
repository's own: `playwright-core` from the committed lockfile driving
a system Chromium through `tests/visual/browser.mjs`
(`findChromium`, `STABLE_CHROMIUM_ARGS`) — the same path
`tests/phase4-sharing-drive.mjs` and the visual suite use. **No new
rendering dependency is added.**

---

## 19. Sol Ultra implementation sequence

Ordered, each step independently verifiable:

1. **Data in.** Add `src/data/people.json` from
   `docs/phase5/people-pilot/manifest.json`, plus a Zod schema matching
   `docs/phase5/people-pilot/schema.json`. Build fails on any schema
   violation. No network access at build time.
2. **Port the validator.** Move `tools/validate-pilot.mjs` into
   `scripts/` as a real gate wired into `prebuild`, keeping every check.
   Add its unit tests.
3. **Compute at build time.** Reuse `src/lib/engine` through the
   server-ephemeris path; assert the computed positions match the
   manifest to 1e-9. Never recompute from the network.
4. **Person route, `noindex`.** `/people/{slug}/` for the 20, rendering
   §9.4/§9.5 with the existing chart wheel, `EvidenceDisclosure`, and
   `SignIcon`. `noindex, nofollow` on every page. No sitemap row, no nav
   entry, no search record yet.
5. **Directory route, `noindex`.** `/people/` with server-rendered sign
   and discipline filters as real links; the type-ahead field is
   progressive enhancement.
6. **Portraits.** Download the 17 licensed files into
   `public/assets/people/`, render the §9.13 credit, and add a licence
   manifest the dist gate checks. A file whose credit cannot render must
   fail the build, not ship uncredited.
7. **OG cards.** Extend `scripts/build-og-void.mjs` with the People
   template; verify through `scripts/verify-og-cards.mjs`; confirm the
   15 MB ceiling holds.
8. **Cross-links.** Add the capped "People born on this date" block to
   the birthday template, omitted when empty. Change nothing else on
   those 366 pages.
9. **Correction route.** Publish `people@zodiacs.org` in the three
   places named in §13 and commit the empty intake directory.
10. **Proofs and gates.** Browser drive at 360/390/781/1280 asserting
    zero overflow, no-JS coverage, reduced motion, keyboard traversal
    and 200% zoom. Three-run mobile Lighthouse ≥95 on both templates.
11. **Fable review**, then — and only then — a separate owner-approved
    change to lift `noindex`.

**Do not** begin the expansion past 20, add a localised route, add a
scheduled ingestion job, or lift `noindex` inside this sequence.

---

## 20. Acceptance criteria for Phase 5B

- [ ] `src/data/people.json` validates against the committed schema;
      build fails on violation.
- [ ] The ported validator runs in `prebuild` and passes all 406 checks.
- [ ] Build-time computed positions match the manifest to 1e-9.
- [ ] 21 routes exist (`/people/` + 20), all `noindex, nofollow`, none in
      the sitemap, none in the search index, none in the nav.
- [ ] All 20 pages render fully without JavaScript, including filters.
- [ ] Zero horizontal overflow at 360, 390, 781 and 1280 px.
- [ ] Reduced motion renders every state settled on first paint.
- [ ] Keyboard traversal reaches every control with a visible focus ring;
      200% zoom reflows to one column.
- [ ] No unknown-time page contains a rising sign, house, angle or sect
      claim — asserted, not reviewed by eye.
- [ ] All 17 portraits render their credit; the other 3 render the
      no-portrait lockup.
- [ ] Every birthday cross-link resolves in both directions; the birthday
      block is absent where no person matches.
- [ ] Three-run mobile Lighthouse ≥95 performance / accessibility / SEO
      on both templates.
- [ ] `npm run build && npm run check && npm test` green, plus
      `check-dist.mjs`, `schema:check`, `report-bundles.mjs --fail`.
- [ ] `people@zodiacs.org` is live and linked from all three places.
- [ ] Fable review passes with no open P0 or P1.

---

## 21. Bounded Phase 5B checklist

Phase 5B is **the noindex pilot only**. It is complete when the 20 people
are implemented, verified and reviewed behind `noindex` — not when they
are indexed, and not when the set grows.

1. Steps 1–11 of §19.
2. Every box in §20.
3. A written decision on the Julian rule for the expansion: keep Option
   A, or activate the Option B specification in §6/§9.8.
4. Legal review of §12 completed and recorded, with any required change
   made **before** any route leaves `noindex`.

Explicitly out of scope for 5B: person 21 onward, localisation, the
`noindex` lift, scheduled ingestion, and Phase 6.

---

## 22. Assumptions, blockers and backlog

**Assumptions**

1. Wikidata's non-deprecated ranks are a reliable signal of a settled
   date. Deprecated values (Tagore's 1861-05-06, Ella Fitzgerald's 1918)
   are correctly ignored; two live values mean genuine conflict.
2. `people@zodiacs.org` can be provisioned on the existing domain. If
   the operator prefers a different published address, only §13 and the
   three link sites change.
3. Noon civil time at the birthplace is the right convention because it
   is what the site's own calculator already does. Changing it later
   would make People pages disagree with the calculator, which is worse
   than any accuracy gained.
4. `reviewedAtUtc` is stamped 2026-07-25 for all 20 — the date this
   pilot was assembled and checked.

**Blockers — none for Phase 5A.** Two must clear before any route leaves
`noindex`:

- **B1 (legal).** §12 needs qualified review. Design-blocking for the
  indexing lift only, not for implementation behind `noindex`.
- **B2 (operational).** `people@zodiacs.org` must exist and be
  monitored before a page about a living person is published, indexed or
  not. A correction route that nobody reads is worse than none.

**Backlog, deliberately not in 5A or 5B**

1. Exact-time people. No allowed source publishes a birth time for any
   of the 20. If Wikidata gains one (P569 with hour precision), that
   record gains rising sign, houses, angles and sect, and the design
   fixture retires.
2. Dual-date (Option B) activation, with its own proof board already
   rendered.
3. Expansion past 20 — needs a second research pass and a fresh
   similarity measurement across the larger set, since the ceiling gets
   harder as the set grows.
4. A "people born near you" or map view. Attractive, and it would put
   birthplace coordinates to a use nobody asked for. Not now.
5. Non-English People routes.

---

## 23. What this handoff did not touch

No production route, collection, navigation entry, sitemap record,
search-index record, feature flag, environment variable, migration,
scheduled job, email, deployment or indexing submission. No change to
the 366 birthday pages, the Registry wing, any locale tree, or any
existing template. `npm run build`, `npm run check` and `npm test` were
run to prove exactly that: the working tree's only change is
documentation and research material under the four authorised paths.
