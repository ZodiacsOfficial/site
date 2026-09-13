# Independent C-012 downstream review — Freeze 1 rejected

The exact six-file Freeze 1 is not accepted. Independent native review reproduces a daily-controller regression: a legitimate profile-sync refresh during a replacement context's authoritative session lookup derives device-only and discards the valid in-flight lookup. The preceding source handles the same sequence as pending. The author separately found the same class of failure in the existing full-page paused-state gate; that gate is not passed by these fixtures.

Subject: base c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3; source-freeze SHA256 e64eb26e34b1b5442a1a1e12f851b77a8a17d7d820a0e5a9b2b611c583cdd242; patch SHA256 391af1a908fece28f57dfffe16ce435d1dce9ead828b9bcc77a505d1b6c0609b. Main component SHA256 d2e58aab1d6a2cb9f34bc449a9e97c8db8d1791e0ddbed7da95348557ad7481e. All six frozen files were copied and checked before review. No root or author source was changed.

## Reproduced regression

Native refresh-drive.mjs mounts the real component and first resolves a synthetic authenticated pending view. It calls the actual clear helper, publishes a fresh contextId 8, holds the actual component's getSyncSession boundary, and dispatches the existing zodiacs:profile-synced event. When the authoritative session lookup is released, Freeze 1 remains device-only and has made only the original preference GET. Baseline returns pending and reads the replacement preference. No fabricated global callback or arbitrary object ABA is required.

The new clear handler nulls sessionRef. refresh passes that null as an explicitly supplied session. Its resolveContext generation supersedes the in-flight lookup and immediately derives device-only. The null here means no resolved cached session, whereas the Auth callback's explicit null can mean a real signed-out state. Correct the refresh boundary without treating explicit Auth null as authenticated, preserving fail-closed access and old response fences.

## Independent controls and scope

The final main fixture has 23 criteria: 19 initial groups, three refined focus/session groups, and the regression above. Freeze 1 passes 22 and fails 1; baseline passes 10 and fails 13. Initial supplemental focus controls did not wait for the replacement button and therefore failed to expose the old focus defect. Those original drivers/results are retained. focus-refined-drive.mjs explicitly waits for a different pending button; baseline now exposes focus theft and Freeze 1 suppresses it, while current-result focus still works.

Passing candidate controls include synchronous data-free clear with global deletion before observers; no cached revival; pending/active hiding and typed-value preservation; cleared import/session/preference reads; same-contextId fresh-object replacement; new token versus same-credential clone; profile-sync ordinary completion; allowed-access epoch; actual fail-closed reader absence; once-issued native resend POST retention; no obsolete follow-up GET/status/focus; ordinary resend success/error retry; unmount subscription cleanup; non-full computed preservation; and contradictory preference hidden rather than treated as an empty subscription.

The real Preact controller, context module, daily fetch client, derivation, profile store and access hook execute in Chrome 152.0.7977.83. Native same-origin fetch and parsing run against an owned intercepted endpoint; synthetic session/Supabase query values and dynamic-import/session timing are explicit fixture boundaries. Synthetic tokens and example.invalid addresses only. There is no backend authentication, provider delivery, production page, deployment or release claim. The 70 source-input manifests and before/after bundle identities preserve actual executed code. Browser contexts close and nonlocal requests are blocked.

The child separately reviewed the full actual EmailCaptureEnhancement script: 20/20 independent native groups pass versus 10/20 baseline. Its sealed report is copied unchanged under email/. It establishes chart-generation ownership, not cancellation of ordinary later email/sign edits on the same chart. The current successful submission can still reset those later edits; existing request values and once-only success analytics are preserved. Native reset listeners and analytics wrapper were inspected; arbitrary injected reentrancy is not promoted to a product defect.

The proposed root-owned four-line CI step is independently reviewed under email/ci-wiring/. It retains existing Node/browser pins, permissions and artifact upload, and uses the frozen portable driver. That is wiring compatibility, not remote CI success. The overall six-file acceptance remains blocked on the daily correction and existing full-page gate.

All evidence is SHA256 hashed, not cryptographically signed. Original failed and under-sensitive fixture records remain immutable; corrected source must receive a new freeze and fresh acceptance.
