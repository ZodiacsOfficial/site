# Brazilian Portuguese language review

Review method: **AI language review by Sol**.

Review date: **2026-07-15**.

Status: **complete, subject to Fable's review of the judgment-call findings in
the draft PR**.

accepted by the owner in lieu of a human native-speaker sign-off.

The review used Brazilian Portuguese (`pt-BR`), informal `você`, and the
requested astrology terminology: mapa astral, ascendente, casas, trânsitos,
Lua cheia/nova and retrógrado. It covered all 16 `/pt/` source pages, the
complete 12-sign guide corpus, the shared 331-key UI catalog, and every
module-local Portuguese copy block. Clear grammar, terminology, register and
calque defects were corrected directly. Correct alternatives that would
require a voice judgment are recorded below and remain unapplied.

## Checklist results

- [x] Brazilian Portuguese throughout; no European-only vocabulary or
  Portuguese-from-Portugal register.
- [x] Informal `você` remains consistent; no `tu`, `vós` or formal address.
- [x] Astrology terminology and all planet, aspect, Moon-phase and station
  labels reviewed.
- [x] Gender, number, grammar, calques, natural word order and factual parity
  reviewed.
- [x] Dates and numbers use `pt-BR`; sign-date labels use Brazilian month
  abbreviations.
- [x] All 12 guides match the Spanish source at 2 intro paragraphs, 9
  sections, 24 body paragraphs, 6 FAQs and one rising-sign profile, while
  preserving each sign's distinct facts and growth note.
- [x] English-only interpretive families remain labelled, suppressed and
  `noindex` in the same way as Spanish.
- [x] Consumer copy contains no market, token or crypto language.
- [x] No English, Spanish or Portuguese consumer surface was edited outside
  the new locale and shared locale-aware copy maps.

## Clear defects corrected

- Guide translations that had flattened sign-specific facts were restored,
  including Gemini identity, Virgo work, Libra conflict, Aquarius rising and
  Pisces body-care language.
- Tool and FAQ calques were corrected across baby zodiac, birth chart,
  compatibility, methodology, Moon phase, Moon sign, Saturn return and
  transits.
- The ascendant copy now asks for an exact birth time instead of referring to
  a clock, and Placidus/retrograde explanations preserve the English source's
  meaning.
- Energy-language in the Pisces guide was replaced with concrete personal
  boundaries, preserving the site's no-woo voice.

## Judgment-call findings (unapplied)

| File | Current | Proposed | Reason |
| --- | --- | --- | --- |
| `src/data/pt-guides.ts` | `construir valor` | `criar valor` | Both are correct; the latter is slightly more idiomatic in this abstract sense. |
| `src/data/pt-guides.ts` | `falar consigo com menos dureza` | `se tratar com menos dureza` | The proposal is more conversational, but changes the image slightly. |
| `src/data/pt-guides.ts` | `quando a vida fica adulta` | `quando a vida exige maturidade` | The proposal is more natural but less figurative. |
| `src/pages/pt/privacy/index.astro` | `identificador unidirecional com sal` | A plainer explanation of the salted one-way identifier | The current technical wording is accurate; simplification requires a voice decision. |
| `src/pages/pt/profile/index.astro` | `sincronizar mapas salvos e exclusões` | A smoother explanation of syncing saved maps and deletions | The current wording is accurate; the alternatives change emphasis. |
| `src/islands/PositionsShareSurface.tsx` | `isto não é anônimo` | `isso não é anônimo` | Both are grammatical; the proposal is slightly more idiomatic in Brazil. |
| `src/lib/i18n/daily-reading.ts` | `o registro mostra o horário` | `os detalhes mostram o horário` | The proposal avoids a possible receipt/register calque, but the current wording is understandable. |
| `src/lib/i18n/ui/pt.ts` | `Se não for você, vale pedir permissão.` | `Se os dados não forem seus, vale pedir permissão.` | The proposal has a clearer referent but changes the supplied conversational rhythm. |
| `src/lib/i18n/ui/pt.ts` | `mova o controle de data` | `mova o controle deslizante de data` | The longer noun is more explicit but may be unnecessarily technical in the UI. |
| `src/islands/explorer/tour/copy.ts` | `de qualquer forma` | `de todo modo` | Both are natural Brazilian Portuguese; this is style only. |

## Browser and font result

Sixteen representative page/template routes were checked at 320 × 844:
home, the ten translated tool/profile pages, methodology, privacy, one sign
guide, the localized 404, and the labelled English-content fallback. Every
route had meaningful content, `lang="pt-BR"`, zero document overflow, no
framework error overlay and no browser errors.

Chrome's platform-font report rendered `ã õ ç` entirely with the three
self-hosted webfonts: Instrument Sans, EB Garamond and JetBrains Mono. Each
reported `isCustomFont: true` with no fallback glyphs.

Screenshots: [home at 320 px](languages/pt-home-320.png), [birth chart at 320
px](languages/pt-birth-chart-320.png), and [Áries guide at 320
px](languages/pt-aries-320.png).

## Search, metadata and scope

- [x] Search follows the Spanish precedent: localized pages are not added to
  the English search index; the built index remains 818 entries.
- [x] Sitemap has 25 unique `pt-BR` alternates, exactly for the translated
  indexable pages; `x-default` remains English and all `/pt/` `lastmod` values
  are `2026-07-15`.
- [x] Zero-JavaScript sign guides remain at 0.0 KB; localized UI catalogs load
  only on pages that hydrate islands.
- [x] No change under `public/`, to bundle budgets, Vercel configuration,
  analytics allowlists, OG generation, SDK sources, or the assistant persona
  and its pinned SHA.
