# KARDS Authorized Assets Release Plan

## Goal

Publish the current `main` branch to GitHub and Vercel with the user-authorized card reference resource pack available in the production app.

## Scope

- Use the renderer-ready Stage 6 asset manifest as the source of truth.
- Publish only files consumed by the product: manifest images, card sample JSON, card reference PNGs, and five HQ reference PNGs.
- Keep extraction reports, source snapshots, calibration intermediates, markers, and unrelated runtime artifacts private.
- Replace dev-only catalog gating with an authorized production reference catalog.
- Validate the app, production bundle boundary, GitHub release, Vercel production deployment, and stable live URL.

## Plan

- [x] Inventory worktrees, repository state, remotes, release history, Vercel linkage, and local asset candidates.
- [x] Build the minimal tracked public reference pack and record its rights notice.
- [x] Update the catalog and app to load the bundled pack in production.
- [x] Extend existing tests and production-boundary verification for the new public contract.
- [x] Run targeted validation, full validation, Pages-path validation, and independent reviews.
- [x] Commit and push `main` using the Lore protocol.
- [ ] Create and verify a draft GitHub release from the final tagged commit.
- [x] Deploy a Vercel Preview with pinned CLI and probe the protected deployment through an authenticated bypass.
- [ ] Promote the verified Preview artifact to production and probe the stable alias.
- [ ] Close the delivery package, archive this task, and clean any completed worktree residue.

## Verification

- Targeted Vitest coverage for the catalog, asset loader, and app selection state.
- `npm run validate`.
- Public-pack manifest closure check: every referenced file exists, and no unreferenced extraction/source artifacts are shipped.
- `git diff --check` and secret/path scans.
- GitHub commit/tag/release verification.
- Vercel deployment inspection plus HTTP probes for the app, manifest, sample JSON, and representative reference images.

## Live Process Ownership

- The main agent exclusively owns all tests, builds, GitHub release commands, Vercel commands, and live deployment probes.
- Review subagents are read-only and may inspect only already-written files and completed command output.
