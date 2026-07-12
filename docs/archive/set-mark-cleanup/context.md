# Context

## 2026-07-12 — investigation start

- Classified as `complex`: the defect crosses source-card pixels, private set-mark extraction, 15 authorized public assets, manifest routing, and visual verification.
- Repository has one clean worktree: `main` at `15ac497d3c469bb35843cd345e93370b7592aa2c`, aligned with `origin/main`.
- Live process owner: primary agent owns Vite PID `72956` on `http://127.0.0.1:5173/`.
- Existing lessons establish two constraints: sample background from each set-mark crop's own corners, and preserve thin-line sets with per-set rules instead of one global threshold.
- Three read-only review lanes cover source/reference fidelity, extraction data flow, and test-contract gaps. They may not operate the server, browser, tests, or builds.
- Current hypothesis is intentionally open until alpha/color inventories and exact source comparisons identify the failing boundary.

## 2026-07-12 — root cause and TDD RED

- All 15 public files hash-match Stage6 and Stage5, proving there is no publication drift. The defect originates in `extract_set_mark_subject`.
- The same corner-derived palette controls both edge-connected background removal and subject protection. Lower detailed thresholds protect more paper texture, while higher thresholds erase pale lines; palette/transparent failure also returns the original crop.
- Independent pixel review found seven severe subject/negative-space failures (`allegiance`, `blood-and-iron`, `breakthrough`, `homefront`, `theaters-of-war`, `winter-war`, `world-at-war`) and four clear fragment/edge failures (`covert-ops`, `legions`, `naval-warfare`, `special`).
- Stage6 already inventories KardsGen's clean transparent set PNGs. The local source was fast-forwarded from `518b3ed618543f1f833010e34ecd02b2e5682270` to complete revision `e3d16b54ff2f0c89ac72fa4537ca50227f6fb9c7` because the older cache lacked Oceania; Stage6 previously kept these files reference-only and published the lossy Stage5 card crops.
- TDD RED: the 22-test Python suite failed 15 assertions because all 14 visible public marks had only binary alpha, six had extra alpha components, and no clean normalization boundary existed. The targeted renderer suite failed 1/56 because the old slot was 28px wide instead of the original 30px right-bottom anchor.

## 2026-07-12 — implementation and focused GREEN

- Rejected global Stage5 threshold tuning: the same paper-adjacent colors represent both noise and legitimate pale emblem lines, so no single threshold can preserve both.
- Stage6 now delegates the 14 visible set marks to KardsGen's transparent source files, fails closed when any mapped source is absent, and records `kardsgen-clean-set-material` provenance. `only-spawnable` remains the intentional transparent Stage5 placeholder.
- Each clean source is normalized onto a transparent `30x28` canvas, bottom-right aligned to KardsGen's original `(488 - width, 692 - height)` placement with a 26px content baseline. The Canvas renderer uses the matching 30px-wide slot without changing the bottom anchor.
- The public pack was regenerated from Stage6 and all 15 set-mark files hash-match its output. The 14 visible marks each have one alpha component and 46–148 alpha levels; `only-spawnable` remains empty.
- Checkerboard and alpha contact-sheet review found no remaining paper texture or clipped subject detail in the 14 visible outputs.
- Focused GREEN: Python contract suite passed 24/24 and renderer suite passed 56/56. Full validation and three independent final reviews remain pending.

## 2026-07-12 — independent review and final verification

- Visual/source review found no dirty edges, missing subjects, or invalid mappings. All 14 visible public marks preserve the KardsGen source RGBA pixels exactly and only translate them within the transparent canvas; `special` correctly maps to `FanMade`, and `only-spawnable` correctly remains blank.
- Code review identified a compatibility regression in the first renderer candidate: a fixed 30px slot stretched legacy/custom 28x28 marks. `drawSet` now preserves native dimensions, only scales oversized images down, and right-aligns both 28px and 30px sources. The new regression test passed.
- Test review identified contracts that could accept an opaque crop or hide duplicate manifest rows. Public checks now require exact visible-set mapping, 15 unique rows/files, 30x28 geometry, the 26px content baseline, at least 300 transparent pixels, real antialiasing, and a surviving subject. Stage5 delegation covers all 14 mapped sets; provenance and missing-source failure are also locked.
- All three reviewers returned no remaining findings after the fixes.
- Final `npm run validate` passed: 17 Vitest files / 244 tests, 25 private Python contracts, TypeScript checks, Vite production build, and the dist private-boundary verifier.
- Runtime HTTP probe returned 200 with non-empty bodies for all 15 manifest set-mark URLs. Vite PID `72956` remained healthy.
