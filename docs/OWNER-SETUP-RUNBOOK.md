# Owner setup runbook

The remaining audit items that need dashboard logins or a legal decision,
written for doing them without prior experience. Each section stands alone;
the order is by impact per minute. Everything code-side is already merged —
these steps only flip switches and paste values.

Total time: about two hours, plus DNS propagation waits.

---

## 1. Two account-hygiene fixes (15 minutes)

### 1a. Supabase: turn on leaked-password protection

Free, and it must be on before the app ever adds a password sign-in.

1. Sign in at https://supabase.com/dashboard and open the **Zodiacs.org**
   project.
2. In the left sidebar open **Authentication**, then look for the email
   sign-in settings (currently under **Sign In / Providers** → **Email**;
   if the menu has moved, type "password" into the dashboard search).
3. Enable **"Prevent the use of leaked passwords"** (the HaveIBeenPwned
   check) and save.

### 1b. Vercel: move the project off the Hobby plan

The site runs a commercial wing (Registry/token pages) on a Hobby plan,
which Vercel's terms restrict to non-commercial use — and the rate-limit
rules in §3 need Pro anyway.

1. Sign in at https://vercel.com, open the **zodiacsofficial** team.
2. **Settings → Billing → Upgrade to Pro** (US$20/month at time of
   writing).

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
   decrypts on your machine:
   ```
   gpg --decrypt --batch --passphrase "YOUR-PASSPHRASE" zodiacs-db-*.sql.gz.gpg | gunzip | head
   ```
   You should see SQL. After that it runs every Monday by itself and keeps
   90 days of history. Restores go into a fresh Supabase project first,
   never straight over the live one (full runbook in `docs/SUPABASE.md`).

## 3. Two rate-limit rules in the Vercel firewall (10 minutes, needs Pro)

The code already calls these rules by ID; they engage the moment the rules
exist and are inert until then.

1. Vercel → **zodiacs-org** project → **Firewall** tab → **Configure /
   New Rule**, choose the **Rate limit** action.
2. Rule one — email capture:
   - Condition: **Request Path** equals `/api/email/subscribe`
   - Rate limit: **10 requests per 60 seconds**, keyed by IP address
   - Action when exceeded: **Deny**
   - **Rate Limit ID: `zodiacs-email-subscribe`** — this exact string;
     the code matches on it.
3. Rule two — Aura holdings (the code for this one shipped earlier and
   expects the ID `registry-aura-holdings-v1`): same shape, path
   `/api/aura-holdings`, **10 requests per 60 seconds** per IP, Deny.
4. Save and deploy the firewall changes.

## 4. Turning on the retention stack, in order

Everything below is merged, tested, and flag-off. Do the steps in order —
each one builds on the last. Stop at any point; nothing half-configured
breaks the site.

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

Also add secret `DAILY_EMAIL_POSTAL_ADDRESS` — a real physical mailing
address (see §5; a PO box works). Both email pipelines refuse live sends
without one.

Verify: **Actions → Weekly Digest → Run workflow** with dry-run on, read
the log, then let the Monday schedule take over.

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

## 5. The legal identity decision (the one only you can make)

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
pages, and the `DAILY_EMAIL_POSTAL_ADDRESS` value from §4b. A PO box or
registered-agent address satisfies the email-footer requirement without
publishing a home address.

## 6. Verification checklist

- [ ] Supabase security advisor shows no leaked-password WARN
- [ ] Database Backup run is green and the artifact decrypts locally
- [ ] `curl -X POST https://zodiacs.org/api/email/subscribe` eleven times
      quickly returns a 429 with `Retry-After` (rule live)
- [ ] Digest dry-run log looks right; first Monday send arrives
- [ ] Signup box renders on the homepage footer and the confirm email lands
- [ ] Terms no longer contains the "pending disclosure" paragraph
