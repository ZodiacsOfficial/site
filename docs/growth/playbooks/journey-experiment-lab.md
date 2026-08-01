# Journey & Experiment Lab

## Purpose

Improve the four product journeys through falsifiable, privacy-safe tests:
chart-to-save, second-chart-to-relationship, guide-to-identity, and
profile-to-account. The lab favors small reversible changes over redesigns.

## Entry criteria

- A baseline shows a meaningful problem or uncertainty.
- The hypothesis names one audience, one change, one behavior, and one reason.
- The outcome can be measured with aggregate events.
- The change does not gate basic results or weaken privacy.
- A human owner can stop, review, and interpret the test.

## Inputs

- Weekly review or approved opportunity.
- Current journey map and aggregate funnel baseline.
- Recent release and experiment history.
- Technical feasibility, sample-size reality, and risk assessment.

## Procedure

1. Create [`../templates/experiment.md`](../templates/experiment.md).
2. Write the falsifiable hypothesis before designing variants.
3. Choose the smallest intervention: copy, order, explanation, error recovery,
   or next-step clarity. A homepage/above-the-fold rewrite needs product/design
   review.
4. Define primary measure, guardrails, assignment unit, eligibility,
   attribution window, minimum runtime, and stopping rule before launch.
5. Use aggregate event properties only. Never segment by birth details, chart
   placements, identity, or inferred sensitivity.
6. Implement behind a reversible control when authorized and route it through
   a pull request and Release & Trust Gate.
7. A human launches the experiment.
8. At the planned review, report exposure quality, effect estimate,
   uncertainty, guardrails, novelty/seasonality risks, and decision.
9. Record ship, iterate, stop, or inconclusive. Do not rewrite the hypothesis
   after seeing results.

## Experiment record schema

```yaml
hypothesis: "For [audience], [change] will [behavior] because [reason]."
journey: "chart-save | second-chart | guide-identity | profile-account"
eligibility: "aggregate-safe rule"
assignment_unit: "anonymous experiment bucket; never a retained identity"
variants: []
primary_metric:
  name: "documented metric"
  numerator: "event count"
  denominator: "eligible aggregate count"
guardrail_metrics: []
baseline_window: "YYYY-MM-DD..YYYY-MM-DD"
minimum_runtime: "predeclared duration"
stopping_rule: "predeclared rule"
rollback_trigger: "specific harm threshold"
```

## Interpretation rules

- Instrumentation and sample-ratio checks come before outcome interpretation.
- “No detectable result” is not proof that variants are equal.
- Do not repeatedly peek and stop on a favorable day.
- Pair statistical uncertainty with practical value and implementation cost.
- Treat novelty, returning visitors, seasonality, and concurrent releases as
  plausible explanations.
- Preserve negative and inconclusive results in the experiment ledger.

## Outputs

- Approved experiment record and implementation PR.
- Release check and human launch decision.
- Readout with ship/iterate/stop/inconclusive decision.
- Durable learning linked from the next weekly review.

## Guardrails

- No dark patterns, fake urgency, or signup gate on basic results.
- No personal outreach, visitor identification, or birth-data targeting.
- No autonomous launch, allocation change, merge, or permanent rollout.
- No experiment may bypass accessibility, tests, or the release gate.
