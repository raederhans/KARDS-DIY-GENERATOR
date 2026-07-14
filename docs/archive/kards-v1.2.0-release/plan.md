# KARDS Card Forge v1.2.0 Release Plan

## Goal

Audit the complete `v1.1.0..HEAD` candidate and publish one exact-SHA `v1.2.0` GitHub Release for the new Republic of China and Chinese Communist faction support.

## Scope

- Review every commit and changed file in `v1.1.0..HEAD`, including the 14 nation-mark PNGs and their license closure.
- Preserve the existing data-driven nation preset, asset selector, renderer, and no-HQ-mark contracts.
- Advance package metadata from `1.1.0` to `1.2.0` without changing dependencies.
- Publish only a code-only archive and SHA-256 checksum; continue excluding `public/reference-pack/v1/**`, `public/brand/**`, `public/artwork/**`, `public/favicon.svg`, and maintainer-only hosting metadata.
- Verify local validation, dependency audit, GitHub CI/Pages, Vercel exact-SHA status, tag, Release assets, and public fixed-path resources.
- Do not modify README files.

## Plan

- [x] Establish the clean worktree, remote, tag, and release baseline.
- [x] Complete independent code and architecture reviews of `v1.1.0..HEAD`.
- [x] Fix only verified release blockers and re-review the final diff.
- [x] Bump package metadata and prepare bilingual release notes.
- [x] Run focused tests, full validation, Pages-mode build, dependency audit, and archive-boundary checks.
- [x] Commit and push one immutable release candidate with Lore trailers.
- [x] Verify GitHub CI, Pages, and Vercel against the exact candidate SHA.
- [x] Build, expand, checksum, and inspect the code-only archive.
- [x] Create annotated tag `v1.2.0`, publish the GitHub Release, and re-download its assets.
- [x] Verify public resources, archive the release records, and confirm local/remote/tag/Release alignment.

## Live Process Ownership

- The primary agent exclusively owns validation, build, server, archive, deployment, tag, and Release processes.
- Independent reviewers are read-only and must not start or monitor the same live processes.
