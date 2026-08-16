# Protected People link decision — Bill Gates and Leonardo DiCaprio

Status: owner-authorized, protected publication

Authorized: 2026-08-16

## Decision

Bill Gates and Leonardo DiCaprio may be added as sourced People profiles and
linked by name from the Scorpio Registry profile. This is a person-specific
exception to the standing rule that protected living profiles do not receive
cross-links.

The exception authorizes discovery from `/registry/scorpio/` only. It does not
authorize search indexing, promotion through the People directory, or reuse on
birthday and automatic related-person surfaces.

## Required controls

- Both People pages remain `noindex, nofollow` in page metadata and response
  headers.
- Both routes remain outside the sitemap, site search, People directory,
  birthday links, and automatic related-person rails.
- Portrait and social-card assets carry `noindex, noimageindex, noarchive`
  response headers.
- The Registry links use `rel="nofollow"`.
- Facts remain limited to pinned Wikidata, Wikipedia, and Wikimedia Commons
  records. Birth time remains unknown and the pages make no claim otherwise.
- The existing correction, objection, withholding, and removal process at
  `people@zodiacs.org` applies without exception.

## Scope boundary

No other living-person page or cross-link is authorized by this decision. It
does not make either profile eligible for search indexing.
