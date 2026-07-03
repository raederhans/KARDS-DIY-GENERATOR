# KARDS Style Replication Task Notes

## Stage 6 Current Worktree

- Worktree name/path: multi-source clean extraction, `C:\Users\raede\Documents\KARDS-multisource-clean-extraction`
- Thread/task: KARDS multi-source element, font, and view-effect extraction/calibration
- Base branch/base commit: `main`, `36e3d4e`
- Current branch/HEAD: `codex/kards-multisource-clean-extraction`, `36e3d4e`
- Task goal: extract, classify, and calibrate all feasible card-face and inspect/view elements from local KARDS files, prior private packs, and external reference repositories while keeping official-derived artifacts private under `.runtime`
- Status: ready-for-integration
- Shared hotspot files expected:
  - actual: `tools/kards_multisource_extraction.py`, `tools/kards_browser_visual_smoke.mjs`, active docs
  - renderer asset schema and renderer implementation were not changed
- Tests run so far:
  - Initial `git status --short --branch` on main: clean
  - `git fetch --prune origin`: passed
  - `git worktree add -b codex/kards-multisource-clean-extraction C:\Users\raede\Documents\KARDS-multisource-clean-extraction main`: passed
  - `git worktree list --porcelain`: main plus Stage 6 worktree only
  - `py -3 -m py_compile tools\kards_multisource_extraction.py`: passed
  - `node --check tools\kards_browser_visual_smoke.mjs`: passed
  - Stage6 generation command with explicit source paths: passed, extracted/cataloged 283 files and indexed 26045 local pak candidates
  - Stage6 artifact check: passed, manifest images 37, sample JSON files 26, required reports present
  - `npm ci`: passed, 0 vulnerabilities
  - Stage6 visual smoke on port 5181: passed, 37/37 elements, app smoke passed
  - Port 5181 check after smoke: clear
  - Independent code review: requested changes for `.runtime` guard scope, manifest path containment, and symlink cleanup safety
  - Accepted review fixes:
    - private output and visual-smoke output now reject `public`, `dist`, and `src` path segments even when `.runtime` appears below them
    - Stage5/Stage6 manifest file paths must be relative and stay inside the source pack
    - output cleanup unlinks symlinks/junctions instead of recursively following them
    - KardsGen board/frame readiness wording is now `renderer-slot-candidate-unwired-needs-smoke`
  - Final `node --check tools\kards_browser_visual_smoke.mjs`: passed
  - Final `py -3 -m py_compile tools\kards_multisource_extraction.py`: passed
  - Final Stage6 generation: passed, 283 extracted/cataloged files, 37 manifest images, 26045 local pak indexed candidates
  - Final safety guards: Python public-output guard passed, Python manifest-containment guard passed, JS public-output guard passed, JS manifest-containment guard passed
  - Final Stage6 visual smoke on port 5181: passed, 37/37 elements, report generated at `2026-07-03T21:11:33.667Z`
  - Final `npm test`: passed, 7 files and 38 tests
  - Final `npm run build`: passed, including typecheck and Vite production build
  - Final temp cleanup checks: `.runtime\tmp-malicious-pack`, `.runtime\tmp-malicious-smoke`, `public\.runtime`, and `tools\__pycache__` absent
  - Final port 5181 and 5182 checks: clear
- Tests not run yet:
  - Main-merge validation after integration
- Potential overlap with other worktrees:
  - No other active KARDS worktree exists at creation time.
  - Direct overlap risk with future private calibration branches touching `tools/kards_private_calibration.py` or active replication docs.
- Recommended integration order:
  - Integrate after Stage 5 and before renderer-level full-card typography/view polish.

## Stage 6 Delivery Package Draft

1. Changed this phase:
   - Added a dedicated multi-source private extraction tool with output ownership guards.
   - Generated a Stage6 private pack/report from Stage5 clean slots, KardsGen materials, KARDS-Assets card backs/HQ images, CraftSoul references, and local KARDS pak manifest indexing.
   - Kept `kards-asset-pack.json` limited to the 37 current smoke-safe renderer slots.
   - Added Stage6 marker support to the browser visual smoke while preserving the requirement for explicit manifest and calibration report files.
   - Recorded dimensions and renderer-readiness for candidate frame/board/HQ/font/pak/view sources.
2. Files touched:
   - Core files: none.
   - Test files: none.
   - Tooling files: `tools/kards_multisource_extraction.py`, `tools/kards_browser_visual_smoke.mjs`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Temporary/private files: `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction/**` and `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\stage6-multisource-clean-extraction/**`, gitignored.
3. Diff summary:
   - Production app behavior is unchanged.
   - New tooling creates a private multi-source report and smoke-compatible asset pack without committing official-derived files.
   - The smoke script now accepts either the Stage3/5 private calibration marker or the Stage6 multi-source marker.
4. Commit status:
   - Ready to commit on `codex/kards-multisource-clean-extraction`; integration has not run yet.
5. Base divergence:
   - Branch was created from current `main` at `36e3d4e`.
6. Potential conflicts:
   - Low direct conflict risk at start because no other active KARDS worktree exists.
7. Validation:
   - Python compile, Node syntax check, Stage6 generation, artifact presence check, safety guard negative checks, dependency install, Stage6 visual smoke, full unit tests, and production build passed.
8. Unverified risks:
   - Pak extraction remains indexed-only because no local Unreal pak/asset exporter command is available in this session.
   - KardsGen frame/board candidates are `renderer-slot-candidate-unwired-needs-smoke`; attack/defense/special/HQ board candidates also do not exactly match current renderer slot sizes and need calibration or scaling before wiring.
   - KARDS-Assets card backs/HQ images and KardsGen material assets remain private validation references; they are not public distributable assets.
   - Full-card typography, print wear, and complete visual equivalence are still outside the Stage6 smoke scope.
9. Recommended next step:
   - Run full verification and independent review, then integrate if clean.
10. Integration recommendation:
   - Merge this branch after a normal integration check; no cherry-pick is needed unless main drifts.

## Stage 5 Integrated Worktree

- Worktree name/path: card-face elements Stage 5, `C:\Users\raede\Documents\KARDS-card-face-elements-stage5` (removed after integration)
- Thread/task: KARDS remaining card-face, variable-element, and inspect/view-effect extraction
- Base branch/base commit: `main`, `87c136d`
- Current branch/HEAD: merged into `main` at `4c90d36`; local branch deleted after merge
- Task goal: extract and calibrate the remaining card-face and card-view/inspect-state elements while excluding in-match gameplay effects and keeping official-derived assets private under `.runtime`
- Status: integrated
- Shared hotspot files touched: private extraction tooling and active docs; renderer slot schema, renderer implementation, and visual smoke tooling were not changed
- Tests run so far:
  - Initial `git status --short --branch`: clean on `main`
  - `git worktree list --porcelain`: only main existed before Stage 5 worktree creation
  - Stage 5 worktree creation: passed from `87c136d`
  - `py -3 -m py_compile tools\kards_private_calibration.py`: passed
  - Stage 5 generation command: passed, selected 23 official samples and 3 synthetic HQ samples, covered 98/98 axes, generated 37 manifest images and 425 reference crops
  - Reviewer fix verification: HQ reference crop count is 0 and HQ definitions are `synthetic-layout-only`, so no official HQ crop is claimed
  - Default Stage 3 generation without `--profile`: passed, 15 samples, 37/37 coverage, 37 manifest images
  - Stage 3 default regression visual smoke: passed, 37/37 elements
  - `npm ci`: passed after the first smoke attempt exposed missing `node_modules`
  - Stage 5 visual smoke on pack `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage5-card-face-elements`: passed, 37/37 elements
  - `npm test`: passed, 7 files and 38 tests
  - `npm run build`: passed
  - Port 5179 check after smoke: clear
  - Independent review: first pass found the HQ coverage overclaim and missing Stage3 regression; second pass confirmed both issues closed and approved integration
  - Fast-forward merge into `main`: passed, `87c136d..4c90d36`
  - Merge-result `py -3 -m py_compile tools\kards_private_calibration.py`: passed
  - Merge-result default Stage 3 generation: passed, 37/37 coverage and 37 manifest images
  - Merge-result Stage 5 generation: passed, 98/98 coverage, 37 manifest images, 425 reference crops
  - Merge-result Stage 3 default regression visual smoke: passed, 37/37 elements
  - Merge-result Stage 5 visual smoke: passed, 37/37 elements
  - Merge-result `npm test`: passed, 7 files and 38 tests
  - Merge-result `npm run build`: passed
  - Merge-result port checks: 5179 and 5180 clear
  - `git push origin main`: passed, pushed `87c136d..4c90d36`
  - `git worktree remove C:\Users\raede\Documents\KARDS-card-face-elements-stage5`: passed
  - `git branch -d codex/kards-card-face-elements-stage5`: passed
- Tests not run yet:
  - none for Stage 5 closeout
- Potential overlap with other worktrees:
  - Direct overlap with renderer/layout/smoke work touching `src/canvas/cardRenderer.ts`, `src/canvas/renderAssets.ts`, or `tools/kards_browser_visual_smoke.mjs`
  - No other active KARDS feature worktree existed before Stage 5 was created
- Recommended integration order:
  - Integrate after Stage 4 visual-smoke calibration and before full-card typography/view polish

## Stage 5 Delivery Package Draft

1. Changed this phase:
   - Added `--profile stage5` to the private calibration tool while keeping Stage 3 as the default profile.
   - Generated a private Stage 5 element pack with official card-face/reference crops, variable coverage metadata, synthetic HQ layout samples, and local KARDS manifest candidate indexing.
   - Kept the browser-loadable `kards-asset-pack.json` limited to clean renderer-ready icon slots.
   - Marked full-card, board, text, number, print-wear, and inspect/view surfaces as `reference-only`; marked `view-glow` and `zoom-shadow` as `indexed-only-unextracted`.
   - Marked HQ definitions as `synthetic-layout-only` so the report covers HQ layout variables without claiming official HQ pixel extraction.
   - Documented output, validation, and integration state.
2. Files touched:
   - Core files: none.
   - Test files: none.
   - Tooling files: `tools/kards_private_calibration.py`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Lessons: `lessons learned.md`.
   - Temporary/private files: `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage5-card-face-elements/**` and `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\stage5-card-face-elements/**`, gitignored.
3. Diff summary:
   - Production app behavior is unchanged.
   - The private generator gained a Stage 5 profile for broader element/variable coverage reports.
   - Active docs now record the Stage 5 output and validation evidence.
4. Commit status:
   - Feature committed as `4c90d36`, fast-forward merged into `main`, pushed to `origin/main`, and cleaned up.
5. Base divergence:
   - Branch was created from `main` at `87c136d`; integration remained fast-forward with no conflicting remote drift.
6. Potential conflicts:
   - Low direct product-code conflict risk because no renderer files changed.
   - Moderate documentation/tooling conflict risk with any branch also changing `tools/kards_private_calibration.py` or active replication docs.
7. Validation:
   - Python compile, Stage 5 generation, Stage 5 visual smoke, default Stage 3 regression generation/smoke, full unit tests, and production build passed.
8. Unverified risks:
   - `view-glow` and `zoom-shadow` are indexed but not pixel-extracted because pak extraction is still not available in this stage.
   - HQ uses local synthetic layout coverage only; official HQ card-face pixels remain unavailable in this data route.
   - Full-card/text/number/board crops remain measurement references only; they are not clean reusable renderer assets.
   - Browser-side folder loading still cannot enforce absolute `.runtime` read paths; write-side extraction guards stay strict.
9. Recommended next step:
   - Use this private Stage 5 output as the baseline for later clean pak/font/view-effect extraction.
10. Integration recommendation:
   - Integrated by normal fast-forward merge into `main`; no cherry-pick was needed.

## Stage 4 Integrated Worktree

- Worktree name/path: visual smoke calibration, `C:\Users\raede\Documents\KARDS-visual-smoke-calibration` (removed after integration)
- Thread/task: KARDS Stage 4 browser visual smoke and per-element pixel calibration
- Base branch/base commit: `main`, `f4681f6`
- Current branch/HEAD: merged into `main` at `81d7f8b`; local branch deleted after merge
- Task goal: run a reproducible browser smoke against the private Stage 3 pack, compare every unique manifest element by pixels, calibrate renderer issues, and extract reusable private visual artifacts under `.runtime`
- Status: integrated
- Cleanup status: integrated worktree removed after push; feature commit remains recoverable at `81d7f8b`
- Shared hotspot files touched: `src/canvas/cardRenderer.ts`, renderer tests, package scripts/dependencies, active docs, visual smoke tooling
- Tests run so far:
  - `npm ci`: passed, 0 vulnerabilities
  - `node --check tools\kards_browser_visual_smoke.mjs`: passed
  - `py -3 -B -m py_compile tools\kards_artifact_pixel_audit.py`: passed
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/renderAssets.test.ts`: passed, 16 tests
  - `npm run typecheck`: passed
  - `npm run test`: passed, 7 files and 38 tests
  - `npm run build`: passed
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest" --port 5178`: passed, 37/37 elements
  - Code-review fix checks: non-owned output refusal passed; pixel-audit `diffPath` escape refusal passed
  - Final review-fix validation repeated `npm run typecheck`, `npm run test`, `npm run build`, and visual smoke successfully
  - Independent architecture review: `WATCH`, no blocker; element-slot scope must stay explicit
  - Independent verifier: approved the report/artifact/git-boundary evidence
  - Anti-slop cleanup review: no masking fallback slop found in the scoped changes
  - Fast-forward merge into `main`: passed, `f4681f6..81d7f8b`
  - Merge-result dependency refresh: `npm ci` was blocked by an existing Vite/esbuild listener on port 5173; `npm install` passed and left no tracked file changes
  - Merge-result `npm run typecheck`: passed
  - Merge-result `npm run test`: passed, 7 files and 38 tests
  - Merge-result `npm run build`: passed
  - Merge-result visual smoke: passed, 37/37 elements, report generated at `2026-07-03T19:37:31.299Z`
  - `git push origin main`: passed
  - `git worktree remove C:\Users\raede\Documents\KARDS-visual-smoke-calibration`: passed
  - `git branch -d codex/kards-visual-smoke-calibration`: passed
- Tests not run yet:
  - No remaining Stage 4 tests before the next typography/atlas stage
- Potential overlap with other worktrees:
  - Direct overlap with any branch touching `src/canvas/cardRenderer.ts`, renderer tests, or package dependency files
  - No active Stage 4 worktree remains
- Recommended integration order:
  - Integrate after Stage 3 private pack generation and before full-card typography/atlas extraction

## Stage 4 Delivery Package Draft

1. Changed this phase:
   - Added a browser-backed visual smoke that renders the Stage 3 private pack and crops every manifest element.
   - Added a Pillow pixel audit that compares rendered crops against original reference PNGs and writes exact diff PNGs.
   - Added `npm run smoke:visual:kards` and Playwright as a dev dependency for reproducible browser smoke.
   - Fixed renderer calibration issues found by the smoke: integer-aligned rarity pips and no-keyword body copy below the unit icon row.
   - Generated private `.runtime` artifacts with 37 rendered crops, 37 diff PNGs, 37 extracted references, and a JSON/Markdown report.
2. Files touched:
   - Core files: `src/canvas/cardRenderer.ts`.
   - Test files: `src/canvas/cardRenderer.test.ts`.
   - Tooling files: `tools/kards_browser_visual_smoke.mjs`, `tools/kards_artifact_pixel_audit.py`, `package.json`, `package-lock.json`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Temporary/private files: `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest/**`, gitignored.
3. Diff summary:
   - Production renderer changes are two narrow coordinate/text-position fixes.
   - New smoke tooling is explicit and private-output guarded.
   - Official-derived images remain outside git.
4. Commit status:
   - Committed as `81d7f8b`, fast-forward merged into `main`, pushed to `origin/main`, and cleaned up.
5. Base divergence:
   - Branch was created from `main` at `f4681f6`; main had no remote drift before the fast-forward merge.
6. Potential conflicts:
   - Moderate direct conflict risk with renderer/layout work and package dependency changes.
7. Validation:
   - Browser visual smoke passed: 37/37 unique elements, `maxDelta=0`, `changedRatio=0`.
   - App canvas smoke passed: `500x702`, nonblank.
   - Targeted renderer tests, full typecheck, full test suite, and production build passed after calibration fixes.
   - Review-fix guard checks passed for output ownership and pixel-audit path containment.
8. Unverified risks:
   - This is an element-slot probe, not a full-card text/font equivalence claim.
   - The private pack is still full-card-crop derived; cleaner atlas extraction may be needed for broader materials.
   - Browser-side asset-pack reading cannot reliably enforce absolute `.runtime` paths; write-side private artifact guards are enforced.
9. Recommended next step:
   - Start the next precision stage only if full-card typography, print wear, or cleaner pak/UI-atlas extraction is required.
10. Integration recommendation:
   - Integrated by normal fast-forward merge into `main`; no cherry-pick was needed.

## Stage 3 Current Worktree

- Worktree name/path: source asset calibration, `C:\Users\raede\Documents\KARDS-source-asset-calibration`
- Thread/task: KARDS official-card source asset import and compact coverage calibration
- Base branch/base commit: `main`, `7e0f1a0`
- Current branch/HEAD: merged into `main` and pushed at `864fb91`
- Task goal: generate a private local official-reference coverage pack from CraftSoul/KARDS official card images while keeping official-derived assets out of git and default builds
- Status: integrated
- Cleanup status: integrated worktree removed and merged local branch deleted; recovery commit is `864fb91`
- Shared hotspot files touched: `src/presets.ts`, card import normalization tests, active docs, private calibration tooling
- Tests run so far:
  - Private calibration script: passed, selected 15 samples, covered 37/37 requirements, generated 37 manifest images
  - Output image spot checks: passed for full card, nation mark, type icon, set mark, and sample JSON presence
  - Marker/output safety: passed, output outside `.runtime` is refused unless explicitly overridden
  - Independent code review: passed after fixing the medium-risk output-cleaning issue
  - `py -3 -B -m py_compile tools\kards_private_calibration.py`: passed
  - `npm run typecheck`: passed
  - `npm run test`: passed, 7 files and 36 tests
  - `npm run build`: passed
- Tests not run yet:
  - Browser private pack load smoke
- Potential overlap with other worktrees:
  - Direct overlap with any parallel preset/schema work touching `src/presets.ts` or `src/cardModel.test.ts`
  - No other active KARDS worktree was present when this branch was created
- Recommended integration order:
  - Integrate after Stage 2 private asset harness, before deeper renderer calibration or full Unreal atlas extraction

## Stage 3 Delivery Package Draft

1. Changed this phase:
   - Added a Python private calibration tool that selects representative official cards and builds a local coverage pack.
   - Generated a private `.runtime` pack covering every faction, card kind, rarity, and set/package mark at least once.
   - Added Anzac and official set ids to the app presets so generated samples import without fallback drift.
   - Kept official-derived PNGs and sample JSON outputs outside git.
2. Files touched:
   - Core files: `src/presets.ts`.
   - Test files: `src/cardModel.test.ts`.
   - Tooling files: `tools/kards_private_calibration.py`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Temporary/private files: `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack/**` and `sources/craftsoul-data.json`, gitignored.
3. Diff summary:
   - Production behavior changes are limited to official set/faction preset coverage.
   - The private generation path is a local CLI script; the browser still only loads a user-selected asset-pack folder.
   - Official-derived files are not committed.
4. Commit status:
   - Committed as `864fb91`, fast-forward merged into `main`, and pushed to `origin/main`.
5. Base divergence:
   - Branch was created from current `main` at `7e0f1a0`; merge remained fast-forward with no remote drift.
6. Potential conflicts:
   - Low direct conflict risk unless another branch also changes `src/presets.ts` or active replication docs.
7. Validation:
   - Script generation passed and output report shows 37/37 coverage.
   - Spot checks confirmed expected image dimensions.
   - Output safety guard rejects non-`.runtime` destinations by default and marker-protects generated subdirectory cleanup.
   - Typecheck, unit tests, and production build passed.
8. Unverified risks:
   - Generated slices come from full rendered cards, so text/number-bearing crops remain measurement references only.
   - Clean reusable boards, frames, and fonts still require later pak/UI-atlas extraction.
   - No browser load smoke has run yet for this newly generated private pack.
9. Recommended next step:
   - Use the app's Load Assets and Compare PNG path for a focused browser calibration pass against the generated private pack.
10. Integration recommendation:
   - Integrated by normal fast-forward merge into `main`; no cherry-pick was needed.

## Stage 2 Current Worktree

- Worktree name/path: private asset harness, `C:\Users\raede\Documents\KARDS-private-asset-harness`
- Thread/task: KARDS official-style private asset-pack calibration and reference pixel diff
- Base branch/base commit: `main`, `956271ca8fd9d037dac9172a8d02ac4f9ba8a97d`
- Current branch/HEAD: merged into `main` at `460294a0f3aa45c661e59e41ccc1e24ca2b94625`
- Task goal: support personal local official-material validation through a user-selected asset pack and reference-PNG pixel metrics while keeping official assets out of git and default builds
- Status: integrated
- Cleanup status: integrated worktree removed after push; feature commit remains recoverable at `460294a0f3aa45c661e59e41ccc1e24ca2b94625`
- Shared hotspot files touched: `src/canvas/cardRenderer.ts`, `src/components/CardCanvas.tsx`, `src/components/ProjectPanel.tsx`, `src/App.tsx`, renderer tests, active docs
- Tests run:
  - `npm ci`: passed, 0 vulnerabilities
  - `npm run typecheck`: passed
  - `npm run test`: passed, 7 files and 36 tests
  - `npm run build`: passed
  - HTTP smoke at `http://127.0.0.1:5174/`: passed, HTTP 200 and root marker present
  - Final review-fix target test: passed, 3 files and 18 tests
- Tests not run yet:
  - No real official extracted asset pack was loaded in browser because this worktree does not contain official assets and this machine lacks a local UnrealPak/FModel/repak executable.
  - No Playwright/UI automation suite exists.
- Potential overlap with other worktrees:
  - Direct overlap risk with any parallel renderer/UI work touching `src/canvas/cardRenderer.ts`, `src/components/CardCanvas.tsx`, `src/components/ProjectPanel.tsx`, or `src/App.tsx`.
  - No other KARDS worktree existed before creating this branch.
- Recommended integration order:
  - Integrate this infrastructure before any extracted-material atlas or exact official sprite-slicing pass.

## Stage 2 Delivery Package Draft

1. Changed this phase:
   - Added typed renderer asset slots and a specificity-based local asset resolver.
   - Extended `renderCard` with optional asset/font render options while preserving default placeholder rendering.
   - Added a browser local asset-pack loader for a user-selected folder containing `kards-asset-pack.json`, images, and optional fonts.
   - Added Project panel controls for loading local assets and comparing the current canvas against a reference PNG.
   - Added pixel diff metrics for MAE, RMSE, max channel delta, and changed-pixel ratio.
2. Files touched:
   - Core files: `src/canvas/renderAssets.ts`, `src/canvas/cardRenderer.ts`, `src/assetPack.ts`, `src/visualDiff.ts`, `src/App.tsx`, `src/components/CardCanvas.tsx`, `src/components/ProjectPanel.tsx`, `src/styles.css`.
   - Test files: `src/canvas/cardRenderer.test.ts`, `src/canvas/renderAssets.test.ts`, `src/assetPack.test.ts`, `src/visualDiff.test.ts`.
   - Docs: `docs/active/_worktree_registry.md`, `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `asset-pack-manifest.example.json`.
   - Lessons: `lessons learned.md`.
   - Temporary files: `.runtime/dev/*` only, gitignored.
3. Diff summary:
   - Production changes are concentrated in Canvas rendering options, local asset-pack session state, Project panel controls, and optional visual diff support.
   - `CardSpec` schema remains unchanged; local official assets are not saved into JSON/localStorage.
   - Default rendering still works without an asset pack.
4. Commit status:
   - Committed as `460294a0f3aa45c661e59e41ccc1e24ca2b94625` and fast-forward merged into `main`.
5. Base divergence:
   - Branch was created from current `main` at `956271ca8fd9d037dac9172a8d02ac4f9ba8a97d`; main has not been updated during this implementation yet.
6. Potential conflicts:
   - High direct-conflict risk with future renderer/UI branches touching the same files; low conflict risk with docs-only or storage-only changes.
7. Validation:
   - Typecheck, unit tests, build, focused review-fix tests, and HTTP smoke all passed after `npm ci`.
8. Unverified risks:
   - Real official asset extraction was not performed because no local UnrealPak/FModel/repak executable was found.
   - Browser folder loading is implemented around `webkitdirectory`, which is suitable for Chromium-style local use but not a full cross-browser asset management system.
   - Pixel diff currently compares numeric output only; it does not yet render an overlay heatmap.
9. Recommended next step:
   - Commit, merge into `main`, push, then use an external Unreal asset browser/exporter to create a private `kards-asset-pack.json` folder for actual official-material calibration.
10. Integration recommendation:
   - Integrated by normal fast-forward merge into `main`; no cherry-pick was needed.

## Stage 1 Current Worktree

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: KARDS official-style Stage 1 precision layout implementation
- Base branch/base commit: `master`, `b9254b9e18699d6a98213336ceba58d53588c7d8`
- Current branch/HEAD: `master`, integrated Stage 1 implementation commit
- Task goal: replace the rough KARDS-like Canvas styling with evidence-backed fixed card-face geometry while keeping official assets out of the default app
- Status: integrated
- Shared hotspot files touched: `src/canvas/cardRenderer.ts`, `src/components/CardCanvas.tsx`, `src/presets.ts`, renderer tests
- Tests run:
  - `npm run typecheck`: passed
  - `npm run test`: passed, 4 files and 25 tests
  - `npm run build`: passed
  - Browser smoke at `http://127.0.0.1:5173/?smoke=stage1`: passed, Canvas nonblank and PNG data URL generated
- Tests not run yet:
  - No full E2E suite exists.
- Potential overlap with other worktrees:
  - `git worktree list` currently shows only `C:\Users\raede\Documents\KARDS`.
- Recommended integration order:
  - Finish this precision layout pass before any future asset-pack import, typography extraction, or official-material calibration work.

## Stage 1 Delivery Package Draft

1. Changed this phase:
   - Added a fixed Canvas layout table for unit, command, and HQ card faces.
   - Reworked `renderCard` around the KardsGen/official-style draw order and coordinates.
   - Moved artwork crop hit testing to the active template artwork rectangle.
   - Adjusted country palette/preset coverage for official-style nations.
   - Added renderer/layout tests for coordinates, canvas size, and artwork cover placement.
   - Fixed review findings around footer text overlap, lower border height, and artwork hit-zone regression coverage.
2. Files touched:
   - Core files: `src/canvas/layout.ts`, `src/canvas/cardRenderer.ts`, `src/components/CardCanvas.tsx`, `src/presets.ts`.
   - Test files: `src/canvas/layout.test.ts`, `src/canvas/cardRenderer.test.ts`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Lessons: `lessons learned.md`.
   - Temporary files: none intentionally added.
3. Diff summary:
   - Production renderer changes are concentrated in the Canvas drawing layer and preset list.
   - The public `renderCard(canvas, card, artworkImage?)` API remains unchanged.
   - `CardSpec` schema remains version 1 and unchanged.
4. Commit status:
   - Committed during final closeout.
5. Base divergence:
   - Branch was created from current `master` at `b9254b9e18699d6a98213336ceba58d53588c7d8` and merged back after verification.
6. Potential conflicts:
   - No parallel KARDS worktrees detected. Future work touching `src/canvas/cardRenderer.ts` or `src/components/CardCanvas.tsx` should rebase after this pass.
7. Validation:
   - Typecheck, unit tests, build, and focused browser smoke all passed.
8. Unverified risks:
   - Visual similarity is improved structurally, but exact official fonts and material textures are intentionally not bundled.
   - A browser visual smoke still needs to confirm the static app renders the new geometry live.
9. Recommended next step:
   - Start the next stage only after deciding the official-asset/font policy boundary.
10. Integration recommendation:
   - Integrated by normal fast-forward merge into `master`; no cherry-pick was needed.

## Current Worktree

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: KARDS official-style card-face replication research
- Base branch/base commit: `master`, `27f5ae7`
- Current branch/HEAD: `master`, research closeout committed in current HEAD
- Task goal: replace rough styling assumptions with evidence-backed official card-face replication requirements
- Status: integrated

## Hotspot Files Expected In Next Implementation

- Core renderer: `src/canvas/cardRenderer.ts`
- Card model/schema: `src/cardModel.ts`, `src/types.ts`
- Presets and visual vocabulary: `src/presets.ts`
- Canvas interaction: `src/components/CardCanvas.tsx`
- UI layout and preview sizing: `src/styles.css`
- Renderer tests: `src/canvas/cardRenderer.test.ts`

## Validation Log

- `git status --short`: clean before research docs were created.
- Official support images downloaded and dimensions confirmed with local image inspection.
- KardsGen `frame.png` dimensions confirmed locally as 500x702.
- KardsGen `CardGen.cs`, `Material.cs`, CraftSoul `index.html`/`builder.html`, and KARDS-Assets README/index script inspected.

## Open Items

- Future implementation should decide the exact user-facing asset-pack import UX.

## Delivery Package

1. Changed this phase:
   - Added active research plan/context/task notes.
   - Added an evidence-backed research report for official-style replication.
   - Confirmed that current MVP size is right but its visual structure is wrong.
   - Identified KardsGen coordinates as the best next renderer baseline.
   - Identified a no-official-asset geometry pass as the safest first implementation path.
   - Identified local asset-pack import as a later gated research mode, not a legal guarantee.
2. Files touched:
   - Core files: none.
   - Test files: none.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `research.md`.
   - Lessons: `lessons learned.md`.
   - Temporary evidence: `.runtime/research/**` only.
3. Diff summary:
   - Documentation-only research and planning update; no production behavior changed.
4. Commit status:
   - Documentation-only closeout is committed in the current HEAD.
5. Base divergence:
   - Base commit `27f5ae7`; no remote configured in this repo.
6. Potential conflicts:
   - No other KARDS worktrees detected. Future implementation will touch renderer hotspots listed above.
7. Validation:
   - Local image dimensions checked.
   - Reference files inspected with targeted `rg` and line reads.
8. Unverified risks:
   - Exact high-resolution official original card size and font files are not bundled.
   - Asset distribution policy needs a user decision before shipping or enabling official-derived assets.
9. Recommended next step:
   - Implement the precision layout pass on top of `master`, using fixed layout tables and programmatic placeholder layers first.
10. Integration recommendation:
   - This documentation is safe to commit directly on `master`. Stage 1 implementation should follow as a separate commit.
