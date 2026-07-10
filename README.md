# KARDS Card Forge

Create, preview, and export custom KARDS-style cards in your browser. Editing,
image processing, and file access stay on your device.

[Open the app on Vercel](https://kards-card-forge.vercel.app/) ·
[Open the GitHub Pages build](https://raederhans.github.io/KARDS/)

KARDS Card Forge is an unofficial, non-commercial fan tool. It is not a game
client, deck builder, account tool, or official asset downloader.

## Make Your First Card

1. Edit the card fields on the left.
2. Upload artwork, or open **Reference**, choose a card, then select **Use
   artwork only**.
3. Drag the artwork to reposition it. Use the mouse wheel to zoom.
4. Use **Appearance** to adjust the paper texture or load a local style pack.
5. Open **Export**, check the status, then export PNG, JPG, or PDF.

The preview uses a fixed `500 × 702` layout. Exports at `2×` and `3×` rerender
the card at the target resolution instead of enlarging the preview.

## Workspace

The right-side workspace has four tabs:

| Tab | Use it to |
| --- | --- |
| **Appearance** | Adjust paper texture or load a local style pack. |
| **Library** | Download or open a project file, and manage a local card library. |
| **Export** | Choose format, resolution, exposure, contrast, and save location. |
| **Reference** | Search, filter, compare, and apply bundled reference cards. |

In **Reference**, selecting a row only changes the comparison card. **Use
artwork only** changes the artwork. **Load entire card** replaces the current
card. Automatic artwork matching only applies a unique match and never replaces
artwork you uploaded or chose yourself.

## Save Your Work

The three save paths have different purposes:

- The automatic draft keeps lightweight card data in browser storage. It does
  not keep uploaded artwork.
- A project file (`.card.json`) keeps the full editable card, including uploaded
  artwork. Use it when you want to continue the same card later.
- The local card library (`card-forge-library.json`) stores reusable cards in a
  folder you choose. It supports add, load, update, and delete, but does not
  embed uploaded artwork.

If the browser cannot choose a folder, exports use normal browser downloads.
If it can open a card library but cannot coordinate safe writes, browsing and
loading remain available while add, update, and delete actions are disabled.

## Local Style Packs

A local style pack is a folder that contains `kards-asset-pack.json` plus the
images and fonts listed by that file. Choose the whole folder from
**Appearance**. The selected files stay in the current browser session and are
not uploaded by the app.

Start with the
[manifest example](docs/reference/asset-pack-manifest.example.json). Use only
files you are allowed to use.

## Local Development

The project uses React, TypeScript, Vite, and Canvas 2D. Install dependencies and
start the local server:

```bash
npm ci
npm run dev
```

The CI baseline is Node.js 22 and Python 3.12. Install the Python test
dependencies before running the full repository gate:

```bash
py -3 -m pip install -r requirements-dev.txt  # Windows
python3 -m pip install -r requirements-dev.txt # macOS or Linux
npm run validate
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm test` | Run the Vitest suite once. |
| `npm run typecheck` | Check the TypeScript projects. |
| `npm run build` | Build and verify the exact public `dist` output. |
| `npm run validate` | Run tests, private-tool contracts, typecheck, build, and artifact checks. |

## Project Map

```text
src/
  App.tsx                  Editor state and reference wiring
  components/              Field, preview, workspace, and library UI
  canvas/                  Fixed card geometry and renderer
  assetPack.ts             Bundled and local style-pack loading
  exportCard.ts            PNG, JPG, and PDF export pipeline
  localLibrary.ts          Local card-library file operations
  storage.ts               Lightweight browser draft
tools/                     Build-boundary and calibration checks
docs/active/               Current roadmap and worktree registry
docs/archive/              Completed implementation records
```

## Publication Boundary

This project is not affiliated with, endorsed by, sponsored by, or approved by
1939 Games.

KARDS-derived and reference resources in the public build are limited to the
versioned files under `public/reference-pack/v1`. Declared app support assets
are tracked separately. Local style packs, private calibration files,
`.runtime`, environment files, and generated `dist` output must not be
committed.

Always use `npm run build` for a publish build. It checks the exact `dist`
directory for unexpected reference files, private paths, credentials, and other
release-boundary violations. GitHub Pages publishes the verified workflow
artifact; do not push a separate `gh-pages` build.

See the current [roadmap](docs/active/roadmap.md) for planned work.
