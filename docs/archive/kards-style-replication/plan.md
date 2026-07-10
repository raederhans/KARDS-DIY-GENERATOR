# KARDS Card Style Replication Plan

## Task Grade

- Grade: complex
- Reason: the request changes the core Canvas visual model, asset policy, typography, and future template structure.
- Current owner: main Codex agent owns research, documentation, and any live process.
- Subagents:
  - official visual evidence: official static card structure and licensing
  - reference projects: KardsGen, kards-image-tool, KARDS-Assets
  - current gap review: current renderer versus official card structure

## First-Principles Goal

The user does not need a generic WWII card generator. The target is a local static tool that can produce a KARDS-looking card face. Therefore the first acceptance bar is not "nice design"; it is structural similarity to official static card view:

1. Match the official card-body proportion.
2. Match the major information zones: header, artwork, stat row, ability text, rarity/set footer.
3. Match the visual grammar of costs, operation cost, title strip, nation mark, unit stats, text block, and rarity pips.
4. Keep official IP boundaries explicit: do not bundle official assets by default unless the user later accepts that policy risk.

## Plan

- [x] Confirm local repo state, existing constraints, and lessons learned.
- [x] Collect official card-face evidence from KARDS support pages and official images.
- [x] Inspect reference projects for coordinate systems, asset organization, and browser export patterns.
- [x] Compare current renderer against the evidence.
- [x] Produce an implementation-ready replication spec and risk notes.
- [x] Run a final review pass before reporting.

## Stage 1 Precision Geometry Implementation

- [x] Create a fixed 500x702 layout table from the KardsGen/official-style evidence.
- [x] Split layout templates into unit, command, and HQ card faces.
- [x] Replace the rough decorative renderer with a template-driven Canvas draw order.
- [x] Keep official asset files out of the default app; use programmatic placeholder surfaces only.
- [x] Move artwork hit testing to the active template rect so upload dragging matches the visible card area.
- [x] Add focused unit tests for fixed coordinates, render size, and artwork cover behavior.
- [x] Run typecheck, tests, and production build.
- [x] Complete independent code/architecture review and fix accepted findings.
- [x] Run a focused browser smoke on the live Vite app.
- [x] Complete final integration closeout.

## Non-Goals For This Research Pass

- No gameplay, deck legality, account, automation, or cheating features.
- No README edits.
- No bundled official asset pack in production code during research.
- No broad redesign until the official structure is pinned down.

## Stage 1 Non-Goals

- No official KARDS images, fonts, logos, or extracted assets are bundled.
- No asset-pack import UI is added in this stage.
- No card rules parser, automation, deck validation, account, or game feature is added.
- No README edits.

## Stage 2 Private Asset Calibration

- [x] Create an isolated worktree from `main` for private asset-pack calibration work.
- [x] Re-check local lessons learned and current Stage 1 renderer boundaries.
- [x] Run read-only subagent review for code hotspots, asset extraction constraints, and first-principles risk.
- [x] Add a lightweight renderer asset-slot interface without changing the default `renderCard` call path.
- [x] Add a browser-only local asset-pack loader based on `kards-asset-pack.json`.
- [x] Keep local official-derived images/fonts out of git, `src`, `public`, and default `dist`.
- [x] Add an optional current-canvas versus reference-PNG pixel diff path.
- [x] Add unit tests for asset-slot selection, renderer asset usage, and pixel diff math.
- [x] Run final validation and review before integration.
- [x] Commit, merge back to `main`, push, and clean the worktree if validation stays green.

## Stage 2 Visual Thesis

- Visual thesis: a private calibration mode that lets the Canvas surface use native KARDS-like material slices while keeping the editor quiet, dense, and tool-like.
- Content plan: preserve the current editor as the first screen, add only two Project controls for local asset loading and reference comparison, then surface compact status metrics.
- Interaction thesis: directory pick for one-step local pack loading, immediate canvas re-render when the pack resolves, and one-click PNG comparison with numeric diff feedback.

## Stage 2 Non-Goals

- No bundled official asset pack.
- No automatic game-directory scanning from the browser.
- No network download path for official cards.
- No gameplay, rules, deck, account, or automation features.
- No README edits.

## Stage 3 Private Official Coverage Pack

- [x] Create an isolated worktree from `main` for source-asset calibration.
- [x] Re-check local lessons learned, active docs, and current asset-pack boundaries.
- [x] Use a read-only subagent to review local pak extraction versus official web-card download routes.
- [x] Confirm the local KARDS pak exists but no UnrealPak/FModel/repak/umodel command is currently installed.
- [x] Use CraftSoul `data.json` as the private calibration index and official KARDS card images as the source image route.
- [x] Select a compact coverage set that covers every faction, every card kind, every rarity, and every set/package mark at least once.
- [x] Generate private local official card references, artwork crops, reusable manifest slices, sample project JSON, and a coverage report under `.runtime`.
- [x] Run typecheck, tests, and script validation after the final documentation updates.
- [x] Commit, merge back to `main`, push, and clean the worktree if validation stays green.

## Stage 3 Non-Goals

- No official PNG/AVIF/font files are committed or bundled.
- No public redistribution of the generated private asset pack.
- No full Unreal pak extraction in this stage; clean UI atlas extraction remains a later step if full-card crops are not enough.
- No automatic browser download path; generation stays in the local Python tool and `.runtime`.
- No README edits.

## Stage 4 Browser Visual Smoke Calibration

- [x] Create an isolated worktree from current `main` for visual smoke calibration.
- [x] Re-check lessons learned, active task docs, and current renderer/asset-pack boundaries.
- [x] Install a reproducible browser-smoke dependency and add a named `npm run smoke:visual:kards` entry.
- [x] Add a browser-backed visual smoke that loads the private Stage 3 pack, renders each representative sample, crops each manifest element, and writes rendered/diff/extracted artifacts under `.runtime`.
- [x] Add a Pillow-backed pixel audit so final metrics compare rendered crops directly against original reference PNGs, not a browser-redrawn reference canvas.
- [x] Calibrate renderer issues found by the smoke: integer-align rarity pips and keep no-keyword body copy below the unit type icon.
- [x] Run the Stage 3 private pack through the smoke: 37/37 element slots pass with `maxDelta=0` and `changedRatio=0`.
- [x] Complete final typecheck/test/build validation and visual smoke re-run.
- [x] Complete independent review and fix accepted findings.
- [x] Commit, integration, push, and worktree cleanup.

## Stage 4 Probe Boundary

- The visual smoke uses `asset-slot-isolated` mode: print wear and text are disabled while probing element slots.
- This is deliberate because the Stage 3 pack is made from full-card crops and official text/font layers are not calibrated yet.
- Full-card text/font comparison remains a later stage after official typography and cleaner atlas extraction decisions.

## Stage 4 Non-Goals

- No official-derived PNGs are committed or bundled.
- No full-card visual equivalence claim yet.
- No pak/UI-atlas extraction in this stage.
- No README edits.

## Stage 5 Card-Face And View Element Extraction

- [x] Create an isolated worktree from current `main` for card-face/view element extraction.
- [x] Re-check lessons learned, active task docs, Stage 3/4 private outputs, and current renderer asset boundaries.
- [x] Build a bounded taxonomy for static card-face elements, variable-bearing elements, and card inspect/view-state effects.
- [x] Extend the private extraction pipeline so feasible elements are copied/cropped into `.runtime` with coordinates, source card, variable filters, and rights notes.
- [x] Keep official-derived files out of git, `src`, `public`, and default `dist`.
- [x] Add or extend manifest slots only for elements that the renderer can resolve deterministically.
- [x] Add calibration/report checks for every extracted element class, including dimensions, source rect, and coverage status.
- [x] Run typecheck, tests, build, and visual smoke or equivalent artifact validation.
- [x] Complete independent review, commit, merge, push, and worktree cleanup.

## Stage 5 Extraction Boundary

- Included: static card-face materials, boards, bars, frames, text/number-bearing surfaces, print/view overlays, and card inspect/view presentation effects that are visible on the card or its enlarged view.
- Excluded: in-match combat effects, hit animations, deployment animations, board VFX, projectile/impact effects, and gameplay-only state animations.
- If an element cannot be cleanly isolated from full-card renders, keep it as a measured reference crop first and do not wire it into the renderer until the source and semantics are clear.

## Stage 5 Output Snapshot

- Private output: `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage5-card-face-elements`
- Official samples: 23; synthetic HQ layout samples: 3.
- Coverage: 98/98 required axes, missing 0.
- Renderer-ready manifest images: 37, limited to nation marks, type icons, rarity pips, and set marks.
- Reference crops: 425 full-card/board/text/number/view-treatment crops under `references/stage5-elements`.
- Local KARDS manifest candidates: 539 indexed candidates from the pak manifest; `view-glow` and `zoom-shadow` remain indexed-only until clean pak extraction or official inspect-view capture is available.
- HQ is covered as local synthetic layout/defense-number samples only; no official HQ reference crop is claimed because the CraftSoul official card-image route has no HQ card type.
- Validation: Python compile passed; Stage5 generation passed; Stage5 visual smoke passed 37/37; default Stage3 generation and smoke passed 37/37; `npm test` passed 38/38; `npm run build` passed; smoke ports 5179 and 5180 confirmed released.

## Stage 5 Visual Thesis

- Visual thesis: treat the official card as a layered print object, where each material slice has a measured slot and a clear rule for when it appears.
- Content plan: no new landing UI; preserve the current editor and expand only the private calibration assets/reporting path until renderer-ready slots are proved.
- Interaction thesis: later viewer polish should feel like a quiet inspection loupe, not a battle animation surface.

## Stage 6 Multi-Source Clean Extraction And Calibration

- [x] Create an isolated worktree from current `main` for multi-source clean extraction.
- [x] Re-check lessons learned, active docs, Stage 5 outputs, local KARDS install files, and external reference repos.
- [x] Classify every source route as renderer-ready, reference-only, indexed-only, or synthetic-layout-only.
- [x] Test local pak/tool extraction feasibility without committing or bundling official-derived files.
- [x] Extract or copy every feasible clean card-face/view element into private `.runtime` outputs with source, dimensions, and rights notes.
- [x] Record variable elements: fonts/text surfaces, number boards, card boards, frames, print overlays, view/inspect effects, package marks, nations, card types, rarities, and HQ layout-only cases.
- [x] Keep the public renderer manifest limited to deterministic clean assets; keep uncertain assets as references until the source is proved.
- [x] Run targeted artifact checks and any visual smoke that matches the extracted asset class.
- [x] Complete independent review, commit, merge, push, and worktree cleanup.

## Stage 6 Extraction Boundary

- Included: local KARDS install manifests/pak candidates, Stage 5 private reports, KARDS-Assets static assets, KardsGen material assets, CraftSoul/kards-image-tool data/image routes, fonts if extractable, and card inspect/view-state surfaces.
- Excluded: battle VFX, board effects, projectiles, hit/deploy animations, account/gameplay automation, and any official asset bundled into `src`, `public`, or default `dist`.
- Rule: a source can help visual measurement even when it cannot become a clean renderer asset. The report must keep those categories separate.

## Stage 6 Output Snapshot

- Private output: `C:\Users\raede\Documents\KARDS\.runtime\kards-private-assets\stage6-multisource-clean-extraction`
- Visual smoke output: `C:\Users\raede\Documents\KARDS\.runtime\kards-visual-smoke-calibration\stage6-multisource-clean-extraction`
- Extracted/cataloged private files: 283.
- Smoke-safe renderer manifest images: 37, still limited to `nation-mark`, `type-icon`, `rarity-pip`, and `set-mark`.
- Multi-source reference/candidate files:
  - Stage5 official crop clean slots: 37.
  - KardsGen material candidates/references: 139 total, including 7 renderer-slot frame/board candidates that remain unwired.
  - KARDS-Assets private references: 40 sampled card backs and 46 HQ images.
  - CraftSoul/kards-image-tool references: 21 static/data reference files.
  - Local KARDS pak manifest candidates: 26045 indexed paths.
- KardsGen exact slot-size matches: `frame`, `cost-board`, and `command-border`; attack/defense/special/HQ boards need calibration or scaling before renderer wiring. None of these KardsGen candidates may enter `kards-asset-pack.json` until their slot-level smoke exists.
- Local pak status: `indexed-only-no-extractor`; no `repak`, `UnrealPak`, `FModel`, `umodel`, or `UEViewer` command was available in the current session.
- Stage6 visual smoke result: 37/37 pass, 0 review, 0 fail; app smoke canvas was `500x702` and nonblank.
- Merge-result validation on `main` repeated syntax checks, Stage6 generation, safety guard negative checks, Stage6 visual smoke, full unit tests, and production build successfully.
- Integrated worktree and local Stage6 branch were removed after the fast-forward merge; recovery commit is `5e48a54`.

## Stage 7 Visible Full-Card Preview Calibration

- [x] Acknowledge and correct the scope error: Stage 6's 37/37 result was only element-slot validation, not full-card visual equivalence.
- [x] Make the dev preview automatically load the private Stage 6 card-face pack, T-70 sample card, and official T-70 reference image.
- [x] Render generated and official reference cards side-by-side so the homepage no longer hides behind an old local draft.
- [x] Add dev-server URL asset-pack loading for `.runtime` private preview packs.
- [x] Patch the React dev StrictMode mounted-ref issue so async private pack loads are not discarded.
- [x] Replace the visible Stage 6 attack/defense board candidates with private derived clean board previews under `.runtime`.
- [x] Calibrate unit cost/stat/keyword text positions and sizes against the T-70 reference.
- [x] Run browser full-card smoke with region metrics and keep screenshot evidence under `.runtime/qa`.
- [x] Run full unit tests and production build.

## Stage 7 Boundary

- This stage proves the visible dev preview is now an honest full-card side-by-side calibration surface.
- It still does not claim perfect KARDS equivalence. Remaining gaps are official font extraction, title/cost exact typography, footer/print-wear lighting, and clean atlas/pak-derived UI layers.
- Official-derived and derived preview pixels remain under `.runtime`; they are not committed or bundled into `src`, `public`, or default `dist`.

## Stage 8 Typography Calibration

- [x] Broaden font research beyond local GitHub sources into forum/community references and custom-card templates.
- [x] Separate the evidence for Latin KARDS typography, numeric/stat typography, and Chinese fallback typography instead of treating all card text as one font.
- [x] Add role-specific font slots for title/body/keyword/cost/stat/utility so later private font packs can override only the needed text layer.
- [x] Recalibrate visible unit title, cost, operation cost, keyword, body, and stat rendering around condensed Latin text and wider CJK text.
- [x] Add bundled open-font replacements for the default browser path: Libre Franklin for Franklin-like labels and Yantramanav for cost/stat numerals.
- [x] Rework cost-board grouping so deployment cost, `K`, and operation cost use explicit centers instead of scattered magic positions.
- [x] Round-mask unit type-icon assets onto a paper-colored border with a dark inner board and reshape rarity pips toward the visible reference instead of preserving flat slot crops.
- [x] Keep dev-preview Set changes safe as field edits while exposing a dynamic `Load {selected set sample} Sample` action for representative cards such as DINGO.
- [x] Add focused renderer regression coverage for keyword font/color behavior.
- [x] Run targeted tests, full tests, typecheck, production build, browser reload, and the Stage 6 visual smoke against the current private pack.

## Stage 8 Typography Boundary

- Best current public evidence points to Franklin Gothic Demi/Condensed style for Latin KARDS card labels and names, with a custom-card template also listing Yantramanav Bold for deployment cost and attack/defense numerals.
- For Chinese card text, use Source Han Sans SC / Noto Sans SC / Microsoft YaHei UI as the practical CJK stack. The Chinese KardsGen README says Source Han Sans is visually closer, while its current generator defaults to Microsoft YaHei UI.
- Do not bundle commercial Franklin Gothic files or official-derived font/assets into `src`, `public`, or default `dist`.
- The current implementation is a better browser/font-stack approximation, not a proof of exact official typography. Exact matching still needs a legally usable font file or a private local font pack plus multi-sample visual calibration.
- Stage 8 intentionally breaks the old exact element-slot smoke for type icons and rarity pips because their rendered geometry is no longer a flat, untransformed crop. The next visual-smoke pass should separate "raw extracted slot identity" from "final card-face transformed presentation."
