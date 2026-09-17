# Feedback task and announcement — prepared, not sent

Nothing here has been published, posted or sent to anyone. Both drafts are
gated on availability that is not yet verified: at the time of writing, the
chart-difference tool is on a branch and has not merged or deployed.

**Do not post either until `https://zodiacs.org/developers/compare/` returns
200 in production and the page behaves there as it does in the drive.** If that
check fails, the announcement is false and the feedback request points at
nothing.

## The feedback task

Ask for the one thing a browser drive cannot produce: a real disagreement
between two programs that someone actually hit.

> If you have ever had two programs give you different numbers for the same
> birth chart, `/developers/compare/` will read both records and tell you what
> differs and how much of it the files can explain. What would help most is
> hearing where it gets that wrong — a pair it calls unresolved that you can
> account for, a cause it offers that you know is not the cause, or a format it
> refuses that it should read.

Collect against these, which are the claims most likely to be wrong in the
field and are the ones this page can be judged on:

1. A difference it leaves unresolved that the reporter can explain. The
   comparison only ever offers causes it can read out of the two files, so a
   cause that lives outside them — a setting one program does not record — is
   exactly the gap worth knowing about.
2. A cause it offers that is not the cause. Hypotheses are labelled as such,
   but a *plausible* wrong answer at the top of the list is still a wrong answer.
3. A record from the site or the starter that it refuses. It validates with the
   engine's own parser, so a refusal is either a genuinely malformed file or a
   parser gap.
4. A "reproduced" verdict the reporter disputes. This is the strongest claim on
   the page and the most expensive one to get wrong.

Not useful to collect: requests to read other software's formats. The page says
plainly it does not, and widening that is a separate decision with its own
compatibility burden, not a bug report.

## The announcement

Factual, no adjectives about the tool, no claim of availability that has not
been checked. Publish only after the gate above.

> New on zodiacs.org: `/developers/compare/` — load two calculation records and
> see what differs between them, and how much of it the files can explain.
>
> Differences are read from the two files. Causes are labelled by evidence:
> reproduced by a local recalculation, reported by the files, a hypothesis that
> fits, or unresolved. It runs in the browser; your records are never uploaded.
>
> Reads `zodiacs.natal-envelope.draft-v1` records from the site and from the
> developer starter. Not other software's formats.

### The short post

Under 280 characters, and every clause is checkable on the page itself:

> Two programs, same birth chart, different numbers. `/developers/compare/`
> reads both records and says what differs — and labels each cause by whether
> it was reproduced, reported, guessed, or is simply unresolved. Runs in your
> browser; your records are never uploaded.

What it deliberately does not say: that the comparison is accurate (two
receipts from one engine show consistency, not accuracy); that the redacted
export is anonymous (it is not); or that it reads charts from other software
(it does not).

It also says "your records are never uploaded" rather than "nothing is
uploaded". The page carries the site-wide Ask-the-guide widget like every other
page, and a visitor who pastes part of a record into that does upload it. The
narrower claim is the one the tool can actually keep.

The page does not carry the site-wide analytics scripts: it sets
`privateSurface`, as `/profile/` and `/ask/` do. That was added after driving
the deployed page, where analytics is on and a local preview's is off.
