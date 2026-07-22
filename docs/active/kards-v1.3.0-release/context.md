# KARDS Card Forge v1.3.0 Release Context

## Current truth

- Task class: complex external publication.
- Sole worktree: repository root, branch `main`, baseline `94e6b59a7479d6e965127a05ac4f3fb7deeab5e4`, aligned with `origin/main` before release edits.
- Latest published Release: `v1.2.0`, tag candidate `8033291f9fd1b462e209b0422fca8186a3cd8ecf`.
- Version decision: `v1.3.0` because the candidate adds backward-compatible user-visible features and a large bilingual public sample/resource set.
- Candidate currently contains 25 modified tracked files and 159 untracked source/resource/record files after temporary browser snapshots were removed.
- No dependency changes are intended.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-22 | User requested audit, push, and a new Release. | External publication is authorized; force-push and history rewriting remain out of scope. |
| 2026-07-22 | Only one worktree exists and `main` equals `origin/main`. | No worktree integration workflow is required. |
| 2026-07-22 | Prior diagnosis found directory export permission is requested after asynchronous rendering. | Treat permission ordering as a release blocker and require a regression test. |
| 2026-07-22 | The previous Release established a code-only ZIP plus checksum contract. | Reuse that boundary and verify it against the new immutable candidate. |
| 2026-07-22 | Independent review found template-language provenance, generated-image identity, export permission ordering, startup readiness, and temporary snapshot gaps. | All five findings were repaired with focused regressions or live smoke evidence before full validation. |
| 2026-07-22 | Browser smoke loaded a Chinese template, refreshed it to English, then applied another sample's artwork and switched back to Chinese. | The untouched template localized correctly; the explicit artwork action cleared template ownership and prevented content overwrite. Console: 0 errors, 0 warnings. |
| 2026-07-22 | Final code review rejected the first-image hash bootstrap because a missing manifest could self-sign existing AVIF files. | Removed the fallback, added a missing-manifest regression, deleted the manifest, and re-downloaded all 69 images from the configured official source before regenerating hashes. Final code review: `APPROVE`. |
| 2026-07-22 | Final architecture review inspected the repaired trust bootstrap and current 69-entry manifest. | `CLEAR`; no remaining BLOCK or WATCH. |

## Live process ownership

| Process | Owner | Command / resources | Log path | State |
| --- | --- | --- | --- | --- |
| Local preview | Primary agent | `npm run local -- --no-open`; port `5173` | `.runtime/local-ui.log` | Running; must remain reachable |
| Release validation | Primary agent | `npm run validate`; shared `dist/`, npm/Vite caches | `.runtime/releases/v1.3.0/validate-final.log` | Complete: 276 Vitest, 26 Python, typecheck/build/boundary passed |
| Pages-mode build | Primary agent | `npm run build` with `KARDS_GITHUB_PAGES=true`; shared `dist/` | `.runtime/releases/v1.3.0/pages-build.log` | Complete; standard dist restored and reverified |
| Release archive verification | Primary agent | code-only ZIP expansion and checksum | `.runtime/releases/v1.3.0/` | Pending |

## Handoff

- Independent reviewers are read-only and must not edit files, start live servers, run the shared full validation, stage changes, create refs, or publish.
- The primary agent owns fixes, verification, commit, push, tag, Release, and final record reconciliation.

## Next step

Freeze one Lore candidate commit, inspect the exact-SHA code-only archive, then push and run remote release gates.
