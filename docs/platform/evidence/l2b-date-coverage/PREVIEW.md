# Exact-source preview verification

2026-09-13. Draft [#481](https://github.com/ZodiacsOfficial/site/pull/481), source
`370fddf7224053ca42d0942945d850ab5b8d608c`, tree
`8dc403a558a83fae15950fc54f8a5978c6da7b13`.
Vercel `dpl_F1r75PYxU71coJhD133ge28uETuC` is READY and its Git metadata identifies
that exact source. It is a preview, with no production target. See
[deployment response](preview-deployment.json).

The existing authorized Chrome profile inspected the protected preview through
native UI. Authentication and preview protection were unchanged. Inputs below
are synthetic fixtures, not the owner's birth information. Nothing was saved,
shared, emailed or synced.

## Observed flows

| Preview flow | Observed result |
| --- | --- |
| [Birth chart](https://zodiacs-oz3qdp29g-zodiacsofficial.vercel.app/birth-chart/), London 2024-03-20 00:00 known time | Sun Pisces 29°52′, Moon Leo 2°15′, rising Sagittarius 1°52′; known-time reading and Registry context retained. |
| Same chart changed to unknown time | Sun reference Aries 0°22′; Moon and rising need a birth time. Explicit reference-moment notice says Sun has not been verified across the whole birth date and Moon's possible signs are unverified. Previous known-time/Registry context is replaced. |
| Chart, Apia 2011-12-30, unknown time | No chart; “We couldn’t establish a calculation time within this local date. Check the date and place.” Previous result clears. |
| Chart, Apia 2011-12-31, unknown time | Recovers with Capricorn 8°51′ and the same Sun/Moon uncertainty notice. |
| Chart, Apia 1892-07-04, repeated date | Cancer 12°23′ reference; Moon/rising unresolved and whole-date Sun/Moon uncertainty retained. No new instant selected or coverage-based sign certification. |
| [Moon phase](https://zodiacs-oz3qdp29g-zodiacsofficial.vercel.app/moon-phase/), Apia 2011-12-30, time omitted | Same conservative local-date refusal; no date-result displayed. |
| Moon, Apia 2011-12-31, time omitted | Recovers with First Quarter, 37% illuminated, Moon in Pisces. Visible notice: “Reference result for this local date. The Moon’s sign and phase may differ at other times that day. Add a birth time to calculate a specific moment.” |
| Moon, St. John's (Newfoundland) 2009-10-31, disconnected date, time omitted | Waxing Gibbous, 94% illuminated, Moon in Aries; the same explicit reference-only notice remains. |

Native screenshots inspected the chart and Moon result layouts and visible uncertainty
notices; no overlap or missing notice observed. Screenshot observations remain in the
task transcript; this record does not claim a saved screenshot artifact.

UI observation does not prove provider completeness or receipt-byte equality.
Those properties are established separately, conditional on the documented provider
contract, by the exact-source native transition/caller tests and unchanged-source
comparisons. Disconnected interval membership and exact adjacent boundaries use
those focused fixtures, not an inference from these visual checks. No production deployment is
created or verified as L2b by this preview check.
