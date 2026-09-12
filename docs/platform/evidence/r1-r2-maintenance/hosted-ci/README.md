# Hosted R1/R2 acceptance

[Site Check 34688849189](https://github.com/ZodiacsOfficial/site/actions/runs/34688849189)
passes all 14 jobs on source `35301d24907b6eb7117a1f4b0ae690ca42c57de6`.
Build & Check job 103540471386 passes every required functional gate, visual
regression, all 30 Lighthouse routes (three samples each, worst aggregation),
foreign-origin widgets and widget Lighthouse. No gate code, threshold or
workflow changed; no hosted retry was needed on this corrected source.

The widget performance/accessibility scores are Moon 100/100, Sky 100/96 and
Chart 100/100, against the unchanged 95 thresholds. Original C-016 failures
remain valid historical records; this is new evidence on corrected dependencies
and a current paired edition, not a reclassification of those failures.

The GitHub performance artifact is 10297316941, 130159473 bytes, provider digest
`58513b890db6e9a57eff5e4017e210da8cd2be3b1cfad45998863bc66a0903a5`.
The complete artifact was not downloaded or locally SHA-verified. The original
artifact metadata, exact job log, all job/step conclusions and 110-path actual
PR blob comparison are archived with member hashes.

Six raw samples for the two previously failing routes were retrieved by verified
ZIP ranges (934466 bytes transferred). Member CRCs, lengths and SHA-256 records
are retained; this is not full-archive digest verification. Exact metrics are
in sample-metrics.json, raw reports and range provenance in the sample archive.
