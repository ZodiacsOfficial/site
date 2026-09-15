# L2b site-only release — PR #481

The owner approved exact candidate `370fddf7224053ca42d0942945d850ab5b8d608c`.
Before release, GitHub confirmed unchanged main
`87f18e0a101b96abf847be58e8a0c31a691992f8`, clean mergeability, all 14 Site Check
jobs passed and a READY exact-source preview. Current daily edition 2026-09-13 UTC
and monthly 2026-09 with all 12 signs passed the unchanged freshness gates.
Main protection still requires zero approving reviews and conversation resolution;
no branch protection or preview protection was changed.

Marked ready, then merged with `--match-head-commit` guarding the approved SHA.
Actual merge `dfeae5f9178a6d887209710083c2a74fae258236`, 2026-09-13 18:04:57 UTC;
tree `8dc403a558a83fae15950fc54f8a5978c6da7b13` equals the approved tree exactly.
No reconciliation or additional source change was required.

Production deployment `dpl_QmGqNQr8KuWEQYkaRfe34c6MMg6x` is READY, source the
actual merge above, immutable URL https://zodiacs-dboy261we-zodiacsofficial.vercel.app/ .
Independent Vercel hostname lookups resolve both zodiacs.org and www.zodiacs.org
to this exact deployment/source: [current alias identities](production-aliases.json).
HTTP checks confirm www redirects to the working apex chart (200)
and the Moon route returns 200. [Metadata](production.json), [HTTP checks](http-smoke.log).

Pre-release READY production `dpl_44tNRbymWxhKRRhUwg92gv945paY`, source `87f18e0a`,
is the recorded rollback baseline. [Baseline captured before merge](baseline.json).
The owner authorized rollback to it for a critical regression introduced by this
release. No such regression was found and no rollback was performed. The baseline
remains READY after release: [rollback availability](rollback-ready.json).

## Live native-browser verification

Used a new Chrome Incognito window and synthetic fixtures only. No account,
email, wallet or synchronization action was taken. Closed that isolated window
after verification; existing regular-profile tabs and saved data were preserved.

- London 2024-03-20 00:00 known time: Sun Pisces 29°52′, Moon Leo 2°15′,
  rising Sagittarius 1°52′, matching retained preview evidence.
- Same chart changed to unknown time: reference Sun Aries 0°22′, Moon/rising
  unresolved, inferred Registry context removed, whole-date Sun/Moon uncertainty
  notice retained. Guest save confirms “Saved · on this device”.
- Fresh chart, Apia 2011-12-30 unknown time: no result; conservative local-date
  refusal. Changing to 2011-12-31 recovers Capricorn 8°51′ reference with the same
  uncertainty notice. Browser automation had stale accessibility/focus observations
  while editing the earlier form; the fresh-form refusal/recovery is the completed
  live witness. No broader claim about that failed automation sequence is made.
- Moon, Apia 2011-12-30 with time omitted: local-date refusal. Adjacent 2011-12-31
  recovers First Quarter, 37% illumination, Moon in Pisces, explicitly a reference
  result whose sign and phase may differ during the date.
- Moon, repeated Apia 1892-07-04: First Quarter, 68% illumination, Moon in Scorpio;
  reference-only notice remains. No whole-date certification is inferred.
- Moon, disconnected Newfoundland 2009-10-31: Waxing Gibbous, 94% illumination,
  Moon in Aries, matching the exact-source preview, with the same reference notice.
  Screenshot inspection confirms the visible notice fits the existing layout.
- Today: September 13 edition, “Reference · 2024-03-20”, explicit unknown-time
  reference-Sun notice. Profile: same neutral name, reference notices in both
  readings, device-local save and optional sync presented separately.

Visual display checks are not receipt-byte or transition-completeness proofs.
Those reuse the valid exact-tree native/provider/caller and baseline comparison
evidence in [the L2b verification record](../l2b-date-coverage/README.md), alongside
the required automatic post-merge gates. No new normalization, reference instant,
ephemeris call, calculation/receipt schema or byte transformation was introduced
by this zero-tree-delta merge. Runtime fallback and astronomical uncertainty remain
conditional exactly as documented in [the contract](../l2b-date-coverage/CONTRACT.md).

[Live publication verification](live-editions.log) passes exact committed daily,
horoscope inputs and public sky API agreement. A bounded runtime-error query from
18:09 UTC found no errors; [query record](runtime-errors.json). This is an observed
time window, not a guarantee about future traffic. Browser navigation briefly used
a mistyped automation URL; it was corrected and is not a zodiacs.org outage.

## Automatic post-merge checks

[Site Check 34773522987](https://github.com/ZodiacsOfficial/site/actions/runs/34773522987)
completed successfully on exact production source `dfeae5f9178a6d887209710083c2a74fae258236`:
**14/14 jobs passed**, including all 5,211 tests in 424 files, all four transit-generation
tests (102,204 ms), required native/date/caller browser checks, visual regression,
Lighthouse and widget gates. No manual rerun or budget waiver was used.
[Complete run metadata](post-merge-ci.json), [full compressed log](post-merge-ci.log.gz).

[Final main](main-final.json) and [final production identity](production-final.json)
retain the approved tree. Production and automatic CI closeout are complete; no
remaining release blocker was found. Final records are committed locally and
mirrored to the shared checkpoint without introducing another production source change.

SDK merge/npm publication remains held. L3–L6, Astrofolio and Zodia remain excluded.
