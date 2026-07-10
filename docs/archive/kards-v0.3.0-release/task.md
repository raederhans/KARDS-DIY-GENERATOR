# KARDS v0.3.0 Release Task

- [x] Confirm clean main, release history, GitHub authentication, Vercel linkage, and rollback candidate.
- [x] Bump version metadata to 0.3.0.
- [x] Validate the release candidate locally.
- [x] Commit and push the exact candidate.
- [x] Confirm GitHub CI and Pages publication.
- [x] Deploy and verify Vercel Production.
- [x] Publish and verify GitHub Release v0.3.0.
- [x] Archive the task and close repository/deployment state.

## Delivery Package

1. Changed:
   - Advanced package metadata to 0.3.0 without dependency or runtime changes.
   - Published the already-integrated local workbench feature as one verified release candidate.
   - Deployed that candidate to Vercel Production and published GitHub Release v0.3.0.
2. Files:
   - Core metadata: `package.json`, `package-lock.json`.
   - Documentation: registry plus this release plan/context/task set.
   - Temporary ignored artifacts: `.runtime/releases/v0.3.0/**`.
3. Diff summary:
   - Candidate diff contains only the version bump and release records; product functionality came from the previously integrated `ff2693f` feature commit.
4. Commit state:
   - Candidate committed and pushed as `fc68bcf9407b7d63f10457136fe82f53499270cb`; annotated tag `v0.3.0` points to it.
5. Base/main divergence:
   - Candidate was based on clean, aligned commit `5945e7405832b30f6eca0c7915b94ac5f56ad56c`; a docs-only archive commit will advance `main` after the tag.
6. Conflict review:
   - Only the main worktree exists, so file-overlap risk is green. External publication risk was yellow and is closed by exact-SHA checks and rollback preservation.
7. Verification:
   - Local: 233 Vitest tests, 13 Python tests, typecheck, standard and Pages builds, strict dist/reference-pack verification, zero npm audit findings.
   - Remote: CI `29068193670` and Pages `29068193647` passed for the candidate SHA; Pages app/resource probes returned HTTP 200.
   - Vercel: preview `dpl_EWq5zFJotzjHjP1NBiiMpopDZFCu`; Production `dpl_CBs8J1u2Gk9Jo4iJXTLpvAxffN6L`; stable app/resource probes passed; post-deploy runtime error scan was empty.
   - Release: uploaded and re-downloaded three assets; GitHub digests and downloaded hashes matched.
8. Remaining risk:
   - No release-specific browser visual smoke was added; the unchanged runtime candidate already passed its feature smoke before integration, while this pass used automated builds, resource probes, and exact asset fingerprint comparison.
9. Recommendation:
   - Keep `v0.3.0` fixed on `fc68bcf`; use `dpl_2LzMkgqa1uZ2aQhCZszu4tsf4U7k` only as the known previous-production rollback candidate if needed.
10. Integration state:
   - Safe to archive. GitHub Release and Vercel Production are published; only the docs-only archive commit and final main/origin synchronization remain.

## Published Assets

- `kards-card-forge-v0.3.0-dist.zip` — `53EF13715224EA904855B70DD1357791E9266293A6086EB05FAD5AA3B4D672C6`
- `kards-authorized-reference-pack-v0.3.0.zip` — `A586A029D19438710B09D1D7757543DC55B9CE5C7F139FEAF58BA6FAB22AE131`
- `SHA256SUMS.txt` — `81AA2F7A4741CC8DBC412CC1B1784AA7D7202DE8985D6B31B4BEB2AD305F20C4`
