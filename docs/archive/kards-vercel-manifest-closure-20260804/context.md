# Context

## Current truth

- Repository `main` is clean at `0a072d9771ae9a30fc5ff2fc7cc052006bfb7ced`; it matches `origin/main` and is the only worktree.
- GitHub CI run `30876975994` and Pages run `30876976014` succeeded for `0a072d9`.
- Current Pages URL is `https://raederhans.github.io/KARDS-DIY-GENERATOR/`; the former `/KARDS/` URL returns 404.
- Vercel stable alias is HTTP 200 and points to Ready deployment `dpl_CXFDPNQ6H2WCxYYXyw8TNhwwciSL` from 2026-07-24.
- Automatic Production deployments for `bec31a4` and `0a072d9` failed after the build because the verifier could not open `tools/bilingual_sample_reference_hashes.json`.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-08-04 | `.vercelignore` excludes `tools/*` and re-includes only `verify_dist_private_boundary.mjs`. | The new trusted hash input is absent from Vercel's cloned build input. |
| 2026-08-04 | Both live sites pass browser smoke despite the failed new Vercel deployments. | Stable Vercel service is not down, but it is stale and must not be reported as current. |
| 2026-08-04 | Preserve all other tool exclusions and allowlist only the hash manifest. | Minimal repair maintains the small-upload/private-tool boundary. |
| 2026-08-04 | Regression failed with manifest allowlist index `-1`, then passed after one exact `.vercelignore` negation rule. | TDD proves the new contract detects the production failure mechanism. |
| 2026-08-04 | Full validation, dependency audit, diff check, and first-principles review passed. | Candidate is ready for a narrow Lore commit and external deployment proof. |
| 2026-08-04 | GitHub CI `30877836228` and Pages `30877836220` succeeded for `d90e2b7`. | GitHub host and verification gates accept the repaired candidate. |
| 2026-08-04 | Vercel Production `dpl_9DecfBLubjZmRWzfkf9mR55tzj55` cloned `d90e2b7`, passed the dist verifier, reached READY, and received the stable alias. | The production failure is closed without bypassing the trust gate. |
| 2026-08-04 | Fresh Pages/Vercel HTTP, manifest, JS, and browser probes passed with zero console errors/warnings. | Both public sites are operational; current Pages URL truth is recorded. |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| Focused/full local validation | primary agent | captured command output | completed successfully |
| GitHub CI/Pages workflow monitoring | primary agent | GitHub run URLs recorded in task evidence | functional repair complete; closeout run pending |
| Vercel Production deployment monitoring | primary agent | Vercel deployment URL and build logs recorded in task evidence | functional repair complete; closeout deploy pending |
| Public Pages/Vercel Playwright smoke | primary agent | captured CLI output; temporary snapshots removed | completed successfully |

## Handoff

- Primary agent owns edits, Git mutation, deployment monitoring, stable-alias verification, and records closeout.
- No subagent or parallel process owns shared build/deployment surfaces.

## Next step

Commit and push this records-only archive, monitor the final automatic deployments, then verify local/remote identity and a clean worktree.
