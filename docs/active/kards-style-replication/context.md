# KARDS Style Replication Context

## 2026-07-03 Research Start

- The user correctly reported that the first MVP is visually only "似是而非" and does not match the real official KARDS card face.
- Local repo has one main worktree at `C:\Users\raede\Documents\KARDS`, branch `master`, HEAD `27f5ae7`.
- Working tree was clean before this research pass.
- Prior MVP is an integrated baseline, not an official-style replica.

## Official Evidence Collected

- KARDS support "Cards" article states static cards contain deployment and operation costs, stats, abilities, and rarity. It also states the header contains deployment cost, operation cost, name, and nation, and that Orders/Countermeasures do not have operation costs.
- Downloaded official support image attachments into `.runtime/research/official/`:
  - `static-view.png`: 800x700
  - `cost-unit-info.png`: 550x250
  - `unit-stats.png`: 550x300
  - `unit-abilities.png`: 550x300
- A simple pixel measurement of the official `static-view.png` card body gives approximately 426x598 for the non-red card pixels, aspect 0.712. This matches the existing 500x702 canvas ratio closely, so the output size can stay 500x702 while the internal layout must change.

## Early Visual Findings

- The official static unit card is organized as a narrow header strip, large artwork, floating stat row, flat ability text block, centered rarity pips, and small set icon.
- Current MVP uses a thick decorative frame, centered title, large circular nation badge, custom red separators, serif body text, and programmatic texture. These are the wrong structural grammar for precision replication.
- The issue is not a simple palette or CSS fix; the Canvas renderer needs a new template model.

## Reference Project Findings

- KardsGen's `Material/frame.png` is exactly 500x702. Its `CardGen.Generate(...)` uses fixed coordinates and a fixed draw order, making it the strongest coordinate reference.
- KardsGen unit artwork is drawn at `12,99,476,426`; non-unit artwork is drawn at `12,13,476,476`.
- KardsGen draws the unit name bar at `98,13,390,86`, nation icon around `(450,52)`, rarity at `222,675`, set mark near `(488,692)`, attack board at `88,468`, defense board at `330,473`, and type icon at `208,473` for most unit cards.
- CraftSoul/kards-image-tool confirms browser Canvas export and a `500x702` card image assumption for deck-image composition. It uses official card image URLs through `www.kards.com/images/card/...`.
- KARDS-Assets is useful as an asset organization reference, but its README explicitly says the hosted game assets belong to 1939 Games and are for personal/non-commercial fan use.

## Current Decision

- Keep the 500x702 canvas target.
- Treat current renderer styling as a replaceable rough placeholder.
- Do not copy official-derived assets into the default app during this pass.
- Next implementation should first do a no-official-asset geometry pass: fixed official-style layout tables plus programmatic placeholder layers.
- Asset-pack import should be a later, gated research mode. The local asset-pack boundary is a risk-reduction design, not a legal guarantee. Official-derived assets should stay outside git and outside the default public build.

## Source Links

- Official card mechanics and layout: https://support.kards.com/hc/en-us/articles/360026768151-Cards
- Official static-view attachment: https://support.kards.com/hc/article_attachments/27534092718105
- Official cost/unit attachment: https://support.kards.com/hc/article_attachments/27534109436825
- Official stats attachment: https://support.kards.com/hc/article_attachments/27534109439257
- Official abilities attachment: https://support.kards.com/hc/article_attachments/27534109441561
- Official Community License: https://support.kards.com/hc/en-us/articles/360027838532-KARDS-Community-License
- KardsGen: https://github.com/Lasereyes5/KardsGen
- CraftSoul/kards-image-tool: https://github.com/CraftSoul/kards-image-tool
- KARDS-Assets: https://github.com/Gary-nope/KARDS-Assets

## 2026-07-03 Stage 1 Implementation

- Created branch `codex/kards-precision-layout` from `master` commit `b9254b9e18699d6a98213336ceba58d53588c7d8`.
- Added `src/canvas/layout.ts` as the single source of truth for the fixed 500x702 card-face geometry.
- Unit cards now use the KardsGen-style main artwork rect `12,99,476,426`, title/name bar `98,13,390,86`, cost board `12,13,86,86`, nation mark centered near `450,52`, stat boards around the official row, and footer rarity/set anchors.
- Orders and countermeasures now use the taller command artwork rect `12,13,476,476`, command type mark around `222,448`, and text/title area below the art.
- HQ cards now share the command artwork area but use a separate HQ defense board around `166,343,168,112` and do not draw deployment/operation cost.
- Replaced the previous generic card renderer flow with template-driven draw steps: base mat, artwork, name/extra border, cost, nation, frame, rarity, set, stats/type, text, print wear.
- Updated `CardCanvas` artwork drag hit testing to call `getArtworkRect(card.kind)`, so crop dragging follows the current visual template instead of the old one-size rect.
- Updated nation presets toward the KardsGen/official evidence palette and added France, Italy, Poland, Finland, and Neutral as selectable countries.
- Added focused Vitest coverage for the fixed geometry and render behavior.

## 2026-07-03 Review Fixes

- Independent code review found one P1 issue: keyword cards could draw a fourth body line into the rarity/footer area because body text was painted after rarity.
- Fixed by adding `bodyBottomY` to the template text geometry and computing the allowed body line count from that bottom boundary.
- Independent review also found that `extraBorder.height` was ignored by `drawExtraBorder`; fixed the renderer to use the layout table height directly.
- Added `isPointInsideArtwork(kind, x, y)` in the layout module and used it from `CardCanvas`, so artwork hit testing has the same single source of truth as rendering.
- Added regression tests for body/footer separation, lower border height, blank keyword lines, and kind-specific artwork hit zones.

## 2026-07-03 Validation Snapshot

- `npm run typecheck`: passed.
- `npm run test`: passed, 4 test files and 25 tests.
- `npm run build`: passed, Vite production build generated `dist/`.
- Browser smoke on existing Vite server `http://127.0.0.1:5173/?smoke=stage1`: passed.
  - Canvas size: `500x702`.
  - Canvas was nonblank: `350765` non-transparent pixels, `350999` non-white pixels.
  - PNG export path alive: `canvas.toDataURL("image/png")` length `122990`.
  - Console errors/warnings: none.
  - Network requests: 22/22 returned 200.
  - Screenshot evidence: `.runtime/qa/stage1-precision-layout-isolated.png`.
- Pending before final closeout: commit and integration decision.
