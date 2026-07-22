# KARDS Card Forge v1.4.0 Release Context

## Current truth

- Task class: complex external publication.
- Sole worktree: repository root on `main`; refreshed `HEAD` and `origin/main` both equal `3c83d776a453593cb22f8f6a5b1557d19da6dd6a` before release edits.
- Published release: `v1.4.0`; candidate and annotated tag resolve to `caa2d5e6e57cf818128b1e6c56d912455cee4bde`.
- Package and lockfile metadata now resolve to `1.4.0`; no dependency versions changed.
- GitHub CLI is authenticated as `raederhans` with repository and workflow access.
- Candidate commit, remote CI, workflow-driven Pages, annotated tag, GitHub Release, and attached assets are published and verified.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-22 | User requested audit, fixes, README/Help updates, and a new Release. | Commit, push, tag, and GitHub Release publication are authorized; force-push remains out of scope. |
| 2026-07-22 | Only one worktree exists and refreshed `main` equals `origin/main`. | No multi-worktree integration workflow is required. |
| 2026-07-22 | Latest Release is `v1.3.0`; candidate features are backward-compatible. | Use semantic minor version `v1.4.0`. |
| 2026-07-22 | Prior release evidence requires one immutable candidate across GitHub CI, Pages, tag, Release, and attached archive. | Freeze records before the candidate commit and publish only after exact-SHA checks pass. |
| 2026-07-22 | Independent review found stale local-library identity after history navigation, unguarded asynchronous artwork upload, and stale/out-of-order visual-difference results. | Treat all three as release blockers and require request/revision identity plus focused regressions. |
| 2026-07-22 | Re-review found that upload, reference-artwork, and full-template requests still had separate last-started-wins domains. | Add one App-level explicit-work generation so later user actions invalidate every earlier explicit loader without changing automatic-artwork semantics. |
| 2026-07-22 | Final independent re-review found no remaining P0/P1/P2 findings; focused App/FieldPanel tests, typecheck, and diff checks passed independently. | Release-blocking review is closed; proceed to primary-agent release validation. |
| 2026-07-22 | Final-candidate review then reproduced automatic reference artwork being dropped because a derived-state replacement reused authored-state equality. | Replace derived `present` on every new runtime-state object, add a real `applyAutomaticArtwork` regression, and rerun review plus all release gates. |
| 2026-07-22 | Re-review of the automatic-artwork repair returned `APPROVE`; no P0/P1/P2 remains. | The final reviewed code can proceed to candidate freeze after fresh validation. |
| 2026-07-22 | The README Pages link still used the repository's former `/KARDS/` path. | Replace the verified 404 URL with the Pages API's current `KARDS-DIY-GENERATOR` URL, which returns HTTP 200. |
| 2026-07-22 | Official WAI/MDN guidance confirmed the existing shortcut and text-alternative approach. | Add only explicit Canvas `role="img"`, atomic diff status, and user-facing Help/README text; do not introduce a parallel accessibility framework. |
| 2026-07-22 | README, Help, version metadata, and bilingual Release notes were synchronized. | Documentation-focused tests passed 30/30 and `git diff --check` remained clean. |
| 2026-07-22 | Candidate `caa2d5e6e57cf818128b1e6c56d912455cee4bde` passed GitHub CI `29916863641` and Pages `29916863717`; live root and hashed JavaScript returned HTTP 200 with v1.4 markers. | Freeze annotated tag `v1.4.0` on that candidate and publish only its inspected archive. |
| 2026-07-22 | Live Vercel root and hashed JavaScript also returned HTTP 200 with Undo and Clear reading markers. | Keep the documented Vercel entry point; do not claim an exact deployment SHA because the probe establishes content, not provider provenance. |
| 2026-07-22 | Freshly downloaded Release ZIP matched the published checksum and GitHub `sha256:` digest, expanded to 91 files, and contained no forbidden or sensitive paths. | Release asset verification is complete; preserve ZIP SHA-256 `801d6f9e1a0f86f19f390dc4b9cd0c31a21fe325ada132e8e903f16bda972784`. |
| 2026-07-22 | `gh release verify` and `verify-asset` reported no attestations for this tag. | Record immutable-release attestation as unavailable; do not change repository settings or weaken the independent checksum/digest evidence. |

## Live process ownership

| Process | Owner | Command and shared resource | Stable evidence | State |
| --- | --- | --- | --- | --- |
| Editor-quality browser smoke | Primary agent | `npm run smoke:editor-quality`; port `5184` | `.runtime/kards-editor-quality-smoke/latest/report.json` and `.runtime/releases/v1.4.0/editor-quality-smoke.log` | Passed: 16 checks, no errors, port released |
| Release validation | Primary agent | `npm run validate`; `dist/`, Vite and npm caches | `.runtime/releases/v1.4.0/validate.log` | Passed after final P1 repair: 308 Vitest tests, 26 private contracts, typecheck, build, boundary check |
| Pages-mode build | Primary agent | Pages environment plus `npm run build`; shared `dist/` | `.runtime/releases/v1.4.0/pages-build.log`, followed by `standard-build-restore.log` | Passed: repository asset base verified; standard build restored |

Success requires exit code 0, an `ok: true` smoke report, and the expected Pages asset base. Failure is any nonzero exit, browser error, stale asset base, or uncleared port/process; the primary agent stops the sequence and preserves logs before retrying.

## Handoff

- Candidate publication is complete; preserve tag and Release on `caa2d5e6e57cf818128b1e6c56d912455cee4bde`.
- This records-only closeout may advance `main` but must not rebuild, retag, or replace Release assets.
- Manual screen-reader, zoom, forced-colors, and contrast review remain explicit human follow-up work.

## Next step

None. Archive this record and preserve the published candidate evidence.
