# Preview adjustments and HQ shield context

## Current truth

- The local Vite server is reachable at `http://127.0.0.1:5173/` and is owned by the main agent.
- Export exposure/contrast state lives in `ProjectPanel`; export pixels use a Canvas filter.
- The generated preview canvas is available through the existing `canvasRef`; CSS filtering changes display only and does not mutate canvas pixels.
- Earlier HQ work calibrated a full shield at `(166,343)` with a `104px` value centered near `y=420.5`, but the current live screenshot requires a fresh geometry audit.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-21 | Added a shared normalized filter helper and preview-canvas effect. | Preview and export use the same brightness/contrast values without double-applying export pixels. |
| 2026-07-21 | User added HQ value-position and shield-shape feedback before the first stage closed. | Expanded this record to a second renderer stage; no earlier work is discarded. |
| 2026-07-21 | Local Danzig HQ reference shows a square top edge and a continuous U-shaped lower shield; current value used an extra `-12px` offset. | Removed the offset, repaired fallback geometry, and draw the fallback under the optional board asset to fill its transparent rounded top corners. |
| 2026-07-22 | A clean Playwright session reached the running UI and exercised the export preview. | Exposure `+12` produced `brightness(112%) contrast(100%)` on the generated canvas; the reference image remained separate, and the final console had 0 errors/warnings. |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| Local Vite UI on 127.0.0.1:5173 | Main agent | `.runtime/local-ui.log` | Running; HTTP 200 |
| Browser visual smoke | Main agent | Temporary browser session | Complete; session closed and snapshots removed |

### Local server relaunch contract

- Owner: main agent `/root`; no other process owner is active.
- Command: `npm run local -- --no-open` from the repository root.
- Shared resources: TCP `127.0.0.1:5173`, Vite cache, `.runtime/local-ui.log`.
- Success: startup script reports ready and HTTP `/` returns 200; failure: command exits or HTTP remains unreachable.
- Stop condition: keep running for the user's local review; stop only on user request or a conflicting port handoff.

## Handoff

- Exposure/contrast and HQ geometry targeted regressions pass.
- Full tests, typecheck, production build, private-boundary verification, served-source checks, HTTP 200, and diff checks pass.
- Browser automation completed in a clean session; exposure preview, bilingual template refresh, and explicit-artwork ownership all passed with no console errors or warnings.
- The server remains running for user review; no commit or push was requested.

## Next step

Archive this completed record as part of the `v1.3.0` release candidate.
