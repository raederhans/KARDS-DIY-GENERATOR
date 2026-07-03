# Lessons Learned

- Canvas editors should not autosave uploaded image data URLs into `localStorage`; keep automatic drafts lightweight and embed images only in explicit project exports.
- For exact fan-project visual replication, separate geometry evidence from asset rights: match layout with project-owned placeholders first, and keep official-derived assets out of the default build unless the distribution policy is explicit.
- For Canvas visual smoke tests, a stale Vite/HMR page can show old drawing code; verify the served source or open an isolated browser context before trusting screenshots.
- Browser-based private asset calibration should not hard-code a game install path or read Unreal pak files directly; use a user-selected manifest folder of already-exported images/fonts and keep it out of git.
