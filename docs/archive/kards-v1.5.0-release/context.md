# KARDS Card Forge v1.5.0 Release Context

## Current truth

- Task class: complex external publication.
- Sole worktree: repository root on `main`; pre-release HEAD is
  `db79844f017cc2f58065187411402a8d70477ea0`, one commit ahead of refreshed
  `origin/main` before release-specific edits.
- Latest published Release is `v1.4.0`; its annotated candidate is
  `caa2d5e6e57cf818128b1e6c56d912455cee4bde`.
- GitHub CLI is authenticated as `raederhans` with `repo` and `workflow`
  scopes.
- Vercel project `kards-card-forge` is linked locally as
  `prj_r7seUm18SrJauC6amLVTbdyqdRdi` under the recorded team. Global Vercel CLI
  is absent; the repository's last verified authenticated path is pinned
  `npx vercel@55.0.0`, and `whoami` succeeded as `qiushiyu2003-2073`.
- Version decision: `v1.5.0`, because the candidate adds backward-compatible
  user-visible adaptive text fitting and export diagnostics after `v1.4.0`.
- Published candidate, annotated tag, and Release all resolve to
  `85e455b014a6e9756f8c743bb0d37fdaa857b137`.
- GitHub Release: <https://github.com/raederhans/KARDS-DIY-GENERATOR/releases/tag/v1.5.0>.
- Vercel Production deployment `dpl_CXFDPNQ6H2WCxYYXyw8TNhwwciSL` is Ready and
  aliased to <https://kards-card-forge.vercel.app/>.

## Decisions

| Date | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-24 | User explicitly requested an updated Release and Vercel deployment. | GitHub tag/Release publication and Vercel Production deployment are authorized; force-push and credential changes remain out of scope. |
| 2026-07-24 | The feature uses the shared renderer and keeps automatic layout outside serialized authored state. | Release notes distinguish requested manual appearance from derived resolved layout. |
| 2026-07-24 | Prior releases require one immutable candidate across CI, Pages, tag, assets, and Vercel. | Freeze records before the Lore candidate; put deployment IDs and checksums in ignored runtime evidence and the final report. |
| 2026-07-24 | No new dependency or public card image entered the candidate. | Reuse the existing code-only archive exclusions and rights boundary unchanged. |
| 2026-07-24 | Candidate CI `30072029362` and Pages `30072029376` both succeeded; live Pages root and hashed JS returned 200 with all three text-fit markers. | Tag and Release publication were allowed only after these exact-SHA gates passed. |
| 2026-07-24 | Fresh Release download contained 93 files and matched the local checksum plus GitHub digest `e07b5f4a2ee430e68c14bc496705b342333f2df0acf24c988f88119fb67f7963`; forbidden paths were absent. | Release asset verification is complete. |
| 2026-07-24 | Vercel deployment completed at Ready and the stable root returned 200 once, but this machine later could not connect to `*.vercel.app:443` to reread the hashed JS. | Record the public-asset probe as a network verification gap; do not redeploy a successful unchanged artifact or claim a second asset fetch. |

## Live process ownership

| Process | Owner | Command/shared resource | Stable evidence | State |
| --- | --- | --- | --- | --- |
| Release validation | Primary agent | `npm run validate`; `dist/`, Vite/npm caches | `.runtime/releases/v1.5.0/validate.log` | Passed: 24 files / 316 tests, 26 private contracts, typecheck, build, boundary check |
| Dependency audit | Primary agent | `npm audit --audit-level=moderate` | `.runtime/releases/v1.5.0/npm-audit.log` | Passed: 0 vulnerabilities |
| Pages and standard builds | Primary agent | Pages environment followed by standard `npm run build`; shared `dist/` | `.runtime/releases/v1.5.0/pages-build.log`, `standard-build-restore.log` | Passed serially; Pages subpath and root-relative paths verified, standard `dist/` restored |
| GitHub workflows | Primary agent | candidate CI and Pages runs | `.runtime/releases/v1.5.0/github-runs.log` | Passed: CI `30072029362`, Pages `30072029376` |
| Vercel Production | Primary agent | `npx --yes vercel@55.0.0 deploy --prod --yes`; linked project and production alias | `.runtime/releases/v1.5.0/vercel-prod.log` | Passed: deployment `dpl_CXFDPNQ6H2WCxYYXyw8TNhwwciSL`, target production, Ready, stable alias assigned |

Success requires exit code 0, exact candidate identity where the provider
exposes it, and public HTTP 200 with a live JavaScript asset containing v1.5
text-fit markers. Failure is any nonzero exit, candidate mismatch, boundary
failure, protection page at the production alias, or unexpected browser/build
error. The primary agent alone starts, polls, retries, and stops these
processes; identical failures are not retried more than three times.

## Handoff

Publication is complete. Preserve tag and Release on
`85e455b014a6e9756f8c743bb0d37fdaa857b137`; this archive move and registry
reconciliation are records-only. The optional remaining check is a fresh
anonymous Vercel hashed-JS probe from a network route that can reach
`*.vercel.app:443`.
