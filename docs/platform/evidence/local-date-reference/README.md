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
The author freeze is in isolated scratch; independent review and root integration
are pending. No publication, production, date-completeness or astronomical
certification is implied. The separately discovered downstream daily-panel
invalidation defect is being corrected under C-012; this freeze does not claim
that the panel has been fixed.
