# Attack reticle fidelity context

## 2026-07-12 — task start

- Base: `main` at `048bd085b3f2127bcdea7689da78632562a209df`, aligned with `origin/main`.
- Worktrees: one main checkout only; no cross-worktree integration required.
- Live-process owner: primary agent owns Vite at `http://127.0.0.1:5173/`; current server logs remain under `.runtime/dev-server-default-artwork/`.
- Independent audit lanes:
  - `faction_reference_audit`: original-card visual reference survey.
  - `faction_extraction_audit`: renderer/layout/asset/extraction root-cause audit.
  - `faction_test_review`: regression-test contract audit.
- Initial direct evidence from `spitfire_mk_v`, `fokker_d_xxi`, `b29_superfortress`, and `a26_invader`: aircraft attack boards are circular reticles with transparent centers and four short ticks.
- Initial direct evidence from `wespe` and `french_75`: artillery uses the same inverted-shield attack board as ordinary ground units, not an aircraft reticle.
- Root-cause hypothesis to verify in code: artillery is misclassified; the aircraft special board is sized as `96x82` instead of square; the authorized asset is absent from the public manifest; fallback and wear masking fill the center.
- The selected gstack browser could not start because its matching Chromium headless-shell package is missing. The task will use the project's existing browser dependency only for bounded before/after evidence if a headed connection is also unavailable.

## 2026-07-12 — reference correction and implementation

- The initial artillery interpretation above and the corresponding plan assumption were disproved by a nine-card pixel survey. Per the repository rule, the original plan remains historical; this context records the correction and current code is governed by measured references.
- Verified fighter samples: `i16_ishak`, `p40_warhawk`, `spitfire_mk_v`.
- Verified bomber samples: `g4m1_betty`, `ju_87_b_stuka`, `a26_invader`.
- Verified artillery samples: `6_pounder`, `t19_howitzer`, `wespe`.
- All nine original cards share the same attack reticle: dark solid disk bbox approximately `x=90..168, y=476..554`, pale ring approximately `x=82..176, y=468..562`, center `(129,515)`, and four pale inward cardinal notches. Artillery must remain in the shared special-attack routing.
- The center is intentionally dark and opaque. The standalone 94×94 KardsGen icon confirms the same dark disk plus pale ring; “transparent center” in the initial hypothesis referred to a different ring-only candidate and is not the full rendered attack board.
- Root cause confirmed: the shared slot was `96×82` at center `(130,509)`; fallback used a 3 px rounded outline rather than a circular 8 px ring; the attack number was offset for the old compressed slot; the wear mask repeated the wrong silhouette.
- Chosen fix: one shared 94×94 programmatic reticle for fighter/bomber/artillery, centered at `(129,515)`, with an opaque 78–79 px dark disk, 8 px pale ring, and four 8×14 px cardinal notches. No new public bitmap was added because the KardsGen material rights note keeps that candidate private/non-commercial.
- TDD RED observed: four frontend failures exposed the old size/center/path/wear behavior; one Python failure exposed the old private extraction size.
- GREEN evidence: focused layout/renderer suites passed 66/66; the named Python geometry contract passed; full private-tool suite passed 26/26; TypeScript passed.
- Browser evidence captured through the existing Playwright + system Edge path after gstack's pinned Chromium was unavailable. Before/after screenshots and the external design audit are stored under `C:\Users\raede\.gstack\projects\kards\designs\design-audit-20260712-reticle\`.
- Full `npm run validate` completed successfully: 17 Vitest files / 255 tests, 26 private-tool contracts, TypeScript, Vite build, and strict dist/private boundary.

## 2026-07-12 — final visual and architecture review

- A measured color pass found the geometry correct but the initial fallback too bright because it reused global UI colors. Reticle-only tokens now match the nine-card medians: disk `#373933`, ring/notches `#b9b7a2`, and value `#c1c3bc`; body text remains `#4f514c`.
- The accidental intermediate replacement of body text color was reproduced by the focused test, corrected at the source, and locked with emphasized/plain body color assertions.
- The wear-protected stat-board type excludes `reticle`, so a future accidental call cannot silently route the circular board through the shield path.
- Final system-Edge screenshots for fighter, bomber, and artillery were independently compared. Their ring masks are identical and the visible 94×94 geometry, center, notches, and colors were approved with no P0–P3 findings.
- Fresh closeout validation: `npm run validate` passed 17 Vitest files / 255 tests, 26 Python contracts, TypeScript, Vite production build, and `verify:dist-private-boundary`.
- Three independent final reviews approved the reference fidelity, architecture/rights boundary, and regression coverage. No restricted KardsGen bitmap was published.
