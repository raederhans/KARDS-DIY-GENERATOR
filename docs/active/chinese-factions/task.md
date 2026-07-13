# Chinese factions task tracker

- [x] Classify as complex and assign live-process ownership.
- [x] Read project lessons and relevant frontend/image-generation skills.
- [x] Check repository/worktree truth and create the task branch.
- [x] Start three independent static discovery reviews.
- [x] Finish repository data-flow and visual-asset audit.
- [x] Research reusable historical emblem sources and verify their public-domain status.
- [x] Add failing contract tests in existing suites.
- [x] Implement faction presets and labels while preserving the renderer's existing HQ mark skip.
- [x] Add deterministic unit-kind nation marks and manifest entries.
- [x] Run focused validation and visual inspection.
- [x] Run three independent final reviews and fix verified findings.
- [x] Run full `npm run validate`.
- [x] Prepare delivery package and update the registry; archive after integration truth is recorded.
- [ ] Commit with Lore protocol, integrate to `main`, push, and clean branch state.

## Ready-for-integration delivery package

1. What changed
   - Added selectable Republic of China (`roc`) and Chinese Communist Forces (`ccp`) presets and Chinese labels.
   - Added muted blue-grey and earth red-brown card palettes.
   - Added 14 exact non-HQ nation marks, with distinct ground, air, CCP artillery, order, and countermeasure treatments.
   - Registered every mark in the public pack and documented source provenance plus transformation limits.
   - Extended existing model, UI, renderer, asset-pack, and distribution tests; no new runtime abstraction or dependency was added.
2. Files
   - Core: `src/presets.ts`, `src/i18n.ts`, `public/reference-pack/v1/kards-asset-pack.json`, 14 PNGs under `public/reference-pack/v1/images/nation-mark/`, and the two existing rights notices.
   - Tests: `src/cardModel.test.ts`, `src/i18n.test.ts`, `src/components/FieldPanel.test.ts`, `src/assetPack.test.ts`, `src/canvas/cardRenderer.test.ts`, `tools/verify_dist_private_boundary.test.mjs`.
   - Docs: this task folder, `docs/active/_worktree_registry.md`, and `lessons learned.md`.
   - Temporary: ignored `.runtime/chinese-factions/` source layers, generator, logs, contact sheet, and browser previews; only review outputs remain until final handoff.
3. Diff summary: preset/i18n data, public asset-pack closure, rights provenance, 14 small RGBA PNGs, focused regression coverage, and task records. No renderer, schema, App state, build configuration, or dependency changes.
4. Commit status: not committed yet; the implementation and validation evidence are complete and this package is being recorded immediately before the Lore commit.
5. Base/main divergence: none. Base, local `main`, and fetched `origin/main` are all `84918a9fe09161b01372f8b4bb1e23f280429ab6`.
6. Conflict analysis: one worktree only. File-overlap risk is green; semantic hotspot risk is yellow only for the public manifest and renderer test harness, with no competing writer.
7. Verification: focused 6-file suite passed 144 tests; asset audit confirmed 14 images at 54×54 8-bit RGBA with binary alpha; representative browser renders were inspected; full `npm run validate` passed 263 Vitest tests, 26 private-tool tests, typecheck, build, and dist verification.
8. Remaining risks: no exhaustive perceptual sweep of all 14 marks on every card template; official-insignia or trademark restrictions can vary by jurisdiction independently of public-domain copyright status.
9. Recommendation: commit on `codex/chinese-factions`, fast-forward `main`, run the focused post-merge gate, push `main`, record the integrated commit, then delete the task branch.
10. Integration readiness: ready for integration; no blocker remains.
