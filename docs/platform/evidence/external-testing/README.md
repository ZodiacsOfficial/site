# External testing packet — prepared, not sent

Nothing here has been sent, posted or published. No one has been recruited,
hired or paid. No recipients are named, and none are to be invented. No
advertising was bought and no account was created for any of this.

Written 2026-09-18 against adapter `0.1.0-rc.6`, engine `0.1.1-rc.6`, starter
`0.1.0-rc.4`. Before sending anything, re-check that the live pages still
advertise those versions; the expected values below were measured against them.

## Three categories that are not the same thing

Keeping these apart is the point of this file, and the reason to write it down
before anyone is contacted rather than after.

| | what it is | what it is not |
| --- | --- | --- |
| **Paid testing** | someone paid a fixed fee to follow a protocol and report what happened | adoption, a customer, a reference, or evidence anyone wants this |
| **Internal walkthrough** | our own drives, and an AI model run through the tools in a host | a user, a test result from outside, or a reliability rate |
| **Voluntary retention** | a publisher who embeds a widget and leaves it up because it is useful to them | the same as either of the above, and the only one of the three that is evidence of value |

A paid tester who says the product is good has told us nothing we paid to learn.
A paid tester who says where they got stuck has told us the thing we cannot get
any other way. Payment, if it is ever approved, buys **observations, including
negative ones** — never an endorsement, a rating, a testimonial or a quote.

## Budget

The earlier figure of **$500–$1,000 is a proposed total planning budget**. It is
not approved expenditure, not a commitment, and not a claim about what this kind
of work costs — we have not surveyed the market and should not pretend to have.

Ask for **fixed-scope proposals** against the assignments below and let people
name their own price. Do not invent a rate, do not offer an hourly figure, and
do not fill in a number because a form has a field for it.

---

## Assignment A — independent JavaScript integration test

**Fixed scope. One deliverable. No production credentials, no real birth details.**

Who: a working JavaScript or TypeScript developer who has not worked on Zodiacs
and has not seen this repository.

The task, from a clean machine or a fresh container:

1. **Install** from the public instructions at
   <https://zodiacs.org/developers/mcp/>, exactly as written. Do not deviate to
   make it work — if it does not work, that is the finding.
2. **Calculate** one synthetic natal chart through a connected assistant.
3. **Compare** two records that differ in a single setting, and read the answer.
4. **Trigger one useful error** on purpose, and **recover** from it in the same
   session.
5. **Report.**

Deliverables:

- a screen recording of the whole run, unedited, including the parts that failed;
- environment details: OS and version, Node version, npm version, shell, host
  application and its version;
- a small working example — whatever you built to convince yourself it works;
- reproducible failures: exact commands, exact output, and what you expected;
- **five improvements, ranked**, most important first, each one sentence.

What we are buying: where an unfamiliar person actually snags between the page
and a working install. "Nothing snagged" is a real and useful answer.

What we are not buying: an opinion on whether the idea is good.

Out of scope, and worth saying so in the brief: the engine is not on npm, so
there is no `npm install` for it. Anyone who reports that as a bug has read the
page correctly — it is a limitation, not a defect.

---

## Assignment B — real iPhone and Safari usability test

**Fixed scope. A real device. Not a simulator and not desktop Safari's
responsive mode.**

This exists because we cannot do it: this environment has no WebKit build, no
iOS device, and no assistive technology. Every mobile claim we make today comes
from Chromium and Firefox at a narrow viewport, which is not the same thing and
is recorded that way.

Who: anyone comfortable on an iPhone. No development experience needed.

The task, on a real iPhone, in Safari:

1. Create a synthetic chart at <https://zodiacs.org/birth-chart/> — a made-up
   date and a city, never your own birth details.
2. Read the result. Say in your own words what it told you, and what you
   expected it to tell you that it did not.
3. Use the existing saving-and-return flow: leave the page, come back, and see
   whether your chart is where you expected.
4. Export a supported record from that chart.
5. Import and compare it at <https://zodiacs.org/developers/compare/>.
6. Feed it a file that is not a record — a photo, a text file — and recover.

Record: device model, iOS version, Safari version, and **any accessibility
settings you have on** (text size, Reduce Motion, VoiceOver, Increase Contrast).
If you use VoiceOver normally, say so — that is more valuable than the rest of
the report combined, and we have no way to test it.

**Two things this assignment does not cover, deliberately.** Saved *calculation
records* are a distinct, immutable feature that is **deployed but not activated
in production**, so there is nothing to test there yet; step 3 is the ordinary
saved-chart flow, which is a different mechanism. If activation happens, or an
authorized test build exists, that becomes a separate assignment rather than an
extra step bolted onto this one.

---

## Task sheet — three to five people who already use astrology tools

Not developers. People who already use Co-Star, Chani, TimePassages, astro.com
or similar, and who will notice when something is wrong or missing.

Fifteen minutes. Ask them to think aloud if they are willing.

1. Make a chart for a made-up birth date at <https://zodiacs.org/birth-chart/>.
2. What does this tell you that you already knew? What does it tell you that you
   did not?
3. Is anything here **wrong**, by your understanding of astrology? Be specific.
4. Is anything **missing** that you would expect a chart to show?
5. Where did you have to stop and work out what a word meant?
6. What would you use this for, if anything? "Nothing" is a real answer.

**Do not ask whether they like the design.** Do not ask whether they would
recommend it. Do not ask them to rate anything. Those answers are cheap,
flattering, and tell us nothing we can act on. What we want is understanding,
usefulness and confusion — in that order.

Record what confused them in their words, not ours.

---

## Publisher invitation — one existing widget

For a site that already publishes a Moon phase or daily sky element and
maintains it by hand. Offer the concrete thing, not a vision.

> Your [Moon phase / today's sky] section looks hand-updated. There is a free
> embed that would keep it current on its own:
> <https://zodiacs.org/widgets/>. Pick Moon phase or today's sky, set the theme
> and size, copy one `<iframe>`.
>
> What it does: computes the current phase or sky and re-renders itself. No
> account, no key, no cost. The only condition is that the small
> "Powered by Zodiacs.org" credit stays.
>
> What it does with your readers: loading the widget is a request to
> zodiacs.org, like any embedded asset, so we see an IP address and your site's
> origin. Nothing else. The mini birth-chart variant computes in its own iframe
> and does not send birth details anywhere — but you probably want the Moon or
> sky one, which asks your readers for nothing at all.
>
> If it is not useful, ignore this. If you try it and drop it, I would rather
> know why than not.

Recipients are the owner's call. There are none here, and none are to be
invented. If there is nobody to send it to, this does not go out.

A publisher who embeds it and leaves it up is the one outcome in this file that
would be evidence the thing is worth having. Record it separately from the paid
assignments above, and do not add the two together.

---

## What not to say when sending any of this

- Not that the engine or the adapter is "released" or "available on npm". Both
  are unpublished candidates and the pages say so.
- Not that the comparison output is anonymous. It carries exact differences.
- Not that saved calculation records are available. They are deployed and not
  activated.
- Not a count of our own tests as a count of users, and not a count of paid
  testers as a count of customers.
- Not an accuracy figure from the synthetic benchmark. It is a regression corpus
  over pairs one engine produced.
- No deadline, no SLA and no support commitment. `/developers/support/` states
  there is none for these candidates, and outreach must not contradict it.
- No partner names, no advertising, no announcement channel, no mailing list.
  None of those exists and none is being created.

## Where the adapter trial lives

The five-step MCP builder trial is written out separately, with exact inputs and
exact expected output for every step:
[TRIAL-DRAFT](../mcp-adapter/TRIAL-DRAFT.md). Assignment A is deliberately
looser — it asks someone to follow the *public page* rather than a protocol we
wrote, because the page is what a real builder would have.
