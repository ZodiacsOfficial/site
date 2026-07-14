# French language review

Review method: **AI language review by Sol**.

Review date: **2026-07-15**.

Status: **translation draft complete; integration and browser verification are
pending the shared locale rails**.

accepted by the owner in lieu of a human native-speaker sign-off.

The review uses warm, informal French with `tu` throughout. It covers the
complete French page tree, all twelve long-form sign guides, page metadata,
structured data, FAQs, privacy disclosures, empty states and the explicit
English-content fallback. The established terminology is `thème astral`,
`ascendant`, `maisons`, `transits`, `pleine lune`, `nouvelle lune` and
`rétrograde`.

## Translation checklist

- [x] Informal `tu` is consistent across the authored page and guide copy.
- [x] No `vous` register was introduced in consumer copy.
- [x] Astrology terminology follows common contemporary French usage.
- [x] Accents, ligatures and punctuation were reviewed, including `à`, `â`,
  `ç`, `é`, `è`, `ê`, `œ`, curly apostrophes and French spacing before double
  punctuation.
- [x] All 12 sign guides provide two introductions, nine sections, 24 body
  paragraphs and six FAQs.
- [x] Metadata, schema names, descriptions, breadcrumbs and `inLanguage` use
  French on the authored routes.
- [x] Privacy copy preserves the meaning of the English policy, including
  local calculation, optional sync, Anthropic processing, salted quota
  identifiers, push subscriptions, Plausible analytics and deletion choices.
- [x] English-only destinations are labelled as English and are not presented
  as translated content.
- [x] Source-level scans find no Spanish or unlabelled English prose in the
  French page and guide corpus.
- [ ] Shared locale rails, interactive module dictionaries and French search
  integration will be verified after the L0 branch is available.
- [ ] The complete built route set will be driven at 320 px after integration;
  no visual-browser result is claimed by this isolated translation draft.
- [ ] Build, check, tests, distribution drift and bundle gates will be recorded
  on the integrated branch.

## Route coverage

The authored tree contains the French home page, all twelve sign guides,
tools index, theme astral, compatibility, signe lunaire, ascendant, phase
lunaire, retour de Saturne, transits, zodiaque du bébé, profile, methodology,
privacy, localized 404 and the noindex English-content fallback.

The French sign pages reuse the existing sign-card social images. No new image
assets and no registry-wing or SDK files are part of this translation draft.

## Guide depth contract

For every sign, the guide includes personality, love, placement in the chart,
recognition, relationships and trust, work and direction, planetary
placements, shadow and growth, and an intimate closing section. Each guide
also covers dates, element and modality, ruler, compatibility, strong chart
emphasis and the case where a reader does not identify with the Sun sign.

## Integration checks still required

The exact-main snapshot only knows `en` and `es`; this translation draft does
not alter shared locale types or runtime dictionaries so it can stack cleanly
after L0. Integration must wire `fr` through routing, hreflang, sitemap,
canonical URLs, date formatting, localized sign names, islands, navigation,
footer, assistant, chart lenses, tour copy and search before publication.
Those dependencies are deliberately recorded as pending rather than described
as already tested.
