# Retention activation runbook

Every retention loop is built, tested, and off. This is the one page that
says what exists, which switches turn each loop on, and in what order to
flip them. Secrets/vars mechanics live in `SETUP.md` — this page sequences
them. Written 2026-08-31 against the audit's §4 recommendation to "light
the dormant retention stack"; update it as loops go live.

## Current state (2026-08-31)

| Loop | Code | Live? | Gate(s) |
|---|---|---|---|
| Saved charts (this device) | `src/lib/profile/` | **Yes** | none — always on |
| Personalized Today + streak | `/today/`, `TodayBrief` | **Yes** (EN only) | none — localStorage |
| Cross-device chart sync v2 | `src/lib/account-v2/` | No | `PUBLIC_ACCOUNT_SYNC_V2_ENABLED=1` **and** `PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK=1` (Vercel) |
| Weekly digest | `scripts/send-weekly-digest.ts` | No | GitHub `vars.DIGEST_ENABLED=true` + `weekly-digest-production` secrets; opt-in checkbox behind Vercel `PUBLIC_WEEKLY_DIGEST_ENABLED=1` |
| Daily email (test cohort) | `scripts/send-daily-email.ts` | No (rolled back) | GitHub `vars.DAILY_EMAIL_ENABLED=1` + allowlist + secrets; enrollment additionally Vercel `DAILY_EMAIL_ENABLED=1` + full Resend/Supabase set |
| Daily email (everyone) | same | No | not reachable by config — the committed workflow pins `DAILY_EMAIL_COHORT=test` and never passes `DAILY_EMAIL_ALL_APPROVED`; widening it is a deliberate code change |
| Web push | `scripts/send-daily-push.mjs`, `public/sw.js` | No | VAPID pair + Vercel `PUBLIC_WEB_PUSH_ENABLED=1` + `PUSH_ENABLED=1` + rebuild (postbuild restamps `sw.js`) + GitHub `vars.PUSH_ENABLED=true` |

The committed `public/sw.js` ships `PUSH_ENABLED = false`; only a build with
both push flags set restamps it. Committed state stays flag-off — CI drift
gates regenerate with flags unset.

## Suggested order

1. **Weekly digest first.** It is config-only, has a shipped opt-in surface,
   an 80-recipient hard cap, and a fixture dry-run in every CI run. Steps:
   apply the pending unsubscribe-capability migration, run the fixture
   dry-run, one limit-one live canary, confirm the unsubscribe `POST`
   end-to-end (`SETUP.md` §activation), then set `vars.DIGEST_ENABLED=true`
   and `PUBLIC_WEEKLY_DIGEST_ENABLED=1` together. Until both are on, the
   profile checkbox stays hidden (as of 2026-08-31) instead of promising a
   send that never happens.
2. **Account sync v2.** Unblocks cross-device retention and the digest's
   audience quality. Two flags flip together after the preview checklist.
3. **Daily email to the test cohort.** Re-run the postal-address and
   allowlist gates that rolled it back; the general audience stays a
   deliberate later code change, not a flag.
4. **Push last.** Deepest interlock (four switches + VAPID), smallest
   audience; note the deliberate string mismatch — Vercel wants
   `PUSH_ENABLED=1`, GitHub wants `PUSH_ENABLED=true` (`SETUP.md`).

## What stays code, not config

- General-audience daily email (`DAILY_EMAIL_ALL_APPROVED` is never passed
  by the committed workflow; adding a cohort input is the release act).
- Localized Today and localized daily-email capture (`EmailCapture.astro`
  is EN-only by construction; no `/{locale}/today/` routes exist).
- Any homepage-level invitation to the loops — add it only once the loop it
  advertises is actually sending.
