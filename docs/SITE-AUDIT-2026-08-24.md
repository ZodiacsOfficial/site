# Zodiacs.org — Full-Site Audit, 2026-08-24

Thirteen-dimension audit of the `ZodiacsOfficial/site` codebase and the live
production deployment, with adversarial verification of every critical/high
finding, a completeness critic pass over the whole result, live Supabase
advisor output, and a fresh-clone run of the repo's own gates
(`npm ci` → 2,874 tests → `check:consumer-boundary` → `astro check`).

**Overall rating: 8 / 10.** The codebase itself is a 9 — top-decile
engineering discipline that most production teams never reach. The operation
around it is closer to a 6.5: the retention loop is built but dark, the legal
posture is unresolved, five high-severity dependency advisories sit in the
locked tree with no audit automation, and there is no recorded backup/DR or
key-escrow posture for the production database. The gap between "what the
code can do" and "what a visitor and the business actually get" is the whole
distance to a 9+.

Every finding below cites file:line evidence that was independently re-read
during verification. Zero of the five confirmed critical/high findings were
refuted.

## Remediation note — 2026-08-28

This report remains the point-in-time 24 August audit; later code must not make
its original observations read as current production facts. The focused
operational remediation now SHA-pins GitHub Actions, brings the locked npm tree
to a clean install with no reported vulnerabilities, adds a physical-postal
fail-closed rule to the account weekly digest, keeps standalone capture behind
its explicit release gate, and adds encrypted backup/atomic restore tooling.

Those code changes do not constitute operational acceptance. At the 28 August
recheck, the live weekly capability migration had not been applied, no live
weekly digest had ever been sent, `DIGEST_ENABLED` and the standalone release
flag were absent, the two backup secrets were absent, and the backup workflow
had never produced an artifact. The remediation makes an unconfigured backup
run fail visibly rather than pass as a no-op. The digest schedule and standalone
capture must remain off until their documented migrations and canaries pass.
The operator identity, governing-law choice, translated legal parity, backup
secret provisioning, first encrypted artifact, and throwaway-project restore
drill remain owner-controlled work and are not represented as complete here.

---

## 1. Scorecard

| Dimension | Score | One-line verdict |
|---|---:|---|
| SEO & discoverability | 9 | Sitemap/hreflang/schema verified end-to-end in CI; measured programmatic-page uniqueness (max Jaccard 0.016) |
| Internationalization | 9 | Three-tier locale model, native-quality copy, release contracts per locale; RU quality bar not backported to ES/PT/FR/IT |
| Performance | 9 → 8.5\* | Route-level JS budgets + triple-layer engine isolation; but the CI Lighthouse gate excludes the EN home/birth-chart/sign-guide baselines |
| Voice & register boundary | 8.5 | AST-enforced six-language boundary over 1,302 files; copy is genuinely excellent; docs drifted from the enforced reality |
| Accessibility | 8.5 | Focus management, live regions, keyboard paths even in the Three.js gallery; mobile menu never traps/restores focus |
| Security & privacy | 8.5 | Timing-safe secrets, exemplary RLS, anti-SSRF, envelope encryption; CSP `unsafe-inline`, email-bomb and push-flood vectors |
| Backend, accounts & sync | 8.5 | Account Sync v2 is among the best sync schemas reviewed; but it's unreleased, and the live v1 has the defects v2 condemns |
| Live production probe | 8.5 | All routes 200 in 0.2–0.9s, headers byte-identical to vercel.json, clean API failures, real 404s |
| Architecture & build | 8 | ~20 prebuild verifiers, 1,514-line dist checker, drift gates; CLAUDE.md has drifted from the real routing topology |
| Engine correctness | 8 | External JPL/Swiss vectors with recorded provenance; one real defect: polar ascendant can be the descendant |
| Design system | 8 → 7.5\* | Cosmic Void executed with test-pinned invariants; the trade panel reintroduces literal Warm Gilt gold on a live route |
| Product surface | 8 | Extraordinary breadth for a solo owner; retention channels all flag-off, zero consumer monetization |
| Checks ground truth | 8 | 2,863/2,874 tests pass on a fresh clone; one test reads `dist/` without a guard and fails pre-build |

\* Critic's calibration: the design score is generous given a live violation
of the system's one absolute prohibition, and the performance 9 rests on a
gate that skips the flagship routes.

Live-database advisors (Supabase project `mftpcdpttteuwbolobye`): the 17
"RLS enabled, no policy" tables are the intended deny-all/service-role
posture, not a hole; one actionable WARN — leaked-password protection is
disabled in Auth (moot for magic-link-only today, free to enable, and it
matters the moment any password or additional auth method ships).

---

## 2. Confirmed critical/high findings (adversarially verified, 5/5 upheld)

1. **Polar ascendant can be the descendant.** The vendored engine's
   `computeAngles` returns the raw atan2 ecliptic-horizon intersection with
   no rising/setting disambiguation. Independent re-execution of the vendored
   chunk (hour-angle check, stricter than the original audit's proxy)
   reproduced the counts exactly: the engine returns the *setting* point for
   87/480 sidereal-day samples at 70° latitude, 139/480 at 75°, 175/480 at
   80° — and whole-sign fallback charts inherit the wrong ascendant
   unflagged. Fix: east-point correction (if `norm(asc − mc) ≥ 180°`, add
   180°) or extend the polar flag to all |lat| > 66.5° charts; add a
   high-latitude test vector.

2. **CLAUDE.md's routing/boundary map has drifted from reality.**
   `/collect` and `/collect/` actually 308 to `/astrofolio/` (only
   `/collect/:path` → `/registry/:path`); `/registry/gallery` → `/astrofolio/`;
   `/registry/exchange|research` → `/terminal/…`. The in-`src/` wing surfaces
   (`/astrofolio/how-to-buy/`, `/terminal/`, `/registry/wallet-chart/`) that
   the boundary scanner exempts are absent from the doc agents treat as spec.
   In an agent-maintained repo, stale spec invites boundary mistakes. Fix:
   update CLAUDE.md and add a CI grep asserting its redirect claims against
   `vercel.json`.

3. **The trade panel reintroduces Warm Gilt.** `src/trade/styles.mjs:20-21`
   defines `--tp-gold: #E7C879` — the exact hex the sibling exchange-styles
   test bans — and uses it for the primary CTA gradient, venue chip, step
   numbers, and note tints on the live `/astrofolio/how-to-buy/` route, with
   `trade-styles.test.mjs` pinning the gold in place. Either restyle to the
   per-mount sign pastel or record an explicit owner carve-out; today the
   code contradicts both CLAUDE.md and the neighboring test.

4. **Account Sync v2's HTTP layer blocks native clients although the schema
   anticipates iOS.** Every `/api/account/:action` sync call passes
   `isExactAccountOrigin` *before* bearer auth — an Origin-less native
   URLSession/OkHttp request gets 403 pre-authentication — and the wire
   parser accepts `platform: 'web'` only, while the database contract models
   `platform: 'ios'`, per-device cursors, and iOS consent sources. See §5 for
   the recommended native-client posture.

5. **The retention loop is dark.** Weekly digest, daily email, email capture,
   web push, compatibility invites, account sync v2, Living Chart sync, and
   the Zodiac Games are all flag-off or awaiting provider configuration (all
   verified against the committed flags and owner-decision docs). The
   strongest retention stack in the category exists on paper and almost none
   of it is live — which also means no engagement data accumulates to
   validate the rest of the roadmap.

---

## 3. What the audit's blind-spot pass found (completeness critic)

- **Dependency risk (high).** `npm audit --omit=dev` on the locked tree: 6
  vulnerabilities (5 high — js-yaml, nanoid, postcss, sharp <0.35.0 with
  libvips CVEs, svgo), plus a reflected-XSS advisory covering the locked
  Astro 7.0.6. No npm-audit CI step, no Dependabot/Renovate, and Actions
  pinned to mutable major tags (`actions/checkout@v6` ×26) in a repo whose
  crons push with write tokens. All fixes except sharp are non-breaking.
  sharp processes external Wikimedia portraits through vulnerable libvips.
- **Legal-content parity (high).** The EN privacy policy was updated
  2026-08-23 with the Jupiter swap-tool and Living Chart disclosures; all
  five localized policies are dated 2 August and contain neither. Terms
  exists in English only — while CLAUDE.md claims legal pages exist in "all
  locales" — and Terms itself states the operator's legal identity and
  governing jurisdiction are unconfirmed, on a domain operating a
  swap-execution tool and token registry and collecting EU-resident emails
  in five EU languages.
- **Backup/DR (medium).** No recorded backup tier, PITR decision, restore
  runbook, or key-escrow note for `ACCOUNT_SYNC_V2_ENCRYPTION_KEYS` —
  losing the wrapping keys silently bricks every v2 envelope. For a solo
  operator this is the single most unrecoverable failure mode on the site.
- **Email compliance divergence (medium).** The daily pipeline fails closed
  without a physical postal address; the weekly digest sends without one.
- **Unexecuted enforcement (medium).** ~45 Playwright drives, the SQL
  suites, and visual regression were not run by any auditor (nor on the
  fresh clone); several dimensions cite them as evidence of rigor without
  confirming they currently pass.
- **Verified non-gaps worth recording:** GeoNames CC-BY attribution present;
  living-person noindex parity checker present; daily email is RFC 8058
  compliant; wing catalogue pages do link Terms/Privacy/Disclosure (by one
  generated link each — no gate asserts legal-link presence).

Other notable mediums by dimension: CSP `script-src 'unsafe-inline'` with no
`default-src` sitewide (the per-route wing CSPs prove the team can write
tight ones); the weekly email-capture path can be scripted to bomb a
victim's inbox (no per-recipient cooldown, no firewall rule); the push
subscription store accepts unbounded unauthenticated inserts; the
  preview-smoke workflow's `deployment_status` definition can come from an
  untrusted deployed ref before its trusted checkout, while repository secrets
  are available; live v1 `charts` rows have no
payload-size or row-count bounds; production migration state is unrecorded
past 2026-07-14 (12 of 14 migration files have no applied-state record);
`npm test` fails on a fresh clone (`disclosure.test.ts` reads `dist/`
without the repo's own `describe.skipIf` guard); EN/ES/FR kept eager
`client:load` hydration that the RU Lighthouse work already proved
improvable; ES/PT/FR/IT link silently into English pages while RU enforces
marking; Vercel is on the hobby plan with Web Analytics off (Plausible is
the live analytics per the CSP allowlist).

---

## 4. Feature recommendations, ranked by impact-per-solo-owner-hour

1. **Light the dormant retention stack** — configuration, not code:
   authenticate the Resend domain and enable the weekly digest; set
   `EMAIL_PROVIDER` so capture renders; enable push-daily behind its
   existing caps; enable invites; then watch Plausible. Nothing new to
   build, and it unblocks every downstream metric.
2. **Year-ahead personal report** — compose the existing transit-search
   worker + solar-return + progressed lens + editorial line library into one
   saveable/shareable long-form artifact, generated free and client-side.
   The Chani-style anchor product; no competitor can match the privacy
   story.
3. **Chiron** — already scoped in STRATEGY.md §11 (precomputed JPL
   daily-longitude table, AGPL-safe). Highest-volume visible chart gap
   versus Co-Star/The Pattern/Chani/TimePassages; unlocks 12 placement
   pages.
4. **Global site search** — the hand-rolled index over
   titles/descriptions/terms specced in MASTER-PLAN §6.5 (cities-shard
   pattern, zero new dependencies) plus `SearchAction` schema. The glossary
   half shipped; this is the cheap other half for a ~900-page surface.
5. **Accounts → app sync** — see §5. The work is graduation, not creation.
6. **A sustainability decision, recorded like the other owner decisions** —
   consumer monetization is currently zero while costs (Supabase, functions,
   Guide API, Resend) are real. The dignity-compatible option that touches
   no promise: a one-time paid rendered PDF/print chart report; or a quiet
   supporter page. If free-forever is the answer, cap Guide/API spend
   structurally and write it down.
7. **Prune** — retire the orphaned trade-stamping machinery; keep the swap
   venue permanently flag-off unless the wing audience demonstrably uses it
   (highest-risk, lowest-synergy surface on the domain); fold wallet-chart
   into a static explainer; delete the unreferenced root thesis drafts and
   BUILD-DIRECTIVE.md; wire or delete the eight orphan scripts.

Deliberately *not* recommended: more locales (the D9 freeze was overridden
silently — record the superseding decision or stop), more programmatic
clusters, sidereal/asteroid expansion, or any account-gating of results.

---

## 5. Accounts & the native app — the direct answer

**Should users be able to create an account and sign in (optional)? Yes —
and they already can.** Magic-link email sign-in via Supabase Auth is live
on `/profile/` with v1 chart sync (owner-only RLS, verified two-device
production acceptance on 2026-07-23). The strategy's own funnel doctrine
("account at a real sync-need moment, never a wall") is correct and already
encoded; the app is exactly that sync-need moment. Keep the account
optional forever — it is the anti-Co-Star differentiator — and make the
app the reason it exists.

The repo already anticipates the app: the Account Sync v2 technical
contract names "the Zodiacs site and future iOS app" in its product
boundary and models devices (`platform: 'ios'`), server-revision ordering,
idempotent mutations, tombstones, consent purposes, envelope-encrypted
chart payloads, and receipt-based recoverable deletion. The schema is
native-ready. What is missing is the last mile:

1. **Reconcile production schema state first.** Only 2 of 14 migrations have
   a recorded application; backfill the migration history via the Supabase
   CLI and make "Applied Migrations updated" a release-gate checklist item.
   The app will depend on exact live RPC signatures.
2. **Write the native-client posture into the v2 contract.** Keep the
   same-origin check for requests bearing an Origin header (browser CSRF);
   admit Origin-less requests on bearer token alone (CSRF does not apply to
   token-auth native clients), and accept `platform: 'ios'` in the wire
   parser. Today an honest native client gets 403 before authentication.
3. **Provision native auth.** Native email OTP (6-digit code — no redirect
   allowlist changes), Sign in with Apple (required by Apple the moment any
   third-party login is offered), Keychain session storage, and a native
   equivalent of the local-session sign-out semantics. Supabase leaked-password
   protection requires Pro or above; enable it before any password method ships
   or keep password authentication unavailable.
4. **Ship device list + revoke.** The `revoked_at` column and per-device
   checks exist; the only path that revokes today is account deletion. A
   lost-phone story is table stakes for a multi-device product — schedule
   the owner-invocable revoke RPC in the app milestone.
5. **Graduate v2; never point the app at v1.** The live v1 sync has exactly
   the defects v2's invariants condemn (whole-library upload on sign-in,
   client-clock last-write-wins, operator-readable plaintext birth data),
   and the atomic cutover blocks v2 bootstrap while v1 rows exist. Expand
   the canary, lift the one-chart limit per the staged cutover, and make the
   app v2-only from day one. Also add the missing payload/row bounds to the
   live v1 tables in the interim.
6. **Decide the Living Chart question before the app's sync layer is
   designed.** Three parallel sync/consent subsystems exist; either port
   Living Chart under the v2 device/cursor umbrella (it already has
   revisions and receipts — the distance is small) or explicitly scope the
   app's v1 release to charts only and document moments as a later
   milestone.
7. **Operational prerequisites.** Recorded backup/PITR posture and a restore
   runbook; escrow for the v2 encryption keyring; move Vercel off the hobby
   plan before app traffic arrives.

Done in that order, the app gets a sync backbone most consumer apps never
have — encrypted at the envelope level, consent-scoped, revision-ordered,
recoverable through deletion — without compromising the no-wall principle
that differentiates the site.

---

## 6. Fix-first list (suggested 30-day order)

1. `npm audit fix` (all but sharp are non-breaking), bump sharp, add an
   npm-audit CI step + Dependabot, pin Actions to SHAs.
2. Sync the five localized privacy policies to the 2026-08-23 EN content;
   ship localized Terms or an explicit EN-only pointer; resolve the operator
   identity/jurisdiction disclosure.
3. Engine: polar ascendant east-point correction + high-latitude vector.
4. CLAUDE.md truth pass: routing topology, wing-surface inventory,
   sanctioned CollectBand footprint, generated-file inventory additions
   (BUILD-REPORT.md, i18n-additions.md, registry hub), boundary carve-out
   list = `WING_ONLY_SOURCE`.
5. Rate-limit the weekly subscribe path (per-recipient cooldown + firewall
   rule) and the push subscribe endpoint (push-service hostname allowlist);
   fix the preview-smoke workflow to run scripts from a trusted ref.
6. CSP: hash/nonce the inline scripts, add `default-src 'self'` +
   `connect-src`.
7. Trade-panel gold: restyle to sign pastels or record the carve-out.
8. Guard `disclosure.test.ts` with `describe.skipIf` (fresh-clone green);
   add postal address to the weekly digest footer.
9. Supabase: enable leaked-password protection; reconcile migration
   history; record backup/PITR + key escrow.
10. Backport RU hydration tuning to EN/ES/FR; add the EN baseline trio to
    the Lighthouse gate (or a weekly reporting run).

---

*Method note: thirteen parallel dimension auditors over the repo, the live
site (19 HTTP probes), the live Supabase advisors, and a fresh-clone
execution of the repo's own gates; every critical/high finding re-verified
by an independent adversarial pass instructed to refute it (5/5 upheld,
0 refuted); a final completeness critic audited the audit. Scores are
0–10 where 5 is typical production quality.*
