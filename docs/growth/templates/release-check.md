---
record_id: GROWTH-YYYY-MM-DD-release-short-name
record_type: release-check
status: proposed
owner: unassigned
created: YYYY-MM-DD
updated: YYYY-MM-DD
decision_due: YYYY-MM-DD
source_window: not-applicable
source_locations: []
related_urls: []
related_records: []
evidence_quality: high
privacy_class: aggregate-only
decision: pending
next_action: complete checks
---

# Release check: Change name

## Release identity

- Pull request/commit:
- Immutable preview:
- Changed URLs:
- Linked opportunity/brief/experiment:
- Human release owner:
- Rollback method and trigger:

## Editorial and product

- [ ] The page completes the approved visitor job.
- [ ] Claims, dates, calculations, and sources were checked by a human.
- [ ] Voice and canonical labels match strategy.
- [ ] Basic results remain free and ungated.
- [ ] Consumer and Collect wing boundaries are intact.
- [ ] A net-new page has a working tool, computed data, or unique useful visual.

## Search and machine readability

- [ ] Status, canonical, robots, sitemap, title, description, and H1 are intentional.
- [ ] Internal links resolve and do not create an orphan page.
- [ ] Structured data is valid, eligible, and matches visible content.
- [ ] Core answers, entities, dates, and units are unambiguous when rendered.
- [ ] Methodology/citations are reachable where needed.
- [ ] Visible copy, JSON-LD, metadata, `llms.txt` variants, privacy/methodology
      pages, dates/timezones, and canonical entity identifiers agree.
- [ ] Required standards and optional/non-standard AI discovery experiments are
      labeled separately.
- [ ] OG/Twitter images are public and absolute; MIME type, dimensions,
      crop-safe legibility, alt text, and rendered-card preview were verified.
- [ ] Page-velocity impact keeps the rolling seven-day total at or below 10.

## Privacy and measurement

- [ ] No visitor identity, account, raw-session, birth, chart, saved-profile,
      or raw IP field is added to an analytics payload or retained by Growth OS.
- [ ] No persistent or cross-day IP-derived identifier exists. The approved
      Plausible exception is limited to disclosed site/device/day deduplication;
      raw IP/User-Agent and the daily identifier are never exposed to Growth OS.
- [ ] Analytics referrers are `null`; canonical analytics URLs never contain
      queries or fragments.
- [ ] Birth calculation remains client-side.
- [ ] Event payloads contain only documented aggregate-safe properties.
- [ ] Baseline, primary measure, guardrails, owner, and review date exist.

## Experience and accessibility

- [ ] Keyboard, focus, contrast, reduced motion, and meaningful alt text pass review.
- [ ] Mobile and desktop previews were reviewed.
- [ ] Empty, loading, error, and result states remain usable where relevant.

## Technical verification

Record exact commands, versions, and outcomes. Repository defaults are in
[`../../../CLAUDE.md`](../../../CLAUDE.md).

| Check | Result | Evidence/location |
| --- | --- | --- |
| Build |  |  |
| Static/type check |  |  |
| Tests |  |  |
| Link/artifact integrity |  |  |
| Targeted visual/accessibility check |  |  |
| Post-release live bytes, if released |  |  |

## Post-release proof, only after a separately approved release

- Immutable deployment identifier:
- Intended host and changed routes:
- Live canonical, robots, sitemap, redirects, and representative bytes
  verified:
- Verification owner/date:

## Decision

- Gate: pass / pass-with-follow-up / fail
- Blockers:
- Follow-ups and owners:
- Human merge/deploy decision and date:
- Released reference, if later approved:
- Measurement review date:
