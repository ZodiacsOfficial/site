# Subject corrections and removals

These pages are about named real people, some of them living. This
directory is the record of every correction, withholding and removal
request, and of what was done about it.

## How a request arrives

The published route is **people@zodiacs.org**, reachable from three
places on the site:

1. a plain text link in the evidence disclosure on every person page
   ("Something wrong here? Ask us to correct or remove it");
2. the same link in the directory footer at `/people/`;
3. the existing contact route on `/about/`, which lists it by name.

No form, no account, no captcha. A request is valid however it arrives —
including by post to the operator address on `/about/` — and a subject
never has to identify which of the three routes they used.

## What we commit to

Best-effort review by a small, largely solo-operated team, in the order
requests arrive, with removal requests from a subject or an authorised
representative taken first. **No numeric response time is published**: a
missed public deadline on a page about a living person is worse than
publishing no deadline at all. The internal working target — not
reader-facing, not a promise — is to acknowledge within a week and to
act on a removal request from a subject within two.

Removal is honoured **regardless of whether the underlying Wikidata
record still exists**, and regardless of whether the facts were correct.
A subject does not have to show that the page is wrong to have it taken
down.

## Intake record

One JSON file per request, named `{yyyy-mm-dd}-{slug}-{n}.json`:

```json
{
  "schema": "zodiacs.phase5.correction-request.v1",
  "receivedAtUtc": "2026-08-01T09:12:00Z",
  "subjectSlug": "example-person",
  "requesterRelationship": "subject | authorised representative | third party",
  "requestType": "correction | noindex | removal",
  "claim": "What the requester says is wrong or unwanted, in their words, quoted.",
  "verifiedAgainst": ["Wikidata QID + revision", "enwiki revision id"],
  "decision": "corrected | withheld | removed | declined",
  "decidedAtUtc": "2026-08-03T16:40:00Z",
  "actions": [
    "manifest record updated: birthDate.storedValue 1918-08-26 → 1918-08-27",
    "suppression.status set to removed",
    "birthday cross-link removed from /birthday/august-26/",
    "sitemap row removed",
    "search-index record removed",
    "OG asset deleted and cache purged",
    "route rebuilt and verified 410"
  ],
  "note": "Free text. Never contains the requester's contact details."
}
```

Contact details are **not** stored here. The record keeps the decision
and the actions, not the person's email or postal address.

## Operational steps

### Upstream conflict or suspected corruption

The cached files in `evidence/` are immutable snapshots of what the upstream
APIs returned. Do not silently rewrite them. Record the decision in
`trust-policy.json` instead:

1. Add the slug to `quarantinedProfiles`, remove it from the index policy, and
   remove its portrait and OG assets. The production builder then omits it
   from the data consumed by routes, the directory, birthday links, related
   profiles, search, the sitemap, and OG generation. A stale public asset is a
   build failure.
2. Verify the disputed facts against authoritative sources. Add a reviewed
   override containing the exact date/place tuple, source URLs, access dates,
   reason, and real review timestamp. Birth time stays unknown unless a future
   separately approved policy permits time evidence.
3. Regenerate only the affected artifacts with
   `PEOPLE_SLUGS=slug-a,slug-b node tools/compute-astro.mjs` and the equivalent
   `compose-copy.mjs` command. Review the chart, copy, source disclosure, and
   correction-log entry in Git.
4. Remove the quarantine only when the generated chart matches the reviewed
   tuple and every trust/content gate passes. An override remains in the
   policy after restoration so a later upstream refresh cannot reinstate the
   rejected claims.

Hard trust failures include invalid or future dates, death before birth,
implausible age at death, a country used as its own birthplace, country-centroid
coordinates, and duplicated place/country labels. They block publication; the
pipeline does not choose a plausible replacement on its own.

### Correction

1. Re-check the disputed fact against the allowed sources and record the
   revision ids consulted.
2. Edit `manifest.json` for that person and re-run
   `tools/compute-astro.mjs`, `tools/compose-copy.mjs`,
   `tools/build-manifest.mjs`, `tools/validate-pilot.mjs`.
3. Rebuild; confirm the page, its birthday cross-link, its OG card and
   its search-index record all carry the corrected fact.
4. File the intake record with `decision: "corrected"`.

### Withholding (noindex)

1. Set `suppression.status` to `noindex`.
2. The route still resolves, but it is served `noindex, nofollow`,
   removed from the sitemap and removed from the search index. The
   birthday cross-link is removed so the page cannot be discovered
   laterally.
3. The reader-facing copy on the withheld page never implies wrongdoing
   by the subject — see the withheld-state copy in the handoff §9.

### Removal

1. Set `suppression.status` to `removed`.
2. The route stops being generated. `/people/{slug}/` returns 410 Gone,
   which is the honest status: the page existed and was deliberately
   withdrawn.
3. Remove: the sitemap row, the search-index record, the birthday
   cross-link, the related-people rails on other pages, the OG asset,
   and any generated share artifact.
4. Submit the URL for removal through the existing IndexNow path and,
   where the operator has access, the search console removal tool.
5. **Retain the record.** `suppression.status: "removed"` stays in the
   manifest forever, and `tools/validate-pilot.mjs` fails closed if a
   removed slug ever reappears in a generated surface. A later ingestion
   pass cannot silently reinstate a removed person.

## Current state

The public directory is in the conservative Phase 5C release. Subject requests
remain recorded here, while material editorial corrections also appear in the
site-wide correction log. The 1 August 2026 reviewed overrides for Sun Yat-sen
and Roberto Clemente are the first upstream-conflict records under the trust
policy; their original pinned snapshots remain available for audit.
