# KARDS GitHub and Vercel Release Context

## 2026-07-04 Start

- Task class: `complex/integration`, because it includes public release, external deployment, possible code polish, and cross-service verification.
- GitHub remote: `origin https://github.com/raederhans/KARDS.git`.
- GitHub repo: `raederhans/KARDS`, private, default branch `main`.
- Current branch: `main`.
- Base commit: `0e00503f6c63668c93880d32688239ba279b06e9`.
- `origin/main`: `0e00503f6c63668c93880d32688239ba279b06e9`.
- `git worktree list --porcelain`: only `C:/Users/raede/Documents/KARDS`; no parallel KARDS worktree found.
- GitHub releases: no existing release found.
- Vercel team: `team_eIlnAkWWtnVBIHiS71WHP099` (`qiushiyu2003-2073s-projects`).
- Vercel projects before deployment: only `scenario-forge`; no KARDS project link file exists locally.
- Initial UI copy audit found public labels that read like developer/calibration wording: `Manifest`, `Compare PNG`, `MAE`, `RMSE`, and generic `Card Forge` branding.

## Public Copy Polish

- Updated browser title, metadata, and app heading to `KARDS Card Forge`.
- Changed public project-panel wording from developer/calibration labels toward user-facing terms:
  - `Load Assets` -> `Load Style Pack`
  - `Compare PNG` -> `Compare Reference`
  - `Manifest` -> `Style pack file`
  - `MAE` -> `Avg diff`
  - `RMSE` -> `Overall diff`
- Kept the local-pack privacy warning and non-affiliation disclaimer.

## Validation So Far

- `npm test -- --run src/i18n.test.ts`: passed, 1 file and 5 tests.
- `npm run typecheck`: passed.
- `npm test -- --run`: passed, 11 files and 84 tests.
- `npm run build`: passed, including typecheck and Vite production build.
- Production bundle scan: `rg -n "\.runtime|kards-private-assets|stage5|stage6|devPreview|privatePack" dist` returned no matches.
- `git diff --check`: passed with existing Windows LF-to-CRLF warnings only.
- GitHub connector secret scan attempt: blocked by repository GitHub Advanced Security availability; no GHAS result was produced.

## Vercel Project Creation

- `npx vercel whoami`: authenticated as `qiushiyu2003-2073`.
- `npx vercel link --yes --project kards-card-forge --scope qiushiyu2003-2073s-projects`: created Vercel project `qiushiyu2003-2073s-projects/kards-card-forge`.
- Project ID written locally by Vercel CLI: `prj_r7seUm18SrJauC6amLVTbdyqdRdi`.
- GitHub repository auto-link failed because the Vercel account does not have a GitHub Login Connection enabled. This blocks Git-push-triggered Vercel deployments, but does not block CLI production deployment.
- First CLI production deployment succeeded:
  - Deployment ID: `dpl_CHkAZRDiYXkW9eqaXrBbJ24kFVu6`
  - Production URL: `https://kards-card-forge-bbw5m2g9m-qiushiyu2003-2073s-projects.vercel.app`
  - Stable alias: `https://kards-card-forge.vercel.app`
  - HTTP probe for stable alias returned `200`.
- First deploy uploaded about `728.4MB`, which is too large for this static app. Root cause: no `.vercelignore` existed before first CLI deploy, so local non-deploy inputs were included in upload scanning.
- Added `.vercelignore` to exclude `node_modules`, `dist`, `.runtime`, docs, tools, coverage, local logs, Python caches, and source test files from future Vercel CLI uploads.

## Final Deployment and Release

- Final deploy command: `npx vercel deploy --prod --yes --scope qiushiyu2003-2073s-projects`.
- Final deploy after `.vercelignore`: uploaded `122B`, downloaded `65` deployment files, restored build cache, ran `npm run build`, and reached `READY`.
- Final deployment ID: `dpl_3E8LRgypgPGvg9rRUwqcNk7LQtJs`.
- Stable production alias: `https://kards-card-forge.vercel.app`.
- Authenticated Vercel connector read confirmed deployment state `READY`, framework `vite`, target `production`, and source `cli`.
- Remote browser smoke on the stable alias passed:
  - Page title: `KARDS Card Forge 卡牌工坊`
  - Canvas: `500x702`, nonblank
  - PNG export: `自定义坦克.png`, nonzero bytes
- GitHub release: `v0.1.0`.
- GitHub release URL: `https://github.com/raederhans/KARDS/releases/tag/v0.1.0`.
- Release asset: `kards-card-forge-v0.1.0-dist.zip`, size `218393`, SHA256 digest reported by GitHub as `2658f4eb6d2915631842b541b3c08d2d24913cef56df42776d0dd2fa79d85ee1`.
- GitHub release anonymous access returns `404` because the repo is private. This is expected for a private repository, not a failed release.
- Independent read-only reviewers found no blocking issues. Accepted follow-up fixes:
  - Add `.env*` to `.vercelignore`.
  - Close out this active task documentation and archive it.

## Live Process Ownership

- No long-running live process is active at task start.
- Main agent owns all build/test/deploy commands for this release.
- No child agent may start or monitor the same build, test, browser smoke, or Vercel deploy process concurrently.
