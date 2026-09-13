# L2b runtime and local-date coverage contract

Base: site main `87f18e0a101b96abf847be58e8a0c31a691992f8` (released L2a).
No dependency, SDK package, calculation, receipt schema, UI/catalog or design change.

## Supported provider

Production callers use the host Temporal Instant/ZonedDateTime transition API,
detected lazily. The supported contract is a conforming native implementation
which returns the **first** offset change strictly after the input, or null only
when there is no further representable change. Every change must be enumerated.
No offset sampling, midpoint search, endpoint agreement, or successful fixture
set substitutes for that contract. The application supplies no polyfill, custom
runtime replacement, separate timezone database, paid service or network fallback.

The optional explicit provider argument is a trusted internal integration/test
boundary, never accepted from browser forms, saved records, imports or receipts.
Its marker is an obligation, not proof. A hostile provider can omit two cancelling
transitions and evade finite checks; the negative control is retained. Likewise,
feature detection cannot attest a host binary or a user-installed runtime patch.
Replacing native Temporal with a sampled polyfill is outside this contract.

The [Temporal next-transition specification](https://tc39.es/proposal-temporal/#sec-temporal-getnamedtimezonenexttransition)
defines the enumeration requirement. Current upstream
[V8 provider selection](https://github.com/v8/v8/blob/a52cba626da613f2a9f059a292a881300c0db207/src/objects/js-temporal-objects.cc#L100)
and [direct transition enumeration](https://github.com/boa-dev/temporal/blob/eadf8039d2577e4375493a0eb3f46a66f25616ec/provider/src/zoneinfo64.rs#L140)
support the architecture; they do not attest our installed binary. By contrast,
the inspected [JavaScript polyfill search](https://github.com/js-temporal/temporal-polyfill/blob/c8f344c63bffbecef371cabf20ae2ef60294ff25/lib/ecmascript.ts#L2546)
uses sampled windows and search limits, so adding it would not establish this contract.
Sources inspected 2026-09-13 by the separate provider review.

## Range and meaning of completeness

- Strict proleptic Gregorian `YYYY-MM-DD`, years 0000–9999, and an explicit host
  Intl-supported timezone. The internal exclusive boundary can enter year 10000.
- Integer epoch milliseconds, integer offsets strictly within ±24 hours, exact
  transition instants with the new offset. The retained ±24-hour bound makes a
  72-hour search window contain every possible member of the selected date.
- Enumerate every transition in that window; intersect every constant-offset
  segment with the civil-date interval. Adjacent members coalesce; gaps never do.
- At most 32 changes per window. Invalid, missing, failing, inconsistent,
  submillisecond or exhausted providers produce unresolved with no partial evidence.
- Observed offsets must agree with the existing Intl offset reader. The caller's
  point-membership witness must also agree with complete interval membership.
  These checks detect violations; their finite nature is not a completeness proof.

Completeness is relative to the host's timezone model. It does not certify all
historical facts or future political decisions. [IANA's accuracy limits](https://data.iana.org/time-zones/theory.html#accuracy)
remain applicable, particularly before 1970 and for future rules. There is no
defensible universal historical cutoff that would turn modeled data into certainty.

## Runtime behavior

Actual Chrome 152.0.7977.84 exposes the required native API and passes the retained
counterexamples plus the activated reference/evidence checks. The hosted pinned
Chromium must pass the native driver; absence fails that job, never becomes a
skipped success. Node 22.23.2 (ICU 78.2, tz 2026a) has no Temporal: its supported
outcome is unresolved date coverage. Unit tests verify this fallback explicitly.
Other browsers without the required interface keep the existing reference behavior
and uncertainty. Native availability alone does not warrant a new astronomical
accuracy or universal browser-support claim.

## Date and caller policies

| Case | Coverage and reference policy |
| --- | --- |
| Ordinary, shortened or lengthened date | Preserve the exact half-open membership interval, without assuming 24 hours. Admit the existing reference only if it belongs. |
| Skipped date with complete evidence | Empty union; refuse before natal/receipt/lookup calculation. Never shift to an adjacent date. |
| Repeated date | Keep all membership, including a connected 48-hour date. Never select just the first repetition. The existing resolver's reference is unchanged. |
| Disconnected date | Keep every segment. A reference in a later segment is valid; a reference in the intervening hull gap is refused. |
| Complete nonempty date whose legacy reference is outside | Refuse conservatively. Do not choose another instant or relabel it as local noon. |
| Missing/failed/unresolved coverage | Use the existing independent Intl point witness. A valid point may still produce the explicitly qualified reference result; false/unresolved point membership refuses it. No empty-date conclusion follows. |
| Provider violation or interval/point contradiction | Refuse as unresolved/provider-violation, discard complete evidence. No fallback admission. |

Chart and city-based Moon lookups call the assessment only for unknown time.
Known-time behavior, including existing gap/fold policy, is unchanged. No-city Moon
lookups retain their explicit UTC reference/supplied-time path. Every numerical
calculation receives the same reference Date, flags and coordinates as before.
No new ephemeris samples or alternate reference calculations are performed.

The assessment returns coverage plus an immutable enumeration trace, temporarily
in memory. Callers use only its reference verdict; no coverage metadata enters a
calculation/contact receipt, stored chart, event, account record or network request.

**Complete date coverage is not complete Sun/Moon sign evidence.** Unknown-time
Moon candidates remain unresolved; Sun remains a reference result; automatic
personalization and Registry context remain withheld. Existing localized uncertainty
and reference-refusal wording stays unchanged. Both skipped and unresolved-reference
refusals use the existing conservative message, without claiming they are equivalent.

SDK merge/npm publication remains held. L3–L6, Astrofolio, Zodia, merge and
production deployment are outside this draft's authorization.
