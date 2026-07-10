# User-facing copy audit task

## Checklist

- [x] Inventory UI, README, and current explanatory copy.
- [x] Record before/after terminology and readability findings.
- [x] Update Chinese and English UI copy.
- [x] Update existing copy-sensitive tests.
- [x] Rewrite README around first-time use and common workflows.
- [x] Update current explanatory documents that users or maintainers still rely on.
- [x] Run focused tests and typecheck.
- [x] Run `npm run validate` as the single live-test owner.
- [x] Attempt limited browser smoke; localhost control was policy-blocked, so record the gap and use component/full-gate evidence without bypassing the policy.
- [x] Complete three independent reviews and fix confirmed findings.
- [x] Update delivery package and registry.
- [x] Archive the completed task, commit, push, and verify `main` alignment.

## Delivery package

1. Changed the bilingual interface to use one direct vocabulary for cards, artwork, references, project files, the local card library, and local style packs; actions now state whether they replace artwork or the full card.
2. Added actionable localization for known runtime failures, a safe generic fallback for unknown failures, localized library metadata, and copy-contract tests without changing the underlying error/state models.
3. Rewrote README onboarding around the first card, four workspace tabs, save choices, browser limits, local style packs, development, and publication boundaries; refreshed the current roadmap and manifest reference.
4. Archived completed style-replication evidence unchanged and kept its reusable manifest example in `docs/reference/`.
5. Split runtime-message formatting from the main UI dictionary to keep responsibilities clear while preserving the existing `src/i18n.ts` import contract.

### Files

- Core: `src/i18n.ts`, `src/runtimeMessages.ts`, `src/components/FieldPanel.tsx`, `src/components/LocalLibraryWorkbench.tsx`, `src/components/ProjectPanel.tsx`, `src/components/ReferenceWorkbench.tsx`, `index.html`.
- Tests: `src/i18n.test.ts`, `src/components/FieldPanel.test.ts`, `src/components/ProjectPanel.test.ts`.
- Documentation: `README.md`, `docs/active/roadmap.md`, `docs/reference/asset-pack-manifest.example.json`, `docs/archive/kards-style-replication/**`, this task record, registry, and lessons learned.
- Temporary: `.runtime/copy-audit-validate.log` and `.runtime/copy-audit-validate.exit` were used only for single-owner validation and are removed before commit.

### Integration state

- Diff summary: a user-facing copy rewrite plus localized error rendering/tests, one responsibility split, one generic manifest reference, and a completed-doc archive move. No card model, renderer, persistence format, export format, dependency, or release boundary changed.
- Commit state: implementation and records are committed together by the final Lore-protocol closeout and pushed to `origin/main`.
- Base/divergence: started from clean `main` at `2ac6783`, aligned with `origin/main`; only the main checkout exists.
- Overlap/conflicts: no parallel worktree or path overlap. Semantic risk was yellow because labels describe destructive or persistent actions; exact wording tests and three reviews closed the confirmed issues.
- Verification: focused copy tests passed 40/40; final `npm run validate` passed 16 files / 240 tests, 13 Python contracts, TypeScript, production build, and strict dist verification; `git diff --check` passed apart from informational line-ending notices.
- Gap: visual desktop/narrow-screen smoke could not run because in-app localhost control was security-policy blocked. No bypass was attempted; component SSR and full automated gates passed.
- Recommendation: integrated directly on `main`; no rebase, cherry-pick, merge, or worktree cleanup is required.
