# Living Chart — Phase 7 program proposal

Status: **proposal for owner review.** The six-phase household-name program
(`PLAN.md`) explicitly excludes Phase 7; this document proposes what the next
program should be. Nothing here is an active phase until the owner stamps it
and `PLAN.md` records it.

Provenance: the owner asked an external model (Sol Ultra, 2026-08-12) what
AI-era features could take the site to the next level; it returned a roadmap
centered on a "Living Chart" plus astrocartography, group synastry, birth-time
rectification, and smaller items. This document reviews that proposal against
the repository as it actually stands (Phases 1–6, engine, storage, delivery
channels, assistant) and converts the parts worth keeping into a program spec
in the house format. Prepared by Claude (roadmap review), 2026-08-12, on
branch `claude/living-chart-roadmap-qkzivy`.

Related context the proposal did not have: `PLAN.md` (phase gates, program
backlog), `docs/MASTER-PLAN.md` (audit + Chart Explorer spec),
`docs/PHASE3-HABIT-FABLE-HANDOFF.md` (delivery caps), 
`docs/PHASE4-SHARING-TECHNICAL-CONTRACT.md` (positions-only payloads),
`docs/phase6/eval/` (assistant evaluation suites), `docs/SUPABASE.md`
(account sync posture).

---

## 1. Verdict on the proposed roadmap

| Proposed feature | Verdict | Grounds |
| --- | --- | --- |
| Living Chart / Personal Pattern Lab | **Adopt, corrected** (Phase 7, this document) | The one loop the site does not have. Every prerequisite is shipped: exact transit scanning (`src/lib/engine/transit-scan-core.ts`), progressions/returns (`progressions.ts`, `solar-return.ts`, `returns.ts`), eclipse hits (`src/lib/upcoming.ts`), account sync with RLS + tombstones (`src/lib/profile/sync.ts`, `supabase/migrations/20260706000000_profile_sync.sql`), evidence-receipt discipline (Phase 1 pipeline, `src/lib/events/types.ts`), a bounded grounded assistant (Phase 6). Correction: no "pattern" claims — see §3. |
| "Pattern cards" after 3+ entries | **Reject as framed; replace with recurrence receipts** | Three entries is a count, not a pattern. The site's spine is never faking precision (no-time charts omit houses; day-labeled data is labeled). Recurrence surfaces as factual counts with a limitations line, never as discovered correlation. §3.4. |
| Adaptive chart tutor ("Explain this" everywhere) | **Already shipped** | The Chart Explorer with inspector, layered emphasis, and the guided reading path (`src/lib/scene/`, `src/islands/explorer/`) is this feature. Remaining work is rollout breadth, not a roadmap item. |
| Weekly briefs referencing the user | **Mostly shipped; extend in 7C** | Chart-tier daily email, weekly digest, and the transit iCal feed exist (`api/email/`, `docs/WEEKLY-DIGEST.md`, `api/calendar/transits.ts`). Phase 7C adds an opted-in journal-history block to the digest. §9. |
| Astrocartography Decision Studio | **Split: adopt the map later, reject the studio** | No line math exists anywhere in the repo — this is new engine work that must pass the same accuracy harness as everything else before any surface exists (§11.1). The AI city comparator (cost, climate, "current sourced practical information") turns an astrology tool into relocation advice — a life-decision product the assistant's own rules already refuse, and the proposal's own guardrail ("do not answer… through astrological prediction") contradicts it. |
| Relationship Constellations (3–5 person circles) | **Defer with an entry condition** | The pair loop shipped 2026-07-25 (Phase 4); there is no retention evidence yet. Group circles multiply consent and third-party exposure. Design the journal schema so circles can attach later; build nothing now. §11.3. |
| Birth-Time Detective | **Adapt: deterministic comparator first** | The honest near-term tool is a birth-window comparator — compute charts across the stated window, show exactly which placements flip and when. The conversational interview with plausibility claims ships only after the blind validation the proposal itself requires, and never promises a minute. §11.2. |
| Personal year review | **Fold into Phase 7 timeline** | An annual view over the user's own entries and receipts is a rendering of Phase 7 data, not a separate product. A shareable version follows the positions-only share discipline if it ever ships. |
| Generated audio sessions | **Reject** | Recurring model cost against unproven demand, and it turns the quiet production layer into a voice — a register the site has deliberately avoided. |
| Numerology | **Stays on the program backlog** | Already parked in `PLAN.md` ("Numerology wing", outside the six phases). Deterministic and cheap, but it has no astronomy to gate against and no evidence-receipt story. Not a pillar, not part of this program. |

The proposal's interface sketch (LifeEvent / AstroEvidence / Interpretation /
ReflectionFeedback, "the language model must never calculate positions",
"factual statements without an evidence reference are not rendered") is
adopted nearly verbatim — because the repository already works this way. The
horoscope pipeline renders prose only over committed fact records, and the
assistant receives placements as text and computes nothing. Phase 7 extends an
existing law; it does not introduce one.

---

## 2. Why this is the right next program

The six phases built acquisition (reference clusters, daily engine), habit
(daily email, sky alerts, PWA), sharing (invitations), and explanation (Ask
Zodiacs). What no surface does yet: connect a person's own dated experience to
the exact sky and let feedback accumulate. That loop compounds with use, which
is what none of the calculators do — and it is the loop a personal astrologer
historically provided by hand.

It is also unusually cheap here, and only here:

- The computation is done. `scanTransitContacts` finds exact contacts with
  station handling for arbitrary windows; server and browser graphs agree to
  1e-12; eclipse, lunation, retrograde, and return data are committed and
  refreshed on cron.
- The honesty machinery is done: engine flags (`no-time`, `dst-fold`, `lmt`),
  limitations rendering (Phase 2's `EventInterpretation.limitations`), and a
  verifier culture that fails closed.
- The privacy ladder is done: local-first storage with optional magic-link
  sync, RLS owner-only tables, tombstoned deletes, positions-only payloads,
  a consent dialog that previews the exact text before anything leaves.
- The delivery channels are done and capped.

What is genuinely new: two tables, one route, a worker, a phrase library, and
one narrow serverless function. Phase 7 is composition.

---

## 3. Product shape

### 3.1 The check-in

From `/today/`, `/profile/`, or the journal itself: a ~30-second entry —
what happened (free text, ≤500 characters), optional feeling tags (a fixed,
translatable set of ~8, never free text), and when it happened (a date, with
declared precision: day, hour, or minute). Voice capture is out of scope for
this program; the app's Guide may add it later against the same records.

### 3.2 The evidence packet

For the entry's chart and instant, the engine computes what was active:
transit contacts around the window, lunations and eclipse hits, retrograde
windows containing the instant, solar-return proximity. Deterministic,
client-side, engine-versioned. No model is involved. §6.

### 3.3 The reflection

Three visibly separated sections:

- **What was active** — computed receipts, each line bound to evidence items,
  tappable through to the receipt (aspect, orb, exact UTC instant).
- **One lens** — a single interpretive paragraph, reflective and never causal,
  also bound to the evidence it references.
- **A question** — one journal prompt.

Plus a limitations line whenever one applies ("Birth time unknown — house and
angle contacts are omitted", "Day-level entry — contacts were exact within
this day, not at a specific moment").

### 3.4 Feedback and recurrence receipts

Every reflection takes one verdict — Resonated / Partly / Not for me /
Factual error — and optional per-evidence-item votes. After entries
accumulate, the timeline surfaces **recurrence receipts**:

> You wrote entries during 3 windows when Saturn was square your Mercury.
> The next similar window is March 2027. Three windows is a count, not a
> pattern.

The copy contract is strict: counts and dates only; the limitations sentence
is non-suppressible below five occurrences; the words "pattern", "caused",
and any causal phrasing are banned from this surface outright. The user draws
their own conclusions; the site keeps the receipts.

### 3.5 What this feature never does

No medical, legal, financial, fertility, crisis, or death content — the same
line the assistant already holds (`api/_assistant/persona.ts`). Entries that
name third parties never produce characterizations of those people. Nothing
predicts events. The journal is private by default and never indexable.

---

## 4. Typed records (contracts to freeze at gate 7A)

New directory `src/lib/journal/`, mirroring `src/lib/profile/` (`types.ts`,
`schema.ts`, `store.ts`, `deletions.ts`, `sync.ts`, plus `evidence.ts`,
`recurrence.ts`, `compose.ts`). All records stamp `ENGINE_VERSION` and carry
`ChartFlag`s the way `SavedChart.summary` does.

```ts
export type DatePrecision = 'day' | 'hour' | 'minute';

export interface LifeEvent {
  id: string;                 // client-minted UUID → idempotent cloud upsert
  chartId: string;            // the SavedChart this entry is read against
  occurredAt: string;         // UTC ISO anchor; day precision anchors to local midnight
  precision: DatePrecision;
  tz: string;                 // IANA zone of the entry — defines the whole-day window
  note: string;               // ≤500 chars
  feelings: FeelingTag[];     // fixed enum, translatable
  createdAt: string;
  updatedAt: string;          // last-write-wins merge key (profile merge.ts semantics)
}

export type AstroEvidenceItem =
  | { id: string; kind: 'transit-contact'; contact: TransitContact; deltaDays: number; signature: string }
  | { id: string; kind: 'lunation'; factsId: string; at: string; deltaDays: number; signature: string }
  | { id: string; kind: 'eclipse-hit'; hit: EclipseHit; deltaDays: number; signature: string }
  | { id: string; kind: 'retrograde'; body: string; start: string; end: string | null; shadow: boolean; signature: string }
  | { id: string; kind: 'solar-return-proximity'; returnUtc: string; deltaDays: number; signature: string };

export interface EvidencePacket {
  id: string;
  eventId: string;
  chartId: string;
  engineVersion: string;      // recompute the packet on mismatch; LifeEvent is truth
  computedAt: string;
  window: { fromUtc: string; toUtc: string };
  flags: ChartFlag[];         // no-time ⇒ no angle contacts, stated in limitations
  items: AstroEvidenceItem[]; // capped at 12, ordered by |deltaDays|
  limitations: string[];      // Phase-2 discipline: visible, consequential caveats
}

export interface ReflectionLine { text: string; evidenceIds: string[]; }

export interface Reflection {
  id: string;
  eventId: string;
  packetId: string;
  generator: string;          // 'phrase-library@1' | 'assistant@<rev>' — provenance, always rendered
  active: ReflectionLine[];   // every line MUST cite evidence
  lens: ReflectionLine | null;// interpretive, non-causal, evidence citation required
  question: string;           // the only evidence-free section
  limitations: string[];
  createdAt: string;
}

export type ResonanceVerdict = 'resonated' | 'partly' | 'not-for-me' | 'factual-error';

export interface ResonanceFeedback {
  id: string;
  eventId: string;
  reflectionId: string;
  verdict: ResonanceVerdict;
  evidenceVotes: { evidenceId: string; felt: boolean }[];
  createdAt: string;
}
```

`TransitContact` and `EclipseHit` embed verbatim from
`src/lib/engine/transit-scan-core.ts` and `src/lib/upcoming.ts`. `signature`
is the date-independent identity (`"Saturn|square|Sun"`,
`"retrograde|Mercury"`) that the recurrence matcher groups on; item ids are
deterministic (`signature + exactUtc`) so citation validation and
per-item votes survive recomputes.

---

## 5. Storage and privacy ladder

**Local-first.** New versioned key `zodiacs.journal.v1`
(`{ version: 1, entries: JournalRecord[] }` where a `JournalRecord` bundles
event + packet + reflection + feedback), tombstones in
`zodiacs.journal.deletions.v1` (clone of `src/lib/profile/deletions.ts`).
Caps: 400 entries, 12 evidence items per packet, ~1 MB serialized store, with
a quota test — localStorage is shared with `zodiacs.profile.v1` and
`zodiacs.yearahead.v1`. Packets are caches; on engine-version mismatch they
recompute. The `LifeEvent` is the only source of truth.

**Cloud memory is a second, separate consent.** Signing in and syncing charts
does not sync the journal. A distinct opt-in — `profiles.journal_cloud_opt_in`
(precedent: `digest_opt_in`, written column-by-column so sync cannot clobber
it) — gates every journal network call. A signed-in, chart-syncing user with
journal opt-in off generates **zero** journal requests; this is a
Definition-of-Done test, asserted in the browser drive.

**Migration shape** (`supabase/migrations/…_phase7_journal.sql`, in the
`profile_sync.sql` idiom — RLS enabled, `anon` revoked entirely, owner-only
policies on `authenticated`, SQL contract tests extended):

```sql
alter table public.profiles
  add column if not exists journal_cloud_opt_in boolean not null default false;

create table if not exists public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chart_id uuid not null,
  occurred_at timestamptz not null,      -- extracted for digest range queries
  payload jsonb not null,                -- versioned JournalRecord
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint journal_payload_size check (pg_column_size(payload) <= 32768)
);

create table if not exists public.journal_deletions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default now()
);
```

No server-side feedback aggregation: product metrics come from the
allowlisted analytics events, never from reading user rows.

**Export and deletion.** One-tap JSON export of the full local store; delete-all
wipes local keys, writes tombstones for every id, and — when opted in —
deletes the cloud rows, mirroring the chart-deletion round trip. Both are
tested end-to-end at 7B.

**What never leaves the device:** note text and feeling tags without cloud
consent; note text additionally never reaches the model in v1 at all (§7),
never appears in analytics events (the `docs/ANALYTICS.md` invariant extends:
fixed enums only), and never appears in any email.

---

## 6. Computation — client-first, worker-hosted

Evidence packets compute entirely on-device in a new
`src/islands/journal/Evidence.worker.ts`, cloned from
`src/islands/transit/TransitSearch.worker.ts` (which already proves the
transit scanner runs in a worker). No new server compute; the 1e-12
server/browser parity pin means a future server path could not drift anyway.

Reused verbatim: `scanTransitContacts` with bounded `TransitScanOptions`,
`eclipseHits()` (3° orb, conjunction/opposition), `solarReturnInstant` /
`mostRecentSolarReturnInstant`, `sky.json` retrograde windows and lunations,
and the existing phrasing registers (`src/lib/transits.ts`,
`src/lib/natal.ts`).

New, pure, unit-tested:

- `evidenceForInstant(chart, occurredAt, precision, tz): EvidencePacket` in
  `src/lib/journal/evidence.ts` — derives the honest window from precision
  and zone; scans contacts over the window plus per-body slop (±3 d fast
  bodies, ±14 d Jupiter/Saturn, ±30 d outers) reporting `deltaDays` rather
  than inventing an orb narrative; adds retrogrades containing the instant,
  lunations within ±2 d, eclipse hits within ±3 d of peak, solar-return
  proximity within ±15 d. Composition precedent: `src/lib/year-ahead.ts`.
- `recurrenceReceipts(records): RecurrenceReceipt[]` in
  `src/lib/journal/recurrence.ts` — groups resonance-positive evidence by
  `signature`, emits `{ signature, count, entryDates, nextWindow }` with the
  next window found by a bounded forward scan (≤18 months, in the worker) or
  `sky.json` lookup.

**Precision honesty.** Day precision means a whole-day window in the entry's
zone; the UI says "on this day", never a clock time. **Moon contacts are
excluded at day precision** — the Moon moves ~13° per day, so a day-level
anchor cannot honestly claim one — and the exclusion is stated in
`limitations`. No-time charts omit angle and house contacts, exactly as the
chart surfaces already do.

---

## 7. Reflection generation ladder

**v0 — deterministic composer, ships first, remains the permanent fallback.**
`src/lib/journal/compose.ts`: a phrase library keyed by evidence kind and
body/aspect role, reusing the existing registers, plus a question bank keyed
by evidence family. This is the Phase 1 posture — editorial prose over
committed facts, no model required, no key required. Citation enforcement is
**by construction**: the composer emits only `ReflectionLine{text,
evidenceIds}` and the renderer renders only evidence-bound lines. There is no
code path that displays an uncited factual sentence.

**v1 — model-polished lens, flag-gated, optional.** A sibling endpoint
`api/journal-reflect.ts` — deliberately not an extension of `api/assistant.ts`
(that is a streaming chat with a 50 KB site guide; this is a one-shot
structured completion). Shared machinery (origin checks, salted-hash visitor
bucketing, instance limiter, daily quota RPC in the `assistant_quota` style,
global ceiling, fail-closed posture) extracts into `api/_shared/`. Its own
kill switch: `JOURNAL_REFLECT_ENABLED`. Request: the compact evidence packet,
feeling tags, locale — **not the note text in v1**; the deterministic layer
already has the note locally, and keeping free text off the wire preserves
the "nothing sensitive transits, nothing is stored" posture. Response: one
JSON body `{ active, lens, question }`.

Mechanical enforcement, client-side, in order:

1. Malformed JSON → discard, render v0.
2. Every cited `evidenceId` must exist in the packet; a line citing nothing
   valid is dropped; if the lens drops, v0's lens substitutes.
3. A banned-causal-lexicon lint (`caused`, `because <planet>`, `made you`,
   `explains why`, plus the voice-gate vocabulary) rejects the line → v0.
4. `generator` provenance is stored and rendered, so sampled audits can
   distinguish rungs.

Nothing is stored server-side — the Phase 6 invariant, unchanged.

---

## 8. Surfaces, flags, budgets, analytics

- **New route `/journal/`** — noindex, out of the sitemap (the Phase 2
  `indexEligible: false` posture), one lazy island
  (`src/islands/journal/JournalTimeline.tsx`: composer, timeline, recurrence
  receipts, export/delete), worker loaded on demand.
- **`/today/`** gains a one-line "Note something about today" affordance
  linking to `/journal/?add=today` — an anchor, not an island; `/today/`'s
  bundle budget does not move.
- **`/profile/`** links each chart into its filtered timeline; the cloud
  opt-in toggle sits beside the existing sync and digest controls in
  `ProfileManager.tsx`.
- **Flags:** `PUBLIC_JOURNAL_ENABLED` (client; naming precedent
  `PUBLIC_COMPAT_INVITES_ENABLED`) and `JOURNAL_REFLECT_ENABLED` (server;
  precedent `ASSISTANT_ENABLED`). Flag off ⇒ the route renders a useful
  static stub and nothing else changes anywhere.
- **Budgets:** new `budgets.json` entry `"/journal/": 30` (peer of
  `/transits/`, same worker pattern); engine chunk and `/today/` budgets
  unchanged — asserted in CI as always.
- **Analytics:** allowlisted events, fixed enums only —
  `journal_checkin {precision}`, `journal_reflection {generator}`,
  `journal_feedback {verdict}`, `journal_export`, `journal_delete_all`,
  `journal_cloud_opt_in {on}`.

---

## 9. Program gates and Definition of Done

**Entry gate:** Phase 6 formally closed with its evaluation bar holding;
owner approval of this proposal; the journal red-team file authored **before**
implementation; the app/Guide contract (§10) circulated to the app repo.

- **7A — Design handoff (S).** Freeze `src/lib/journal/types.ts`; migration
  DDL reviewed against SQL contract tests; the English copy deck for
  limitations, receipts, and deflections; author
  `docs/phase7/eval/journal-redteam.json`: crisis content (supportive
  deflection, help resources, zero astrological framing), medical/legal/
  financial deflection, third-party people named in entries (no
  characterization of them, ever), causal-claim bait, prediction bait.
- **7B — Flag-off implementation + private canary (M).** Local-only journal
  (no cloud, no model), v0 composer, `/journal/` behind
  `PUBLIC_JOURNAL_ENABLED`, owner-allowlist canary in the Phase 4 ladder
  discipline. CI extensions land here.
- **7C — Beta cohort (M).** Cloud opt-in migration live;
  `api/journal-reflect.ts` behind its flag with quotas; recurrence receipts;
  the weekly digest gains an opted-in-only history block (counts and dates
  only, never note text; existing send caps unchanged). Beta of 25–50
  existing users, two weeks.
- **7D — Public (M).** Flag default-on; phrase library localized (es/pt/fr/it
  per the current released-locale policy); app/Guide reconciliation
  checkpoint; `PLAN.md` release evidence in the house format.

**Definition of Done (beyond the standard release evidence):**

- Opted-out users create zero server-side journal records — SQL contract test
  plus a browser-drive network assertion.
- Export and delete-all round trips proven, including cloud rows.
- A 100-reflection production sample contains zero uncited factual lines and
  zero causal claims (`scripts/journal-eval.mjs`, sibling of
  `scripts/assistant-eval.mjs`, run against production only).
- Red-team suite passes, including paraphrased crisis prompts.
- Quota fail-closed drill and kill-switch drill for `journal-reflect`.
- Success metrics from the original proposal, adopted as stated and measured
  only through the allowlisted events: ≥40% of activated users reach three
  check-ins; ≥70% of reflections rated Resonated or Partly; visible return to
  the timeline rather than one-off use.

**CI gates extended:** vitest fixtures for `evidenceForInstant` (including
day-precision Moon exclusion and no-time flag handling), SQL contract tests
for both new tables, bundle budgets, a Playwright drive
(check-in → packet → reflection → feedback → export), the causal-lexicon
grep over `src/lib/journal/`, visual regression for the timeline, Lighthouse
on `/journal/`.

---

## 10. The shared contract with the Zodiacs app and its Guide

The companion app (repo `zodiacs-org/zodiacs`; "One Connected Guide" PR #1)
should read and write the same records against the same Supabase project, so
the journal is one dataset with two clients. That repo was not readable from
this session, so this section states what the site freezes now and what waits
for reconciliation.

**Frozen by this program (7A):**

- Table names and shapes from §5, with `payload.version` as the in-jsonb
  discriminator.
- Merge semantics: last-write-wins on `updatedAt`, tombstone supremacy —
  exactly `src/lib/profile/merge.ts`.
- Client-minted UUIDs everywhere → idempotent upsert from any client.
- The consent state machine: `local-only → cloud-on → cloud-revoked`;
  revocation deletes server rows; re-opt-in is a fresh upload.
- Engine-version semantics: `LifeEvent` is the source of truth; packets are
  recomputable caches. The app may recompute packets only with an engine
  build that passes the same accuracy and parity gates; otherwise it treats
  them as read-only.
- The shared vocabularies: the feeling-tag enum and `ResonanceVerdict`.
- The storage invariant: Guide conversations are never persisted; journal
  records are the only artifact either client stores.

**Open pending PR #1 reconciliation (named 7A and 7D dependency):** whether
the Guide writes `LifeEvent`s directly or proposes drafts the user confirms;
whether recurrence receipts may trigger notifications (they must fit the
existing sky-alert caps — one per 24 h, two per rolling 7 days — or they do
not notify); final tag naming; whether the app needs a coarser
`occurred_at`-only read view.

---

## 11. Sequencing everything else

### 11.1 Astrocartography — Phase 8 candidate (L; XL with an interactive map)

Worth doing, in the deterministic form only. The engine currently has no
angle-line mathematics — the solar-return relocation recast
(`src/islands/SolarReturnCalculator.tsx`) is the only relocation code — so
the sequence is: 8A, an engine module for ASC/DSC/MC/IC lines (and only then
parans, if ever) gated by the same external-reference harness as the rest of
the engine, with no surface at all; then a decision between a static SVG map
(bundle-cheap, printable) and an interactive route. Relocated natal charts
and side-by-side "compare two or three places" diffs are honest, computed,
receipt-carrying features. An advice layer that weighs living costs and
climate is not this site, at any phase.

### 11.2 Birth-window comparator (S — can ship between 7B and 7C)

For "I was born sometime between 6 and 10 AM": compute the chart across the
window, show exactly what flips (rising sign spans, Moon sign boundary if
any, house moves) and at what minute each boundary falls. The moon-ambiguity
double-compute and the honesty flags already exist; this is a small tool page
over `ChartCalculator` internals. It answers the real need behind
"rectification" without ever claiming a birth time. A conversational
milestone interview is out of scope until it beats a naive baseline in a
blind test against known birth times — the proposal's own bar, kept.

### 11.3 Relationship circles — deferred with an entry condition

Enter design only when Phase 4 invitation data shows sustained pair-loop
retention, and Phase 7 has proven the consent ladder. Whatever ships must
copy the journal's consent machinery, keep every participant's sharing
explicit and revocable, and hold the Phase 4 line: no numeric scores, no
compatibility verdicts about people who have not consented.

### 11.4 Numerology — backlog, unchanged

`PLAN.md` already holds it outside any program, and this document does not
promote it. If search evidence ever justifies it, it is a small
deterministic calculator in its own wing, out of primary navigation.

### 11.5 Audio briefs — rejected

Recurring cost, no evidence of demand, and it gives the production layer a
voice and a persona. The daily email, push, and iCal channels already carry
the same content in quieter forms.

---

## 12. Risks and open questions

- **localStorage pressure.** The journal shares the origin quota with saved
  charts and caches. The caps in §5 plus a serialized-size test are
  mandatory; cloud opt-in is the pressure valve, not the fix.
- **Causal-language leakage in v1.** The lexicon lint is crude by design; the
  real backstops are the sampled evaluation bar and the ever-present v0
  fallback. If sampled violations persist, v1 stays off — the product is
  complete without it.
- **Small-n receipts read as patterns anyway.** The limitations line is
  non-suppressible in the renderer, not a copy guideline. Test it.
- **Crisis content.** Detection is client-side and keyword-based; nothing is
  stored or transmitted by default, which limits the blast radius, but the
  deflection copy needs care and the red-team suite must cover paraphrases.
- **Digest access widens server reads.** The email function reads counts and
  dates from opted-in rows only; note text never appears in any email. Keep
  that boundary in the SQL contract tests.
- **Open:** PR #1 reconciliation (§10); whether the quota RPC generalizes
  with a scope column or clones; English-only beta versus the localization
  cost at 7D; whether per-item resonance votes should ever influence packet
  ordering (personalization is out of scope for this program — packets stay
  deterministic).
