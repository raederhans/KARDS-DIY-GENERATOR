# KARDS Official-Style Card Face Research

## Conclusion

The user is right: the current MVP is not a precise KARDS card-face replica. It keeps the correct `500x702` output size, but the visual grammar is wrong. The official card face is not a fantasy-style framed card with a centered title and large badge. It is a compact military dossier-style layout with a narrow header, large artwork, floating stat row, flat ability text block, rarity pips, and a small set mark.

The next implementation should replace the current hand-styled Canvas renderer with a fixed-template renderer based on KardsGen's coordinate model and official support/news evidence.

## Official Evidence

Primary sources:

- KARDS support "Cards" states that the static view contains deployment/operation costs, stats, abilities, and rarity. It also states the card header contains deployment cost, operation cost, name, and nation. Orders and Countermeasures do not have operation costs.
- The official support attachments show the same static card regions: header, cost/unit info, unit stats, and unit abilities.
- KARDS support "Orders" states that Orders are identified by a small exclamation mark icon.
- KARDS support "Guard" and "Intel" confirm that ability keywords are printed below the card image.
- Official news card PNG samples show the same layout in unannotated modern cards. These are visual samples, not a written coordinate specification.

Downloaded official support attachments:

- `.runtime/research/official/static-view.png`: 800x700
- `.runtime/research/official/cost-unit-info.png`: 550x250
- `.runtime/research/official/unit-stats.png`: 550x300
- `.runtime/research/official/unit-abilities.png`: 550x300

Sample official/news card evidence captured during research:

- `.runtime/research/subagents/sturm_brigade_rhodos.png`: unit card sample from KARDS news image URL `https://www.datocms-assets.com/120590/1715689052-card_unit_sturm_brigade_rhodos.png`.
- `.runtime/research/subagents/covert_operation.png`: order/event card sample from KARDS news image URL `https://www.datocms-assets.com/120590/1715689168-card_event_covert_operation.png`.

Measured official support card body:

- Non-red card pixels in `static-view.png`: approximately `426x598`, aspect `0.712`.
- Existing output size `500x702` has aspect `0.712`, so the canvas size is acceptable.

## Visual Structure To Match

### Unit Cards

- Canvas: `500x702`.
- Main artwork:
  - KardsGen draws unit artwork at `x=12, y=99, w=476, h=426`.
  - Official screenshots show the artwork beginning directly below the header and occupying most of the card.
- Header:
  - Cost board at the top-left.
  - Deployment cost is large.
  - Operation cost is smaller and attached to the deployment cost board for unit cards.
  - Card name sits on a horizontal nation-colored name bar.
  - Nation icon sits at the top-right, around center `(450, 52)` in KardsGen.
- Stat row:
  - Attack board around `x=88, y=468`.
  - Type icon around `x=208, y=473`.
  - Defense board around `x=330, y=473`.
  - Fighter/Bomber/Artillery use a special attack board around `x=82, y=468` in KardsGen.
- Text:
  - Unit title is in the top name bar.
  - Ability keyword and body text are below the image/stat row.
  - KardsGen draws keyword/body around y `552` with centered text.
- Footer:
  - Rarity icon around `x=222, y=675`.
  - Set icon aligned near bottom-right, computed from right edge around `(488, 692)`.

### Orders And Countermeasures

- No operation cost.
- Artwork begins higher than unit cards.
  - KardsGen uses `x=12, y=13, w=476, h=476` for non-unit artwork.
- Extra lower border is drawn instead of the unit name bar.
- Name is printed in the lower text area, not in the top name bar.
- Type icon is the small order/countermeasure symbol, with Orders identified by a small exclamation mark according to official support.
- No attack/defense stat boards.

### HQ Cards

- HQ needs a separate template.
- KardsGen uses a large HQ board at `x=166, y=343` and draws HQ defense there.
- HQ should not be squeezed through the unit template.

## Reference Project Findings

### Lasereyes5/KardsGen

Useful:

- Confirms a practical `500x702` generation target because its `Material/frame.png` is exactly `500x702`.
- `CardGen.Generate(...)` gives a concrete draw order:
  1. artwork
  2. name bar or extra border
  3. Kredit board
  4. nation icon
  5. frame
  6. rarity
  7. set
  8. values
  9. type icon
  10. text
- Provides fixed coordinates that should become the first exact-layout pass.
- Provides nation colors close to the KARDS title bars.

Limits:

- KardsGen code is MIT, but its README says images/icons are taken from KARDS official card/site materials. Its own disclaimer says official game elements remain the original rights holder's property.
- Therefore the KardsGen software license and the KARDS IP rights must be separated. Its code and coordinate logic are useful reference material under that repository's license, but its bundled official-derived assets should not be copied into our default public app without explicit authorization or a clearly user-supplied, local-only research boundary.

### CraftSoul/kards-image-tool

Useful:

- Confirms the official card-image URL pattern through `www.kards.com/images/card/...` behind `images.weserv.nl`.
- Confirms `500x702` is used for card-image composition in browser Canvas.
- Shows browser-side image loading, round-corner clipping, and PNG export paths.

Limits:

- It is a card browser/deck builder, not a custom card-face renderer.
- It should inform image loading/export and official card data references, not the custom layout renderer.

### Gary-nope/KARDS-Assets

Useful:

- Good model for asset organization and generated asset indexes.
- Contains directories for UI icons, card backs, medals, audio, and data.

Limits:

- README explicitly says the hosted game assets belong to 1939 Games and are for personal/non-commercial fan use.
- Some assets include community/third-party author metadata, so it is not a clean "official asset license" source.
- It should be treated as optional local research/asset-pack reference, not a default bundled dependency.

## Current Implementation Gap

High-impact mismatches:

- The current title is centered in a decorative top region; official unit title lives in a narrow horizontal nation-colored header bar.
- The current nation mark is a large circular badge with text/star substitutes; official uses compact nation icons at the top-right.
- The current artwork rectangle is `52,144,396,258`; KardsGen and official card evidence require much larger artwork areas, usually `12,99,476,426` for units and `12,13,476,476` for Orders/Countermeasures.
- The current separator line and fantasy-style body card are not official.
- The current stat shields sit near the footer; official stat boards overlap the lower artwork/text boundary around y `468`.
- The current footer prints card type and set mark in the center; official has rarity pips centered near bottom and a small set mark near bottom-right.
- The current body uses Georgia/Times-style typography; official/KardsGen uses a condensed bold sans-like card font. KardsGen also includes a font note image, so typography needs an explicit decision.
- The current renderer draws all assets procedurally. Precision replication needs template image layers or a local asset-pack boundary.
- The current model has only `keywordLine?: string` plus `body: string`. Official support describes abilities, keywords, deployment effects, and triggers, so the current data model cannot fully express multi-keyword, trigger, icon, or value-mixed rules text. This does not need full gameplay logic, but it matters for visual replication.

## Implementation Direction

The smallest honest path is a two-stage correction, so implementation does not guess too much at once.

Stage 1, low-risk geometry pass:

1. Keep `CARD_WIDTH=500`, `CARD_HEIGHT=702`.
2. Add a renderer layout table with separate `unit`, `order/countermeasure`, and `hq` coordinate sets.
3. Replace the current visual order with KardsGen's draw order.
4. Keep `renderCard(...)` as the public renderer API.
5. Use programmatic placeholder layers that follow the official/KardsGen geometry. These placeholders should be clearly approximate and should not pretend to be official assets.
6. Add tests for layout selection, fixed dimensions, and key region positions.

Stage 2, gated asset-pack research mode:

1. Add an asset resolver interface that can later receive user-provided local assets:
   - frame
   - cost board
   - name splitter
   - extra lower border
   - stat boards
   - type icons
   - nation icons
   - rarity icons
   - set icons
2. Keep the asset-pack UX disabled or minimal by default until the legal/product boundary is explicit.
3. If enabled later, show a clear risk notice and keep official-derived files outside git and outside the default public build.
4. Add image regression tests only against project-owned/generic fixtures unless the user supplies local references for private comparison.

## Asset Policy Decision

For a near-pixel visual match, official-derived or equivalently accurate frame/icon/template assets are likely required. Hand-drawn Canvas shapes can fix geometry, but they will remain an approximation.

Conservative policy:

- Do not bundle official KARDS assets into the default app.
- Treat KARDS Community License as restrictive, not as blanket approval. The official policy allows some non-commercial fan projects, but it also warns against unauthorized games/apps using KARDS IP such as card images or UI elements.
- Provide a local "asset pack import" mechanism only as a boundary that keeps official-derived files out of the repository and default distribution. This reduces redistribution risk; it does not magically grant rights for public sharing or commercial use.
- Add a visible non-commercial fan-project disclaimer if any official-style or official-derived assets are used.
- Keep all official-derived assets outside git unless the user later explicitly accepts a different distribution model and its legal risk.

## Next Engineering Step

Build Stage 1 first:

- Add `src/canvas/layout.ts` for fixed coordinates.
- Refactor `src/canvas/cardRenderer.ts` to use those coordinates while preserving `renderCard(...)`.
- Keep placeholder visual layers programmatic but align their geometry with official/KardsGen zones.
- Update tests around dimensions, layout selection, and key drawing regions.
- Defer asset-pack import UX to Stage 2.

This should be done before further UI polish. Changing only CSS or colors will not fix the problem.
