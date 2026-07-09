# KARDS Authorized Assets Release Task

## Delivery Package

### Changed

- Published the exact runtime closure of the user-authorized reference pack under a versioned public path.
- Enabled reference samples and style assets in production on both Vercel and GitHub Pages paths.
- Added explicit public-pack export policy while preserving private-by-default URL pack behavior.
- Parallelized manifest image loading and strengthened the production artifact boundary.
- Prepared package version `0.2.0` for GitHub and Vercel release.

### Files

- Core files: `src/App.tsx`, `src/assetPack.ts`, `src/devPreviewCatalog.ts`, `src/i18n.ts`.
- Test files: `src/assetPack.test.ts`, `src/devPreviewCatalog.test.ts`, `src/i18n.test.ts`.
- Asset files: `public/reference-pack/v1/**` (236 files / 58,261,908 bytes).
- Docs/config files: `package.json`, `package-lock.json`, `tools/verify_dist_private_boundary.mjs`, this task record, registry, and lessons.
- Temporary files: none intended for tracking.

### Integration State

- Base: `main` / `fb0aba244411889811ab2a0449990fa436c046a3`.
- Current branch: `main`.
- Commit state: implementation commit `7c29db7bc7d01d84882ef83b1751779200a5fc37` is pushed to `origin/main` with Lore trailers.
- Main divergence: none at task start; local and remote `main` are aligned at the implementation commit before this closeout record update.
- Worktree conflicts: none; only the main checkout exists.

### Validation

- Targeted tests: 31/31 passed before final review; final focused tests: 26/26 passed.
- `npm run validate`: 15 files / 169 tests passed; typecheck, build, and strict dist/reference-pack verification passed.
- GitHub Pages-mode build passed and emitted `/KARDS/reference-pack/v1` paths.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Resource checks: 91 manifest images, 69 samples, 69 card references, and five HQ references; no missing files, links, local paths, reports, or private-only notices.

### Remaining Risks

- GitHub Pages and the protected Vercel Preview are remotely verified, including representative JSON and PNG resources.
- The GitHub v0.2.0 release and Vercel production promotion are still pending.

### Recommended Next Step

- Commit and push this evidence record, wait for exact-SHA CI/Pages, create and verify v0.2.0 artifacts, tag that final release commit, publish a draft GitHub release, promote the verified Vercel deployment, then publish the release and archive this task.
