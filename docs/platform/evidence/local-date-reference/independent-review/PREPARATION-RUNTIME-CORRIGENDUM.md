# Correction to the earlier preparation runtime wording

The sealed `/private/tmp/zodiacs-platform-skipped-date-preparation/main/REVIEW.md` grouped its Node 22 and Node 24 probes under one ICU/tzdb parenthesis. That prose was inaccurate. The original raw result records already contain the correct distinct identities:

| Original result | Node | ICU | tzdb |
| --- | --- | --- | --- |
| `result-v22.23.2.json` | 22.23.2 | 78.2 | 2026a |
| `result-v24.19.0.json` | 24.19.0 | 78.3 | 2026b |

No probe result, counter, input, source byte or raw record is changed. The original preparation remains sealed under manifest `aa7432991c8311038dcc911c951ff2d0863e9ede9d41279f55af23a2fefd5893`. The current helper review independently records and passes its 92 controls on each distinct runtime/data combination plus Chrome. This corrigendum changes the earlier narrative attribution only and is included in the current SHA-256 copy manifest; no cryptographic signature is claimed.
