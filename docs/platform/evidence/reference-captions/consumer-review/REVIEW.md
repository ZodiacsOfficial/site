# C-016 Freeze 1 — independent consumer, output, copy and image review

Accepted within this bounded consumer scope. No product blocker found. This is an independently authored review of isolated source copies; it does not accept the separate Moon calculation/ownership work, generated manifest, CI/scope metadata, normal production build, deployment or publication.

Source base is `9d180c9f1a2f66893ccd6d73fcda106cb3894674`. Author identity SHA256 is `c055e55985284904cb82e39fa1eca53a035aa337a3a49a752240fcd5c7d21644`; patch SHA256 is `0371de7d739a8526f342e49c3fdb623fa646d8d405a91db4f7623cba5b835b36`. A fresh immutable Git archive was copied into separate baseline/candidate directories, then only the patch was applied to candidate. All 33 frozen files (23 product/copy, 10 tests/drivers) match; 1,866 other captured files are unchanged. All 33 hashes were checked again after execution. Root and author source were never edited.

## Actual results

| Independent control | Result |
| --- | --- |
| Source/copy reconstruction | 26 checks pass; 18 copy files inspected, including all 63 scoped property/FAQ values and the English paragraph |
| Real catalog module evaluation | All six catalogs contain 420 keys; all three retired keys absent and replacement keys present |
| Consumer probes | Four controls per source: 06:17 and 18:43 UTC on 2000-01-15, each with and without supplied time; actual engine, public codec, preview model, local HTML handler, sheet helpers, Inspector and positions receiver SSR |
| Privacy/error controls | Five per source: POST, extra birth field, duplicate token, malformed token, missing token; full status, headers and response body remain identical |
| Output reconciliation | 23 checks pass; numerical JSON, public tokens and response headers unchanged, only permitted caption text differs |
| Native Canvas/download | Eight PNGs produced through actual baseline/candidate prepare and download functions; numerical data and dimensions match |
| Visual inspection | Candidate reference Big Three, hidden sheet and opt-in sheet inspected; captions fit without clipping/overlap, hidden birth details stay hidden |
| Known-time image control | Baseline/candidate opt-in sheet PNGs are byte-identical: `1cfea198c81a7261b0038f738148084315c3399d15c8299d61fb54b7a30a0704` |

The non-noon controls reproduce the original false clock claim using valid public positions tokens. Their decoded data contains bodies, angles, house system and engine version, without a date/time/zone. The revised server model says “Reference positions / No houses / Tropical”; the HTML description refers to reference Sun and Moon positions. No clock is inferred. The actual positions receiver has its own positions-only presentation; it does **not** render Inspector. The separate Inspector probe establishes its clockless scene contract, not a claim about the public `#p` route.

Both supplied-time cases have completely identical recorded outputs, including HTML and consumer SSR. For each unknown-time case, full output differences reduce exactly to the allowed caption replacements; placements, settings other than the reference prefix, numeric JSON, token, response status/headers and hidden-details choice remain unchanged. Five malformed/request-domain controls preserve no-store/no-referrer behavior and sanitized error text. These local handler calls issue no network request.

## Source and copy boundaries

`src/server/chart-preview-model.ts:55` and `src/server/chart-preview.ts:127` reconstruct byte-for-byte to baseline after reversing just their two permitted string changes. `src/lib/share-card.ts:1025,1083` reconstructs after reversing two strings and one option comment. This proves the route, projection, validation, headers, image algorithm and privacy logic in these files are otherwise unchanged; it is not a general security audit.

All six UI catalog files reconstruct after masking precisely the six allowed properties: three one-for-one key retirements and `chartTimeHelp`, `noTimeNotice`, `placeHelpMoon`. Other catalog contents and source bytes remain identical. Share-card, Lens and Tour files reconstruct after masking their six respective note values. The three PT/FR/IT canonical addition files reconstruct after masking only `shareCard.referenceTimeNote`; those values match the actual locale properties in share-card copy. The generator and generated manifest remain integrator-owned.

Each Moon-phase page reconstructs after masking only the second FAQ answer; English additionally reverses the approved explanatory paragraph. The existing FAQ mapping supplies the same answer to visible and structured content. Reading the frozen English, Spanish, French, Italian, Portuguese and Russian values found consistent reference-moment wording, possible within-date sign/phase variation and omission of rising/angles/houses where applicable. This is reviewer semantic inspection, not human native-speaker certification. No fixed-noon or date-wide exactness claim was added. Tour text also avoids treating every reference planet sign as its verified birth sign. Retired UI keys have zero non-test runtime source references.

The relevant existing consumer is `src/islands/explorer/Inspector.tsx:195,431`; it receives only scene data and now uses generic reference wording through the existing catalog key. Chart result notice/phase label sites are `src/islands/ChartCalculator.tsx:1917,2057`. The parent reviewer owns their full caller/ownership and phase calculation acceptance. Existing scoped test changes to share-card and OG assertions are aligned with the changed copy; existing known/hidden/invalid-domain checks remain present. The author driver was not repeated here.

## Images and privacy qualifications

The native fixture directly computes `2000-01-15T06:17Z`, latitude/longitude 0, using the real engine, and supplies the current unknown-time confidence state (`moonSignCandidates=[]`) to the actual renderer. It uses a standard actual EN catalog bootstrap per source, unchanged local fonts/brand/zodiac assets and the actual download API. It is a consumer fixture, not the full ChartCalculator page or an OG image rasterization test. Chrome 152 native Canvas and local GET-only requests are used; all observed fixture requests were permitted same-origin GETs. No auth, external service or backend is used.

Reference Big Three is 1080×1350; sheets are 1800×2400. Hidden sheet displays “Birth details hidden”; opt-in sheet displays the explicitly supplied synthetic fixture city and `Reference UTC · 2000-01-15 06:17 UTC`. It does not assert a noon clock. Candidate downloaded image hashes and exact fonts/assets/JS inputs are in `native-images/result.json` and its input manifest. Source and output identities, rather than an older tracked screenshot, establish this comparison.

## Retained failures and limits

The initial native image fixture lacked the actual client EN catalog bootstrap and failed during baseline preparation. That raw failure, initial driver, bundle and inputs are retained in `native-images-initial` and `image-drive.initial.*`; the only correction initializes the standard catalog from each source. No product was changed. The first source-audit script incorrectly assumed the six share-copy properties followed alphabetic locale order; its canonical comparison failed on French versus Portuguese. The correction derives the actual AST ancestor locale and passes; initial source/log are retained. These were review-fixture defects, not product failures.

No date-wide Moon completeness proof, new numerical accuracy claim, full/lite phase-category correction, generated i18n manifest acceptance, full page/browser ownership acceptance or deployment claim is made. The parent separately reviews actual Moon/Chart components and primary numeric/receipt preservation. The known `/moon-sign/` FAQ claim about identifying boundary days and downstream reference-Sun wording remain separate follow-ups outside this 23-source C-016 mandate. No scope expansion or source correction was attempted.

Evidence is copy-ready and inert where executable source is suffixed `.log`. `manifest.json` records exact delivery contents; the working scratch preserves executable drivers and isolated inputs for a separately authorized rerun. No whole generated site, node_modules archive or private credential is included.
