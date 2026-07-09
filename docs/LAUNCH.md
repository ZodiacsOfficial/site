# Going live

The checklist for putting the new site on production zodiacs.org. Vercel
deploys `main`; everything below assumes the release branch
`claude/zodiacs-org-strategy-hevw5u` is green in CI.

## 1. Merge to main

The branch already contains `origin/main` (merged 2026-07-06; the only
content change was `public/assets/pulse.json` advancing to the 2026-07-06
snapshot — git's rename detection maps main's old `assets/` path onto
`public/assets/` cleanly). Merging the PR is all that's left:

1. Open the PR from `claude/zodiacs-org-strategy-hevw5u` to `main` and
   confirm the Vercel preview build passes.
2. Click through the preview: `/`, `/birth-chart/` (run a chart),
   `/aries/`, `/registry/`, `/registry/aries/`, `/thesis/`, `/sdk/`,
   `/sitemap.xml`, `/robots.txt`, `/registry/zodiacs.registry.json`.
3. Merge. A merge commit or squash both produce the same tree.

After the merge, the weekly crons (`pulse-refresh.yml`,
`distribution-refresh.yml`) keep writing the new `public/assets/` paths,
and `transits-monthly.yml` opens a checklist issue on the 25th of each
month for the next month's horoscopes.

## 2. Production checks (first hour)

- `https://zodiacs.org/` renders the new homepage; the hero video plays;
  the ticker shows today's sky.
- Old token URLs still serve: `https://zodiacs.org/registry/aries/` and
  the eleven others (external listings point here).
- `https://zodiacs.org/#verify` forwards into `/registry/#verify`.
- Registry JSON byte-identical:
  `curl -s https://zodiacs.org/registry/zodiacs.registry.json | shasum`
  matches the repo copy.
- Feeds: `/archive/feed.xml` and the SDK ring pages load with styles.

## 3. Search engines

1. **Google Search Console** — verify the property (DNS or the existing
   HTML-file method), then submit `https://zodiacs.org/sitemap.xml`.
2. **Bing Webmaster Tools** — import from GSC (fastest) or verify
   directly; submit the same sitemap.
3. **IndexNow** — the key is already deployed at
   `https://zodiacs.org/d21e17e6-3d58-4604-96d9-3363e13780e2.txt`.
   Ping the moved and new URLs:

```sh
curl -s -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{
    "host": "zodiacs.org",
    "key": "d21e17e6-3d58-4604-96d9-3363e13780e2",
    "keyLocation": "https://zodiacs.org/d21e17e6-3d58-4604-96d9-3363e13780e2.txt",
    "urlList": [
      "https://zodiacs.org/",
      "https://zodiacs.org/birth-chart/",
      "https://zodiacs.org/compatibility/",
      "https://zodiacs.org/moon-sign/",
      "https://zodiacs.org/rising-sign/",
      "https://zodiacs.org/eclipses/",
      "https://zodiacs.org/full-moon-calendar/",
      "https://zodiacs.org/mercury-retrograde/",
      "https://zodiacs.org/learn/",
      "https://zodiacs.org/horoscopes/",
      "https://zodiacs.org/aries/", "https://zodiacs.org/taurus/",
      "https://zodiacs.org/gemini/", "https://zodiacs.org/cancer/",
      "https://zodiacs.org/leo/", "https://zodiacs.org/virgo/",
      "https://zodiacs.org/libra/", "https://zodiacs.org/scorpio/",
      "https://zodiacs.org/sagittarius/", "https://zodiacs.org/capricorn/",
      "https://zodiacs.org/aquarius/", "https://zodiacs.org/pisces/",
      "https://zodiacs.org/registry/", "https://zodiacs.org/registry/aries/",
      "https://zodiacs.org/registry/taurus/", "https://zodiacs.org/registry/gemini/",
      "https://zodiacs.org/registry/cancer/", "https://zodiacs.org/registry/leo/",
      "https://zodiacs.org/registry/virgo/", "https://zodiacs.org/registry/libra/",
      "https://zodiacs.org/registry/scorpio/", "https://zodiacs.org/registry/sagittarius/",
      "https://zodiacs.org/registry/capricorn/", "https://zodiacs.org/registry/aquarius/",
      "https://zodiacs.org/registry/pisces/"
    ]
  }'
```

4. **Rich results** — run three URLs through
   https://search.google.com/test/rich-results once live: a sign guide
   (FAQPage + Article), `/birth-chart/` (SoftwareApplication + FAQPage),
   and `/horoscopes/aries/` (FAQPage). Fix anything flagged before the
   first crawl settles.

## 4. External listings

Work through `LISTINGS.md` §5: the canonical per-sign token URL is now
`https://zodiacs.org/registry/{sign}/`. Update Dex Screener, Jupiter,
CoinGecko et al. as each queue allows; the old top-level URLs serve the
sign guides with a CollectBand link, so nothing 404s while queues drain.

## 5. Watch after launch

- **Search Console coverage** weekly for the first month: expect the 249
  content pages (guides, pairs, learn clusters, placements, horoscopes)
  to index gradually; look for unexpected `noindex`/duplicate flags.
- **Core Web Vitals field data** appears after ~28 days of traffic; the
  lab numbers are green, but confirm LCP on `/` (the hero poster) from
  the field report.
- **Vercel Analytics** — enable in the Vercel dashboard if not already.
- The engine data files age: `src/data/sky.json` + `ingresses.json`
  refresh yearly (`npm run data:sky && npm run data:ingresses`),
  eclipses via `npm run data:eclipses`; the transits cron handles months.

## Owner-gated next steps

Accounts (Supabase), LLM horoscope generation, and the AI astrologer are
specified in `docs/HANDOFF-CODEX.md` and blocked on owner decisions
(project provisioning, API keys, budget) — none block launch.

## Distribution assets (Part O)

- **Feeds** — `https://zodiacs.org/feeds/horoscopes.xml` (12 items,
  refreshes monthly with the transit cron) and
  `https://zodiacs.org/feeds/daily-sky.xml` (one item per day, refreshed
  by the Daily Sky cron). Autodiscovery is wired on /, /transits/, and
  the horoscope pages. Submit to feed directories at will.
- **Embeddable widget** — `https://zodiacs.org/widgets/` has copy-paste
  iframe snippets (dark + light). Offer it to astrology blogs and
  newsletters: it costs their page nothing (zero JS, one request) and
  each embed carries a zodiacs.org backlink. `/embed/*` alone permits
  framing; the rest of the site still sends frame-ancestors 'none'.
- **Pinterest pins** — 25 ready-made 1000×1500 pins under
  `https://zodiacs.org/assets/og/v2/pin/`: `{sign}.png` for the twelve
  guides, `horoscope-{sign}.png` for the twelve horoscope pages, and
  `how-to-read-a-birth-chart.png`. Pin manually with the matching page
  URL until automation exists; astrology is one of Pinterest's largest
  verticals.
