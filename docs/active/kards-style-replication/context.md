# KARDS Style Replication Context

## 2026-07-03 Research Start

- The user correctly reported that the first MVP is visually only "似是而非" and does not match the real official KARDS card face.
- Local repo has one main worktree at `C:\Users\raede\Documents\KARDS`, branch `master`, HEAD `27f5ae7`.
- Working tree was clean before this research pass.
- Prior MVP is an integrated baseline, not an official-style replica.

## Official Evidence Collected

- KARDS support "Cards" article states static cards contain deployment and operation costs, stats, abilities, and rarity. It also states the header contains deployment cost, operation cost, name, and nation, and that Orders/Countermeasures do not have operation costs.
- Downloaded official support image attachments into `.runtime/research/official/`:
  - `static-view.png`: 800x700
  - `cost-unit-info.png`: 550x250
  - `unit-stats.png`: 550x300
  - `unit-abilities.png`: 550x300
- A simple pixel measurement of the official `static-view.png` card body gives approximately 426x598 for the non-red card pixels, aspect 0.712. This matches the existing 500x702 canvas ratio closely, so the output size can stay 500x702 while the internal layout must change.

## Early Visual Findings

- The official static unit card is organized as a narrow header strip, large artwork, floating stat row, flat ability text block, centered rarity pips, and small set icon.
- Current MVP uses a thick decorative frame, centered title, large circular nation badge, custom red separators, serif body text, and programmatic texture. These are the wrong structural grammar for precision replication.
- The issue is not a simple palette or CSS fix; the Canvas renderer needs a new template model.

## Reference Project Findings

- KardsGen's `Material/frame.png` is exactly 500x702. Its `CardGen.Generate(...)` uses fixed coordinates and a fixed draw order, making it the strongest coordinate reference.
- KardsGen unit artwork is drawn at `12,99,476,426`; non-unit artwork is drawn at `12,13,476,476`.
- KardsGen draws the unit name bar at `98,13,390,86`, nation icon around `(450,52)`, rarity at `222,675`, set mark near `(488,692)`, attack board at `88,468`, defense board at `330,473`, and type icon at `208,473` for most unit cards.
- CraftSoul/kards-image-tool confirms browser Canvas export and a `500x702` card image assumption for deck-image composition. It uses official card image URLs through `www.kards.com/images/card/...`.
- KARDS-Assets is useful as an asset organization reference, but its README explicitly says the hosted game assets belong to 1939 Games and are for personal/non-commercial fan use.

## Current Decision

- Keep the 500x702 canvas target.
- Treat current renderer styling as a replaceable rough placeholder.
- Do not copy official-derived assets into the default app during this pass.
- Next implementation should first do a no-official-asset geometry pass: fixed official-style layout tables plus programmatic placeholder layers.
- Asset-pack import should be a later, gated research mode. The local asset-pack boundary is a risk-reduction design, not a legal guarantee. Official-derived assets should stay outside git and outside the default public build.

## Source Links

- Official card mechanics and layout: https://support.kards.com/hc/en-us/articles/360026768151-Cards
- Official static-view attachment: https://support.kards.com/hc/article_attachments/27534092718105
- Official cost/unit attachment: https://support.kards.com/hc/article_attachments/27534109436825
- Official stats attachment: https://support.kards.com/hc/article_attachments/27534109439257
- Official abilities attachment: https://support.kards.com/hc/article_attachments/27534109441561
- Official Community License: https://support.kards.com/hc/en-us/articles/360027838532-KARDS-Community-License
- KardsGen: https://github.com/Lasereyes5/KardsGen
- CraftSoul/kards-image-tool: https://github.com/CraftSoul/kards-image-tool
- KARDS-Assets: https://github.com/Gary-nope/KARDS-Assets

## 2026-07-03 Stage 1 Implementation

- Created branch `codex/kards-precision-layout` from `master` commit `b9254b9e18699d6a98213336ceba58d53588c7d8`.
- Added `src/canvas/layout.ts` as the single source of truth for the fixed 500x702 card-face geometry.
- Unit cards now use the KardsGen-style main artwork rect `12,99,476,426`, title/name bar `98,13,390,86`, cost board `12,13,86,86`, nation mark centered near `450,52`, stat boards around the official row, and footer rarity/set anchors.
- Orders and countermeasures now use the taller command artwork rect `12,13,476,476`, command type mark around `222,448`, and text/title area below the art.
- HQ cards now share the command artwork area but use a separate HQ defense board around `166,343,168,112` and do not draw deployment/operation cost.
- Replaced the previous generic card renderer flow with template-driven draw steps: base mat, artwork, name/extra border, cost, nation, frame, rarity, set, stats/type, text, print wear.
- Updated `CardCanvas` artwork drag hit testing to call `getArtworkRect(card.kind)`, so crop dragging follows the current visual template instead of the old one-size rect.
- Updated nation presets toward the KardsGen/official evidence palette and added France, Italy, Poland, Finland, and Neutral as selectable countries.
- Added focused Vitest coverage for the fixed geometry and render behavior.

## 2026-07-03 Review Fixes

- Independent code review found one P1 issue: keyword cards could draw a fourth body line into the rarity/footer area because body text was painted after rarity.
- Fixed by adding `bodyBottomY` to the template text geometry and computing the allowed body line count from that bottom boundary.
- Independent review also found that `extraBorder.height` was ignored by `drawExtraBorder`; fixed the renderer to use the layout table height directly.
- Added `isPointInsideArtwork(kind, x, y)` in the layout module and used it from `CardCanvas`, so artwork hit testing has the same single source of truth as rendering.
- Added regression tests for body/footer separation, lower border height, blank keyword lines, and kind-specific artwork hit zones.

## 2026-07-03 Validation Snapshot

- `npm run typecheck`: passed.
- `npm run test`: passed, 4 test files and 25 tests.
- `npm run build`: passed, Vite production build generated `dist/`.
- Browser smoke on existing Vite server `http://127.0.0.1:5173/?smoke=stage1`: passed.
  - Canvas size: `500x702`.
  - Canvas was nonblank: `350765` non-transparent pixels, `350999` non-white pixels.
  - PNG export path alive: `canvas.toDataURL("image/png")` length `122990`.
  - Console errors/warnings: none.
  - Network requests: 22/22 returned 200.
  - Screenshot evidence: `.runtime/qa/stage1-precision-layout-isolated.png`.
- Pending before final closeout: commit and integration decision.

## 2026-07-03 Repository Publish Context

- A later repository initialization pass is adding the root `README.md`, renaming the local default branch from `master` to `main`, and publishing the project to GitHub.
- Historical notes above still mention `master` because that was the branch name when the research and Stage 1 implementation work happened.
- Future implementation work should branch from `main` after the GitHub initialization commit is pushed.

## 2026-07-03 Stage 2 Private Asset Calibration Start

- Created isolated worktree `C:\Users\raede\Documents\KARDS-private-asset-harness` on branch `codex/kards-private-asset-harness` from `main` commit `956271ca8fd9d037dac9172a8d02ac4f9ba8a97d`.
- Current project remains private on GitHub; Stage 2 still avoids committing official KARDS image/font files.
- Re-read `lessons learned.md`; the key rule is to separate official-asset rights from geometry and keep official-derived files outside the default build.
- Loaded `research-before-fix` and `frontend-skill`.
- Frontend thesis for this stage: keep the app as a compact work surface, not a landing page; add precise local calibration controls only in the Project panel.
- Read-only subagent review results:
  - Code hotspot review confirmed `src/canvas/layout.ts`, `src/canvas/cardRenderer.ts`, `src/components/CardCanvas.tsx`, and renderer tests are the main integration surface.
  - Risk review confirmed official assets may be used locally for personal validation but must not enter git/default build.
  - Asset research confirmed the local KARDS install is a traditional `.pak` path with manifest-level visibility, but this machine does not currently expose `UnrealPak.exe`, FModel, repak, or umodel commands.
- Local KARDS install evidence:
  - Main package: `C:\Program Files (x86)\Steam\steamapps\common\KARDS\kards\Content\Paks\kards-Windows.pak`.
  - No `.utoc`/`.ucas` containers found in the KARDS `Paks` directory during this pass.
  - `Manifest_UFSFiles_Win64.txt` lists card materials, fonts, faction icon texture structures, card blueprints, and candidate artwork paths.
- Implemented Stage 2 code:
  - Added `src/canvas/renderAssets.ts` for typed renderer asset slots and specificity-based local asset selection.
  - Extended `renderCard` with optional `RenderCardOptions` while preserving the default call path.
  - Added `src/assetPack.ts` to load a user-selected local folder containing `kards-asset-pack.json`, image files, and optional fonts through browser File/FontFace APIs.
  - Added `src/visualDiff.ts` to compare the current 500x702 canvas against a user-selected reference card image.
  - Added Project panel controls for loading local asset packs and comparing a PNG reference image.
  - Added `docs/active/kards-style-replication/asset-pack-manifest.example.json` as a manifest example with no official assets.
- Current validation snapshot:
  - Initial `npm run typecheck` failed in the new worktree because `node_modules` was absent and `tsc` was not found.
  - Ran `npm ci`; completed successfully with 0 vulnerabilities.
  - `npm run typecheck`: passed after dependency install.
  - `npm run test`: passed, 6 test files and 32 tests.
  - `npm run build`: passed, Vite production build generated `dist/`.
  - HTTP smoke on temporary Vite dev server `http://127.0.0.1:5174/`: passed with HTTP 200 and root marker present.
  - Temporary dev server listener was stopped and port 5174 was confirmed clear.
- Added one lesson: browser-based private asset calibration should use a user-selected manifest folder rather than hard-coding a game install path or reading Unreal pak files directly.
- Pending:
  - Re-run validation after final review fixes.
  - Complete integration closeout.

## 2026-07-03 Stage 2 Review Fixes

- Independent final review found no critical or high severity blockers.
- Accepted all review findings:
  - Added a confirmation gate and `Export Private PNG` label when exporting while a local asset pack is loaded.
  - Added asset-pack request id and mounted-state guards so stale async loads dispose their resources instead of overwriting newer selections.
  - Added `src/assetPack.test.ts` covering manifest loading, missing-file warnings, object URL cleanup, and FontFace cleanup.
  - Added visual diff input validation for zero-size dimensions and short RGBA arrays.
- Targeted review-fix validation:
  - `npx vitest run src/assetPack.test.ts src/visualDiff.test.ts src/canvas/cardRenderer.test.ts`: passed, 3 files and 18 tests.
- Final pre-integration validation:
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 36 tests.
  - `npm run build`: passed.
  - HTTP smoke on temporary Vite dev server `http://127.0.0.1:5174/`: passed with HTTP 200 and root marker present.
  - Temporary dev server parent and child listener were stopped; port 5174 was confirmed clear.

## 2026-07-03 Stage 2 Integration Closeout

- Committed Stage 2 on branch `codex/kards-private-asset-harness` as `460294a0f3aa45c661e59e41ccc1e24ca2b94625`.
- Main was clean and already up to date with `origin/main` before integration.
- `git worktree list` showed only main and the Stage 2 private asset harness worktree; no competing KARDS implementation worktree was present.
- Changed-file overlap analysis found no cross-worktree overlap because only this implementation branch was ready for integration.
- Fast-forward merged `codex/kards-private-asset-harness` into `main`.
- Merge-result validation on `main`:
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 36 tests.
  - `npm run build`: passed.
- Pending after this note:
  - Commit this cleanup closeout note.

## 2026-07-03 Stage 2 Push And Cleanup

- Pushed `main` to `origin`: `956271c..9018579`.
- Removed integrated worktree `C:\Users\raede\Documents\KARDS-private-asset-harness`.
- Retained recovery pointers in git history and registry:
  - Feature commit: `460294a0f3aa45c661e59e41ccc1e24ca2b94625`.
  - Integration closeout commit: `9018579`.
