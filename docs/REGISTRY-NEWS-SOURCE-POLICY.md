# Registry external news source policy

Last reviewed: 2026-08-10

The Registry Research Desk uses a small, explicit publisher allowlist. Its external wire is a headline index, not a republication service. The public API returns only publisher, author when supplied, publication time, canonical article URL, title, and project-assigned topics. It does not store or display feed descriptions, article bodies, transcripts, audio, enclosures, publisher logos, or remote images.

## Initial allowlist

| Label in the Registry | Classification | Machine feed | Canonical article hosts |
| --- | --- | --- | --- |
| The Astrology Podcast | Astrology News | `https://theastrologypodcast.com/feed/podcast/` | `theastrologypodcast.com`, `www.theastrologypodcast.com` |
| The Mountain Astrologer | Astrology News | `https://mountainastrologer.com/feed/` | `mountainastrologer.com`, `www.mountainastrologer.com` |
| The Astrological Association | Astrology News | `https://www.astrologicalassociation.com/category/news/feed/` | `astrologicalassociation.com`, `www.astrologicalassociation.com` |
| NASA | Astronomy | `https://www.nasa.gov/news-release/feed/` | `nasa.gov`, `www.nasa.gov`, `science.nasa.gov`, `earthobservatory.nasa.gov` |
| NASA Jet Propulsion Laboratory | Astronomy | `https://www.jpl.nasa.gov/feeds/news/` | `jpl.nasa.gov`, `www.jpl.nasa.gov` |

NASA and JPL are factual astronomy sources. Their inclusion does not imply that either organization endorses astrology, Zodiac tokens, Zodiacs.org, or any market interpretation. External publishers likewise do not endorse the Registry merely because their public headline feeds are indexed.

## Selection and presentation

- Items must have a valid HTTPS article URL on the publisher's exact hostname allowlist and a valid publication time no more than 45 days old.
- Astronomy items must match an astronomy or sky topic using their title and publisher-supplied category labels. Article and feed descriptions are not used for classification.
- Astrology publishers and factual astronomy publishers remain visibly and semantically distinct as `astrology-news` and `astronomy`.
- Results are deduplicated by canonical URL and stable feed identity, sorted by publication time, and capped before publication.
- A feed that times out, redirects outside its allowlist, returns non-XML content, exceeds the byte cap, or fails parsing is omitted. The other publishers continue to work.
- Headlines never auto-insert while a visitor is reading. Client interfaces should announce newly available editions behind an explicit update control.

## Fetching and safety

- Only the five URLs above can initiate a fetch. Redirects remain HTTPS, are limited to two, and must stay on the exact per-source feed hostname list.
- Each source has a 4.5-second timeout and a 1,500,000-byte response cap. Declared and streamed sizes are both checked.
- DTD and entity declarations are rejected. Feed text is bounded, stripped of markup and control characters, and serialized as JSON.
- Conditional `ETag` and `Last-Modified` requests reduce repeat transfers on warm server instances. The same-origin API is protected by shared-CDN cache and stale-response directives.
- Canonical URLs have fragments and common campaign parameters removed. Credentials, insecure HTTP, unexpected ports, and unlisted destinations are rejected.

## Corrections, removals, and additions

Publisher removal or headline correction requests should be sent through the contact route listed on Zodiacs.org. A source is removed promptly if its publisher withdraws feed availability, its terms change, or it no longer meets the safety and relevance policy.

New publishers are not discovered automatically. They require a code-reviewed allowlist change plus confirmation that headline/feed indexing is permitted; broader content reuse requires an explicit syndication agreement. Every source-policy change must update this document and the hostile-feed contract tests.
