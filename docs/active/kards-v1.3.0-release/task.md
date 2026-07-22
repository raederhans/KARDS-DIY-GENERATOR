# KARDS Card Forge v1.3.0 Release Task

## Current status

In progress. Initial independent review completed and every blocking finding has a narrow repair; full release validation and final clearance remain.

## Checklist

- [x] Confirm repository, branch, worktree, remote, authentication, tag, and Release baseline.
- [x] Record the `v1.3.0` scope, acceptance criteria, risks, and live-process ownership.
- [x] Complete independent code and architecture review lanes.
- [x] Repair blocking findings and add focused regression coverage.
- [x] Synchronize package metadata and write bilingual Release notes.
- [x] Run focused checks, generated-asset drift checks, full validation, Pages build, and dependency audit.
- [ ] Build, expand, checksum, and scan the code-only archive.
- [ ] Create and inspect the Lore candidate commit.
- [ ] Push `main` and verify GitHub CI/Pages against the candidate SHA.
- [ ] Create the annotated tag and GitHub Release, then re-download and verify attached assets.
- [ ] Archive this task and reconcile final Git/Release truth.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git worktree list --porcelain` | Passed: one `main` worktree |
| `gh auth status` | Passed: authenticated as `raederhans` |
| `gh release list --limit 10` | Passed: latest Release is `v1.2.0` |
| Local server HTTP probe | Passed before this release turn; final probe pending |
| `npm run samples:bilingual:check` | Passed: 69 localization files and sample/source/SHA-256 image identities |
| `npm run samples:hq:en:check` | Passed: 5 committed HQ PNGs exactly match the current renderer |
| Focused Vitest | Passed: 4 files, 79 tests |
| `npm run typecheck` | Passed after review fixes |
| Browser smoke | Passed: bilingual template refresh, explicit artwork provenance, 0 console errors/warnings |
| `npm run local -- --no-open --port 5174` | Passed: Node/version, HTML, transformed entry module, manifest, and ready URL; stopped after proof |
| `npm run validate` | Passed after trusted-source rebuild: 18 files / 276 Vitest tests, 26 Python contracts, typecheck, production build, strict dist boundary |
| Pages-mode `npm run build` | Passed with repository subpath; standard `dist` rebuilt and reverified afterward |
| `npm audit --audit-level=moderate` | Passed: 0 vulnerabilities |
| Untracked text/resource scan | Passed: 159 files inventoried, 85 text files scanned, 0 sensitive-path/token findings, 0 Playwright snapshots |
| Final code review | `APPROVE`: P0/P1/P2/P3 all zero after removing the image-manifest self-sign fallback |
| Final architecture review | `CLEAR`: no remaining BLOCK or WATCH after trusted-manifest bootstrap repair |

## Open risks and remaining work

- Code-only archive closure and exact-SHA remote gates remain pending.
- No candidate commit, remote checks, tag, or Release exists yet for `v1.3.0`.
