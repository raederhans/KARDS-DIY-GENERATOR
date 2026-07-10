# KARDS Style Replication Task Notes

## Stage 8 Typography Calibration

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: research and calibrate KARDS card text fonts for Latin utility text, numeric fields, and Chinese-localized text
- Base branch/base commit: `main`, `74daf26`
- Current branch/HEAD: `main`, Stage 8 integrated in committed history; final closeout keeps `main` aligned with `origin/main`
- Task goal: make title, cost, `K`, attack/defense, keyword labels, and rules text look closer to the current KARDS card style while keeping Chinese readability and private/official font boundaries clear
- Status: integrated-on-main after closeout; no separate worktree merge or cleanup was required
- Shared hotspot files touched:
  - `package.json`
  - `package-lock.json`
  - `src/main.tsx`
  - `src/canvas/cardRenderer.ts`
  - `src/canvas/layout.ts`
  - `src/canvas/layout.test.ts`
  - `src/canvas/renderAssets.ts`
  - `src/assetPack.ts`
  - `src/canvas/cardRenderer.test.ts`
  - active replication docs
- Tests run:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/assetPack.test.ts`: passed, 19 tests
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts src/assetPack.test.ts`: passed, 25 tests
  - Latest `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts src/assetPack.test.ts`: passed, 25 tests after type-icon mask and stat-baseline alignment
  - `npm run typecheck`: passed
  - Latest `npm run typecheck`: passed after type-icon mask and stat-baseline alignment
  - `npm run test`: passed, 7 files and 42 tests
  - `npm run build`: passed, including typecheck and Vite production build
  - Latest `npm run test`: passed, 7 files and 42 tests
  - Latest `npm run build`: passed, including typecheck and Vite production build
  - Browser reload against `http://127.0.0.1:5174/`: passed, generated canvas and official reference image stayed `500x702`
  - Browser font checks after restarting Vite 5174: `Yantramanav 900` and `Libre Franklin 800` loaded
  - Browser screenshot: `.runtime/qa/stage8-cost-group-adjusted.png`
  - Browser select verification: `card-kind=fighter` and `card-set=blood-and-iron` both applied through real select controls, then restored to `tank/base`
  - Browser screenshot after type-icon masking: `.runtime/qa/stage8-type-icon-mask-full.png`
  - Browser screenshot after paper-colored type-icon border correction: `.runtime/qa/stage8-type-icon-paper-border-full.png`
  - Browser screenshot after paper-tone glyph correction: `.runtime/qa/stage8-type-icon-paper-glyph-full.png`
  - `git diff --check`: passed with LF-to-CRLF warnings only
  - Stage 6 visual smoke on port 5183 with output `.runtime/kards-visual-smoke-calibration/font-pass`: initially passed, 37/37 slots, 0 review, 0 fail before type-icon/rarity presentation changes
  - Stage 6 visual smoke on port 5184 after type-icon/rarity presentation changes: failed as an outdated element-slot identity gate, 24 pass / 8 review / 5 fail
- Tests not run:
  - No exact official font extraction, because no legally usable Franklin Gothic or KARDS font file was available in the repo.
  - No broad visual-perceptual font metric yet; this pass is a targeted approximation and regression guard.
  - No updated slot-smoke baseline for transformed type-icon and rarity-pip presentation yet.
- Potential overlap with other worktrees:
  - `git worktree list` showed only the main checkout.
  - Future direct overlap with renderer/layout/font-pack branches touching the same Canvas text paths.
- Recommended integration order:
  - Commit this typography pass before any exact font extraction or atlas pass so later work can use the new per-role font override slots.

## Stage 8 Delivery Package Draft

1. Changed this phase:
   - Researched current public/community KARDS font evidence beyond GitHub.
   - Split renderer font handling into title/body/keyword/cost/stat/utility roles.
   - Added bundled Libre Franklin and Yantramanav font packages for the default browser path.
   - Added horizontal text scaling and size/placement tweaks for title, costs, keyword, body, and stats.
   - Rounded/masked type-icon presentation, removed the resource background gradient from unit type icons, and added a slight rarity-pip fan effect.
   - Restored the type-icon paper-colored outer border while keeping the dark inner board and masked glyph.
   - Tuned type-icon border/glyph color through a dedicated paper-tone constant and increased glyph opacity so the icon no longer reads as grey.
   - Bottom-aligned attack and defense numerals and reduced the over-stretched unit title scale.
   - Replaced the hard-coded T-70 dev reference with a set-to-sample catalog covering all implemented official set ids.
   - Added a Washington HQ dev reference sample from the private Stage 6 HQ reference data.
   - Kept Set and Type edits from replacing the current draft; those controls now only move the right-side dev reference.
   - Aligned visible dev sample labels with the actual card-face titles, showed those labels in the Set dropdown, and showed the active reference title in the Official reference caption.
   - Added focused keyword, cost-group, stat-position, type-icon clipping, and rarity-perspective regression coverage.
   - Added focused dev preview catalog coverage so set/reference wiring cannot silently collapse back to Base-only behavior.
2. Files touched:
   - Core files: `package.json`, `package-lock.json`, `src/main.tsx`, `src/App.tsx`, `src/components/CardCanvas.tsx`, `src/components/ProjectPanel.tsx`, `src/devPreviewCatalog.ts`, `src/canvas/cardRenderer.ts`, `src/canvas/layout.ts`, `src/canvas/renderAssets.ts`, `src/assetPack.ts`, `src/styles.css`.
   - Test files: `src/canvas/cardRenderer.test.ts`, `src/canvas/layout.test.ts`, `src/devPreviewCatalog.test.ts`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Lessons: `lessons learned.md`.
   - Temporary/private files: `.runtime/kards-visual-smoke-calibration/font-pass/**`, `.runtime/qa/stage8-cost-group-adjusted.png`, `.runtime/qa/set-reference-follow-fix.png`; gitignored.
3. Diff summary:
   - Production behavior remains Canvas-only and ships no official or commercial font files.
   - Asset packs can now override `keyword`, `cost`, and `stat` fonts independently.
   - Default browser rendering uses open bundled fonts for the first time instead of depending only on locally installed system fonts.
   - Cost-board grouping, stat baseline, type-icon silhouette/paper-border masking, and rarity pip perspective now follow the visible reference more closely.
   - Dev preview Set and Type changes now preserve the current draft card while moving the right-side Official reference to the matching set/type reference.
   - The Set dropdown now shows sample-first labels such as `MACCHI C.200 (Blood and Iron)`, and the right-side reference caption includes the exact sample title.
   - Type = HQ now points the dev reference panel at a Washington HQ image from the existing private data set.
   - Explicit full-sample loading remains available through Project panel `Load T-70 Sample` and `Load HQ Sample` buttons.
4. Commit status:
   - Committed as part of the Stage 8 closeout bundle, then followed by a docs-only registry sync.
5. Base divergence:
   - Work started from `main` commit `74daf26`; no other active KARDS worktree was found.
6. Potential conflicts:
   - Moderate conflict risk with any future branch editing `src/canvas/cardRenderer.ts`, `src/canvas/layout.ts`, or asset-pack font typing.
7. Validation:
   - Targeted tests, typecheck, full unit tests, production build, browser reload, and browser font checks passed.
   - Real browser select controls were checked for `fighter` and `blood-and-iron`; the state path works, while the set mark remains visually tiny at normal zoom.
   - Set/reference fix targeted tests passed: `npx vitest run src/devPreviewCatalog.test.ts src/cardModel.test.ts`, 8 tests.
   - Local Playwright fallback on `http://127.0.0.1:5174/` passed for initial T-70 / `t70.png`, Set `blood-and-iron` preserving T-70 while moving the reference to `macchi_c_200.png`, Set `custom` clearing the reference, Type `hq` showing the HQ field with `Washington.png`, `Load HQ Sample` loading Washington with `hqDefense=20`, and `?privatePack=off` hiding private preview UI.
   - In-app Browser verification passed for Set `blood-and-iron`: caption `Official reference: MACCHI C.200`, reference image `macchi_c_200.png`, no console warn/error.
   - Latest in-app Browser verification passed for Set dropdown option `MACCHI C.200 (Blood and Iron)`, matching caption `Official reference: MACCHI C.200` and reference image `macchi_c_200.png`.
   - Latest `npm run test` passed, 8 files and 46 tests.
   - Latest `npm run build` passed, including typecheck and Vite production build.
   - Closeout independent `code-reviewer` review found no blocking issues.
   - Closeout independent `architect` review returned `CLEAR`.
   - Closeout `npm run typecheck`: passed.
   - Closeout `npm run test`: passed, 8 files and 48 tests.
   - Closeout `npm run build`: passed, including typecheck and Vite production build.
   - Closeout `rg` over fresh `dist` for private `.runtime` and sample/reference path strings: no matches.
   - Stage 6 visual smoke is no longer a valid green gate for type-icon/rarity after intentional transformed-presentation changes; latest run is 24 pass / 8 review / 5 fail.
8. Unverified risks:
   - Exact KARDS typography is still not guaranteed without a confirmed usable Franklin Gothic / official font source.
   - Type-icon and rarity-pip slot smoke need a new presentation-aware baseline.
   - In-app Browser control timed out twice during reload after the set/HQ fix; the same localhost flow was verified with local Playwright instead.
9. Recommended next step:
   - Future work should add a presentation-aware visual-smoke rebaseline for transformed type-icon and rarity-pip output.
10. Integration recommendation:
   - Completed as a direct `main` integration. No rebase, cherry-pick, or worktree cleanup was required.

## Stage 7 Visible Preview Calibration Hotfix

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: make the visible dev homepage show an honest official T-70 full-card comparison instead of the old/default draft
- Base branch/base commit: `main`, `7ca3319`
- Current branch/HEAD: `main`, validated on main; closeout commit is recorded in git history
- Task goal: correct the Stage 6 scope mismatch by wiring a full-card preview pack, official sample card, side-by-side reference display, and region-level browser smoke evidence
- Status: integrated-on-main after closeout
- Shared hotspot files touched:
  - `src/App.tsx`
  - `src/assetPack.ts`
  - `src/components/CardCanvas.tsx`
  - `src/components/ProjectPanel.tsx`
  - `src/canvas/layout.ts`
  - `src/canvas/cardRenderer.ts`
  - `src/styles.css`
  - active replication docs
- Tests run:
  - `npx vitest run src/canvas/cardRenderer.test.ts src/canvas/layout.test.ts`: passed, 18 tests
  - `npm test`: passed, 7 files and 39 tests
  - `npm run build`: passed, including typecheck and Vite production build
  - Browser full-card smoke against `http://127.0.0.1:5174/`: passed, no console errors, no failed requests, T-70 loaded, 44 private preview images loaded
- Pixel evidence:
  - Before this correction, full-card smoke with the first preview wiring produced full MAE `4.732`, stats MAE `12.604`, rulesText MAE `12.223`.
  - After derived board/text correction, full MAE is `4.006`, stats MAE `6.800`, rulesText MAE `10.154`.
  - Latest screenshot evidence: `.runtime/qa/stage6-current-homepage-preview.png`.
- Tests not run:
  - No official font extraction or pak atlas extraction, because no local exporter is installed.
  - No broad Playwright suite beyond the focused full-card smoke.
- Potential overlap with other worktrees:
  - No other active KARDS worktree was detected in this pass.
  - Direct future overlap with renderer/layout/font work touching the same Canvas files.
- Recommended integration order:
  - Integrate this visible preview hotfix before any further font/pak extraction, because it makes the homepage expose the true full-card gap.

## Stage 7 Delivery Package Draft

1. Changed this phase:
   - Dev homepage now auto-loads the Stage 6 private card-face preview pack and T-70 sample.
   - Generated and official T-70 cards render side by side.
   - Dev-server asset-pack loading supports `.runtime` manifest URLs.
   - React dev StrictMode no longer drops successful async private pack loads.
   - Private derived clean attack/defense board previews are used for the visible T-70 comparison.
2. Files touched:
   - Core files: `src/App.tsx`, `src/assetPack.ts`, `src/canvas/layout.ts`, `src/canvas/cardRenderer.ts`, `src/components/CardCanvas.tsx`, `src/components/ProjectPanel.tsx`, `src/styles.css`.
   - Test files: `src/assetPack.test.ts`, `src/canvas/cardRenderer.test.ts`.
   - Docs: `docs/active/kards-style-replication/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Lessons: `lessons learned.md`.
   - Temporary/private files: `.runtime/kards-private-assets/stage6-cardface-preview/**`, `.runtime/qa/stage6-current-*.png`; gitignored.
3. Diff summary:
   - Production build still ships no official assets.
   - Dev mode can load a private local preview pack by URL and display an official reference image from `.runtime`.
   - Unit card stat/keyword text placement is calibrated closer to the T-70 reference.
4. Commit status:
   - Committed on `main` as part of the closeout that includes this note.
5. Base divergence:
   - Work started from `main` commit `7ca3319`; no parallel worktree overlap was found.
6. Potential conflicts:
   - Moderate conflict risk with any future renderer/layout branch.
   - Low distribution risk because official-derived files remain under `.runtime` and are ignored.
7. Validation:
   - Targeted renderer tests, full unit tests, production build, and focused browser full-card smoke passed.
8. Unverified risks:
   - Header/title/cost typography is still not exact without official font extraction.
   - Footer/print-wear lighting and paper texture remain imperfect.
   - Derived attack/defense board previews are suitable for private calibration only, not redistribution.
9. Recommended next step:
   - Continue with official font/pak atlas extraction or multi-sample clean-template derivation, using this side-by-side homepage as the acceptance surface.
10. Integration recommendation:
   - Merge/commit directly on `main`; no cherry-pick is needed because this pass used the main checkout.

## Stage 6 Integrated Worktree

- Worktree name/path: multi-source clean extraction, `C:\Users\raede\Documents\KARDS-multisource-clean-extraction` (removed after integration)
- Thread/task: KARDS multi-source element, font, and view-effect extraction/calibration
- Base branch/base commit: `main`, `36e3d4e`
- Current branch/HEAD: merged into `main` at `5e48a54`; local branch deleted after merge
- Task goal: extract, classify, and calibrate all feasible card-face and inspect/view elements from local KARDS files, prior private packs, and external reference repositories while keeping official-derived artifacts private under `.runtime`
- Status: integrated
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
  - Fast-forward merge into `main`: passed, `36e3d4e..5e48a54`
  - Merge-result `node --check tools\kards_browser_visual_smoke.mjs`: passed
  - Merge-result `py -3 -m py_compile tools\kards_multisource_extraction.py`: passed
  - Merge-result Stage6 generation: passed, extracted/cataloged 283 files and indexed 26045 local pak candidates
  - Merge-result safety guards: Python public-output guard, Python manifest-containment guard, JS public-output guard, and JS manifest-containment guard passed
  - Merge-result Stage6 visual smoke on port 5181: passed, 37/37 elements
  - Merge-result `npm test`: passed, 7 files and 38 tests
  - Merge-result `npm run build`: passed
  - Merge-result cleanup checks: `tools\__pycache__`, `.runtime\tmp-malicious-smoke`, `.runtime\tmp-malicious-smoke-output`, and `public\.runtime` absent
  - Merge-result port 5181 and 5182 checks: clear
  - `git worktree remove C:\Users\raede\Documents\KARDS-multisource-clean-extraction`: passed
  - `git branch -d codex/kards-multisource-clean-extraction`: passed
- Tests not run yet:
  - none for Stage 6 closeout before push
- Potential overlap with other worktrees:
  - No other active KARDS worktree remains after cleanup.
  - Direct overlap risk with future private calibration branches touching `tools/kards_private_calibration.py` or active replication docs.
- Recommended integration order:
  - Integrated after Stage 5 and before renderer-level full-card typography/view polish.

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
   - Feature committed as `5e48a54`, fast-forward merged into `main`, and local worktree/branch cleaned up.
5. Base divergence:
   - Branch was created from `main` at `36e3d4e`; integration remained fast-forward with no conflicting remote drift before merge.
6. Potential conflicts:
   - Low direct product-code conflict risk because renderer/schema files did not change.
   - Moderate docs/tooling conflict risk with future branches touching `tools/kards_browser_visual_smoke.mjs` or active replication docs.
7. Validation:
   - Python compile, Node syntax check, Stage6 generation, artifact presence check, safety guard negative checks, Stage6 visual smoke, full unit tests, and production build passed before and after merge.
8. Unverified risks:
   - Pak extraction remains indexed-only because no local Unreal pak/asset exporter command is available in this session.
   - KardsGen frame/board candidates are `renderer-slot-candidate-unwired-needs-smoke`; attack/defense/special/HQ board candidates also do not exactly match current renderer slot sizes and need calibration or scaling before wiring.
   - KARDS-Assets card backs/HQ images and KardsGen material assets remain private validation references; they are not public distributable assets.
   - Full-card typography, print wear, and complete visual equivalence are still outside the Stage6 smoke scope.
9. Recommended next step:
   - Do not wire font, board, HQ, card-back, or inspect/view candidates into the renderer until a clean exporter or captured source plus slot-level visual smoke exists.
10. Integration recommendation:
   - Integrated by normal fast-forward merge into `main`; no cherry-pick was needed.

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

## 2026-07-04 Follow-Up Delivery: DINGO Set Sample Loader

1. Changed this follow-up:
   - Replaced the fixed Project-panel `Load T-70 Sample` action with a dynamic `Load {selected set sample} Sample` action.
   - Kept Set changes as safe field edits that do not overwrite the current draft card until the user clicks the load button.
   - Confirmed DINGO's private sample JSON already includes embedded artwork and that the UI can now load it.
   - Moved the private preview catalog behind a dev-only dynamic import so production `dist` no longer contains private runtime path strings.
   - Added pure state regression coverage for Set-only edits and stale private sample requests.
2. Files touched:
   - Core files: `src/App.tsx`, `src/components/ProjectPanel.tsx`, `src/devPreviewCatalog.ts`, `src/devPreviewState.ts`.
   - Test files: `src/devPreviewCatalog.test.ts`.
   - Docs: `docs/active/_worktree_registry.md`, `docs/active/kards-style-replication/context.md`, `docs/active/kards-style-replication/task.md`.
   - Private runtime evidence: `.runtime/kards-private-assets/**` read only.
3. Diff summary:
   - Dev-preview sample loading now follows the selected Set sample label, so `DINGO (Oceania Storm)` exposes `Load DINGO Sample`.
4. Commit status:
   - Committed with the Stage 8 integration bundle.
5. Base divergence:
   - Follow-up landed with the same Stage 8 integration on `main`.
6. Potential conflicts:
   - Direct overlap with any future branch touching `src/App.tsx`, `src/components/ProjectPanel.tsx`, or dev-preview sample catalog behavior.
7. Validation:
   - `npm run typecheck`: passed.
   - `npm run test`: passed, 8 files and 48 tests.
   - `npm run build`: passed.
   - `rg` over `dist` for private `.runtime/kards-private-assets` and sample/reference path strings: no matches.
   - Browser DevTools smoke confirmed Set-only change leaves title as `T-70`, `Load DINGO Sample` changes title to `DINGO`, `Official reference: DINGO` appears, artwork is embedded, and `pixelDelta=0` between rendered canvas artwork and the DINGO sample artwork.
8. Unverified risks:
   - No broad transformed-presentation visual-smoke rebaseline was run in this follow-up.
9. Recommended next step:
   - Future work should rebaseline transformed-presentation visual smoke; no DINGO-specific follow-up is pending.
10. Integration recommendation:
   - Integrated with the Stage 8 bundle; do not separate it from the dev-preview catalog change unless cherry-picking the whole catalog path.

## 2026-07-04 Follow-Up Delivery: Nation Mark Source Separation

1. Changed this follow-up:
   - Expanded private Stage5 sampling so every available `faction + card type` pair has its own official-card source crop.
   - Changed generated `nation-mark` manifest entries from one crop per nation to `nationId + kind + template`.
   - Changed renderer-ready nation marks to transparent-background emblem subjects instead of full 54x54 source-background crops.
   - Added subject-protection masks for France, Germany, Italy, Japan, US, Anzac, Britain command marks, and France air marks so threshold cleanup does not erase rings, crosses, flags, stars, or outer circles.
   - Added a Python contract test for forbidden private output paths, per-kind/template manifest entries, Stage6 path and metadata preservation, Britain command ring protection, and France air ring protection.
   - Changed Stage6 clean-slot copying so same-nation crops no longer overwrite each other.
   - Updated the manifest example and resolver test to document/guard template-specific nation marks.
   - Regenerated the local private Stage5 and Stage6 packs under `.runtime` for current browser preview use.
2. Files touched:
   - Tooling files: `tools/kards_private_calibration.py`, `tools/kards_multisource_extraction.py`.
   - Test files: `src/canvas/renderAssets.test.ts`, `tools/kards_private_calibration_contract_test.py`.
   - Docs: `docs/active/kards-style-replication/asset-pack-manifest.example.json`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Lessons: `lessons learned.md`.
   - Private runtime evidence: `.runtime/kards-private-assets/**`, `.runtime/qa/nation-mark-kind-final-sheet.png`, `.runtime/qa/nation-mark-britain-france-protected.png`; gitignored.
3. Diff summary:
   - No production renderer drawing path changed.
   - The private generator now preserves official branch/template differences for top-right nation marks while removing source-card background color from the renderer-ready PNGs.
   - The final Stage6 manifest now has 65 `nation-mark` entries instead of 11 generic nation entries.
4. Commit status:
   - Committed directly on `main`; unrelated UI/i18n working-tree changes are excluded from this delivery.
5. Base divergence:
   - Work started from `main` commit `2813649`; `git worktree list --porcelain` showed only the main checkout.
6. Potential conflicts:
   - Direct overlap with future branches editing `tools/kards_private_calibration.py`, `tools/kards_multisource_extraction.py`, or the asset-pack manifest contract docs.
   - Low runtime conflict risk because existing renderer asset specificity already supports `kind` and `template` filters.
7. Validation:
   - `py -3 -m py_compile tools\kards_private_calibration.py tools\kards_multisource_extraction.py tools\kards_private_calibration_contract_test.py`: passed.
   - `py -3 tools\kards_private_calibration_contract_test.py`: passed, 5 tests.
   - `npm test -- --run src/canvas/renderAssets.test.ts`: passed, 4 tests.
   - Stage5 generation passed: 69 official samples, 163/163 requirements covered, 91 manifest images.
   - Stage6 generation passed: 337 extracted/cataloged private files, 91 renderer-ready images.
   - Final manifest audit passed: 65 `nation-mark` entries across 65 available nation/kind/template combinations, with no missing filters.
   - Final transparent contact sheets saved at `.runtime/qa/nation-mark-kind-final-sheet.png` and `.runtime/qa/nation-mark-britain-france-protected.png`.
   - `npm test -- --run`: passed, 10 files and 59 tests.
   - `npm run build`: passed, including typecheck and Vite production build.
8. Unverified risks:
   - No browser pixel-smoke rebaseline was run for every nation/kind combination.
   - Alpha checks cannot prove emblem completeness alone, so the current evidence combines source coverage, subject-protection masks, focused alpha audit, and contact-sheet review.
9. Recommended next step:
   - Commit and push this source-separation fix, then judge any remaining color/placement issues from the corrected source identity rather than from mixed generic crops.
10. Integration recommendation:
   - Commit directly on `main`; no separate worktree merge or cherry-pick is needed.

## 2026-07-04 Follow-Up Delivery: UI Localization And Fixed Preview Shell

1. Changed this follow-up:
   - Added Chinese/English UI text routing and made Chinese the default document/UI language.
   - Localized field, canvas, project, warning, and runtime asset-pack messages while preserving file names and unknown messages.
   - Preserved readable Unicode titles in exported PNG/JSON file names.
   - Fixed the editor shell so the compact top header and center preview stay stable while side panels scroll independently.
   - Moved the left field-panel scrollbar to the outside edge for visual symmetry with the right project panel.
2. Files touched:
   - Core files: `index.html`, `src/App.tsx`, `src/i18n.ts`, `src/components/CardCanvas.tsx`, `src/components/FieldPanel.tsx`, `src/components/ProjectPanel.tsx`, `src/styles.css`.
   - Test files: `src/i18n.test.ts`, `src/components/ProjectPanel.test.ts`.
   - Docs: `docs/active/_worktree_registry.md`, `context.md`, `task.md`.
   - Lessons: `lessons learned.md`.
3. Diff summary:
   - No card renderer geometry or asset extraction path changed.
   - Editor chrome now owns scroll at the side-panel level instead of the page level.
   - UI strings are centralized in `src/i18n.ts` instead of being scattered across components.
4. Commit status:
   - Committed directly on `main` after final validation.
5. Base divergence:
   - Work started from `main` commit `f09d37e`; `git worktree list --porcelain` showed only the main checkout.
6. Potential conflicts:
   - Direct overlap with future changes touching global app shell, localized UI copy, project export controls, or side-panel layout.
7. Validation:
   - `npm test -- --run`: passed, 10 files and 59 tests.
   - `npm run build`: passed, including typecheck and Vite production build.
   - HTTP probe for `http://127.0.0.1:5173/`: passed, status 200.
8. Unverified risks:
   - No full browser pixel regression suite was run for every viewport.
   - Mobile keeps normal document scrolling by design; the fixed preview shell is a desktop/tablet editor behavior.
9. Recommended next step:
   - Commit and push this UI integration bundle to `origin/main`.
10. Integration recommendation:
   - Commit directly on `main`; no separate worktree merge or cherry-pick is needed.

## 2026-07-04 Follow-Up Delivery: Dev Preview Asset-Pack URL Repair

1. Changed this follow-up:
   - Repointed the dev private preview renderer pack URL from the older Stage6 cardface preview pack to the current Stage6 multisource extraction pack.
   - Added a catalog regression test so the renderer-ready private manifest URL cannot silently drift back to the stale pack.
   - Confirmed the current manifest contains the processed nation/type icon entries needed by the existing resolver keys.
2. Files touched:
   - Core files: `src/devPreviewCatalog.ts`.
   - Test files: `src/devPreviewCatalog.test.ts`.
   - Docs: `docs/active/_worktree_registry.md`, `context.md`, `task.md`.
   - Lessons: `lessons learned.md`.
3. Diff summary:
   - The card editor now loads `.runtime/kards-private-assets/stage6-multisource-clean-extraction/kards-asset-pack.json` in dev mode.
   - No card schema, localization values, renderer geometry, or production asset bundling changed.
4. Commit status:
   - Committed directly on `main` after validation.
5. Base divergence:
   - Follow-up started from `main` commit `d9fe577`; no separate implementation worktree was used.
6. Potential conflicts:
   - Low direct conflict risk; future changes to `src/devPreviewCatalog.ts` or Stage6 output location should update this test at the same time.
7. Validation:
   - Manifest audit passed: 91 images, 65 nation marks, 7 type icons, 0 missing files.
   - HTTP probe on `http://127.0.0.1:5173/.runtime/kards-private-assets/stage6-multisource-clean-extraction/kards-asset-pack.json` passed with status 200 and confirmed Japan tank plus tank type-icon entries.
   - Browser probe on `http://127.0.0.1:5173/` requested the new pack once, the old pack zero times, and reported no request failures or console warnings/errors.
   - `npm test -- --run src/devPreviewCatalog.test.ts src/canvas/renderAssets.test.ts src/assetPack.test.ts`: passed, 3 files and 15 tests.
   - `npm test -- --run`: passed, 10 files and 60 tests.
   - `npm run build`: passed, including typecheck and Vite production build.
8. Unverified risks:
   - No all-combination visual review was run for every nation and kind; the fix proves the current page loads the correct asset source and that the manifest has matching keys.
9. Recommended next step:
   - Judge any remaining icon appearance problems from the corrected Stage6 multisource pack, not from text fallback output.
10. Integration recommendation:
   - Commit and push directly on `main`; no merge or cherry-pick is needed.

## 2026-07-04 Follow-Up Delivery: Multi-Keyword Picker And Renderer

1. Changed this follow-up:
   - Added a structured keyword preset list with a maximum of four selected card keywords.
   - Replaced the freeform keyword text field with removable keyword chips and a duplicate-safe add dropdown.
   - Migrated legacy `keywordLine` imports into structured keyword ids while keeping `keywordLine` as a regenerated compatibility/export string.
   - Rendered selected keywords as one English comma-separated card-face line with consistent spacing and shrink-to-fit behavior.
   - Localized editor keyword labels to Chinese while preserving English KARDS keyword labels on the card face.
2. Files touched:
   - Core files: `src/keywords.ts`, `src/types.ts`, `src/cardModel.ts`, `src/components/FieldPanel.tsx`, `src/canvas/cardRenderer.ts`, `src/i18n.ts`, `src/styles.css`.
   - Test files: `src/keywords.test.ts`, `src/cardModel.test.ts`, `src/i18n.test.ts`, `src/canvas/cardRenderer.test.ts`.
   - Docs: `docs/active/_worktree_registry.md`, `context.md`, `task.md`.
   - Lessons: `lessons learned.md`.
3. Diff summary:
   - Card editing now treats `keywords` as the source of truth and uses `keywordLine` only for old imports and compatibility output.
   - The card renderer draws `Guard, Blitz, Shock` style keyword lines from known ids instead of formatting arbitrary raw text.
   - The left editor panel prevents duplicate keyword choices and disables the add dropdown at four selections.
4. Commit status:
   - Committed directly on `main` after final validation.
5. Base divergence:
   - Follow-up started from `main` commit `1480500`; `git worktree list --porcelain` showed only the main checkout.
6. Potential conflicts:
   - Direct overlap with future changes touching card schema normalization, keyword rendering, `FieldPanel`, localized field labels, or global form styling.
7. Validation:
   - Local CraftSoul-derived attribute audit found cards with 0-4 attributes and identified the player-facing keyword list used for the dropdown.
   - `npm test -- --run src/keywords.test.ts src/cardModel.test.ts src/i18n.test.ts src/canvas/cardRenderer.test.ts`: passed, 4 files and 37 tests.
   - `npm test -- --run`: passed, 11 files and 68 tests.
   - `npm run typecheck`: passed.
   - `npm run build`: passed, including typecheck and Vite production build.
   - `git diff --check`: passed with Windows LF-to-CRLF warnings only.
   - Browser probe on `http://127.0.0.1:5173/`: four selected keywords rendered as `Guard, Blitz, Shock, Smokescreen`; selected options were removed from the dropdown and the add control disabled at four.
8. Unverified risks:
   - No complete visual rebaseline was run against every official multi-keyword card; current evidence covers layout contract, fitting behavior, and live editor interaction.
9. Recommended next step:
   - Continue future keyword visual tuning from the structured `keywords` ids and keep `keywordLine` as derived compatibility text only.
10. Integration recommendation:
   - Commit and push directly on `main`; no merge or cherry-pick is needed.

## 2026-07-04 Follow-Up Delivery: Card-Pack Set Mark And Edge Cleanup

1. Changed this follow-up:
   - Removed reference/sample-name parenthetical labels from the set dropdown; it now acts as the card-pack footmark selector.
   - Renamed the editor field to `卡包` / `Set mark` and kept it positioned beside rarity in the existing form grid.
   - Added subject-protected transparent extraction for set-mark icons so source-card paper background is removed without erasing small or pale symbols.
   - Removed the generated dark placeholder/custom card edge; fallback cards now transition directly into the card face when no frame asset is present.
2. Files touched:
   - Core files: `src/App.tsx`, `src/components/FieldPanel.tsx`, `src/canvas/cardRenderer.ts`, `src/i18n.ts`, `src/styles.css`.
   - Test files: `src/i18n.test.ts`, `src/canvas/cardRenderer.test.ts`, `tools/kards_private_calibration_contract_test.py`.
   - Tooling files: `tools/kards_private_calibration.py`.
   - Docs: `docs/active/_worktree_registry.md`, `context.md`, `task.md`.
   - Lessons: `lessons learned.md`.
3. Diff summary:
   - Set option labels now come from preset labels only; dev preview sample labels no longer override option text.
   - `extract_set_mark_subject` uses set-mark corner background sampling and protects subject pixels before clearing connected background.
   - Renderer fallback no longer draws the dark outer mat or fallback black/light frame strokes.
4. Commit status:
   - Committed directly on `main` after final validation.
5. Base divergence:
   - Follow-up started from `main` commit `b61a1ae`; no separate implementation worktree was used.
6. Potential conflicts:
   - Direct overlap with future changes touching `FieldPanel`, `cardRenderer`, `i18n`, global field-grid CSS, or private official-asset extraction.
7. Validation:
   - `py -3 -m py_compile tools\kards_private_calibration.py tools\kards_multisource_extraction.py tools\kards_private_calibration_contract_test.py`: passed.
   - `py -3 tools\kards_private_calibration_contract_test.py`: passed, 8 tests.
   - Stage5 regeneration passed: 69 official samples, 163/163 requirements covered, 91 manifest images.
   - Stage6 regeneration passed: 337 extracted/cataloged private files and 91 renderer-ready images.
   - Set-mark alpha audit passed: 14 visible set marks have transparent edges and non-empty subject bounding boxes; `only-spawnable` is intentionally fully transparent.
   - `npm test -- --run`: passed, 11 files and 70 tests.
   - `npm run build`: passed, including typecheck and Vite production build.
8. Unverified risks:
   - No all-card browser pixel regression sweep was run for every set mark; current evidence covers extraction contracts, regenerated local private assets, alpha audit, and build/test health.
9. Recommended next step:
   - Continue any visual footmark tuning from the transparent Stage6 set-mark outputs rather than reintroducing baked paper-background crops.
10. Integration recommendation:
   - Commit and push directly on `main`; no merge or cherry-pick is needed.

## 2026-07-04 Follow-Up Delivery: Official Reference Picker And Detailed Set Marks

1. Changed this follow-up:
   - Added a dedicated official reference selector back into the editor as `官方参考`, separate from the editable card-pack footmark selector.
   - Expanded the dev official-reference catalog to 69 card samples plus the HQ sample, with localized Chinese sample names.
   - Made selecting a reference update only the comparison/reference card; loading that sample into the editable card remains an explicit project-panel action.
   - Preserved more linework for detailed footmarks: `legions`, `naval-warfare`, `special`, `theaters-of-war`, `winter-war`, and `world-at-war`.
   - Regenerated the private Stage5 and Stage6 local asset packs after the extraction change.
2. Files touched:
   - Core files: `src/App.tsx`, `src/components/FieldPanel.tsx`, `src/components/ProjectPanel.tsx`, `src/devPreviewCatalog.ts`, `src/i18n.ts`.
   - Test files: `src/devPreviewCatalog.test.ts`, `src/i18n.test.ts`, `tools/kards_private_calibration_contract_test.py`.
   - Tooling files: `tools/kards_private_calibration.py`.
   - Docs: `docs/active/_worktree_registry.md`, `context.md`, `task.md`.
   - Lessons: `lessons learned.md`.
3. Diff summary:
   - `CardSpec.set` remains the custom card footmark source, while `selectedReferenceSampleId` controls the official reference image independently.
   - The dev preview catalog now has a broad localized reference list and a smaller set-sample compatibility list derived from it.
   - Detailed set marks use a narrower subject-distance threshold only when their set id is in the detailed preservation list.
4. Commit status:
   - Committed directly on `main` after final validation.
5. Base divergence:
   - Follow-up started from `main` commit `c860025`; no separate implementation worktree was used.
6. Potential conflicts:
   - Direct overlap with future changes touching `App`, `FieldPanel`, `ProjectPanel`, `devPreviewCatalog`, localized field labels, or private official-asset extraction.
7. Validation:
   - `npm test -- --run src/devPreviewCatalog.test.ts src/i18n.test.ts`: passed, 2 files and 12 tests.
   - `py -3 -m py_compile tools\kards_private_calibration.py tools\kards_multisource_extraction.py tools\kards_private_calibration_contract_test.py`: passed.
   - `py -3 tools\kards_private_calibration_contract_test.py`: passed, 9 tests.
   - Stage5 regeneration passed: 69 official samples, 163/163 requirements covered, 91 manifest images.
   - Stage6 regeneration passed: 337 extracted/cataloged private files and 91 renderer-ready images.
   - Set-mark detail audit saved `.runtime/qa/set-mark-detail-legions-after.png` and confirmed detailed marks retain visible subjects with transparent backgrounds.
   - `npm run typecheck`: passed.
   - `npm test -- --run`: passed, 11 files and 70 tests.
   - `npm run build`: passed, including typecheck and Vite production build.
   - HTTP probe for `http://127.0.0.1:5173/`: passed with status 200.
8. Unverified risks:
   - No full perceptual browser sweep was run across every official reference sample or every card-pack footmark.
   - The detailed preservation list is intentionally explicit; newly discovered thin-line footmarks should be added by set id after visual review.
9. Recommended next step:
   - Continue reference-card calibration through `DEV_PREVIEW_REFERENCE_SAMPLES`; do not overload the card-pack selector with sample-loading behavior again.
10. Integration recommendation:
   - Commit and push directly on `main`; no merge or cherry-pick is needed.
