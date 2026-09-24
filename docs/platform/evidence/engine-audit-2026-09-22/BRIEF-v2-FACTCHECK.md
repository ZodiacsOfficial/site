# Fact-check of the version 2 brief's draft, 2026-09-23

An independent reviewer checked the draft of
[`ENGINE-AND-PLATFORM-BRIEF.md`](../../ENGINE-AND-PLATFORM-BRIEF.md) before it
was committed. It was an AI agent with no part in the audit or the draft, given
the draft and read access to the repository. It was told to assume nothing in
the draft was true, to list the riskiest premises and attack them first, and
to check every claim about the repository, every external fact and every
internal cross-reference.

It found 26 problems. Seven it marked false. Every item was acted on. The
author re-checked the consequential ones before accepting them: the `@zodiacs`
npm scope (registry query), the share token (`src/lib/share-positions.ts`,
`api/calendar/transits.ts`), the methodology wording, the WebMCP gating in
`src/layouts/Base.astro`, and which agents caught the shared premises
(`LEDGER.md`). The dispositions follow the report.

The report below is condensed. Each finding keeps its verdict, the quoted
text and the evidence; the replacement wording it proposed is summarised or
dropped where the brief adopted it, and the dispositions say what the brief
now says. Session-specific paths are rewritten as in this directory's README
(`<scratch>`, `<audit>`), and the phase-1 prompt is cited under its committed
name, `tools/engine-audit-phase1.js`. The reviewer's probe scripts (`lmt.mjs`,
`asc.py`, `ams.mjs`) stayed in the session scratch and are not committed.

---

## The report

I read the repository at `origin/main` 25eaa205 using `git show`. The local
`main` checkout is at f2256c60, one day behind. I modified nothing.

### Riskiest premises (checked first)

1. **The inventory in §1** (empty npm scope, what PR #556 contains, the WebMCP
   polyfill). Three of these statements are false.
2. **The audit record as the evidence base** (its paths, finding ids,
   `tools/engine-audit-phase1.js`). None of it is committed anywhere yet.
3. **R1's mechanism and numbers.** The mechanism holds. "Neither takes a
   longitude" is false, and the acceptance values don't match the site's own
   city data.
4. **The competition premise** ("AI agents: little or nothing", "what no
   current tool offers"). This is false: over 100 astrology MCP repositories
   exist, some MIT-licensed and not built on Swiss.
5. **External platform facts.** schema.org `WebAPI` is no longer pending. The
   Google FAQ statement is out of date. The JOSS/arXiv description is
   misleading. npm trusted publishing and the MCP Registry namespace are
   described correctly.
6. **Precision and process premises.** The 24.5 s compile was measured in
   Node, not a browser. The two Swiss premises in R8 are real, but who caught
   them is misstated.

### Findings, most serious first

**1. FALSE – the `@zodiacs` npm scope is not empty.** §1: "Not on npm (404);
nothing is published under the `@zodiacs` scope." Also §10.3: "create or
confirm the `zodiacs` organisation on npm". registry.npmjs.org/@zodiacs%2fsdk
returns 200: versions 1.0.0-rc.1, 1.0.0 and 1.0.1, created 2026-06-05,
maintainer `zodiacs` <admin@zodiacs.org>. Its description is token language
("…canonical Zodiacs.org registry, native Solana Zodiacs assets, and official
bridged Base representations"), and its keywords include solana, spl, wormhole
and bridged-assets. `/-/org/zodiacs/package` returns `{"@zodiacs/sdk":"write"}`.
The site installs it from npm (`package.json` devDependencies,
`package-lock.json:4285-4287`). Only `@zodiacs/engine`, `mcp-server`, `cli`,
`ai-tools` and `wheel` return 404. Replace §1 with: "`@zodiacs/engine` is not
on npm (404). The `@zodiacs` scope already exists: the npm account `zodiacs`
(admin@zodiacs.org) publishes the token SDK `@zodiacs/sdk` 1.0.1, whose
description and keywords are token language. Platform packages published in
this scope would sit beside it (R6, §6)." Replace §10.3 with a decision on
the account, the shared scope, publish rights and first publishes.

**2. FALSE – the audit record and PR #556.** "PR #556 (… and this audit and
brief as documents) is open…"; "6. Commit the audit and both briefs. Done in
PR #556."; "The first brief is kept … in the audit record at
`docs/platform/evidence/engine-audit-2026-09-22/`"; R8's evidence
"`tools/engine-audit-phase1.js` in the audit record". PR #556 (head 39b7a127)
changes 100 files, all under `docs/platform/evidence/precision-*`,
`examples/precision-alpha`, `public/precision-preview` and `scripts`; none is
an audit or brief file. The directory exists neither on 25eaa205 nor on the PR
branch. The audit exists only in `<audit>/deliverable/`, and the phase-1
prompt only in the session's workflow directory. The corpora B1 lists under
"already have" (the 240-row corpus, the 3,128-case grid, the tzdb divergence
list, the 2024 aspect scan) are also audit scratch, not repository files.

**3. FALSE – R1 "Neither takes a longitude, so neither can use the
birthplace's."** `node_modules/@zodiacs/engine/dist/geo.d.ts:37-43`:
`LocalBirthInput.longitude?: number`. `geo.js:284-305`: `resolveBirth` calls
`resolveLocalToUtc(date, time, timeZone)` and uses the longitude only for the
chart. The site's resolver takes `(date, time, tz)` only
(`src/lib/time/localToUtc.ts:121-125`). Replace with: "The site's resolver
takes no longitude. The SDK's `resolveBirth` receives the birthplace longitude
but uses it only for angles and houses; it converts the time with the zone
alone."

**4. FALSE / inconsistent – R1 numbers and the 1.1 acceptance test.** The
site's GeoNames shards store coordinates to 0.01°: Buffalo −78.88, Brest
−4.49, Omaha −95.94, NYC −74.01, Paris 2.35, Chicago −87.65. Those give local
mean time of −315.52, −17.96, −383.76, −296.04, +9.40 and −350.60 minutes;
Node's Intl applies −296.033, +9.350 and −350.600. So the Omaha gap is 33.16
min, and Brest and Omaha fail ±0.01 by 0.02. Paris differs from tzdb's
+0:09:21 (the Observatory meridian) by 0.05 min, and Paris in 1880 is inside
Europe/Paris's LMT era (until 1891-03-16), so the new rule changes it by 3 s.
The in-progress test (`<scratch>/lmt-fix/src/lib/time/localToUtc-birthplace.test.ts:9-27`)
already uses −17:58 and −6:23:46.

**5. OK-but-imprecise – "degrees of Ascendant".** 4.9°, 6.8° and 8.3° are
degrees of sidereal time (RAMC), not of Ascendant. Computed Ascendant shifts
(`asc.py`): Buffalo 3.7°–8.9°, Brest 5.0°–14.5°, Omaha 6.5°–14.6°. The chance
the rising sign changes is 1 in 6.1, 1 in 4.4 and 1 in 3.6; the ÷30° rule is
exact only when the shift is in sidereal degrees.

**6. FALSE – A2 "(the polyfill already serves search)".**
`src/layouts/Base.astro:325-333` registers the tool only if
`document.modelContext || navigator.modelContext` already exists, and only
when `locale === 'en'`. `@mcp-b/webmcp-polyfill` is a devDependency
(`package.json:165`), used only in `src/lib/webmcp/polyfill.test.ts` and
`tests/webmcp-drive.mjs`.

**7. FALSE – the competitive landscape.** "| AI agents | little or nothing |";
"§4 lists what no current tool offers"; B2: "birth times are uncertain and
every tool hides it." GitHub search "astrology mcp", 2026-09-23: 106
repositories, including hosted servers (navamsha.fastmcp.app/mcp;
rokoss21/astrovisor-mcp over Streamable HTTP); aryaminus/astro (an MCP server
plus an Agent Skill, 18 tools and a REST API); MIT-licensed engines not built
on Swiss (prashantpandey-creator/vedic-astrology-mcp, "Skyfield + JPL DE440s.
No paid/copyleft ephemeris"; Erfix404/hermes-astrology; breezefeng/deepnatal);
and listen-hai/astro-mcp ("honest degradation when the birth time is
unknown"). The site's own `moon-certainty.ts`, which B2 cites, already shows
uncertainty.

**8. FALSE – S1 "schema.org's pending `WebAPI` type".** schema.org release data
marks WebAPI as pending through 30.0. It moved to core in 30.1, released
2026-09-16 ("Promote terms from pending to GA").

**9. MISLEADING (out of date) – S2.** "In 2023 Google limited FAQ rich results
to well-known government and health sites and dropped HowTo rich results."
developers.google.com/search/updates, entry of 8 May 2026: "This feature will
no longer appear in Google Search starting May 7, 2026."

**10. MISLEADING – the 24.5 s compile.** `compile-D.time` in the audit records
wall=24.53 s in Node, compiling the DE440s kernel to a 1.6571 MiB pack.
Version 1 says "24.5 s measured in Node". The browser compile is an unrun
probe (v1 M2a e).

**11. MISLEADING – "That is human peer review of the methods, with citable
DOIs."** JOSS reviewers check installation, functionality, documentation and
tests; JOSS papers "must not focus on new research results", and submissions
need "evidence that the software is being used for research". arXiv is
moderated, not refereed. For peer review of the methods, submit to a refereed
journal (e.g. Astronomy and Computing).

**12. MISLEADING – the privacy claim.** "That removes a licensing cost and a
personal-data liability at the same time"; "Allowed now: … 'computed on your
device'". `api/assistant.ts:188-206` forwards a "Visitor's chart summary" to
the model provider; `api/calendar/transits.ts` computes on the server; Phase
3.3 adds a hosted API that receives birth data.

**13. MISLEADING (incomplete) – R2 cites only `public/llms.txt`.**
`src/pages/methodology/index.astro:185`: "the same convention professional
software applies … can differ by a few clock minutes"; R1 measures 19 to 33
minutes. The `lmtNotice` string, "the same convention professional software
uses", in six locales (`src/lib/i18n/ui/en.ts:278`, `es.ts:278`, `fr.ts:278`,
`it.ts:321`, `pt.ts:278`, `ru.ts:331`). Also `public/llms-full.txt:11`,
`src/pages/index.astro:25`, `src/pages/birth-chart/index.astro:26`.
Professional atlases compute local mean time from the birthplace's longitude
(astro.com/faq/fq_hp_atlas_e.htm).

**14. MISLEADING (incomplete) – R6.** The GitHub description and topics are
quoted correctly, but the topics include `astrology` and `astrology-sdk`, so
the repository can be found. The engine's npm `homepage` is
https://zodiacs.org/sdk/engine/, under `/sdk/`, where `public/sdk/index.html`
is the token SDK page. The TypeDoc page `public/sdk/engine/index.html` is
still for 0.1.1-rc.1 and links to https://zodiacs.org/registry/ twice.
`@zodiacs/sdk` on npm carries token keywords.

**15. MISLEADING by omission – the share and calendar token is birth data.**
`src/lib/share-positions.ts` (lines 8, 45, 85-89, 121-143) stores every
longitude, including the Moon and ASC/MC, to 0.001°. `api/calendar/transits.ts`
(lines 1-3, 24) takes this token in a GET query string and calls the feed
"zero-PII". The Moon at 0.001° fixes the birth instant to about 6 s, and
ASC/MC then give the place. Add finding R9.

**16. MISLEADING – R8 and §5 say verifiers caught the false premises.** Both
premises are in the shared context block (`tools/engine-audit-phase1.js:28`),
which also told auditors to "ALWAYS read the returned flag". Auditors caught
them: alpha-reduction-math-10 and production-positions-11 (the `.bsp` premise;
no verifier re-checked these) and swiss-parity-3 (the DE441 header; a verifier
confirmed). Version 1's M0.3 names a different pair: the `.bsp` premise and
"Horizons Q31 is IAU76/80".

**17. UNVERIFIED – "the review of version 1 recommended a human reviewer".**
No such review exists in the audit deliverables or the workflow scripts.

**18. OK-but-imprecise – the §1 inventory of developer surfaces.**
`src/lib/sky-api/files.ts:37-65` also publishes planet summaries, yearly
retrogrades, moon phases, stations, ingresses, aspects and eclipses, and JSON
Schemas; Markdown twins exist only for today's sky and upcoming events. The
list also omits the `/sdk/engine/` TypeDoc and the platform starter tarballs.

**19. OK-but-imprecise – "(the 1.68 M-minute round-trip scan still passes)".**
The scan is not in the repository; it is the audit's time-9 run (42,861
transitions, 1,675,757 minutes).

**20. OK-but-imprecise – step 1.1 on national mean times and the `lmt` flag.**
Node's timezone data maps Europe/Amsterdam to Brussels (1900 and 1930 both give
+00:00), so there is no Amsterdam Mean Time to leave untouched before step
1.12. The `lmt` flag today fires on any sub-minute offset
(`localToUtc.ts:119, 180`), including Dublin Mean Time, Paris Mean Time, and
Monrovia's −0:44:30, which lasted until 1972.

**21. OK-but-imprecise – S6 "(CI already rejects fabricated authors…)".**
`.github/workflows/site-check.yml:81-83` greps for one retired persona ("Rowan
Vale"), the `about/#editor` anchor and any schema.org `Person` markup, in
`src/` only.

**22. OK-but-imprecise – R7 "The README leads with the token registry".**
`README.md:3-5` leads with "a free astrology platform…"; the token registry
appears later in the same sentence. Line 21 says "Warm Gilt museum aesthetic,
unchanged."

**23. Internal inconsistencies.** Phase 2 "about 4 weeks" against version 1's
narrower M5 alone at about 20 days; Phase 4 "about 4 weeks" against version 1's
M2 (15–20 days) plus M4 (15 days). G1's `swiss-ephemeris-alternative` topic
pre-empts owner decision §10.1. The reach items "R-1…R-7" collide with
findings R1–R8. A1's `compare_charts` should keep the existing tool names
(`get_capabilities`, `calculate_natal_chart`, `compare_calculation_records`).
§9's "MCP Registry installs": the registry is a metadata registry in preview
and publishes no install counts.

**24. OK-but-imprecise – Phase 2, 3.5 and 3.6 technical details.** Vimshottari
year lengths: add the sidereal year and the Sun's actual return. "Four large
asteroids": Juno is not one of the four largest (Hygiea is). Rise and set "≤ 5 s
… USNO data": the USNO API returns HH:MM. BaZi: name the hour-pillar and
day-boundary conventions. 3.5 "identical" and D4 "bit-identical in every
runtime": ECMAScript leaves `Math.sin`/`cos`/`atan2` implementation-
approximated. 3.6: name the test tools (the fact-check named
`npx @modelcontextprotocol/conformance` against the 2026-07-28 specification,
and MCP Inspector's CLI). §1: the package already exports `saturnReturn` and
`findLongitudeCrossings`. S3: `people.json` also withholds pages that fail
review, content checks or living-person protection.

**25. Overclaim wording.** "Nobody can see 10″ in a natal chart"; "no user can
see it"; B5 "no tool today proves it missed nothing"; B4 "routinely get …
wrong"; 4.6 "open large search markets".

**26. Wording that could be read as a claim about astrology's validity.**
`check_claim` and "claim checking": rename to `check_sky_fact`, defined as "a
computable statement about the sky (position, date, aspect, retrograde), never
an interpretive or predictive claim". S5 "accuracy of astrology software" →
"computational accuracy". §5.6 "reviews the methods" → "the astronomical and
numerical methods". D12: drop "properly" (a banned word in `CLAUDE.md`). The
claims policy itself correctly excludes validity claims.

### Checked and found correct

§1's source facts (main at 25eaa205; fb57af7a → 0.1.1-rc.6; the tarball's
sha256; `@zodiacs/engine` 404; the research runtime's version and private flag;
the six developer pages; exactly three stdio tools, already read-only and
closed-world; sha256-pinned tarballs; the single WebMCP tool; the sky API
computing nothing; the calendar route, `llms` files, sitemap, IndexNow in
`daily-horoscopes.yml:197-238`, and `robots.txt`). The package's breadth and
R4. All nine site-only techniques. `build-manifest.mjs:190-197`. The R2 quote,
and the R6 and R7 metadata. R1's mechanism (Intl applies −4:56:02, +0:09:21 and
−5:50:36; Stockholm 1947 gives +120 on the host and +60 with backzone; Dublin
1885 is Dublin Mean Time; 25 October 1917 Old Style is 7 November). npm trusted
publishing (OIDC from GitHub Actions, GitLab and CircleCI; automatic
provenance; "The package you're configuring must already exist"; 2FA; no
pending publishers). The MCP Registry (registry.modelcontextprotocol.io, in
preview; `org.zodiacs/*` verified by a DNS TXT record or
`/.well-known/mcp-registry-auth`), and the specification's Streamable HTTP,
`outputSchema`/`structuredContent` and annotation hints. The 2023 Google
history, the scaled-content-abuse definition, Dataset Search, IndexNow's
participants, and Copilot on Bing's index. Swiss Ephemeris's licensing, its
reading of JPL's own `.eph` format rather than SPK, its lack of timezone data,
and the MOSEPH flag and DE441 header. Hipparcos against Gaia for bright stars;
the sixteen vargas, D60 = 0.5° (about two minutes of birth time); the panchang
limbs, KP sub-lords and dasha levels; the 24 solar terms, Lichun at 315° and the
twelve jie; the Moon's horizontal parallax; the seven lots and their day/night
reversal. Zenodo, `CITATION.cff`, Context7, DeepWiki, `SKILL.md`, `AGENTS.md`.
PyPI `zodiacs` and JSR `@zodiacs` are unclaimed. Every version 1
cross-reference. The positions row's figures, with the note that most of
Swiss's 0.1–0.4″ from Horizons is Horizons's IAU76/80 frame.

---

## Dispositions

| # | disposition |
| --- | --- |
| 1 | Accepted, re-checked against the registry. §1 and §10.3 rewritten; R6 and §6 name the shared scope. |
| 2 | Accepted. True of the draft when checked; this commit adds the audit, the evidence, the phase-1 prompt as `tools/engine-audit-phase1.js`, and both briefs to PR #556. Phase 0 and B1 now say the corpora are still in the audit's scratch until Phase 0 commits them. |
| 3 | Accepted. R1 rewritten. |
| 4 | Accepted. R1 and step 1.1 now give the offsets the resolver computes from the site's longitudes, to the whole second as IANA offsets are (Brest −0:17:58 = −17.97 min, Omaha −6:23:46 = −383.77 min), and record Paris's 3 s change. |
| 5 | Accepted. Sidereal degrees and Ascendant ranges separated; the Ascendant ranges and odds are the fact-check's computation and were not re-run by the author. |
| 6 | Accepted, re-checked in `Base.astro`. §1 and A2 rewritten. |
| 7 | Accepted. The agent row, the §4 heading, B2 and B4 rewritten; the brief now says a hundred servers exist and that the case must rest on receipts, conformance results and privacy. |
| 8 | Accepted. S1 rewritten. |
| 9 | Accepted. S2 rewritten. |
| 10 | Accepted. "What changed" item 6 rewritten. |
| 11 | Accepted. X-6 and §5.6 rewritten. |
| 12 | Accepted. "What changed" item 5, the privacy row and the claims policy rewritten. |
| 13 | Accepted, re-checked. R2 rewritten to cover every sentence. R1's fix makes the `lmtNotice` string true, so the six catalogues need no change; the methodology page and the `llms` files do. |
| 14 | Accepted. R6 rewritten. |
| 15 | Accepted, re-checked against the code. Added as R9, step 1.15, a §6 privacy rule, a 3.3 rule and owner decision §10.4. |
| 16 | Accepted, re-checked in `LEDGER.md`. R8, Phase 0 and §5 rewritten; the premises are three. |
| 17 | Accepted. The recommendation was made to the owner in conversation, not in a committed file; the clause is removed. |
| 18 | Accepted. §1 rewritten. |
| 19 | Accepted. Step 1.1 now commits the scan as a test. |
| 20 | Accepted. Step 1.1 describes the `lmt` flag's current rule, Amsterdam, and the `localMeanTime` field the implementation adds; a basis field in portable receipts waits for the SDK's receipt schema. |
| 21 | Accepted. S6 rewritten. |
| 22 | Accepted. R7 rewritten. |
| 23 | Accepted. Phase 2 is now about 8 weeks and Phase 4 about 6–7; the topic is dropped; reach items are X-1…X-7; A1 keeps the existing tool names; §9 counts npm downloads and remote sessions instead. |
| 24 | Accepted. 3.6 names the MCP project's current conformance tests and Inspector CLI without pinning the package name or specification date, which the author did not verify. |
| 25 | Accepted. All five rewritten. |
| 26 | Accepted. `check_sky_fact` throughout, with the definition; S5, §5.6 and D12 rewritten. |
