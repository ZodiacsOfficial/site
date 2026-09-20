# Launch copy — prepared, not posted

**Nothing here has been posted, sent, or submitted anywhere.** No account was
touched, no directory application was filed, and no outreach left this
repository.

## Do not post any of it until all four are true

1. `https://zodiacs.org/developers/engine/` returns 200 in production and the
   page behaves there as it does in the build.
2. The install block on that live page, copied from the live page, installs
   `0.1.1-rc.6` and prints the expected digest. It was verified against the
   live GitHub archive on 2026-09-20 (see `ENGINE-PAGE.md`), but the copy in
   production is what a reader will paste.
3. The consolidated report at
   `https://github.com/ZodiacsOfficial/site/tree/main/docs/engine-validation`
   resolves — the posts link the page, and the page links the report.
4. Every figure below still matches
   `docs/platform/evidence/swiss-benchmark/report-measure.json`. If the
   benchmark is re-run and the distribution moves, these numbers are stale and
   the posts are false.

If (1) fails the announcement points at nothing. If (4) fails it points at the
wrong number, which is worse.

## The announcement post (266 characters)

> A natal chart engine that runs in your browser or Node process — no server,
> no key. 24.7 KB gzipped, ephemeris included. Median 1.6″ from Swiss
> Ephemeris over 160 measurements from 1801 to 2026, and we publish the two
> that missed. MIT. zodiacs.org/developers/engine/

## The reply (277 characters)

Post as a reply to the above, not as a separate post. The point of it is that
the interesting result is the one that looks bad.

> Both misses are the Moon past 2100, by 64.8″ and 159.4″ — and that is the
> clock, not the ephemeris. The two programs extrapolate Earth's slowing
> rotation differently, 109.5 s apart at 2100. Pin ΔT and the case goes to
> −0.03″. Neither model is wrong; the number isn't known yet.

## The longer announcement

For a blog post, a newsletter, or wherever a paragraph is allowed. It says
the same things at length and adds nothing the measurements do not carry.

> **Zodiacs Engine**
>
> Every astrology app I could find calculates charts on a server. You send a
> birth date, a birth time and a birthplace to someone else's machine, and a
> chart comes back. That is a strange arrangement for a calculation that needs
> no network at all.
>
> Zodiacs Engine is the chart engine behind zodiacs.org, and it runs wherever
> your code runs. Give it an instant and a pair of coordinates and it returns
> bodies, angles, house cusps and aspects. It is synchronous, it makes no
> network request, and nothing about the birth details it is handed leaves the
> process. 24.7 KB gzipped in a browser bundle, ephemeris included. MIT.
>
> The positional series are not ours. They come from Astronomy Engine by Don
> Cross — VSOP87, NOVAS, and the Nautical Almanac Office's Improved Lunar
> Ephemeris for the Moon — and that library is the reason a chart fits in
> 25 KB instead of shipping thirty megabytes of Chebyshev coefficients. What
> we built is the chart on top: houses, angles, aspects, the record format,
> the flags that say what was assumed, and the limits.
>
> On accuracy, here is the whole of what we can defend. On 20 September 2026
> we measured the engine against Swiss Ephemeris 2.10.03 reading its own
> JPL-derived data files, over a stratified set of dates written down before
> any number was taken. Across the 160 measurements from 1801 to 2026, the
> median disagreement in ecliptic longitude is 1.6 arcseconds, the 95th
> percentile 12.1, and the worst 18.6 — Pluto in 1801. A zodiac sign is
> 108,000 arcseconds wide.
>
> Two of the 180 measurements miss by more than an arcminute, both the Moon
> far in the future: 64.8″ at 2100 and 159.4″ at 2190. That one turned out to
> be the most interesting result in the set, because it is not an ephemeris
> error. Past the observed record the two programs extrapolate the Earth's
> slowing rotation differently — 109.5 seconds apart at 2100 — and the Moon
> moves about half an arcsecond per second of time. Pin ΔT to the reference
> and the case collapses from 63.9″ to −0.03″. Neither model is wrong. Nobody
> knows that number yet.
>
> Two caveats that matter more than any of those figures. Swiss Ephemeris,
> JPL Horizons and Astronomy Engine all descend from JPL development
> ephemerides, so agreement between them is consistency between
> implementations, not a check against observation — we have not measured
> this engine against the sky and do not claim to have. And the engine
> accepts dates from 1800 to 2199, which is wider than the span we measured.
>
> The weakest part is event search, and it is written down rather than left
> out: one transit-window contract is still failing, the second period's
> exact-pass count cannot be certified, and each longitude-crossing search
> caps evaluations, so complete event discovery is not guaranteed. That, the
> per-dimension residuals, the pinned oracles and everything else we could not
> establish are in one report at
> github.com/ZodiacsOfficial/site/tree/main/docs/engine-validation.
>
> It is not on npm yet. `npm view @zodiacs/engine` returns 404, and two things
> are outstanding: an adversarial review of the engine and widgets packages,
> which is open, and the authority to publish. Until then the published
> archive is the route, and the page carries an install that verifies its
> digest before npm sees the file.
>
> zodiacs.org/developers/engine/

## The release note

For a GitHub release body or a changelog entry when `0.1.1-rc.6` is
published. Written for the prerelease tag, not `latest` — see
`PUBLICATION.md` for why that distinction is load-bearing.

> ## `@zodiacs/engine` 0.1.1-rc.6 — release candidate
>
> A browser-first tropical chart engine: apparent geocentric positions, natal
> charts, transits, synastry, Moon phase and Saturn-return seasons, computed
> synchronously in the caller's process with no network request. ESM, MIT,
> TypeScript declarations included, Node ≥18 or a bundler. One runtime
> dependency, `astronomy-engine` ^2.1.19 (MIT).
>
> **This is a release candidate.** Install it with an explicit tag; it is not
> intended for `latest`. An adversarial review of the engine and widgets
> packages is open.
>
> **Measured.** Against Swiss Ephemeris 2.10.03 / DE441-derived data on a
> stratified corpus declared before measurement: median 1.62″, p95 12.08″,
> worst 18.64″ across the 160 measurements from 1801 to 2026. Against JPL
> Horizons vectors in the test suite: worst 14.77″ (Neptune, 2020-01-01).
> Browser bundle for the natal path: 57.7 KB minified, 24.7 KB gzipped,
> 20.7 KB brotli, ephemeris included.
>
> **Not established.** None of the above is observational accuracy — every
> oracle descends from the same JPL development ephemerides. The accepted
> input range (1800–2199) is wider than the measured span. Event search caps
> ephemeris evaluations and does not guarantee complete discovery; one
> transit-window contract remains failing. The executed runtime matrix is Node
> 22.23.2, Node 24.19.0 and Chrome 152, which is narrower than the manifest's
> Node ≥18.
>
> **Changed in rc.6.** Local time resolution compares the complete civil
> timestamp including seconds and milliseconds, so historical shifts smaller
> than one minute receive the correct gap and fold flags and neighbouring
> ordinary times lose false ambiguity flags. Floating-point offset conversion
> normalizes to integer milliseconds while historical offset seconds,
> fractional-minute offsets, earlier fold selection and the forward-gap policy
> are preserved. Recorded receipts are immutable and are not rewritten; a
> recomputation under this version can carry corrected time flags. The receipt
> schema, core numerical formulas, ownership SDK, site and starter pins and
> account protocols are unchanged.
>
> Accuracy and support report: `docs/engine-validation/README.md`.
> Page: https://zodiacs.org/developers/engine/

## The demonstration

§8 asks for a recorded demonstration and forbids fabricating a UI or host
transcript, so this is the real terminal session and nothing else: the install
block from the page, run against the live archive in an empty `npm init -y`
directory, and then the page's own worked example run in the directory it
created. Both transcripts, with their exact output, are in `ENGINE-PAGE.md`.
They are genuine output from commands that ran on 2026-09-20; no screenshot,
video or assistant transcript was staged, and none should be.

If a screen recording is wanted later, record that same sequence live. Do not
reconstruct it from the text above.

## What is deliberately absent

- No claim of being the most accurate, the fastest, or the best at anything.
  The measurements support a distribution and a size, and that is all these
  drafts say.
- No suggestion that the package is published, reviewed by anyone outside
  this project, or certified.
- No mention of credentials, publication authority, or who holds what. That
  belongs in `PUBLICATION.md`, not in a product pitch.
- No directory submission, no outreach list, no scheduled post.
