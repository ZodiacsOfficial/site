# Frozen rc.6 site adoption independent review

No unresolved defect was found in the eight frozen adoption files plus the two frozen receipt companion files. This is bounded independent source and executable review, not publication or deployment approval.

## Identity and source findings

- Adoption base: c761a49c55d125bca48ff38d81b0a9ff6fd5adcf; patch SHA-256 bb8cfee75e5602da24067f44bdd8e49d295f9025f7ceab4dc8db701305b3dc93. Companion base: 804c70309d2508e67e8462df526b5f9e71a112e9; patch SHA-256 95f0a05ed8faa02797785c5ead8d42fee3d12e4d3e708b4ad5857b952f70d1cb. All ten supplied file hashes matched physical copies and the author sources again at completion.
- The site resolver makes the same seconds and milliseconds correction as the reviewed SDK: full wall matching, zero seconds/milliseconds for HH:MM, integer-millisecond offset conversion. Existing parsing, offset sampling and fold/gap policy remain unchanged.
- Package and lock changes select the exact rc.6 archive. The integration test checks that archive/version; the scene snapshot change is only engineVersion. No numerical snapshot was rewritten.
- The receipt helper companion changes only its explanatory comment. Independent esbuild transforms of the base and frozen helper produce identical executable code. The companion retains 16 deliberately inconsistent legacy-flag negative controls and adds 16 actual corrected-resolver positive controls. This correctly separates the old unsupported context from the corrected current path.
- No ownership SDK, UI design, hydration, privacy boundary, or endpoint policy is changed by these frozen patches. The separate receipt export/hydration/browser review is not duplicated or claimed here.

## Executed checks

Node 22.23.2 (ICU 78.2, tzdb 2026a) and Node 24.19.0 (ICU 78.3, tzdb 2026b) each passed:

- 278 retained historical/modern transition controls: 140 corrected flags, zero resolved-instant or offset changes. Complete Intl second/millisecond postconditions and the genuine four-second Denver fold hold.
- 65 additional controls around Paris, Dublin, Monrovia, Kathmandu, Kolkata, Yangon, Amsterdam, Auckland and modern US/Lord Howe transitions. An independent finite reference obtains offsets from complete Gregorian wall fields at 145 hourly instants, then checks complete candidate matches and earlier-fold selection. No additional regression occurred.
- 42 date syntax boundary controls including year 0000, 0099, 1800, 2199 and 9999 across UTC, Kiritimati and Adak. All 385 valid cases agree exactly with the downloaded public rc.6 package. Nineteen malformed date/time/zone cases reject in both site versions and the package; existing site diagnostics remain unchanged.
- 41 controls on the physically copied actual receipt helper: 16 old inconsistent flag sets return null before any natal call; 16 corrected cases capture and replay with one actual public natal call, preserving the legacy chart projection; five additional historical/unknown-time cases pass; four fixed-offset/exact-pole fallbacks retain their old chart path. A transparent count-only public natal wrapper delegates to the actual archive, without stubbing calculation.

Both runtimes produced identical detailed numerical/control results. Public-only archive consumption and strict published TypeScript declarations were separately verified in the linked public consumer evidence; this site helper review also exercises the existing private adapter entry point because that is the site's actual legacy path.

## Limits and excluded claims

- These finite host-Intl checks do not certify historical timezone truth, broad astronomical accuracy, or every timezone transition. The existing three-point offset sampler remains unchanged.
- Year 0000/9999 exercise the library grammar, outside the site's 1800–2199 input window. Skipped/repeated local-date interval endpoints and whole-date Moon/Sun completeness remain separate work.
- vendor/README.md, src/data/platform-engine-candidate.json and public/llms-full.txt are explicitly excluded provisional metadata. No placeholder evidence commit is approved. Root must bind these to the real carrier and run integrated gates.
- No source, author checkout, published release, production surface or shared state was edited by this review. No network was used.

See SUMMARY.json, final-recheck.json, raw Node/helper logs, build-input identities and source archive. Public consumer: /private/tmp/zodiacs-platform-rc6-public-consumer-review/public-candidate-consumer.log, SHA-256 05c4eed6f9e10d7ddfb4ea0de43ab9530e24ded58ade1711f4cd844a7b272c9e.
