# L3a: inactive saved receipt storage and durable erasure

## Source and scope

- Base: `693c2ac90b5be78c0f0885c22763dcafff53c00e`, tree `103e0ebe6b0c56381b413e4375a9cc9175b8f2f3`.
- Actual #426: `46b36e2c887405efc70762297e1087f6d14195f9`, base `c761a49c55d125bca48ff38d81b0a9ff6fd5adcf`.
- Reviewed four source/test files are unchanged from retained `a0bf55176dd4df4d27763bfeb2cf97e36abe4d15`.
- Selective integration only; no stacked merge or product callsite activation.

The immutable record codec/store now uses native transaction barriers for owner
and full-device deletion. Intent commits first; purge and acknowledgment commit
together. Pending requests block reads/writes across handles and tabs, survive
reload, and support explicit erase-only retry after normal authority is revoked.
Completed barriers remain terminal; no readmission/reset API exists yet.
Recovery validates at most 1,000 marker rows and fails closed above that bound;
terminal-marker growth/readmission needs policy before broad activation.
A read that committed before an erasure may already have an in-memory snapshot;
this storage fence does not revoke bytes previously disclosed. Future cross-tab
lease/access/UI invalidation must withhold suspended stale deliveries.
Storage schemas are not silently upgraded. Incompatible v1/future data is refused
intact. Existing legacy profile writes/sync and calculation receipt bytes remain
unchanged. Failed or uncertain create is never automatically retried.

## Verification

Local build, typecheck (0 errors/warnings), bundle/isolation gates, protected
scope, 18 exact-width captures and 20 native IndexedDB groups pass. The final
full suite passes 5,271 tests in 427 files. Hosted CI/preview remain pending. The native local driver
ran in Chromium 152.0.7977.84 from Node 26.4.0; build/typecheck/unit gates use
Node 22.23.2, and hosted CI also runs the native driver under Node 22.
All data/accounts in new tests are synthetic. Native tests do not claim that the
new lifecycle UI or the real account coordinator is active or verified.

## Evidence reuse

Preserve prior numerical, receipt, design, SDK artifact/pin and existing account
boundary evidence: their production sources and dependency lock are unchanged.
Required hosted jobs still run, including performance budgets; no threshold or
assertion is weakened. The new native storage driver is added to CI. Prior L2b
production closeout is restored as documentation, with no new production action.
Supabase changelog/docs were consulted for the existing authority boundary;
no SDK, Supabase dependency/schema, auth API or service configuration is changed.

## Retained initial failures and correction

The initial full suite passed 5,269 tests and failed two preparation checks.
The additive library modules invalidate the Phase 1 source digest, so all 18
required captures are regenerated with the existing driver; no digest rule is
relaxed. The inherited sign-record precision test depends on a mutable quote;
its unchanged-main failure is reproduced and replaced by fixed positive-price
formatter inputs. [Exact control and inherited null-quote observation](SIGN-RECORD-CONTROL.md).
No Registry source, snapshot, output or freshness assertion changes.

## Delivery and remaining limitations

Draft and exact-source preview are pending. This is L3a, a safe inactive prerequisite,
not full L3 activation. [Exact activation dependencies](ACTIVATION-DEPENDENCIES.md)
cover verified authority across both modes, pre-grant receipt discovery, awaited
owner/device removal and recovery, explicit readmission, and save/inventory/export/
delete/failure UI with actual account switching flows. SDK publication stays held.
No merge, production deploy, L4–L6, Astrofolio or Zodia work is included.
