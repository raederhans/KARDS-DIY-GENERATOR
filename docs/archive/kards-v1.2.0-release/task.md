# KARDS Card Forge v1.2.0 Release Task

## Status

Complete. `v1.2.0` is reviewed, published, and verified against candidate `8033291f9fd1b462e209b0422fca8186a3cd8ecf`.

## Working checklist

- [x] Identify exact candidate range and release baseline.
- [x] Complete independent review lanes and resolve findings.
- [x] Prepare version metadata and bilingual release notes.
- [x] Run all local release gates.
- [x] Commit and push the immutable candidate.
- [x] Verify CI, Pages, Vercel, archive, tag, and GitHub Release.
- [x] Archive this task and reconcile the worktree registry.

## Delivery package

1. Changed behavior: published Republic of China and Chinese Communist faction presets, muted palettes, localized labels, and 14 explicit non-HQ marks covering ground, fighter, bomber, artillery, order, and countermeasure selectors.
2. Changed files: core files are `src/presets.ts`, `src/i18n.ts`, the public manifest, 14 mark PNGs, package metadata, and rights notices; tests extend five existing Vitest files plus the existing dist-boundary test; release records are stored in this archive folder; temporary evidence remains ignored under `.runtime/releases/v1.2.0/`.
3. Diff from `v1.1.0` to the candidate: four commits, 36 files changed, 594 insertions, and 7 deletions.
4. Commit state: candidate `8033291f9fd1b462e209b0422fca8186a3cd8ecf` is committed and pushed; annotated tag `v1.2.0` resolves to it locally and remotely.
5. Base divergence: the release-record base `496f83eaca361ee4363c537a8edebbca83a9a476` is the direct parent of the candidate. The final records-only closeout advances `main` without moving the release tag.
6. Conflict assessment: green. `git worktree list` reports only the main checkout, no competing writer exists, and all reviewer lanes were read-only.
7. Verification: 144 focused tests; full `npm run validate` with 263 Vitest tests, 26 Python contracts, TypeScript, production build, and dist-boundary checks; Pages build; `npm audit` with zero vulnerabilities; GitHub CI/Pages; exact-SHA Vercel inspection; public fixed-path probes; ZIP expansion, exclusion scan, GitHub digest comparison, and fresh-download checksum verification all passed.
8. Remaining risk: no blocking gate is unverified. Future test-quality work may compare decoded pixels instead of compressed PNG bytes and pin immutable source revisions for provenance pages.
9. Recommended integration: keep the immutable tag and Release on the candidate; this records-only archive closeout is the sole post-tag commit, with no merge, rebase, cherry-pick, or worktree cleanup required.
10. Recovery references: candidate/tag `8033291f9fd1b462e209b0422fca8186a3cd8ecf`; Release ZIP SHA-256 `7f9644f867a7801242e4db1c6e098de121b7bb02b631642659b3e07a0864a2d3`; Vercel deployment `dpl_2xZrcZyBiWZwkNLP4A5EV2b5g8hw`.
