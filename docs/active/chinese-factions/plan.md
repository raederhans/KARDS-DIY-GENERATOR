# Chinese factions implementation plan

## Goal

Add two selectable factions, Republic of China (`roc`) and Chinese Communist forces (`ccp`), using the existing KARDS card-face system. Each faction must have a coherent card palette and distinct unit nation marks for infantry, tank, fighter, bomber, and artillery. Headquarters cards are out of scope and must not receive these factions.

## Design decision

- Match the existing printed military-emblem language: compact silhouette, limited colors, transparent background, readable at the current top-right nation-mark size.
- Republic of China: simplified white-sun family, with wings for aircraft and a gun-wheel motif for artillery.
- Chinese Communist forces: simplified red-star family, with wings for aircraft and a gun-wheel motif for artillery.
- Treat the Chinese Communist air marks as game-specific branch identifiers, not a claim of strict Second World War historical insignia.
- Reuse the current nation-mark asset selector and existing tests; do not add a second emblem system or a new dependency.

## Phases

1. Map the existing nation/palette/asset/HQ flow and establish test failures for the new contract.
2. Add faction presets, localized labels, and the no-HQ selection constraint.
3. Create deterministic transparent PNG nation marks and register them in the public asset pack.
4. Run focused tests, typecheck/build, and inspect representative rendered cards.
5. Complete three independent reviews, apply verified fixes, run `npm run validate`, commit with Lore trailers, merge to `main`, push, and archive this task record.

## Acceptance criteria

- Both factions appear in the faction selector for all non-HQ card kinds.
- Neither faction can be selected or retained for HQ cards.
- Infantry/tank, fighter/bomber, and artillery marks are visually distinguishable for each faction.
- The right-top nation mark uses the correct faction/kind asset from the public pack.
- Palette changes are visible in the frame/name-bar treatment and remain legible.
- Project JSON normalization accepts both faction IDs without changing the schema version.
- Existing factions and exports remain unchanged.

## Source of truth

This plan records intent. If repository behavior differs, record the difference in `context.md` and follow the code plus fresh tests.
