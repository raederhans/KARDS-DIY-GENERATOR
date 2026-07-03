# Lessons Learned

- Canvas editors should not autosave uploaded image data URLs into `localStorage`; keep automatic drafts lightweight and embed images only in explicit project exports.
- For exact fan-project visual replication, separate geometry evidence from asset rights: match layout with project-owned placeholders first, and keep official-derived assets out of the default build unless the distribution policy is explicit.
- For Canvas visual smoke tests, a stale Vite/HMR page can show old drawing code; verify the served source or open an isolated browser context before trusting screenshots.
- Browser-based private asset calibration should not hard-code a game install path or read Unreal pak files directly; use a user-selected manifest folder of already-exported images/fonts and keep it out of git.
- Private official-asset generators need output ownership guards: default to `.runtime`, write a marker file, and refuse to clean generated subfolders when the marker is missing.
- Element-slot visual smoke must state its scope plainly: a 37/37 crop match proves slot geometry and asset identity, not full-card typography, print wear, or complete visual equivalence.
- Coverage reports must keep source status separate from variable coverage: synthetic/layout-only samples can prove renderer stress cases, but must not be counted as extracted official pixel assets.
