# Rights, read from primary sources

Section 10 asks for the actual terms covering code, kernel data, derived
coefficients and redistributable fixtures, with the unresolved parts left
unresolved rather than decided by assumption in either direction. Everything
below is quoted from a primary source that was fetched, or read out of the
artifact itself.

## The claim this corrects

`swiss-benchmark/LICENSING.md` says, of the DE kernel:

> JPL development ephemerides are US Government work and are in the public
> domain.

That is the inference the brief warns against — NASA involvement does not by
itself make an artifact a US Government work. SPICE and its kernels are
produced by **Caltech's Jet Propulsion Laboratory under contract to NASA**, and
a contractor's output is not automatically a government work. NAIF's own rules
page never uses the words "public domain". What it does instead is grant
permission explicitly, with conditions — which is a better answer than the
assumption, and a different one.

## What NAIF actually says

Fetched from `https://naif.jpl.nasa.gov/naif/rules.html` on 2026-09-20. The
clauses that bear on this work, verbatim:

> **Kernels Distribution** — SPICE kernels placed on the NAIF server may be
> downloaded and used by anyone, consistent with the other rules found on this
> web page.

> **Kernels Redistribution** — Redistribution of SPICE kernels distributed by
> NAIF is permitted as long as they have not been modified. If a kernel
> distributed by NAIF has been modified in any way, any embedded or otherwise
> allied attribution of the original kernel producer must be replaced with the
> name and institution of whomever has made the last modification.
> Redistribution of kernels distributed by any other entity is subject to the
> rules on and of that entity.

> **Modifications to SPICE Kernels** — All users of SPICE may "modify" kernels
> received from any source … Such self-modified kernels should be annotated
> with appropriate metadata … and validated before being used by yourself or
> distributed to others. **The file name must also be changed to help avoid
> confusion.**

> **Commercial Use of SPICE** — Use of SPICE components in commercial products
> is allowed … No fees or licensing are required. Acknowledgement of the use of
> NASA's SPICE system is encouraged.

> **Sponsorship** — The SPICE system is implemented and maintained by
> Caltech/Jet Propulsion Laboratory under contract to the National Aeronautics
> and Space Administration.

And a warranty disclaimer applying to "all NAIF-provided software", asserting
Caltech authorship under US Government contract and providing everything
"AS-IS", with no liability for Caltech, JPL or NASA.

### What that adds up to

- Redistribution of the **unmodified** kernel is permitted outright.
- Redistribution of a **modified** kernel is also permitted, but carries three
  obligations: replace the original producer's attribution with our own name
  and institution, change the file name, and annotate and validate it.
- Commercial use is allowed with no fee and no licence. Acknowledgement is
  *encouraged*, not required — but the attribution-replacement rule above is
  not optional.
- None of it is a copyright grant in the usual sense, and none of it says
  public domain. It is a permission with conditions, from the producer.

## What the kernel says about itself

Read out of `de440s.bsp`'s own DAF comment area — 1,101 lines of it — rather
than inferred from a filename, a version string or a checksum:

```
JPL planetary and lunar ephemeris DE440
Integrated 25 June 2020
Reference:
- R.S. Park, W.M. Folkner, J.G. Williams, and D.H. Boggs, The JPL Planetary
  and Lunar Ephemerides DE440 and DE441, Astronomical Journal.
  DOI: 10.3847/1538-3881/abd414
Time span covered by ephemeris:
26-DEC-1849 00:00 to   22-JAN-2150 00:00
```

Two things follow. First, the coverage the file declares about itself,
1849-12-26 to 2150-01-22, matches the segment bounds measured independently by
walking its directory records — so the coverage figure in
`PREREGISTRATION.md` is confirmed by two routes rather than one. Second, the
file declares `EMRAT = 8.1300568221497215D+01`, and the Earth/Moon segment
identity fitted from the coefficients came out at 81.3005682214972 — every
digit recovered. The reader is interpreting the kernel correctly, established
by the artifact's own statement of its constants rather than by trusting the
reader.

The comment area also names the internal producer (`NIO2SPK`) and the
authors to credit. That is the attribution the redistribution rule refers to.

## The three artifacts, and where each stands

| artifact | terms | may we redistribute? |
| --- | --- | --- |
| `astronomy-engine` 2.1.19 | MIT, Don Cross | yes, notice retained |
| `@zodiacs/engine` | MIT | yes, ours |
| Swiss Ephemeris 2.10.03, `pyswisseph`, `.se1` | AGPL-3.0 or paid commercial | **no, and nothing Swiss is committed** |
| `de440s.bsp`, unmodified | NAIF rules above | permitted, unmodified, with its own attribution |
| **a compiled coefficient pack derived from it** | **see below** | **not settled — so nothing is shipped** |

## The part that is not settled

A pack produced by refitting or truncating the kernel's coefficients is not an
SPK file and is not a "modified kernel" in the ordinary sense — it is a new
artifact carrying numbers derived from the kernel's numbers. Two questions
remain genuinely open, and this document does not decide either:

1. **Does the redistribution rule reach it?** If a derived coefficient set
   counts as a modified kernel, the obligations are clear and easily met:
   replace the producer attribution, change the name, annotate, validate. If it
   counts as a new work, the rule does not apply and something else does. The
   conservative course is to satisfy the obligations regardless, which costs
   nothing, and that is what the pack header format does.
2. **Does Caltech assert any right in the coefficients themselves?** The rules
   page grants permission over *kernels* and disclaims warranty; it does not
   state a copyright position on numerical content, and we have not found a
   primary source that does. Asking NAIF is the way to settle it and has not
   been done, because that is an outward-facing action.

Nobody here is a lawyer and nothing above is advice. What it is, is the actual
text and an accurate account of what it leaves open.

## What follows operationally, and is already enforced

- **No coefficient pack is distributed.** Not committed, not published, not
  bundled. The compiler is reproducible and the runtime accepts a
  user-supplied local pack, so the engineering proceeds at full speed without
  waiting on question 2 — which is the brief's instruction not to let one legal
  question halt unrelated work.
- **Every pack header carries the obligations anyway**: source kernel identity
  and hash, compiler version and settings, coverage, conventions, and the
  producer named as Zodiacs rather than JPL, with the DE440 reference cited as
  the source of the underlying data.
- **Nothing Swiss is committed**, and no Swiss output is a fitting target
  anywhere. That rule predates this work and still holds. It also sidesteps the
  separate question of whether AGPL reaches a program's numerical output: we do
  not need an answer, because the outputs are used only as measurements and
  never redistributed or fitted against.
- **No fee is paid and no agreement is entered.** Commercial use of SPICE
  requires neither, and the Swiss commercial licence is not being bought.
