# KARDS Card Forge Roadmap

## Current State

KARDS Card Forge is already usable as a v0.1-level single-card card-face
generator. The current app has working core editing, Canvas rendering, PNG/JPG/PDF
export, high-resolution rerendered export, lightweight local drafts, a local
card library path, private style-pack loading, reference comparison, and public
deployment paths for Vercel and GitHub Pages.

The next stage should focus on stabilization, regression baselines, and small
careful improvements. The project should stay a local static fan card-face tool,
not grow into a gameplay or account platform.

## Priority Roadmap

### Phase 1: Repository Trust And Documentation Sync

- Keep README, roadmap, worktree registry, and release notes aligned with the
  code that is actually present.
- Keep the non-official fan-project and private-asset boundaries visible.
- Avoid describing planned work as shipped functionality.

### Phase 2: CI And Unified Verification Entry

- Add a single named verification entry only after deciding the exact command
  contract.
- Preserve the existing useful checks: typecheck, Vitest, build, and targeted
  browser or visual smoke only when the changed area requires it.
- Keep docs-only changes from pretending they need runtime validation.

### Phase 3: Presentation-Aware Visual Smoke Baseline After Stage 8

- Treat Stage 8 as the current presentation-calibration line for type icons,
  rarity pips, typography, set/reference switching, and related card-face
  appearance fixes.
- Establish a visual smoke baseline after the Stage 8 presentation work is
  stable enough to compare against.
- Make the baseline state what it proves: layout, presentation, selected
  elements, or full-card appearance.
- Treat baseline drift as a review signal, not as automatic proof of a product
  bug.

### Phase 4: Local Library Workbench

- Turn the current local library from a save log into a small workbench.
- Add browsing, loading, updating, and deleting saved cards.
- Keep File System Access permission behavior explicit and browser-local.

### Phase 5: Small UX Audit

- Review artwork crop inputs and pointer behavior.
- Improve keyword editing accessibility.
- Clarify private style-pack wording and failure states.
- Continue localizing user-facing errors instead of storing translated error
  strings in state.

### Phase 6: Renderer Detail Tuning And Split

- Tune card rendering details only after the visual baseline is stable.
- Split renderer code by real responsibility when it reduces maintenance risk.
- Avoid large renderer rewrites until tests can distinguish intended visual
  changes from regressions.

## Not In Scope For Now

- Deck builder
- Account system
- Online sharing
- Game rule or legality validation
- Network image gallery
- Official resource auto-downloader
- Large batch-generation workflow

## Risk Register

- Official asset and font distribution risk: official or official-derived
  materials must stay out of the default public build.
- Private path leakage risk: `.runtime` paths and user-local asset paths must not
  appear in public bundles or publishable documentation.
- Visual smoke baseline staleness: old baselines can hide real regressions or
  flag intentional renderer changes as failures.
- Maintenance risk in `ProjectPanel` and `cardRenderer`: both files keep
  collecting behavior and should be split only when the baseline and tests make
  the split safe.
- Local library maturity risk: the current local library is closer to an append
  save log than a complete CRUD workbench.

## Acceptance Criteria For Roadmap Work

- README and roadmap match the current code and do not conflict with each other.
- Future agents can use the phase order above without guessing what to do next.
- Publishable docs do not include private official assets, real local absolute
  paths, `.runtime` file contents, or official resources.
- Planned features are described as planned, not as already implemented.
