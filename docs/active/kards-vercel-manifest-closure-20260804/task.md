# Task

## Current status

The exact deploy-input allowlist repair passes all local gates and is ready to commit and publish.

## Checklist

- [x] Confirm local/remote/worktree state.
- [x] Verify live Pages and stable Vercel behavior.
- [x] Extract both failed Vercel build logs.
- [x] Add and observe a failing regression test.
- [x] Repair deploy closure; current registry URL truth will be recorded after live deployment verification.
- [x] Run focused tests and `npm run validate`.
- [x] Perform post-fix review and first-principles check.
- [ ] Create Lore commit and push.
- [ ] Monitor GitHub CI/Pages and Vercel Production to terminal success.
- [ ] Verify stable alias, live assets, browser runtime, remote identity, and clean worktree.
- [ ] Archive task records and push records-only closeout.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `gh api .../pages` | Current Pages URL is `/KARDS-DIY-GENERATOR/`; build type is workflow. |
| GitHub workflow query | CI `30876975994` and Pages `30876976014` succeeded for `0a072d9`. |
| Public HTTP/resource probes | Both current Pages and stable Vercel return 200; Pages manifest version 1 contains 105 images. |
| Public Playwright smoke | Both sites show the editor; Canvas is 500x702 and nonempty; console has 0 errors/warnings. |
| Vercel failed build logs | Both current pushes fail with `ENOENT .../tools/bilingual_sample_reference_hashes.json`. |
| Regression RED | Expected failure: manifest allowlist rule index was `-1`. |
| Focused GREEN | `tools/verify_dist_private_boundary.test.mjs`: 9/9 passed. |
| `npm run build` | TypeScript, 65-module Vite build, and dist boundary verification passed. |
| `npm run validate` | Passed: 24 Vitest files / 322 tests, 26 private-tool tests, TypeScript, 65-module Vite build, and dist verifier. |
| `npm audit --audit-level=moderate` | Passed: 0 vulnerabilities. |
| `git diff --check` | Passed; only expected line-ending notices. |

## Open risks and remaining work

- Vercel stable alias serves an older Ready deployment until a repaired candidate reaches Production.
- Current active registry still contains historical `/KARDS/` deployment evidence; add an explicit current-status row instead of rewriting history.
