# Guide cache refresh — 21 September 2026

Live verification after PR #547 found a returning-browser defect. The deployed
Guide shell contained the approved anchor fix, but its stable URL still returned
`Cache-Control: public, max-age=31536000, immutable`. The existing browser
therefore continued using the previous shell: an inline Ask Guide link navigated
to `/ask/` even after the new page and navigation had loaded.

The repair advances the shell, drawer and both stylesheet references to the
`ask-guide-4` query version, and explicitly gives these four stable files
`public, max-age=0, must-revalidate`. The version change reaches already-cached
clients; revalidation makes future deployments available at their stable URLs.
Hashed child chunks and the unchanged portrait retain their existing policy.

Shared static HTML was regenerated through its existing builders. All 21 changed
public HTML files were checked byte-for-byte against the prior source with only
the `ask-guide-3` → `ask-guide-4` replacement. No page content or behavior beyond
the shared Guide asset references was changed.

The Guide unit suite passes, including a new contract that checks the generated
loader URL and revalidation headers for all four stable assets. A production
build and bundle budgets pass. Fresh browser receipts and complete Site Check
remain required before release. Final live verification must use the same
returning browser that reproduced the defect, without clearing its cache.
