# KARDS Card Forge v1.3.0 Release Plan

## Goal

Audit the complete working-tree candidate, repair release blockers, and publish one exact-SHA `v1.3.0` GitHub Release for the bilingual sample library, local startup tooling, preview controls, HQ shield correction, and Help-page cleanup.

## Scope

- Review every tracked and untracked candidate file, including generated bilingual card images and sample JSON.
- Fix confirmed correctness, security, rights-boundary, export, or release-contract blockers without broad refactoring.
- Advance package metadata from `1.2.0` to `1.3.0` without changing dependencies.
- Preserve the code-only Release asset contract: exclude the public reference pack, brand/artwork resources, favicon, maintainer-only hosting metadata, and private runtime data.
- Verify focused tests, generated-asset drift checks, full validation, dependency audit, Pages-mode build, release archive boundaries, GitHub CI/Pages, tag, Release assets, and public fixed-path resources.
- Keep the existing local preview server reachable throughout the review unless a verified conflict requires a controlled restart.

## Sources of truth

- Current checkout and `origin/main` at `94e6b59a7479d6e965127a05ac4f3fb7deeab5e4` before release work.
- `git diff`, untracked-file inventory, and independent code/architecture review evidence.
- `package.json`, generated-asset check scripts, `npm run validate`, and `tools/verify_dist_private_boundary.mjs`.
- GitHub tag, Release, Actions, Pages, and downloaded asset checksums after publication.

## Stages

- [x] Stage 1: establish candidate scope, version, ownership, and independent review evidence.
- [x] Stage 2: repair all blocking findings and add focused regressions.
- [ ] Stage 3: run release-grade local verification and inspect the code-only archive.
- [ ] Stage 4: create the Lore candidate commit and push `main`.
- [ ] Stage 5: verify remote checks, tag `v1.3.0`, publish the Release, and re-download its assets.
- [ ] Stage 6: reconcile repository truth and archive this record.

## Acceptance criteria

- Independent code review returns no unresolved CRITICAL/HIGH findings and architecture returns no BLOCK.
- Exporting to a selected local directory requests write permission directly from the export click before asynchronous rendering.
- Bilingual generators report no drift and every catalog sample resolves to the selected UI language.
- `npm run validate`, `npm audit --audit-level=moderate`, Pages-mode build, and code-only archive scans pass.
- `main`, `origin/main`, annotated tag `v1.3.0`, and the GitHub Release resolve to one immutable candidate SHA.
- Attached ZIP checksum matches a fresh Release download and excluded resource paths are absent.

## Non-goals

- Do not modify README files.
- Do not redesign unrelated renderer architecture or add dependencies.
- Do not bundle private `.runtime` assets or publish a standalone reference pack.
- Do not rewrite remote history or force-push.

## Risks and constraints

- The candidate mixes source code, generated public assets, and historical task records, so generated-file drift and release-boundary checks are mandatory.
- GitHub automatic source archives still mirror tracked public resources; the attached code-only asset must retain explicit exclusions and disclosure.
- The local Vite server shares port `5173` and is owned by the primary agent; validation must not start a competing listener.
