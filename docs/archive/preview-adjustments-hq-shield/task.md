# Preview adjustments and HQ shield task

## Current status

Complete. Implementation, automated validation, and clean-browser visual smoke all passed.

## Checklist

- [x] Add a shared normalized brightness/contrast filter helper.
- [x] Apply the filter to the generated preview canvas only.
- [x] Add helper regression coverage and run targeted export/ProjectPanel tests.
- [x] Reproduce and measure the HQ defense value and shield shape mismatch.
- [x] Add or update focused HQ renderer regression coverage.
- [x] Apply the minimal HQ renderer repair.
- [x] Verify 0/positive/negative preview adjustments in a clean live browser session.
- [x] Run typecheck, full tests, production build, served-source check, HTTP smoke, and diff review.
- [x] Archive this record after all acceptance criteria pass.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `npx vitest run src/exportCard.test.ts src/components/ProjectPanel.test.ts --exclude ".runtime/**"` | 35 tests passed |
| Served `ProjectPanel.tsx` source check | Preview effect is current |
| `npx vitest run src/components/ProjectPanel.test.ts src/exportCard.test.ts src/canvas/cardRenderer.test.ts --exclude ".runtime/**"` | 101 tests passed |
| `npx vitest run --exclude ".runtime/**"` | 17 files and 268 tests passed |
| `npm run build` | Typecheck, Vite build, and private-boundary verification passed |
| HTTP and served-source smoke | `/` returned 200; preview helper, HQ offset, and square-top path are served |
| `git diff --check` | Passed; only existing line-ending warnings were reported |
| Clean Playwright browser smoke | Passed: preview filter visible on generated canvas, reference unaffected, 0 console errors/warnings |

## Open risks and remaining work

- No open implementation or verification risk remains for this task; release-wide remote and artifact gates are tracked separately.
