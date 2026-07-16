# Registry Aura V3 — Fable adversarial audit of the local implementation

**Author:** Fable (product strategy, experience architecture, creative direction, critical review)
**Audited:** the local working tree on `codex/registry-aura-v1` (uncommitted V1+V2 implementation), 2026-07-16
**Evidence:** full source read (`src/pages/registry/aura/`, `src/islands/RegistryAura.tsx`, `src/islands/aura/`, `src/lib/aura/`, `src/lib/aura-share*.ts`, `src/lib/wallet/`, `api/aura-holdings.ts`, `tests/aura-drive.mjs`), all six production-rendered proofs in `docs/acceptance/registry-aura/`, the Registry landing (hydrated + no-JS), the calculator bridge, Privacy/Terms/Disclosure copy, and a live dev-server walkthrough at 375 px with the flag on.
**Relationship to the normative plan:** `docs/REGISTRY-AURA-PLAN.md` remains the V2 reconciliation. This document proposes V3 changes on top of it; where the two disagree, this document says so explicitly and Sol Ultra should treat the disagreement as a decision to reconcile, not silently pick one.
**Visual proofs for this audit:** `docs/acceptance/registry-aura-v3/` (static design proofs, not production code).

> **Implementation status (2026-07-16):** the beta-gate list (§16 items 1–8)
> plus items 9 (evidence-variant readings) and 12 (relative date word) are
> implemented in this tree by Fable — see the reconciled
> `docs/REGISTRY-AURA-PLAN.md`, the updated unit/drive suites (all green), and
> the regenerated production proofs in `docs/acceptance/registry-aura/`. Where
> implemented details refined this document (dated-neutral reflection tails,
> exact card geometry, the named focal caption), the sections below carry the
> as-built values.

---

## 1. Blunt verdict

**The machinery is launch-grade. The experience is not.** Registry Aura today is trustworthy plumbing wearing an unreadable interface: the endpoint, connectors, persistence, share pipeline, determinism, and legal posture are among the most disciplined I have reviewed, and almost none of that discipline is legible — or attractive — to the person the product exists for.

Classification: **structurally sound, presentationally failing.** Not "ready," not "replace everything." The four-source architecture (Chart / Record / Sky / Reading), the composition order (evidence before interpretation), the safety layer, and the data contracts should survive untouched. Three surfaces need replacement, not iteration:

1. **The first screen** — it opens with the one word the trust rules forbid implying ("Identity context in the Registry"), and the words *birth chart* and *wallet* never appear above the fold. The hero describes the product in riddles ("What the chart contains. What one public address carries…") instead of one plain sentence, and shows nothing of the product itself.
2. **The Carry Ring** — a compliance artifact, not a diagram. It satisfies every individual constraint (no glow, no connectors, held-only outer marks, twelve inner coordinates) and still fails its only job: at 375 px nobody can see that three separate sources are being read side by side. The story is carried entirely by the text around it.
3. **The social card** — a disclaimer with a glyph. Thirteen text elements; at 250 px feed width only the sign name is legible, and the reflection — the emotional payoff — renders at roughly 9 px equivalent. It also paints astrological nonsense ("STATION IN CANCER" — planets station; signs don't) because a natal-privacy redaction was applied to public ephemeris facts.

**On renaming (asked directly):** keep **Registry Aura** as the feature name — it is short, ownable, already woven through legal copy, analytics, and routes, and renaming it buys less than it costs. Everything *around* it should stop sounding like the repo:

| Current term (user-facing) | Problem | V3 term |
|---|---|---|
| "Identity context in the Registry" (hero kicker) | Implies identity; corporate-vague | "A reading from the Registry" |
| "Compose the Aura" / "Compose from three records" | Process verb, musical metaphor, counts records users can't see | "Read them side by side" (button), "Three records, one reading" (composer heading) |
| "digital talisman" | Corny-adjacent; "digital" adds NFT-flavor without meaning | "a talisman for this visit" (still explicitly qualified) |
| "Evidence plates" | Laboratory register | "The evidence, sign by sign" |
| "…from the committed Moon-ingress table" | Repo jargon leaked into consumer UI | "from the Registry's published sky calendar" |
| "…inside the committed event window" | Same leak | "within the published calendar's range" |
| "Aura reads this copy locally" | "This copy" is insider shorthand | "Read on this device; never sent" |
| "first among equally quiet record signs in zodiac order" | Poetic-opaque | "No dated sky or chart signal favors any held sign, so zodiac order chooses" |
| "Forget address / Clear Aura data" (button) | Slash-label | "Clear this reading" + sub-line "Forgets the address and result on this device" |
| "Carry Ring" | Never rendered as text today; keep internal-only. The V3 artifact needs no user-facing proper noun | — |

"Aura" as a countable noun ("an Aura," "compose an Aura," "your Aura") should disappear from body copy; the visitor gets **a reading**. "Registry Aura" survives as the name of the place, not the name of the object.

---

## 2. Five-second diagnosis

**What an ordinary visitor currently thinks (observed against the live first screen at 375 px):**

> "Registry Aura… identity context… something about a chart, an address, and the sky, joined without blending. Some kind of crypto-astrology thing? It's pretty. I don't know what it does or what I'd get."

The failure is specific and fixable:

- The kicker leads with **"Identity"** — the exact implication the hard boundaries forbid.
- Above the fold, the copy says "chart" (not *birth chart*) and "public address" (not *wallet*). The two nouns an ordinary person would anchor on are missing; the two internal nouns ("Registry," "Aura") lead.
- "The reading joins those records without blending their evidence" is the designer's pride, not the visitor's need. It answers an objection nobody has formed yet.
- Four proprietary register names (CHART / RECORD / SKY / READING) must be learned before anything happens.
- Nothing on the first screen *shows* the product. The pastel Zodiac artwork — the single most communicative asset the site owns — is absent.

**What they should think (the target, verbatim from the brief):**

> "This compares a private birth chart, a public wallet address, and today's dated sky, then gives a symbolic reading."

**How V3 gets there:** one plain subtitle sentence containing the words *birth chart*, *wallet address*, and *today's sky*; and an **inline, server-rendered example reading** on the first screen — the product demonstrating itself before any explanation. Show, then tell, then ask.

---

## 3. Audience objection matrix

Verdicts: **CONFIRMED** (evidence found; must change), **PLAUSIBLE** (real risk; mitigate or monitor), **REJECTED** (the implementation already answers it; keep the answer).

| # | Lens | Strongest objection | Verdict | Disposition |
|---|---|---|---|---|
| 1 | Ordinary consumer | "I don't know what a Registry, an Aura, or a Record is, and nothing shows me. I'd need to read ~4,500 px of prose before the form." | **CONFIRMED** | New hero sentence + inline example (§6–7); legal prose compressed to progressive disclosure (§12). |
| 2 | Ordinary consumer | "Even after composing, the page tells me the same fact four times in four dialects (docket, sentence, 'why this sign', plates)." | **CONFIRMED** | One fact, one home: docket states sources, grid shows overlap, reading interprets, plates hold receipts. Duplicated prose deleted (§7). |
| 3 | Skeptic | "The 'reading' is a fortune-cookie line keyed to one sign. The birth chart barely influences the words — the three-source framing oversells what the chart does." | **CONFIRMED** | True today: `readings.ts` is 12 static aphorisms; natal evidence affects only selection/tiebreak and chips. V3: 4 deterministic evidence-variants per sign (record-only / +chart / +sky / +both = 48 lines), and the "Why this sign" line stays fact-only (§11). |
| 4 | Skeptic | "Wallet astrology is arbitrary; you invented a doctrine." | **REJECTED** (as a blocker) | The product never claims doctrine: method note calls it "a symbolic Zodiacs.org display convention, not a traditional astrological technique." V3 keeps that sentence verbatim and surfaces it earlier. A skeptic can reject the premise while agreeing the method is described honestly — the stated bar. |
| 5 | Crypto-native | "Show me it never signs. Wallet-connect UIs are phishing surfaces." | **REJECTED** | Verified in source: connectors call only `standard:connect`/`eth_requestAccounts`; no signing/approval/tx/chain-switch imports anywhere; drive test asserts bundle purity; endpoint receives only the address, echoes nothing. The never-collapsed secret-phrase warning is exemplary. Keep all of it. |
| 6 | Crypto-native | "Pasting someone else's address produces a 'reading' about them." | **PLAUSIBLE** (inherent) | Already mitigated: "this address carries" neutral language, no identity claims, no balances. V3 keeps the address-neutral register and adds nothing person-shaped. Residual risk accepted and documented. |
| 7 | Astrology-literate | "'Station in Cancer' (card) is astrological nonsense — planets station, signs don't. And 'Ingress into Leo' without a body is almost as bad." | **CONFIRMED** | Over-redaction bug: natal-privacy exclusion of "bodies" was applied to *public ephemeris* facts. Card gains allowlisted catalog event labels incl. body ("Mercury stations direct · Jul 23"). Plan §Sharing needs a one-word amendment: exclude *natal* bodies (§14). |
| 8 | Astrology-literate | "Will it fake houses/aspects from a summary that lacks them?" | **REJECTED** | Verified: no houses/cusps/aspects anywhere in Aura; unknown time excludes Moon/ASC/MC and seats bodies at sign midpoints so the wheel can't imply degrees; visible noon-estimate notes. This discipline is a selling point — keep. |
| 9 | Privacy advocate | "You're building the chart-to-address correlation tool yourself." | **REJECTED** (with two retained cautions) | Composition is on-device; the lookup carries only the address; the default card's painted strings are natal-independent (typed, allowlisted); chart-fact is session-only, off by default, can't change the sign, and warns about cumulative disclosure. Cautions kept: (a) cumulative chart-fact warning stays; (b) storage TTL disclosure stays. |
| 10 | Privacy advocate | "The example claims a local chart exists when none does." | **CONFIRMED** (honesty, found live) | In example mode the record plate adapts but the chart plate still reads "LOCAL / SELECTED BIRTH CHART / Recorded birth time," and the fact sentence says "the selected birth chart." All false for the built-in example. V3: example chart plate reads "ILLUSTRATIVE / EXAMPLE CHART / Built into this page / No chart was read from this browser," and the sentence says "the example chart" (§11, §13). |
| 11 | Information-design critic | "The ring doesn't diagram anything: two glyph renderings per sign, three layers within ~40 px of radius, marks float ambiguously, and the 12-held case is noise. The text does all the explaining." | **CONFIRMED** | Replace the ring with the Alignment table (§5–6). The natal Wheel survives as an optional "full wheel" disclosure. |
| 12 | High-end product designer | "Typographic elegance without a designed object. The result is ten stacked text sections; the card is a disclaimer. Where's the moment?" | **CONFIRMED** | V3 concentrates beauty in two places: the reading block (large pastel disc + serif reflection) and the rebuilt card. Evidence stays deliberately calm (§9). |
| 13 | Screen-reader / keyboard | "An SVG figure with a paragraph-long aria-label is a wall; four invented nouns are cognitive load; 9,300 px of page is a hike." | **CONFIRMED** (improvement path) | The Alignment renders as a real `<table>` (rows = sources, columns = signs): 'Birth chart — Cancer: Sun, Venus' for free. Focus management, live regions, 44 px targets already good — keep (§17). |
| 14 | Reduced-motion / low-vision | "Will I get a lesser experience?" | **REJECTED** | One finished-state fade with a reduced-motion single fade; forced-colors rules exist; `scroll-behavior: smooth` is guarded in `base.css`. V3 choreography specifies an equivalent-content reduced path (§10). |
| 15 | Mobile visitor from a social post | "The card that brought me was unreadable, and when I arrive I'm five screens from doing anything." | **CONFIRMED** | Card rebuilt (§14); hero example is the first screen (§7); guide compresses (§12). |
| 16 | Zero-result visitor | "It found nothing — did I do it wrong? Do I have to buy one?" | **REJECTED** (copy) / **CONFIRMED** (one gap) | The empty-state copy is excellent ("does not mean the address is empty… You do not need to buy one," "no absence is assigned meaning") — keep verbatim. Gap: after a **provider error**, the example escape hatch is invisible (the example button requires `!result && !address`), so a failed lookup strands the visitor with only an error line. V3 adds "See the example instead" beside every error status (§7, §11). |
| 17 | Any visitor | "Why does the wallet record say July 15 but the sky says July 16?" | **PLAUSIBLE** | Deliberate honesty (separate dates for separate facts) that reads as a glitch. V3 adds one relative word: "checked Jul 15 · yesterday · Refresh to re-check" (§11). |
| 18 | Site owner / IA | "Three wallet surfaces (landing Shelf, Aura, Wallet natal chart) with three flags and overlapping mental models fragment the Registry story." | **PLAUSIBLE** | Out of Aura's launch scope, but real: the landing's 'Identity Context' section naming is what leaked into Aura's hero. Recommendation recorded in §16 (later): rename that landing section "Readings from the record," make the Shelf's deep-link into Aura explicit, keep WalletChart clearly framed as "the wallet's own chart." |

---

## 4. Retain / redesign / replace / delete

| Component / interaction (current) | Decision | Why / what changes |
|---|---|---|
| `api/aura-holdings.ts` endpoint (mints-only, no echo, 503 honesty, rate limit) | **RETAIN** | Exemplary. No changes. |
| `src/lib/wallet/aura-connectors.ts` (passive discovery, connect-on-click, account-change invalidation) | **RETAIN** | Exemplary. No changes. |
| `src/lib/aura/compose.ts` (determinism, evidence, uncertainties, focal precedence) | **RETAIN** (minor) | Keep engine. Delete the UI's duplicate `factualAuraSentence` in `AuraResult.tsx` *or* the engine's unused `auraSentence` — one sentence generator only. V3 keeps the engine's, extended for example mode. |
| `src/lib/aura/events.ts` (committed catalogs, 400-day fail-closed freshness) | **RETAIN** | No changes. |
| `src/lib/aura/persistence.ts` (8 h session / 24 h opt-in, delete-on-read) | **RETAIN** | No changes. |
| `src/lib/aura-share.ts` (public-only focal selector, branded type) | **RETAIN** | No changes. |
| Share flow mechanics (preview-first, exact blob, URL revocation, Web Share + download) | **RETAIN** | No changes. |
| Chart-fact checkbox (session-only, off-default, cumulative warning, never changes sign) | **RETAIN** | Copy polish only. |
| Analytics events + `0/1/2-5/6-12` buckets | **RETAIN** | No changes. |
| Wallet guide content (5 steps, never-collapsed secret warning, allowlisted links) | **RETAIN** (content) / **REDESIGN** (frame) | Same words; tighter visual module; stays before the composer (a drive-test invariant). |
| Empty-state copy ("no absence is assigned meaning") | **RETAIN** | Verbatim. Add the empty record row in the grid as its visual twin. |
| Example composition (`example.ts`, no-network compose) | **RETAIN** (data) / **REDESIGN** (presentation) | Example becomes the hero's inline, server-rendered centerpiece; example-mode docket honesty fixed. |
| Focus management, `#aura-status` live region, error dictionary | **RETAIN** | Error dictionary gains an example CTA beside failures. |
| Feature flag + entry module (`registry-aura-entry.mjs`) | **RETAIN** | Entry card copy changes only. |
| Hero (kicker, riddle copy, laws list) | **REPLACE** | New kicker, one plain sentence, inline example grid; laws list becomes the grid's own row labels (§7, §11). |
| "Before you compose" boundary aside (4 paragraphs) | **REDESIGN** | Three load-bearing lines stay visible; full sentences move into one disclosure ("The fine print, in full") directly beneath (§12). Legal substance preserved before composition. |
| Storage note paragraph | **REDESIGN** | One-line label + "How this is stored" disclosure with the current full text (§12). |
| Two-step form (Saved chart / Wallet record) | **REDESIGN** | Same fields; steps renamed "Your chart" / "The address"; sky gets a passive third stamp "The sky — already here; computed for the moment you read" so "three records" finally counts to three (§7). |
| Source docket (3 plates + join sentence) | **REDESIGN** | Keep; compress to stamp-rows on mobile; fix example-mode chart plate; add relative-date word when wallet/sky dates diverge. Join sentence kept verbatim. |
| **Carry Ring** (wheel + overlay discs/frames/chips/arcs) | **REPLACE** | Replaced by the Alignment table (§6). `Wheel` survives inside an optional "Open the full natal wheel" disclosure (sunk work retained where it's actually good). `CarryRing.tsx` overlay geometry is deleted. |
| Ring legend (3 keys) | **REDESIGN** | Becomes the table's row labels — the legend *is* the structure instead of a footnote. |
| "What the sources say together" section | **REDESIGN** | Retitled "Where they meet"; one sentence from the engine; talisman line reworded (§11). |
| Symbolic reading section | **REDESIGN** (amplify) | The typographic peak: large pastel disc, sign name, reflection at display size, evidence-variant text (48 deterministic lines), fact-only "Why this sign," renamed calendar line (§11). |
| "Next in the sky across all held signs" | **REDESIGN** | "Next on the calendar" with plain copy; jargon strings deleted (§11). |
| Evidence plates (`<details>` per sign) | **RETAIN** (mechanics) / **REDESIGN** (label) | Renamed "The evidence, sign by sign"; same registers (Record/Chart/Sky/Reading/Limits); same Registry record links. |
| Share section | **REDESIGN** | Kicker "Chart fact off by default" deleted; section leads with the card preview promise; copy per §11. |
| Social card renderer (`drawAuraShareCard`) | **REPLACE** (layout) / RETAIN (input type, snapshot validation, a11y description pattern) | New hierarchy per §14; input type extended by one allowlisted field (catalog event label id). |
| Refresh / Clear buttons | **REDESIGN** | "Refresh record" → "Re-check the address"; "Forget address / Clear Aura data" → "Clear this reading" + explanatory sub-line. Mechanics unchanged. |
| Method aside ("How to read Registry Aura") | **RETAIN** | Move one screen earlier (directly after the reading); sentence kept verbatim. |
| Meaningful / Not yet response | **RETAIN** | Copy unchanged; stays after evidence. |
| Landing + calculator entry copy ("Compose your Registry Aura →") | **REDESIGN** | "Read your chart beside a public address →" (calculator); landing card copy per §11. |
| Mono-caps section eyebrows throughout result | **REPLACE** | Serif-italic sentence-case kickers (site's own `.kicker` rule); mono reserved for data stamps (dates, counts, addresses-class facts) (§9). |
| `tests/aura-drive.mjs` ring-geometry assertions | **REPLACE** | Equivalent table-structure assertions (§15, §17). |
| 375 px proofs (one/four/twelve) | **REPLACE** | Regenerate for the Alignment result; same privacy assertions. |

Nothing else is deleted outright; the deletions above are: hero riddle copy, "Identity context" kicker, "committed …" strings, "Evidence plates" label, "Chart fact off by default" kicker, the overlay half of `CarryRing.tsx`, one duplicate sentence generator, and the card's current layout code.

---

## 5. Creative directions considered

### A. "Refined Ring" (conservative)
Keep the Carry Ring; enlarge to full-bleed, separate the three radii clearly, delete the duplicate band glyphs, label the layers directly on the figure, compress the copy around it.
- **For:** least work; preserves V2's proof suite and geometry tests.
- **Against:** the ring's failure is intrinsic, not cosmetic. Three concentric information layers inside ~170 px of radius cannot be made separable at 375 px while honoring "no connectors, no glow, no empty mounts." The natal wheel's real positions (correct!) put planets at arbitrary angles that visually collide with the held-disc layer. It stays a diagram only its authors can read, and its aria story stays a paragraph dump.

### B. "The Alignment" — a ledger read side by side (chosen)
Make the product's own sentence literal. Three labeled **rows** — *Birth chart (private)*, *At this address (public)*, *Sky (dated)* — against twelve sign **columns**. Marks never leave their row; where a column collects marks from more than one row, the eye sees the overlap instantly; the focal column carries a hairline highlight. The reading below becomes the typographic peak (large pastel disc + serif reflection). The natal wheel demotes to an optional disclosure for the astrology-literate.
- **For:** column-intersection is a pre-attentive pattern (any human reads it in under a second); "rows never merge" *is* the trust rule "wallet never modifies chart," drawn; renders as a real `<table>` (screen-reader gold); scales 0→12 held signs with identical treatment; the ledger register is native to the Registry's museum voice; the same three-row motif shrinks onto the social card as a product fingerprint.
- **Against:** a table is less romantic than a wheel (answered by concentrating warmth in the reading block); new component + test work (bounded, ~2–3 days of the delta in §15).

### C. "Talisman Cinema" (radical)
Full-screen focal pastel disc first — a cinematic object entrance — with evidence behind a flip/scroll; the reading as an overlay caption.
- **For:** maximal emotional payoff; unmistakable in social screenshots.
- **Against:** inverts the plan's evidence-before-interpretation order; spectacle-first framing courts exactly the value/status aura the boundaries forbid; the reduced-motion version becomes a genuinely lesser product (a static poster minus its one trick); buries the skeptic's method story. Rejected on trust grounds, not taste.

**Decision: B.** It is the only direction where comprehension, honesty, accessibility, and beauty pull the same way instead of trading against each other.

---

## 6. Selected V3 concept — "The Alignment"

**Thesis:** *The grid is the argument.* Registry Aura's entire claim — three separate records, read side by side, never blended — becomes the picture itself. If the visitor understands the picture, they understand the product; no vocabulary lesson required.

**Metaphor:** a **ledger of three records** in the Registry's museum register. Chart, address, and sky each keep their own row the way archival sources keep their own shelf. A reading happens where columns align — like three library cards agreeing about the same subject.

**Emotional tone:** museum-calm evidence, warm serif meaning. The ledger is dry on purpose; the payoff (pastel disc + reflection) is where the product is allowed to be beautiful. Evidence whispers; the reading speaks.

**Why it serves the purpose:** it bridges the astrology site and the Registry in both registers at once — the grid speaks the wing's catalogue language while the reading speaks the consumer site's warm plain voice; it makes held pastel Zodiacs *the only color in the evidence*, which makes "found at this address" visually self-evident; and it gives the five-second test a picture instead of a paragraph.

### The Alignment, precisely

- **Structure:** a real `<table>`. Column heads: the twelve sign glyphs in zodiac order. Three body rows, labeled left: **"Birth chart · private, read on this device"**, **"At this address · public record · checked {date}"**, **"Sky · {date}"**.
- **Chart row marks:** one neutral chip per sign that holds saved placements — a numeral when >1 ("2"), a dot when 1. Neutral ink, mono numerals. Never pastel (chart evidence stays visually distinct from wallet evidence).
- **Record row marks:** the pastel Zodiac disc (existing artwork) in each held column. **The only chromatic marks in the grid.** No frames, no denominators, no fill states for unheld columns — an unheld cell is void (plan-compliant: nothing drawn for absence).
- **Sky row marks:** line-weight glyphs — ☉ in the Sun-season column, ☾ in the Moon column, ✳ in any column with an event inside its ±24 h window. White ink.
- **Focal column:** hairline rectangle spanning the header and three rows, plus a named caption beneath the table — "This visit's focus: {Sign} — the framed column" (naming the sign keeps the caption meaningful in both responsive layouts and for screen readers). Presentation-only, no fill, no glow.
- **Empty record:** the row renders with the inline note "No Registry-listed Zodiac at this address · nothing is drawn." The reading block switches to "The chart stands on its own."
- **Unknown birth time:** chart row marks only Sun/Mercury/Venus/Mars; the row label gains "· noon estimate."
- **Twelve held:** twelve discs, identical treatment, no completion language anywhere (count appears only in the docket, as today).
- **The wheel:** beneath the grid, a plain disclosure — "Open the full natal wheel" — containing the existing `Wheel` render of the saved chart (no overlay). Astrology-literate depth without taxing everyone else.

---

## 7. Complete experience architecture

**Entry paths (unchanged wiring, new words):** Registry landing card, birth-chart-result contextual link (`?return=registry-aura` round trip), direct URL, social-card curiosity. Flag-off keeps all entries dark (existing behavior; retained).

1. **First screen (375 px):** kicker "A reading from the Registry" → H1 "Registry Aura" → the sentence: *"Your saved birth chart, the official Zodiacs at one public wallet address, and today's sky — read side by side, never blended."* → **inline example Alignment** (server-rendered, real markup, labeled "An example reading — illustrative; no public address was checked") with its focal column highlighted and a two-line example reading beneath → buttons: **[Open the full example]** **[Start with your chart]**. The four "laws" are now the grid's own row labels plus the reading caption; the list is deleted.
2. **"What is this?" → composition:** [Start with your chart] scrolls to the composer. En route (in DOM order): the compressed **"New to wallets?"** module (safety aside always visible; five steps collapsed; unchanged content) and the **boundary lines** (three visible one-liners + "the fine print, in full" disclosure).
3. **Composer:** heading "Three records, one reading." Step 1 **Your chart** (select; or "No saved chart on this device" + [Calculate and save a chart] — the return trip already works). Step 2 **The address** (Connect Solana / Connect Base / paste; one-network note; remember checkbox + storage disclosure). Passive stamp 3: **The sky — already here.** "Computed on this device for the moment you read." Submit: **[Read them side by side]**, disabled until chart + parseable address.
4. **Lookup:** status line narrates honestly ("Reading the public record…"), same aria-live channel. Failure: honest error + **[See the example instead]** (new; closes the stranding gap) + retry preserved.
5. **Result (one screen-flow, in order):** compressed docket (three stamp-rows + the verbatim join sentence) → **the Alignment** → "Where they meet" (one engine sentence + qualified talisman line) → **the reading** (typographic peak: disc, name, reflection variant, "Why this sign," "Next on the calendar") → "The evidence, sign by sign" (collapsed plates, unchanged registers) → share module → actions ("Re-check the address" / "Clear this reading") → limits aside → method aside → Meaningful / Not yet.
6. **Sharing:** unchanged mechanics (create preview → inspect exact PNG → share/download; chart-fact opt-in). New card design (§14).
7. **Refresh:** "Re-check the address" re-runs the lookup; the sky recomputes each visit by design; divergent dates get the relative-word treatment.
8. **Clearing:** "Clear this reading" wipes session+local per current mechanics; the existing post-clear statuses stay.
9. **Return visit (≤8 h / remembered ≤24 h):** current restore behavior, restored stamp reads "restored from this device · Re-check to read the record again." (**Later**, §16: a "since your last reading" line — e.g., "the Moon has moved into Virgo" — computed locally from cached vs. fresh sky; return-worthiness without gamification.)

**No-JS:** hero, example Alignment (now server-rendered!), wallet guide, and boundary lines all render; the composer shows the existing noscript line. This is a material upgrade — today the example requires JS.

---

## 8. Annotated wireframes / visual proofs

All in `docs/acceptance/registry-aura-v3/` — static, self-contained design proofs (real markup and CSS, site tokens inlined, CSS-disc stand-ins for the webp artwork; annotation rails beside each frame). They are the design contract for Sol Ultra; production rendering will differ only in font files and disc assets.

| Proof | File |
|---|---|
| 375 px first screen (hero + inline example) | `first-screen-375.html` |
| 375 px beginner path (guide → composer, compressed disclosures) | `beginner-path-375.html` |
| 375 px composed result, four held signs (full flow) | `result-375.html` |
| Desktop result (≥1120 px, two-register layout) | `result-desktop.html` |
| One held sign | `held-one-375.html` |
| Four held signs | `held-four-375.html` |
| Twelve held signs | `held-twelve-375.html` |
| No saved chart | `no-chart-375.html` |
| Zero-result (empty record row) | `zero-result-375.html` |
| Provider unavailable (with example escape) | `provider-error-375.html` |
| Share preview step | `social-card-preview-375.html` |
| Final 4:5 card, 1080×1350 + 250 px feed test + crop zones | `social-card-4x5.html` |

Each file carries numbered annotations tying regions to sections of this document.

---

## 9. Visual-system specification

**Palette:** unchanged Cosmic Void tokens. Surfaces `--void-0/1/2` only; hairlines `--hair-1/2/3`; ink `--text/--text-2/--muted`. **The twelve pastel hues appear only as: held-record discs, the focal reading disc, the card disc, and the card's single accent line.** No pastel on chrome, buttons, or labels — chroma *means* "a held Zodiac object is present."

**Typography (three registers, strictly cast):**
- **EB Garamond (serif):** meaning — H1, reading reflection (`--text-xl` at 375, `--text-2xl` desktop), sign names, section kickers (italic, sentence case).
- **Instrument Sans:** explanation — body, labels, buttons, notes.
- **JetBrains Mono:** *data stamps only* — dates, counts, network names, table numerals. **Mono-caps section eyebrows are retired** (they read as terminal chrome and violate the site's own kicker rule); kickers become serif-italic sentence case per `.kicker`.

**Spacing & structure:** page column `min(100% − 32px, 1120px)`. Result sections separated by `--hair-2` rules at `clamp(40px, 6vw, 72px)` rhythm — fewer, heavier separations instead of ten equal cards. The Alignment table: row height 42 px (375) / 56 px (desktop); column width = content/12, min 26 px; discs ~25 px (375) / 34 px (desktop). Below ~760 px, row labels render as full-width band headers *above* their row (all twelve columns fit a 343 px content column with no horizontal scroll — see the 375 proofs); at desktop widths the labels collapse back into a classic sticky first table column (see `result-desktop.html`). The table never reflows into a different shape — only the label position moves. At 320 px / 400 % zoom, if the twelve columns ever exceed the content width, the wrapper scrolls horizontally rather than reshaping.

**Artwork treatment:** pastel discs always on void, never on lifted surfaces; never scaled below 20 px; the focal reading disc 96 px (375) / 128 px (desktop) with a 1 px `--hair-3` orbit ring at 8 px offset — a frame, not a glow.

**Source marks (the visual grammar, forced-colors safe by shape + row position):**
- Chart: neutral dot / mono numeral chip, 1 px hairline border.
- Record: pastel disc (the artwork).
- Sky: ☉ ☾ line glyphs and ✳ event mark, white ink.
- Focal: hairline rectangle + caret + caption.

**Hierarchy:** exactly one display moment per screen: hero sentence → (result) the reflection. Everything else steps down two sizes. Evidence never exceeds `--text-base`.

**Contrast:** all text ≥4.5:1 on `--void-0/1/2` (existing ink tokens pass); mark shapes remain distinguishable in `forced-colors: active` via `CanvasText` borders (existing rule extends to table marks); focal rectangle uses border, not background, so Windows High Contrast preserves it.

**Responsive:** 320 px = table scrolls horizontally inside its wrapper (row labels sticky), reading stacks; 375 px = canonical proofs; ≥760 px = docket 3-up (existing); ≥1120 px = result splits into two registers — evidence column (docket, Alignment, plates) left, reading column (sticky) right; card preview centers at true aspect.

---

## 10. Motion storyboard

Principle: **one piece of choreography that teaches the model, once.** No loops, no idle motion, transform/opacity only, everything compositor-friendly.

**Beat 0 — pre-result (composer):** none. Buttons keep the site's existing hover/active transitions.

**Beat 1 — "three sources arrive" (on result mount, once per composition):**
- Chart stamp-row fades/rises in (0 ms delay, 180 ms, `--ease-soft`, translateY 8px→0).
- Record stamp-row (120 ms delay, 180 ms). Sky stamp-row (240 ms delay, 180 ms).
- As each stamp lands, its Alignment **row's marks** fade/scale in (0.92→1, 160 ms) — the row is born from its source. *Teaches: three independent sources, arriving separately, each into its own row — the wallet layer visibly never touches the chart row.*

**Beat 2 — "the alignment" (begins 520 ms):** the focal column's hairline rectangle draws bottom-to-top (240 ms, scaleY via transform-origin bottom), then the caret + caption fade in (120 ms). *Teaches: the reading points at a column where rows agree; nothing merges, nothing moves between rows.*

**Beat 3 — "the reading" (begins 880 ms):** the reading block (disc + name + reflection) fades/rises (240 ms). Total sequence ≈ 1.1 s, runs exactly once per composition (keyed by `checkedAt:chartId`, as the result already is).

**Interaction (repeatable):** hovering or focusing a row label dims the other two rows to 40 % (120 ms) — "read one source at a time." Touch: tapping a row label toggles the same dim. Evidence plates keep native `<details>` (no animation). Share preview: 160 ms fade-in; no motion on the card itself.

**Mobile:** identical timings; beat 1 distances reduced to 6 px.

**Reduced motion:** the entire result (all three beats' content) appears in **one 180 ms opacity fade** — same content, same order, same focal highlight, zero translation/scale. Row-dim interaction becomes an instant state change. *Nothing is exclusive to the animated path; the animation only sequences what the static page already shows.*

**Performance:** ≤16 animated elements (3 stamps, 3 row-groups, 1 rectangle, caret, reading block); no layout properties animated; no JS animation loop — CSS delays on a single `.is-settling` class; `will-change` avoided (elements are few and small). Static fallback = the Beat-3 end state, which is also the no-JS render of the example.

---

## 11. Exact-copy deck

Voice: plain, warm, specific; computed facts with dates; no smug tells; mono only for stamps. Strings marked **(kept)** are today's copy retained verbatim.

**Hero**
- Kicker: `A reading from the Registry`
- H1: `Registry Aura`
- Sentence: `Your saved birth chart, the official Zodiacs at one public wallet address, and today's sky — read side by side, never blended.`
- Example caption: `An example reading. Illustrative — no public address was checked, and no chart was read from this browser.`
- Buttons: `Open the full example` / `Start with your chart`

**Composer**
- Heading: `Three records, one reading`
- Sub: `The chart is read on this device and never leaves it. The lookup sends one public address, nothing else.`
- Step 1: `Your chart` · select label `Choose a saved chart` · note (kept) `Only the saved summary is read. Birth fields never enter the address request.`
- No-chart: `No saved chart is available on this device.` + `Calculate and save a chart`
- Step 2: `The address` · note: `Connect an installed wallet or paste a public address — both are the same read-only lookup. Solana and Base are separate networks; use the address on the network where the Zodiac appears.` + link `New to wallets? Read the two-minute guide.`
- Sky stamp: `The sky — already here. Computed on this device for the moment you read.`
- Remember (kept): `Remember this address on this device (off by default; eligible for restoration for 24 hours)` · storage disclosure summary: `How this is stored` (full current paragraph inside, verbatim)
- Submit: `Read them side by side` · busy: `Reading…`

**Boundary lines (always visible, above the form)**
- `Read-only. Symbolic. Never an investment signal, and no purchase is required.`
- `A public address and its history are public, and may become linked to a person. Only the address is sent.`
- `“Official” means listed in this Registry — not approval, identity, safety, or value.`
- Disclosure summary: `The fine print, in full` (current four paragraphs inside, verbatim)

**Statuses**
- Lookup: `Reading the public record…` **(kept)** · compose: `Setting the chart and consulting the dated sky…` **(kept)**
- Success, n held: `Reading composed from {n} held {sign|signs}.`
- Success, none: `Lookup complete. No Registry-listed Zodiac was found; no purchase is required.` **(kept)**
- Errors: current dictionary **(kept)**, each followed by the new escape: `You can also see the example instead.` → button `See the example`
- Restored: `A recent reading was restored from this device. Re-check to read the public record again.`

**Docket**
- Title: `Three sources, read side by side` **(kept)**
- Chart plate: stamp `Local` · `Selected birth chart` · `Read on this device; never sent` · `Recorded birth time` / `Unknown time · sign-level estimates only` **(kept)**
- Chart plate (example mode): stamp `Illustrative` · `Example chart` · `Built into this page` · `No chart was read from this browser`
- Record plate: stamp `Checked {date}` (+ `· yesterday`-style relative word when it differs from the sky date, with `Re-check to update`) · `Public wallet address` · `{n} official {Zodiac|Zodiacs} found` · `{Solana|Base} public record` **(kept)**
- Sky plate: stamp `{date}` · `The sky` · `Sun in {sign} · Moon in {sign}` · `Computed for this visit` **(kept)**
- Join sentence **(kept verbatim)**: `These sources are read side by side. The wallet record never changes the birth chart; it only determines which held signs receive a reading.`

**Alignment**
- Row labels: `Birth chart · private, read on this device` / `At this address · public record` / `Sky · {date}`
- Focal caption: `this visit's focus`
- Empty record row: `No Registry-listed Zodiac at this address · nothing is drawn`
- Wheel disclosure: `Open the full natal wheel`

**Where they meet**
- Kicker: `Where they meet` · sentence: from the engine (e.g. `Cancer is found at this public wallet address. It is also in the selected birth chart and in the sky of July 16, 2026 UTC.`) — example mode substitutes `the example chart` / `the illustrative record`.
- Talisman line: `For this reading, that {Sign} becomes a talisman for this visit — a symbolic focus, not a score or an ownership claim.`

**The reading** — superseded by the braided-readings upgrade (implemented 2026-07-16, owner-approved, with a plain-language bar: everyday words for casual horoscope readers; pop terms like *retrograde*, *full Moon*, *rising sign* allowed; *ingress*/*lunation*-style jargon banned by test). Structure: a **lead** (the sign's rewritten plain base line — still the only text the card may paint) plus a **detail** of one or two strands, each traceable to a row of the Alignment:
- *Sky strand*, keyed to the actual driving fact (Moon presence, Sun season, both, station retrograde/direct with its body, new/full Moon, solar/lunar eclipse, a planet newly entering the sign).
- *Chart strand*, keyed to the strongest echoing point (Sun/Moon/Mercury/Venus/Mars/rising sign/Midheaven each get their own everyday clause, with "more of your chart lives in this sign" when several gather).
- *Absence is text, not silence*: "Your chart is quiet in this sign — this one comes from the sky, not from you." / "The sky is quiet in this sign, and your chart is too. Nothing here is urgent — and that's worth knowing."
- *Example mode never says "your"*: "The example chart has placements here too — with a real chart, this is where the reading gets personal."

Sample (Leo focal, Moon passing, natal Mars): `Do one honest thing out in the open, without keeping score of the reaction. The Moon is passing through this sign — a day or two of extra feeling here, then it moves on. Your Mars is here — when you push for something, this is the gear you use.`

The exact copy deck (12 base lines, 10 sky clauses, 7 chart clauses, quiet/example variants) lives in `src/lib/aura/readings.ts` with its full product-space language sweep in `readings.test.ts`. A restored session also names what changed: `Since your last reading (Jul 15), the Moon has moved from Leo into Virgo.` A client-side .ics export of the next sky event remains a deliberately deferred candidate.
- `Why this sign` **(kept)** + current fact-only reasons **(kept)**
- Calendar: heading `Next on the calendar` · event: `Across the held signs, {event label} comes next — exact {datetime}; its ±24-hour window opens {datetime}.` · moon: `Across the held signs, the Moon enters {Sign} next — exact {datetime}, from the Registry's published sky calendar.` · none: `No held-sign event falls within the published calendar's range.`

**Zero result** (all **kept**): heading `The lookup found no Registry-listed Zodiac`, body verbatim, reading `The chart stands on its own; no absence is assigned meaning.`, buttons `Try another address` / `See the example`

**Evidence**
- Kicker: `Chart · Record · Sky · Reading` **(kept)** · heading: `The evidence, sign by sign` · sub: `Each source keeps its own label. Open a sign when you want the receipts.`

**Sharing**
- Heading: `Make a social card` **(kept)** · `The card features {Sign}, chosen from the public record and dated sky — never from the chart.`
- Card contents line **(kept)**: `The card shows one held sign, dated public-record and sky facts, and a symbolic reflection. It never shows birth details or the address.`
- Warning **(kept verbatim)**: `Once shared, other people and apps may save or repost the image. Clearing Aura cannot remove those copies. If you add the optional chart fact below, that disclosure becomes public too.`
- Chart-fact label **(kept)** · preview heading **(kept)**: `Exactly what will be shared / Review your card`
- Buttons: `Create card preview` / `Share` / `Download PNG` / `Close preview` **(kept)**

**Actions:** `Re-check the address` · `Clear this reading` + sub-line `Forgets the address and result on this device`

**Method note (kept verbatim, moved up):** `The same selected chart, public wallet record, and dated sky produce the same words. This is a symbolic Zodiacs.org display convention — not a traditional astrological technique or proof that a person controls an address.`

**Entries:** calculator: `Read this chart beside a public address →` (return: `Return to Registry Aura →` **(kept)**) · landing card: title `Registry Aura` · body `Start with the example — no wallet needed. Then read one public address beside a saved birth chart and today's sky.` · link `Open Registry Aura →`

---

## 12. Complexity-abstraction strategy

**Immediate (no interaction):** the one-sentence definition; the inline example Alignment; the three boundary one-liners; the never-collapsed wallet-secrets warning; source stamps with dates; the reading; the method note.

**Progressive (one interaction away):** full example; the five wallet-guide steps; "The fine print, in full"; "How this is stored"; per-sign evidence plates; the full natal wheel; chart-fact opt-in and its cumulative-risk note; the exact-PNG preview.

**Removed from the main path (not from the product):** RPC/provider mechanics (Disclosure page, linked); token standards and chain trivia (guide step 2); the quantities/prices/history exclusion sentence (fine print); event-catalog provenance wording (plates' Limits register); "four registers" pedagogy (the labels now do it silently); the laws list (absorbed by row labels); duplicate restatements of the join sentence.

**The rule:** every safety-critical sentence keeps a visible summary line with the full text one disclosure deep — nothing safety-critical is *only* deep, and nothing explanatory is allowed to gate the first meaningful screen.

---

## 13. Honesty and privacy audit (sentence-level)

| # | Location (current) | Text / graphic | Problem | Corrected treatment |
|---|---|---|---|---|
| 1 | `index.astro:56` hero kicker | `Identity context in the Registry` | Implies identity in a product forbidden from implying identity | `A reading from the Registry` |
| 2 | `AuraResult.tsx:303-311` example mode | `LOCAL / Selected birth chart / Aura reads this copy locally / Recorded birth time` | All four lines false for the built-in example; asymmetric with the honest record plate | Example chart plate per §11 |
| 3 | `AuraResult.tsx` `factualAuraSentence` example mode | `…is also in the selected birth chart` | Same falsehood in prose | `…is also in the example chart` |
| 4 | `aura-share-card.ts:96-110` | `STATION IN CANCER`, `INGRESS INTO LEO`, `LUNATION IN…` (no body) | Over-redaction of public facts → astrological nonsense; damages credibility and implies sign-events that don't exist | Card paints the committed catalog's own event labels (allowlisted enum, incl. body): `MERCURY STATIONS DIRECT · JUL 23, 2026 UTC`; natal bodies remain excluded. Plan amendment: the §Sharing exclusion list means *natal* bodies. |
| 5 | `AuraResult.tsx:439-441` | `…from the committed Moon-ingress table` | Repo jargon as consumer copy | `…from the Registry's published sky calendar` |
| 6 | `AuraResult.tsx:444-448` | `No carried-sign event is available inside the committed event window.` | Same | `No held-sign event falls within the published calendar's range.` |
| 7 | Docket chart plate | `Aura reads this copy locally` | "This copy" is insider shorthand; unclear what "copy" means | `Read on this device; never sent` |
| 8 | `compose.ts:335`, `AuraResult.tsx:116` | `first among equally quiet record signs in zodiac order` | Opaque; sounds like doctrine | `No dated sky or chart signal favors any held sign, so zodiac order chooses.` |
| 9 | Reading section (structural) | Reflection text derives from the focal **sign only**, while the frame says three sources were read | Overclaims the chart's role in the *words*; the skeptic's strongest catch | Evidence-variant readings (§11) make the sentence honestly reflect which sources contributed; variants keyed to evidence pattern, still fully deterministic |
| 10 | `AuraResult.tsx:373` | `becomes the digital talisman` | "digital" imports NFT-value flavor; the qualifier sentence is good | `becomes a talisman for this visit — a symbolic focus, not a score or an ownership claim.` |
| 11 | Share section kicker | `Chart fact off by default` | A setting rendered as a section title; confuses more than it protects | Deleted; the checkbox label already carries it |
| 12 | Card (current layout) | Reflection at ~9 px feed-equivalent under three lines of 12 px mono caps | The *disclaimers* are legible and the *meaning* is not — an honesty hierarchy inverted into an anti-marketing artifact | §14 hierarchy: meaning legible, method line present and readable, disclaimers sized as footer, never invisible |
| 13 | Docket record plate after restore | `Checked July 15` beside sky `July 16` with no cue | Honest but reads as a bug; invites wrong conclusions about freshness | Relative word + `Re-check to update` (§11) |
| 14 | Landing "Identity Context" section (wing) | Section name; Aura entry sits between builder cards | The source of finding #1; frames readings as identity products | Out of Aura scope; recorded for the wing backlog (§16 later): rename section, reposition entry |
| 15 | `wallet-birth`/Shelf privacy paragraph | Privacy page interleaves Aura with "the illustrative Shelf" | Cross-feature entanglement makes the Aura story harder to verify | Keep content; give Aura its own subsection heading and the Shelf its own (copy-editing task, no policy change) |

**Verified clean (keep exactly as implemented):** no houses/aspects/cusps anywhere; unknown-time exclusions + noon-estimate notes; address-neutral "this address carries"; "official Zodiac" definition; no scores/rarity/denominators/completion states; example emits no share or meaningfulness affordances; default card's painted strings natal-independent (typed `AuraShareFocus`, allowlisted painter, no user-authored text); preview-first sharing with revocation; no address/chain/chart identifiers in analytics; holdings endpoint address-only with no echo.

---

## 14. Social-card specification (1080×1350, 4:5 — retained as the single MVP format)

**Hierarchy (top → bottom, as implemented):**
1. Header row: serif 34 px `REGISTRY AURA` left · mono 24 px `{sky date}` right.
2. **Pastel disc artwork, 400 px** with a hairline orbit ring, centered (the largest element; the product's fingerprint in the feed).
3. Sign name, serif 116 px.
4. **Reflection, serif italic 48 px, max 3 lines** — the sign's base line only; ≈11 px at 250 px feed width.
5. The mini-ledger — mono 22 px rows, left-aligned in a hairline-ruled block (the product's structure, miniaturized):
   `PRIVATE BIRTH CHART · READ ON A DEVICE, NEVER SHOWN`
   `{SIGN} FOUND AT A PUBLIC WALLET ADDRESS · CHECKED {date}` (sign-hue accent on this row only)
   `SKY · SUN IN {sign} · MOON IN {sign} · {date}`
   (+ the selecting event's dated label when the focus is an exact event; + `{SIGN} ALSO APPEARS IN THE SELECTED BIRTH CHART` when opted in)
6. Optional next-event line, mono 24 px: `NEXT · {catalog event label} · {date}` — e.g. `NEXT · MERCURY STATIONS DIRECT · JUL 23, 2026 UTC`.
7. Method line, serif italic 27 px centered: `A symbolic reading — not a wallet score or investment signal.`
8. Footer: mono 20 px `COMPOSED ON THIS DEVICE` left · mono 24 px `ZODIACS.ORG/REGISTRY/AURA` right.

**250 px feed test:** disc ≈93 px, name ≈27 px, reflection ≈11 px, ledger ≈5 px (reads as texture, legible on tap-to-zoom), method line on its own contrast-safe line. A viewer gets: *Registry Aura — a pastel Cancer — a line worth reading — found at a public address — symbolic, not a score.*

**Crop zones:** all meaning inside a 1080×1080 center-square (square-crop safe: disc, name, reflection, record row survive); header/footer are sacrificial; nothing within 66 px of any edge.

**Safe inputs (exhaustive):** validated `AuraShareFocus` (sign, reason, event kind/at), `checkedAt`, `skyAt`, current sky sun/moon signs, next-activation from the committed catalog (label from an **allowlisted enum id**, never free text), `includeChartFact` boolean. **Prohibited (unchanged + clarified):** address, chain beyond none, chart name, birth data, *natal* bodies/degrees/geometry/houses/aspects, held count or list, page focal sign, user-authored text, URLs with query strings. *Delta from V2:* the sky rows add current sun/moon signs — public, identical for every visitor at that instant, zero personal information; and catalog event labels regain their body word.

**Opt-in behavior (unchanged):** session-only checkbox, off by default, adds only row 4, never changes the sign, cumulative-risk warning kept verbatim.

**Preview interaction (unchanged):** create → inline exact-blob preview with accessible description → second explicit action to share/download → revocation on any input change. Status strings kept.

---

## 15. Implementation delta for Sol Ultra

**Untouched (verify by diff-absence):** `api/aura-holdings.ts`, `src/lib/wallet/*` (all), `src/lib/aura/{events,persistence,normalize,analytics,types}.ts`, `src/lib/aura-share.ts`, persistence flows and TTLs, analytics events, feature-flag wiring, `registry-aura-entry.mjs` mechanics (copy constants change), share flow state machine in `RegistryAura.tsx`.

**Changed:**
- `src/pages/registry/aura/index.astro` — new hero (kicker/sentence/buttons), inline **server-rendered example Alignment** (new Astro partial rendering `composeAura(AURA_EXAMPLE_*)` output statically at build; requires the example composition to be computable at build time — it is: `visitedAt` = build instant, catalog committed. Decide with owner: build-time sky vs. small client hydration for the example's dates; recommendation: build-time with the build date shown, honestly labeled), boundary-lines rework, guide framing class changes.
- `src/islands/aura/AuraResult.tsx` — section order kept; docket compression + example-mode plate/sentence fixes; kicker set replaced; reading amplification; calendar copy; error-state example CTA; delete local `factualAuraSentence` in favor of the engine sentence (extend `compose.ts` `auraSentence` for example mode).
- `src/lib/aura/readings.ts` — 12 → 48 lines (4 evidence-variants per sign); `buildAuraReading` selects variant from `natalEcho.length>0` × `activeNow.length>0`; pure and deterministic; unit-tested per cell.
- `src/lib/aura-share-card.ts` — new `drawAuraShareCard` layout per §14; `AuraShareCardInput` gains `currentSky: {sun, moon}`; `eventName` replaced by catalog-label enum lookup; accessible-description updated to match; snapshot validation pattern retained.
- `src/styles/registry-aura.css` — new Alignment styles, kicker restyle, motion beats (`.is-settling` + delays), reduced-motion block extended, forced-colors marks.
- Entry copy constants (`registry-aura-entry.mjs`, `ChartCalculator.tsx` copy map + ES/PT/FR/IT translations).

**New:**
- `src/islands/aura/AlignmentGrid.tsx` (client) + `src/components/AuraAlignmentStatic.astro` (server twin for the hero example) — a real `<table>`; props: `composition`, `chart`, `checkedAt`, `illustrative`, `focal`; renders row labels, 12 columns, marks, focal rectangle, empty-record note, wheel disclosure slot. Shared markup between twins (one TSX rendered both ways is acceptable since the island is Preact — prefer one component, `client:load` only in the result).

**Deleted:** `CarryRing.tsx` overlay geometry (`carryOverlay`, `openCornerFrame`, `chartChip`, legend) — the file shrinks to the wheel-in-disclosure wrapper or is removed with `Wheel` used directly; the card's current layout code; mono-caps eyebrow styles.

**Data-contract implications:** none server-side. Client: `AuraShareCardInput` +1 field (validated); `AuraReading` unchanged shape.

**Motion:** CSS-only; keyed off the existing result `key`; no new JS timers; reduced-motion overrides in the existing media block.

**Accessibility:** table semantics with `<th scope>` on rows/columns; caption = the join sentence; the long SVG `ringDescription` a11y string is retired in favor of real cells; focus and live-region logic untouched; wheel disclosure is a native `<details>`.

**Privacy:** no new data flows; example partial must import only example data + compose (no wallet modules — keep `check-dist` marker discipline); card's added sun/moon fields are public sky facts (document in the privacy test as painted-string allowlist additions).

**Testing changes:** `tests/aura-drive.mjs` — replace ring-geometry assertions with table assertions (12 column heads; row mark counts per fixture; focal column index; empty-record note; example-mode plate strings; error-state example CTA; card raster sampling for new layout; painted-string allowlist extended with sun/moon/current labels). Unit: readings 48-cell determinism; snapshot validation for the new card field; example-mode engine sentence. Keep every existing privacy/share/connector test green.

**Visual-proof requirements:** regenerate one/four/twelve/social proofs from production rendering; add `first-screen-375.png`, `zero-result-375.png`, `provider-error-375.png` to the acceptance set (the V3 HTML proofs are the design contract; the PNGs remain the implementation evidence).

**Migration risks:** (1) the hero's build-time example needs a rendered-date story — mitigate with explicit "example composed {build date}" stamp; (2) deleting the UI sentence generator changes evidence-plate strings — sweep drive-test string assertions; (3) translations for entry copy exist in five locales — update together or the i18n drift check fails; (4) the plan doc still mandates the ring — Sol Ultra must reconcile `REGISTRY-AURA-PLAN.md` (ring section → Alignment section) in the same change, or the docs contradict the build.

---

## 16. Prioritized rollout

**Must change before beta (launch-gating; the five-second test cannot pass without these):**
1. Hero: kicker, plain sentence, inline example, buttons (§7, §11).
2. Example-mode honesty fixes (docket plate + sentence) (§13 #2–3).
3. Jargon purge (committed-table/window, plates, this-copy, equally-quiet) (§1 table).
4. Card rebuild incl. event-label fix (§14).
5. The Alignment replaces the ring; wheel demoted to disclosure (§6).
6. Boundary/storage progressive disclosure (§12).
7. Error-state example escape (§3 #16).
8. Plan-doc reconciliation of the above.

**Should change before public launch:**
9. Evidence-variant readings (48 lines) (§11).
10. Kicker/eyebrow system restyle sitewide-within-Aura (§9).
11. Entry copy + five-locale updates (§15).
12. Docket relative-date word (§11).
13. Regenerated acceptance PNGs + comprehension re-test with all three viewer groups (plan's existing gate).

**Later enhancements:**
14. "Since your last reading" return-visit line (local-only diff of cached vs. fresh sky).
15. Landing "Identity Context" section rename + Shelf → Aura deep-link; WalletChart cross-framing.
16. Privacy-page subsection split (Aura vs. Shelf).
17. Desktop two-register result layout refinements beyond the proof.
18. Card localization.

**Deliberately excluded (decided, not deferred):**
- Talisman-cinema entrance or any spectacle-first mode (trust inversion).
- Per-holding artwork galleries, rarity/edition surfaces, market context in Aura (boundary).
- Cross-chain merging, multi-address (plan's deferred scope stands).
- Personalized share URLs or server-rendered cards (privacy posture stands).
- Streaks, collections, completion meters, "come back tomorrow" prompts (gamification ban stands) — returnability comes from the sky calendar and the since-last-visit line only.

---

## 17. Testable acceptance criteria

**Comprehension (the launch gate, unchanged bar):** ordinary, crypto-literate, and astrology-literate viewers, shown the 375 px first screen for five seconds, can each state: private birth chart + public wallet address + today's sky, read separately → symbolic reading, not a score. Additionally: shown only the 250 px card, a viewer names the product, the sign, and "found at a public address" without zooming.

**Keyboard:** every interactive element reachable in DOM order; example → result focus lands on the result heading (existing behavior preserved); row-label dim toggles operable with Enter/Space; wheel disclosure ≥44 px; no trap in the share preview; post-error focus returns to the address input AND the example escape is next in tab order.

**VoiceOver (and NVDA):** the Alignment announces as a table — "Birth chart, row 1 of 3… Cancer, column 4: 2 placements"; the caption reads the join sentence; stamps announce with their dates; the card preview image announces the full accessible description (existing string, updated).

**Reduced motion:** with `prefers-reduced-motion: reduce`, the result appears in one ≤200 ms fade; identical DOM, identical content, focal rectangle present; no translate/scale anywhere (assert computed animations).

**Forced colors:** row labels, marks (dot/numeral, disc outline, sky glyphs), focal rectangle, and docket rules all visible under `forced-colors: active`; disc cells gain a `CanvasText` border.

**Zoom:** at 200 % and 400 % (equivalently 320 px), the table scrolls horizontally inside its own wrapper with sticky row labels; no page-level horizontal scroll; reading text reflows; all disclosures usable.

**Mobile wallets:** Wallet Standard and EIP-6963 connect only after tap; account change mid-result clears the composition and announces it (existing tests kept); paste path fully functional with no extension.

**Account changes / disconnect:** existing drive assertions kept verbatim.

**Offline / provider failure:** lookup failure shows the honest unavailable line + example escape; the example composes with no network (module pre-warmed — existing behavior); restored results say "restored" and offer Re-check.

**Privacy:** every existing privacy/share assertion stays green; new: painted-string allowlist = {sign names, catalog event-label enum, sun/moon-in-sign labels, fixed strings, dates}; example partial's chunk imports no wallet module; example plate strings assert "No chart was read from this browser."

**Card legibility:** automated raster check: at 250 px downscale, reflection line height ≥11 px, name ≥26 px, disc ≥100 px; center-square crop contains disc+name+reflection+record row (sample pixels, as the drive test already does for the current card).

**Animation performance:** result-reveal drops no frame >32 ms on a 4× CPU-throttled trace (Playwright trace budget); zero animations after settle; zero loops.

**Feature-flag integrity:** flag-off build contains no Aura route, entries, sitemap line, or example partial; flag-on/off both pass the full suite (existing harness).

---

## Closing

**Verdict:** keep the skeleton and the safety engineering; replace the voice, the diagram, and the card. The current implementation proves the team can be trusted with the dangerous parts — V3's job is to let a stranger see that within five seconds.

**Five most important changes:** (1) hero with the plain sentence + inline example; (2) the Alignment replacing the Carry Ring; (3) the card rebuilt around art + reflection + mini-ledger with the event-label fix; (4) the honesty patch set (example-mode plates, jargon purge, "Identity context" removal); (5) legal text compressed to visible summaries + full disclosures.

**Largest risk:** timidity — shipping the copy fixes while keeping the ring and card because they exist. The evidence says the presentation layer, not the plumbing, is what fails the launch gate.

**What Sol Ultra should implement first:** the beta-gate list in §16 in order 1→8, starting with the hero + example-mode honesty fixes (pure copy/markup, no architecture), then the AlignmentGrid component behind the same result key, then the card.

**Proofs:** `docs/acceptance/registry-aura-v3/` — see §8 table.
