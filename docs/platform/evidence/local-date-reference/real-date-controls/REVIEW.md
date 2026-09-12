# Bounded unknown-time date admission preparation

Seventeen fixed real-zone/date inputs were checked using the actual current resolver and inactive interval primitive from site HEAD `abcf1a44e52040db79a369b49bc9b55d78099b22`. No product/source/shared file was changed. This is preparation, not activation or a numerical-accuracy claim.

**No nonempty civil date whose resolved noon landed on another date was found in this finite set.** Native Chrome 152 classified the four noon mismatches as empty: Apia `2011-12-30`, Kwajalein `1993-08-21`, Kiritimati `1994-12-31`, Guam `1844-12-31`. The resolver shifts each noon into the following date. This result is not an exhaustive timezone theorem.

A same-requested-date noon nevertheless admits concrete incomplete endpoint coverage:

| Requested date and zone | Noon passes | Current endpoint-helper discrepancy |
| --- | --- | --- |
| `1919-03-31 America/Toronto` | `16:00Z` → local noon | Omits initial 30 minutes; `04:30Z` is local `00:30` and belongs to the date. |
| `2009-11-01 America/St_Johns` | `15:30Z` → local noon | Includes 59 minutes of October 31 between the two member intervals. |
| `2009-10-31 America/St_Johns` | `14:30Z` → local noon | Omits the returning 59-minute tail. |
| `1867-10-18 America/Juneau` | `1867-10-17T20:57:41Z` → local noon | Omits the returning 8h26m28s interval starting `1867-10-19T00:31:13Z` (local October 18 `15:33:32`). |
| `1867-10-19 America/Juneau` | `1867-10-18T20:57:41Z` → local noon | Includes that 8h26m28s of October 18 between its two member intervals. |

Repeated Apia `1892-07-04` and Kwajalein `1969-09-30` also pass noon on 48-hour and 47-hour dates. The current **next-midnight** endpoint helper covers those two whole spans correctly; no endpoint defect is claimed for them. Clock probes at `00:00` and `23:59` are recorded separately and must not be confused with that helper. No whole-date Moon/Sun candidate completeness follows from these observations.

At most two policy implications for the root integrator:

1. A bounded unknown-time representative check can require that the resolved local-noon instant belongs to the requested date. That establishes membership of the selected representative only. A failure can reject that representative; it should not by itself be described as proof that the entire civil date is empty. Known-time gap policy and public positions remain separate.
2. Whole-date existence/coverage claims require the complete-provider interval contract and preserve `existing`, `empty` and `unresolved` distinctly. Node 22.23.2 (ICU 78.2, tzdb 2026a) has no native provider here, so all seventeen default interval calls are **unresolved**, including the four dates that native Chrome can classify empty. A missing or failed provider is not an empty date. The noon check alone does not repair the five endpoint counterexamples above.

Method: five current source files were copied and checked against the observed committed HEAD. The actual endpoint helper and its date-increment function were extracted unchanged via TypeScript AST. No provider polyfill or new package was installed. Node and an owned blank Chrome context execute the same listed inputs; all browser requests are blocked and no storage is accessed. Native interval boundaries and representatives receive finite independent Intl membership checks. The native provider's completeness remains conditional on its documented host contract, not proven by sampling. The original source sampler/endpoint limitations remain unchanged. Prior delivered interval fixtures are retained for provenance; current observations were refreshed rather than assumed.

Raw records: `fixtures.json`, `node-result.json`, `native-result.json`, `build-identity.json`, `source-identity.json`, and the exact driver. No native errors or page requests occurred. Root/parent own caller order, product wording, activation and release decisions. No endpoint, SDK/API, locale or dependency change is proposed here as already implemented.
