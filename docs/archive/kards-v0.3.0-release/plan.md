# KARDS v0.3.0 Release Plan

## Goal

Publish the completed local workbench feature as GitHub Release `v0.3.0` and update the linked Vercel project to the same verified `main` commit.

## Scope

- Bump package metadata from `0.2.0` to `0.3.0`.
- Preserve the existing React, TypeScript, Canvas, static hosting, authorized reference-pack, and publication boundaries.
- Produce a verified static-site archive and checksums for the GitHub Release.
- Deploy the exact release commit to Vercel Production and verify the stable alias.
- Do not modify README or introduce dependencies.

## Plan

- [x] Verify clean local/remote main, release history, GitHub authentication, Vercel project linkage, and production rollback baseline.
- [x] Update version metadata and release records.
- [x] Run `npm run validate`, Pages-mode build, dependency audit, and release-boundary checks.
- [x] Commit and push the v0.3.0 release candidate with Lore trailers.
- [x] Confirm GitHub CI/Pages results for the exact candidate commit.
- [x] Deploy and verify Vercel Production.
- [x] Create and push annotated tag `v0.3.0`.
- [x] Publish and verify GitHub Release assets and checksums.
- [x] Archive records and confirm main, origin, tag, Release, and Vercel are aligned.

## Live Process Ownership

- The main agent exclusively owns validation, builds, deployment, release creation, and live probes.
