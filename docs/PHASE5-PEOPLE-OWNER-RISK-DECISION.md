# Phase 5C People — owner risk decision

Status: approved for a conservative public-search release

Approved: 2026-07-26T16:50:40Z

Scope: the twenty already-reviewed Phase 5B records only

## Decision

The site owner has chosen not to obtain outside legal advice for this release.
This record is therefore an owner risk decision, not a legal opinion and not a
claim that every jurisdiction has been analysed.

Phase 5C may make only the eighteen reviewed profiles of deceased public
figures indexable. The two living-person profiles — Rigoberta Menchú and
Serena Williams — remain `noindex, nofollow`; stay out of the sitemap and site
search; do not appear in indexable birthday or related-person links; and keep
their portrait and social-card assets blocked from image indexing.

The `/people/` directory remains `noindex, nofollow`. Its existing contract
requires at least twenty indexable profiles, and this release has eighteen.
No navigation entry, localized route, automated ingestion, or expansion is
authorized.

## Why this is the conservative boundary

- The EU GDPR states that it does not apply to personal data of deceased
  people, while allowing member states to set their own rules:
  <https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/>.
- The UK Information Commissioner's Office likewise states that information
  about a deceased person is not personal data under the UK GDPR:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/what-is-personal-data/what-is-personal-data/>.
- For living people, publicly available information does not by itself remove
  privacy obligations. The European Data Protection Board says a legitimate-
  interests basis requires a real lawful interest, necessity, and a balancing
  exercise in which the person's rights do not take precedence:
  <https://www.edpb.europa.eu/news/edpb-adopts-opinion-on-processors-guidelines-on-legitimate-interest-statement-on-draft_en>.
- California's Attorney General explains both the publicly-available-
  information exclusion and the thresholds that determine whether the CCPA
  applies. The site does not rely on either point to index a living profile:
  <https://oag.ca.gov/privacy/ccpa>.

These sources do not settle copyright, publicity, personality, defamation, or
local post-mortem rules in every jurisdiction. The product boundary reduces
that uncertainty; it does not erase it.

## Controls that remain mandatory

1. Facts stay limited to the reviewed Wikidata, Wikipedia, and Wikimedia
   Commons records already pinned in the repository.
2. Pages describe the recorded sky and its uncertainty. They do not claim that
   astrology explains a person's character, conduct, health, relationships,
   finances, sexuality, or life events.
3. Every published portrait keeps its reviewed licence and visible credit.
4. `people@zodiacs.org` remains monitored for correction, objection,
   withholding, and removal requests.
5. A subject removal is honored even when the underlying public source remains
   unchanged. The existing noindex and 410 procedures remain authoritative.
6. A new person is never indexed automatically. The explicit allowlist in
   `docs/phase5/people-pilot/index-policy.json` is the release boundary.
7. A living-person profile may become indexable only through a new, explicit
   owner-authorized decision after consent or a qualified review. This release
   supplies neither.

## Phase boundary

This decision clears only the Phase 5C indexing gate for the eighteen named
profiles. It does not complete the 500-person Phase 5 Definition of Done, does
not authorize person 21, and does not open Phase 6.
