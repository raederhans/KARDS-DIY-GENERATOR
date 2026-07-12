# Set-mark extraction cleanup delivery

## Status

- Integrated: functional commit `0ff1c03b4f3d6801e01cfe2a402cf64201b421bc` is on `main`; the task record is archived.

## Delivery package

1. Changes: replaced 14 lossy card-paper crops with clean transparent source marks; preserved the original right-bottom anchor; kept legacy 28x28 custom marks unscaled; made missing KardsGen sources fail closed; expanded public/generator/renderer contracts.
2. Files: core — `tools/kards_multisource_extraction.py`, `src/canvas/cardRenderer.ts`, 14 authorized set-mark PNGs, and `public/THIRD-PARTY-NOTICES.txt`; tests — the existing Python contract suite and `src/canvas/cardRenderer.test.ts`; docs — registry and this task folder; temporary files — `.runtime/qa` evidence and wrappers, removed before commit.
3. Diff from base: 14 binary replacements plus focused Stage6 routing/normalization, renderer compatibility, tests, attribution, registry, and task evidence. No unrelated feature files changed.
4. Commit status: committed in `0ff1c03b4f3d6801e01cfe2a402cf64201b421bc`; this closeout update records the integration result.
5. Base/divergence: base is `main` at `15ac497d3c469bb35843cd345e93370b7592aa2c`; fetch confirmed local `main` and `origin/main` are 0 ahead / 0 behind before integration.
6. Conflicts: green; `git worktree list` shows only this checkout, so there is no file overlap with another live worktree. Semantic impact is limited to Stage6 set-mark publication and set-mark Canvas geometry.
7. Validation: Stage6 build succeeded; 15/15 public files hash-match Stage6; Python contracts 25/25; renderer 57/57; full `npm run validate` passed 17 files / 244 tests plus TypeScript, Vite build, private-tool checks, and dist boundary; 15/15 HTTP asset probes passed; three independent reviewers report no findings.
8. Remaining risk: no exhaustive perceptual comparison was run against every possible user-supplied theme/skin; oversized custom marks are intentionally scaled down to the existing 30x28 maximum.
9. Recommendation: retain the integrated commits on `main`. No rebase, cherry-pick, auxiliary merge, or worktree cleanup is needed.
10. Integration readiness: yes. The minimal source-level fix is verified and has a clear integration path; no worktree cleanup is needed because no auxiliary worktree was created.
