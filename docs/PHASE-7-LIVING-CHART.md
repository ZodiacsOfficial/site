# Phase 7 — Living Chart

**Owner decision:** approved product direction, staged delivery
**Recorded:** 2026-08-18
**Implementation posture:** production core with fail-closed public overrides

## Decision

Build personalized horoscopes and Living Chart as one loop:

> public horoscope → personal Today → save a moment → private history → return to personal Today

Public sign horoscopes continue to serve search, sharing, and first visits. They
must not become a second private product. A saved-chart enhancement leads to
`/today/`, which becomes the canonical personal daily horoscope for one explicit
My chart. Living Chart remembers what the person chose to save. Profile owns the
timeline and continuity controls.

Living Chart is a final product direction, not a local-only experiment. The first
save works without authentication or network wait. The same stable record model
supports guest use, offline work, and separately consented account sync. Device-only
use remains available as a secondary choice.

The owner subsequently authorized implementation and production release of the
core loop. Later reminders, AI use, and growth extensions remain outside this release.

## Product boundaries

- Living Chart works only with the canonical self chart.
- Another person's chart, compatibility results, and public People charts cannot
  create Living Chart moments.
- Race points, weekly check-ins, streaks, trophies, Registry, and Astrofolio remain
  separate.
- Guide receives no Living Chart data automatically. A later one-entry handoff
  requires an exact payload preview and explicit confirmation for that turn.
- Notes are never public, shared, indexed, or used as horoscope-generation input.
- The product is free and does not put the chart, Today, or history behind a paywall.

## Information architecture

| Surface | Role |
| --- | --- |
| `/horoscopes/` and sign pages | Public acquisition and generic Sun-sign program |
| `/today/` | Personal daily horoscope and first-release moment capture |
| `/profile/` | My chart, Living Chart summary, saved people, and continuity controls |
| `/profile/living-chart/` | Full timeline when history depth justifies the route |
| Guide | User-requested explanation only; never the memory system |

Do not add a Journal route or global Living Chart navigation item at launch.

## Personal Today contract

The personal card should be useful in 30–60 seconds:

1. A strongest supported contact in the dated sky snapshot, or an honest
   quieter-day state. Call it a window only after start, peak, and end have
   actually been computed.
2. Two or three possible expressions, never promised events.
3. One useful action or reflection question.
4. An expandable exact receipt: moving body, natal point, aspect, orb, and
   snapshot basis; add a bounded window only when the scan supports it.
5. A quiet **Save this moment** action after the reading.

Evidence is deterministic and ranked by exactness, natal relevance, moving-body
speed, repeat pass, and supported chart precision. Unknown birth time excludes
unsupported angles and houses. No qualifying contact produces a quiet day; it does
not produce fabricated urgency.

The forecast text, evidence, edition identity, and renderer version are frozen
before a moment references them. Later code or editorial changes never rewrite
what the person originally saw.

## Capture contract

- The first save does not require sign-in.
- Date and time default to now.
- Time precision is exact, approximate, or date-only.
- Category is optional and uses a fixed enum.
- Note is optional plain text, at most 500 Unicode characters.
- At least a category or note is required.
- A typical save should take under 30 seconds.
- No event location, media, HTML, or automatic Guide attachment.
- The UI confirms **Saved** immediately and exposes technical sync state only
  when recovery action is required.

After value is delivered, the product may offer **Keep this on every device**.
Chart sync and Living Chart sync are separate revocable purpose grants even if
the UI explains both in one concise account setup.

## Timeline contract

The timeline is reverse chronological and supports:

- date and chosen precision;
- optional category and note;
- one to three frozen **Sky at that moment** facts;
- one deterministic reflection question;
- edit and delete;
- readable Markdown and portable JSON export;
- sync status only when action is required.

After at least three comparable windows, a factual history module may reference
exact dates and receipts. It may say moments were saved during similar windows.
It may not claim a cause, prediction, proven pattern, diagnosis, or statistical
significance.

## Client and sync architecture

One offline-first model serves guest and account use:

- IndexedDB working cache and outbox;
- stable UUIDs and versioned codecs from the first save;
- owner-scoped guest or account vaults;
- immediate local mutation followed by background synchronization when granted;
- server revisions, cursor pulls, idempotency, bounded retries, and tombstones;
- three-way conflict handling that never discards concurrent note text;
- account/access-generation checks on every read and write;
- in-memory scrubbing and vault closure on lease revocation or account transition.

Guest-to-account import always previews the destination and item count. A shared
browser's notes are never silently claimed by a signed-in account. IDs remain
stable and partial retries cannot duplicate data.

## Server privacy contract

The public core deliberately uses the existing Supabase Auth and Data API instead
of waiting for Account Sync v2. A signed-in browser may read only its own consent
and current-epoch rows under owner RLS. All writes go through replay-safe RPCs that
derive the account from the verified JWT, serialize account mutations, validate an
exact bounded payload, and enforce separate `living_chart_sync` consent.

Synced rows contain the entry date/time precision, optional category and note,
frozen forecast evidence, chart identifier, and technical revision metadata.
Supabase encrypts stored data at rest, but this design is not end-to-end encrypted
or opaque to Zodiacs.org/Supabase. Do not describe it as managed KMS, per-account
crypto-shredding, or “only you can read this.” Convenience is the reason to sync;
truthful consent is the reason the tradeoff is acceptable.

The browser never sends note text to analytics or Guide. Application code does not
intentionally log payload bodies. Cloud tombstones are payload-free; local deletion
erases the entry content while retaining only the minimum content-free deletion
authority needed to stop a lost request from restoring it.

Revoking Living Chart sync atomically erases remote moments, advances a consent
epoch, and prevents stale offline mutations from restoring remote data. It does not
revoke chart sync, and chart-sync withdrawal does not silently delete device-only
Living Chart history. A private server runtime switch can pause new grants/uploads
without disabling read, export, delete, or withdrawal.

## Content-free measurement

The north star is four-week retained synced users who complete at least two
forecast-to-moment loops: a forecast view or bookmark followed by a saved moment.

Supporting signals:

- median first save under 30 seconds;
- second moment within 30 days;
- week-2 and week-4 return;
- forecast-to-moment conversion;
- cross-device recovery and sync success;
- reminder opt-in, open, disable, and complaint rates only after reminders exist.

No event may include note text, category, moment/chart ID, event date/time, birth
data, aspect data, location, email, wallet, account ID, or persistent analytics ID.
“This felt accurate” is diagnostic editorial feedback, not the north star.

## Production controls

Capture and sync use the dated owner-authorized release default when their
variables are omitted. Exact `1` enables and any explicit non-`1` value disables:

- `PUBLIC_LIVING_CHART_CAPTURE_ENABLED`
- `PUBLIC_LIVING_CHART_SYNC_ENABLED`

Capture and new-sync acquisition can be reviewed independently. The private
database `new_writes_enabled` control blocks new grants/uploads while owner reads,
delete, and withdrawal remain available. Profile keeps durable privacy controls
available during a UI ramp or rollback once remote data exists.

## Current implementation

The production core includes:

- explicit self/other chart classification and an earlier visible chart-save action;
- a personalized Today forecast snapshot with exact receipts and quiet-day honesty;
- guest-first moment capture with stable IDs and owner-scoped IndexedDB storage;
- a Profile timeline with edit, deletion, JSON/Markdown export, sync status, and retry;
- account-boundary invalidation and durable device-clear requests;
- separate revocable `living_chart_sync` consent, direct owner-only RLS sync,
  explicit idempotent guest import, paged snapshots, replay fencing, content-free
  tombstones, and conflict recovery that preserves both note copies;
- a server-side new-write kill switch that never blocks read, delete, or withdrawal;
- content-free analytics contracts plus Node 22 browser and SQL CI gates.

Search/filter, bounded contact windows, historical callbacks, and reminders remain
later work. Notes are not used for AI generation and there are no reminders in
this release.

## Release sequence

### Gate A — complete core

- Guest/offline cache and outbox.
- Personal Today and immutable forecast snapshots.
- Moment capture and Profile timeline.
- Separate Living Chart consent and owner-RLS server sync.
- Guest import, conflict recovery, edit, delete, and export.
- Account-boundary, mobile, accessibility, localization, and performance work.

### Gate B — reliability and security

Prove cross-account isolation, RLS/grant closure, offline convergence, concurrent
edit recovery, stale-device deletion, consent-epoch behavior, export completeness,
terminal account deletion, backup behavior, and zero sensitive
telemetry. Verify keyboard, screen reader, reduced motion, zoom, small screens,
timezone/DST, and immutable historical evidence.

### Gate C — release and observation

Before promotion, require green local/client tests, executable PostgreSQL privacy
and concurrency tests, a successful production migration, a reviewed Vercel
preview, and live delete/withdraw/read verification. After release, observe real
accounts for cross-account exposure, acknowledged-entry loss, sync failures, and
regressions to Today, horoscopes, Profile, chart saving, Guide, or Race. Weak usage
leads to better capture, ranking, and context—not streak punishment, AI prose, or
rewards.

## Later, evidence-led additions

Only after the core is stable:

- personalized Week Ahead with at most three ranked windows;
- user-requested significant-window reminders, default maximum two per week,
  timezone-aware quiet hours, and one-tap pause;
- factual Connections and a monthly **Your month in moments** review;
- one selected-entry Guide handoff with exact preview;
- navigation promotion only if sustained use earns it.

No doom, countdowns, generic nightly nags, “something big is coming,” or automatic
recurrence claims.
