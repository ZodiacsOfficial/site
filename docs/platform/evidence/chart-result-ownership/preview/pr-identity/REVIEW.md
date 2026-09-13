# PR 434 independent identity review

**Verified:** [Prevent obsolete birth-chart results and delayed action updates](https://github.com/ZodiacsOfficial/site/pull/434) is an open draft at the expected head `c7b9eb4a769e39a46aebc0a5ecedcb9fc40949e3`, based on `codex/platform-runtime-claims` at `abcf1a44e52040db79a369b49bc9b55d78099b22`. The local merge base is that exact base. Fresh metadata before and after verification agrees.

The paginated GitHub files API returned two complete pages of 100 and 99 records, matching the PR's `changed_files: 199`. No `gh diff` truncation assumption was used. Every filename, add/modify status and Git blob SHA matches the exact local head/base comparison—not only the source files. There are 190 added and nine modified files. Classifying `docs/` paths and Markdown files as documentation leaves five non-documentation files:

| File | Identity result |
| --- | --- |
| `src/islands/ChartCalculator.tsx` | Exact reviewed Freeze 2; SHA256 `fea737333ea5df9a894dafa99de06cd1dcc8390f3bd43d9e627992b466dfa4d0` |
| `src/islands/ChartCalculator.locale.test.ts` | Exact reviewed Freeze 2 |
| `src/islands/ChartCalculator.ownership.test.ts` | Exact reviewed Freeze 2 |
| `tests/chart-ownership-drive.mjs` | Exact reviewed Freeze 2 |
| `.github/workflows/site-check.yml` | Only the root-owned four-line CI addition |

`identity-result.json` retains every remote/local blob and all four expected/actual frozen SHA256 values. Source bytes were read with `git show` at the explicit PR commit, avoiding concurrent root working-tree changes.

The workflow addition runs `OUT_DIR=tests/visual/artifacts/chart-ownership node tests/chart-ownership-drive.mjs` in the existing Build & Check job with a five-minute step timeout. A byte comparison proves that inserting only these four lines into the base workflow yields the PR workflow exactly. Existing read-only permissions, Node installation, Chromium setup, action pins and artifact handling are unchanged. The output directory is covered by the existing final `if: always()` upload. The driver honors OUT_DIR, uses the portable browser helper, and that helper is unchanged between base and head. This verifies wiring and identity, not a claim that CI or the remote preview passed.

The initial sandboxed metadata request could not reach `api.github.com`; its observed error is retained. Approved read-only API calls then obtained the metadata, all file pages and a final metadata recheck. No repository, pull request, source, deployment or publication state was changed. Parent owns actual remote preview/browser verification and root remains the accountable integrator.
