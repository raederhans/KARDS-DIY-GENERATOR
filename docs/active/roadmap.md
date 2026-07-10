# KARDS Card Forge Roadmap

## Current Baseline — v0.3.0

KARDS Card Forge is a local, static tool for creating one custom card at a
time. The current release includes:

- Chinese and English editing, Canvas preview, and PNG/JPG/PDF export.
- `1×`, `2×`, and `3×` rerendered output with exposure and contrast controls.
- Project files, lightweight browser drafts, and a local card library with add,
  load, update, and delete actions.
- A versioned reference catalog with search, filters, stable sorting, comparison,
  explicit artwork application, full-card loading, and safe automatic matching.
- Bundled reference assets, generated fallbacks, optional local style packs,
  export preflight, and structured export diagnostics.
- Verified Vercel and GitHub Pages release paths.

The product boundary remains the same: a local single-card design tool, not a
gameplay, account, deck, or network-content platform.

## Next

### 1. Stable Visual Review

- Record a small visual baseline for the main card types and representative
  text lengths.
- State what each baseline proves: layout, selected elements, or full-card
  appearance.
- Treat image drift as a review signal, not automatic proof of a bug.

### 2. Focused Accessibility

- Test the complete editor with keyboard-only input and common screen-reader
  paths.
- Improve focus order, field instructions, and status announcements where the
  current semantics are not enough.
- Keep Chinese and English labels under the same tested text contract.

### 3. Renderer Maintenance

- Tune rendering details only when a baseline can show the intended change.
- Split large renderer or workspace modules by real responsibility when that
  makes tests and ownership clearer.
- Avoid a broad renderer rewrite while current output is stable.

## Later, If Evidence Supports It

- Better print presets for existing PDF export.
- More portable local-library workflows that preserve the current JSON format.
- Additional built-in reference metadata that fits the existing static catalog.

These are directions, not promised release items. Add them only after a clear
user need and a testable acceptance rule exist.

## Not Planned

- Deck builder or game-rule validation
- Account system or online sharing
- Network image gallery or official-resource downloader
- Large batch-generation workflow

## Release Guardrails

- `npm run validate` remains the repository gate for tests, private-tool
  contracts, typecheck, production build, and final artifact verification.
- The public reference pack stays inside `public/reference-pack/v1` with an
  exact allowlist.
- Local paths, user-selected style packs, private calibration files, and
  `.runtime` contents stay outside public bundles and publishable documentation.
- README, roadmap, release notes, and the worktree registry must describe the
  code and release state that actually exist.
