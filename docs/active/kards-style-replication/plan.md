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
- [ ] Commit, merge back to `main`, push, and clean the worktree if validation stays green.

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
