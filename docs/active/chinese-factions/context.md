# Chinese factions context

## 2026-07-13 — discovery

- Base: `main@84918a9fe09161b01372f8b4bb1e23f280429ab6`, equal to `origin/main` when work began.
- Active branch: `codex/chinese-factions` in the sole checkout `C:\Users\raede\Documents\KARDS`.
- Live process owner: primary agent owns Vite on `http://127.0.0.1:5173/`; child agents are static-analysis only and must not poll or restart it.
- Existing nation presets live in `src/presets.ts`; `src/cardModel.ts` derives valid imported nation IDs from those presets.
- The public pack resolves `nation-mark` assets by `nationId` and `kind`; the current renderer already places the mark in the top-right slot.
- Existing marks are PNG assets under `public/reference-pack/v1/images/nation-mark/` and are registered in `public/reference-pack/v1/kards-asset-pack.json`.
- Historical evidence supports a white-sun Republic of China air identifier. During the Second United Front, Communist-led forces did not have a separate WWII air-force insignia; the red-star aircraft variants in this task are intentionally game-specific identifiers.
- The `frontend-design` skill reinforces matching the established card language. The `imagegen` skill explicitly recommends deterministic vector/code output for an existing icon system, so no generative bitmap workflow will be used.

## Open checks

- Confirm the existing UI path where HQ kind and nation changes are coordinated.
- Confirm exact mark dimensions and whether infantry/tank share or differ in current assets.
- Confirm distribution-rights documentation for newly project-authored marks.
- Confirm the smallest named test entrypoints that cover preset normalization, selector behavior, asset resolution, and full build closure.

## 2026-07-13 — scope correction and source strategy

- The initial plan interpreted “总部不用做” as forbidding the two factions on HQ cards. Static code evidence shows the renderer already skips nation marks for every HQ card, while nation still supplies the HQ palette. The user requested no HQ emblem, not a new selector restriction. Implementation will therefore leave HQ selection behavior unchanged and add no HQ mark assets; this is the narrower and safer reading.
- User requested web-sourced emblem imagery plus geometric composition. The final approach uses public-domain Wikimedia Commons sources as shape references and source layers, then crops/recolors/composes them into project-specific 54×54 RGBA marks.
- Republic of China source: `Roundel of the Republic of China.svg`, described as the Republic of China Air Force roundel and public-domain simple geometry.
- Chinese Communist source references: the public-domain `中國工農紅軍軍旗.svg` for the historical red-star family and the public-domain `Roundel of China.svg` for a later aircraft-wing layout reference. No `八一` text or hammer-and-sickle will be copied into the final marks.
- All 65 existing bundled nation marks are 54×54 RGBA images with some transparency. The new assets must use the same dimensions and remain readable in the renderer's current top-right slot.
- Because `nation-mark` resolution may reuse another kind from the same nation when an exact kind is absent, every supported non-HQ kind will receive an explicit entry: infantry, tank, fighter, bomber, artillery, order, and countermeasure for each new faction (14 PNGs total). Shared geometry is allowed, but each file gets kind-specific backing or wear so no selector relies on fallback.
- The plan's frame-color wording was broader than repository reality. `accent` colors only the unit name bar and `deep` colors the no-artwork placeholder gradient; frame assets are not palette-tinted. Acceptance will follow those actual consumers.

## 2026-07-13 — implementation and focused verification

- Test-first red run: the six focused suites produced 9 expected failures because the faction presets, localized labels, palette values, manifest entries, and PNG closure did not yet exist; 135 pre-existing assertions still passed.
- Added `roc` and `ccp` presets without changing `CardSpec` or the serialized project schema. The chosen muted palettes are ROC slate blue-grey (`#4b626e` / `#1b2930`) and CCP earth red-brown (`#76554a` / `#321d19`).
- Generated and registered 14 exact non-HQ mark files. ROC uses a simplified white-sun family; CCP uses a plain red-star family. Fighter/bomber marks have wing silhouettes, and the CCP artillery mark has crossed guns behind the star.
- Source provenance and transformation notes were added to both the reference-pack rights notice and the deployed third-party notice. Tests lock the two source URLs, the removal of hammer-and-sickle and later `八一` details, and the exact 14-file manifest matrix.
- Focused green run: 6 files and 144 tests passed. The PNG contract confirmed the signature, 54×54 RGBA format, unique selector paths, required ground/air/artillery content differences, and the absence of HQ mark entries.
- Browser-backed inspection at `http://127.0.0.1:5173/` confirmed both localized selector labels and representative ROC infantry/air and CCP air/artillery marks in the existing top-right slot. The browser's first render of a newly selected card kind can expose the existing staged-canvas warm-up behavior; no renderer implementation changed in this task, so this unrelated behavior is recorded rather than patched here.

## 2026-07-13 — independent reviews and release gate

- Code/data-flow review: no P0–P3 findings. The reviewer confirmed the implementation stays inside the existing `NATIONS` source, manifest selector, and global HQ-skip contracts.
- Visual review initially found the CCP air mark too thin and the CCP order mark's lower bar too similar to an empty label. The air star/height was enlarged and the empty bar removed; the follow-up review closed both findings with no new issues.
- Test/rights review found an ambiguous `Exception` label and insufficient content-format checks. The notice now states that it is provenance clarification only, while the existing usage restrictions remain; the existing dist test now locks 8-bit RGBA plus the required ground/air/CCP-artillery content differences without overconstraining every same-branch image.
- First-principles review rejected a new renderer branch, schema revision, dependency, or generic asset fallback. Two preset rows, two localized labels, explicit manifest data, and deterministic PNGs remain the narrowest implementation.
- Final focused run passed: 6 files and 144 tests.
- Full `npm run validate` passed: 17 Vitest files / 263 tests, 26 private-tool contract tests, TypeScript checks, Vite production build, and the dist private-boundary verifier.
- Fresh `git fetch origin main` confirmed `main`, `origin/main`, and the task base are still the same commit: `84918a9fe09161b01372f8b4bb1e23f280429ab6`.
