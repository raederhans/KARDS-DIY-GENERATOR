# KARDS GitHub and Vercel Release Task

## Delivery Package Draft

### Changed

- Branded the public app and metadata as `KARDS Card Forge`.
- Reworded public controls so local asset packs and reference comparison read as user features instead of calibration tooling.
- Localized difference metric labels instead of showing raw `MAE`/`RMSE`.
- Added Vercel upload exclusions and ignored local Vercel/env files.
- Preserved the non-official fan-tool disclaimer and local-pack privacy warning.
- Added release/deploy task records for GitHub and Vercel closeout.

### Files

- Core files: `index.html`, `src/App.tsx`, `src/components/ProjectPanel.tsx`, `src/i18n.ts`.
- Test files: `src/i18n.test.ts`.
- Config files: `.gitignore`, `.vercelignore`.
- Docs files: `docs/active/kards-github-vercel-release/plan.md`, `docs/active/kards-github-vercel-release/context.md`, `docs/active/kards-github-vercel-release/task.md`, `docs/active/_worktree_registry.md`.
- Temporary files: none tracked.

### Diff Summary

- Narrow public-copy diff only; no renderer, schema, storage, asset-loading, or export behavior changed.
- Production `dist` regenerated locally for validation but remains untracked.
- Vercel CLI created local `.vercel/` and `.env.local`; both are ignored and intentionally untracked.

### Commit State

- Release polish committed and pushed to `origin/main` as `c476392c9b0ea1a972983bddf7b9762b1e149a07`.
- This closeout commit records final deployment/release evidence and tightens `.vercelignore`.

### Base Divergence

- Base commit `0e00503f6c63668c93880d32688239ba279b06e9`; current `origin/main` matched at task start.

### Conflict Risk

- Green: only main checkout exists; changed files do not overlap another live worktree.

### Validation

- `npm test -- --run src/i18n.test.ts`: passed, 1 file and 5 tests.
- `npm run typecheck`: passed.
- `npm test -- --run`: passed, 11 files and 84 tests.
- `npm run build`: passed, including typecheck and Vite production build.
- `rg -n "\.runtime|kards-private-assets|stage5|stage6|devPreview|privatePack" dist`: no production-bundle matches.
- `git diff --check`: passed with LF-to-CRLF warnings only.
- GitHub connector secret scanning attempt: repository lacks GitHub Advanced Security, so no GHAS scan result was available.
- `npx vercel link --yes --project kards-card-forge --scope qiushiyu2003-2073s-projects`: created the Vercel project.
- First `npx vercel deploy --prod --yes --scope qiushiyu2003-2073s-projects`: passed and aliased `https://kards-card-forge.vercel.app`.
- `Invoke-WebRequest -UseBasicParsing https://kards-card-forge.vercel.app`: returned HTTP `200`.
- Final `npx vercel deploy --prod --yes --scope qiushiyu2003-2073s-projects`: passed after `.vercelignore`, with small uploads and stable alias `https://kards-card-forge.vercel.app`.
- Vercel connector `_get_deployment`: confirmed latest checked deployment `READY`, project `kards-card-forge`, framework `vite`, target `production`.
- Remote browser smoke: passed title, nonblank `500x702` Canvas, and PNG export.
- `gh release create v0.1.0`: passed.
- `gh release view v0.1.0`: confirmed release is not draft/prerelease and includes `kards-card-forge-v0.1.0-dist.zip`.
- `git ls-remote --tags origin v0.1.0`: confirmed tag points to `c476392c9b0ea1a972983bddf7b9762b1e149a07`.

### Remaining Risks

- Repository remains private; release URL is available to authenticated users with repo access, not anonymous public visitors.
- Vercel GitHub auto-link is not active because the Vercel account needs a GitHub Login Connection.

### Recommended Next Step

- Complete. Optional next step: enable the Vercel GitHub Login Connection if future `git push` events should auto-deploy.
