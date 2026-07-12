# Attack reticle fidelity plan

## Goal

Audit the attack-value boards against authorized original-card references, then correct the renderer at the earliest shared boundary. Preserve the original distinction between aircraft reticles and ordinary unit attack shields.

## Acceptance criteria

- Fighter and bomber attack values use a circular, unfilled reticle with four short sight ticks.
- Artillery attack values use the ordinary inverted-shield board shown by original references.
- Aircraft reticles keep their original square geometry and are not stretched vertically.
- Asset-backed and fallback rendering follow the same type and geometry contract.
- Paper wear does not erase the transparent reticle center.
- Existing renderer and extraction-contract tests reach the changed behavior; full `npm run validate` passes.
- Before/after visual evidence is recorded, independently reviewed, committed, and pushed.

## Stages

- [ ] Audit at least three original references per relevant type and record the shared geometry.
- [ ] Capture the current renderer baseline and identify the first incorrect boundary.
- [ ] Add a failing regression test for type routing, dimensions, fallback shape, and wear behavior.
- [ ] Implement the smallest shared correction in renderer/layout/extraction contracts and the public asset closure.
- [ ] Capture corrected output and compare it against the references.
- [ ] Run focused checks, full validation, three independent reviews, and first-principles simplification review.
- [ ] Archive the task record, update registry/lessons if warranted, commit, and push.

## Constraints

- The main agent owns the running Vite server on port 5173 and every live test/build process.
- Subagents are read-only auditors and may not start or monitor live processes.
- Do not bundle any new unlicensed source. Only the already-authorized public reference pack may be extended.
- Do not alter README.
