Codex Sol Ultra — LOCALIZE phase: translate the 541-key handoff, localize
the programmatic pages, plus five carried-over chores

Repo: ZodiacsOfficial/site. Branch from the LATEST origin/main (the daily
cron moves it every morning). The site ships EN, ES, pt-BR, FR, IT. The
recent growth build added new i18n keys, all catalogued in
i18n-additions.md at the repo root — each key has an EN default, usage
context, and its pending locales.

Standing rules: never deploy; merging to main IS the deploy and merges are
Fable's. Never modify the sdk repository's main branch; no npm publication.
Do not edit any existing translated string (one byte-exact exception in
Task 3). Do not touch api/_assistant/persona.ts, the analytics allowlist,
budgets.json, or vercel.json. English-only interpretive corpora stay
English-only (standing D9). CI only runs on pull requests — push your
branch and open a DRAFT PR early so the authoritative Site Checks actually
run; local-only green does not count.

═══════════════════════════════════════════════════════════
TASK 0 — Two one-line chores before anything else
═══════════════════════════════════════════════════════════

1. From the sdk workspace: `git push -u origin codex/engine-expansion`.
   Push only — no PR, no merge. This unblocks Fable's source-level
   licensing review; npm publication stays blocked until that review.
2. Commit the original build directive verbatim to the site branch as
   `BUILD-DIRECTIVE.md` (review-only document, no code effect).

═══════════════════════════════════════════════════════════
TASK 1 — Translate every pending key (es, pt-BR, fr, it)
═══════════════════════════════════════════════════════════

Translate each key's PENDING locales exactly as recorded in
i18n-additions.md — keys marked "none" are already supplied; do not
retranslate them. Strings land in the established per-locale growth
catalogues and src/strings modules; follow the existing fallback wiring.

Completion is provable, not asserted: regenerate the manifest with
`node scripts/build-i18n-additions.mjs` — the committed result must show
zero pending entries, or list each exception with a reason in the PR body.

REGISTER RULES — study the existing catalogues before writing a word:
- Spanish: neutral Latin American Spanish, informal tú, es-419
  conventions; match the existing es catalogue's register precisely.
- Brazilian Portuguese: direct Brazilian você; museum vocabulary uses the
  shipped terms (Ala do acervo, registro, acervo).
- French: warm informal tu; museum-catalogue vocabulary uses the shipped
  "notice" convention (Aile des collections, Voir la notice).
- Italian: direct informal tu; museum vocabulary uses the shipped
  "scheda" convention (Ala della collezione, Vedi la scheda).

CONTENT RULES:
- Privacy-adjacent strings (email-capture microcopy, disclosure rows,
  wallet-chart privacy notes): every promise in the EN source survives
  translation exactly — nothing softened, dropped, or embellished. These
  get a dedicated review table per language in your report.
- Registry-wing strings stay in the neutral institutional register
  already shipped (Registro / Registre / Registro). Never market language.
- Disclaimer strings ("not financial advice", "read-only") must be
  unambiguous in every language — plain legal-adjacent phrasing beats
  elegance.
- Length-constrained keys (buttons, chips, OG titles) respect the max
  lengths in their usage context; verify at 320 px where the context
  names a surface.
- Placeholders like {sign} and literal <br/> tags stay byte-identical.

═══════════════════════════════════════════════════════════
TASK 2 — Localize the programmatic pages + one coordinated indexing commit
═══════════════════════════════════════════════════════════

Scope decision (Fable, pre-made — do not revisit):
- Birthday pages (366) and Chinese-zodiac pages (13): fully localizable
  from keys + data — build all four locales' HTML for them.
- Compatibility pair pages (78): their MDX bodies are interpretive prose
  and stay English-only under D9. Do NOT emit locale pair routes with
  English bodies. Instead, report an effort estimate for translating the
  pair corpus as content (words per locale, suggested batching) — the
  owner prices that separately.

Then, in ONE coordinated commit, exactly like the shipped
[coordinated-indexing] convention:
- add the new locale pages' hreflang alternates and sitemap entries
  (only real translations get alternates — the TODO(i18n) assertions that
  currently pin WS5 pages to zero alternates flip to asserting the real
  ones);
- update the count-gate constants in scripts/check-dist.mjs
  (sitemapPolicy totals and per-family expected counts) transparently in
  that same commit — never loosen or disable a gate;
- keep the programmatic-uniqueness gate green; if it needs per-locale
  scoping, extend the script rather than exempting pages.

Localized OG images: only if the existing build makes it a pure config
change, as designed; otherwise leave a TODO with an effort estimate.

═══════════════════════════════════════════════════════════
TASK 3 — Hardening chores from Fable's review (same PR, separate commits)
═══════════════════════════════════════════════════════════

1. scripts/build-pwa-icons.test.mjs writes into the repo tree when it
   runs (it re-encodes the committed icon in place). Make it write to a
   temp directory; committed assets must never change from a test run.
2. Visual-baseline headroom: birth-chart-kahlo-mobile sits at 0.0963% of
   the 0.1% changed-pixel budget, the same fragility that broke
   home-mobile when the daily sky changed. Mask the live daily-data
   regions (ticker/today text) in the visual harness so day-to-day data
   jitter stops consuming the budget, then confirm all nine cases pass
   with real headroom. Do not widen the 0.1% limit.
3. One authorized edit to an existing translation — the French privacy
   lede currently under-promises "easy to leave". Byte-exact replacement
   (typographic apostrophes as shipped), in src/pages/fr/privacy/
   index.astro:
   OLD: ces options sont désactivées par défaut et tu peux facilement
        t’en passer.
   NEW: ces options sont désactivées par défaut et tu peux les quitter
        facilement.
   No other shipped translation changes.

═══════════════════════════════════════════════════════════
DELIVERY
═══════════════════════════════════════════════════════════

Stacked PRs or a single PR — your call; every PR is DRAFT, pushed, with
the full authoritative Site Checks green on the final head. Nothing
merged, nothing deployed.

Report in the approval-table format from the locale handoff: one table
per language covering (a) the privacy-adjacent surfaces, (b) the
disclosure rows, (c) one sample programmatic page (a birthday page and a
Chinese-zodiac page), plus shipped-vs-judgment-call lists per language —
clear defects fixed directly, judgment calls recorded and UNAPPLIED for
Fable's gate. Include: the regenerated i18n-additions.md pending count
(must be zero or excepted), final sitemap/HTML/search counts, the
uniqueness result, and the pair-corpus translation estimate. Any STOP
items with exactly what you found; Fable arbitrates at the gate.
