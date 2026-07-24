# KARDS Card Forge v1.5.0 Release Task

## Current status

Complete. v1.5.0 is published from the exact reviewed candidate and deployed
to Vercel Production. Local validation, GitHub CI/Pages, tag, Release assets,
deployment status, stable alias, and an initial root HTTP 200 passed. A later
hashed-JS reread was blocked by this machine's Vercel network route and remains
an explicit non-blocking verification gap.

## Checklist

- [x] Confirm worktree, remote, latest Release, package version, GitHub auth,
  Vercel project binding, and prior exact-SHA release rules.
- [x] Update package/lockfile metadata, roadmap, bilingual Release notes, and
  durable task records for v1.5.0.
- [x] Run full validation, dependency audit, Pages build, standard restore, and
  code-only archive boundary checks.
- [x] Create and inspect the Lore candidate commit and push `main`.
- [x] Verify candidate GitHub CI and Pages runs.
- [x] Tag and publish v1.5.0 with verified code-only ZIP and checksum assets.
- [x] Deploy the exact candidate to Vercel Production, verify Ready/stable-root
  status, and record the later local-network asset-probe gap.
- [x] Archive this task record and reconcile the worktree registry.

## Evidence

| Check | Result |
| --- | --- |
| `git worktree list --porcelain` | One worktree at the repository root |
| `git fetch --prune origin` | Passed on 2026-07-24 |
| Pre-release branch state | Local `main` at `db79844f017cc2f58065187411402a8d70477ea0`, one commit ahead of `origin/main` |
| Latest GitHub Release | `v1.4.0`, published 2026-07-22 |
| `gh auth status` | Authenticated as `raederhans`; repository/workflow scopes available |
| Package metadata before edits | `1.4.0` in package and both lockfile root fields |
| Version decision | `v1.5.0`, a backward-compatible user-visible capability release |
| Vercel project link | `kards-card-forge`, project `prj_r7seUm18SrJauC6amLVTbdyqdRdi` |
| Vercel CLI path | Global CLI absent; reuse previously verified pinned `npx vercel@55.0.0` |
| `npx --yes vercel@55.0.0 whoami` | Authenticated as `qiushiyu2003-2073` |
| `npm run validate` | Passed: 24 Vitest files / 316 tests, 26 private-tool contracts, TypeScript, production build, and dist boundary |
| `npm audit --audit-level=moderate` | Passed: 0 vulnerabilities |
| Pages-mode build | Passed with `/KARDS-DIY-GENERATOR/` asset and favicon paths |
| Standard build restoration | Passed with root-relative assets; dist boundary reverified |
| Candidate commit | `85e455b014a6e9756f8c743bb0d37fdaa857b137`; pushed and aligned with `origin/main` before publication |
| GitHub CI / Pages | Runs `30072029362` and `30072029376` succeeded on the candidate |
| Live GitHub Pages | Root and hashed JS returned HTTP 200; all three text-fit diagnostic markers were present |
| Annotated tag | Local and remote `v1.5.0` dereference to the candidate |
| GitHub Release | Public, latest, not draft/prerelease; 2 assets at `https://github.com/raederhans/KARDS-DIY-GENERATOR/releases/tag/v1.5.0` |
| Code-only archive | 93 files; 0 missing required files, 0 forbidden paths, 0 sensitive matches |
| Fresh asset verification | ZIP, `SHA256SUMS.txt`, and GitHub asset digest all equal `e07b5f4a2ee430e68c14bc496705b342333f2df0acf24c988f88119fb67f7963` |
| Vercel Production | Deployment `dpl_CXFDPNQ6H2WCxYYXyw8TNhwwciSL`, target production, Ready, aliased to `https://kards-card-forge.vercel.app/` |
| Vercel public probe | Stable root returned HTTP 200 and exposed `index-CFOkba_w.js`; later asset retrieval hit local EOF/timeouts, so marker revalidation is not claimed |

## Open risks

- Cross-OS text metrics are not claimed to be pixel-identical.
- Native `Intl.Segmenter` remains the browser baseline for grapheme-safe
  truncation; no partial fallback or new dependency is added.
- Manual offsets remain explicit authored geometry. A future safe-region
  warning would be a separate contract, not part of this release.
- A fresh anonymous Vercel hashed-JS fetch remains useful from another network
  route; this machine repeatedly could not reach `*.vercel.app:443` after the
  successful deployment and initial root response.
