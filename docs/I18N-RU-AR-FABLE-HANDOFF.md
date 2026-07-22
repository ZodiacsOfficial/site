# Russian + Arabic localization — Fable handoff (design, UX, copy)

Author: Fable · 2026-07-22 · Base: `4fc6121cf8b07812ca35a7934b43ef0e871b3057`
(latest `origin/main` at execution). Decision-complete for Sol Ultra.
Copy decks: `docs/i18n/RU-COPY-DECK.md`, `docs/i18n/AR-COPY-DECK.md`.
Proofs: `docs/acceptance/i18n-ru-ar/` (14 renders, 0 px overflow, fonts
verified loading). Nothing here activates a locale; all RU/AR routes stay
absent or noindex until their gates pass.

## 1. Launch and deferred route matrices

**Launch (both locales; identical to `CORE_LOCALIZED_PATHS` in
`src/lib/i18n/index.ts`):** `/`, `/tools/`, `/birth-chart/`,
`/compatibility/`, `/moon-sign/`, `/rising-sign/`, `/moon-phase/`,
`/saturn-return/`, `/transits/`, `/baby-zodiac/`, `/profile/`,
`/methodology/`, `/privacy/`, `/disclosure/`, `/404.html`, and the twelve
sign guides `/{sign}/` — as `/ru/…` and `/ar/…`.

**Deferred (no RU/AR route, no hreflang, no localized URL emitted):**
daily/yearly horoscope corpora (`/horoscopes/**`), Today editions and
scheduled publications (`/today/**`), Astrology Events interpretations
(`/events/**`, `/full-moon/**` etc.), email/push publication content, the
Registry/onchain wing (never translated), `/birthday/**`, and
`/learn/chinese-zodiac/**`. Two code facts make deferral real work, not
default behavior: (a) `LOCALIZED_PATHS` currently maps every core path to
**all** `LOCALES` — it must become per-locale (`ru`/`ar` appear only for
launched paths, and only when that locale's release lands); (b)
`isLocalizedProgrammaticPath()` returns `LOCALES` unconditionally for
birthday/chinese-zodiac families — it must exclude `ru`/`ar`, or those
families instantly emit thousands of phantom alternates.

**Honest EN seams:** deferred destinations linked from RU/AR pages keep
their localized label plus the deck-fixed suffix — RU «— пока
по-английски», AR «— بالإنجليزية حاليًا» — with the aria/tooltip and
section-note variants in deck §16. No "coming soon", no dates.

## 2. Locale metadata and SEO contract

`LOCALE_META` additions (plus a new `dir` field on the interface, `'ltr'`
for all five existing locales):

| field | ru | ar |
| --- | --- | --- |
| pathPrefix | `/ru` | `/ar` |
| htmlLang | `ru` | `ar` |
| dir | `ltr` | `rtl` |
| hreflang | `ru` | `ar` |
| intlLocale | `ru-RU` | `ar-u-ca-gregory-nu-latn` |
| ogLocale | `ru_RU` | `ar_AR` |
| languageName | `Русский` | `العربية` |

The Arabic Intl tag pins **Gregorian calendar and Latin digits** at the
formatter level — never rely on environment defaults. `localeHtmlLang()`
in `core.ts` duplicates htmlLang for `pt`; fold it into `LOCALE_META` or
extend both (one source of truth preferred). `Base.astro` gains
`dir={LOCALE_META[locale].dir}` on `<html>` (today it sets only `lang`).

**Indexability ladder (hard rule):** every RU/AR page ships with the
existing `noindex` prop set until that locale's full launch gate passes;
`SEO.astro` already suppresses alternates for noindex pages, so during
the noindex phase RU/AR emit no hreflang and receive none. At index-on
(per locale): add the locale to each launched path's `LOCALIZED_PATHS`
entry, extend `scripts/check-dist.mjs` hard-coded hreflang lists (lines
~963/971: `['en','es','pt-BR','fr','it','x-default']`) and the
`translatedBlocks` baseline, regenerate the sitemap, and submit in Search
Console. `x-default` stays EN. OG: `build-og-void.mjs` is `locale: 'en'`
today — each locale release adds a localized share-card set
(`public/assets/og/v2/{ru,ar}/…`, deck §15 titles) before index-on;
while noindex, pages reference the EN cards without harm.

## 3. Direction and layout behavior

**Russian is LTR** — zero layout work beyond string length (§7 QA).
**Arabic is RTL**: `dir="rtl"` on the document; layout flows RTL via
logical properties. The style audit found ~76 physical-direction
declarations (`margin/padding-left|right`, `left:`, `right:`,
`text-align`) across `src/styles/*.css` — Sol converts the shared chrome
(nav, footer, forms, cards, tables, drawer) to logical properties
(`margin-inline-start`, `inset-inline-end`, `text-align: start`) rather
than writing `[dir=rtl]` overrides file-by-file; targeted `[dir=rtl]`
rules remain only where physical is intentional (below).

**Never mirrors** (locked): the zodiac wheel and all chart geometry
(ecliptic runs counterclockwise from a fixed Aries point in every
language — wrap the wheel/diagram containers in `direction: ltr`),
zodiac glyphs and pastel icons, celestial ordering (the twelve-disc rows
keep astronomical order: `dir="ltr"` on the row), artwork, logos,
`Zodiacs.org`, sky-ticker data order. **Mirrors:** reading-order
controls, directional arrows (the `→`/`↗` glyphs in copy and the `.orb`
button arrows become `←`/`↖` — implement as a CSS `content` swap or an
`.arrow` utility, never hand-edited strings), drawer slide direction,
breadcrumb chevrons, back-links, carousel/step controls, table column
order (start-aligned), form label/checkbox order (native with `dir`).

**Bidi rules (deck AR §0 is the authority):** every embedded LTR value —
URLs, emails, dates, times+`UTC`, degrees `3°27′`, coordinates,
`GeoNames (CC BY 4.0)`, addresses — renders in `<bdi>`/`dir="ltr"`
spans; plain-string contexts (aria, `<title>`, alt) use LRI…PDI
(U+2066/U+2069). Date-range strings («21 مارس – 19 أبريل») are single
`<bdi>` runs. Inputs holding LTR values (date, time, email) get
`dir="ltr"` with `text-align: end`.

**Navigation, forms, charts, results, profile, footer:** behavior is
unchanged in RU; in AR everything follows RTL flow except the locked
list above. The language selector derives from `alternatePaths(current)`
availability — **not** from `LOCALES` — so adding `ru`/`ar` to the type
never lights a selector entry until routes exist (this is the activation
decoupling; today `SiteFooter.astro:20` maps all `LOCALES`, which would
otherwise activate broken entries the moment the type grows). Selector
self-names render each in its own script with per-entry `lang` (and
`dir="ltr"` on Latin/Cyrillic names inside the AR footer): **Русский**,
**العربية** — proofs show both directions.

## 4. Dates, numerals, pluralization

- Formatters: everything through `dates.ts` with the table-2 Intl tags.
  Technical receipts keep `TECHNICAL_*` en-US/en-CA — timestamps, UTC
  clocks, degrees, coordinates are **identical bytes in every locale**.
- Latin digits everywhere in both locales (AR enforced by `-nu-latn`).
- Pluralization: the `tf()` replacer cannot express RU (one/few/many) or
  AR (zero/one/two/few/many/other). Sol adds `tp(locale, key, n)` backed
  by `Intl.PluralRules` with `key.one`-style subkeys; the decks (§12 in
  each) list every counting surface and supply RU forms now / AR forms at
  implementation (dual «خريطتان» must never be templated as «2 + noun»).
  Until `tp` lands, no RU/AR surface may interpolate a bare count.
- Russian case: «Луна в {sign}» requires a `signPrepositional` map (deck
  RU §12.2) — never concatenate nominative names after prepositions.

## 5. Typography (final choices; proofs are the deciding evidence)

Current assets are Latin-only (`public/fonts/*latin*`); browser fallback
is rejected. All additions are OFL, self-hosted, subset, with the
existing metric-matched local-fallback pattern (`tokens.css` §fallbacks)
extended per family.

**Russian — chosen:**
- Display serif: **EB Garamond, Cyrillic subset, weights 400/500 (+400
  italic for kickers)** — the same family the site already uses, so the
  RU identity is byte-continuous with EN. File proven: `ebgaramond-500-cyr.woff2`
  ≈ 14.4 KB/weight.
- UI/body sans: **Golos Text (variable 400–600)** replacing Instrument
  Sans for Cyrillic runs — a Russian-designed grotesque whose neutrality
  and slightly warm apertures sit closest to Instrument Sans; proof
  renders confirm the register. ≈ 17–22 KB per subset file.
- Data/mono: **JetBrains Mono, Cyrillic subset** — same family as
  production; Cyrillic mono-caps labels verified in proofs. ≈ 9 KB.
- Expected added RU payload: **≈ 60–75 KB** woff2 total. Fallback stacks:
  Golos → the existing Instrument Sans metrics fallbacks (Arial/Roboto
  overrides re-derived for Golos metrics); EB Garamond Cyr → the existing
  Georgia/Noto Serif fallback set (Cyrillic-capable already).
- Sizes/line-height: unchanged from EN (`15px/1.6` body; display clamp
  as-is). Cyrillic runs ~5–15 % longer than EN — §7 QA covers labels.

**Arabic — chosen:**
- Display/editorial: **Amiri 400** (OFL Naskh; the literary register that
  answers EB Garamond's role). 700 available but not shipped at launch —
  hierarchy comes from size. ≈ 106 KB (the one heavy file; arabic script
  cannot subset much smaller with full shaping).
- UI/body: **IBM Plex Sans Arabic 400/500/600** — harmonized Latin
  included for mixed runs. ≈ 34–36 KB per weight.
- Technical labels: **Plex Arabic 600, normal case, zero tracking** — a
  readable Arabic sans, never forced monospace; purely-Latin value runs
  inside `<bdi>` keep JetBrains Mono (already shipped, Latin subset).
- Expected added AR payload: **≈ 210 KB** woff2 (Amiri 400 + three Plex
  weights). Fallback stacks: `'Amiri', 'Plex Arabic', serif` and
  `'IBM Plex Sans Arabic', system-ui, sans-serif` (system Arabic —
  Geeza Pro/Noto Naskh — as last resort; metric overrides derived at
  implementation).
- Metrics: body 15.5px/1.75 (Arabic needs taller leading); display
  line-height 1.35 (Amiri ascenders/descenders); **no
  `text-transform: uppercase` and no `letter-spacing` on Arabic** — the
  mono-caps label utilities get `:lang(ar)`/`[dir=rtl]` overrides
  (Plex 600, 11.5px, tracking 0), exactly as the proofs render.

## 6. OG cards, accessibility, feature-off, no-JS

- **OG/social:** localized v2 card sets per locale before index-on; deck
  §15 titles/descriptions are the card copy source; AR cards compose RTL
  with the same unmirrored disc art; `og:locale` per table 2 with
  existing-locale alternates only for routes that exist.
- **Accessibility:** keyboard order follows DOM (unchanged by `dir`);
  visible focus (existing 2px `--ink-0` outline) proven in both scripts;
  touch targets ≥44 px throughout (proof controls all comply);
  screen-reader language via correct `lang`/per-entry `lang` in the
  selector; `aria-label`s translated (decks include every aria string);
  bidi-isolated aria values; the wheel keeps its `role="img"` label
  localized while geometry stays LTR.
- **Feature-off / incomplete translation:** the flag-off contract is
  route absence (locale not in `LOCALIZED_PATHS`) — no selector entry,
  no alternates, no sitemap rows, EN behavior untouched. There is no
  "partially translated page" state: a launch surface ships only when
  every string on it resolves in that locale (the untranslated-key CI
  gate below). Interpretation corpora remain EN-only via the existing
  `showsEnglishOnlyInterpretation()` seam extended with the deck's
  seam labels.
- **No-JS:** identical to EN behavior — static pages fully readable,
  forms POST natively, islands never render; RTL layout is CSS-only so
  no-JS Arabic is fully mirrored; nothing direction-critical depends on
  script.

## 7. Implementation sequence (Russian first, then Arabic) and gates

**R0 — shared foundation (no visible change):** extend `Locale` union +
`LOCALES`; add `dir` to meta (ltr everywhere); make `LOCALIZED_PATHS`
per-locale and fix `isLocalizedProgrammaticPath`; selector derives from
availability; add `tp()` plural helper + `signPrepositional`; logical-
properties migration of shared chrome; `check-dist` learns per-locale
hreflang expectations. Gate: EN/ES/PT/FR/IT output byte-identical
(`check-dist` green, zero sitemap drift), all tests green.

**R1 — Russian content:** `src/lib/i18n/ui/ru.ts` from the RU deck (all
keys, tokens byte-exact); `signs.ts`/`astrology.ts` RU overrides;
`ru-guides.ts` (twelve guide bodies — translation work-package governed
by the deck glossary and voice rules; per-guide review against the
glossary is the acceptance); RU legal bodies (privacy/disclosure/
methodology pages) from deck §17 terminology; RU page frontmatter from
deck §15; fonts subset + fallback metrics; `/ru/**` pages generated
**noindex**. Gate: zero missing keys (typecheck), zero EN strings on
launch surfaces (grep gate over rendered `/ru/**` HTML), proofs-parity
visual drive at 360/1280, plural forms exercised in tests.

**R2 — Russian release:** localized OG set; flip noindex → index for
`/ru/**`; `LOCALIZED_PATHS` + `check-dist` + sitemap baselines updated;
Search Console submission. Gate: live hreflang reciprocity EN↔RU on all
launched paths, Lighthouse/CLS unchanged, font payload ≤ 80 KB added.

**A1 — Arabic content (starts only after R2 verifies):** `ar.ts` + AR
overrides + `ar-guides.ts` + AR legal bodies + fonts; RTL enablement
(`dir` per meta) rides the already-migrated logical chrome; `[dir=rtl]`
overrides for label utilities and arrow mirroring; bidi wrapping per
deck AR §0 (add a `bdi()` helper for value interpolation); `/ar/**`
noindex. Gate: R1 gates plus — RTL visual drive (nav open/closed, form,
result) at 360/390/1280 with 0 px overflow; unmirrored-wheel assertion;
bidi snapshot tests for the deck §0.5 LTR-lock list; no
uppercase/tracking computed on Arabic text (computed-style assertion).

**A2 — Arabic release:** as R2 for `/ar/**`.

File-level map (R0/R1 unless noted): `src/lib/i18n/core.ts` ·
`index.ts` · `dates.ts` · `astrology.ts` · `ui/ru.ts`+`ui/ar.ts` (new) ·
`ui/server.ts`/`client.ts` registries · `src/lib/signs.ts` overrides ·
`src/layouts/Base.astro` (dir) · `src/components/{SEO,SiteNav,SiteFooter}.astro` ·
`src/styles/*.css` (logical props; `:lang(ar)` label rules) ·
`src/pages/ru/**`, `src/pages/ar/**` (new page trees mirroring `es/`) ·
`src/data/{ru,ar}-guides.ts` (new) · `public/fonts/*` (subsets +
licenses) · `scripts/check-dist.mjs` (A2/R2) · `scripts/build-og-void.mjs`
(R2/A2) · `scripts/build-i18n-additions.mjs` (catalog gains ru/ar
columns). PLAN.md note: the six-phase program's "English-first, no
machine-translated pages" clause stands for that program; this
localization is a separate owner-directed workstream whose quality bar is
these decks — reviewed copy, not raw MT (and consumer copy never claims
any review provenance, per the locked decision).

## 8. Bilingual glossary (canonical; guides and future editorial bind to it)

| EN | RU | AR |
| --- | --- | --- |
| Aries / Taurus / Gemini / Cancer / Leo / Virgo | Овен / Телец / Близнецы / Рак / Лев / Дева | الحمل / الثور / الجوزاء / السرطان / الأسد / العذراء |
| Libra / Scorpio / Sagittarius / Capricorn / Aquarius / Pisces | Весы / Скорпион / Стрелец / Козерог / Водолей / Рыбы | الميزان / العقرب / القوس / الجدي / الدلو / الحوت |
| Sun / Moon / Mercury / Venus / Mars | Солнце / Луна / Меркурий / Венера / Марс | الشمس / القمر / عطارد / الزهرة / المريخ |
| Jupiter / Saturn / Uranus / Neptune / Pluto | Юпитер / Сатурн / Уран / Нептун / Плутон | المشتري / زحل / أورانوس / نبتون / بلوتو |
| North/South Node | Северный/Южный узел | العقدة الشمالية/الجنوبية |
| conjunction / sextile / square / trine / opposition | соединение / секстиль / квадратура / трин / оппозиция | اقتران / تسديس / تربيع / تثليث / مقابلة |
| ascendant (rising) / descendant / midheaven / IC | асцендент / десцендент / Середина неба / IC | الطالع / الغارب / وسط السماء / تحت الأرض (IC) |
| house / cusp / orb / applying / separating | дом / куспид / орбис / сходящийся / расходящийся | البيت / رأس البيت / فلك التأثير / متقارب / متباعد |
| retrograde / direct / station | ретроградный / директный / стояние | متراجع / مستقيم / وقوف |
| cardinal / fixed / mutable | кардинальный / фиксированный / мутабельный | انقلابي / ثابت / متحول |
| fire / earth / air / water | огонь / земля / воздух / вода | النار / التراب / الهواء / الماء |
| birth chart / natal / transit / return / eclipse / lunation | натальная карта / натальный / транзит / возвращение / затмение / лунация | خريطة الميلاد / ميلادي / عبور / عودة / كسوف أو خسوف / طور قمري |
| domicile / exaltation / detriment / fall | обитель / экзальтация / изгнание / падение | البيت الأصلي / الشرف / الوبال / الهبوط |
| whole sign houses / Placidus | дома целых знаков / Плацидус | بيوت البروج الكاملة / بلاسيدوس |

## 9. Proof inventory and results

`docs/acceptance/i18n-ru-ar/`: `proof.css` + six self-contained pages —
`{ru,ar}-core.html` (homepage, nav closed/open, footer + selector),
`{ru,ar}-chart.html` (form, validation, loading, result, wheel, table,
save), `{ru,ar}-surfaces.html` (sign guide, compatibility, profile empty,
methodology/trust) — with annotation rails, deck copy verbatim, and the
nine downloaded OFL font files under `assets/fonts/`. Rendered headlessly
(repo `playwright-core`, DPR 2, reduced motion): 360 + 1280 for all six,
plus 390 Arabic for the crowded nav and form/chart-result pages —
**14 captures, 0 px horizontal overflow in every one** (per-capture
numbers in `evidence.json`; one defect was found and fixed during
proofing — the five-column positions table overflowed 56 px at 360 and
now scrolls inside its own container, the sanctioned pattern for wide
data). Font loading verified per render (`loadedFonts`): RU pages load
Golos Text + EB Garamond Cyr + JetBrains Mono Cyr; AR pages load Amiri +
Plex Arabic (+ mono for Latin value runs). Visual checks confirm shaped
Arabic, true RTL flow with LTR-isolated values, mirrored text arrows,
unmirrored wheel/discs, Cyrillic Garamond display, mono-caps Cyrillic
labels, and visible focus in both scripts.

## 10. Backlog (explicitly out of scope now)

Translated daily/today editorial and horoscope corpora (needs its own
editorial pipeline decision: template-translation vs per-locale
generation — do not start it as a side effect); events interpretations;
email/push publication content in RU/AR (subjects/bodies/unsubscribe
pages — the daily module is EN-only by design today); birthday and
chinese-zodiac programmatic families; Ask assistant RU/AR; localized OG
alt-text pass; RU «ё» policy revisit if editorial voice evolves;
per-locale search (place index is Latin-searchable — Cyrillic/Arabic
city aliases are a data question for GeoNames alternate names, flagged,
not designed here).

## 11. Blockers

None genuine. Two watch-items, neither blocking design handoff: (1) the
GeoNames place search accepts Latin queries today — RU/AR users can type
Latin city names at launch; alternate-name indexing is backlog; (2)
`ar_AR` is not a canonical OG locale code (Open Graph accepts it in
practice; `ar_SA` would be region-marked — decision: keep neutral
`ar_AR`, consistent with region-neutral MSA).
