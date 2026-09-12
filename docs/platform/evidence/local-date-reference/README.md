# Unknown-time local-date reference safeguard

Decision C-014 requires a chosen unknown-time instant to belong to its requested
local Gregorian date before numerical, receipt or endpoint work. False membership
refuses that reference; it is not proof that the date is empty. The existing
known-time gap policy, no-city UTC Moon and wider certainty limits remain separate.

- `preparation/` compares caller behavior and implementation options with the
  existing resolver and era-aware formatter on Node 22/24.
- `real-date-controls/` retains 17 real cases on Node and native Chrome, including
  four skipped dates and unchanged positive-reference endpoint defects.
- `synthetic-refusal/` proves a nonempty nine-hour model date can nevertheless
  receive an out-of-date reference from the existing resolver. Conservative
  refusal is a deliberate limitation of this bounded safeguard.
- `author-freeze1/` contains the exact 12-file proposed implementation, 234 scoped
  tests on each Node 22/24, 35 actual native caller groups and 20 retained Moon
  ownership groups. Original setup, selector and type failures are retained.

All copied records and 135 compressed author members were byte-verified by root.
The exact author freeze is now integrated on the isolated root date branch. `independent-review/REVIEW.md` accepts
26 caller controls and 92 helper cases on each Node 22/24 and native Chrome,
with original harness failures and nine exact output comparisons retained.
Root local acceptance passes; `root-integration/` retains the final source map,
5,024 tests, build/check, 35 native/20 Moon/17 chart cases, 24 actual localized page
cases and 18 byte-identical captures. Original count and harness failures remain.
`catalog-count-review/` separately reviews the two count tests and eight-path
allowance. C-012 is delivered in the preceding chart/context draft;
`combined-page/` and `combined-page-audit/` verify the actual signed-in composition
with explicit startup write-attempt accounting. No publication, production,
date-completeness or astronomical certification is implied.

The independent review also corrects one earlier preparation paragraph: Node 22
uses ICU 78.2/tzdb 2026a, while Node 24 uses ICU 78.3/tzdb 2026b. The original raw
records already had those correct identities; the sealed preparation is retained.
