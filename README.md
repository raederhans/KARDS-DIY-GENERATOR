# KARDS Card Forge

KARDS Card Forge is a local static KARDS-style card-face generator. It is a
non-official, non-commercial fan utility for composing single custom card
images in the browser.

It is not a KARDS game client, deck builder, account tool, online service,
network automation tool, legality checker, or official asset downloader.

## Current Scope

- Edit card kind, nation, rarity, set mark, title, keywords, body text,
  deployment cost, operation cost, attack, defense, and HQ defense.
- Upload a local artwork image, then drag and zoom it inside the card artwork
  frame.
- Preview the card on a fixed `500x702` Canvas.
- Export the current card as PNG, JPG, or PDF.
- Export at `1x`, `2x`, or `3x`. Multi-size exports rerender the card into the
  target backing resolution, such as `1000x1404` for `2x`, instead of simply
  enlarging an already-rendered `500x702` canvas.
- Apply export-only exposure and contrast adjustments.
- Save and open a single-card project JSON file.
- Keep a lightweight `localStorage` draft. Uploaded artwork is intentionally
  not saved into the automatic draft.
- Use the browser File System Access API, when available, to save card files and
  append entries to a local card library file.
- Load a local private style pack from the user's browser session. These assets
  stay local to that session and are not part of the default public build.
- Compare the generated card against a user-supplied reference image.
- In development builds, preview private local reference samples when the local
  private pack exists.
- Switch the UI between Chinese and English.

## Tech Stack

- React 19
- TypeScript
- Vite
- Canvas 2D rendering
- Vitest
- Playwright
- GitHub Pages
- Vercel

## Project Structure

```text
src/
  App.tsx                  App shell, editor state, private preview wiring
  assetPack.ts             Local/private style-pack manifest loading
  cardModel.ts             Card defaults, normalization, and bounds
  exportCard.ts            PNG, JPG, PDF, scale, exposure, and contrast export
  localLibrary.ts          File System Access local library helpers
  storage.ts               Lightweight browser draft persistence
  visualDiff.ts            Reference image comparison metrics
  components/              Field, project, and Canvas preview panels
  canvas/                  Fixed geometry, renderer, and render assets
tools/                     Private calibration and visual smoke utilities
docs/
  active/                  Current plans, roadmap, and worktree registry
  archive/                 Completed task records
```

## Local Development

```bash
npm install
npm run dev
```

For a clean install, use:

```bash
npm ci
```

Useful checks:

```bash
npm run typecheck
npm test -- --run
npm run build
```

There is no `npm run validate` script at the moment.

## Safety Boundary

This project is not affiliated with, endorsed by, sponsored by, or approved by
1939 Games.

The default public app must not contain official KARDS assets, official fonts,
extracted game files, private local paths, or `.runtime` contents. Official or
official-derived materials belong in `.runtime` or in user-selected private
local folders only.

Do not commit or publish:

- `.runtime`
- `dist`
- `.env*`
- `.vercel`
- local private asset packs
- official assets, official fonts, or extracted game files

Do not bundle official asset names, private path strings, or user-local
`.runtime` references into the default public build.

## Deployment

Vercel uses the normal root-path Vite build with base `/`.

GitHub Pages uses `KARDS_GITHUB_PAGES=true`, which changes the Vite base to
`/KARDS/` for the project site.

Do not commit `dist` or push built files to a `gh-pages` branch. GitHub Pages is
deployed from the workflow artifact produced by `.github/workflows/deploy-pages.yml`.

## Roadmap

The current long-term roadmap is maintained in `docs/active/roadmap.md`.
