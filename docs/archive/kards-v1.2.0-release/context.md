# KARDS Card Forge v1.2.0 Release Context

## 2026-07-13 — baseline

- Task class: integration and external publication.
- Worktree: sole checkout `C:\Users\raede\Documents\KARDS` on `main` at `496f83eaca361ee4363c537a8edebbca83a9a476`; clean and aligned with `origin/main` before release-record edits.
- Latest published Release: `v1.1.0`, tag commit `84918a9fe09161b01372f8b4bb1e23f280429ab6`.
- Candidate range: four commits in `v1.1.0..HEAD`; the functional commit adds Republic of China and Chinese Communist factions, muted palettes, localized labels, and 14 explicit non-HQ nation marks. Adjacent commits preserve Windows license verification and integration truth.
- Version decision: `v1.2.0` because the range adds backward-compatible user-visible capability and bundled public resources.
- Worktree risk: green; `git worktree list` reports only the main checkout. Publication risk remains red until one immutable candidate passes local and remote gates.
- Existing candidate CI/Pages and Vercel status on `496f83e` are green, but all remote checks must run again after the versioned release commit.
- Primary agent owns all live verification and publication. Independent agents own read-only code and architecture review lanes.

## Initial audit evidence

- `git diff --check v1.1.0..HEAD` passed.
- The implementation reuses `NATIONS`, localized preset labels, manifest nation-mark selectors, and the renderer's existing global HQ omission; no faction-specific renderer branch was introduced.
- The manifest carries 14 unique ROC/CCP non-HQ selectors: infantry, tank, fighter, bomber, artillery, order, and countermeasure for each faction.
- Existing tests lock supported IDs, selector loading, localized options, both palette paths, PNG dimensions/format, ground-air-artillery distinction, no HQ entries, and source-rights notices.
- Contact-sheet and representative rendered-card evidence were inspected; insignias remain legible in the existing top-right slot and visually distinguish the requested branches.

## Known risk boundary

- The project intentionally omits HQ nation marks while retaining faction palette selection.
- The bundled marks are original composites using public-domain source geometry, but official-insignia and trademark rules can vary by jurisdiction; the public notices retain that limitation.
- The code-only Release asset must exclude the full public reference pack even though GitHub's automatically generated source archives still contain tracked files.

## 2026-07-13 — independent review and metadata repair

- Code review examined all 30 changed files and reported no CRITICAL or HIGH findings. Its only MEDIUM finding was the expected release blocker that package metadata still read `1.1.0`; `package.json` and both lockfile version fields are now synchronized to `1.2.0`.
- The review's LOW observation was that current mark-difference tests compare compressed PNG file digests rather than decoded pixels. The 14 marks were also inspected visually and do differ as required, so this is a future test-quality improvement rather than a release blocker.
- Architecture status is `WATCH`, not `BLOCK`: the implementation stays data-driven, but publication must prove the code-only archive excludes all reference-pack resources and that tag, Release, Pages, and Vercel resolve to one candidate SHA.
- Live Wikimedia Commons pages confirm the recorded public-domain bases: simple geometry for the ROC and Chinese air roundels, and an explicit worldwide public-domain release for the Red Army flag. The pages separately warn that official insignia may be restricted independently of copyright; the repository notices preserve the same warning.
- `npm audit --audit-level=moderate` reported zero vulnerabilities.

## 2026-07-13 — frozen local candidate evidence

- Independent final verdicts: code reviewer `APPROVE`; architect `WATCH` with no blocker and a mandatory archive-content scan before publication.
- Focused verification passed 6 files / 144 tests.
- Full `npm run validate` passed 17 Vitest files / 263 tests, 26 Python private-tool contracts, TypeScript checks, the standard Vite production build, and strict dist/reference-pack verification.
- A GitHub Pages-mode `build:verified` passed and emitted the repository-subpath build; a final standard-root `build:verified` then passed so local `dist/` remains in Vercel-comparable form.
- `npm audit --audit-level=moderate` reported zero vulnerabilities.
- At this freeze point, external candidate CI/Pages, Vercel exact-SHA status, code-only archive expansion, annotated tag, GitHub Release, and asset re-download were still pending; the publication-closure section below records their final results.

## 2026-07-13 — publication closure

- The Lore candidate `8033291f9fd1b462e209b0422fca8186a3cd8ecf` was pushed to `origin/main`; GitHub CI run `29299190162` and Pages run `29299190169` both completed successfully for that SHA.
- Vercel Production deployment `dpl_2xZrcZyBiWZwkNLP4A5EV2b5g8hw` is `READY`, `PROMOTED`, and records the same Git SHA in both `gitSource.sha` and `meta.githubCommitSha`.
- The renamed repository's Pages URL is `https://raederhans.github.io/KARDS-DIY-GENERATOR/`; Pages and Vercel returned HTTP 200 for the manifest, notices, one ROC fighter mark, and one CCP artillery mark. PNG bytes matched exactly; text matched after normalizing checkout line endings.
- The code-only ZIP was generated from the candidate, expanded, and scanned. It contains 176 entries, includes the required license/notices/package files, and contains none of `public/reference-pack/v1/**`, `public/brand/**`, `public/artwork/**`, `public/favicon.svg`, or `.openai/**`.
- Archive SHA-256: `7f9644f867a7801242e4db1c6e098de121b7bb02b631642659b3e07a0864a2d3`. GitHub reports the same asset digest, and a fresh Release download reproduced the checksum and exclusion scan.
- Annotated tag `v1.2.0` resolves locally and remotely to the candidate. The public Release is `https://github.com/raederhans/KARDS-DIY-GENERATOR/releases/tag/v1.2.0`, with the code-only ZIP and `SHA256SUMS.txt` attached.
- All blocking `WATCH` conditions are closed. Remaining non-blocking improvements are decoded-pixel comparison in mark tests and immutable source-revision pinning for the public-domain geometry provenance.
