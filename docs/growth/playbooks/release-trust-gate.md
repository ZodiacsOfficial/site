# Release & Trust Gate

## Purpose

Provide one release gate for editorial quality, technical integrity, search
readiness, machine readability, privacy, accessibility, and measurement. A
passing record means “ready for a human release decision,” not “publish now.”

## Inputs

- Pull request or immutable preview and linked opportunity/brief/experiment.
- Changed URL list and indexability/canonical intent.
- Before/after screenshots at relevant breakpoints.
- Test, build, crawl, accessibility, and structured-data results.
- Measurement, rollback, and page-velocity plans.

## Procedure

1. Copy [`../templates/release-check.md`](../templates/release-check.md) into a
   durable record.
2. Review the actual diff and preview, not only a generated summary.
3. Verify all claims, dates, calculations, sources, and schema against the
   rendered page.
4. Run repository-required checks and targeted tests proportional to risk.
5. Check canonical, robots, sitemap, status codes, metadata, internal links,
   structured data, `llms.txt` relevance, and rendered answer clarity.
6. Cross-check visible copy, JSON-LD, metadata, `llms.txt` variants, sitemaps,
   and canonical privacy/methodology pages. Contradictions in cadence, privacy,
   accuracy, dates/timezones, or entity identity are blockers. Label optional
   or non-standard AI discovery hints separately from required standards.
7. Review keyboard use, focus, contrast, reduced motion, responsive behavior,
   and meaningful alt text.
8. Inspect analytics payloads, referrers, service-side identity derivation, and
   network behavior. Confirm no visitor identity, IP-derived identifier, birth
   data, chart data, raw referrer, or sensitive URL parameter leaves the device.
9. Confirm the consumer/Collect boundary and page-velocity cap.
10. Assign pass, pass-with-follow-up, or fail. List blockers separately.
11. A human owner decides whether to merge and deploy.
12. After a separately approved release, record the immutable deployment
    marker and verify live bytes for the intended host, canonical, robots,
    sitemap, redirects, and representative changed routes. Source or preview
    success alone is not proof that production changed.

## Trust dimensions

### Editorial

- Answers the intended job without filler or keyword substitution.
- Plain, calm voice and canonical labels.
- Astrology is framed honestly; no certainty, health, or scientific claims.
- Computed facts expose useful date/time/degree context.

### Technical search

- One intentional canonical URL and indexability state.
- Valid status, title, description, heading hierarchy, and internal links.
- Sitemap and robots behavior match the decision.
- Structured data describes visible content and uses an eligible type.
- New indexable pages add distinct utility and stay under the weekly cap.

### Machine-readable surface

- The core answer is present in rendered HTML or an accessible result state.
- Entity names, dates, units, and definitions are unambiguous.
- Citations and methodology are reachable.
- `llms.txt` and other discovery files are updated only when scope truly
  changes; never add claims purely for an AI crawler.
- Required web standards and optional/non-standard answer-engine experiments
  are labeled separately.
- Machine-readable artifacts agree with visible claims and canonical policies.

### Privacy and measurement

- Birth calculation stays client-side.
- No identity-level analytics, IP-derived identifiers, raw sessions,
  fingerprinting, raw referrers, or birth fields.
- Events contain only the minimum aggregate-safe properties.
- Baseline, success measure, owner, review date, and rollback trigger exist.

## Outputs

- Signed release-check record linked from the pull request.
- Blocking findings and owners.
- Human release decision and, after release, immutable deployment reference.
- Provider-neutral post-release proof that the intended production bytes are
  live.
- Follow-up measurement date.

## Stop conditions

Fail the gate if any of these are true:

- The change exposes or transmits identity or birth data.
- A generated page lacks a tool, computed data, or unique useful visual.
- Claims cannot be supported.
- The page crosses the consumer/Collect boundary.
- The rolling seven-day total would exceed 10 new indexable pages.
- Required tests fail or rollback is undefined.
- The workflow attempts to merge, deploy, publish, or index without a human.
