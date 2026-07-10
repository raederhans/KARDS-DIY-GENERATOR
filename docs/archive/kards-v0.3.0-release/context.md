# KARDS v0.3.0 Release Context

## 2026-07-09 Baseline

- Task class: integration with external production publication.
- Checkout: `C:\Users\raede\Documents\KARDS`; only main worktree exists.
- Base: `main` and `origin/main` at `5945e7405832b30f6eca0c7915b94ac5f56ad56c`, divergence `0/0`, clean worktree.
- Existing latest release: `v0.2.0`, tag commit `6ae5b6fa03ab60b312a524df3c45e0d03f9f4af6`.
- New feature commits since v0.2.0 include verified defect repair plus local workbench implementation and archive closeout.
- Version choice: `v0.3.0`, because this release adds backwards-compatible user-facing capabilities rather than a breaking contract.
- GitHub CLI authentication is active with repository and workflow access.
- Vercel project: `kards-card-forge`, project `prj_r7seUm18SrJauC6amLVTbdyqdRdi`, team `team_eIlnAkWWtnVBIHiS71WHP099`.
- Vercel rollback baseline: Production deployment `dpl_2LzMkgqa1uZ2aQhCZszu4tsf4U7k`, Ready, sourced from v0.2.0 commit `6ae5b6fa`.
- Global Vercel CLI is absent. A first check with an older temporary CLI incorrectly appeared unauthenticated; the previously verified pinned `npx vercel@55.0.0` session is authenticated and was reused without writing tokens or dependencies.

## Local Release Verification

- Package metadata is `0.3.0` in both `package.json` and `package-lock.json`; no dependency versions changed.
- The first full validation run reached 232/233 tests and only exceeded the existing 5-second timeout while reading catalog metadata; the isolated catalog suite immediately passed 15/15, including the affected assertion in 741 ms. No production or test-timeout code was changed.
- A fresh full `npm run validate` then passed 16 Vitest files / 233 tests, 13 Python contract tests, TypeScript checking, the standard Vite build, and the strict distribution/reference-pack verifier.
- A separate `KARDS_GITHUB_PAGES=true npm run build:verified` passed and confirmed the Pages base-path output and the same publication boundary.
- `npm audit --audit-level=moderate --json` reported zero vulnerabilities at all severities across 157 dependencies.
- A final standard-root `npm run build:verified` passed after the Pages-mode build, leaving `dist/` in the intended release/Vercel layout.

## Remote Publication

- Release candidate commit: `fc68bcf9407b7d63f10457136fe82f53499270cb` on `main`.
- GitHub CI run `29068193670` and Deploy GitHub Pages run `29068193647` both completed successfully with that exact `headSha`; the published Pages app shell, manifest, sample, and reference PNG also returned HTTP 200.
- Vercel preview `dpl_EWq5zFJotzjHjP1NBiiMpopDZFCu` was built from the candidate and verified before promotion.
- Vercel Production `dpl_CBs8J1u2Gk9Jo4iJXTLpvAxffN6L` is Ready at `https://kards-card-forge.vercel.app`, reports the exact candidate SHA, and was promoted from the verified preview.
- Stable Vercel probes returned HTTP 200 for the app shell, manifest, sample card, normal reference PNG, and HQ PNG. Remote JS/CSS asset names matched the final local `dist/index.html`, both PNG signatures were valid, and no runtime errors were reported in the post-deploy window.
- Annotated tag `v0.3.0` resolves to the candidate commit.
- GitHub Release: `https://github.com/raederhans/KARDS/releases/tag/v0.3.0`; it is published, not a draft or prerelease.
- Release artifacts were expanded and checked before upload, downloaded again after publication, and matched their local SHA-256 values.
