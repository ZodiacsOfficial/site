# SOL Ultra — Marketing Operating Plan

Status: **standing operating document** — this is not a one-shot campaign but
the recurring system SOL Ultra runs to grow zodiacs.org traffic.

Prepared: 2026-07-28 · Owner decisions incorporated: **$0 paid budget
(organic only)** · SOL Ultra operates **all four fronts** (on-site SEO,
social, outreach, email) · **first 90 days concentrate on EN search
clusters** · live today: the zodiacs.org X account and a paid Google
Workspace; every other account is created in Week 1.

Companion documents: `docs/STRATEGY.md` (product strategy and voice law),
`docs/MASTER-PLAN.md` (product roadmap), `docs/ANALYTICS.md` (event
taxonomy), `docs/EMAIL-CAPTURE.md` + `docs/WEEKLY-DIGEST.md` (email
infrastructure), `LISTINGS.md` (registry-wing listings — separate track),
`docs/LAUNCH.md` §3–5 (search-engine submission mechanics).

---

## 0. SOL Ultra's role prompt

Paste this block at the start of every SOL Ultra session, then paste one of
the numbered job prompts from §11. This is what keeps SOL Ultra running as a
consistent operator instead of a fresh conversation each time.

> You are SOL Ultra, the marketing operator for zodiacs.org — a free
> astrology platform whose edge is computed accuracy (JPL-gated engine,
> exact degrees and UTC timestamps), privacy (birth data never leaves the
> device), and zero signup walls. You are a world-class organic marketer:
> you think in search intent, distribution assets, and compounding loops,
> never in hacks or hype.
>
> Non-negotiable rules, in order:
> 1. Never use token, market, price, or crypto language in anything aimed
>    at the consumer surface or its audiences. The Registry wing has its
>    own contained channels; you do not cross them.
> 2. Voice: plain, confident, warm, unadorned. No woo-woo, no "unlock your
>    cosmic destiny", no fake urgency, no clickbait that the page cannot
>    honor. State computed facts with degrees and dates instead of
>    adjectives. Site content additionally follows the banned-phrase list
>    in `docs/STRATEGY.md` §4 and repo CI greps.
> 3. Nothing you produce autopublishes. Site content ships as drafts/PRs
>    under human review; social posts ship when the owner (or a scheduler
>    the owner configured) posts them. Velocity cap: ≤10 new site pages
>    per week, and only pages that embed a working tool, computed data, or
>    a unique visual.
> 4. No astroturfing, ever: no fake accounts, no undisclosed self-promotion
>    in communities, no bought followers or links, no engagement bait, no
>    review/comment schemes. If a tactic needs to hide who is behind it,
>    it is off the table.
> 5. Honesty about the medium: astrology content is entertainment and
>    self-reflection, never medical, financial, or legal guidance, and
>    marketing never implies predictive certainty.
>
> Your operating cadence, asset inventory, channel playbooks, and KPI
> definitions are in `docs/MARKETING-SOL-ULTRA-HANDOFF.md`. Ask for the
> current week's inputs (GSC export, sky-event dates, prior scorecard)
> before proposing work. Every session ends with: deliverables in
> paste-ready form, an updated scorecard row, and the single next action.

---

## 1. Ground truth — what is being marketed

zodiacs.org is ~3,700 built pages, six locales (EN + es/fr/it/ru/pt at
varying depth), static and fast (Lighthouse ~100s, LCP well under budget),
with schema markup on effectively every indexable page. Everything below
exists in production today and is the raw material for every campaign.

### 1.1 Tools (free, no signup, client-side private)

| Tool | URL | Marketing angle |
| --- | --- | --- |
| Birth chart calculator + Chart Explorer | `/birth-chart/` | Flagship. Interactive wheel with a guided reading — synchronized chart↔prose exists nowhere else free on the web |
| Rising sign calculator | `/rising-sign/` | High-volume, high-confusion query with weak competition |
| Moon sign calculator | `/moon-sign/` | Emotional hook; shareable |
| Compatibility / synastry (+ composite) | `/compatibility/` | The viral loop: two people per use |
| Transits + iCal calendar subscribe | `/transits/` | "Your sky, in your calendar" — recurring utility |
| Solar return, Saturn return | `/solar-return/`, `/saturn-return/` | Birthday-timed and milestone-timed intent |
| Moon phase, baby zodiac, someone-else charts | `/moon-phase/`, `/baby-zodiac/`, `/birth-chart/someone-else/` | Long-tail intents |
| Today brief + on-site assistant + site search | `/today/`, `/ask/` | Retention surfaces |

### 1.2 Content clusters (the SEO estate)

- 12 sign guides at top-level slugs (`/aries/` …) — the crown jewels.
- Horoscopes per sign: daily-computed block plus weekly, monthly, love,
  career, tomorrow, and year pages (`/horoscopes/{sign}/…`).
- Calendars and events: `/eclipses/`, `/full-moon-calendar/`,
  `/full-moon/{date}/`, `/new-moon/`, `/mercury-retrograde/`,
  `/venus-retrograde/`, `/mars-retrograde/`, `/retrogrades/`,
  `/events/{slug}/`, `/almanac/` — pages with exact computed instants,
  refreshed by crons.
- Learn: `/learn/` — placements (120), planets, houses, aspects, glossary,
  zodiac-dates, how-to-read-a-birth-chart, communication, chinese-zodiac.
- 366 birthday pages (`/birthday/`), 78 compatibility pairs.
- People: 18 indexable profiles of deceased public figures (`/people/`) —
  a bounded pilot; see §3 guardrails.
- `/methodology/`, `/about/`, `/corrections/` — the E-E-A-T spine.

### 1.3 Distribution assets already built (use these before building anything)

| Asset | Where | Note |
| --- | --- | --- |
| RSS/Atom feeds | `/feeds/` — daily-sky, horoscopes (+ per sign), events, almanac | Submit to directories; cite in outreach |
| Embeddable widgets | `/widgets/` | Zero-JS iframes (sky, moon, chart); each embed = a live backlink. `widget_embed_copied` is instrumented |
| Pinterest pins, pre-rendered | `/assets/og/v2/pin/` | 25 ready 1000×1500 pins: 12 sign guides, 12 horoscope pages, 1 how-to-read |
| Share cards | sitewide OG `v2` cards; in-tool PNG share cards | Every page is share-ready; users generate branded cards locally |
| iCal transit calendars | via `/transits/` | Subscription = recurring brand touch |
| llms.txt + AI-crawler allowlist | `/llms.txt`, `robots.txt` | Top data competitors bot-block AI agents; zodiacs.org welcomes them — the AEO moat |
| IndexNow automation | daily cron (`daily-horoscopes.yml`) | Bing/Copilot learn about changes daily without manual pings |
| JSON-LD everywhere | ~2,500 documents: Article, FAQPage, Dataset, Event, breadcrumbs | Rich-result and AI-citation substrate |
| Email capture + weekly digest | flag-gated (`EMAIL_PROVIDER`) | Needs provisioning (§8) before the email front activates |
| PWA | installable; honest offline rules | "Add it to your home screen" is a legitimate CTA |

### 1.4 What does NOT exist yet (Week-1 setup, §9)

Google Search Console / Bing verification (unconfirmed), Plausible
analytics in production (script URL unset ⇒ events currently no-op),
consumer Pinterest/Instagram/TikTok accounts, and a provisioned email
provider. The X account exists. Google Workspace exists (DNS access +
`admin@zodiacs.org` sender identity make all verifications easy).

---

## 2. Positioning and message house

**One-line position:** the astrology site that shows you the actual sky —
free, accurate, and private.

**The enemy is a behavior, not a brand:** signup walls before results,
vague copy-paste horoscopes, and apps that harvest birth data. Never name
competitors in marketing; let "no account, no upload, exact degrees" do it.

| Pillar | Proof (real, checkable) | Use in |
| --- | --- | --- |
| Accurate | Ephemeris cross-checked against JPL Horizons; every chart carries a UTC receipt and engine version; `/methodology/` explains the math | SEO copy, outreach to bloggers/journalists, About |
| Private | Charts compute in the browser; birth data never sent to a server; share links carry data only in the URL fragment | Tool pages, social bios, PR angle ("the privacy-first birth chart") |
| Free, no wall | Full chart, houses, aspects, guided reading — before any prompt to save | Every CTA; the anti-signup-wall story |
| Alive | The site recomputes the sky daily; event pages carry exact instants (e.g. ingress timestamps to the minute) | Sky-event marketing (§6), feeds, AEO |

**Tone in the wild:** the site's voice extends to social and outreach —
plain sentences, real dates and degrees, warmth without mysticism. A good
post sounds like: "The full moon peaks Thursday at 4:37 UTC in Aquarius.
Here's what that means, and where it lands in your chart →". A banned post
sounds like: "🌕✨ MASSIVE energy shift incoming!! You NEED to see this."

---

## 3. Hard guardrails (marketing-specific)

1. **The boundary.** Consumer marketing never mentions tokens, markets, or
   the Registry's tradable layer. Registry/collector marketing continues
   only through its own contained channels (`LISTINGS.md`, the wing's
   existing token-branded handles) and never shares audiences, handles, or
   campaigns with consumer marketing. The zodiacs.org X account and all new
   consumer accounts stay 100% consumer.
2. **People pilot stays bounded.** The 18 indexable People profiles may be
   linked and cited, but no marketing plan may depend on expanding People,
   and the two protected profiles (Rigoberta Menchú, Serena Williams) are
   never promoted, linked, or pinned. No "coming soon" promises about
   People.
3. **Velocity and quality caps** from `docs/STRATEGY.md` §15 bind SOL's
   content recommendations: ≤10 new pages/week, every page earns its index
   with a tool, computed data, or unique visual; no doorway pages; human
   review before merge — always.
4. **Community conduct.** In Reddit/Discord/forums, either participate
   genuinely with disclosed affiliation ("I build zodiacs.org") or stay
   out. Astrology communities are allergic to stealth promotion, and one
   caught sockpuppet costs more than a year of posts earns.
5. **No dark patterns anywhere:** no fake countdowns, no "only 3 spots",
   no follower/link buying, no engagement pods, no AI-reply spam on X.
6. **Claims discipline:** astrology is framed as reflection and tradition,
   never prediction-as-fact; nothing medical/financial/legal; accuracy
   claims attach to the *astronomy* (positions, timestamps), which is where
   they are true and provable.

---

## 4. The operating loop (how SOL Ultra keeps running)

SOL Ultra runs three loops. Each has fixed inputs the owner pastes in,
fixed outputs, and a time budget. The numbered prompts in §11 execute them.

### Weekly loop (~2–3 owner-hours total)

| Day | Job | Prompt | Output |
| --- | --- | --- | --- |
| Mon | Scorecard + GSC review: what moved, what's within striking distance | P1 | Scorecard row + this week's 3 focus actions |
| Tue | SEO sprint on one cluster (metadata, internal links, gap briefs) | P2 | PR-ready edits / 1–2 page briefs |
| Wed | Sky-event packet for the coming 14 days | P3 | Social calendar + email hook + pages to refresh |
| Thu | Outreach batch: 5 personalized widget/embed or data-citation pitches | P4 | 5 ready-to-send emails |
| Fri | Social batch: next week's X + Pinterest queue from the packet | P3 | 7 X posts, 3–5 pins with copy |
| — | (after email goes live) digest draft for the week ahead | P5 | Draft send |

### Monthly loop

- Full-funnel report against §10 KPIs; kill/scale decisions on every
  recurring activity (prompt P6).
- Horoscope-refresh moment: the monthly transit cron lands new data —
  IndexNow already fires; SOL packages the "what {Month} looks like" story
  for social/email/outreach.
- One experiment ships per month (a new format, channel, or asset), judged
  in the next monthly report. One at a time, measured, then kept or killed.

### Quarterly loop

- Content prune/consolidate review on engagement data (strategy §15).
- Channel re-weighting: whatever compounds gets next quarter's hours.
- Refresh this document — targets, playbooks, and anything falsified.

---

## 5. Front A — EN search clusters (the 90-day priority)

The estate is built; the job is to make it *win*. Three workstreams, in
priority order:

### 5.1 Verify the plumbing (weeks 1–2, one-time)

1. GSC + Bing verified, sitemap submitted, both confirmed indexing
   (`docs/LAUNCH.md` §3 has exact steps; Workspace DNS makes this ~30 min).
2. Rich-results spot-check: one sign guide, `/birth-chart/`, one horoscope
   page, one calendar page. Fix anything flagged, once, early.
3. Crawl-hygiene sweep from `docs/MASTER-PLAN.md` §5 (P9): confirm
   www/trailing-slash redirects, hub `<h1>`s, visible-FAQ parity, and the
   `/feeds/` page — verify which are already fixed, PR the remainder.
4. Baseline snapshot: export GSC queries/pages once indexing settles; this
   becomes the reference the weekly loop measures against.

### 5.2 The weekly striking-distance ritual (the compounding core)

Each week, from the GSC export: every query ranking 5–20 where the site
already has the right page gets one of — title/description rewrite toward
the actual query language · a missing H2 answering the exact question ·
3–5 internal links from related pages (guides ↔ horoscopes ↔ placements ↔
calculators) · a computed-fact box upgrade. Never more than one cluster
per week; depth beats breadth. Everything ships as one reviewed PR.

### 5.3 Authority, the cheapest real upgrade

From the master plan's verified gap list (P4), confirm-or-do: sources
lines on guides/learn/calendar pages (MUL.APIN, Ptolemy, NASA eclipse
catalog, IANA tzdb, Astronomy Engine) · `datePublished`/`dateModified`
everywhere · Dataset markup on consumer calendar pages · anchors on learn
articles. Then earn links to the two most citable page types: the
zodiac-dates correspondence table and the year calendars (§7 outreach
carries this).

**Cluster priority for the 90 days** (highest intent × existing strength):
1. Calculators (birth chart / rising / moon) — the money pages.
2. Zodiac-dates + sign guides — the authority base feeding everything.
3. Retrogrades + full-moon/eclipse calendars — seasonal spikes with exact
   dates nobody else publishes as precisely (§6 amplifies these).
4. Horoscope pages — retention cluster; optimize titles for "{sign}
   horoscope {period}" patterns once 1–3 are moving.

Locales, People expansion, and net-new clusters stay parked until day 90
unless GSC shows an unignorable gift.

---

## 6. Front B — the sky-event calendar (the unfair advantage)

Marketing calendars usually invent occasions. This site *computes* them:
`src/data/ingresses.json`, `eclipses.json`, the events and almanac pages,
and the daily-sky feed already know every full moon, new moon, ingress,
station, and eclipse — with exact UTC instants and standing pages. Every
such event is a predictable demand spike ("full moon july 2026 meaning"),
and the pages already exist to catch it.

**The event playbook** (SOL produces this as one packet per event, P3):

| When | Action | Channel |
| --- | --- | --- |
| T-14 | Pin the event (fresh pin copy on the standing page URL) | Pinterest |
| T-7 | "Next week: {event}, {exact instant}" post + digest mention | X, email |
| T-2 | The explainer thread: what it is, exact time, what to look at in your chart → tool link | X |
| T-0 | Day-of post with the live page; the daily cron's rebuild + IndexNow already handled freshness | X, IG/TikTok when live |
| T+1 | "What just happened" recap linking the next event (the chain never breaks) | X |

Cadence math: ~13 full moons + ~13 new moons + 12–13 ingresses + 6–8
station/retrograde boundaries + 4 eclipses ≈ **an event every ~5 days,
scheduled years in advance, each with a page, a feed item, and exact
numbers no generic astrology account posts.** This is the social engine —
no invented content needed, ever.

---

## 7. Fronts C & D — social and outreach

### 7.1 X (exists today)

Voice: the observatory, not the oracle. Rhythm: daily sky line (source:
the daily-sky feed) · event playbook posts (§6) · one weekly "reading the
chart" educational thread that ends at a calculator · share-card reposts
when users post them. Target: 5–7 posts/week, zero filler.

### 7.2 Pinterest (create in week 1 — the highest-leverage new account)

Astrology is one of Pinterest's largest verticals, pins are pre-rendered,
and Pinterest traffic compounds like SEO (pins surface for years). Board
structure: one per sign (guide + horoscope + related learn pins), one for
moon/calendar content, one for birth-chart education. Cadence: 3–5
pins/week — the 25 existing pins seed the first month; monthly horoscope
and event pins sustain it. Claim the domain for analytics.

### 7.3 Instagram / TikTok (reserve handles week 1; activate when capacity allows)

Reserve `@zodiacsorg` (or nearest) immediately either way. When activated:
share-card and sky-event visuals only — the pastel sign system is the
brand; no stock-mystic imagery. This front stays behind X + Pinterest
until those run themselves.

### 7.4 Outreach (the backlink program — all white-hat, all reciprocal-value)

1. **Widget placements:** astrology blogs, newsletters, and school/club
   sites get the free zero-JS sky/moon widget; each embed is a live
   backlink. Pitch: "costs your page one request, always current, no
   tracking." 5 personalized pitches/week (P4); track embeds live.
2. **Data citations:** the eclipse/full-moon/ingress pages publish exact
   instants with Dataset markup and no bot-blocking — pitch them to
   journalists and newsletter writers ahead of each major event ("every
   2027 eclipse, to the minute, free to cite"). Eclipses are mainstream
   news; the site has the cleanest citable table.
3. **Feed directories + blogrolls:** submit `/feeds/` endpoints once
   (week 2), then forget.
4. **Resource pages:** "learn astrology" resource lists and directories —
   the methodology page and glossary are genuinely reference-grade, which
   is the pitch.
5. **Communities:** disclosed-affiliation answers where a zodiacs tool
   genuinely resolves the question; never drive-by links (§3.4).

---

## 8. Front E — email and retention

Blocked on one owner decision: set `EMAIL_PROVIDER` (resend | buttondown |
loops — `docs/EMAIL-CAPTURE.md` documents each; Resend's free tier is
enough to start and the Workspace sender domain helps deliverability).
Until then the capture component correctly renders nothing.

Once live: the week-ahead digest (infrastructure already specified in
`docs/WEEKLY-DIGEST.md`) becomes the retention spine — one send/week,
sky-event led, tool-linked, written by SOL (P5) and reviewed like all
content. Growth comes from the three existing capture placements plus a
digest mention in every §6 event cycle. KPI: subscribers and open rate on
the scorecard from day one of provisioning.

The other retention rails are already shipped and only need mentioning in
marketing copy: saved charts, the iCal transit calendar, the PWA install,
and per-sign horoscope feeds.

---

## 9. Week-1 owner setup checklist (one-time, ~2–3 hours total)

1. Verify domain in **Google Search Console** (DNS TXT via Workspace) and
   submit `https://zodiacs.org/sitemap.xml`.
2. **Bing Webmaster Tools** — import from GSC. (IndexNow already pings
   daily; verification just unlocks the reporting.)
3. Create **Pinterest business account**, claim the domain, create the
   first 3 boards, schedule the 25 existing pins across ~3 weeks.
4. Reserve **Instagram/TikTok handles** (parking posts only).
5. Decide **analytics**: Plausible cloud (~$9/mo, the shim is ready — set
   `PUBLIC_PLAUSIBLE_SCRIPT_URL`) or defer and run on GSC alone for now.
   The event taxonomy in `docs/ANALYTICS.md` activates the moment the env
   var is set; without it, tool-usage KPIs stay dark.
6. Choose **email provider** and set the env vars when ready to open the
   email front (§8).
7. Confirm the **X account** bio/link state the §2 position ("Free birth
   charts · exact sky, computed in your browser · no account needed").

---

## 10. Measurement — the KPI tree and the scorecard

**North star (90 days): charts computed per week** — the moment a visitor
becomes a user. (Requires Plausible; until then, proxy = GSC clicks to
tool pages.)

| Layer | Metric | Source |
| --- | --- | --- |
| Reach | Impressions; queries in top-20 | GSC |
| Traffic | Clicks/day; % to tool pages | GSC (+ Plausible pageviews) |
| Activation | `chart_computed`, `result_rendered` | Plausible taxonomy |
| Depth | `chart_saved`, `explorer_interaction`, `tour_complete` | Plausible |
| Retention | digest subs (`email_subscribed`), `calendar_subscribe`, return visits | Plausible + provider |
| Distribution | live widget embeds, referring domains, pin saves | manual + GSC links + Pinterest |

**Honest expectations:** SEO from near-zero authority is a 6–18 month
compounding game (strategy §0.3). Day-90 success is **process health plus
leading indicators** — indexing clean, 10+ queries moved into top-10 from
striking distance, the event engine running on schedule, ≥10 live embeds,
Pinterest impressions growing week-over-week, and (if provisioned) the
first hundred digest subscribers. Traffic targets get set *at day 30*,
from the baseline snapshot, not invented now.

**The scorecard** (one row per week, kept in the owner's sheet; SOL fills
it every Monday from pasted exports): date · GSC impressions · clicks ·
top-10 query count · charts computed · saves · digest subs · embeds live ·
pins scheduled · posts shipped · this week's one focus.

---

## 11. SOL Ultra prompt kit (paste after the §0 role prompt)

**P1 — Monday review.** "Here is last week's scorecard row and a GSC
export (queries + pages, 28 days vs prior). Produce: the new scorecard
row; the 3 highest-leverage focus actions for this week with reasoning;
any striking-distance queries (positions 5–20) mapped to their existing
page and the single change most likely to move each."

**P2 — Cluster sprint.** "This week's cluster is {cluster}. From the GSC
export and these page URLs, produce PR-ready recommendations: exact
title/meta rewrites (≤60/≤155 chars, plain voice, no clickbait), missing
question H2s with 2–3 sentence answers in site voice, and an internal-link
list (from-page → to-page → anchor text). Respect the banned-phrase rules;
flag anything that needs a human judgment call."

**P3 — Sky-event packet.** "Here are the next 14 days of sky events with
exact UTC instants and their page URLs. Produce the full §6 playbook
packet per event: Pinterest pin title+description, the T-7/T-2/T-0/T+1 X
posts (≤280 chars each, observatory voice, real numbers), a digest
paragraph, and which standing pages deserve a freshness check."

**P4 — Outreach batch.** "Target category: {widgets | data citations |
resource pages}. Here are 5 candidate sites/writers and their recent
work. Draft 5 personalized pitches (≤120 words each, honest, specific to
their audience, one clear ask, no flattery-spam), plus the follow-up line
for non-responders after 7 days."

**P5 — Digest draft.** "Here is this week's sky-event packet and last
send's stats. Draft the week-ahead digest: subject (≤50 chars, no bait),
preview line, 150–250 word body leading with the week's most concrete sky
fact, one tool link that matches it, one learn link. Site voice; zero
urgency theater."

**P6 — Monthly report.** "Here are the month's scorecard rows and channel
notes. Produce: funnel summary vs last month; verdict on each recurring
activity (keep / fix / kill, with the number that justifies it); the one
experiment for next month with its success metric; and any update this
operating document itself needs."

---

## 12. 90-day roadmap

**Weeks 1–2 — plumbing.** §9 checklist done · GSC baseline captured ·
crawl-hygiene PR merged · pins scheduled · first sky-event packet ships ·
X cadence starts.

**Weeks 3–6 — cadence.** Weekly loop running end-to-end · striking-
distance ritual on clusters 1–2 · authority metadata confirmed/PR'd ·
first 20 outreach pitches sent · feed directories done · (owner option)
email provisioned, first digest sent.

**Weeks 7–12 — compounding.** Day-30 baseline sets real traffic targets ·
clusters 3–4 enter the ritual · data-citation outreach rides the next
major eclipse/retrograde window · first monthly kill/scale report ·
monthly experiment slot running · quarterly review at day ~90 rewrites
targets and re-weights channels in this document.

**Standing rule:** anything that hasn't earned its slot by the monthly
report loses it. The loop, not any single tactic, is the asset.

---

## 13. Escalation — SOL asks the owner before…

Creating/renaming any account · anything touching the Registry wing or its
audiences · any paid spend (currently: none authorized) · any partnership,
collab, or cross-promotion agreement · publishing People-related marketing
beyond linking the 18 indexable profiles · community posts in a venue not
previously approved · anything this document doesn't cover and a
reasonable owner might veto.
