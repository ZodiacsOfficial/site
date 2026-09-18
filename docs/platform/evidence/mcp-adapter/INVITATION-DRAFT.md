> **Superseded.** [`TRIAL-DRAFT.md`](TRIAL-DRAFT.md) replaces this draft: it
> carries the five-step protocol with exact expected values measured against the
> published rc.3 archive, and it keeps every constraint set here. This file is
> left in place as the record of what the invitation looked like first. Neither
> has been sent.

# Builder invitation — prepared, not sent

Nothing here has been posted, sent or published. No outreach was performed, no
advertising was bought, no partner was named, and no one outside this work has
used the adapter. Our own tests are ours and are not adoption.

**Do not send until `https://zodiacs.org/developers/mcp/` returns 200 in
production and the pinned archive downloads at the digest that page publishes.**
Until then the invitation points at nothing and the install command fails.

## The route

The existing approved one: issues on
<https://github.com/ZodiacsOfficial/site/issues>, the same channel
`/developers/support/` already names for engine and data discrepancies. There is
no mailing list, no announcement channel and no ad budget in scope here, and
none is being created.

## The invitation

> There is now a local MCP server for the Zodiacs engine, at
> <https://zodiacs.org/developers/mcp/>. Point an assistant at it and it will
> calculate a natal chart, or read two calculation records and tell you what
> differs between them and how much of it the records can account for. It runs
> on your machine over stdio — no listener, no port, nothing uploaded.
>
> It is an unpublished candidate: install it from the versioned archive, not
> from npm, and check the published digest first.
>
> Three things would be more useful to hear about than anything else:
>
> 1. **A host it does not work with.** It is tested against the Claude Code CLI.
>    The config shapes for Claude Desktop, VS Code and Cursor are quoted from
>    their documentation, not from a run.
> 2. **A comparison it gets wrong.** A pair of records it calls unresolved that
>    you can account for, or a cause it offers that you know is not the cause.
> 3. **A limit that makes it unusable for what you are building** — a house
>    system it does not compute, a date outside 1800–2199, a record format it
>    refuses that it should read.
>
> Use a synthetic chart in anything public. An issue should not carry someone's
> name or real birth details.

## What not to say when sending it

- Not "your birth data never leaves your device". The calculation is local; a
  cloud assistant's conversation is not. The page states the distinction and the
  invitation must not undo it.
- Not "npm install". The package is not published.
- Not a count of tests as a count of users.
- Not an accuracy figure from the synthetic benchmark. It is a regression corpus
  over pairs one engine produced.
