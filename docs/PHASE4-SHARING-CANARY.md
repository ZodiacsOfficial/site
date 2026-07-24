# Phase 4 private sharing loop — canary record

Date: 2026-07-24  
Scope: owner-only private canary; no public launch  
Production merge: `9a975477a380513e3f28145721346b745d9ced61`

## Outcome

The private canary passed. A signed-in, explicitly allowlisted owner created a
positions-only invitation from the harmless committed public-demo chart. A
guest completed the reading locally with a second public historical fixture.
The owner received exactly one completion email. A second guest session made
the same completion attempt without producing a second delivery claim or
mailbox message.

Both Phase 4 flags were returned to off in production and preview. The exact
owner allowlist remains configured, the cleanup path remains active, and no
public creator access was granted. Phase 4 is not publicly launched or
formally complete.

## Released foundation

- PR: `#151`
- Merge SHA: `9a975477a380513e3f28145721346b745d9ced61`
- Merge UTC: `2026-07-24T07:20:56Z`
- Post-merge Site Check: run `30075164453`, attempt 2, `success`
- Site Check completed UTC: `2026-07-24T08:00:18Z`
- The first attempt's only failure was the known unchanged
  `/ru/birth-chart/` Lighthouse timing flake; the failed job was rerun and all
  jobs passed.
- Fable implementation review:
  `751a95f46ba01ff38d1a1020a81b458d21741f06`
- Fable's one P1 responsive overflow finding was fixed before merge. The
  released candidate retained the reviewed copy, hierarchy, privacy boundary,
  motion contract, and static proofs.

## Live database and cleanup

Migration `20260724003109_phase4_compat_invites.sql` is live. Its file digest
is:

`3efb86fbf67dcc270d36ebc4bfcb19d7614c15bc1372b94e69d61b34a492d5ce`

The production verification found:

- all three Phase 4 tables present with RLS enabled;
- no browser policies and no anonymous/authenticated table access;
- service-only RPC execution with fixed search paths;
- immediate terminal destruction of invitation authority and positions;
- one-shot email claims and positions-free lifecycle events;
- no stored birth date, birth time, birthplace, raw email, or recipient
  identity in invitation payloads.

Separate production secrets were provisioned for the cleanup endpoint and the
recipient HMAC. `COMPAT_INVITE_TEST_USER_IDS` contains only the approved owner
account.

Authenticated cleanup workflow run `30076393065` passed on the production
merge while both feature flags were off:

- created: `2026-07-24T07:43:09Z`
- completed: `2026-07-24T07:43:17Z`
- result: `expired=0`, `pruned=0`, `batches=1`

The deterministic PostgreSQL suites separately cover expiry races and the
one-hour deletion pin. No natural date was fabricated or backdated for the
live canary.

## Private preview ladder

Preview deployment:

- on-canary deployment: `dpl_AiDGvN2f264n8yH1xERbdpyf5Sc4`
- private branch alias:
  `https://zodiacs-org-git-codex-phase4-sharing-loop-zodiacsofficial.vercel.app`

Only the approved owner could create. The preview used the committed Frida
Kahlo and Diego Rivera public historical fixtures; no private or current
person's birth data was entered.

The preview proved:

1. Explicit positions-sharing consent was required.
2. The invitation carried a label and computed positions only.
3. Two guest tabs exchanged the same raw link into independent scoped
   sessions without crossing or overwriting one another.
4. The guest completed the reading locally.
5. A reload of the second tab after completion could not reopen the
   invitation.
6. The guest's send-back action produced the client-rendered result artifact
   and a private `#s=` positions-only link.
7. The returned link opened as a settled reading with its provenance band.
8. The owner register changed to `Reading done` and truthfully reported that
   the carried positions were deleted.
9. A separate invitation was ended by the owner; its link then returned the
   generic unavailable state.
10. Both terminal records had `token_hash = null` and `positions = null`.
    The live forbidden-storage check returned zero.

The preview completion occurred at
`2026-07-24T07:57:31.128735Z`; the revocation occurred at
`2026-07-24T08:07:46.205807Z`.

## Owner-only production email canary

The temporary owner-only production build was:

- deployment: `dpl_ArCVD31oGJAxnwfnYnLLBsRNGHpc`
- URL: `https://zodiacs-rf0nbu7ay-zodiacsofficial.vercel.app`
- aliased to `zodiacs.org` only for the bounded canary

The first temporary enable attempt remained safely off because its literal
flag value contained a trailing line break and therefore failed the strict
`=== "1"` check. The values were corrected without changing the allowlist,
and a fresh build was used. No unintended access occurred during the failed
attempt.

The real production lifecycle was:

| Evidence | UTC |
| --- | --- |
| Invitation created | `2026-07-24T08:32:00.660739Z` |
| First guest session opened | `2026-07-24T08:33:03.925383Z` |
| Reading completed; authority and positions destroyed | `2026-07-24T08:34:17.656670Z` |
| Email claim reserved | `2026-07-24T08:34:18.112200Z` |
| Email claim finalized | `2026-07-24T08:34:18.469881Z` |

Final database receipt:

- invitation status: `completed`;
- invitation-specific email choice: `true`;
- token authority destroyed: `true`;
- positions destroyed: `true`;
- replay digest retained for safe idempotency: `true`;
- lifecycle events: exactly `created`, `opened`, and `completed`;
- delivery state: `sent`;
- provider HTTP status: `200`;
- provider receipt present: `true`;
- delivery claims for the invitation: `1`;
- forbidden stored-field count: `0`.

The approved `admin@zodiacs.org` mailbox received exactly one message:

- subject: `Your invitation was read`;
- sender: `Zodiacs.org <hello@zodiacs.org>`;
- mailbox time: `2026-07-24T08:34Z`;
- content truthfully stated that the reading stayed on the guest's device,
  the link closed, and its positions were deleted.

A second guest tab had exchanged the invitation before completion. After the
first completion, that tab ran the same fixture comparison. The reading still
rendered locally, but the database retained exactly one finalized delivery
claim and the mailbox search retained exactly one matching message. No second
email was sent.

## Rollback and final private state

Both production flags were set back to exact `0` values and production was
rebuilt from the canary source:

- final flag-off deployment: `dpl_C5NuAAZm65p1U7uu569jFJZpDqfW`
- URL: `https://zodiacs-mkrxix9yp-zodiacsofficial.vercel.app`
- live verification UTC: `2026-07-24T08:43:57Z`

Final production checks:

- the signed-in owner profile showed `Invitations are off right now`;
- no creation control was present;
- `/c/not-a-real-token/` returned `303` to the generic unavailable state;
- the private route retained `Cache-Control: private, no-store`;
- it retained `X-Robots-Tag: noindex, nofollow, noarchive`.

The preview flags were also returned to exact `0` values and rebuilt:

- final flag-off preview deployment: `dpl_AMXz2LNvWtBrsC2aHakRjyA32MGF`
- URL: `https://zodiacs-auwck7fla-zodiacsofficial.vercel.app`
- the compiled compatibility page contained no invitation UI.

No invitation row or evidence row was manually deleted. Terminal skeletons
remain only for the reviewed 30-day evidence window and will be removed by the
authenticated cleanup path.

## Non-blocking observation

The owner register's first status check intermittently showed its safe
`Statuses may be out of date` fallback before a reload succeeded. Creation,
revocation, completion, and the final flag-off state all worked. No unsafe or
incorrect state was exposed. Treat this as a P2 reliability observation for a
future bounded backlog, not permission to expand this canary.

## Remaining gates

1. Fable performs a bounded read-only review of the live private-canary
   evidence against the committed handoff.
2. The owner gives a separate explicit approval for public launch.
3. Any public authorization change is reviewed and released separately.

Until all three happen, keep both Phase 4 flags off, retain the exact owner
allowlist, and do not begin Phase 5.
