# KARDS Style Replication Task Notes

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
