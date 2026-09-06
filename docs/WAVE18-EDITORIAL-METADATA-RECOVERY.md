# Wave 18 editorial metadata recovery

This is a new implementation of the approved Wave 18 brief. The original
standalone source was not present in the emergency archive. It is prepared
separately from the pending releases and must integrate actual released main
before a PR or acceptance claim.

The repair has exactly 70 editorial owners: 65 Chinese zodiac articles (the hub
and twelve animals in English, Spanish, Portuguese, French and Italian), plus
five English Learn collections. Collection pages retain their CollectionPage
and ItemList graphs, with website Open Graph type; the accidental automatic
Article graph is removed. No displayed prose or page layout is changed.

## Date provenance

The shared source preserves the existing reviewed sitemap dates for 69 owners:
Chinese zodiac July 15, 2026; Houses August 23; Planets, Aspects and Placements
July 10. Chinese localization source was delivered in 3bb50732/d9c4de09; the
July 22 change 9749f8ec only replaces a TypeScript locale import and does not
justify fresh editorial dates. Houses' August 23 receipt accompanies the actual
house-system explanation in 12dbe89f. Learn alone advances to September 5,
matching the source revision 034ee2f (Search/learning). September 6 integration
does not manufacture another editorial revision. Original publication receipts
are unavailable; datePublished is omitted rather than inferred from git import,
rebuild time, or modification dates.

Pages and sitemap consume the same explicit owner map. The completed-build
validator requires all 70 indexable owners, exactly one correct graph type,
matching modification dates, no invented publication date, and exactly one
matching sitemap entry. Existing event and horoscope date gates remain intact.
The browser drive adds mobile and desktop, JavaScript-disabled checks for all
five collections plus a hub and animal in each locale; all 70 pages are covered
by the completed-build gate. Captures must still be executed and reviewed.

## Validation status

- Focused date/owner tests: 10 pass in two files.
- Full build/postbuild passes: 4,302 HTML files; 1,176 JSON-LD documents,
  4,469 graph nodes, exactly 70 editorial owners; unchanged bundle budgets.
  Final source fingerprint cb5b130ac5038a7d08d19b7cca0bdf477e824e62fd54c11b75f7338fbfc67a05.
- Astro check passes: 937 files, zero errors or warnings, ten existing hints.
- The scope inventory identifies seven protected Learn source paths. The exact
  allowance must be pinned to actual released main during integration; it is
  not satisfied by the inherited earlier-wave allowance.
- Initial full suite: 3,640 pass and two fail in 367 files (422.28s): stale
  Phase 1 evidence and the old test requiring both Learn and Houses' literal
  August 23 dates. The latter now checks exact shared receipts (Learn September
  5, Houses August 23); all 12 focused metadata/audit tests pass. This is not a
  final full-suite pass; fresh Phase 1/browser evidence and release CI remain
  pending. No new baseline is accepted here.
- A generated-body comparison found that website metadata also hid the
  editorial disclosure. The five collections now explicitly retain it through
  an optional Base property; all other pages keep their existing default.
  Final build/postbuild passes after this correction. All 70 generated visible
  body texts match the preceding Wave 17 build, including the disclosure;
  69 sitemap dates are identical and Learn alone changes August 23 to September 5.
- Wave 24's independent Uranus 2020 conditioning failure remains unresolved.
