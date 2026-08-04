# Plan

## Goal

Review the latest adjacent functional delivery window, repair only evidence-backed defects or unsafe redundancy, then validate, synchronize `main`, and push the verified result.

## Scope

- Functional commits: `e894bed`, `caa2d5e`, `8262f29`, `94e6b59`, `bee36ac`, `ace5b8a`, `048bd08`, `534dc67`, `fb0db78`, `0ff1c03`.
- Current uncommitted changes and all registered KARDS worktrees.
- Runtime code, tests, build/deployment boundaries, and relevant registry truth.

## Sources of truth

- `origin/main`, local `main`, and exact commit ancestry.
- `git worktree list --porcelain` and `git status --short --branch`.
- `docs/active/_worktree_registry.md`.
- Fresh targeted tests and `npm run validate`.

## Stages

- [x] Stage 1: Inventory repository, remote, worktrees, registry, and review window.
- [x] Stage 2: Independent code-quality/security and architecture review.
- [x] Stage 3: Reproduce and minimally repair confirmed findings.
- [x] Stage 4: Run targeted and full validation plus final review.
- [ ] Stage 5: Commit, push, reconcile registry, and archive this task record.

## Acceptance criteria

- Review covers no more than 10 recent functional commits and excludes records-only/file-only changes.
- Every repair is tied to a reproducible failure or direct contract violation.
- Targeted tests and the project validation gate pass on the final candidate.
- Local `main`, `origin/main`, worktree registry, and live worktree state agree.
- No unrelated work is staged, overwritten, or discarded.

## Non-goals

- No release/tag/deployment creation.
- No speculative renderer optimization or broad refactor without measured need.
- No README rewrite or public asset replacement unless required by a confirmed defect.

## Risks and constraints

- The local branch starts one records-only commit ahead of `origin/main`; preserve it and push only after review validation.
- Canvas rendering, export freshness, editor history, generated samples, and Pages base-path logic are shared hotspots.
- Public/reference assets have licensing and private-boundary constraints.
