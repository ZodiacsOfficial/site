# Owner setup runbook

The remaining audit items that need dashboard logins or a legal decision,
written for doing them without prior experience. Each section stands alone;
the order is by impact per minute. Everything code-side is already merged —
these steps only flip switches and paste values.

Total time: about two hours, plus DNS propagation waits.

---

## 1. Two account-hygiene fixes (15 minutes)

### 1a. Vercel: move the project off the Hobby plan

The site runs a commercial wing (Registry/token pages) on a Hobby plan,
which Vercel's terms restrict to non-commercial use — and the rate-limit
rules in §3 need Pro anyway.

1. Sign in at https://vercel.com, open the **zodiacsofficial** team.
2. **Settings → Billing → Upgrade to Pro** (US$20/month at time of
   writing).

### 1b. Supabase: leaked-password protection (deferrable)

Correction from the first draft of this runbook: this toggle is **Pro
Plan and above** on Supabase, not free — and because the site is
magic-link-only, no passwords exist for it to protect today. It matters
the day password sign-in ships (the native app may bring that). So:
either defer this entirely, or if/when the Supabase org is on Pro:

1. Sign in at https://supabase.com/dashboard and open the **Zodiacs.org**
   project.
2. In the left sidebar open **Authentication**, then look for the email
   sign-in settings (currently under **Sign In / Providers** → **Email**;
   if the menu has moved, type "password" into the dashboard search).
3. Enable **"Prevent the use of leaked passwords"** (the HaveIBeenPwned
   check) and save.

The live security advisor will keep showing a WARN for this until it is
on; with magic-link-only auth that WARN is acceptable.

## 2. Backups live in ten minutes

The weekly encrypted backup workflow is already merged
(`.github/workflows/db-backup.yml`). It stays a visible no-op until two
repository secrets exist.

1. Get the database connection string: Supabase Dashboard → **Zodiacs.org**
   → the **Connect** button in the top bar → **Session pooler** → copy the
   URI. It looks like
   `postgresql://postgres.mftpcdpttteuwbolobye:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`.
   If you don't know the database password, reset it first under
   **Project Settings → Database → Reset database password** and paste the
   new one into the URI.
2. Create a long random passphrase (30+ characters — use your password
   manager's generator) and **save it in the password manager**. A backup
   cannot be decrypted without it; losing it makes every backup useless.
3. On GitHub, open `ZodiacsOfficial/site` → **Settings → Secrets and
   variables → Actions → New repository secret** and add both:
   - `SUPABASE_DB_URL` — the full URI from step 1 (password filled in)
   - `BACKUP_PASSPHRASE` — the phrase from step 2
4. Verify once: repo → **Actions → Database Backup → Run workflow**. When
   it goes green, download the artifact from the run page and confirm it
   decrypts on your machine (gpg prompts for the passphrase — never type
   it into a command line, where shell history keeps it):
   ```
   gpg --decrypt zodiacs-db-*.tar.gz.gpg | tar xz
   head backup.sql
   ```
   You should see SQL, plus an `auth-map.sql` beside it (the account
   UUID↔email mapping). Delete both decrypted files afterwards. After
   that the job runs every Monday by itself and keeps 90 days of history.
5. Two honest caveats. This repository is public, so anyone with a GitHub
   account can download the encrypted artifact — the passphrase is the
   only wall, which is why it must be long, random, and never typed into
   commands or chats. And decrypting is not yet a restore: once, within
   the first month, do a real drill — create a throwaway free Supabase
   project, `psql` the two files into it (`backup.sql` first, then
   `auth-map.sql`), click around the tables, then delete the project.
   Restores always go into a fresh project first, never straight over the
   live one (full runbook in `docs/SUPABASE.md`).

## 3. Rate-limit rules in the Vercel firewall (10 minutes, needs Pro)

The code already calls these rules by ID; they engage the moment the rules
exist and are inert until then. Correction from the first draft of this
runbook: these are **`@vercel/firewall` SDK rules**, not path rules — the
rule's **If** condition is the SDK condition type carrying the Rate limit
ID, never a Request Path match, and you leave the rule's **Then** action
at its default. The API code itself answers over-limit requests with a
429 and a `Retry-After` header; a path-matched Deny rule would instead
403 everything at the edge, which is not what the code expects.

For each ID below (per https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk):

1. Vercel → **zodiacs-org** project → **Firewall** in the sidebar →
   **Configure** (top right) → **+ New Rule**.
2. Name the rule after the ID.
3. In **Configure**, for the first **If** condition select
   **`@vercel/firewall`**, and paste the ID as the **Rate limit ID** —
   the exact string, the code matches on it.
4. Set **Rate Limit** to **10 requests per 60 seconds** (keying stays the
   default — the code buckets by client IP) and leave **Then** at its
   default.
5. **Save Rule**, then **Review Changes → Publish**.

The IDs the code exports today:

| Rate limit ID | Endpoint it protects |
| --- | --- |
| `zodiacs-email-subscribe` | `/api/email/subscribe` |
| `registry-aura-holdings-v1` | `/api/aura-holdings` |
| `zodiacs-wallet-birth` | `/api/wallet-birth` |
| `zodiacs-transit-calendar` | `/api/calendar/transits` |

The first two are the priority (they can send email / hit upstreams);
the last two are cheap to add while you're in the dashboard.

## 4. Turning on the retention stack, in order

Everything below is merged, tested, and flag-off. Do the steps in order —
each one builds on the last. Stop at any point; nothing half-configured
breaks the site.

**One hard prerequisite: finish §5 (legal identity) before 4c.** The
moment the capture boxes go live the site is collecting EU personal data
in five languages, and the privacy pages must already name the data
controller and a contact address (GDPR Art. 13 wants that at the moment
of collection, not after). 4a and 4b dry-runs are fine before §5; live
capture is not.

### 4a. Resend account + domain (one-time, ~20 minutes + DNS wait)

1. Create an account at https://resend.com (free tier: 3,000 emails/month
   — plenty to start).
2. Resend → **Domains → Add Domain** → `zodiacs.org`. Resend shows 2–3 DNS
   records (DKIM/SPF).
3. Add those records where the domain's DNS lives. If the domain uses
   Vercel DNS: Vercel → team **Domains** → `zodiacs.org` → **DNS Records**
   → add each record exactly as Resend shows it. Wait for Resend to show
   **Verified** (minutes to a few hours).
4. Resend → **API Keys**: create TWO keys — one with **Sending access**
   only (this becomes `RESEND_API_KEY`) and one **Full access** (this
   becomes `RESEND_CONTACTS_API_KEY`).
5. Resend → **Audiences**: note the audience/segment ID for the weekly
   list (`RESEND_SEGMENT_ID`); create a second one later for the daily
   list (`RESEND_DAILY_SEGMENT_ID`).

### 4b. Weekly digest (the cheapest live channel)

Signed-in users who ticked the digest box on `/profile/` get a Monday
email. Configure the GitHub workflow (repo → **Settings → Secrets and
variables → Actions**):

Secrets: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase →
Project Settings → API keys → service_role — never goes anywhere else),
`DIGEST_UNSUBSCRIBE_SECRET` (generate: `openssl rand -base64 32`).

Variables (the **Variables** tab, not Secrets): `PUBLIC_SUPABASE_URL` =
`https://mftpcdpttteuwbolobye.supabase.co`, `DIGEST_ENABLED` = `true`,
optional `DIGEST_FROM_EMAIL` = `Zodiacs.org <hello@zodiacs.org>`.

The sender's physical mailing address rides in as the repository
**variable** `DAILY_EMAIL_POSTAL_ADDRESS` (not a secret — it prints in
every email footer). Per `docs/PHASE3-HABIT-FABLE-REVIEW.md` it is
already set from the daily-email pilot; just confirm it exists under the
**Variables** tab and still matches the address in §5. Both email
pipelines refuse live sends without it.

Verify: **Actions → Weekly Digest → Run workflow** with dry-run on, read
the log. Then do one real canary before trusting the schedule: run the
workflow again with dry-run off and **limit 1** (your own address should
be the only digest-opted-in account at that point), and check the email
that arrives — footer address, unsubscribe link. Only then let the
Monday schedule take over. One capacity note while on Resend's free
tier: it caps at 100 emails/day as well as 3,000/month, so keep the
workflow's limit at or below 100 until the plan is upgraded (the default
is 200).

### 4c. Email capture on the site (weekly list signup boxes)

Vercel → **zodiacs-org → Settings → Environment Variables**, environment
**Production**:

```
EMAIL_PROVIDER            resend
RESEND_API_KEY            (sending key)
RESEND_CONTACTS_API_KEY   (full-access key)
RESEND_FROM_EMAIL         Zodiacs.org <hello@zodiacs.org>
RESEND_SEGMENT_ID         (audience ID from 4a)
EMAIL_CONFIRM_SECRET      (openssl rand -base64 32)
```

Redeploy (Vercel → Deployments → ⋯ on the latest → Redeploy). The capture
boxes appear on the site and every signup is double-opt-in.

### 4d. Daily sun email (optional, after 4c proves out)

Add to the same Vercel env: `DAILY_EMAIL_ENABLED=1`,
`RESEND_DAILY_SEGMENT_ID`, `DAILY_EMAIL_UNSUBSCRIBE_SECRET`,
`DAILY_EMAIL_RECIPIENT_HASH_SECRET` (both `openssl rand -base64 32`), and
mirror them into the GitHub Actions secrets the **Daily Email** workflow
lists. Run its dry-run first, same as the digest.

### 4e. Web push (optional)

1. Generate keys once, locally: `npx web-push generate-vapid-keys`.
2. GitHub → **Variables**: `PUSH_ENABLED` = `true`, `VAPID_PUBLIC_KEY`,
   `VAPID_SUBJECT` = `mailto:hello@zodiacs.org`;
   **Secrets**: `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Vercel env: `PUSH_ENABLED=1`, `PUBLIC_WEB_PUSH_ENABLED=1`, plus the
   same VAPID pair (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Redeploy.
4. The **Daily Push** workflow has a dry-run dispatch — use it first.

### 4f. Community features (flags only, no accounts needed)

When ready, each is one Vercel env var + redeploy:
`PUBLIC_COMPAT_INVITES_ENABLED=1` (compatibility invites),
`PUBLIC_ZODIAC_GAMES_ENABLED=1` (the seasonal Race). Leave the Registry
flags (`PUBLIC_REGISTRY_TRADE_ENABLED`, `PUBLIC_REGISTRY_EXCHANGE_ENABLED`,
`PUBLIC_REGISTRY_COLLECTION_ENABLED`) off unless you deliberately decide
otherwise — the audit's recommendation is to keep the swap venue dark.

## 5. The legal identity decision (the one only you can make — and it gates §4c)

`/terms/` currently says, honestly, that the operator's legal identity and
governing jurisdiction are unconfirmed — while the domain collects EU
emails in five languages and hosts a token registry. Two realistic paths:

- **Operate as yourself.** Put your legal name (or a registered trade
  name), country, and a mailing address in the Terms and Privacy pages.
  Free, honest, fine for the free astrology product — but your personal
  liability sits behind the wing's token content.
- **Form a company** (a US single-member LLC or your country's
  equivalent; typically US$50–500/year). Recommended before the swap
  venue or the paid app ever go live: it gives the site a named data
  controller for GDPR purposes and a liability shield for the wing.

Whichever you choose, the same three edits follow (any Claude session can
make them once you say the words): the operator paragraph in
`src/pages/terms/index.astro`, the contact/controller line in the privacy
pages, and the `DAILY_EMAIL_POSTAL_ADDRESS` variable from §4b. A PO box
or registered-agent address satisfies the email-footer requirement
without publishing a home address.

One mechanical note for whoever makes those edits: the localized privacy
pages sit inside the Phase 1 protected scope, so the change must ship
with a fresh `.github/phase1-scope-allowance.json` — pinned to the PR's
base commit and listing exactly the protected files it touches (the
scope-guard README in `scripts/phase1-scope-guard.mjs` describes the
shape; the previous allowance was spent when PR #291 merged and cannot
be reused). This edit is owner-directed by this runbook, which is the
authorization the allowance file records.

## 6. Verification checklist

- [ ] Database Backup run is green, the artifact decrypts locally, and
      one restore drill into a throwaway project has been done
- [ ] Rate-limit rule live: run
      `curl -X POST -H "Origin: https://zodiacs.org" https://zodiacs.org/api/email/subscribe`
      twelve times quickly — the last ones return **429** with
      `Retry-After`. (Without the `Origin` header every attempt returns
      403 from the same-origin guard, which proves nothing about the
      rule.)
- [ ] Digest dry-run log looks right; limit-1 canary email arrives with
      the postal footer; first scheduled Monday send arrives
- [ ] Signup box renders on the homepage footer and the confirm email lands
- [ ] Terms no longer contains the "pending disclosure" paragraph
- [ ] (Only if password auth ever ships / org is on Supabase Pro) the
      leaked-password WARN in the security advisor is cleared
