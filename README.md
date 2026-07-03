# KARDS Card Forge

KARDS Card Forge is a local static card-face generator for making custom
KARDS-style cards. It is a fan tool for editing and exporting card images; it
does not include gameplay, deck legality, account, automation, or online game
features.

## Current Scope

- Edit card kind, nation, rarity, set, title, rules text, costs, and stats.
- Preview a fixed `500x702` Canvas card face.
- Upload and crop local artwork inside the card artwork area.
- Export the current card as PNG or JSON.
- Save lightweight browser drafts in `localStorage`.
- Keep official KARDS assets, fonts, and extracted game files out of the
  default app and out of git.

## Tech Stack

- React 19
- TypeScript
- Vite
- Canvas 2D rendering
- Vitest

## Project Structure

```text
src/
  App.tsx                  App shell and editor state
  cardModel.ts             Card defaults, normalization, and bounds
  limits.ts                Text and image safety limits
  storage.ts               Browser draft persistence
  presets.ts               Card kind, nation, rarity, and set presets
  components/              Editor panels and Canvas preview component
  canvas/
    layout.ts              Fixed card-face geometry
    cardRenderer.ts        Canvas drawing pipeline
docs/
  active/                  Current plans, task notes, and worktree registry
  archive/                 Completed task records
```

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run test
npm run build
```

## Safety Boundary

This project is not affiliated with or endorsed by 1939 Games. The current
renderer uses programmatic placeholder surfaces and project-owned code only.
If official-style assets or fonts are ever added, they should be handled as a
separate, explicit policy decision and should not be silently bundled into the
default public build.

## Next Framework Steps

- Decide the asset/font policy before adding any official-derived materials.
- Add an optional local asset-pack import flow only after that policy is clear.
- Improve typography and preset coverage with focused renderer tests.
- Add a lightweight visual regression path once the card template stabilizes.
