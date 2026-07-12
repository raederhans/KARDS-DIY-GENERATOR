# Set-mark extraction cleanup plan

## Goal

Improve the right-bottom card-set emblems by removing verified card-paper, crop-edge, or neighboring-print contamination without erasing thin set-specific artwork.

## Acceptance criteria

- Audit all 15 authorized `set-mark` PNGs against their exact Stage6 outputs and source/reference slices.
- Prove the failing extraction behavior before changing production code.
- Repair the generator at the source boundary and regenerate only verified authorized outputs.
- Preserve fine lines and pale subjects with set-specific evidence rather than one global threshold.
- Add RED/GREEN contracts for public output geometry, subject survival, and manifest identity.
- Pass visual comparison, three independent reviews, focused checks, and `npm run validate`.

## Stages

- [x] Inventory public assets, alpha/color statistics, and exact source samples.
- [x] Prove a single root-cause hypothesis and identify affected set families.
- [x] Add the smallest failing contract tests and record RED evidence.
- [x] Implement the minimal extraction correction and regenerate authorized outputs.
- [x] Compare transparent contact sheets and stable Canvas samples.
- [x] Run three independent final reviews and the full validation gate.
- [ ] Commit/push with a Lore-protocol commit, update registry/lessons, and archive the task.

## Constraints

- Do not change README or renderer geometry unless extraction evidence proves the renderer is at fault.
- Do not use a global color threshold, generic component deletion, or AI background removal.
- Keep private source cards in `.runtime`; publish only the existing authorized runtime closure.
- The primary agent exclusively owns Vite on `127.0.0.1:5173` and all live tests/builds.
