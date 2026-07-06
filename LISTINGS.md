# Listings & Distribution Playbook

Operational checklist for making the Twelve discoverable off-site: token
profiles, verified lists, aggregator listings, and search indexing. This is
an internal document — none of this copy ships on the site itself.

Keep all submitted copy factual and registry-toned: official record,
verified addresses, cultural asset. No price talk, no promises, no urgency.

## Canonical facts

Source of truth: [`registry/zodiacs.registry.json`](registry/zodiacs.registry.json).
Never submit an address from memory — copy from the registry.

| Sign | Ticker | Solana mint (native) | Base ERC-20 (bridged) | Dex Screener pair (SOL quote) |
| --- | --- | --- | --- | --- |
| Aries | ARIES | `GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv` | `0x3ffB5282F5891Dd8c813E64059EdB0607537eC91` | `HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS` |
| Taurus | TAURUS | `EjkkxYpfSwS6TAtKKuiJuNMMngYvumc1t1v9ZX1WJKMp` | `0xd5356c6E529569c6912978433DAfb7ca72B5f09C` | `2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu` |
| Gemini | GEMINI | `ARiZfq6dK19uNqxWyRudhbM2MswLyYhVUHdndGkffdGc` | `0x8F6eb25aB4CD2F8f064f7da5E35136D4EC600b4f` | `HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9` |
| Cancer | CANCER | `CmomKM8iPKRSMN7y1jqyW1QKj5bGoZmbvNZXWBJSUdnZ` | `0xb9Fd3c3157C7b69260Ca285FbbC74F6309226378` | — not indexed (see below) |
| Leo | LEO | `8Cd7wXoPb5Yt9cUGtmHNqAEmpMDrhfcVqnGbLC48b8Qm` | `0x4f7B4c12DE5d47314C86Ed3BA25E289aA139CF75` | `48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ` |
| Virgo | VIRGO | `Ez4bst5qu5uqX3AntYWUdafw9XvtFeJ3gugytKKbSJso` | `0xAcFd97106bbE5D931aC430Be76A8E362832D48f4` | `5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh` |
| Libra | LIBRA | `7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe` | `0x4201eff5F419CD6EEDFb28fa240edeaFc9002204` | `DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9` |
| Scorpio | SCORPIO | `J4fQTRN13MKpXhVE74t99msKJLbrjegjEgLBnzEv2YH1` | `0x0057C9cB6D16C2ecA808788f14d0d0c367b26676` | `3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta` |
| Sagittarius | SAGITTARIUS | `8x17zMmVjJxqswjX4hNpxVPc7Tr5UabVJF3kv8TKq8Y3` | `0xD21fAb1EB5E11AC3C281F7cF8096eCC4683eEa9c` | — not indexed (see below) |
| Capricorn | CAPRICORN | `3C2SN1FjzE9MiLFFVRp7Jhkp8Gjwpk29S2TCSJ2jkHn2` | `0xbFB102C18FDf49f2ffCB9B3aF4522f7DC9f51018` | `549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin` |
| Aquarius | AQUARIUS | `C49Ut3om3QFTDrMZ5Cr8VcTKPpHDcQ2Fv8mmuJHHigDt` | `0xccA7CD4F96336Fd26eF6c5F579eaC651bAC5535F` | `BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv` |
| Pisces | PISCES | `3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE` | `0x43fA1855a89b7A3e07426Fa7a1B44b4187d29Daf` | `Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko` |

## Shared submission copy

Short description (≤ 160 chars):

> One of the Twelve — the official tokenized Zodiacs. Native on Solana,
> bridged to Base, recorded in the public Zodiacs.org registry.

Long description:

> {Sign} is one of the Twelve — the official tokenized Zodiac signs,
> recorded in the public registry at Zodiacs.org. Each sign has one
> canonical identity: a native Solana SPL asset and an official bridged
> Base ERC-20 representation (via Wormhole). The registry, a read-only
> verification SDK, and a per-sign catalogue page (lore, provenance,
> official addresses) are published at zodiacs.org. Related consumer
> experiences are maintained by Astrofolio (astrofolio.xyz).

Official links (use everywhere, consistently):

- Website: `https://zodiacs.org/` · per-sign token page: `https://zodiacs.org/collect/{sign}/`
  (the catalogue moved under the collector's wing in 2026 — top-level
  `/{sign}/` URLs are now the astrology guides, which link the record
  prominently; update older listings to the `/collect/` form when touched)
- Registry JSON: `https://zodiacs.org/registry/zodiacs.registry.json`
- X / Twitter: `https://x.com/astrofoliosol`
- Instagram: `https://www.instagram.com/astrofolioonsol/`
- TikTok: `https://tiktok.com/@astrofolio`
- Telegram: `https://t.me/astrofoliosol`
- Related app: `https://astrofolio.xyz/`
- GitHub: `https://github.com/ZodiacsOfficial`
- Per-sign share image (1200×630): `https://zodiacs.org/assets/og/{sign}.png`
- Icon (square-ish PNG): `https://zodiacs.org/assets/icons/{sign}.png`

## 1. Dex Screener token profiles

Where traders already look. For each of the twelve tokens:

1. Open `https://dexscreener.com/solana/{pairId}` and use **Update token
   info** (Dex Screener's Enhanced Token Info is a paid, per-token
   service ordered through marketplace.dexscreener.com).
2. Submit: website (`https://zodiacs.org/collect/{sign}/`), the social links above,
   the icon, and the per-sign OG image as the header image.
3. The watchlist of the official pairs already exists:
   `https://dexscreener.com/watchlist/p2GfMO2bnsxdOCEwYTCD` — keep it in bios.

**Cancer and Sagittarius have no indexed pair.** Dex Screener indexes
pairs automatically once a liquidity pool exists on a supported DEX
(Raydium, Orca, Meteora…). Confirm whether pools exist for these two
mints; if not, that's a liquidity decision, not a listing form. Once a
pool is indexed, add its pair ID to `MARKET_PAIRS` in
`scripts/sign-data.mjs`, run `node scripts/build-sign-pages.mjs`, and the
catalogue pages + market panels pick it up.

## 2. Jupiter Verify (verified token list)

Removes the "unverified" warning in Jupiter and most Solana wallet swap UIs.

1. Go to `https://verify.jup.ag/` and submit each of the twelve mints.
2. Verification is community-vote based; the form asks for the mint,
   website, X account, and a short description — use the shared copy above.
3. Before submitting, make sure each token's on-chain Metaplex metadata
   (name, symbol, logo URI) matches the registry — mismatches are the
   most common rejection reason.
4. Track status per mint; resubmission after fixing metadata is allowed.

## 3. CoinGecko application

Form: `https://www.coingecko.com/en/coins/new` (one application per token,
or request a batch listing for the set via their support portal).

They will ask for: project name (`Zodiacs — {Sign}`), ticker, chain +
contract (Solana mint; list the Base address as an additional chain),
website, block explorer links (`https://solscan.io/token/{mint}`,
`https://basescan.org/token/{baseAddress}`), socials, logo (use the icon
PNG), description (shared copy), launch date (2024 Solana mint — confirm
exact date from the mint transaction), and proof you represent the
project (apply from a registered team email; reference the registry and
the GitHub org).

CoinGecko favors: live pairs with consistent volume, working website,
matching socials, verified Jupiter status. Apply after steps 1–2.

## 4. CoinMarketCap application

Form: `https://support.coinmarketcap.com/` → "Add cryptoasset". Same
material as CoinGecko. CMC additionally asks for a rich-list/explorer
link per chain and may request the Wormhole bridge attestation for the
Base representation — link the bridge record from the registry.

## 5. Search indexing

- `sitemap.xml` is generated at build time and covers both wings (the
  astrology site and the collector's wing); `llms.txt` / `llms-full.txt`
  cover AI crawlers.
- IndexNow: the site key file is deployed at the root
  (`https://zodiacs.org/{key}.txt`). After significant page changes, ping:

  ```sh
  curl -s -X POST https://api.indexnow.org/indexnow \
    -H 'Content-Type: application/json; charset=utf-8' \
    -d '{"host":"zodiacs.org","key":"<key>","keyLocation":"https://zodiacs.org/<key>.txt","urlList":["https://zodiacs.org/","https://zodiacs.org/aries/","https://zodiacs.org/collect/aries/", "…"]}'
  ```

- Google Search Console and Bing Webmaster Tools: verify the domain
  (DNS TXT or the existing HTML route) and submit
  `https://zodiacs.org/sitemap.xml`. This is a one-time owner action.

## Order of operations

1. Jupiter Verify (fixes wallet warnings everywhere; prerequisite hygiene
   for everything else).
2. Dex Screener token profiles (website + socials visible where traders are).
3. Cancer / Sagittarius liquidity → pair indexing → registry-driven pages
   pick up market context.
4. CoinGecko, then CoinMarketCap (both favor the footprint created by 1–3).
5. Search console submissions + IndexNow pings as content ships.
