# Worktree Registry

## KARDS GitHub initialization

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: initialize repository metadata and publish the project to GitHub
- Base branch/base commit: local `master`, `61a35d32c334af60056f585da7c7b68e9aa3885e`
- Current branch/HEAD: `main`, tracking `origin/main`
- Remote: `origin` -> `https://github.com/raederhans/KARDS` (private)
- Task goal: add basic project information, keep the publish boundary explicit, create a GitHub remote, and push the initialized project
- Status: integrated
- Main changed files:
  - `README.md`
  - `docs/active/_worktree_registry.md`
  - `docs/active/kards-style-replication/context.md`
- Shared hotspot files touched: documentation only; no runtime source, schema, renderer, tests, or build config touched
- Validation run:
  - `npm run typecheck`: passed
  - `npm run test`: passed, 4 files and 25 tests
  - `npm run build`: passed
  - `gh repo create raederhans/KARDS --private --description "Local static KARDS-style custom card-face generator" --source=. --remote=origin`: passed
  - `git push -u origin main`: passed
  - `git push`: passed for the registry verification closeout
  - `gh repo view raederhans/KARDS --json name,visibility,url,defaultBranchRef`: passed, private repo, default branch `main`
  - `git ls-remote --heads origin main`: passed, remote `main` reachable
- Tests not run: no browser smoke; this pass changed documentation only
- Potential overlap with other worktrees: none detected; `git worktree list` shows only this KARDS checkout
- Recommended integration order: publish this documentation/remote initialization after the existing Stage 1 renderer baseline
- Next action: future work can branch from `main`; no cleanup needed because this task used the main checkout only

## KARDS initial static generator

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: KARDS static card-face generator MVP
- Base branch/base commit: `master`, no prior commit
- Current branch/HEAD: `master`, committed initial baseline
- Task goal: create a local static React/Vite card-face editor with Canvas preview and PNG/JSON export
- Status: integrated
- Main changed files:
  - `src/App.tsx`
  - `src/components/CardCanvas.tsx`
  - `src/components/FieldPanel.tsx`
  - `src/components/ProjectPanel.tsx`
  - `src/canvas/cardRenderer.ts`
  - `src/cardModel.ts`
  - `src/storage.ts`
  - `src/limits.ts`
  - `src/*.test.ts`
  - `package.json`, `package-lock.json`, `vite.config.ts`, TypeScript config, CSS, favicon, lessons learned, docs
- Shared hotspot files touched: app shell, Canvas renderer, card schema/model, project storage, build config
- Validation run:
  - `npm run test`: passed, 13 tests
  - `npm run typecheck`: passed
  - `npm run build`: passed
  - Browser smoke at `http://127.0.0.1:5173/`: passed for desktop and mobile, Canvas nonblank, PNG data URL works, autosave excludes image data URL
- Tests not run: no full E2E suite exists yet
- Potential overlap with other worktrees: none detected; `git worktree list` has not shown parallel KARDS worktrees in this checkout
- Recommended integration order: integrate this initial skeleton first before future asset-pack, preset-library, or typography refinements
- Delivery package: `docs/archive/kards-card-generator/task.md`
- Next action: published later by the GitHub initialization task; future work should branch from `main`

## KARDS official-style replication research

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: KARDS official card-face style replication research
- Base branch/base commit: `master`, `27f5ae7`
- Current branch/HEAD: `master`, research closeout committed in current HEAD
- Task goal: verify why the MVP looks unlike official KARDS cards and define the shortest low-risk path toward precise card-face replication
- Status: integrated
- Main changed files:
  - `docs/active/kards-style-replication/plan.md`
  - `docs/active/kards-style-replication/context.md`
  - `docs/active/kards-style-replication/task.md`
  - `docs/active/kards-style-replication/research.md`
  - `lessons learned.md`
- Shared hotspot files touched: none in production code; future implementation is expected to touch `src/canvas/cardRenderer.ts`, `src/presets.ts`, `src/types.ts`, `src/components/CardCanvas.tsx`, and renderer tests
- Validation run:
  - Official support images downloaded to `.runtime/research/official/` and dimensions checked
  - KardsGen `frame.png` confirmed as `500x702`
  - KardsGen `CardGen.cs`/`Material.cs`, CraftSoul `index.html`/`builder.html`, and KARDS-Assets README/index script inspected with targeted search
- Tests not run: no production code changed in this research pass
- Potential overlap with other worktrees: none detected by `git worktree list`
- Recommended integration order: this research is integrated; implement the precision layout pass as a separate follow-up
- Delivery package: `docs/active/kards-style-replication/task.md`
- Next action: implement template-driven Canvas rendering with fixed geometry and programmatic placeholder layers first; defer asset-pack UX

## KARDS official-style precision layout Stage 1

- Worktree name/path: main checkout, `C:\Users\raede\Documents\KARDS`
- Thread/task: KARDS official-style Stage 1 precision layout implementation
- Base branch/base commit: `master`, `b9254b9e18699d6a98213336ceba58d53588c7d8`
- Current branch/HEAD: `master`, integrated Stage 1 implementation commit
- Task goal: move the Canvas card face from a generic KARDS-like skin to evidence-backed official-style fixed geometry without bundling official assets
- Status: integrated
- Main changed files:
  - `src/canvas/layout.ts`
  - `src/canvas/cardRenderer.ts`
  - `src/components/CardCanvas.tsx`
  - `src/presets.ts`
  - `src/canvas/layout.test.ts`
  - `src/canvas/cardRenderer.test.ts`
  - `docs/active/kards-style-replication/plan.md`
  - `docs/active/kards-style-replication/context.md`
  - `docs/active/kards-style-replication/task.md`
  - `docs/active/_worktree_registry.md`
  - `lessons learned.md`
- Shared hotspot files touched: Canvas renderer, Canvas interaction/crop hit testing, visual presets, renderer tests, active task docs
- Validation run:
  - `npm run typecheck`: passed
  - `npm run test`: passed, 4 files and 25 tests
  - `npm run build`: passed
  - Browser smoke at `http://127.0.0.1:5173/?smoke=stage1`: passed, Canvas nonblank, PNG data URL generated, no console errors/warnings, 22/22 network requests 200
- Tests not run:
  - No full E2E suite exists
- Potential overlap with other worktrees: none detected; `git worktree list` shows only this KARDS checkout
- Recommended integration order: integrate this Stage 1 geometry pass before any asset-pack UX, official-material calibration, or typography extraction work
- Delivery package: `docs/active/kards-style-replication/task.md`
- Next action: future Stage 2 can decide the official-asset/font policy boundary before adding any asset-pack UX
