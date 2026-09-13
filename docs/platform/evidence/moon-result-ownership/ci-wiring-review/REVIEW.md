# Independent wiring review

No blocking wiring defect found in the exact copied root-owned workflow change. This is a source review, not a claim that Ubuntu CI has executed successfully.

The existing Build & Check job runs npm ci under Node 22 before the new command. esbuild, preact and playwright-core are declared dependencies; the existing pinned Chromium installation precedes the new step. findChromium prefers the Playwright-managed executable and has Linux fallbacks; the driver has no macOS-only path. Its loopback port is allocated dynamically, and external browser requests are blocked. No account, production endpoint, secret, changed permission or new spending authority is required. Existing contents: read remains unchanged.

OUT_DIR is inside tests/visual/artifacts, collected by the existing final upload-artifact step with if: always() and 90-day retention. During native execution the driver catches failures, sets a nonzero exit, writes result.json in finally, and retains compiled fixture.js/css. Early compilation or input-read failures occur before the report/finally region and therefore can leave no result.json; the command still fails and the CI log remains the evidence. A hard timeout can likewise interrupt final JSON creation. The 3-minute step cap is bounded and materially above the previously observed local native fixture duration; hosted-run success is still pending.

Only four workflow lines are added; no existing budget, assertion, action pin, artifact permission or upload condition changes. The author driver is byte-identical to Freeze 1 (verified separately in identity.json).
