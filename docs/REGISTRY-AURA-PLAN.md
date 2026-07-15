# Registry Aura — implementation-ready planning document

**Prepared by:** Fable (product strategy, creative direction, experience architecture — planning only)
**For:** Sol Ultra (audit + implementation)
**Feature route:** `/registry/aura/` — a new segment of the Registry wing
**Date:** 2026-07-15

---

## Context

zodiacs.org is a free astrology platform (Learn / Tools / Collect) whose Registry wing preserves the twelve official Zodiacs tokens as a museum-register catalogue. The registry landing already promises this feature in prose: its `#identity` "Identity Context" section says *"Verified public ownership can become display-ready symbolic context: held signs, element balance, modality balance, current season… wheel coverage,"* and the `#builders` section promises "birth chart overlays." Nothing delivers on that promise today. Meanwhile the astrology side already stores birth charts locally (`zodiacs.profile.v1`), ships committed current-sky data, and has a working read-only holdings lookup (`/registry/wallet-chart/`).

**Registry Aura** delivers the promise: a Registry-owned experience where the twelve pastel Zodiacs a public address carries appear as a talisman layer around the user's own birth-chart wheel, classified by whether they resonate with the natal chart (Rooted), are activated by the current sky (Awake), or both (Radiant). Everything joins client-side; the server only ever sees a public address.

The creative thesis: **"What you were born with. What you choose to carry. What the sky activates now."**

Everything below is organized as the 20 deliverables requested, ending with the smallest coherent MVP. Assumptions and uncertainties are labeled `ASSUMPTION` / `UNCERTAIN` / `OWNER DECISION` inline and collected in §19.

---

## 1. Three creative directions

### Direction A — "The Carry Ring" (working feature name: Registry Aura)

**Tagline:** *What you carry takes its seat on your wheel.*

The natal wheel the site already draws sits at center. Around it, outside the sign band, runs a thin second ring — the **carry ring** — with twelve **seats**, one per sign, at each sector's midpoint. Seats for unheld signs render as faint empty **mounts** (a dotted hairline circle, like museum mounting hardware waiting for an object). Each held sign's pastel disc (the existing 128px WebP icon) occupies its seat. State is expressed as light, not badges: a Rooted disc is tethered to the natal placement it resonates with by a dotted hairline; an Awake disc carries a soft halo in its own hue that breathes slowly; a Radiant disc has both, with the halo slightly wider. Beneath the wheel, each held sign gets a **talisman plate** — a museum-label card with four fact registers (Record / Chart / Sky / Reading) and a "Why this is showing" disclosure.

**Visual treatment:** Cosmic Void surfaces exactly as shipped; the only chroma is the discs and their sign-hue halos and tethers. The composite "aura" is a very low-alpha radial glow behind the wheel blended from at most three held hues (rules in §6). The register is the Registry's: measured, archival, labeled — but the objects in the case are alive.

### Direction B — "Carried Sky" (the reading room)

**Tagline:** *A catalogue entry for the sky you carry.*

Text-first, wheel-second. The page is an almanac spread: a dated masthead ("Registry Aura · 15 July 2026"), then one full-width **plate** per held sign, laid out like the sign pages' museum labels — disc as the seal, spec rows for the verified record, natal placements, and today's sky, then a serif catalogue-note paragraph as the reading. A small locator wheel (thumbnail) sits in the masthead. The aura is typographic: the date, the state words, the plates in catalogue order.

**Visual treatment:** closest to the existing `/registry/{sign}/` lot pages — spec-row tables, mono labels, serif notes. Minimal motion (plates fade in). Strongest register match, weakest spectacle.

### Direction C — "The Vitrine" (the unexpected one)

**Tagline:** *The case is never still.*

The held discs are objects in a dark display case — a horizontal shelf rail rendered above the wheel. They rest there by default. When the current sky activates a sign, its disc **leaves the case**: it drifts down a guide rail into its sector seat on the wheel and lights up; when the season passes, it returns to the shelf. The page becomes a slow orrery of possession — on any given visit, some talismans are "out of the case" because the sky called them. A date scrubber (borrowed from the transit tracker's ±1 year scrubber) lets the user drag time and watch discs leave and return.

**Visual treatment:** physical-object metaphor — a shelf hairline, soft contact shadows under resting discs, slow eased travel (site easing curve, ~800ms). Deeply tied to real timing data, wonderful to revisit. But: the heaviest motion budget, the hardest reduced-motion degradation, awkward on small screens (case + wheel + plates stacked), and the "objects moving on their own" reading can drift game-like, which the museum register resists.

### Ranking

1. **A — The Carry Ring.** The only direction where the birth chart and the holdings are *visibly one composition* — the magical moment the brief asks for. It reuses the shipped wheel, discs, and design tokens nearly verbatim, degrades cleanly (remove motion → still a complete still-life), and its plates absorb Direction B's strength.
2. **B — Carried Sky.** Perfect register, lowest risk, and its plate anatomy is so good we adopt it wholesale as the reading layer under A's wheel. As the *whole* experience it lacks a signature image and a first-use moment.
3. **C — The Vitrine.** The scrubber-driven "discs leave the case" idea is genuinely novel and worth keeping on the shelf for Phase 3; as the primary direction it spends its budget on motion instead of meaning, and reduced-motion users would get a strictly worse product.

**Recommendation: build A, with B's plates as the reading layer, and absorb one drop of C** — Awake discs sit a few pixels "lifted" off their seat (a static offset, not an animation), a stillness-compatible echo of "the sky called this one out of the case."

---

## 2. Decisive recommendation and product thesis

**Build "Registry Aura" — the Carry Ring composition.**

**Product thesis:** The Registry already proves what an address carries. The chart tools already compute what a person was born under. The Aura is the reading room where the two records meet: verified fact laid beside computed sky, interpreted gently, never inflated. It is the Registry's `#identity` promise, kept — and it is the only experience on the site that neither wing could produce alone, which is exactly why the Registry (the wing that owns provenance and identity context) must own it.

Three laws keep it honest, and every screen enforces them visually:

1. **Facts wear labels.** Every line is tagged `Record` (verified ownership), `Chart` (computed natal), `Sky` (computed now), or `Reading` (symbolic interpretation). The four registers are typographically distinct and never blended in one sentence.
2. **Talismans are not planets.** Held discs live on a ring *outside* the wheel, mark whole 30° sectors (never degrees), form no aspects, and never alter the chart. The vocabulary is "resonates with / sits with," never "conjunct."
3. **A count, not a score.** Each unique sign counts once. Balance, value, price, and rarity are never read, computed, displayed, or hinted at.

---

## 3. Route and navigation placement

- **Route:** `/registry/aura/` (Astro page `src/pages/registry/aura/index.astro`), modeled on the shipped precedent `src/pages/registry/wallet-chart/index.astro`. Trailing-slash canonical, standard `Base` layout with the site nav (the `Registry` chip pattern), JSON-LD breadcrumb `Zodiacs.org → The Registry (/registry/) → Aura`.
- **No new top-nav item.** The wing nav is intentionally minimal (its source comments say Thesis/Archive/SDK live in the footer). Aura is reached from inside the wing:
  - **Primary entry:** a new card in the registry landing's `#identity` "Identity Context" section (`public/registry/index.html` — hand-maintained static HTML, safe to edit; no generator owns it). Card copy in §Copy below; link `/registry/aura/`.
  - **Secondary entries:** the landing footer links row; a "Part of identity context" line on `/registry/wallet-chart/` (small aside, same records register).
- **Consumer-side entry (`OWNER DECISION`, Phase 2):** a third records-register line on the birth-chart result (full mode), mirroring the existing records line: *"Your chart can also meet the registry's records — Compose your Registry Aura →."* CLAUDE.md currently sanctions **exactly two** cross-links into the wing (CollectBand + the records line). Adding this one requires the owner to amend that rule. MVP ships without it; the feature is reachable wing-side only.
- **SDK docs page (`/sdk/`):** Phase 2 — add Registry Aura to its "Built With Zodiacs"-style examples as the canonical first-party consumer of ownership context.

---

## 4. First-use and repeat-use journey

### First use

1. **Arrival.** User lands on `/registry/aura/` from the landing's Identity Context card. Hero: kicker *"Identity context"*, display headline *"Registry Aura"*, two sentences of records-register intro, and the boundary line in mono: *"Address-only. Read-only. Nothing to sign."*
2. **Step 1 — the chart.** If `zodiacs.profile.v1` contains saved charts, a select shows them (newest preselected): *"Using: Amaya — 2 May 1994 · change."* If none exist: a single quiet CTA *"Calculate your chart →"* linking `/birth-chart/?return=registry-aura`. After the user saves a chart there, the calculator shows a return band: *"Return to the Registry →"* (allowlisted return values only). Birth data never appears in the aura URL.
3. **Step 2 — the address.** One input: *"Paste a public address."* Chain is auto-detected (base58 → Solana, 0x… → Base) and shown as a detected-format note. The compose button (*"Compose the Aura"*) enables when both a chart and a valid address are present.
4. **Composing.** A short, honest sequence of mono status lines, each tied to a real async step: *"Reading the public record…"* (holdings lookup) → *"Setting your chart…"* (profile summary load) → *"Consulting the sky…"* (committed sky data). No fake progress.
5. **The magical moment — the discs take their seats.** The wheel fades in first, alone: *what you were born with.* Then the held discs slide from a small shelf row under the form into their seats on the carry ring, staggered ~90ms: *what you choose to carry.* Last, halos rise on the Awake and Radiant discs and the composite aura glow breathes up behind the wheel: *what the sky activates now.* The three-layer thesis performed in ~2 seconds, in order. (Reduced motion: a single fade to the finished composition.)
6. **The reading.** The aura sentence (serif, the page's one big line): e.g. *"Two of the Twelve travel with this address. Cancer is radiant — carried, natal, and in season at once."* Below: talisman plates in zodiac order, then share, then disclosures.

### Repeat use

- The last lookup (address, chain, held signs, `checkedAt`) is cached locally (`zodiacs.aura.v1`); returning users see the composition immediately with *"as of 14 July · Refresh."* Refresh re-runs the lookup.
- **What changes daily:** the Moon's sign (≈2.5-day cadence) flips Awake states; the daily data date stamp; which discs are lifted.
- **Monthly:** lunations and eclipses land in specific signs; personal-planet ingresses; retrograde stations. Phase 2's **Upcoming strip** turns these into dated reasons to return: *"Next — Full Moon in Aquarius · 3 Aug"*, filtered to held signs.
- **Seasonally:** the Sun's sign gives one held sign a ~30-day "in season" tenure — the slowest, most legible cycle.
- **Worth revisiting because:** the composition is genuinely time-dependent (same inputs, different sky), the card is dated (a monthly artifact people can re-make), and holdings can change (refresh re-reads the record).

### Count-dependent behavior

- **One sign:** spotlight layout — the single plate expands (larger disc, fuller reading); the ring shows one seated disc and eleven quiet mounts.
- **Several:** the standard composition.
- **All twelve:** *full carry* — every seat filled. Copy acknowledges completeness without reward language: *"All Twelve are present at this address. Today, three are lit by the sky."* The composite glow goes neutral ink (near-white) instead of blending hues — all twelve lights read as one.
- **None:** honest and pressure-free. The wheel renders natal-only with empty mounts; copy: *"This address carries none of the Twelve. Your chart stands on its own."* One quiet records link (*"The catalogue lists the Twelve →"* → `/registry/#catalogue`) — no acquisition verbs, no "improve your aura." All ordinary astrology tools remain fully available; this page never gates anything.

### Unknown birth time

Houses, ASC/MC, and every Rising-dependent claim are omitted (the profile store's `timeKnown:false` charts already carry `angles: null`). Rooted evidence reduces to planets-in-sign. If the natal Moon changes sign across the birth day (the calculator's existing ambiguity check), Moon-based Rooted evidence is excluded and the plate's "Why this is showing" notes it. Page note, calm: *"Born without a recorded time — houses and rising are left out, as they should be."*

---

## 5. Screen-by-screen specification

### Screen A — Entry (`/registry/aura/`, pre-composition)

Desktop (≥960px): centered narrow container (`.container--narrow`).

1. Hero block: `.kicker` *"Identity context"* → `h1.display` *"Registry Aura"* → intro paragraph (2 sentences, `--text-lg`) → boundary line (`.mono`, `--muted`).
2. Two step cards, stacked, each `.shell > .core`:
   - **"Your chart"** — saved-chart `<select>` (name + birth date label per option; newest preselected) OR the calculate CTA when empty. Sub-line: *"Charts are stored in this browser only."*
   - **"An address"** — text input (mono), detected-chain note under it (*"Reads as a Solana address"* — exact wording via strings module; see CI note §15), and the compose `.btn--primary`. Error line region beneath (states in §12).
3. Privacy note (3 lines, `--text-sm`, `--muted`) + link to `/disclosure/`.
4. Footer: standard.

Mobile (<720px): identical order, cards full-width, inputs ≥44px tall.

### Screen B — Composing

The two step cards collapse to a single `.core` with the three mono status lines appearing as their step resolves (§4.4). Duration is real network/CPU time; typical total under 2s. No spinner iconography — text is the loader (registry register).

### Screen C — Result

Desktop: two-column grid (minmax; left ~55%).

- **Left (sticky):** the composition — wheel + carry ring SVG, max 560px. Beneath it the data stamp line (mono, `--text-xs`): *"Record read {checkedAt} · Sky data of {daily.date} · Chart: {name}"* + *"Refresh"* ghost button.
- **Right:** in order:
  1. **Aura sentence** (EB Garamond, `--text-xl`).
  2. **State summary chips** — one per held sign: disc 24px + sign name + state word (mono, uppercase). Chips anchor-link to their plates.
  3. **Talisman plates**, zodiac order (catalogue order — deliberately not ranked). Plate anatomy (each `.tile`, `--sign` set to the hue):
     - Header row: disc (48px tier), sign name (serif, `--text-lg`), state word chip, *"View the record →"* link to `/registry/{sign}/`.
     - Fact rows, each `label: value` with mono labels:
       - `Record` — *"This address holds Taurus."* + checked date.
       - `Chart` — zero or more lines: *"Your natal Moon sits at 7°41′ Taurus."* (omitted entirely when no natal evidence).
       - `Sky` — zero or more lines: *"Venus is in Taurus (sky of 15 July)."*
       - `Reading` — one serif-italic sentence (deterministic; §9).
     - **"Why this is showing"** — a `<details>` listing the literal evidence: the address (truncated), the balance>0 check and its timestamp, each natal longitude used, each sky longitude used and the data date, and the rule that fired (e.g. "Rooted: natal body in sign").
  4. **Unheld note** (only when 0 < held < 12): one mono line: *"Nine mounts stand empty."* — nothing more.
  5. **Share block** (§Share, below).
  6. **Disclosures aside** — the wallet-chart posture block adapted (§13).

Mobile: single column — aura sentence → composition (92vw, max 420px) → stamp → chips → plates → share → disclosures. The wheel is not sticky.

### Share (within Screen C)

*"Make a card"* → on-device canvas render (existing share-card pattern): 1080×1350 PNG via the Web Share API with download fallback. Card contents: void ground, kicker "Registry Aura" + date, the wheel+ring composition (discs seated), held sign names with state words, the aura sentence, footer `zodiacs.org/registry/aura`. **Default excludes:** birth time, birthplace, address (even truncated). One explicit checkbox: *"Include address (abbreviated)"* → adds `3fxT…9Q2w`. Big-three sign names may appear (sign-level only — same disclosure level as existing chart share cards). No share **links** in MVP (§19: a URL would join birth data + address in one artifact; deferred pending privacy review).

---

## 6. Pastel Zodiac art direction and asset-reuse plan

**Not** a dark crypto dashboard; not neon; not gradient astrology soup. The world is: *a museum case at night where the objects are softly alive.* Cosmic Void supplies the room; the pastel discs supply every point of light.

### Rules

- **The discs are the art.** Reuse `public/assets/zodiac-icons/{48,128,400}/{sign}.webp|avif` (128 tier canonical for the ring; 48 for chips/plates; never the raw 1024px PNGs — strategy doc rule). No new character art in MVP.
- **One hue per sign, from tokens.** `--sign-aries:#DE8E79, taurus:#B9D4BE, gemini:#B29DD0, cancer:#B6D4E4, leo:#E0A9B4, virgo:#B7D9B0, libra:#D3A9DE, scorpio:#B9DCE8, sagittarius:#E0B080, capricorn:#C0DEA8, aquarius:#AE8FC9, pisces:#A9D4C4` (already in `src/styles/tokens.css` and `SIGNS[].hue`). Components take a `--sign` custom property; no 12× variants.
- **Color-combination rules (anti-mud):**
  1. Sector elements (seat rings, tethers, halos) always use their own sign's hue — hues never mix *within* a sector.
  2. The composite aura glow blends **at most 3 hues**, chosen by state priority (Radiant → Rooted → Awake → Held) then zodiac order, via `color-mix(in oklab, …)` at 12–18% alpha over `--void-0`, as a soft radial glow behind the wheel — an atmosphere, not a rainbow.
  3. Full carry (12 held): the glow goes neutral (`--ink-1` at low alpha) — all lights sum to near-white.
  4. Hues never color body text. Text is ink tokens only; hues appear in discs, halos, tethers, seat rings, chip borders, and plate accent hairlines.
- **Typography hierarchy:** EB Garamond for the headline, plate sign names, and the aura sentence + `Reading` lines (serif italic); Instrument Sans for all body/UI; JetBrains Mono for `Record/Chart/Sky` labels, state words, addresses, and data stamps. Kickers are sentence-case serif-italic (`.kicker`) — no mono-caps eyebrows, no gold anywhere.
- **Surfaces:** the composition sits directly on the void (no card); plates are `.tile`; the two entry step cards are the page's only `.shell/.core` moments (elevated inputs).

### Asset-reuse inventory (verbatim reuse, no regeneration)

| Asset | Path | Use in Aura |
|---|---|---|
| Pastel disc icons (48/128/400 AVIF+WebP) | `public/assets/zodiac-icons/…` | ring discs, chips, plates, share card |
| Sign hue tokens | `src/styles/tokens.css` `--sign-*` | all chroma |
| `SIGNS` table (hue/element/modality/ruler/essence/glyph) | `src/lib/signs.ts` | derivation + copy slots |
| Natal wheel renderer | `src/lib/wheel/Wheel.tsx` | center of composition |
| Fonts (self-hosted EB Garamond / Instrument Sans / JetBrains Mono) | existing `@font-face` | everything |
| Share-card canvas pattern | `src/lib/share-card.ts` + `src/lib/wallet/share-card.ts` | aura card |
| OG v2 card builder | `scripts/build-og-void.mjs` | follow-up `tool/aura.png` (MVP uses `share.png` fallback — §15) |
| Registry JSON (official representations) | `public/registry/zodiacs.registry.json` | server-side allowlist (already consumed by holdings lib) |

New drawn elements (SVG, in-component, no asset files): seat mounts (dotted hairline circles), tethers (dotted hairline arcs), halo (blurred circle in sign hue), shelf row (hairline).

---

## 7. The signature visualization — the Carry Ring

Anatomy (SVG, drawn around the existing `Wheel` output):

1. **Center:** the shipped natal wheel exactly as `/birth-chart/` draws it (bodies, aspect lines, house ring when time is known; South Node excluded from drawing per site convention).
2. **Carry ring:** radius ~1.12× the wheel's outer edge; a hairline circle (`--hair-1`).
3. **Twelve seats** at each sign sector's angular midpoint. Alignment is automatic: the ring is drawn inside the shipped Wheel's `renderOverlay(geo: WheelGeometry)` prop (verified — invoked with `rOuter = size*0.55`), using `geo.pt(sectorMidLongitude, radius)` so seats inherit whatever orientation the wheel itself uses. No fork of the wheel, no separate SVG to keep in sync.
   - **Held:** 40px disc (128 WebP scaled), full opacity, subtle contact ring in sign hue at 40% alpha.
   - **Unheld:** empty mount — 40px dotted circle, `--hair-2`, no hue.
4. **State dressing:**
   - **Rooted:** dotted tether from seat to each supporting natal glyph (max 2 tethers per sign to avoid webbing; overflow noted in the plate instead).
   - **Awake:** halo — a blurred ring in sign hue behind the disc; plus the disc sits "lifted" 4px outward (static offset).
   - **Radiant:** tether(s) + wider halo + lifted.
   - **Held (dormant):** plain seated disc, no dressing — presence without noise.
5. **Composite glow:** the ≤3-hue radial atmosphere behind everything (§6).
6. **Legibility guards:** at <420px the ring compresses (discs 32px, tethers dropped entirely — states remain readable via chips/plates); tethers never cross the wheel's center zone; if >6 held signs are Rooted, tethers render only for Radiant signs (plates carry the rest).

The ring is deliberately **outside** the wheel: talismans mark whole signs, never degrees; they visually *attend* the chart rather than participate in it (Law 2).

Accessibility: the SVG gets `role="img"` and a generated `aria-label` (*"Natal wheel with three held talismans: Cancer radiant; Taurus rooted; Virgo held."*). The plates are the accessible source of truth — every fact in the graphic exists as DOM text.

---

## 8. Animation and interaction behavior

Tokens: `--ease: cubic-bezier(.32,.72,0,1)`, `--dur-1 180ms / --dur-2 420ms / --dur-3 800ms`. All motion CSS-driven (transitions/keyframes), no JS animation loops.

**Entrance choreography (once per composition):**
1. Wheel: opacity 0→1 + slight scale 0.98→1, `--dur-2`.
2. Discs: from the shelf row to seats — `transform: translate(...) scale(.6→1)` + fade, `--dur-2` each, 90ms stagger, zodiac order.
3. Halos + composite glow: opacity 0→target over `--dur-3`, after discs land.

**Idle:** Awake/Radiant halos breathe — opacity 0.7↔1.0, 6s ease-in-out infinite. Discs never move at idle. Tethers static.

**Interaction:** hovering/focusing a state chip or plate raises its disc's halo to full and dims other halos to 40% (`--dur-1`); seats themselves are not interactive in MVP (one interaction surface, not two). Refresh re-runs only step 2–3 of the entrance (discs stay seated; halos re-evaluate).

**Reduced motion (`prefers-reduced-motion: reduce`):** the entire entrance is replaced by one 180ms fade of the finished composition; the breathing loop is disabled (halos static at full value); hover dimming becomes instant. Nothing is communicated *only* by motion — lifted offset, halo presence, tethers, and state words all persist statically.

**Performance:** halo blur via SVG `feGaussianBlur` on small elements or pre-blurred radial-gradient fills (`UNCERTAIN`: Sol Ultra should pick whichever stays >55fps on mid-range mobile; gradient fills are the safe default). Animations pause when the tab is hidden (CSS animations do this natively).

---

## 9. Deterministic interpretation framework

Pure functions of `(heldSigns, chartSummary, committedSkyData)` — no randomness, no dates read from the clock at render (the sky data's own `date` field is the "now"). Same inputs → same output, always; unit-testable with fixtures.

### Evidence model

For each **uniquely** held sign (dedup across chains; each sign counts once):

**Rooted evidence** (natal relevance):
- `natal-body`: a natal body (the wheel's drawn set: Sun…Pluto + North Node) whose longitude falls in the sign. Carries body name + degree.
- `natal-angle` (only `timeKnown && angles`): ASC or MC sign.
- Excluded when the natal Moon's sign is ambiguous for an unknown-time chart: no Moon evidence (noted in "Why this is showing").

**Awake evidence** (current-sky relevance, from committed data):
- `sky-body`: a current body in the sign (from `daily.json` bodies). Sun in sign additionally emits `season` (*"in season"* framing); Moon emits `moon-today`.
- `retrograde`: a retrograde body currently in the sign (daily.json `retrograde` flag).
- Phase 2 adds `lunation-upcoming` / `eclipse-upcoming` / `ingress-upcoming` within a 14-day window (from `sky.json`, `eclipses.json`, `transits-YYYY-MM.json`).

**State (boolean, no weights, no scores):**
`radiant` = rooted∧awake · `rooted` = rooted only · `awake` = awake only · `held` = neither.

### Fact-line templates (register-tagged, fixed strings with slots)

- `Record`: *"This address holds {Sign}."* (+ *"…on Solana and Base"* when both — chain nouns only via the strings module, see §15.)
- `Chart`: *"Your natal {Body} sits at {deg}°{min}′ {Sign}."* / *"Your rising sign is {Sign}."*
- `Sky`: *"{Body} is in {Sign} (sky of {date})."* / *"The Sun is in {Sign} — {Sign} season."* / *"{Body} is retrograde in {Sign}."*
- `Reading`: one sentence composed from a per-state template with slots from `SIGNS[sign].essence` + element:
  - radiant: *"Your {Sign} talisman is doubly lit — {natalClause}, and the sky is answering. Around {essence-theme}, attention gathers on its own."*
  - rooted: *"Your {Sign} talisman rests close to home: {natalClause}. It reads as temperament, not weather."*
  - awake: *"The sky is moving through {Sign} — your talisman is awake even though your chart is quiet there. Borrowed weather: {essence-theme}."*
  - held: *"{Sign} travels with this address quietly today. Nothing in your chart or the current sky singles it out — carrying it is the statement."*
  - Clause tables are fixed and enumerable (12 signs × 4 states × small clause sets) — hand-written once, in the calm `interpretations.ts` voice (dry, specific, no woo, none of the banned smug phrases).

### The aura sentence (page headline)

Template by counts: *"{N} of the Twelve travel(s) with this address."* + the single most notable state clause chosen by fixed priority (radiant > season > rooted-count > awake-count), e.g. *"Cancer is radiant — carried, natal, and in season at once."* Full carry and none states use their own fixed sentences (§4).

### Transparency

Every plate's "Why this is showing" lists the literal inputs (rule fired, longitudes, timestamps, data dates, truncated address). A page-level footnote states the method in two sentences: ownership read against the official registry's listed representations; sky computed from the site's published ephemeris data; readings are symbolic and deterministic.

---

## 10. Sample results (illustrative fixtures — these become vitest fixtures)

All samples pin an **illustrative sky snapshot** (`daily.json` for 2026-07-15): Sun 23° Cancer, Moon 11° Scorpio, Mercury 18° Leo (retrograde), Venus 9° Gemini, Mars 2° Virgo, Jupiter 6° Cancer, Saturn 2° Aries (retrograde). *(Illustrative — real fixtures must be captured from the actual committed file at implementation time.)*

**Sample 1 — two held, one radiant.** Chart: 2 May 1994, 14:22, Lisbon (Sun 12° Taurus, Moon 3° Cancer, ASC 28° Virgo, time known). Address holds: `taurus`, `cancer`.
- Taurus → **Rooted** (natal Sun 12° Taurus; no sky body in Taurus). Reading: temperament-not-weather register.
- Cancer → **Radiant** (natal Moon 3° Cancer; Sun 23° Cancer *in season* + Jupiter 6° Cancer). Tether to Moon glyph, halo, lifted.
- Aura sentence: *"Two of the Twelve travel with this address. Cancer is radiant — carried, natal, and in season at once."*

**Sample 2 — one held, awake only, unknown time.** Chart: 30 Nov 1988, time unknown, Bogotá (no Virgo placements; Moon ambiguous that day). Holds: `virgo`.
- Virgo → **Awake** (Mars 2° Virgo). No houses/rising anywhere on the page; Moon excluded from evidence with a note. Spotlight layout (single plate).
- Aura sentence: *"One of the Twelve travels with this address. Virgo is awake — the sky is moving through it now."*

**Sample 3 — none held.** Any chart; address with no official representations. Natal wheel + twelve empty mounts; empty-state copy (§4); no plates; share disabled (nothing to card) — the block shows *"Nothing to card yet."* in mono.

**Sample 4 — full carry.** Chart as Sample 1; all twelve held. Every seat filled; neutral ink glow; chips row wraps to two lines; aura sentence: *"All Twelve are present at this address. Today, Cancer, Leo, and Scorpio are lit by the sky."* (sky-lit list from evidence, zodiac order, max 3 named then *"…and N more"*).

**Sample 5 — lookup unavailable.** Valid address, RPC failure (holdings `undefined`). No aura is composed; state message (§12) with natal wheel shown untouched. *"The public record could not be read just now. Nothing about your chart changed. — Try again"*

---

## 11. Data contracts

*(TypeScript; final shapes to be reconciled by Sol Ultra with the validation notes in §15.)*

```ts
// ---- Wallet layer (server boundary) ----
// POST /api/aura-holdings   body: { address: string }   (≤256-byte body cap; same-origin gated; flag gated)
// All responses: Cache-Control: private, no-store · X-Content-Type-Options: nosniff
//   200  { chain:'solana'|'base', address, heldSigns: SignSlug[], checkedAt: ISO }
//        // unique, zodiac-ordered; [] = a SUCCESSFUL read that found none (cached like any 200)
//   400  { error:'invalid_address' }   // parseWalletAddress → null (client pre-validates; server backstop)
//   403  { error:'forbidden' }         // same-origin gate
//   404  { error:'disabled' }          // flag off / zero chains configured
//   405  { error:'method' } + Allow: POST
//   503  { error:'unavailable' }       // parsed chain not configured, OR resolveOfficialHeldSigns → undefined
// The 503-vs-200-[] distinction is deliberate: "couldn't check" must never render as "holds nothing."
// Failures are never cached; 200s (including empty) cache in-memory keyed chain:address,
// TTL walletCacheTtlMs(env), ≤1000 entries — all per the wallet-birth precedent.
// (Deliberate divergence from wallet-birth's neutral-404-on-invalid: that neutrality protects a
// history verifier; a holdings read has no unknown-address concept, and 400 is an honest signal.)

// ---- Client cache ----
// localStorage 'zodiacs.aura.v1'
type AuraCache = { version: 1;
  last?: { chain; address; heldSigns: SignSlug[]; checkedAt: string };  // one entry, MVP
  lastChartId?: string };
// TTL: reuse walletCacheTtlMs semantics (default 24h) — stale entries render with a "Refresh" nudge, never silently re-fetch.

// ---- Chart input (read, never sent anywhere) ----
type AuraChart = { id: string; name: string;
  bodies: { body: BodyName; lon: number; retrograde: boolean }[];  // SavedChart.summary.bodies
  angles: { asc: number; mc: number } | null;
  timeKnown: boolean; moonAmbiguous: boolean; engineVersion: string };

// ---- Sky input (committed JSON, bundled) ----
type AuraSky = { date: string;                                    // daily.json date — the canonical "now"
  bodies: { body; lon; sign; degree; retrograde }[];              // daily.json
  moonPhase: string;
  // Phase 2: nextLunations, nextEclipses, ingressWindows (sky.json / eclipses.json / transits-*.json)
};

// ---- Derived (pure client composition) ----
type Evidence = { kind: 'natal-body'|'natal-angle'|'sky-body'|'season'|'moon-today'|'retrograde';
  label: string;                    // the rendered fact line
  data: Record<string, string|number> };  // literal inputs for "Why this is showing"
type AuraSignState = { sign: SignSlug; state: 'radiant'|'rooted'|'awake'|'held';
  rooted: Evidence[]; awake: Evidence[] };
type Aura = { signs: AuraSignState[];    // held signs only, zodiac order
  heldCount: number; auraSentence: string;
  glowHues: string[];                    // ≤3, or ['ink'] for full carry
  stamps: { checkedAt: string; skyDate: string; chartName: string } };
```

Flow: pasted address → `POST /api/aura-holdings` (server: parse → `resolveOfficialHeldSigns` → allowlist by `isOfficialRepresentation`) → client joins with `AuraChart` (from `zodiacs.profile.v1`) + `AuraSky` (bundled JSON) → `composeAura()` (pure) → render. **The server never receives birth data; the browser never receives RPC endpoints or keys.**

---

## 12. States

| State | Trigger | Treatment |
|---|---|---|
| **No saved chart** | profile empty | Step 1 shows calculate CTA; compose disabled. Never blocks browsing the page copy. |
| **Idle** | no address yet | Step cards only; shelf row empty. |
| **Invalid / unsupported address** | `parseWalletAddress` → null | Inline under input: *"That doesn't read as a supported public address. Solana and Base addresses are supported."* (chain nouns via strings module). No request sent. |
| **Composing** | request in flight | Screen B mono status lines; compose button disabled; input locked. |
| **Result — holdings** | ok, heldSigns.length > 0 | Screen C. |
| **Result — no holdings** | ok, heldSigns = [] | Screen C empty variant (§4 "None"). This is a *successful* read — stamped like any other. |
| **Lookup unavailable** | error:'unavailable' (RPC/network) | *"The public record could not be read just now. Nothing about your chart changed."* + Try again. Natal wheel may render alone; no aura, no cached substitute unless a cache entry exists (then: cached composition + prominent stale stamp). |
| **Stale cache** | cache older than TTL | Composition renders from cache with *"as of {date}"* emphasized + Refresh; no auto-refetch. |
| **Disconnected / offline** | fetch fails, `navigator.onLine` false | Same as unavailable with *"You look offline."* prefix. (SW never caches registry-authority data — offline is an honest failure.) |
| **Feature disabled** | flag off at build | Page redirects to `/404.html` (wallet-chart precedent) — no dead UI ships. |
| **Forbidden** | same-origin gate rejects | Treated as unavailable client-side (users shouldn't see this; it exists for relays). |
| **Engine-version drift** | saved summary older than current engine | MVP: render from stored summary (positions don't change materially between versions); Phase 2: silent recompute from lossless `birth` via lazy engine. `ASSUMPTION` — confirm summaries are trusted across versions elsewhere (ProfileDashboard behavior) and copy that policy. |

---

## 13. Privacy disclosures and wallet language

User-facing copy (records register, adapted from the shipped wallet-chart posture strings):

- **Boundary line (hero):** *"Address-only. Read-only. Nothing to sign."*
- **Under the address input:** *"Pasting an address performs a read-only balance check against the official registry. There is no wallet connection, message signing, approval, transaction, or custody."*
- **Disclosures aside (result):**
  - *"Your birth details never leave this browser. The address check is the only network request, and it carries the address and nothing else. The chart and the record are combined on your device."*
  - *"A public address is public. This page only reads what anyone can read. Holding a token does not prove which person controls an address — treat the Aura as context, not identity."*
  - *"The card you make shows sign names, states, and the date. It never includes your birth time, birthplace, or the full address."*
  - *"Addresses are excluded from analytics."*
- **Method footnote:** two sentences (§9 Transparency).
- Link to `/disclosure/` in all cases.

Never claimed anywhere: that a lookup proves control of an address; that holding affects the chart, compatibility, or "spiritual value"; anything about price, value, or rarity.

---

## 14. Exact existing systems to reuse

**Wallet/registry layer (server-side):**
- `src/lib/wallet/holdings.ts` — `resolveOfficialHeldSigns(chain, address, env, fetcher)` (verified export): the entire ownership lookup. Reuse unmodified. Coverage note: Solana reads classic SPL Token program accounts only — copy must say "official Registry assets found," never "holds nothing anywhere."
- `src/lib/wallet/address.ts` — `parseWalletAddress`, `truncateWalletAddress`.
- `src/lib/wallet/config.ts` — `walletCacheTtlMs`, `validWalletProviderEndpoint`. **Do NOT reuse `configuredWalletChains` for Aura availability:** it counts Base as configured on `BASE_EXPLORER_API_KEY` alone (a history provider), but holdings need `BASE_RPC_URL` — an explorer-only deployment would advertise Base then fail every lookup. Add `auraEnabled(env)` + `configuredAuraChains(env)` (solana ⇔ valid `SOLANA_RPC_URL`; base ⇔ valid `BASE_RPC_URL`).
- `api/wallet-birth.ts` — reuse its exported, unit-tested `isAllowedWalletRequest` (`import { isAllowedWalletRequest } from './wallet-birth.js'` — verified side-effect-light), and copy its body-size cap, TTL-cache, header, and `maxDuration` discipline into the new thin endpoint.
- `public/registry/zodiacs.registry.json` — already the allowlist inside holdings.ts; no new registry reads needed client-side.

**Chart/profile layer (client):**
- `src/lib/profile/schema.ts` + `store.ts` — `loadProfile`, `SavedChart` (read `summary.bodies` / `summary.angles` / `birth.timeKnown`); `src/lib/hooks/useProfile.ts` — reactive profile.
- `src/lib/today/index.ts` — `natalPointsForChart(savedChart)` (verified: converts a saved summary into points **including Ascendant/Midheaven** — the ready-made Rooted-evidence input) and `newestSavedChart(profile)` for the default selection.
- `src/lib/wheel/Wheel.tsx` — the natal wheel; renders from plain `{body, lon, retrograde}[]` + optional `asc/mc/cusps` with **no engine anywhere in its import graph** (verified), and exposes the `renderOverlay(geo: WheelGeometry)` slot the carry ring draws into.
- `src/lib/signs.ts` — `SIGNS` (hue/element/essence/glyph), `signForLongitude` / `signIndexForLongitude` / `signBySlug` / `seasonSign` (verified, lines 255–343).
- `src/lib/time/localToUtc.ts` — only if recompute path is needed (Phase 2).

**Sky layer (client, zero engine):**
- `src/data/daily.json` (positions "now"), `src/data/sky.json` (retro windows, lunations), Phase 2: `eclipses.json`, `ingresses.json`, `transits-YYYY-MM.json` via `src/lib/horoscopes.ts` helpers.
- `src/lib/engine/lite.ts` (dependency-free moon/sun math) if a live-instant touch is wanted without the full engine.
- Precedent to mirror: `src/islands/ProfileDashboard.tsx` (saved chart × committed sky, no engine in eager bundle).

**Presentation:**
- `Base` layout + site nav (as `src/pages/registry/wallet-chart/index.astro` does), `.shell/.core/.tile/.kicker/.display/.mono` from `src/styles/base.css`, tokens from `src/styles/tokens.css`.
- `src/lib/share-card.ts` (`savePngBlob`, `CardOutcome`) / `src/lib/wallet/share-card.ts` (1080×1350 canvas, `fitText`, `loadIcon` fetching `/assets/zodiac-icons/128/{slug}.webp`) — the card pattern.
- OG image: MVP uses the sitewide `/assets/og/v2/share.png` fallback — exact wallet-chart parity (verified: `ogImageForPath('/registry/wallet-chart/')` returns `null`). A dedicated card is a follow-up commit (recipe in §15).
- i18n plumbing (`src/lib/i18n/*`) — EN-only strings in MVP but keyed from day one.
- Analytics: Plausible event pattern from `WalletChart.tsx` (`wallet_chart_computed` convention: booleans/buckets, never addresses).

**Copy registers to imitate:** `src/strings/wallet-chart.ts` (posture), `scripts/sign-data.mjs` + `src/lib/interpretations.ts` (voice), CollectBand / records-line strings (bridge register).

---

## 15. New components and helpers to create

*(File-level plan; Sol Ultra should reconcile with §17's build order. CI-critical placement notes below.)*

1. **`api/aura-holdings.ts`** — thin POST endpoint: same-origin gate (reused `isAllowedWalletRequest`) → `configuredAuraChains` gate → `parseWalletAddress` → `resolveOfficialHeldSigns` → contract §11; TTL cache (200s only, failures never cached). *(Deliberately not reusing `/api/wallet-birth`: that endpoint runs the expensive earliest-transaction history scan the Aura doesn't need; holdings-only is 1 RPC call on Solana and one HTTP request carrying 12 batched `eth_call`s on Base — verified.)* Handler-graph imports need explicit `.js` extensions and `with { type: 'json' }` on JSON imports, and the file **must be registered in `tests/api/runtime-imports.test.ts` `EXPECTED_HANDLERS`** (exact-equality list; `npm test` fails otherwise).
2. **`src/pages/registry/aura/index.astro`** — page shell, hero, flag-gated `Astro.redirect('/404.html')` (wallet-chart precedent), JSON-LD BreadcrumbList + WebApplication (schema:check requires the breadcrumb's final item to equal the canonical, `isAccessibleForFree: true`, zero-price Offer), mounts the island `client:load`. **Pass `clientUi: true` to `Base`** — `src/lib/i18n/ui/build-audit.test.ts` requires every built page containing `<astro-island>` to embed the UI catalog (wallet-chart has this latent bug; don't copy it). OG meta: sitewide `share.png` fallback in MVP. **Do not add the route to the sitemap** — CI builds with no wallet env, so the page is a noindex stub there and every dist gate skips it.
3. **`src/islands/registry/Aura.tsx`** (+ subcomponents in the same dir: `AuraRing.tsx`, `AuraPlate.tsx`, `AuraShare.tsx`) — the experience island. **CI placement (verified by running the grep):** `--exclude-dir=registry` exempts `src/islands/registry/` at any depth, and `src/lib` / `src/strings` / `src/styles` / `api/` / `docs/` are not scanned at all. Belt-and-braces anyway: all chain vocabulary lives only in the strings module. The grep is case-sensitive; the **voice-ban grep has no registry exclusion** — aura page/island inline copy must avoid the banned tells regardless. The island imports **no engine module, static or dynamic** (chart from `summary` via `natalPointsForChart`, sky from statically-imported `daily.json` — precedent `DailyForYou.tsx`; the share-card module is the only lazy `import()`).
4. **`src/strings/aura.ts`** — all copy (hero, steps, states, fact templates, reading templates, disclosures, share). Keyed for future locales; contains the only occurrences of chain nouns.
5. **`src/lib/aura/compose.ts`** — pure derivation: `composeAura(held, chart, sky): Aura`; evidence rules §9; no imports from the engine or anything network-touching. **`src/lib/aura/types.ts`** — contracts §11. **`src/lib/aura/cache.ts`** — `zodiacs.aura.v1` read/write with TTL.
6. **`src/lib/aura/share-card.ts`** — canvas card (modeled on `wallet/share-card.ts`).
7. **`src/styles/aura.css`** — page styles (mirrors `wallet-chart.css` convention), including all motion + reduced-motion rules.
8. **Edits to existing files:**
   - **Registry landing entry — a three-part edit (verified: the landing is a dual-source page).** `/registry/` is a React SPA (`/assets/app.js`, built from `src/app.jsx`) hydrating over a static no-JS pre-render in `public/registry/index.html`; the `#identity` section exists in both. Edit `IdentityContextSection()` in `src/app.jsx` (~line 2720), regenerate `public/assets/app.js` via `node scripts/build-app.mjs`, AND add the matching static card in `public/registry/index.html` (~line 3499) — commit all three together or the `legacy-drift` CI job fails. Leave the `data-registry-established` spans alone (`sync-registry-establishment.mjs` owns them); optionally bump the `?v=` cache-buster on the app.js script tag.
   - `src/islands/ChartCalculator.tsx` — allowlisted `?return=` param (query-param read precedent at line 311; const map `{ 'registry-aura': '/registry/aura/' }`) → return band rendered inside the existing `saved === 'saved'` notice block (lines ~1199–1203), with local per-locale copy (precedent: `CHART_BOOK_COPY`).
   - `src/lib/wallet/config.ts` (+ its test) — `auraEnabled(env)`, `configuredAuraChains(env)` incl. the explorer-only-Base exclusion case.
   - `tests/api/runtime-imports.test.ts` — add `'api/aura-holdings.ts'` to `EXPECTED_HANDLERS`.
   - `src/lib/analytics-config.mjs` + `src/lib/analytics.ts` — register the aura events (prop allowlist + `AnalyticsEventName` union); unregistered events are silent no-ops.
   - `scripts/check-dist.mjs` — **no registration needed** (generic link/fragment integrity only); the new landing link just has to resolve in dist (see §19 R-stub).
   - `vercel.json` — nothing needed; `maxDuration` set in-file like wallet-birth.
   - Optional: `scripts/smoke-preview-functions.mjs` probe for the new endpoint; `budgets.json` entry `"/registry/aura/"` (only measures when built flag-on; harmless flag-off).
   - `docs/` — a `docs/AURA.md` mirroring `WALLET-CHART.md` (posture, env, privacy, states).
   - **OG card — deferred follow-up commit (verified costly):** add `{ key:'aura', path:'/registry/aura/', … }` to `OG_EN.tools` in `src/strings/seo.en.mjs`, run `npm run data:og` (Chromium), commit `public/assets/og/v2/tool/aura.png` **plus** `manifest.json` (`verify-og-cards.mjs` runs on every build via `prebuild` and pins `requiredCards` exactly), update `EXPECTED_SECTION_COUNTS` (118→121) and the 541-key total in `scripts/build-i18n-additions.test.mjs`, and run `npm run data:i18n-additions` (`i18nManifestIsCurrent()` is asserted in `npm test`).
9. **Feature flag:** `PUBLIC_AURA_ENABLED=1`, separate from wallet-chart's (validated: independent rollout/rollback; wallet-chart additionally needs archival history endpoints that Aura doesn't — coupling the kill-switches would be wrong). Shares provider env vars `SOLANA_RPC_URL` / `BASE_RPC_URL` and `WALLET_BIRTH_CACHE_TTL_SECONDS`.

**Tests to create:** vitest unit fixtures for `composeAura` (samples §10 as fixtures, incl. unknown-time, ambiguous-Moon, none, full-carry, dedup-across-chains), endpoint tests mirroring `tests/api/wallet-birth.test.ts`, island test mirroring `WalletChart.test.ts`.

**CI gates this must pass:** `npm run build && npm run check && npm test`; `node scripts/check-dist.mjs`; `node scripts/report-bundles.mjs --fail` (no astronomy-engine in the aura eager chunk — use summary+committed data only); the wing-language grep; the voice-ban grep (write copy accordingly); `npm run schema:check` (breadcrumb JSON-LD); Lighthouse/visual jobs. Also: never write the string `diasmal…` anywhere (repo-banned token).

---

## 16. Scope: MVP → Phase 2 → Phase 3

### MVP (the smallest coherent Registry Aura — detailed at end)
Paste-address only · saved-chart select + calculator return path · holdings endpoint · carry-ring composition + plates + aura sentence · Rooted/Awake/Radiant/Held from natal bodies+angles × daily-sky bodies/season/moon/retrogrades · why-this-is-showing · share card PNG · all §12 states · disclosures · landing entry card · OG card · EN only · flag-gated.

### Phase 2 — deepen time and reach
- **Upcoming strip:** lunations/eclipses/ingresses in held signs within 14 days (committed data already exists).
- **Wallet connect (address-only):** Phantom (`window.phantom?.solana.connect()` → publicKey) and EIP-1193 (`eth_requestAccounts`) as a *convenience* next to paste — never required, never signing. `OWNER DECISION`: this contradicts the shipped disclosure copy ("no wallet connection") and `docs/WALLET-CHART.md` discipline; requires owner sign-off + coordinated copy revision (exact strings enumerated in §19).
- **Cross-chain merge:** paste a second address; union of unique signs (each sign still counts once).
- **Birth-chart result entry line** (`OWNER DECISION`: third sanctioned cross-link; CLAUDE.md amendment).
- **Registry sign-page backlink:** a records-register line on `/registry/{sign}/` → Aura (template edit in `build-sign-pages.mjs` + regeneration, committed together per the drift gate).
- **ES locale** (strings module is keyed from day one).
- **Live-instant sky option:** recompute "now" via lazy `engine/full` on explicit refresh (bundle-gate compliant), replacing the noon-UTC snapshot.
- Engine-version recompute path from lossless `birth`.

### Phase 3 — the aura in the world
- **Simastry handoff:** an explicit "Open in Simastry" export producing exactly the payload shape the shipped `public/sdk/examples/simastry-aura/` example documents (`app/surface/source/chart/verifiedOwnership/aiAstrologistContext/posture`). Simastry remains a *destination*, never the owner — the Registry composes, Simastry may consume.
- **Two auras (compatibility):** two saved charts + two addresses side by side; synastry stays chart-to-chart (talismans never affect compatibility — Law 3 extended: shared held signs are noted as fact, never scored).
- **Vitrine time scrubber:** Direction C's "discs leave the case" as a time-travel mode on top of the ring.
- **SDK alignment:** if/when the external `@zodiacs/sdk` package ships its documented `getZodiacIdentityContext`, converge shapes so third parties can rebuild auras from the same context (the docs page's promise).
- **Wing daily brief / push** behind the existing push flag.

---

## 17. Testable acceptance criteria (MVP)

**Entry screen**
- [ ] With ≥1 saved chart: select renders all charts, newest preselected; changing selection persists for the session.
- [ ] With 0 saved charts: calculate CTA links `/birth-chart/?return=registry-aura`; after saving a chart there, a return band links back to `/registry/aura/`; arbitrary/unlisted `return` values are ignored (no open redirect).
- [ ] Invalid address string → inline error, **zero network requests** (assert via test fetch spy).
- [ ] Compose disabled until (valid address ∧ selected chart).

**Endpoint**
- [ ] Valid Solana address with known holdings fixture → 200 with unique zodiac-ordered `heldSigns`, ISO `checkedAt`.
- [ ] Address holding the same sign on both chains → sign appears once.
- [ ] Successful read with zero holdings → 200 `heldSigns: []` (cached); RPC failure / unconfigured chain → 503 `{error:'unavailable'}` (never cached); the two are never conflated. Responses never leak provider URLs.
- [ ] Cross-origin → 403; body >256 bytes → rejected; GET → 405 with `Allow: POST`; flag off → 404 `{error:'disabled'}`; malformed address → 400 backstop (client pre-validates).
- [ ] Response headers include `Cache-Control: private, no-store` + `X-Content-Type-Options: nosniff`.
- [ ] `tests/api/runtime-imports.test.ts` passes with the new handler registered.

**Composition (unit — `composeAura`)**
- [ ] Sample fixtures §10 reproduce exactly (states, evidence lists, aura sentence).
- [ ] Unknown time: no `natal-angle` evidence; no house/rising strings anywhere in output.
- [ ] Ambiguous natal Moon: no Moon rooted evidence; a note flag set.
- [ ] Determinism: same inputs twice → deep-equal output; no `Date.now()`/`Math.random()` in module (lint or grep assertion).
- [ ] `glowHues` ≤3 respecting priority; `['ink']` at 12 held; state priority radiant>rooted>awake>held reflected in sentence selection.

**Result screen**
- [ ] Every graphic fact exists as DOM text (plates); SVG has `role="img"` + generated label.
- [ ] Each plate shows exactly the four labeled registers, omitting empty ones; "Why this is showing" lists rule + literal inputs + truncated address + timestamps.
- [ ] 0 held: empty-state copy, no plates, no acquisition verbs on the page (grep the rendered HTML for "buy|acquire|swap" → only the disclosure-permitted usages, ideally zero).
- [ ] Stamps render `checkedAt`, sky data date, chart name.
- [ ] State words render as text chips (never color-only).
- [ ] `prefers-reduced-motion`: no transform/opacity keyframes run (assert computed styles in island test or Playwright).
- [ ] Share card: rendered PNG contains no birth time, no birthplace, no address by default; opt-in checkbox adds truncated address only. Card generation happens with zero network requests.
- [ ] No astronomy-engine module in the page's eager JS (report-bundles gate passes).

**Privacy**
- [ ] The only network request in the whole flow carries `{address}` and nothing else (integration assertion).
- [ ] No analytics event payload contains an address or birth field (assert event props against schema).
- [ ] localStorage after full flow contains only `zodiacs.aura.v1` additions per contract §11.

**Sitewide**
- [ ] `npm run build && npm run check && npm test` green (flag-off, CI parity); `check-dist` green (landing link resolves against the flag-off stub); wing-language + voice-ban greps green; `schema:check` green; `report-bundles --fail` green; `node scripts/build-app.mjs && git diff --exit-code -- public/` clean (legacy-drift parity after the landing edit).

---

## 18. Accessibility and responsive requirements

- **Text is the source of truth.** Everything the ring shows exists in plates as real text; the SVG is `role="img"` with a meaningful generated `aria-label`; decorative layers (`glow`, mounts) are `aria-hidden`.
- **Never color-only:** state = word chip + dressing; hue is reinforcement.
- **Contrast:** body/UI text uses ink tokens only (existing AA-passing values). Sign hues appear on `--void-0` only as ≥3:1 graphical elements (all 12 pastels clear 3:1 on `#060709`; `UNCERTAIN`: verify the two darkest, `#AE8FC9` and `#DE8E79`, at implementation — if any falls under 3:1 for a meaningful graphic, pair it with a hairline outline).
- **Keyboard:** focus order = chart select → address input → compose → aura sentence → chips (anchor to plates) → plates → share → disclosures. Chips and plate links have visible focus rings (site convention). No focus traps; `<details>` native semantics for why-showing.
- **Reduced motion:** §8 — full parity of information, single fade, no loops.
- **Screen reader flow:** aura sentence is an `h2`-level landmark after composition; a visually-hidden live region announces "Aura composed: N held signs" when results arrive.
- **Touch/responsive:** 44px minimum targets; composition ≤92vw (max 420px) on mobile with 32px discs and tethers dropped (information preserved in plates); plates stack full-width; two-column desktop ≥960px with sticky composition; no horizontal scroll anywhere; share button not sticky.
- **i18n readiness:** all strings keyed; templates use slot interpolation (no concatenation that breaks in ES).

---

## 19. Risks, assumptions, unresolved questions, deliberate exclusions

### Labeled assumptions & uncertainties
1. **`ASSUMPTION` — the documented `@zodiacs/sdk` is aspirational.** The npm package's documented exports (`getCrossChainZodiacsOwnership`, `getZodiacIdentityContext`, …) exist nowhere in this repo and the package is not a dependency. The plan composes from the shipped `src/lib/wallet/` code instead. If the owner expects the *public package* to power this feature, publishing/aligning it is a separate project (Phase 3 hook). **The brief's "audit the actual SDK exports" was done: what exists = in-repo wallet lib; what can be composed = holdings+parse+config; what must be added = the thin endpoint + everything client-side.**
2. **`OWNER DECISION` — wallet connect.** Shipped disclosure strings and `docs/WALLET-CHART.md` explicitly promise "no wallet connection." Adding Phantom/EIP-1193 address-only connect (brief's path 1) requires revising: `src/strings/wallet-chart.ts` boundary copy, the localized `disclosure.readOnlyStatement` strings, `docs/WALLET-CHART.md`, and the registry landing's "Read-Only By Design" section. Planned for Phase 2 pending sign-off; MVP is paste-only and fully coherent without it.
3. **`OWNER DECISION` — third consumer-side cross-link** (birth-chart → aura) amends CLAUDE.md's sanctioned-links rule.
4. **RESOLVED — CI grep exclusion verified** by running the actual grep: `src/islands/registry/` is exempt via `--exclude-dir=registry`; `src/lib`/`src/strings`/`src/styles`/`api/` are unscanned. Chain nouns still live only in `src/strings/aura.ts` as belt-and-braces. The voice-ban grep has **no** registry exclusion — copy must clear it on its own.
5. **RESOLVED — Wheel reuse verified:** `Wheel.tsx` renders from plain summary bodies + optional asc/mc/cusps with no engine in its import graph, and its `renderOverlay(geo)` prop is the intended extension slot for the carry ring. No adapter or fork needed.
5b. **`UNCERTAIN` — flag-gated redirect stub (verify FIRST, it gates the landing link):** the landing card is the first dist-wide `href` to a flag-gated route. Confirm the flag-off build emits `dist/registry/aura/index.html` as a noindex meta-refresh stub for `Astro.redirect` (`ls dist/registry/aura/ && grep -c 'noindex' dist/registry/aura/index.html`) so `check-dist` link integrity passes. Fallback if no stub is emitted: render a minimal noindex "instrument offline" page instead of redirecting — which also removes the sitemap coupling entirely.
6. **`ASSUMPTION` — daily.json noon-UTC snapshot is acceptable as "now"** for MVP (stamped honestly). Live-instant is Phase 2.
7. **`ASSUMPTION` — "holds" means literal balance > 0** of an official representation, dust included. This is the honest verified fact; no thresholding. Stated plainly in method footnote.
8. **`UNCERTAIN` — engine-version drift policy** for stored summaries (§12 last row): copy whatever `ProfileDashboard` does.
9. **Cost/abuse risk:** a public holdings endpoint invites scripted use. Mitigations copied from wallet-birth: same-origin gate, body cap, TTL cache, neutral errors; monitor function invocations after launch.
10. **Semantic honesty risk:** users may read "Radiant" as rank. Mitigated by Law 3 language, zodiac-order plates (never sorted by state), and no counts framed as achievement. Watch first-party copy drift in future edits.
11. **Generated-output discipline:** three separate generated artifacts can silently break CI if not committed with their sources — `public/assets/app.js` (with the `src/app.jsx` landing edit; `legacy-drift` gate), `i18n-additions.md` + count pins (with any OG/SEO string addition; asserted in `npm test`), and `public/assets/og/v2/manifest.json` (with any new OG card; `verify-og-cards.mjs` runs on every build). The OG card is deferred to a follow-up commit for exactly this reason.
12. **Known local-verification quirk (pre-existing, shared with wallet-chart):** building flag-ON locally makes `check-dist` fail on sitemap coverage for the gated page. Run the verification suite flag-off (CI parity); the flag-ON build is a spot-check for schema/bundles only.

### Deliberately excluded (do not build)
Scores, levels, leaderboards, streaks tied to holdings · rarity/price/value/balance display or weighting · token-gating of any astrology tool · holdings-change notifications · ENS/SNS name resolution · NFT/other-collection support · server-side aura storage or any server join of birth+address · share **links** that encode chart+address together (privacy review first; card-only in MVP) · horoscope/compatibility surfaces mentioning holdings (register boundary is one-way: the wing reads astrology data; astrology surfaces never read wallet data) · auto-connect or connect-on-load of any wallet · buying-improves-anything framing anywhere, including empty states.

---

## 20. Analytics (privacy-posture compatible)

Plausible custom events, following the shipped `wallet_chart_computed` discipline — booleans and coarse buckets only; never an address, never birth data, never exact held-sign lists:

- `aura_view` — page view (default).
- `aura_compose` — props: `chain` (`solana|base`), `chart_source` (`saved|fresh`), `outcome` (`holdings|none|unavailable|invalid`), `held_bucket` (`0|1|2-5|6-11|12`).
- `aura_refresh` — no props.
- `aura_share` — props: `kind: 'card'`, `address_included: boolean`.
- `aura_record_click` — props: `sign` (slug) — navigation to `/registry/{sign}/`.
- `aura_calc_roundtrip` — fired when a user returns via the return band (measures the calculator handoff).

Explicitly not tracked: addresses (even truncated), held-sign combinations, chart identifiers, birth fields, session-linking of the above.

Wiring note (verified): every event must be registered in `src/lib/analytics-config.mjs` (per-event prop allowlist, 32-char value cap) **and** added to the `AnalyticsEventName` union in `src/lib/analytics.ts` — unregistered events are silent no-ops. The allowlist mechanism itself enforces "no address can ever ride along."

---

## The smallest coherent MVP (hand to Sol Ultra)

**One page, one endpoint, one pure module, one card.**

1. `api/aura-holdings.ts` — POST `{address}` → `{ok, chain, address, heldSigns[], checkedAt}` | `{ok:false, error}`; same-origin + flag + TTL cache; wraps `parseWalletAddress` + `resolveOfficialHeldSigns`.
2. `src/pages/registry/aura/index.astro` — flag-gated shell (404 when off), hero + boundary line, breadcrumb JSON-LD, OG card ref, mounts the island.
3. `src/islands/registry/Aura.tsx` — saved-chart select (via `useProfile`) with calculator-return CTA; paste input with chain detection; compose flow; carry-ring composition around the existing `Wheel`; talisman plates with `Record/Chart/Sky/Reading` lines + "Why this is showing"; aura sentence; all §12 states; share-card button; disclosures. Zero engine in the eager chunk (chart from `summary`, sky from `daily.json`/`sky.json`).
4. `src/lib/aura/{compose,types,cache}.ts` + `src/strings/aura.ts` + `src/styles/aura.css` + `src/lib/aura/share-card.ts`.
5. Edits: `src/lib/wallet/config.ts` (aura gates), `tests/api/runtime-imports.test.ts` registration, calculator return band (allowlisted param), the three-part landing entry (`src/app.jsx` + regenerated `public/assets/app.js` + static `#identity` card, committed together), analytics registration, `docs/AURA.md`. **Not in MVP:** dedicated OG card (follow-up commit, recipe in §15), sitemap entry (deliberately none).
6. Tests: `composeAura` fixtures (§10, co-located `compose.test.ts` per repo convention), `tests/api/aura-holdings.test.ts` (clone wallet-birth's recorder pattern), island helper test, config-gate tests. All §17 criteria; all listed CI gates green.

States Rooted/Awake/Radiant/Held from: natal bodies + angles (time known) × daily-sky bodies, season, Moon, retrogrades. EN only. Paste only. Card only. Everything else is Phase 2+.

This MVP is end-to-end auditable: every claim on screen traces to a fixture-testable pure function, a same-origin endpoint contract, or a committed data file — and it deletes cleanly (one flag) without touching any existing surface except the small, listed edits.

---

## Build order and verification (validated against the repo)

**Ordered build sequence:**
1. Verify the flag-gated stub behavior first (§19 item 5b) — it decides redirect-vs-offline-page for the page shell.
2. `src/lib/wallet/config.ts` + tests (`auraEnabled`, `configuredAuraChains`) — everything else depends on it.
3. `src/lib/aura/types.ts` + `compose.ts` + `compose.test.ts` (pure core, test-first; sky passed as an argument, never `Date.now()`).
4. `api/aura-holdings.ts` + `tests/api/aura-holdings.test.ts` + `EXPECTED_HANDLERS` registration.
5. `src/strings/aura.ts` → `src/islands/registry/Aura.tsx` (+ subcomponents, test) + `src/styles/aura.css`.
6. `src/lib/aura/share-card.ts` (+ test, per `wallet/share-card` precedent).
7. `src/pages/registry/aura/index.astro` (gate, JSON-LD, disclosures, `clientUi: true`).
8. `ChartCalculator.tsx` return band.
9. Landing entry: `src/app.jsx` → `node scripts/build-app.mjs` → static `public/registry/index.html` edit → commit the three together.
10. Analytics registration, `docs/AURA.md`, optional smoke probe / budget entry.

**Verification commands (in order, flag-off = CI parity):**
```bash
npm test                                   # units incl. compose fixtures, endpoint, runtime-imports
npm run build && npm run check
node scripts/check-dist.mjs                # landing link must resolve against the stub
node scripts/report-bundles.mjs --fail     # budgets + engine isolation (no astronomy-engine in aura chunks)
npm run schema:check
ls dist/registry/aura/ && grep -c 'noindex' dist/registry/aura/index.html   # stub check (§19 5b)
# the two CI greps, verbatim (both must pass):
! grep -RInE --exclude-dir=registry --exclude=WalletChart.tsx 'Solana|DexScreener|Jupiter swap|ERC-20|SPL record|memecoin|market cap' src/pages src/components src/islands src/content src/layouts
! grep -RIniE 'done properly|computed properly|shows? (its|their) work|like a human( wrote it)?|no mush|not vibes|speaks human|como es debido|sin paja' src/content src/pages src/components src/islands
# flag-ON spot-check (expect the known check-dist sitemap failure only; schema + bundles must pass):
PUBLIC_AURA_ENABLED=1 SOLANA_RPC_URL=https://example.invalid BASE_RPC_URL=https://example.invalid npm run build && npm run schema:check && node scripts/report-bundles.mjs --fail
node scripts/build-app.mjs && git diff --exit-code -- public/   # legacy-drift parity
```

**End-to-end behavioral check (manual, flag-on dev):** save a chart at `/birth-chart/` → visit `/registry/aura/` → select the chart → paste a fixture address → confirm the composition, plates, "Why this is showing" receipts, empty/unavailable states (kill the RPC env to force 503), reduced-motion behavior (OS setting), and the share card's contents (no birth time/place/address by default).
