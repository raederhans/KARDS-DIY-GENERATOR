# Task

## Status

Complete and verified on 2026-07-21.

## Checklist

- [x] Count ordinary and HQ samples and identify current language gaps.
- [x] Generate bilingual ordinary-card JSON and reference images.
- [x] Add bilingual HQ content and reference resolution.
- [x] Refresh untouched loaded samples when UI language changes.
- [x] Extend catalog, state, App, and dist-boundary tests.
- [x] Run targeted and full validation plus local HTTP verification.
- [x] Run browser smoke for ordinary cards, HQ cards, and edit protection.

## Final validation evidence

| Command or check | Result |
| --- | --- |
| `npm run samples:bilingual:check` | Passed; 69 Chinese overlays and reference images |
| `npm run samples:hq:en:check` | Passed; 5 English HQ references |
| Target Vitest suite | Passed; 113 tests |
| `npm run validate` | Passed; 269 Vitest + 26 Python tests, typecheck, build, boundary verification |
| Local HTTP probes | Four requested UI/resource URLs returned 200 |
| Browser ordinary-card switch | Chinese and English content/reference image matched |
| Browser HQ switch | Chinese and English content/reference image matched |
| Browser edit protection | Manual title remained unchanged while the reference image changed language |

## Remaining risk

The bilingual regeneration command requires the locally provisioned private source under `.runtime`; checked-in public outputs and normal application runtime do not depend on that source.
