# KARDS Card Forge v1.5.0 Release Plan

## Goal

Publish the adaptive title/body fitting increment as one exact-SHA GitHub
Release and deploy that same candidate to Vercel Production.

## Scope

- Advance package and lockfile metadata from `1.4.0` to `1.5.0` without
  changing dependencies.
- Publish the renderer-owned `fits`, `adjusted`, and `truncated` text states,
  accessible editor feedback, and export freshness checks already reviewed and
  tested in the feature delivery.
- Preserve serialized manual appearance, the fixed single-line title design,
  public-resource rights, and the existing code-only archive exclusions.
- Validate, commit, push, monitor CI/Pages, tag, publish Release assets, deploy
  the candidate to Vercel Production, and verify public output.

## Stages

- [x] Stage 1: establish worktree, remote, authentication, latest Release,
  package version, Vercel project binding, and release-process truth.
- [x] Stage 2: synchronize v1.5.0 metadata, roadmap, bilingual notes, and
  durable release records.
- [x] Stage 3: run full validation, dependency audit, Pages build, standard
  build restoration, and code-only archive checks.
- [x] Stage 4: create and push one Lore candidate commit, then verify GitHub CI
  and Pages against its exact SHA.
- [x] Stage 5: create annotated tag `v1.5.0`, publish the GitHub Release, and
  verify freshly downloaded assets.
- [x] Stage 6: deploy the exact candidate to Vercel Production, confirm Ready
  status and a public-root HTTP 200, and record the later local-network asset
  probe gap without treating it as a deployment failure.
- [x] Stage 7: reconcile registry truth and archive this release record in a
  records-only closeout.

## Acceptance criteria

- `main`, `origin/main`, annotated tag `v1.5.0`, and the GitHub Release resolve
  to one immutable candidate SHA at publication.
- Package and lockfile root metadata are all `1.5.0`; dependency versions and
  public-resource boundaries do not change.
- `npm run validate`, `npm audit --audit-level=moderate`, Pages-mode build,
  standard build restoration, and code-only archive inspection pass.
- GitHub CI and Pages succeed on the candidate before tagging.
- The Release ZIP checksum matches `SHA256SUMS.txt` and GitHub's asset digest;
  fresh expansion contains all required files and no excluded paths.
- Vercel Production reaches `READY`, serves HTTP 200, and exposes the adaptive
  text-fit markers from the same candidate.

## Non-goals

- Do not change renderer behavior, add dependencies, admit new public card
  images, or broaden licensing claims during release packaging.
- Do not rewrite history, force-push, replace earlier tags, or deploy from an
  unverified post-candidate commit.
- Do not claim cross-platform pixel identity or comprehensive WCAG compliance.

## Risks

- GitHub Pages and Vercel use different asset bases, so Pages and root-relative
  builds must be verified separately and `dist/` restored afterward.
- Vercel preview URLs may be protection-gated; decisive public probes belong on
  the production alias after exact-candidate deployment.
- Release evidence must remain outside the candidate commit after publication,
  except for one clearly records-only closeout.
