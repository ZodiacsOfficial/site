# Scoped maintenance — 2026-09-19

Base: `dfed7c6c39cd8870ba64b1585bd2533f59b9d7e5` (#524 already merged).
Authorization: owner's ZODIACS release-closeout request, section 3, supplied on 2026-09-19. This is a one-time exception for exactly `src/strings/additions.{es,fr,it,pt}.mjs`, only `widgets.privacyNote`; the Phase 1 guard is unchanged.

## Locale correction

The former four translations said birth place never leaves the browser without mentioning city-list requests. They now match the English source's distinctions: local calculation, first-letter city-list requests, no full birth-record upload, and the IP/origin exposed by loading an embed. `src/lib/geo/search.ts` fetches an index and a first-letter shard, then filters locally; non-Latin initials select the `0` shard. Keys, placeholders, exports and other catalog entries are unchanged. No localized widgets page is added. Native-speaker review is not claimed.

The current inventory generator was run: its output is unchanged because the key already has explicit copy in all four catalogs and the inventory records English defaults and pending status rather than translated text. The stale four-catalog privacy caveat is resolved by these edits; historical evidence copies are preserved.

## Historical report repair

`npm run docs:build-report` failed before writing: expected 541 keys, found 579. The root current inventory has its own exact source-set, required-key, locale parity, placeholder and output-drift tests. It is the wrong input to a historical July report.

The report now consumes the exact 541-key inventory already embedded in the retained report, extracted without alteration into `docs/build-report-2026-07-15/`. Its SHA-256, count and required key are checked before writing. New regression tests reject missing/replaced keys, added keys, changed text and substitution of the current manifest. A dated note explains the split; July test, page and performance measurements are unchanged. Regeneration also applies the generator's already-committed Collection naming and August social-card references, which had not reached its stale output. Those are not new measurements or changes to Registry facts.

## Verification and scoped AI review

Node 22.23.2. Focused tests: 30/30. Full suite initially ran alongside the build and saw ten failures while generated files were absent/in flight; the two affected suites passed all 13 tests after build completion. The other 5,519 tests passed, with 13 existing skips. Full production build with saved records on/account sync unset passed, including widget, distribution, schema, bundle and engine-isolation gates. No second full build was needed.

One scoped AI review by the implementing Codex agent (not an independent human review): inspected the four-entry-only catalog diff, English/city loader correspondence, exact-base four-path allowance, historical snapshot provenance and digest, generated-report diff and test dependencies. The report's pre-existing generator/output drift was identified and disclosed above. No material remaining finding in this maintenance diff. Hosted PR gates remain required before merge.
