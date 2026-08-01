# Page & Creative Studio

## Purpose

Turn an approved opportunity into a focused page change, new page, metadata
set, OG image brief, or launch asset pack. Strategy and evidence arrive before
drafting; release decisions happen elsewhere.

## Entry criteria

Begin only when there is:

- an approved opportunity record;
- a named human owner and target URL;
- a distinct visitor job and intended next step;
- a unique value mechanism: working tool, computed data, or useful visual;
- a baseline and measurement plan;
- available capacity under the 10-new-pages-per-seven-days cap.

A broad homepage redesign requires explicit product/design approval. Treat an
above-the-fold change as a testable journey hypothesis, not routine SEO copy.

## Inputs

- Approved opportunity and [`../context.md`](../context.md).
- Existing page/component inventory and canonical voice/design rules.
- Verified facts, calculation method, schema eligibility, and public sources.
- Target query intent and safe aggregate baseline.
- Asset specifications and distribution requirements, if any.

## Procedure

1. Complete [`../templates/content-brief.md`](../templates/content-brief.md).
2. State the answer or utility immediately; translate jargon inline.
3. Design the tool/data/visual value before expanding prose.
4. Map claims to evidence. Use dates and degrees for computed sky facts when
   relevant. Do not manufacture scientific or therapeutic authority.
5. For comparison content, name the real decision job, state where each option
   is the better fit, include at least one evidence-backed concession, and
   compare only dated, verifiable dimensions. Never claim blanket superiority.
6. Record the brand mode and source tokens from the current repository. Keep
   consumer and Registry/Collect visual systems distinct.
7. Draft title, description, headings, key answer, internal links, next-step
   CTA, structured data proposal, and social/OG message as one coherent set.
8. Check the consumer/Collect wing boundary and canonical terminology.
9. Implement on a branch when authorized. Preserve generated/source rules and
   unrelated work.
10. Open a pull request with the brief, screenshots, checks, page-velocity
   impact, and rollback notes.
11. Hand off to Release & Trust Gate. Do not merge or publish.

## Page artifact schema

```yaml
target_url: "canonical URL"
change_type: "existing-page | new-page | metadata | creative"
visitor_job: "one sentence"
primary_answer: "one sentence"
unique_value:
  type: "tool | computed-data | visual"
  description: "what the visitor can do or verify"
primary_cta: "canonical action label"
claims:
  - claim: "draft claim"
    source: "stable source or repository path"
structured_data: []
internal_links_in: []
internal_links_out: []
assets: []
measurement_event: "aggregate event or search measure"
velocity_units: 0
```

## Creative rules

- An OG or social asset must accurately represent the shipped page.
- Use the current repository-defined logo, typography, tokens, and sign icon
  palette for the selected brand mode; no mystical clip-art or generic effects.
- Do not put private chart details in an image or URL.
- Avoid promises the destination cannot fulfill.
- Record source files, exact dimensions, alt text, usage rights, and the page or
  route that owns the asset.
- For programmatic OG/social assets, prefer one reproducible fixed-size canvas
  that uses real logo, font, and token sources. Screenshot the exact canvas,
  keep any preview route unlinked and `noindex`, and make variants prop-driven
  rather than redrawing each format.
- For Open Graph images, default to 1200×630, generous crop-safe margins, a
  public file below 5 MB, and legibility at roughly 600 pixels preview width.

## Outputs

- Approved content brief.
- Draft or implementation in a reviewable branch/PR.
- Preview screenshots and asset manifest.
- Measurement and rollback plan.
- Handoff to [`release-trust-gate.md`](release-trust-gate.md).

## Guardrails

- No autopublishing, autonomous merge, or production configuration changes.
- Human editorial, design, and technical review before release.
- No more than 10 net-new indexable pages in a rolling seven-day period.
- No visitor identities, birth data, or personalized pages based on browsing.
- Quarterly pruning applies to every indexable page created here.
