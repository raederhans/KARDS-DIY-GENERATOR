# KARDS Card Forge v1.4.0 Release Plan

## Goal

Audit the complete local editor-quality candidate, repair confirmed blockers, document the user-visible workflow, and publish one exact-SHA `v1.4.0` GitHub Release.

## Scope

- Review all tracked and untracked v1.4 editor-quality changes.
- Repair confirmed correctness, accessibility, documentation, release-boundary, or test gaps without broad refactoring.
- Document Undo/Redo, visual-difference review, keyboard access, and appearance presets in both READMEs and the in-app Help page.
- Advance package metadata from `1.3.0` to `1.4.0` without changing dependencies.
- Preserve the existing code-only Release asset and public-resource rights boundaries.
- Validate, commit, push, tag, publish, and verify one immutable candidate SHA.

## Sources of truth

- Sole `main` worktree and refreshed `origin/main` at `3c83d776a453593cb22f8f6a5b1557d19da6dd6a` before release edits.
- Current tracked diff and complete untracked-file inventory.
- Independent code, test, documentation, and release-truth reviews.
- Repository tests, `npm run validate`, dependency audit, Pages-mode build, archive scans, GitHub Actions, tag, and Release assets.

## Stages

- [x] Stage 1: establish candidate, version, worktree, remote, authentication, and release-record truth.
- [x] Stage 2: complete independent review and repair every confirmed release blocker.
- [x] Stage 3: synchronize README, Help, version metadata, and bilingual Release notes.
- [x] Stage 4: run release-grade local verification and inspect the code-only archive.
- [x] Stage 5: create and push one Lore candidate commit, then verify remote CI and Pages.
- [x] Stage 6: tag and publish `v1.4.0`, re-download assets, and verify live endpoints.
- [x] Stage 7: reconcile roadmap/registry truth and archive this record.

## Acceptance criteria

- No unresolved critical, high, or release-blocking review findings remain.
- Undo/Redo preserves authored-state and asynchronous-revision contracts; keyboard shortcuts do not override native text editing.
- Visual-difference results remain descriptive, locatable, and not presented as pass/fail compliance.
- Appearance presets alter serialized appearance only and remain stable across project round trips.
- Both READMEs and in-app Help describe the new workflows in English and Chinese.
- `npm run validate`, `npm audit --audit-level=moderate`, editor-quality smoke, Pages-mode build, and code-only archive checks pass.
- `main`, `origin/main`, annotated tag `v1.4.0`, and the GitHub Release resolve to one immutable candidate SHA at publication.
- A freshly downloaded Release asset matches its published checksum and contains none of the excluded paths.

## Non-goals

- Do not redesign the editor architecture or add dependencies.
- Do not change public-resource licensing or bundle private runtime assets.
- Do not add a full image-diff download pipeline or claim WCAG conformance.
- Do not force-push, rewrite history, or publish from a different SHA than the verified candidate.

## Risks and constraints

- The dirty candidate includes source, tests, roadmap records, and two previously untracked archive records; every file must be classified before staging.
- Browser smoke and builds share ports, `dist/`, and Vite caches; the primary agent owns all live verification.
- GitHub Pages is workflow-driven and must be verified after the candidate push.
- Registry wording must remain commit-neutral until push, tag, and Release facts exist.
