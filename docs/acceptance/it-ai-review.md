# Italian language review

Review method: **AI language review by Sol**.

Review date: **2026-07-15**.

Status: **the integrated Italian language review is complete across pages,
guides, shared dictionaries and interactive modules. The 320 px browser pass
and accented-font coverage are verified; the authoritative Linux gate remains
to be confirmed**.

accepted by the owner in lieu of a human native-speaker sign-off.

The review uses natural contemporary Italian and informal `tu` throughout. It
covers the complete Italian page tree, all twelve long-form sign guides, page
metadata, structured data, FAQs, privacy disclosures, empty states and the
explicit English-content fallback. The established terminology is `tema
natale`, `ascendente`, `case`, `transiti`, `luna piena`, `luna nuova` and
`retrogrado`.

## Translation checklist

- [x] Informal `tu` is consistent across the authored page and guide copy.
- [x] No formal `Lei` register was introduced in consumer copy.
- [x] Astrology terminology follows common contemporary Italian usage.
- [x] Apostrophes, elision, articles, prepositions and singular/plural agreement
  were reviewed, including `l’Ariete`, `lo Scorpione`, `i Gemelli`, `i Pesci`,
  `dell’Acquario` and `dallo Scorpione`.
- [x] All 12 sign guides provide two introductions, nine sections, 24 body
  paragraphs and six FAQs.
- [x] The 12 guide seeds and depth profiles were checked slug by slug against
  the Spanish source corpus; seasonal framing, planetary context, placement
  facts and each sign's distinct growth lesson are retained.
- [x] Metadata, schema names, descriptions, breadcrumbs and `inLanguage` use
  Italian on the authored routes.
- [x] Privacy copy preserves the meaning of the English policy, including
  local calculation, optional sync, Anthropic processing, salted quota
  identifiers, push subscriptions, Plausible analytics and deletion choices.
- [x] English-only destinations are labelled as English and are not presented
  as translated content.
- [x] Source-level scans find no French, Spanish or unlabelled English prose in
  the Italian page and guide corpus.
- [x] Shared locale rails, the 331-key UI catalog, module-local copy,
  assistant chrome, push delivery, navigation, sitemap and search behavior were
  reviewed after integration.
- [x] Italian UI keys and interpolation placeholders match the English catalog.
- [ ] Draft publication dates use the review date and must be refreshed to the
  actual merge date together with the sitemap `lastmod` values.
- [x] Sixteen representative routes were driven at a 320 × 844 browser
  viewport after integration. Every page had meaningful content, `lang="it"`,
  no document overflow, no framework overlay and no page error; the localized
  `/it/404/` and the labelled English fallback were included.
- [ ] Build, check, distribution drift and bundle gates pass locally. The local
  suite passes 472/473 tests; only the pre-existing Kahlo astronomy snapshot
  differs at machine-precision decimals under macOS, exactly as on the earlier
  stack layers. The authoritative Linux gate remains to be recorded.

## Mobile and font evidence

The home page, birth-chart calculator and Ariete guide were captured from the
320 × 844 review viewport in `docs/acceptance/languages/`. Visual inspection
found no clipping, truncation or fallback-font substitution.

Chrome's font loading check returned `true` for every character in `à è ì ò ù`
for all three self-hosted families: Instrument Sans, EB Garamond and JetBrains
Mono. Computed styles on live Italian text also resolve to the intended sans
and serif families; the locale row exercises the self-hosted mono family.

## Route coverage

The authored tree contains the Italian home page, all twelve sign guides,
tools index, tema natale, compatibility, segno lunare, ascendente, fase lunare,
ritorno di Saturno, transiti, zodiaco del bambino, profile, methodology,
privacy, localized 404 and the noindex English-content fallback.

The Italian sign pages reuse the existing sign-card social images. No new
image assets and no registry-wing or SDK files are part of this language
review.

## Guide depth contract

For every sign, the guide includes personality, love, placement in the chart,
recognition, relationships and trust, work and direction, planetary
placements, shadow and growth, and an intimate closing section. Each guide
also covers dates, element and modality, ruler, compatibility, strong chart
emphasis and the case where a reader does not identify with the Sun sign.

## Clear defects corrected

- The privacy lede now preserves every English promise; the tools index and
  shared tools navigation restore the missing birth-time guidance.
- Italian push subscriptions retain `it` instead of falling back to English.
- Literal calques and grammar errors were corrected in the methodology,
  Saturn-return, baby-zodiac, transit ring, guided tour, daily reading,
  composite-tab and no-time/boundary copy.
- The guide corpus fixes nine clear article, agreement and collocation defects,
  including the malformed generated Leone sentence and the feminine Bilancia
  references, without changing any source fact.

## Gate-critical strings

The Italian values below are byte-identical to their integrated source values.

| English source | Italian implementation | Register note |
| --- | --- | --- |
| `Registry` | `Registro` | Documentary navigation label, without commercial language. |
| `Overview` | `Panoramica` | Neutral overview label. |
| `Collector’s wing` | `Ala della collezione` | Quiet, museum-like register. |
| `also exists as one of the Twelve — a canonical record in the registry.` | `esiste anche come uno dei Dodici — una scheda di riferimento nel registro.` | `Scheda` reads as a catalog record, not an offer. |
| `View the record →` | `Vedi la scheda →` | Points to a documentary record. |
| `The short version: when you calculate a chart, the math runs in your browser and your birth date, time, and place are never sent to us. Accounts and the weekly email are optional, off by default, and easy to leave. We show no ads and use no cross-site tracking.` | `In breve: quando calcoli un tema natale, il calcolo avviene nel tuo browser e la tua data, la tua ora e il tuo luogo di nascita non ci vengono mai inviati. L’account e l’e-mail settimanale sono facoltativi e disattivati per impostazione predefinita; puoi rinunciarvi facilmente. Non mostriamo pubblicità e non usiamo il tracciamento tra siti.` | Direct informal reassurance with every source promise preserved. |
| `Send this page:` / `Email` | `Condividi questa pagina:` / `E-mail` | Plain courtesy label and standard Italian spelling. |

## Unapplied judgment-call findings

| File | Current | Proposed | Reason |
| --- | --- | --- | --- |
| `src/data/it-guides.ts` | `una singolarità condivisa` | `stranezze condivise` | Both are correct. The proposal is more conversational, while the current wording better preserves the source’s emphasis on accepted individuality. |
| `src/islands/explorer/lens/copy.ts` | `Scorri questo cielo nel tempo su /transits/.` | `Esplora questo cielo nel tempo su /transits/.` | Both are natural; the proposal is a little less literal as a navigation prompt. |
| `src/lib/assistant/open-assistant.ts` | `Scrittura della risposta…` | `Sto scrivendo una risposta…` | The current compact status label is correct; the proposal is more conversational. |
| `src/islands/synastry/RelationshipWheel.tsx` | `armoniosi` | `armonici` | Both describe easeful contacts correctly; the proposal uses the more technical astrological adjective. |
| `src/pages/it/compatibility/index.astro` | `Due temi, confrontati con chiarezza` | `Due temi, confrontati con onestà` | The current phrase is natural; the proposal follows “honestly” more closely but changes the emphasis. |
| `src/data/it-guides.ts` | `migliorare il concreto` | `migliorare la realtà concreta` | The current compressed phrasing is understandable; the proposal is more idiomatic but less concise. |
| `src/data/it-guides.ts` | `In Venere…` / `In Mercurio…` | `Con Venere in Toro…` / `Con Mercurio in Gemelli…` | The shorthand is clear in context and follows the translated corpus pattern; the proposal is more conventional but repeats the sign and changes the rhythm. |

## Integration checks still required

Italian is integrated through routing, hreflang, sitemap, canonical URLs, date
formatting, localized sign names, islands, navigation, footer, assistant, chart
lenses, tour copy, push delivery and search behavior. Mobile rendering and
accented-font coverage are verified. The remaining checks are the merge-date
refresh, if needed, and the authoritative Linux branch gate.
