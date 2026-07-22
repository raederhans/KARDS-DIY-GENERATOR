# Preview adjustments and HQ shield plan

## Goal

Make export exposure and contrast visible on the editable card preview, then correct the HQ defense value placement and shield outline against the existing HQ visual contract.

## Scope

- Reuse one normalized brightness/contrast filter for preview and export.
- Apply preview adjustments only to the generated card, not the reference image.
- Inspect and minimally repair HQ defense-number alignment and shield geometry.
- Preserve current export pixels, card data, reference assets, and unrelated worktree changes.

## Sources of truth

- Current browser comments and live page at `http://127.0.0.1:5173/`.
- `src/exportCard.ts`, `src/components/ProjectPanel.tsx`, and Canvas renderer/layout tests.
- Existing archived HQ alignment evidence and local dev reference assets.

## Stages

- [x] Stage 1: Reproduce and implement the shared preview/export adjustment filter.
- [x] Stage 2: Audit current HQ value and shield geometry against reference evidence.
- [x] Stage 3: Add regression coverage and apply the minimal renderer repair.
- [x] Stage 4: Run targeted/full validation and live browser visual checks.

## Acceptance criteria

- Exposure and contrast sliders immediately alter only the generated preview.
- Zero exposure and contrast produce no visual filter; export adjustment behavior is unchanged.
- HQ defense value is visually centered in its intended board region.
- HQ shield uses straight joins where the reference is straight and keeps only intentional curvature.
- Targeted tests, typecheck, full tests, served-source check, browser smoke, and diff review pass.

## Non-goals

- No new appearance controls or serialized card fields.
- No changes to ordinary unit stat boards, reference images, or export dimensions.
- No commit, push, deployment, or private asset changes unless separately requested.

## Risks and constraints

- CSS preview filtering must not be captured twice during export.
- Stale HMR state must not be mistaken for current renderer output.
- Existing uncommitted changes from this task thread must be preserved.
