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

## 2026-07-03 Stage 3 Source Asset Calibration Start

- Created isolated worktree `C:\Users\raede\Documents\KARDS-source-asset-calibration` on branch `codex/kards-source-asset-calibration` from `main` commit `7e0f1a`.
- Re-read `research-before-fix`, `frontend-skill`, and `lessons learned.md`.
- No project-local `AGENTS.md`, `.codex/**`, or `.omx/**` project override files were found by the required `rg --files` pass.
- Python 3.12 and Pillow 12.2 are available locally, so private image conversion/cropping can run without adding a Node image dependency.
- Read-only subagent review recommended the short route for Stage 3:
  - Use CraftSoul `data.json` as the card index.
  - Download official KARDS full-card images from `https://www.kards.com/images/card/v52/<lang>/<image>`.
  - Keep local pak extraction for a later clean-atlas pass because UnrealPak/FModel/repak/umodel are not currently installed.
- Local KARDS evidence from the subagent:
  - Install exists at `C:\Program Files (x86)\Steam\steamapps\common\KARDS`.
  - Main pak exists at `...\kards\Content\Paks\kards-Windows.pak`, about 7.1GB, dated 2026-07-02.
  - No `UnrealPak.exe`, `FModel.exe`, `repak.exe`, or `umodel.exe` was found in PATH, Downloads, or common install locations.

## 2026-07-03 Stage 3 Coverage Decision

- The user clarified that coverage does not need every faction-kind combination. The target is one representative per subcategory:
  - every faction, including Neutral and Anzac,
  - every card kind: infantry, tank, fighter, bomber, artillery, order, countermeasure,
  - every rarity,
  - every set/package mark in the data.
- CraftSoul data contains 1613 card entries, 11 factions, 7 card kinds, 4 rarities, and 15 sets.
- A full existing faction-kind matrix would require 65 samples; the clarified coverage target only needs a compact representative set.
- Implemented `tools/kards_private_calibration.py` to:
  - download or reuse CraftSoul data,
  - greedily select a deterministic compact coverage set,
  - download official full-card AVIF images,
  - convert them to PNG,
  - crop reference artwork and measured slices using the current 500x702 layout coordinates,
  - generate a browser-loadable `kards-asset-pack.json` with only nation marks, type icons, rarity pips, and set marks,
  - generate sample `.card.json` project files with local data-URL artwork under `.runtime`.
- Updated the app presets to include Anzac and the 15 set ids from the official card data, so generated sample JSON does not collapse to fallback presets.

## 2026-07-03 Stage 3 Private Pack Output

- Ran:
  - `py -3 tools\kards_private_calibration.py --data-file C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\sources\craftsoul-data.json --output C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack`
- Generated private output folder:
  - `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack`
- Output summary:
  - selected samples: 15
  - required coverage items: 37
  - covered items: 37
  - missing items: 0
  - manifest images: 37
  - total generated files: 229
- Coverage report confirms:
  - factions: Anzac, Britain, Finland, France, Germany, Italy, Japan, Neutral, Poland, Soviet, USA
  - types: artillery, bomber, countermeasure, fighter, infantry, order, tank
  - rarities: Elite, Limited, Special, Standard
  - sets: Allegiance, Base, BloodAndIron, Breakthrough, BrothersInArms, CovertOps, Homefront, Legions, NavalWarfare, OceaniaStorm, OnlySpawnable, Special, TheatersOfWar, WinterWar, WorldAtWar
- Image spot checks:
  - `references/cards/t70.png`: 500x702 RGBA
  - `images/nations/soviet.png`: 54x54 RGBA
  - `images/types/tank.png`: 84x72 RGBA
  - `images/sets/base.png`: 28x28 RGBA
  - `samples/t70.card.json`: generated with embedded artwork data URL
- Policy boundary:
  - generated official-derived files are in `.runtime`, which is gitignored.
  - only the generation script, preset ids, and documentation should be committed.

## 2026-07-03 Stage 3 Review Fix And Validation

- Independent code review found no critical or high severity blockers.
- Accepted the medium-risk review finding:
  - Previous script output accepted arbitrary directories and would clean `references/`, `images/`, and `samples` under that output path.
  - Fixed by requiring output under a `.runtime` path unless `--allow-outside-runtime` is explicit.
  - Added `.kards-private-calibration-output` marker ownership before cleaning generated subdirectories.
- Validation after the fix:
  - Private pack regeneration: passed, still selected 15 samples and covered 37/37 requirements.
  - Marker check: passed, `.kards-private-calibration-output` exists.
  - Manifest integrity: passed, 37 manifest image entries and no missing files.
  - Safety refusal check: passed, output to `C:\Users\raede\Documents\KARDS\unsafe-private-output` was rejected because it is outside `.runtime`.
  - `py -3 -B -m py_compile tools\kards_private_calibration.py`: passed.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 36 tests.
  - `npm run build`: passed.

## 2026-07-03 Stage 3 Integration Closeout

- Committed Stage 3 on branch `codex/kards-source-asset-calibration` as `864fb91`.
- Main was clean and up to date with `origin/main` before integration.
- `git worktree list` showed only main and the Stage 3 source-asset calibration worktree.
- Changed-file overlap analysis found no competing worktree overlap.
- Fast-forward merged `codex/kards-source-asset-calibration` into `main`.
- Merge-result validation on `main`:
  - Private pack regeneration: passed, selected 15 samples and covered 37/37 requirements.
  - `py -3 -B -m py_compile tools\kards_private_calibration.py`: passed.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 36 tests.
  - `npm run build`: passed.
  - Manifest/marker check: passed, marker exists, 37 manifest images present, no missing files.
- Pushed `main` to `origin`: `7e0f1a0..864fb91`.
- Removed integrated worktree `C:\Users\raede\Documents\KARDS-source-asset-calibration`.
- Deleted merged local branch `codex/kards-source-asset-calibration`.
- Recovery pointer: `864fb91`.

## 2026-07-03 Stage 4 Visual Smoke Calibration Start

- Created isolated worktree `C:\Users\raede\Documents\KARDS-visual-smoke-calibration` on branch `codex/kards-visual-smoke-calibration` from `main` commit `f4681f6`.
- Re-read `ultragoal`, `frontend-skill`, `lessons learned.md`, active replication docs, and the worktree registry.
- No project-local `AGENTS.md`, `.codex/**`, or `.omx/**` project override files were found by the required `rg --files` pass.
- Reused the Stage 3 private pack at `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack`.
- Added Playwright as a dev dependency because this stage needs a reproducible browser owner for Canvas smoke.
- Added `tools/kards_browser_visual_smoke.mjs`:
  - starts a temporary Vite server on a strict port,
  - opens Chromium through Playwright,
  - verifies the live app canvas is `500x702` and nonblank,
  - imports the renderer modules from Vite,
  - renders each representative Stage 3 sample with the local asset pack,
  - crops every manifest element slot,
  - writes `rendered/`, `diff/`, `extracted/`, `app-smoke.png`, `visual-smoke-report.json`, and `visual-smoke-report.md` under `.runtime`.
- Added `tools/kards_artifact_pixel_audit.py`:
  - compares rendered crop PNGs against the original private reference PNGs with Pillow,
  - rewrites diff PNGs from exact file-level RGBA deltas,
  - refuses output without the `.runtime` path and `.kards-visual-smoke-output` marker.

## 2026-07-03 Stage 4 Calibration Findings

- First smoke run found 33/37 pass and 4 review.
- The two `type-icon` reviews were not coordinate errors. The sampled cards had `BLITZ`; our text layer was drawing after the icon and touching the bottom of the type-icon crop.
- The two `rarity-pip` reviews came from limited/elite pip groups starting at `.5` pixel positions, which caused browser interpolation when drawing local pip assets.
- Fixed renderer behavior:
  - rarity pip group start X is now rounded before drawing,
  - no-keyword body copy starts at the layout `bodyY`, keeping it below the unit type-icon row.
- The final element probe deliberately uses `asset-slot-isolated` mode with text and print wear disabled. This proves element geometry and asset slot drawing without mixing in uncalibrated official font/text layers.

## 2026-07-03 Stage 4 Visual Smoke Result

- Ran:
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest" --port 5178`
- Result: passed with exit code 0.
- Summary:
  - total elements: 37
  - pass: 37
  - review: 0
  - fail: 0
  - nation-mark: 11
  - type-icon: 7
  - rarity-pip: 4
  - set-mark: 15
- App smoke:
  - canvas: `500x702`
  - non-transparent pixels: `350775`
  - non-white pixels: `350999`
- Final report:
  - `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest\visual-smoke-report.json`
  - `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest\visual-smoke-report.md`
- Scope recorded in the report:
  - validates asset slot geometry and per-element rendered crop identity,
  - does not validate full-card typography, print wear, or complete card visual equivalence.
- Reusable private artifacts:
  - `rendered/`: 37 rendered slot crops
  - `diff/`: 37 exact pixel diff PNGs
  - `extracted/`: 37 copied original reference elements
- The temporary Vite server on port 5178 was stopped and the port was confirmed clear.

## 2026-07-03 Stage 4 Review And Ready State

- Full validation after docs update:
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 38 tests.
  - `npm run build`: passed.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest" --port 5178`: passed, 37/37 elements.
  - Port 5178 was confirmed clear after the smoke.
- Independent code review found three issues:
  - App canvas smoke failure did not affect the script exit code.
  - Python pixel audit accepted a caller-provided `diffPath` outside the owned output root.
  - Python bytecode caches were not ignored.
- Accepted and fixed all three:
  - `tools/kards_browser_visual_smoke.mjs` now exits nonzero when `appSmoke.ok` is false.
  - `tools/kards_artifact_pixel_audit.py` now requires rendered/extracted/diff artifact paths to stay inside the owned output root.
  - `.gitignore` now ignores `__pycache__/` and `*.py[cod]`.
- Review-fix validation:
  - `node --check tools\kards_browser_visual_smoke.mjs`: passed.
  - `py -3 -B -m py_compile tools\kards_artifact_pixel_audit.py`: passed.
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/renderAssets.test.ts`: passed, 16 tests.
  - Non-owned output refusal check: passed and preserved the existing file.
  - Pixel-audit `diffPath` escape refusal check: passed and wrote no rogue diff.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 38 tests.
  - `npm run build`: passed.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest" --port 5178`: passed, 37/37 elements.
  - Final visual smoke report generated at `2026-07-03T19:34:37.958Z`; port 5178 was confirmed clear afterward.
- Independent architecture review returned `WATCH`, not a blocker:
  - It confirmed the approach is correctly scoped and not over-designed.
  - It warned that `37/37` must remain labeled as element-slot validation, not full-card visual equivalence.
  - It noted read-side asset loading remains soft because browser folder selection cannot reliably enforce an absolute `.runtime` path; write-side guards remain hard.
  - The smoke report now includes a `scope` field spelling out what it validates and what it does not validate.
- Independent verifier approved the stage after checking the final report, generated artifact paths, no official assets in git, and the ready-for-integration documentation state.
- Final anti-slop cleanup review found no masking fallback slop in the scoped changes. The retry/catch paths in the smoke script are limited to dev-server startup, process cleanup, CLI output, or artifact parsing boundaries and remain grounded by tests or failure propagation.
- Pending:
  - No Stage 4 implementation work remains.

## 2026-07-03 Stage 4 Integration Closeout

- Committed Stage 4 on branch `codex/kards-visual-smoke-calibration` as `81d7f8b`.
- Main was clean and up to date with `origin/main` before integration.
- `git worktree list` showed only main and the Stage 4 visual-smoke worktree before merge; changed-file overlap analysis found no competing ready worktree.
- Fast-forward merged `codex/kards-visual-smoke-calibration` into `main`: `f4681f6..81d7f8b`.
- Merge-result validation on `main`:
  - `npm ci` initially failed because an existing Vite/esbuild listener on port 5173 held `node_modules\@esbuild\win32-x64\esbuild.exe`.
  - `npm install`: passed, installed Playwright, found 0 vulnerabilities, and left no tracked file changes.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 38 tests.
  - `npm run build`: passed.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\latest" --port 5178`: passed, 37/37 elements.
  - Final merge-result visual smoke report generated at `2026-07-03T19:37:31.299Z`; port 5178 was confirmed clear afterward.
- Pushed `main` to `origin`: `f4681f6..81d7f8b`.
- Removed integrated worktree `C:\Users\raede\Documents\KARDS-visual-smoke-calibration`.
- Deleted merged local branch `codex/kards-visual-smoke-calibration`.
- Recovery pointer: `81d7f8b`.

## 2026-07-03 Stage 5 Card-Face/View Element Extraction Start

- Created isolated worktree `C:\Users\raede\Documents\KARDS-card-face-elements-stage5` on branch `codex/kards-card-face-elements-stage5` from `main` commit `87c136d`.
- Re-read `frontend-skill`, `ultrawork`, `lessons learned.md`, active replication docs, and the worktree registry.
- `ultrawork` reference file `references/agent-tiers.md` was missing locally, so Stage 5 continues with direct-tool ownership plus bounded read-only subagent lanes.
- Current first-principles boundary:
  - the user wants all remaining card-face and inspect/view-state elements;
  - official-derived assets may be generated only for private local validation under `.runtime`;
  - gameplay/combat/match effects are excluded for this stage.
- Local KARDS install still exposes manifest text files at `C:\Program Files (x86)\Steam\steamapps\common\KARDS`, including `Manifest_UFSFiles_Win64.txt`.
- Existing private Stage 3 pack remains available at `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-official-coverage-pack`.
- Stage 5 acceptance targets:
  - every extracted element class has source evidence, coordinates or source path, output path, dimensions, and a renderer-readiness conclusion;
  - official-derived files stay out of git;
  - any renderer-connected element has deterministic manifest filters and automated validation.

## 2026-07-03 Stage 5 Output And Validation

- Extended `tools/kards_private_calibration.py` with `--profile stage5`; the default profile remains Stage 3.
- Generated private Stage 5 output at `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage5-card-face-elements`.
- Output summary:
  - official samples: 23,
  - synthetic HQ samples: 3,
  - required axes: 98,
  - covered axes: 98,
  - missing axes: 0,
  - renderer-ready manifest images: 37,
  - stage5 reference crops: 425,
  - local manifest candidates: 539.
- Sample expansion beyond Stage 3 includes `b29_superfortress`, `maus`, `jet_prototype`, `gordon_highlanders`, `heroes_of_the_soviet_union`, `front_formation`, `641st_rifles`, and `554th_rifle_regiment`.
- The Stage 5 manifest deliberately keeps only clean renderer-ready slots: `nation-mark`, `type-icon`, `rarity-pip`, and `set-mark`.
- Full-card, frame, board, cost/stat, title, keyword, body, print-wear, and inspect/view crops are recorded as `reference-only`.
- `view-glow` and `zoom-shadow` are recorded as `indexed-only-unextracted`; they need pak extraction or official inspect-view captures before they can become pixel assets.
- Reviewer fix: HQ element definitions are now `synthetic-layout-only`; HQ layout and defense-number coverage remains via 3 local synthetic samples, but the report no longer claims any official HQ reference crop.
- Validation performed:
  - `py -3 -m py_compile tools\kards_private_calibration.py`: passed.
  - Stage 5 generation command: passed, 98/98 coverage.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage5-card-face-elements" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\stage5-card-face-elements" --port 5179`: passed, 37/37 elements.
  - Default Stage 3 generation without `--profile`: passed, 15 samples, 37/37 coverage, 37 manifest images.
  - Stage 3 default regression smoke on `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage3-default-regression-pack`: passed, 37/37 elements.
  - `npm test`: passed, 7 files and 38 tests.
  - `npm run build`: passed.
  - Ports 5179 and 5180 were confirmed clear after smoke.
- Setup note: the first Stage 5 smoke attempt failed because the new worktree lacked `node_modules` and `vite` was not found; `npm ci` passed with 0 vulnerabilities, then the smoke rerun passed.

## 2026-07-03 Stage 5 Integration Closeout

- Committed Stage 5 on branch `codex/kards-card-face-elements-stage5` as `4c90d36`.
- Fast-forward merged `codex/kards-card-face-elements-stage5` into `main`: `87c136d..4c90d36`.
- Merge-result validation on `main`:
  - `py -3 -m py_compile tools\kards_private_calibration.py`: passed.
  - Default Stage 3 generation without `--profile`: passed, 37/37 coverage and 37 manifest images.
  - Stage 5 generation: passed, 98/98 coverage, 37 manifest images, and 425 reference crops.
  - Stage 3 default regression visual smoke: passed, 37/37 elements.
  - Stage 5 visual smoke: passed, 37/37 elements.
  - `npm test`: passed, 7 files and 38 tests.
  - `npm run build`: passed.
  - Ports 5179 and 5180 were confirmed clear after smoke.
- Pushed `main` to `origin`: `87c136d..4c90d36`.
- Removed integrated worktree `C:\Users\raede\Documents\KARDS-card-face-elements-stage5`.
- Deleted merged local branch `codex/kards-card-face-elements-stage5`.
- Recovery pointer: `4c90d36`.

## 2026-07-03 Stage 6 Multi-Source Extraction Start

- Created isolated worktree `C:\Users\raede\Documents\KARDS-multisource-clean-extraction` on branch `codex/kards-multisource-clean-extraction` from `main` commit `36e3d4e`.
- Re-read `research-before-fix`, `ultrawork`, `lessons learned.md`, active replication docs, and the worktree registry.
- `omx state write` succeeded for the active `ultrawork` mode at `.omx/state/ultrawork-state.json`.
- Current first-principles boundary:
  - The user wants every useful card-face and inspect/view element extracted, checked, calibrated, and processed from multiple sources.
  - Official-derived assets are allowed for private local validation only and must remain under `.runtime`.
  - Clean renderer assets require a deterministic source path and a repeatable extraction/copy rule; otherwise the asset remains reference-only or indexed-only.
  - Stage 5 is the baseline: 37 renderer-ready icon slots, 425 reference crops, 539 local manifest candidates, and `view-glow`/`zoom-shadow` still indexed-only.
- Stage 6 acceptance targets:
  - Every source route has a recorded status and reason.
  - Every extracted asset has source, dimensions, category, output path, and renderer-readiness.
  - Font and view/inspect candidates are explicitly covered, even when they cannot yet be converted to renderer-ready files.
  - No official-derived PNG/font/pak-extracted file enters git, `src`, `public`, or default `dist`.

## 2026-07-03 Stage 6 Source Census

- Local KARDS install evidence:
  - `C:\Program Files (x86)\Steam\steamapps\common\KARDS\Manifest_UFSFiles_Win64.txt` exists and is about 3.5 MB.
  - `C:\Program Files (x86)\Steam\steamapps\common\KARDS\kards\Content\Paks\kards-Windows.pak` exists and is 7,113,393,294 bytes.
  - No `repak`, `UnrealPak`, `FModel`, `umodel`, or `UEViewer` command was available from PATH during this pass.
  - Pak extraction is therefore classified as `indexed-only-no-extractor`, not as a failed pixel extraction.
- Local reference repo evidence:
  - `KardsGen\Material` contains 137 PNG/SVG/JPG material candidates; `frame.png` is 500x702, `kredit-board(12,13).png` is 86x86, and `extra-border(0,402).png` is 500x64.
  - `KARDS-Assets` contains 620 files in the local clone; useful private references include 500x702 card backs and 500x701 HQ images.
  - `kards-image-tool` is useful mainly for data/Canvas workflow reference and carries `data.json`, nation SVGs, and small UI/background assets.
- Subagent/source review conclusions:
  - Current renderer smoke support remains narrow: only `nation-mark`, `type-icon`, `rarity-pip`, and `set-mark` can be automatically pixel-smoked today.
  - KARDS-Assets and KardsGen are useful for private validation but their material rights are not covered by the software MIT licenses.
  - The local pak path can provide manifest counts and target names, but not PNG/font outputs without a real Unreal pak + asset exporter toolchain.

## 2026-07-03 Stage 6 Output And Calibration

- Added `tools/kards_multisource_extraction.py` as a separate private-output tool instead of further expanding the Stage3/5 card-image cropper.
- Stage6 generation command used explicit source roots because the isolated worktree does not carry the main checkout's `.runtime` cache by default.
- Generated private output:
  - `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction`
  - marker: `.kards-stage6-multisource-output`
  - compatibility file for visual smoke: `calibration-report.json`
  - reports: `stage6-multisource-report.json`, `stage6-source-inventory.json`, `stage6-private-assets-manifest.json`, `stage6-multisource-summary.md`
- Output summary:
  - extracted/cataloged files: 283
  - current smoke-safe renderer manifest images: 37
  - renderer manifest slots: `nation-mark`, `type-icon`, `rarity-pip`, `set-mark`
  - Stage5 official crop clean slots copied: 37
  - KardsGen material candidates/references copied: 139
  - KARDS-Assets private references copied: 40 card backs and 46 HQ images
  - CraftSoul/kards-image-tool references copied: 21
  - Local KARDS pak indexed candidates: 26045
- KardsGen slot-size calibration:
  - exact current renderer slot size: `frame` 500x702, `cost-board` 86x86, `command-border` 500x64
  - needs calibration/scaling before renderer wiring: `attack-board` 83x89 versus 82x82, `defense-board` 83x89 versus 82x82, `special-attack-board` 94x94 versus 96x82, `hq-defense-board` 166x179 versus 168x112
  - these KardsGen candidates are recorded as `renderer-slot-candidate-unwired-needs-smoke`; they are not allowed into `kards-asset-pack.json` until slot-level visual smoke is implemented for those slots.
- Updated `tools/kards_browser_visual_smoke.mjs` to accept the Stage6 marker while still requiring `kards-asset-pack.json` and `calibration-report.json`.
- Stage6 visual smoke:
  - command used pack `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction`
  - output `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\stage6-multisource-clean-extraction`
  - result: 37/37 pass, 0 review, 0 fail
  - slot counts: 11 nation marks, 7 type icons, 4 rarity pips, 15 set marks
  - app smoke passed with canvas 500x702 and nonblank pixels
  - port 5181 was clear afterward
- Final validation after documentation updates:
  - `node --check tools\kards_browser_visual_smoke.mjs`: passed
  - `py -3 -m py_compile tools\kards_multisource_extraction.py`: passed
  - Stage6 visual smoke on port 5181: passed, 37/37 elements, report generated at `2026-07-03T21:04:32.476Z`
  - `npm test`: passed, 7 files and 38 tests
  - `npm run build`: passed
  - port 5181 was clear afterward
- Independent review and final safety fixes:
  - Code review requested changes because a nested `public\.runtime` or `dist\.runtime` path could still satisfy the old `.runtime` guard.
  - Fixed private-output guards so `public`, `dist`, and `src` are rejected even if `.runtime` appears later in the path.
  - Fixed manifest path handling so Stage5/Stage6 image entries must be relative paths that resolve inside the source pack.
  - Fixed output cleanup so symlinks/junctions are unlinked instead of recursively followed.
  - Renamed KardsGen readiness from a potentially misleading loadable wording to `renderer-slot-candidate-unwired-needs-smoke`.
  - Final safety checks passed: Python public-output guard, Python manifest containment, JS public-output guard, and JS manifest containment.
  - Final Stage6 generation passed after those fixes with 283 extracted/cataloged files, 37 manifest images, and 26045 local pak indexed candidates.
  - Final Stage6 visual smoke passed on port 5181: 37/37 elements, report generated at `2026-07-03T21:11:33.667Z`.
  - Final `npm test` passed, 7 files and 38 tests.
  - Final `npm run build` passed.
  - Temporary negative-check folders and `tools\__pycache__` were removed; ports 5181 and 5182 were clear.

## 2026-07-03 Stage 6 Integration Closeout

- Committed Stage 6 on branch `codex/kards-multisource-clean-extraction` as `5e48a54`.
- Main was clean and up to date with `origin/main` before integration.
- `git worktree list --porcelain` showed only main plus the Stage 6 worktree before merge; changed-file analysis found no competing ready worktree.
- Fast-forward merged `codex/kards-multisource-clean-extraction` into `main`: `36e3d4e..5e48a54`.
- Merge-result validation on `main`:
  - `node --check tools\kards_browser_visual_smoke.mjs`: passed.
  - `py -3 -m py_compile tools\kards_multisource_extraction.py`: passed.
  - Stage6 generation: passed, 283 extracted/cataloged files, 37 manifest images, and 26045 local pak indexed candidates.
  - Safety guard negative checks: Python public-output guard, Python manifest-containment guard, JS public-output guard, and JS manifest-containment guard passed.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\stage6-multisource-clean-extraction" --port 5181`: passed, 37/37 elements.
  - `npm test`: passed, 7 files and 38 tests.
  - `npm run build`: passed.
  - Temporary negative-check folders and `tools\__pycache__` were absent after cleanup; ports 5181 and 5182 were clear.
- Removed integrated worktree `C:\Users\raede\Documents\KARDS-multisource-clean-extraction`.
- Deleted merged local branch `codex/kards-multisource-clean-extraction`.
- Recovery pointer: `5e48a54`.
- Stage 6 stop condition:
  - Current renderer-safe manifest remains exactly the 37 proved icon/package/nation/type elements.
  - Pak/font/view/HQ/card-back/frame/board sources are now inventoried and copied or indexed where feasible, but remain private reference or unwired candidate material until a clean exporter or captured source plus slot-level visual smoke exists.

## 2026-07-03 Stage 7 Visible Preview Correction

- User review correctly found that the visible app still did not resemble an official KARDS full card closely enough.
- Root cause:
  - Stage 6 had only proved `nation-mark`, `type-icon`, `rarity-pip`, and `set-mark` slots.
  - The homepage still showed the user's saved/default draft unless the Stage 6 sample was manually loaded.
  - The renderer had not wired full-card frame/board candidates into a visible full-card comparison surface.
- Implemented correction on the main checkout from base `7ca3319`:
  - Added dev-server URL loading for private `.runtime` asset-pack manifests.
  - Added dev-only automatic loading of the Stage 6 private card-face preview pack plus `samples/t70.card.json`.
  - Added generated-vs-official side-by-side preview using the official T-70 full-card reference.
  - Fixed the dev StrictMode mounted-ref guard so successful async asset loads are not discarded.
  - Added KardsGen frame/cost/command/HQ candidates and private derived clean attack/defense board previews to `.runtime/kards-private-assets/stage6-cardface-preview/kards-asset-pack.json`.
  - Adjusted stat, cost, and keyword text sizing/placement for the visible T-70 comparison.
- Browser evidence:
  - Dev server: `http://127.0.0.1:5174/`.
  - Homepage smoke loaded T-70, generated canvas `500x702`, reference image `500x702`, 44 private preview images, no console errors, no failed requests.
  - Screenshot: `.runtime/qa/stage6-current-homepage-preview.png`.
  - Generated card: `.runtime/qa/stage6-current-generated.png`.
  - Reference card: `.runtime/qa/stage6-current-reference.png`.
- Pixel metrics:
  - Before derived board/text correction: full MAE `4.732`, stats MAE `12.604`, rulesText MAE `12.223`.
  - After correction: full MAE `4.006`, header MAE `10.175`, artwork MAE `0.637`, stats MAE `6.800`, rulesText MAE `10.154`, footer MAE `6.079`.
  - Interpretation: artwork alignment is good; remaining visible error is mainly header typography, rules text font, footer/print-wear lighting, and exact font/atlas extraction.
- Validation:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts`: passed, 18 tests.
  - `npm test`: passed, 7 files and 39 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
- Boundary:
  - `.runtime` private official-derived and derived-preview images remain gitignored.
  - Temporary Playwright/Pillow helper scripts were removed after use.
  - This stage creates an honest visible calibration surface; it is not a final pixel-perfect replica.

## 2026-07-03 Stage 8 Typography Research And Calibration

- Task grade: standard. The change touches the Canvas text renderer, asset-pack font roles, layout size constants, focused renderer tests, and active task docs.
- First-principles target:
  - The visible mismatch is not mainly card geometry now; it is that text fields behave like a generic UI font.
  - KARDS card text has at least three different typography jobs: narrow Latin labels/names, heavy compact numeric costs/stats, and readable localized body text.
  - Chinese users need a CJK font stack that reads naturally without forcing every Latin label into a wide CJK face.
- External evidence gathered:
  - Reddit `r/kards` font thread: community answer identifies Franklin Gothic Demi Condensed, with bold used for card names.
  - Biathlon Analytics custom-card template: lists ITC Franklin Gothic Demi Condensed for description/title text, Yantramanav Bold for attack/defense and deployment cost, and Franklin Gothic Condensed for cost letters and unit names.
  - KardsGen README: latest public release line is `1.6 Dec 1, 2025`; its Chinese notes say Source Han Sans is the most visually faithful, while the current bundled/default generator uses Microsoft YaHei UI.
  - Noto and Source Han Sans references confirm open CJK font families suitable for product use or user-provided local packs.
- Local font inventory:
  - Windows has Arial Narrow and Microsoft YaHei UI available.
  - Local Noto Sans CJK variable fonts are present under `C:\Windows\Fonts`.
  - Franklin Gothic was not found locally, so the renderer must use font-stack names and allow a future private font pack to supply exact faces.
- Implementation:
  - Added role-specific render font slots: `keyword`, `cost`, and `stat`, alongside existing `title`, `body`, and `utility`.
  - Changed default text stacks to prefer Franklin/Arial Narrow style for Latin utility text and Source Han/Noto/YaHei style for Chinese body text.
  - Added horizontal text scaling so Latin labels can look narrower while CJK text keeps readable proportions.
  - Darkened keyword labels to card-text color instead of nation accent color, matching the official reference more closely.
  - Raised the unit title size from `39` to `44` and recalibrated cost/stat/keyword sizes around the T-70 comparison.
- Validation:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/assetPack.test.ts`: passed, 18 tests.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 40 tests.
  - `npm run build`: passed, including typecheck and Vite build.
  - Browser reload at `http://127.0.0.1:5174/`: passed; generated and reference canvases/images remained `500x702`.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\font-pass" --port 5183`: passed, 37/37 slots, 0 review, 0 fail.
- Boundary:
  - No official font files, official assets, or commercial fonts were committed or bundled.
  - This pass improves the default approximation and creates font-role override points. Exact official typography remains blocked on a legally usable exact font source and broader sample calibration.

## 2026-07-03 Stage 8 Follow-Up Visual Corrections

- User review found the first Stage 8 font pass still looked too unchanged in the browser and identified precise visible issues:
  - deployment cost was too narrow/centered with too much empty space;
  - `K` and operation cost should read as a tighter right-side group;
  - attack/defense numerals were slightly too high;
  - tank type icon needed a rounded lower silhouette instead of a pointed bottom;
  - `Guard` was too large;
  - rarity pips needed a slight perspective/fan effect.
- Implemented corrections:
  - Added `@fontsource/libre-franklin` and `@fontsource/yantramanav`; imported the needed Latin weights in `src/main.tsx`.
  - Changed numeric rendering to use Yantramanav and horizontal stretch rather than narrowing.
  - Moved attack/defense numerals down by 6 px.
  - Reduced `Guard` from `30px/900` to `27px/800`.
  - Changed unit type icon layout to `x=208,y=468,w=84,h=78` and clipped type-icon assets to a rounded rectangle.
  - Changed rarity pip fallback/asset presentation to a slight fan rotation with a raised center.
  - Adjusted cost board centers: deployment center `rect.x + 33`; `K` and operation center both `rect.x + 67`; vertical gap reduced to 27 px.
- Browser/runtime evidence:
  - Restarted the `5174` Vite dev server after installing font packages, because the old server was running before the new packages existed.
  - In-app browser `http://127.0.0.1:5174/` was reloaded; `document.fonts.check` confirmed `Yantramanav 900` and `Libre Franklin 800` available.
  - Screenshot saved to `.runtime/qa/stage8-cost-group-adjusted.png`.
- Validation:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts src/assetPack.test.ts`: passed, 25 tests.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 42 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
  - `npm run smoke:visual:kards -- --pack "C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction" --output "C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\font-pass" --port 5184`: failed as an old element-slot identity gate, with 24 pass / 8 review / 5 fail. Failures are concentrated in type-icon and rarity-pip transformations that Stage 8 intentionally changed.
- Boundary:
  - Do not call the Stage 6 element-slot smoke green after these presentation-layer changes.
  - Next calibration should either rebaseline type-icon/rarity transformed presentation or split the smoke into raw slot identity versus final card-face presentation.

## 2026-07-03 Stage 8 Follow-Up Micro-Alignment

- User review found the second Stage 8 pass still had visible issues:
  - attack numeral needed to move down so `3` and `2` share a visual bottom baseline;
  - stat numerals needed slightly more horizontal weight while the title `T-70` was over-stretched;
  - unit type icons for fighter/bomber/tank still carried asset-background artifacts, extra border/gradient, and a slightly wrong vertical placement;
  - set switching needed verification because the visible lower-right mark is tiny.
- Implemented corrections:
  - Lowered attack/special-attack text by passing a per-board stat baseline offset while leaving defense at the existing baseline.
  - Increased stat numeral horizontal scale to `1.18` and reduced unit title scale from `1.20` to `1.12`.
  - Moved unit type icon geometry to `x=208,y=473,w=84,h=82`, aligning its bottom with the defense-board bottom.
  - Replaced type-icon asset drawing with a paper-colored rounded border, dark inner board, and bright-pixel glyph mask, so the resource's own dark gradient/background is not painted into the final card.
  - Verified browser controls: `card-kind` switched to `fighter`, `card-set` switched to `blood-and-iron`, then both were restored to `tank/base`.
  - Confirmed the private Stage 6 preview manifest contains `fighter`, `bomber`, and `blood-and-iron` slot entries.
- Browser/runtime evidence:
  - In-app browser `http://127.0.0.1:5174/` was reloaded after the renderer changes.
  - Screenshot saved to `.runtime/qa/stage8-type-icon-mask-full.png`.
  - An attempted canvas crop screenshot missed the card and captured background only; it is not used as visual evidence.
- Validation:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts src/assetPack.test.ts`: passed, 25 tests.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 42 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
  - `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- Boundary:
  - The set control path is working; the remaining concern is visual legibility of a very small set mark at normal zoom, not a failed state update.
  - Type-icon rendering now intentionally masks asset pixels; the old raw slot-identity smoke still needs a presentation-aware replacement before it can be used as a green gate again.

## 2026-07-03 Stage 8 Type-Icon Border Color Fix

- User review clarified that the unit type icon should keep the light outline, but the outline must be the paper/card-bottom color rather than a dark or separate-looking border.
- Implemented correction:
  - `drawTypeIconBoard` now paints a paper-colored outer rounded shape and a dark inner rounded board.
  - Fallback type glyphs and masked type-icon glyph pixels now use the same paper-color family instead of the previous grey-green `LIGHT`.
  - Kept the current type-icon position and bottom alignment; this pass changes color/border treatment only.
- Browser/runtime evidence:
  - Reloaded in-app browser `http://127.0.0.1:5174/`.
  - Screenshot saved to `.runtime/qa/stage8-type-icon-paper-border-full.png`.
- Validation:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts`: passed, 21 tests.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 42 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
  - `git diff --check`: passed with Windows LF-to-CRLF warnings only.

## 2026-07-03 Stage 8 Type-Icon Paper Tone Tuning

- User review clarified that the type-icon outer border and inner glyph should both read as exposed paper/base-layer color; the prior glyph still looked too grey because its alpha was too low over the dark inner board.
- Implemented correction:
  - Added a dedicated `TYPE_ICON_PAPER` color so type-icon paper tone can be tuned without changing the whole card's paper fill.
  - Used the same paper-tone RGB for the masked glyph and increased glyph alpha from the source luma, avoiding the translucent grey result.
  - Kept the type-icon position, border structure, and dark inner board unchanged.
- Browser/runtime evidence:
  - Reloaded in-app browser `http://127.0.0.1:5174/`.
  - Screenshot saved to `.runtime/qa/stage8-type-icon-paper-glyph-full.png`.
- Validation:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts`: passed, 21 tests.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 7 files and 42 tests.
  - `npm run build`: passed, including typecheck and Vite production build.

## 2026-07-03 Stage 8 Set And HQ Reference Fix

- User review found that changing the Set control from Base to sets such as Allegiance or Blood and Iron appeared to do nothing, and the right-side Official reference stayed on T-70.
- Root cause:
  - `card.set` did update, but the dev preview reference URL was hard-coded to the T-70 reference image.
  - The local private sample data already had representative cards for all 15 implemented official set ids, but the app had no catalog connecting the Set control to those samples.
  - HQ renderer/layout support existed, and Stage 6 had private KARDS-Assets HQ references, but the dev preview did not expose a real HQ reference sample.
- Implemented correction:
  - Added `src/devPreviewCatalog.ts` as the dev-only mapping from set id to representative sample JSON and official reference PNG.
  - Kept the Field panel Set and Type selectors as normal field edits, so changing them does not overwrite the current draft card.
  - Added App-level dev reference resolution from the current `card.kind` and `card.set`, so only the right-side Official reference follows the selection.
  - Aligned dev sample labels with the actual card-face titles, surfaced those labels in the Set dropdown, and surfaced the selected reference title in the Official reference caption.
  - Wired Type = HQ to the private Stage 6 `references/kards-assets/hq2/Washington.png` reference.
  - Kept explicit full-sample loading on Project panel buttons: `Load T-70 Sample` and `Load HQ Sample`.
  - Added `src/devPreviewCatalog.test.ts` to ensure all non-custom set presets have sample coverage, reference resolution follows set/kind, and the HQ sample points to Washington.
- Browser/runtime evidence:
  - In-app Browser control repeatedly timed out during reload after the code change, so rendered validation used a local Playwright fallback against the same `http://127.0.0.1:5174/` server.
  - Playwright fallback confirmed initial `base/tank/T-70` reference, then Set = `blood-and-iron` preserved the current `T-70` draft while changing the reference to `macchi_c_200.png`.
  - Reviewer fix: switching Set to `custom` clears the prior reference instead of leaving a stale set image visible.
  - The same fallback confirmed Type = `hq` preserved the current draft, showed the HQ defense field, and changed the reference to `Washington.png`.
  - The fallback confirmed `Load HQ Sample` loads the Washington HQ draft with `hqDefense=20` and the Washington reference.
  - The fallback also confirmed `?privatePack=off` shows no private reference image and no private sample buttons.
  - In-app Browser verification confirmed Set = `blood-and-iron` shows caption `Official reference: MACCHI C.200`, loads `macchi_c_200.png`, and reports no console warn/error.
  - Follow-up in-app Browser verification confirmed the Set dropdown itself shows `MACCHI C.200 (Blood and Iron)`, matching the caption and reference image.
  - Screenshot saved to `.runtime/qa/set-reference-follow-fix.png`.
- Validation:
  - `npx vitest run src/devPreviewCatalog.test.ts`: passed, 4 tests.
  - `npx vitest run src/devPreviewCatalog.test.ts src/cardModel.test.ts`: passed, 8 tests before the label-alignment test was added.
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 8 files and 46 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
- Boundary:
  - Official-derived card/reference pixels remain under `.runtime` and are not committed or bundled as source assets.
  - The new catalog is a dev reference resolver plus explicit sample loader, not a production card database.

## 2026-07-04 Stage 8 DINGO Set-Sample Load Fix

- User review reported that DINGO seemed to be missing its original artwork.
- Finding:
  - The private runtime sample `.runtime/kards-private-assets/stage6-multisource-clean-extraction/samples/dingo.card.json` already includes DINGO title/body/stats and embedded artwork data.
  - The private reference images also exist at `references/cards/dingo.png` and `references/artwork/dingo.png`.
  - The confusing UI behavior was that changing Set only moved the right-side Official reference; the Project panel still only exposed a fixed `Load T-70 Sample` button, so there was no obvious way to load the currently selected set's full DINGO sample into the generated card.
- Implemented correction:
  - `App.tsx` now resolves the current selected Set sample separately from the reference sample.
  - `ProjectPanel.tsx` now shows a dynamic `Load {sample label} Sample` button, so Set = `DINGO (Oceania Storm)` exposes `Load DINGO Sample`.
  - `devPreviewState.ts` extracts the card-update and stale-request guard logic so it can be covered without a heavy React test harness.
  - `devPreviewCatalog.test.ts` now asserts `oceania-storm` resolves to `dingo`, its reference resolves to `dingo.png`, Set-only edits preserve the current draft content, and stale sample loads are rejected after newer requests or user edits.
  - Review follow-up removed the static `devPreviewCatalog` import from `App.tsx`; the private catalog is now dynamically imported only when the dev private preview is enabled, so production `dist` no longer contains private `.runtime/kards-private-assets` path strings.
- Browser/runtime evidence:
  - Chrome DevTools validation on `http://127.0.0.1:5174/` selected `DINGO (Oceania Storm)`, clicked `Load DINGO Sample`, and confirmed title `DINGO`, caption `Official reference: DINGO`, reference image `dingo.png`, and summary `Artwork embedded in JSON`.
  - Canvas pixel evidence confirmed the rendered card's center artwork pixel matched the DINGO sample artwork center pixel exactly: `pixelDelta=0`.
  - Follow-up Chrome DevTools validation after the dynamic import change confirmed Set-only change left the title as `T-70`, then `Load DINGO Sample` changed the title to `DINGO` with `pixelDelta=0`.
- Validation:
  - `npm run typecheck`: passed.
  - `npm run test`: passed, 8 files and 48 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
  - `rg` over `dist` for `.runtime/kards-private-assets`, `stage6-cardface-preview`, `stage6-multisource-clean-extraction`, `stage5-card-face-elements`, `Washington.png`, `dingo.card`, and `t70.card`: no matches.
- Boundary:
  - DINGO artwork remains private runtime data under `.runtime`; it was not copied into `src`, `public`, or the default production bundle.

## 2026-07-04 Stage 8 Type Icon Layer Split

- User review found the remaining type icon color problem was structural, not just a palette mismatch:
  - the dark rounded lower board and the paper-colored unit glyph were still treated as one source element in the renderer contract;
  - adjusting opacity, alpha, or the legacy `type-icon` image could make either the board or glyph closer, but not both at the same time;
  - HQ needed the same layered treatment: board art stays below while generated values/text stay above.
- Implemented correction:
  - Added renderer asset slots `type-icon-board` and `type-icon-glyph`.
  - Changed type icon rendering to always draw the bottom board first, then draw a resolved glyph layer above it.
  - Kept legacy `type-icon` support as a compatibility input; when only the old combined crop exists, the renderer derives a paper-colored glyph mask from it, and falls back to generated text instead of drawing the combined crop if the mask cannot be produced.
  - Matched type icon paper tone to the card base `PAPER` color so the border and glyph no longer use the older grey-tinted paper value.
  - Kept HQ defense board as a bottom asset layer while numeric value and `HQ` label remain generated text above it.
  - Updated the private asset-pack manifest example to show split `type-icon-board` and `type-icon-glyph` inputs without mixing them with the legacy combined slot.
- Validation:
  - Independent code-review subagent initially requested changes for a legacy combined-crop fallback, overlapping smoke-slot support, and a weak HQ order assertion; all three were accepted and fixed before final validation.
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/renderAssets.test.ts`: passed, 2 files and 21 tests.
  - `npm run typecheck`: passed.
  - `npm test`: passed, 8 files and 50 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
  - HTTP check on existing dev server `http://127.0.0.1:5173/`: passed with `200`.
  - `rg` over `dist` for private `.runtime`/sample/reference path strings: no matches.
  - `git diff --check`: passed with Windows LF-to-CRLF warnings only.
- Boundary:
  - No official-derived image/font assets were copied into `src`, `public`, or `dist`.
  - This pass fixes layer semantics and local color treatment; it does not perform a new transformed-presentation visual-smoke rebaseline, and the old raw slot-identity smoke should not be used to validate overlapping board/glyph split slots.

## 2026-07-04 Stage 8 Type Icon Placement Tuning

- User review found the split layers were correct, but the visible board/glyph calibration still needed per-unit alignment:
  - the bottom board needed to read slightly darker against the official reference;
  - tank and bomber glyphs needed their visual centers aligned with the unchanged board;
  - fighter needed a small upward move;
  - artillery needed an upward move plus a slight size increase.
- Local measurement:
  - Measured the private Stage 6 official-derived type icon crops under `.runtime/kards-private-assets/stage6-multisource-clean-extraction/images/stage5-clean/type-icon`.
  - Dark board pixels averaged around `#3f403a`, so the renderer now uses a darker dedicated type-icon board color instead of the general text `DARK`.
  - Bright glyph centers in the cropped source showed tank/bomber/artillery were visually low inside the slot, matching the user review.
- Implemented correction:
  - Added `TYPE_ICON_BOARD_DARK` for the inner type-icon board.
  - Added per-kind glyph placement for `tank`, `fighter`, `bomber`, and `artillery`.
  - Kept the board rect fixed while shifting/scaling only the glyph draw layer.
  - Artillery now gets a modest scale increase and upward adjustment; bomber gets a tiny right correction plus upward adjustment.
- Runtime evidence:
  - Playwright smoke on `http://127.0.0.1:5173/` switched through `tank`, `fighter`, `bomber`, and `artillery`.
  - Screenshots saved under `.runtime/qa/type-icon-placement/`.
  - Each generated canvas remained `500x702` and nonblank.
- Validation:
  - Independent code-review subagent found no blocking issues after the placement/color tune.
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/renderAssets.test.ts`: passed, 2 files and 22 tests.
  - `npm test`: passed, 8 files and 51 tests.
  - `npm run build`: passed, including typecheck and Vite production build.
- Boundary:
  - This pass is a presentation tune of the split renderer; no official-derived files were copied into source or public assets.
