# Registry Aura — adversarial design audit & revised visual specification (v2)

> **RETIRED — do not implement.** The Aura feature was cancelled before any code was written
> (owner direction, 2026-07-16; see `docs/REGISTRY-COLLECTION-PIVOT.md`). The Registry segment
> ships instead as **The Collection** at `/registry/collection/`. This document is kept as
> history; only its endpoint/CI verification material remains useful as reference.

**Prepared by:** Fable (adversarial product strategy + information design — planning/audit only)
**For:** Sol Ultra (audit + implementation of the approved revision)
**Supersedes:** the visual grammar, state system, share card, and parts of the copy spec in `docs/REGISTRY-AURA-PLAN.md` (v1). v1's product thesis, route, wallet/data architecture, endpoint contract, privacy boundaries, phasing, and CI-gate analysis stand unless amended in §14.
**Date:** 2026-07-16

---

## Context

**Ground truth first:** no Aura code exists anywhere in the repo — `src/lib/aura/`, `src/islands/registry/`, `api/aura-holdings.ts`, `src/pages/registry/aura/` are all absent; the only artifact is the v1 planning document (`docs/REGISTRY-AURA-PLAN.md`, commit `fea25bb`). "The current implementation" under audit is therefore the approved v1 spec, which is the design any implementation would follow. Nothing has shipped; every change below is a spec change, not a rework.

**Method:** a multi-agent adversarial review — two grounding passes over the actual codebase (wheel internals, token values, share-card infrastructure, existing chip/overlay precedents) and five hostile lenses (astrology skeptic, crypto-native user, ordinary first-time visitor, information designer, privacy/trust auditor) attacking both the v1 Carry Ring and the proposed "Proof before poetry" revision, then a judge pass that deduped 57 raw objections into 22 findings (20 confirmed after stress-testing, 11 high-severity) plus 8 risks no lens caught. The confirmed findings drive everything below; weak/contrived objections were discarded.

The concern that prompted this audit is **confirmed and understated**. The composite doesn't merely fail to distinguish wallet holdings from natal placements — several v1 devices actively assert the misreadings we forbid in prose.

---

## 1. Blunt assessment of the v1 Carry Ring

The topology is right and almost everything drawn on it is wrong.

1. **The central encoding is unlearnable on this site.** Pastel sign discs are the sitewide iconography for "the sign itself" — nav grid, sign guides, horoscopes, chips (`.chip`, `.pglyph--disc` even seats *planet glyphs* on pastel discs). v1 asks the same 128px art to suddenly mean "a token someone bought." A first-time visitor reads the ring as "my zodiac signs"; nothing on the diagram says otherwise. This is designed-in polysemy, and it is the root of the "decorative astrology/NFT wheel" reading.
2. **The tethers draw the forbidden claim.** v1's dotted tether from a held disc to a natal glyph uses the same `stroke-dasharray '3 3'` vocabulary the shipped wheel uses for separating aspects (`Wheel.tsx:342`, verified). To an astrology-literate viewer a dashed line ending at a planet glyph *is* aspect notation; to everyone else it's an influence arrow. Either way the graphic asserts "the token acts on your Moon" — the exact claim Law 2 exists to deny. Worse, the transits page already renders an outer ring of glyph marks with a dashed seat ring (`renderTransitOverlay.tsx`), so site-literate users have been explicitly trained that "outer ring + dashes = transiting bodies." The Carry Ring walks into that prior.
3. **The empty mounts are a sticker album.** Twelve dotted "waiting" mounts, a "Nine mounts stand empty" count, a catalogue link in the result region, and a unique near-white glow reserved for full carry: together that is the universal set-completion grammar — a 0/12 scoreboard around the user's own chart, two clicks from acquisition links. v1 bans collection pressure in words and manufactures it in picture.
4. **Rooted/Awake/Radiant is a rank ladder wearing a poem.** The system itself ranks the states (glow-hue priority, headline-clause priority); Radiant stacks *every* dressing (tether + wider halo + lift); the state words render as uppercase chips. Size and luminance are the strongest preattentive rank cues there are. Since which signs you buy determines whether you can be "Radiant," the implicit loop is *buy matching signs to rank up*. ("Radiant" is literally a top competitive-game rank.) v1's own risk register (§19.10) concedes this and mitigates with copy — the weakest control against a rank-shaped picture.
5. **The luminance channel is spent twice.** A decorative ≤3-hue glow and a 0.7↔1.0 breathing loop occupy the same radius where halo *presence* (Awake) and halo *width* (Radiant vs Awake) must be read. "Slightly wider blur" is not a readable encoding — on a dim phone, for colorblind users, or at all.
6. **The pedagogy is motion-only.** The born-with / carried / activated thesis is delivered solely by the 2-second entrance choreography; reduced-motion users get one 180ms fade and a 4px "lift" (~0.7% of the composition) as the entire static explanation. And the fly-in-from-shelf verb is mint-reveal/pack-opening grammar — it stages the *holdings* as the payoff.
7. **The grammar overclaims control.** Reading templates say "Your {Sign} talisman…" about facts derived from an unsigned paste-any-address lookup. Paste a whale's address and the page calls someone else's property "yours" — contradicting v1's own disclosure ("holding does not prove which person controls an address"). Crypto-natives paste famous addresses into every new tool within days; this will be screenshotted.

**Every skeptical misreading in the brief is confirmed as realistic** — wallet-altered-chart (tethers), active-means-on-chain (halo + "Awake" without a source label), focal-sign-as-rank (dressing stack), lookup-proves-identity (possessive grammar), established-technique (the "talisman" term of art plus ritual chrome). What survives: the topology (natal wheel center, holdings outside, plates below), the four-register plates, the deterministic derivation, the privacy architecture, and the honest data stamps.

---

## 2. The strongest objections, by audience

**Astrology skeptic** (knows bi-wheels, thinks NFTs are a grift):
- "That's a transit bi-wheel drawn wrong — you've put *products* where transiting planets go, and drawn aspect lines to them. You're claiming tokens aspect the Moon."
- "'Radiant/Rooted/Awake' is an invented technique cosplaying as one. 'Talisman' is a term of art — electional magic, an object made at a chosen moment — and a purchased meme token is not that."
- "The equation gives a purchase record the same epistemic standing as ephemeris data. Also 'deterministic' is a tell — a horoscope column is also a deterministic lookup."

**Crypto-native user** (Solana/Base daily, allergic to soft shill):
- "'Active' next to a wallet means on-chain activity. Full stop."
- "Glow + lift + special full-carry state = rarity tiers. The ring of empty slots is a collect-them-all tracker. I know this pattern; it's how you sell me the other nine."
- "It says 'your Taurus talisman' off an unsigned address paste. I'll run vitalik's address and screenshot your site calling his bags mine."
- "'Exact next activation · 3 Aug' is unlock/snapshot grammar. You just told people there's a date to trade around."
- "The share card is an NFT flex card: hero token art, three achievement pills, 'PUBLIC WALLET' in caps. The 'not a wallet score' fine print will never be read and one crop deletes it."

**Ordinary visitor** (likes horoscopes, no wallet):
- "Those little circles are the zodiac signs — I've seen them all over this site. Why are some of my signs greyed out?" *(reads mounts as missing signs in her chart)*
- "'Reading the public record… setting your chart…' — did it just put my birth chart on the blockchain?" *(parallel mono status lines assert parallel kind)*
- "Talisman? Mounts? Radiant? I don't know these words, so I'll go by which one glows most." *(jargon opacity forces decode-by-rank)*
- "A notch? I can't see a notch." / "Stars mean it's rated good, right?"

**Reviewer lenses (info-design, privacy) — the two most consequential findings:**
- **The proposed card leaks the chart it promises to exclude.** "Chart match" + the focal sign disc *is* a natal placement, stated by inference. Dated cards posted repeatedly beside a public address accumulate the poster's chart sign-by-sign (Sun+Moon narrows a birth date to ~2.5-day windows), and with only twelve official tokens the holder set is small enough to reidentify in both directions. No copy fixes this; only structure does.
- **The proposed equation implies the wallet computes the reading.** `+` and `→` are derivation notation; screenshots circulate without footnotes; and the denial is only half-true (holdings *do* select which signs get read). Four of five lenses converged on this independently — the strongest signal in the audit.

---

## 3. Verdict: **redesign** — retain the topology, replace the grammar

- **Not retain:** seven of the eleven high-severity findings are drawn into the v1 composite itself (discs-as-signs polysemy, tethers, mounts, ladder dressing, glow, motion-only pedagogy, choreography verb). Copy cannot out-argue a picture.
- **Not replace:** the topology — natal wheel at center, held objects outside it, evidence plates below — is the one arrangement that shows sign-to-sign correspondence spatially without putting tokens *inside* the chart, and it reuses the shipped, byte-pinned `Wheel` untouched via `renderOverlay(geo)`. The proposed alternative framing ("Proof before poetry") is a *sequence and labeling* correction, not a different diagram; discarding the composition entirely would forfeit the only visual the feature has that a table can't do.
- **Therefore:** keep the ring's skeleton; delete every state dressing on it; rebuild the mark system so each of the three sources owns exactly one mark class that appears nowhere else on the site; move the proof (sources, labels, legend) ahead of the poetry (reading), per the proposal — with the amendments below.

## 4. "Proof before poetry": adopted, with amendments

The direction is correct. Its specific devices were each stress-tested; five survive, five are replaced by stronger forms of their own intent:

| Proposal element | Verdict | v2 form |
|---|---|---|
| Evidence before interpretation | **Adopt** | Page order: sources docket → composition + legend → reading. The reading never appears above or inside the evidence. |
| Neutral planet glyphs = birth chart | **Adopt** (already true) | The shipped wheel stays as-is (its markup is byte-pinned by `wheel-serialization.test.ts`). All *aura* chart-match marks use pure-ink glyphs on void chips — no hue. |
| Pastel discs = held Zodiacs only | **Adopt + harden** | Discs alone are polysemic here (finding: "unlearnable"). Held discs get a **seat frame** — a squared hairline frame (museum-case plinth) that appears nowhere on consumer surfaces — plus a persistent legend. Frame + legend make the meaning learnable in one glance. |
| Equation banner `A + B + C → READING` | **Replace** | Arithmetic notation reads as "the wallet is an operand in a score formula." v2: three **typed** source panels (chart/sky in computed styling with figures and data dates; wallet in ledger styling with checkedAt) joined by prose — *"Three records, read side by side."* — and one fixed sentence: *"The record never changes the chart — it only selects which signs receive a reading."* |
| White outer **stars** | **Reject** (arcs adopted) | Point-stars read as ratings, as sloppy transit bodies, or as starfield ambience — and violate the design system's ban on decorative status dots. v2: one solid 2px **arc** per sky-active sign spanning its 30° sector on a dedicated outermost band, `--ink-0` at 70%. One arc per sign regardless of body count; bodies are named in the plates. |
| Inward **notch** = chart match | **Reject** (glyph chip adopted) | The only device all five lenses rejected independently: sub-perceptual at 32–40px, priorless, destroys the painterly art, can't name the matching body, dies in feed recompression. v2: an additive **ink planet-glyph chip** (≥16px, hairline-outlined, void-2 fill, ink-0 glyph of the actual matching body) docked at the disc's inner edge — adjacency, never connection. Max 2 chips + mono `+N` overflow. |
| Small pointer = reading focus | **Reject** | Any persistent per-disc focus marker re-creates prestige (mark inflation: v1 already stacked up to five modifiers on one 40px disc; hard budget is now two). The diagram stays democratic. "Focus" exists only in the aura sentence and on the card; hovering/tapping a plate transiently highlights its disc (dims others to 40%), and that behavior is never persisted or screenshot-permanent. |
| "Natal echo" → "Matches birth chart" | **Adopt, refined** | Final label: **"In your birth chart"** (the evidence line names the body: *"— your natal Moon sits there"*). "Matches" is a verifier's verdict word; adjacency to the genuinely verified Record register would launder it. |
| "Active now" → "Active in today's sky" | **Adopt, refined** | "Active" is on-chain vocabulary and "today" outruns the noon-UTC snapshot. Final label: **"In the sky of {15 July}"** — the label carries its own date everywhere; "today/now" is suppressed whenever the data date differs from the viewer's local date. |
| Explicit symbolic/deterministic/non-proof statement | **Adopt, reworded** | "Deterministic" is rigor-borrowing in user copy. v2 states the operational fact instead: *"The same chart, the same record, and the same dated sky always produce the same words."* The non-proof enumeration stays (positive statement first, fullest list in `/disclosure/`). "Deterministic" remains a spec/internal term only. |

**Also retired from v1 by this audit:** the composite aura glow (encoded nothing; taxed the channel that did), halos and breathing, the 4px lift, empty mounts, the absence count, the full-carry special glow, the shelf row and fly-in choreography, state words as chips, "talisman"/"mounts"/"seats" in user-facing chrome, and the state nouns Rooted/Awake/Radiant everywhere in the UI (the reading text says it plainly instead: *"in your chart and in today's sky at once"*). The feature keeps exactly one coined word: **Aura**, the product name, always adjacent to its gloss.

---

## 5. The v2 visual grammar (normative)

**One source, one mark class, stated in a persistent legend. Nothing else is drawn.**

| Source | Mark | Spec | Never |
|---|---|---|---|
| Birth chart | the shipped natal wheel; ink glyph chips for matches | wheel untouched; chip: 16–20px, `--void-2` fill, `--hair-3` outline, glyph stroked `--ink-0`, docked at disc inner edge | never pastel; no line may terminate at a planet glyph (hard rule) |
| Wallet record | pastel disc in a **seat frame** | 40px disc (128 WebP; 32px <420px) at sector midpoint on the carry ring (`geo.pt(midLon, rOuter)`); frame = 1px `--hair-2` square with 2px corner ticks, 4px padding | no frames on consumer surfaces; no discs inside the wheel; no halos/glow/lift; **no marks at all for unheld signs** |
| Current sky | sector **arc** | 2px solid, `--ink-0` @70%, dedicated band ~8px outside the disc ring, spanning the active sign's 30° | never point marks, stars, dots, or glyphs on this band |

- **Mark budget:** a held disc may carry at most two modifiers — glyph chip(s) and the sector arc (which is off-disc). Nothing stacks.
- **All twelve hues clear ≥7:1 on `--void-0`** (lowest: aquarius `#AE8FC9` at 7.27) — frames and arcs need no outlines for contrast, only for meaning.
- **Legend (persistent, all motion modes, directly under the composition — it is the final beat of the entrance, not a hover):**
  - `[framed-disc swatch]` Held at this address — public record, read {14 July}
  - `[glyph-chip swatch]` In your birth chart — stays on this device
  - `[arc swatch]` In the sky of {15 July}
- **Motion (all CSS):** discs fade/scale into place *in place* (the reduced-motion treatment promoted to default — no shelf, no flight), 90ms stagger; arcs draw on via dash-offset (`--dur-2`); legend rows fade in last. No idle animation at all. Reduced motion: single 180ms fade of the finished composition. Aliveness now lives in the reading text and the daily-changing arcs, not in luminance loops.
- **Sources docket** (full-width, above the composition — the proof in "proof before poetry"): three cells, deliberately *not* styled identically:
  1. **YOUR BIRTH CHART** — stamp `LOCAL · stays on this device` — `{chart name} · {n} placements` (mono figures)
  2. **PUBLIC WALLET RECORD** — stamp `PUBLIC · read {14 Jul, 18:02}` — `{3fxT…9Q2w} · holds {N} of the Twelve`
  3. **THE SKY** — stamp `COMPUTED · {15 July, 12:00 UTC}` — `Sun 23° Cancer · Moon 11° Scorpio`
  Header: *"Three records, read side by side."* Join sentence beneath the docket: *"The record never changes the chart — it only selects which signs receive a reading."* When holdings and sky carry different dates, both dates render at full strength and the aura sentence drops all "today" phrasing (mixed-vintage rule, §15.3).

---

## 6. Decision-complete visual hierarchy — on-site result

Reading order (identical semantic order on mobile and desktop):

1. **Page hero** (unchanged from v1 register): `.kicker` *Identity context* → `h1.display` Registry Aura → boundary line `.mono`.
2. **Sources docket** (§5) — full width. This is the first thing a composed result shows.
3. **The composition** — wheel + framed discs + arcs. SVG `role="img"`, generated label in fact language (§11).
4. **Legend** — the three rows, always visible, `--text-sm`.
5. **Aura sentence** — EB Garamond `--text-xl`, the single serif headline. Address-relative for holdings, second-person only for chart facts: *"Two of the Twelve are held at this address. The Cancer it carries sits in your chart and in the sky of 15 July at once."*
6. **Plates** (zodiac order, `.tile`, `--sign` hue on the accent hairline only) — rows `RECORD` / `CHART` / `SKY` / `READING` with mono labels; literal chips only (`Held` · `In your birth chart` · `In the sky of 15 Jul`); "Why this is showing" `<details>` per plate.
7. **Share block** — **pre-share disclosure (two lines) sits above the button**: *"The card shows this sign, the facts you see below, and the date. It never shows your birth details or the address."* / *"Adding 'In the chart' reveals one sign of your chart on a public image."* Then `Make a card`, with the opt-in checkbox for the chart-match line (default off).
8. **Disclosures aside** — positive statement first; the true network shape (*"the one network request carries the pasted address; like any web request it reaches our host with your network address — addresses are not logged and are excluded from analytics"* — backed by a documented logging policy in `/disclosure/`, which implementation must add); local-storage note + **"Forget this address"** control; non-proof enumeration; method sentence (§4 last row).

Type hierarchy: docket stamps + chips + labels = JetBrains Mono 10–11px tracked; docket values = mono `--text-sm`; aura sentence = serif `--text-xl`; plate sign names = serif `--text-lg`; READING lines = serif italic; everything else Instrument Sans. Hues appear only in disc art and plate accent hairlines.

---

## 7. Wireframes

### Mobile 375px (result state, 4 held)

```
┌─────────────────────────────────┐ 375px
│ Identity context        (kicker)│
│ Registry Aura         (display) │
│ Address-only. Read-only.  (mono)│
├─────────────────────────────────┤
│ THREE RECORDS, READ SIDE BY SIDE│
│ ┌─────────────────────────────┐ │
│ │ YOUR BIRTH CHART      LOCAL │ │  docket cells stack;
│ │ Amaya · 13 placements       │ │  stamps right-aligned
│ │ stays on this device        │ │
│ ├─────────────────────────────┤ │
│ │ PUBLIC WALLET RECORD PUBLIC │ │
│ │ 3fxT…9Q2w · holds 4 of the  │ │
│ │ Twelve · read 14 Jul        │ │
│ ├─────────────────────────────┤ │
│ │ THE SKY            COMPUTED │ │
│ │ Sun 23° Cancer · Moon 11°   │ │
│ │ Scorpio · 15 July           │ │
│ └─────────────────────────────┘ │
│ The record never changes the    │
│ chart — it only selects which   │
│ signs receive a reading.        │
├─────────────────────────────────┤
│        ╭── sky arc ──╮          │  composition ≤343px:
│      ◠ ˙˙˙˙˙˙˙˙˙˙˙˙˙ ◠         │  natal wheel center,
│    ⟦♋⟧    ( WHEEL )    ⟦♉⟧     │  framed discs at their
│     ☽│    (  natal )           │  sectors (chip ☽ docked
│      ˙    (  glyphs)    ⟦♍⟧    │  on Cancer), arcs only
│           ˙˙˙˙˙˙˙˙˙     ⟦♑⟧    │  on sky-active sectors
├─────────────────────────────────┤
│ ⟦▣⟧ Held at this address —      │
│     public record, read 14 Jul  │
│ ⟦☽⟧ In your birth chart —       │
│     stays on this device        │
│ ⌒   In the sky of 15 July       │  ← legend, persistent
├─────────────────────────────────┤
│ Two of the Twelve are held at   │  aura sentence (serif)
│ this address. The Cancer it     │
│ carries sits in your chart and  │
│ in the sky of 15 July at once.  │
├─────────────────────────────────┤
│ ┌ CANCER ──────────── ♋ disc ┐ │  plates, zodiac order,
│ │ RECORD Held at this address │ │  full width, 44px+
│ │        · read 14 Jul        │ │  targets
│ │ CHART  Your natal Moon sits │ │
│ │        at 3°12′ Cancer.     │ │
│ │ SKY    Sun 23° Cancer — in  │ │
│ │        season (15 Jul).     │ │
│ │ READING The Cancer carried  │ │
│ │  at this address is doubly  │ │
│ │  lit — your Moon lives      │ │
│ │  there, and the season is   │ │
│ │  answering.       (italic)  │ │
│ │ ▸ Why this is showing       │ │
│ │ View the record →           │ │
│ └─────────────────────────────┘ │
│ [ …three more plates… ]         │
├─────────────────────────────────┤
│ The card shows this sign, the   │  pre-share disclosure
│ facts below, and the date. It   │  ABOVE the button
│ never shows your birth details  │
│ or the address.                 │
│ ☐ Add "In the chart" (reveals   │
│   one sign of your chart)       │
│ [ Make a card ]                 │
├─────────────────────────────────┤
│ Disclosures · Forget this       │
│ address · method sentence       │
└─────────────────────────────────┘
```

### Desktop ≥960px

```
┌──────────────────────────────────────────────────────────────┐
│ hero (kicker / display / boundary line)                      │
├──────────────────────────────────────────────────────────────┤
│ THREE RECORDS, READ SIDE BY SIDE                             │
│ ┌ YOUR BIRTH CHART ┐ ┌ PUBLIC WALLET ─┐ ┌ THE SKY ────────┐ │
│ │ LOCAL · on device│ │ PUBLIC · 14 Jul│ │ COMPUTED · 15/07│ │
│ │ Amaya · 13 plcmt │ │ 3fxT…9Q2w · 4  │ │ Sun 23°♋ ☽ 11°♏│ │
│ └──────────────────┘ └────────────────┘ └─────────────────┘ │
│ The record never changes the chart — it only selects…       │
├──────────────────────────┬───────────────────────────────────┤
│                          │ Aura sentence (serif, --text-xl)  │
│   composition (sticky,   │───────────────────────────────────│
│   max 560px):            │ CANCER plate                      │
│   wheel · framed discs   │ TAURUS plate                      │
│   · glyph chips · arcs   │ VIRGO plate                       │
│                          │ CAPRICORN plate                   │
│   legend (3 rows,        │───────────────────────────────────│
│   persistent)            │ pre-share disclosure + [Make a    │
│                          │ card] + opt-in checkbox           │
│                          │───────────────────────────────────│
│                          │ Disclosures · Forget this address │
└──────────────────────────┴───────────────────────────────────┘
```

---

## 8. The social card — 1080×1350, decision-complete

**Structural privacy rules (enforced in the renderer, not copy):** the card input type contains no address, chart-name, birth, body-name, degree, or count fields — it is `{ signSlug, facts: CardFact[], reflection, nextSkyEvent?, skyDate, checkedDate, createdDate }` where `CardFact ∈ {held, inChart, inSky}` and `inChart` is present only when the user opted in at share time. No `BodyName` string can reach the canvas (asserted by test). The address never appears on a card in any form — v1's truncated-address opt-in is deleted. Zero-held: the share block does not render at all (no "Nothing to card *yet*" unlock framing).

**Trust anchors are distributed across three bands** so no single crop removes them all: the date lives in the masthead, the disclaimer in the mid band, the URL in the footer.

```
┌────────────────────────────────────┐ 1080×1350, 72px margins
│ REGISTRY AURA        15 JULY 2026  │  mono 30, tracked, --ink-2
│ CHART · PUBLIC RECORD · SKY —      │  mono 26, --ink-2
│ READ TOGETHER                      │  (interpuncts, never × or +)
│ ────────────────────────────────── │  hairline
│                                    │
│              ⟦  ♋  ⟧               │  focal disc, 400px art
│           (pastel disc             │  at 340px, seat-framed
│            in seat frame)          │  exactly as on-site
│                                    │
│              Cancer                │  EB Garamond 96, --ink-0
│                                    │
│  Held by an address · checked     │  mono 30, --ink-1 —
│  15 Jul · in the sky of 15 Jul    │  prose fact line, only
│  [· in the chart]  ← opt-in only  │  true facts, no pill
│                                    │  chrome, no fixed slots
│ ────────────────────────────────── │
│  “Carried, and met by the          │  EB Garamond italic 44,
│   season.”                         │  ≤2 lines — the ONE
│                                    │  reading-size text
│  Symbolic reflection — not a       │  mono 26, --ink-2 (≥60%
│  wallet score.                     │  of fact-line size)
│                                    │
│  NEXT IN THE SKY — Full Moon in    │  mono 28 (only when
│  Aquarius · 3 Aug                  │  available; always the
│                                    │  named event — the word
│ ────────────────────────────────── │  "activation" is banned)
│ Composed on this device            │  mono 24, --muted
│ zodiacs.org/registry/aura          │
└────────────────────────────────────┘
```

**Copy hierarchy (exact, in paint order):** 1 `REGISTRY AURA` + date · 2 strapline · 3 focal disc · 4 sign name · 5 fact line · 6 reflection · 7 `Symbolic reflection — not a wallet score.` · 8 next sky event (optional) · 9 attribution footer.

**Amendments vs the proposed card, with reasons:**
- **Three source panels → one strapline.** At 250px feed width three panels are gray furniture, and a "BIRTH CHART" panel is a logical trap — the exclusion list leaves it literally nothing truthful to display. The card *asserts* the three sources in one line; the linked page *is* the evidence.
- **Badges → one prose fact line.** Three fixed pill slots are a 3/3 score with the numerals filed off — viewers count lit slots, and selection bias means only full rows get shared. Prose facts with no fixed positions cannot be counted or ranked.
- **"Held by address" → "Held by an address · checked {date}".** The indefinite article kills possession-by-poster (paste-anyone flow); the date kills permanence (the read is dust-inclusive, up-to-24h stale, classic-SPL-scope).
- **"Chart match" badge → opt-in, default off, and never a body name.** It reconstructs a natal placement on a public artifact; repeated dated cards accumulate a chart sign-by-sign. The pre-share disclosure states this cost plainly.
- **"Exact next activation" → the named sky event.** "Activation" + future date is unlock/catalyst grammar and invites timing behavior around purchased assets; `Full Moon in Aquarius · 3 Aug` is an attributed public sky fact with no token subject. `activation/activates` joins the strings-module ban list.
- **"Made privately at…" → "Composed on this device · zodiacs.org/registry/aura".** "Privately" is an unverifiable attestation on a forgeable PNG, and technically an overclaim (the lookup request necessarily reaches the host with the requester's network address). Attribution, not attestation; the honest version lives in the disclosures.
- **No held-count on the card.** "Holds N of the Twelve" is a countable brag surface; the card speaks only about its one focal sign.

Focal sign selection (deterministic, printed in "Why this is showing"): (1) in-chart ∧ in-sky, (2) in-sky, (3) in-chart, (4) held — ties broken by zodiac order.

---

## 9. Count states

- **0 held:** *no ring, no mounts, no composition chrome at all.* The docket renders (wallet cell: `holds none of the Twelve · read {date}`), the natal wheel renders clean, one quiet line: *"This address carries none of the Twelve. Your chart stands on its own."* No plates, **no share block**, no catalogue or acquisition-adjacent link anywhere in the result region (the catalogue link moves to the page footer/disclosures zone). All astrology tools remain linked in normal chrome.
- **1 held:** one framed disc on the ring; the single plate gets full width. The disc is *not* enlarged (identical mark grammar at every count — no spotlight prestige).
- **4 held:** the canonical layout (wireframes above).
- **12 held:** all twelve framed discs; **no special glow, no completion visual of any kind** — the aura sentence states it flat: *"All of the Twelve are held at this address. Three sit in your chart; two are in the sky of 15 July."* Full carry maximizes the page-screenshot disclosure (§15.2), so the pre-share disclosure line is joined by: *"With all twelve held, the chart marks on this page describe your whole chart at sign level."*
- **Unheld signs at any count: nothing is drawn.** The record lists what is present, not what is missing. No absence counts anywhere.

## 10. Evidence-matrix states (per held sign)

| State | Ring | Plate rows | Reading register (address-relative) |
|---|---|---|---|
| Chart-match only | framed disc + ink glyph chip(s) | RECORD, CHART, READING | *"The Taurus held at this address rests close to your chart — your natal Sun sits there. Temperament, not weather."* |
| Sky-active only | framed disc + sector arc | RECORD, SKY, READING | *"The sky of 15 July is moving through Virgo; the Virgo held here is met by weather, not by your chart."* |
| Both | framed disc + chip(s) + arc | RECORD, CHART, SKY, READING | *"The Cancer carried at this address is doubly lit — your Moon lives there, and the season is answering."* |
| Neither | framed disc only | RECORD, READING | *"Scorpio is simply carried at this address today — nothing in your chart or this dated sky singles it out. Presence, quietly."* |

No tier names, no stacked dressings, no magnitude encodings: *both* = both categorical marks, drawn at identical strength. One legend sentence closes the loop: *"Marks describe timing, not tiers."*

## 11. Copy register rules (normative, lint-enforced)

1. **Pronoun scoping:** second-person possessives are legal **only** for Chart-derived facts ("your natal Moon", "your chart"). All Record-derived and holdings-referencing Reading copy is address-relative ("held at this address", "the Cancer it carries"). Lint: no `your|you own|yours` token may co-occur with a holdings noun in RECORD/READING template strings. Never upgraded, even for previously-pasted addresses.
2. **Dates ride the labels:** every "sky" label carries its data date; every "held" claim carries its checked date; "today/now" is suppressed when the data date ≠ viewer's local date, and always in mixed-vintage renders.
3. **Banned in user-facing strings** (extend the strings-module ban list): `activation`, `activates`, `Rooted`, `Awake`, `Radiant` (chrome; plain-English equivalents in READING are fine), `talisman`, `mount`, `deterministic`, plus the repo's existing voice bans. Chain nouns remain confined to `src/strings/aura.ts`.
4. **Vocabulary:** one coined word — *Aura* — always within a sentence of its gloss. Otherwise: "held sign(s)", "plate", "the record", "the sky".
5. **Compose-flow reassurance at the moment of fear:** chart step label *"Your birth chart (stays on this device)"*; status line *"Setting your chart — nothing sent…"*; one sentence under the compose button: *"Only the pasted address is sent anywhere. Your birth details never leave this device."*
6. **Accessibility copy obeys every rule above:** the SVG `aria-label` and the live region use fact language — *"Natal wheel with four held signs: Cancer, held, in your birth chart, in the sky of 15 July; Taurus, held, in your birth chart; …"* — never the retired state nouns.

## 12. Five-second comprehension test

**Protocol:** 5 naive viewers per audience (ordinary, crypto-literate, astrology-literate); show the composed result page for 5 seconds; then ask (a) "What is this page showing?", (b) "Where did the information come from?", (c) "Did anything about this person's birth data leave their device?", (d) "Is anything here a score, a price, or proof of who owns the wallet?"

**Pass thresholds (page):**
- ≥4/5 distinguish *things someone holds at an address* from *the birth chart* as two different sources.
- ≥4/5 identify the sky/date as a third, dated input.
- ≥3/5 answer (c) with "no — it says it stays on the device."
- **0/5** answer (d) with yes; 0/5 describe any sign as "ranked," "rare," or "worth more."
- ≥4/5 can say what one legend row means after the 5 seconds (the legend is doing its job).

**Pass thresholds (card):** at 250px thumbnail, exactly two elements parse: the disc and the sign name. At full size for 5 seconds: ≥4/5 read the fact line as "someone's address holds this sign (checked on a date)"; ≥3/5 register "not a wallet score"; 0/5 believe it certifies wallet ownership by the poster.

## 13. Acceptance criteria for Sol Ultra (v2 additions/replacements)

**Composition & marks**
- [ ] DOM/SVG contains zero elements for unheld signs (seat-node count === heldCount; no mount class exists in the codebase).
- [ ] No `<line>`/`<path>` connector of any kind terminates within the bounding box of a natal glyph (geometry test over rendered SVG).
- [ ] No halo, glow, blur filter, breathing animation, or per-state size/offset difference exists (style + snapshot assertions); the only motion is entrance fade/stagger and arc draw-on, all disabled under `prefers-reduced-motion`.
- [ ] Sky arcs render only for signs with sky evidence; glyph chips render only for chart matches and each chip's glyph equals an evidence body; max 2 chips + `+N` overflow.
- [ ] Seat-frame chrome appears in no consumer-surface component (grep: the frame class exists only under `src/islands/registry/`).
- [ ] Legend renders in all states with ≥1 held sign, before the plates in DOM order, containing the three exact strings with live dates; `wheel-serialization.test.ts` still passes byte-identical (the wheel itself untouched).

**States & counts**
- [ ] 0 held: no ring/composition chrome, no share block, and no link inside the result region whose destination contains acquisition links (assert against `/registry/{sign}/` and `/registry/#catalogue` hrefs within the result container).
- [ ] 12 held: no unique visual treatment exists relative to 4 held (snapshot diff limited to disc count); the extra pre-share disclosure line renders.
- [ ] Mixed vintage (checkedAt date ≠ sky date): both dates render at full opacity in docket and legend; no user-facing string contains "today"/"now" (template test).

**Copy & a11y**
- [ ] String lint passes: banned tokens (§11.3) absent; pronoun-scoping rule holds over `src/strings/aura.ts` (automated: no second-person token in RECORD/READING templates that also contain a holdings noun).
- [ ] `aria-label`/live-region templates use fact language and carry dates (unit test on the generator).
- [ ] The compose status line for the chart step contains "nothing sent"; the pre-share disclosure renders above the share button in DOM and visual order.

**Card**
- [ ] Card renderer input type contains no address/chart-name/birth/body/degree/count field (type-level + runtime assertion); a `fillText` spy proves the painted-string set: must-include {`REGISTRY AURA`, the date, sign name, `checked`, `Symbolic reflection — not a wallet score.`, `Composed on this device`, `zodiacs.org/registry/aura`}; must-exclude {base58/0x patterns, any `BodyName`, `°`, digits matching a birth-date pattern, `activation`}.
- [ ] `inChart` fact absent unless the opt-in checkbox was checked this session (default off; not persisted).
- [ ] Export the PNG at 33% scale: disclaimer line passes an automated legibility check (≥14px effective); disc + sign name are the only elements above 20px effective.
- [ ] Date (masthead), disclaimer (mid band), URL (footer) verified present in three distinct vertical thirds of the canvas (crop-resistance assertion on text y-positions).

**Privacy & data**
- [ ] "Forget this address" control clears the `zodiacs.aura.v1` entry and is covered by a test; disclosures name the local storage of the pasted address.
- [ ] Analytics: `held_bucket` top bucket is `6-12` (never `12`); event payload schema test proves no address/birth/sign-list fields.
- [ ] The one network request carries only `{address}` (fetch spy), unchanged from v1's criterion.

**Carried over from v1 unchanged:** endpoint contract tests, engine-isolation bundle gate, wing-language/voice greps, schema/breadcrumb checks, entry-screen and unknown-time criteria.

## 14. Delta vs v1 (what Sol Ultra amends)

| v1 artifact | Change |
|---|---|
| `docs/REGISTRY-AURA-PLAN.md` §5–§10, §17 | Superseded by this document's §5–§13 (screens, ring anatomy, motion, reading templates, samples re-keyed to fact-language states, acceptance criteria). §1–§4, §11–§16, §18–§20 stand except as amended below. |
| Ring spec (§7): mounts, tethers, halos, lift, glow, shelf | Deleted. Replaced by seat frames + glyph chips + sky arcs + persistent legend (§5 here). |
| State system (Rooted/Awake/Radiant/Held as chips & priorities) | Deleted from chrome, analytics, aria, and sort logic. Internal `AuraSignState.state` enum may remain as spec vocabulary; it must never surface in strings. Focus priority (§8 here) replaces glow-hue priority. |
| Reading templates (§9) | Rewritten address-relative per §10–§11 here; clause tables re-authored under the pronoun lint. |
| Share card (§5, §8, share-card.ts plan) | Replaced by §8 here; address opt-in deleted; `inChart` opt-in added; structural exclusion type. |
| Screen C order (plates → share → disclosures) | Pre-share disclosure inserted above the button; catalogue link moved out of the result region. |
| Calculator return band (`?return=registry-aura`) | **Reclassified as OWNER DECISION and pulled from MVP** — it is itself a consumer-surface→wing cross-link, and CLAUDE.md sanctions exactly two. MVP fallback: the aura page auto-selects the newest saved chart via the existing `zodiacs:profile` event when the user navigates back manually. The return band ships, if approved, together with the Phase-2 entry-line decision. |
| Cache (`zodiacs.aura.v1`) | Add the "Forget this address" control + disclosure line (the cache is a durable local chart↔address join; shared-device risk must be user-clearable). |
| Analytics (§20) | `held_bucket`: `0|1|2-5|6-12`. All else stands. |
| `docs/AURA.md` plan | Add: small-holder-set reidentification note, cumulative chart-disclosure note (card), the logging-policy statement the disclosures now promise, and the mixed-vintage rendering rule. |
| Entrance choreography (§8) | Replaced by §5 Motion here (in-place fades; legend as final beat; no shelf). |

New components unchanged in name/location from v1 (`src/islands/registry/Aura.tsx` etc.); `AuraRing.tsx` simplifies (three mark primitives, no state dressing); everything else in v1's §15 file plan, endpoint contract, and CI analysis remains valid.

## 15. Residual risks & open items

1. **Card chart-disclosure is mitigated, not eliminated:** an opted-in `inChart` card still reveals one chart sign; repeat sharers accumulate disclosure. Mitigation: default-off + plainly-stated cost + no body names + no address ever. Accepted residual, documented in `docs/AURA.md`.
2. **Full-carry page screenshots** enumerate the user's natal sign distribution via the plates. MVP mitigation: the disclosure line (§9); Phase 2: a one-tap "hide chart marks" privacy toggle on the composition.
3. **Mixed-vintage evidence** (fresh sky + ≤24h-stale holdings) is now visually honest (dual dates, no "today") but still composes one artifact from two instants. Phase 2's explicit refresh + live-instant option closes it further.
4. **`LOCAL/PUBLIC/COMPUTED` stamps** are load-bearing trust UI; they must not be cut in visual QA for density reasons — they are the anti-"uploaded my chart" device (finding: upload fear forms in the compose moment).
5. **Owner decisions outstanding:** calculator return band + birth-chart entry line (one decision, two artifacts); Phase-2 wallet-connect disclosure revision (unchanged from v1 §19.2).
6. **Naming:** "Registry Aura" survives this audit as product name, but "Aura" carries new-age valence that the fact-forward v2 chrome now has to carry alone; if the owner ever renames, "Registry Reading" is the fact-register candidate. Not blocking.
7. **Unvalidated assumption to test in implementation:** the seat frame reads as "object/case" rather than "selection state" (frames can read as checkbox-selected). The five-second test (§12) covers it; fallback chrome is a plinth tick-pair beneath the disc instead of a full frame.

---

## Verification (for the implementation that follows this revision)

Unchanged from v1's validated command sequence (flag-off build parity, `npm test`, `check-dist`, `report-bundles --fail`, `schema:check`, both CI greps, legacy-drift parity), plus the v2-specific assertions in §13 — most of which are unit/DOM tests that run inside `npm test`. The §12 five-second protocol is a manual gate before flag-on in production; the 250px/33% card exports are automated in the card test suite.

**The smallest coherent v2 MVP** is v1's MVP with: the §5 mark system replacing the §7/§8 ring spec, the §6 screen order, the §8 card, the §11 copy rules and lints, the return band pulled, the forget-address control added, and the §13 criteria as the acceptance bar. Nothing else in v1's architecture moves.
