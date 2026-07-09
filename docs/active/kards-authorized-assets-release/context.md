# KARDS Authorized Assets Release Context

## 2026-07-09 Baseline

- Task class: `integration` with complex product and distribution impact.
- Checkout: `C:\Users\raede\Documents\KARDS`.
- Only one worktree exists; branch `main` and `origin/main` both point to `fb0aba244411889811ab2a0449990fa436c046a3`.
- GitHub remote: `https://github.com/raederhans/KARDS.git`; authenticated `gh` session is available.
- Existing GitHub release: `v0.1.0`.
- Vercel project link: `kards-card-forge`, project `prj_r7seUm18SrJauC6amLVTbdyqdRdi`, team `team_eIlnAkWWtnVBIHiS71WHP099`.
- Global Vercel CLI is absent; the prior verified workflow uses `npx vercel`.

## Asset Selection Evidence

- Stage 6 clean extraction contains 418 files / 78,664,711 bytes, but most are reports, source snapshots, and intermediate references not consumed by the app.
- `kards-asset-pack.json` references 91 unique images totaling 316,534 bytes; all exist and none are links.
- The reference catalog consumes 69 card sample JSON files, 69 full-card reference PNGs, and five HQ reference PNGs.
- The selected product-consumed set is approximately 58.3 MB before final deduplication/copy checks.
- Stage 5 full extraction (about 244.7 MB) and Stage 3 packs are excluded because they duplicate or exceed the product-consumed surface.
- The source manifest contains an old private-only notice. The public copy must replace it with a narrow notice reflecting the user's separate authorization while preserving third-party ownership.

## Current Architecture

- `src/App.tsx` dynamically imports `src/devPreviewCatalog.ts` only when `import.meta.env.DEV` is true.
- The catalog points at ignored `.runtime` paths, so production cannot load templates, references, or the asset pack.
- `loadAssetPackFromUrl` already supports a bundled URL and marks URL-loaded packs as requiring export confirmation.
- GitHub Pages builds use `/KARDS/` while Vercel uses `/`; production paths must use `import.meta.env.BASE_URL`.
- `.vercelignore` excludes `.runtime`, so the publishable resource pack must live under tracked `public/` rather than bypassing existing safety boundaries.

## Risk Classification

- Worktree overlap: green; no second worktree exists.
- Semantic risk: yellow; production startup, template loading, Pages base paths, and export confirmation behavior are affected.
- Distribution risk: yellow; the user explicitly states legal authorization, but the repository should ship a rights notice and exclude source/extraction internals.

## Implementation and Local Verification

- Added `public/reference-pack/v1` as a versioned, tracked production surface: 236 files / 58,261,908 bytes.
- The pack contains 91 renderer PNGs, 69 sample card JSON files, 69 card reference PNGs, five HQ reference PNGs, the public manifest, and a rights notice.
- Kept `.runtime` ignored and excluded all source snapshots, extraction reports, calibration artifacts, unreferenced candidates, and local machine paths.
- Updated catalog URLs to use `import.meta.env.BASE_URL`, enabling `/reference-pack/v1` on Vercel and `/KARDS/reference-pack/v1` on GitHub Pages.
- Enabled the reference catalog in production and retained dynamic import so the catalog remains a separate chunk.
- Added manifest-controlled `requiresPrivateExportConfirm`; URL packs default to `true`, while the authorized bundled pack explicitly sets `false`.
- Changed URL image loading from 91 serial waits to ordered parallel loading; request-ID guards still prevent stale pack state writes.
- Strengthened `verify:dist-private-boundary` into an exact closed-world gate for the authorized pack and a continued private/intermediate/sensitive-data denylist.
- Bumped package metadata from `0.1.0` to `0.2.0`.

## Verification Evidence

- Targeted tests: 31/31 passed before review; final targeted catalog/asset/i18n tests: 26/26 passed.
- Final `npm run validate`: 15 files / 169 tests passed, TypeScript passed, production build passed, authorized-pack boundary passed.
- GitHub Pages build with `KARDS_GITHUB_PAGES=true`: passed; generated catalog chunk contains `/KARDS/reference-pack/v1`.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `git diff --check`: passed with Windows line-ending warnings only.
- Three independent static reviews checked architecture, resource closure/security, and release ordering. Their verified findings were fixed before commit.

## Remote Candidate Evidence

- Implementation commit `7c29db7bc7d01d84882ef83b1751779200a5fc37` is pushed to `origin/main` with Lore trailers.
- GitHub Actions CI run `29054877965` passed for that exact commit.
- GitHub Pages run `29054877886` built and deployed successfully for that exact commit.
- Live Pages probes returned HTTP 200 for the app, manifest, one sample JSON, one card reference PNG, and one HQ reference PNG; the manifest reports version 1, 91 images, and `requiresPrivateExportConfirm: false`.
- Pinned Vercel CLI `55.0.0` produced Preview deployment `dpl_9k58tWBU1oZSFirB9spSxTL83SqF`, status Ready.
- The Preview is deployment-protected. Authenticated `vercel curl` probes returned HTTP 200 with correct content types for the app, manifest, `t70.card.json`, `dingo.png`, and `Washington.png`.
- The verified Preview manifest is 15,158 bytes and reports version 1, 91 images, and `requiresPrivateExportConfirm: false`.
