# KARDS Style Replication Task Notes

## Stage 2 Current Worktree

- Worktree name/path: private asset harness, `C:\Users\raede\Documents\KARDS-private-asset-harness`
- Thread/task: KARDS official-style private asset-pack calibration and reference pixel diff
- Base branch/base commit: `main`, `956271ca8fd9d037dac9172a8d02ac4f9ba8a97d`
- Current branch/HEAD: `codex/kards-private-asset-harness`, uncommitted implementation pending integration commit
- Task goal: support personal local official-material validation through a user-selected asset pack and reference-PNG pixel metrics while keeping official assets out of git and default builds
- Status: ready-for-integration
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
   - Not committed yet; pending final review/validation and integration closeout.
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
   - Merge this branch into `main` after final review; no cherry-pick needed unless another renderer branch appears before integration.

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
