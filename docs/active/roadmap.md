# KARDS Card Forge Roadmap

## Current Baseline — v1.4.0

KARDS Card Forge is a local, static tool for creating one custom card at a
time. The current release includes:

- Chinese and English editing, Canvas preview, and PNG/JPG/PDF export.
- `1×`, `2×`, and `3×` rerendered output with exposure and contrast controls.
- Project files, lightweight browser drafts, and a local card library.
- A versioned reference catalog with 74 bilingual sample/reference cards,
  search, comparison, explicit artwork application, and full-card loading.
- Bundled reference assets, optional local style packs, export preflight, and
  structured diagnostics.
- Bounded Undo/Redo for authored changes and deliberate full-card replacements,
  with visible controls and standard shortcuts that preserve native text edit
  behavior.
- Visual comparison with an explicit threshold, review level, and changed-area
  coordinates; differences remain human review signals rather than pass/fail
  compliance results.
- Five serialized appearance presets, keyboard-reachable workbench controls,
  and a readable Canvas summary with keyboard alternatives for artwork crop.
- Verified Vercel and GitHub Pages release paths plus a code-only Release
  boundary.

The product boundary remains unchanged: a local single-card design tool, not a
gameplay, account, deck, batch-generation, or network-content platform.

## Next

### 1. Text Health and Editing Safety

- Surface title/body truncation before export instead of silently relying on
  renderer clipping.
- Reuse the existing diagnostics and authored-history boundaries; do not add a
  second validation or state framework.
- Keep Chinese and English warnings under the same tested behavior contract.

### 2. Representative Visual Baselines

- Record a small fixed-environment baseline for representative card types and
  text lengths.
- State whether each baseline proves layout, selected elements, or whole-card
  appearance.
- Keep runtime comparison lightweight; do not turn it into a user-side baseline
  manager or treat pixel drift as automatic proof of a defect.

### 3. Manual Accessibility Closure

- Exercise the complete editor with common screen readers, 200% zoom, forced
  colors, and contrast review.
- Convert only reproduced failures into focused semantics, styles, and tests.
- Keep automated checks as regression support, not a WCAG-conformance claim.

### 4. Reference and Preset Growth

- Admit more public cards only when bilingual JSON/images, exact source
  identity, SHA-256, rights, catalog, and closed-world build coverage all close.
- Evaluate the first five appearance presets in real editing tasks before
  expanding the catalog.
- Keep all presets inside serialized `CardSpec.appearance`; do not introduce a
  second renderer, arbitrary theme schema, or hidden runtime dependency.

## Later, If Evidence Supports It

- Print presets with explicit physical size, bleed, and cut-mark contracts.
- A portable local-library format with relative artwork sidecars.
- A larger appearance catalog after the first built-in set proves useful.

These are directions, not promised release items. Add them only after a clear
user need and a testable acceptance rule exist.

## Not Planned

- Deck builder or game-rule validation
- Account system or online sharing
- Network image gallery or official-resource downloader
- Large batch-generation or spreadsheet workflow
- Canvas engine rewrite or general-purpose theme/plugin platform

## Release Guardrails

- Every behavior change follows a failing-test-first cycle and the final
  `npm run validate` repository gate.
- `npm run build:sites` prepares the same verified static application for Sites
  hosting without changing product behavior.
- The public reference pack stays inside `public/reference-pack/v1` with an
  exact allowlist. Its presence does not grant fork or redistribution rights.
- Local paths, user-selected style packs, private calibration files, and
  `.runtime` contents stay outside public bundles and publishable documentation.
- README, roadmap, release notes, and the worktree registry must describe the
  code and release state that actually exist.
