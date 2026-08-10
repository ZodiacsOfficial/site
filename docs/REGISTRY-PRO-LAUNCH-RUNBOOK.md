# Registry Pro Phase 1 launch runbook

This runbook carries the quote-only `/registry/pro/` implementation from a
merged, flag-off state to a possible owner-authorized pilot. It does not
ratify either owner decision, approve a PR, set a Vercel variable, enable a
provider credential, or authorize a public launch by itself.

While `docs/REGISTRY-PRO-OWNER-RISK-DECISION.md` reads DRAFT, stop after the
flag-off merge and verification sections. While
`docs/REGISTRY-PRO-TROLLBOX-OWNER-RISK-DECISION.md` reads DRAFT, keep Floor
Chat off even if the quote laboratory is later authorized.

The existing public Privacy/Terms copy does not describe the new same-origin
quote proxy and onward Jupiter/Raydium flow. No public Production pilot or
externally shared QA is authorized until the owner approves and publishes that
disclosure update through its own reviewed scope. This PR deliberately does
not widen its Registry allowance to make those policy changes.

The current Jupiter SDK & API License Agreement is fee-bearing, incorporates
Jupiter Terms and Privacy obligations, and requires prominent, specific product
attribution plus `Powered by Jupiter`. Its Ultra/Metis examples predate Swap V2.
Before any Jupiter key is used, the owner obtains qualified legal review,
accepts the current terms and portal fees, and gets written confirmation from
Jupiter that `Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode` is the
correct current-product attribution. No preview key is configured before that
confirmation is recorded.

Public Production and externally shared QA also wait for qualified counsel to
record the service's legal operator and operating jurisdiction, the permitted
jurisdictions and visitor classes under current provider and sanctions terms,
and any required geographic or eligibility control. The server-mediated flow
must not be used to evade a provider restriction.

## Gates before merge

1. Confirm the PR is based on the intended branch. If it is stacked on the
   Registry Trading Room PR, target that branch; do not fold these changes into
   the existing PR. Rebase and retarget only deliberately.
2. Pin `.github/phase1-scope-allowance.json` to the actual PR base and list
   exactly the protected Registry Pro paths reported by the scope guard. A
   moving base requires a rebase and a new pin.
3. Confirm the two owner records still read DRAFT and `Approved: (pending)`.
   A code author never self-ratifies them.
4. Confirm no environment file, Vercel setting, secret, deployment alias, or
   committed HTML enables Registry Pro, the quote gateway, or Floor Chat.
5. Retain a verified flag-off deployment as the Instant Rollback target before
   any later protected QA.

## Clean flag-off verification

Run with `PUBLIC_REGISTRY_PRO_ENABLED`,
`PUBLIC_REGISTRY_PRO_CHAT_ENABLED`, `REGISTRY_PRO_QUOTES_ENABLED`, and
`JUPITER_API_KEY` unset:

```sh
npm ci
node scripts/build-registry-pro.mjs
node scripts/configure-registry-pro.mjs
npm test
npm run build
npm run check
node scripts/check-dist.mjs
npm run test:phase1:scope
```

If the PR is intentionally stacked, invoke the scope guard with the documented
stack base rather than pretending the protected diff is against another head.

At a clean tree, prove the page stamper is byte-reversible:

```sh
PUBLIC_REGISTRY_PRO_ENABLED=1 node scripts/configure-registry-pro.mjs
node scripts/configure-registry-pro.mjs
git diff --exit-code
```

Repeat with the chat flag only if the separate Floor Chat record has been
ratified and the implementation includes that gate:

```sh
PUBLIC_REGISTRY_PRO_ENABLED=1 PUBLIC_REGISTRY_PRO_CHAT_ENABLED=1 \
  node scripts/configure-registry-pro.mjs
node scripts/configure-registry-pro.mjs
git diff --exit-code
```

Verify the committed page directly:

- the Registry Pro enabled meta marker is `0`;
- the terminal slot is empty and its runtime script is absent;
- the Floor Chat enabled marker is `0` and no chat shell is mounted;
- the complete risk block and twelve Registry records remain readable;
- the page is `noindex`, out of the sitemap/search corpus, and has no Cabinet
  or consumer-surface acquisition link.

## Disabled gateway verification

Deploying code while the records are DRAFT must leave the endpoint dark. From
a same-origin test harness, verify each configuration independently:

- no `REGISTRY_PRO_QUOTES_ENABLED` returns `404 disabled` without calling a
  provider;
- server enable without `JUPITER_API_KEY` returns `404 disabled` without
  calling Raydium as a partial fallback;
- a cross-origin request, a request without origin/referrer, a non-POST method,
  an oversized body, or invalid intent cannot reach a provider;
- responses carry `private, no-store`, JSON content type, and
  `X-Content-Type-Options: nosniff`;
- no browser asset or built HTML contains the Jupiter key or an execution
  endpoint.

These checks are merge verification, not permission to configure the gateway.

## Owner-authorized protected QA

Do not enter this section until the quote owner record is ratified and the
owner explicitly authorizes one deployment-protected QA environment. Until the
Privacy/Terms dependency is published, access is limited to named engineering
reviewers; do not share the URL with visitors or external testers.

Create the Vercel Firewall SDK rule with rate-limit identifier
`registry-pro-quotes-v1` first: fixed window, 12 requests per 60 seconds,
source-IP key, no persistent action, and it returns `429` after the limit. Scope
it to the authorized Preview and Production environments. Publish it in log
mode first, review the matched traffic, enforce it on the protected Preview,
and only then enforce the same policy in Production. The owner publishes each
firewall draft after reviewing its diff. Add a branch-scoped server secret
`JUPITER_API_KEY` from a dedicated Free-tier Jupiter account with no paid
overage and no other workload. Record the key's non-secret portal label or ID
and Free tier without recording the credential itself. A shared key, paid tier,
overage, or account upgrade requires a new dated owner decision. Then set
`REGISTRY_PRO_QUOTES_ENABLED=1`, and set
`PUBLIC_REGISTRY_PRO_ENABLED=1` for that protected branch only. Do not make any
of them Preview defaults, attach a public domain, or change Production.

Leave `PUBLIC_REGISTRY_PRO_CHAT_ENABLED` unset unless its separate record is
also ratified and the owner explicitly includes the read-only preview in QA.
Never add Supabase, SIWS, chat storage, or posting configuration in this phase.

Verify in the browser and network inspector:

- the Registry Pro meta marker is `1`, the terminal mounts, and the twelve
  official Registry records remain present;
- all twelve signs resolve their identity from the committed Registry;
- no quote is requested on page load or sign selection; one explicit Compare
  action makes one same-origin POST;
- buy and sell inputs preserve exact atomic quantities; Raydium enforces the
  selected 10–100 bps guard while Jupiter independently reports its RTSE
  threshold;
- Jupiter and Raydium answers are independently labelled, timestamped, and
  shown as complete, partial, unavailable, stale, or rate-limited without
  invented values;
- `Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode` remains prominent
  beside the quote form, and each Jupiter result uses the confirmed specific
  product wording without implying partnership or jup.ag equivalence;
- changing market, side, amount, or Raydium guard removes the old comparison,
  and each rendered comparison disappears at its earliest expiry;
- the comparison says `highest quoted output`, never `best execution`, and
  every answer says it is non-executable;
- the public JSON contains no transaction, signature, request ID, execution
  handle, wallet, secret, or raw provider error;
- the upstream Jupiter request contains only input mint, output mint, amount,
  and the secret header; the upstream Raydium request contains only its five
  approved compute parameters and never reaches a transaction endpoint;
- a body containing wallet, taker, receiver, referral, fee, transaction, or
  arbitrary-mint fields cannot cause any such field to reach either provider;
- canonical-pool chart/tape data stays labelled apart from provider routing;
  AMM-derived size views are not called an order book;
- risk copy, `noindex`, CSP, `X-Robots-Tag`, and `Cache-Control: no-store` are
  present, and the service worker holds no Registry Pro navigation in
  CacheStorage;
- browser requests are limited to zodiacs.org, the documented read-only market
  data providers, and Plausible. Jupiter and Raydium quote calls originate from
  the server, not the browser;
- no wallet extension prompt appears anywhere. There is no real-trade test in
  this runbook because Phase 1 cannot prepare, sign, or submit a trade.

If Floor Chat is separately authorized for QA, verify only a clearly labelled
read-only preview: no chat network request, Supabase client, wallet request,
active composer, persisted input, visitor message, or realtime connection.

Remove every branch-specific variable and secret after QA.

## Merge and possible production pilot

Open the PR as draft and describe the quote-only capability matrix, flag-off
guarantee, server-key boundary, provider normalization, independent Floor Chat
decision, protected-scope allowance, and rollback target. Do not merge around a
red required check. Merge only after owner PR approval.

Verify the first production deployment is flag-off. Merging does not carry
forward a protected-preview variable.

Only after the Registry Pro owner record is ratified, the accurate
Privacy/Terms update is published, and all mandatory controls are satisfied may
the owner authorize one Production deployment carrying all three
quote-laboratory values together:

```text
PUBLIC_REGISTRY_PRO_ENABLED=1
REGISTRY_PRO_QUOTES_ENABLED=1
JUPITER_API_KEY=(server secret)
```

The Firewall rule must already exist. Do not set the public flag in a deployment
whose server gate is unavailable, and do not expose an enabled server gate in a
deployment whose page has not passed QA. Redeploy once, then repeat every
protected-QA check against the canonical production URL.

`PUBLIC_REGISTRY_PRO_CHAT_ENABLED=1` is omitted unless the separate Floor Chat
record is ratified and the owner explicitly authorizes that static preview. It
never enables posting.

Record the deployment ID, source SHA, UTC timestamp, reviewer, firewall-rule
ID/policy/test result, the Jupiter key's non-secret label or ID and Free tier,
provider contract result, quote statuses, unexpected-origin audit, and
direct user reports. Do not record amounts, sides, signs, mints, provider
outputs, routes, wallet addresses, keys, request IDs, query strings, or free
text from visitors.

The pilot stops no later than 30 days after its first Production enable unless
a new dated owner decision continues it; record that first-enable timestamp and
exact stop date in the launch receipt. Review during the first production hour
and daily until then. Sustained `429`, `schema_changed`, stale, or unavailable states are not
reasons to retry aggressively; they are reasons to keep the UI honest and, if
the surface is no longer useful, turn it off.

## Stop conditions

Immediately disable the pilot on any of the following:

- a provider returns transaction material or the public response exposes an
  execution handle;
- a wallet address, arbitrary mint, referral, compensation field, API key, raw
  provider body, or visitor free text crosses an unintended boundary;
- a provider endpoint or schema changes outside the strict normalizer;
- the firewall rule is missing, origin enforcement fails, or the endpoint acts
  as an open relay;
- the pilot key is shared, moved to a paid tier, or permitted to incur overage;
- Jupiter's confirmed attribution disappears or its license, incorporated
  terms, portal fees, or product-name requirements change without owner review;
- the recorded operator, jurisdiction, permitted-audience, sanctions, or
  geographic-control basis is absent, changes, or cannot be enforced;
- the UI says or implies best execution, guaranteed execution, an order book,
  exchange operation, or institutional-grade controls;
- noindex/CSP/no-store/service-worker rollback controls fail;
- the page develops prepare, sign, submit, wallet, RPC-write, or live-chat
  capability;
- a rollback drill cannot restore the committed dark page promptly.

Continuation after a stop requires a documented cause, verified remediation,
and a new owner instruction. A new capability requires a new owner decision.

## Emergency rollback

1. Use Vercel Instant Rollback to the retained, verified flag-off production
   deployment. Do not wait for a rebuild.
2. Confirm the production Registry Pro meta marker is `0`, the runtime script
   and terminal are absent, the quote endpoint returns `404 disabled`, and an
   offline navigation cannot recover an enabled page.
3. Remove `PUBLIC_REGISTRY_PRO_ENABLED` and
   `PUBLIC_REGISTRY_PRO_CHAT_ENABLED`, disable
   `REGISTRY_PRO_QUOTES_ENABLED`, and redeploy the current production branch to
   make the dark state durable.
4. If credential exposure is suspected, revoke or rotate the Jupiter key. Do
   not print it while diagnosing the incident.
5. Restore automatic domain assignment only after the durable dark deployment
   and disabled endpoint are independently verified.

Rollback changes configuration, not the committed flag-off bytes. No real
trade can require reconciliation because Phase 1 has no transaction path.
