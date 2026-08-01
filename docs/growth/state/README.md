# Growth OS Durable State

These six datasets preserve operating memory outside any chat, analytics UI,
or connector. They may live as version-controlled Markdown/YAML, a sheet, or a
database view, provided the fields and stable record links remain exportable.
Owners are human roles; IDs below identify work and releases, never visitors.
All metrics are aggregate-only and contain no identity, session, birth, chart,
or saved-profile data.

## Storage rules

- Store source location, exact evidence window, timezone, schema version, and
  `updated_at` on every dataset.
- Use canonical URLs and stable Growth OS record IDs.
- Record unknown values as `null`, never zero.
- A connector may refresh state but may not redefine fields, publish, or act on
  a result.
- Changes to metric or event definitions require an owner, effective date, and
  linked decision.

## State catalog

### Route-query ownership map

**Owner:** Search portfolio owner

One row per intended route/query-cluster relationship:

```yaml
route: "canonical URL"
query_cluster: "normalized aggregate intent"
primary_intent: "informational | calculator | forecast | collector"
ownership: "primary | supporting"
indexability: "index | noindex"
status: "planned | active | consolidate | retire"
owner: "human role"
evidence_window: "YYYY-MM-DD..YYYY-MM-DD"
evidence_record: "stable record link"
last_validated: "YYYY-MM-DD"
```

### Opportunity backlog

**Owner:** Growth lead

One row per opportunity; the linked record contains full reasoning:

```yaml
record_id: "stable Growth OS ID"
url: "canonical URL"
query_cluster: "normalized aggregate intent"
evidence_window: "YYYY-MM-DD..YYYY-MM-DD"
baseline: "metric definition and value"
hypothesis: "change, expected behavior, and reason"
expected_impact: "direction and materiality"
confidence: "high | medium | low"
effort: "small | medium | large"
risk: "failure modes and severity"
owner: "human role"
status: "proposed | approved | in-progress | released | rejected | archived"
deployment_identifier: null
measurement_date: "YYYY-MM-DD or null"
result: "pending or measured outcome"
record_location: "stable link"
```

### Aggregate analytics event dictionary

**Owner:** Analytics owner

One row per approved event definition:

```yaml
event_name: "stable event name"
journey: "documented product journey"
trigger: "observable aggregate-safe action"
metric_role: "numerator | denominator | diagnostic"
allowed_properties: []
prohibited_properties: ["identity", "session trail", "birth/chart data"]
owner: "human role"
implementation_reference: "repository path"
schema_version: 1
effective_date: "YYYY-MM-DD"
validation_status: "draft | verified | retired"
```

### Experiment registry

**Owner:** Experiment owner

One row per proposed or completed experiment:

```yaml
experiment_id: "stable experiment ID"
opportunity_id: "linked opportunity ID"
journey: "documented product journey"
hypothesis: "predeclared hypothesis"
primary_metric: "event-dictionary reference"
guardrail_metrics: []
planned_window: "YYYY-MM-DD..YYYY-MM-DD"
owner: "human role"
status: "proposed | approved | running | stopped | completed"
deployment_identifier: null
decision: "pending | ship | iterate | stop | inconclusive"
result: "pending or aggregate readout link"
record_location: "stable link"
```

### Release evidence ledger

**Owner:** Release owner

One row per candidate or released deployment:

```yaml
release_record_id: "stable release-check ID"
deployment_identifier: "commit/deployment ID or null before release"
pull_request: "stable PR link"
routes: []
release_date: "YYYY-MM-DD or null"
owner: "human role"
gate_status: "pending | pass | pass-with-follow-up | fail"
release_check: "stable record link"
rollback_reference: "documented method/link"
```

### Decision and results log

**Owner:** Growth lead

One append-only row per material decision or measured result:

```yaml
decision_id: "stable decision ID"
related_record_id: "opportunity, experiment, or release ID"
decision_date: "YYYY-MM-DD"
decision: "approve | reject | defer | ship | iterate | stop | prune action"
owner: "human role"
rationale: "short evidence-based explanation"
measurement_date: "YYYY-MM-DD or null"
result: "pending or observed aggregate outcome"
evidence_records: []
follow_up: "next action and date"
```

This log is append-only. Correct an error with a new linked entry rather than
silently rewriting the decision history.
