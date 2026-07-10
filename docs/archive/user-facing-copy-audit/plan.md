# User-facing copy audit plan

## Goal

Make the editor and its documentation easier to understand for a first-time user without changing product behavior, data contracts, technical identifiers, or legal meaning.

## Reading standard

- Start from the user's task and next action.
- Prefer short, direct sentences and familiar words.
- Use one name for each concept across the UI and documentation.
- Make buttons describe the action they perform.
- Make instructions state the requirement before background detail.
- Make errors state what happened and what the user can do next.
- Keep headings short, descriptive, and useful when scanned alone.
- Keep technical identifiers, file names, formats, commands, and legal terms exact.
- Treat lower-secondary reading level as a review target for English prose where the technical meaning allows it.

## Scope

1. User-visible Chinese and English strings in the React application.
2. Page title and short product description.
3. `README.md` onboarding, feature, safety, development, and deployment guidance.
4. Current user- or maintainer-facing explanatory files under `docs/active/` and `public/`.
5. Existing tests that lock labels, instructions, errors, and localization coverage.

## Out of scope

- Card sample content and official reference-card wording.
- Archived task evidence unless a current document links to stale guidance there.
- Code identifiers, serialized schema values, diagnostic codes, and file-format contracts.
- Legal or rights wording whose meaning would change when shortened.
- Product behavior, layout redesign, or new features.

## Phases

1. Inventory all copy-bearing files and classify each string by user task.
2. Record terminology, readability, duplication, ambiguity, and stale-document findings.
3. Update UI copy and its existing tests.
4. Rewrite README and current explanatory documents around user workflows.
5. Run focused tests, full validation, and a limited browser smoke.
6. Complete independent UI-copy, documentation, and verification reviews.
7. Archive this task after the final commit and push.

## Verification

- Existing i18n and component tests cover changed UI labels and messages.
- Chinese and English locale keys remain complete and structurally aligned.
- Commands, paths, product limits, and deployment instructions match the repository.
- `npm run validate` passes.
- Desktop and narrow-screen browser smoke show no clipped or misleading changed copy.
- `git diff --check` passes and no archived evidence is rewritten without need.
