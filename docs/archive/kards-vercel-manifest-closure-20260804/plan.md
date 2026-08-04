# Plan

## Goal

Restore automatic Vercel production deployment for the latest `main` without weakening the trusted-reference or private-upload boundaries, then verify GitHub Pages and Vercel serve the exact repaired candidate.

## Scope

- `.vercelignore` deploy-input closure.
- Existing dist-boundary regression tests.
- Current Pages URL truth in `docs/active/_worktree_registry.md`.
- GitHub CI/Pages and Vercel production deployment triggered by the repair commit.

## Sources of truth

- Vercel build logs for failed deployments `kfgsk0g2b` and `cnwbljand`.
- GitHub Pages API and workflow runs for `raederhans/KARDS-DIY-GENERATOR`.
- Fresh local tests/builds and live HTTP/browser probes.
- Local, tracking, and advertised remote commit identity.

## Stages

- [x] Stage 1: Reproduce and diagnose the deployment failure.
- [x] Stage 2: Add a failing deploy-closure regression test.
- [x] Stage 3: Apply the smallest ignore-rule and registry repair.
- [x] Stage 4: Run focused and full validation plus review.
- [x] Stage 5: Commit, push, monitor CI/Pages/Vercel, and verify live sites.
- [x] Stage 6: Reconcile registry truth and archive records.

## Acceptance criteria

- The trusted hash manifest is present in Vercel's build upload while unrelated `tools/*` remain excluded.
- Focused regression and `npm run validate` pass.
- GitHub CI and Pages succeed for the functional fix commit.
- Vercel Production reaches `READY`, the stable alias points at the new deployment, and the live app passes HTTP/resource/browser smoke.
- Local `main`, `origin/main`, registry, and archived task evidence agree; worktree is clean.

## Non-goals

- No release/tag/version change.
- No change to image hashes, reference assets, renderer behavior, or product UI.
- No broad rewrite of historical archive URLs.

## Risks and constraints

- Production deployment is external state; do not claim completion until the stable alias and live assets are verified.
- Preserve `.vercelignore` secret/private boundaries and keep the repair to one allowlisted build input.
- Historical registry entries retain their original URLs as evidence; only current truth should be corrected.
