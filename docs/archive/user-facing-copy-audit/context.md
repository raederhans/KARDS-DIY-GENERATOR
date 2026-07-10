# Context

## 2026-07-10 — task start

- Repository is clean on `main` at `2ac6783`; `origin/main` is aligned and only the main worktree exists.
- The request covers user-visible UI text, README, and current explanatory files.
- `ai-slop-cleaner` applies because the work is a bounded copy cleanup with behavior preservation. The `doc` skill was inspected but does not apply because there are no DOCX files in scope.
- External review baseline: W3C recommends clear headings, meaningful links, short sentences and paragraphs, familiar words, clear instructions, and actionable errors. Digital.gov recommends audience-first structure, active voice, present tense, short sections, and early testing.
- The previous README was maintainer-first and mostly accurate, but its local-library and reference descriptions were stale. It opened with scope exclusions and implementation details before giving users a short start path.
- Current task uses the main checkout. No parallel worktree or live test owner is active yet.

## 2026-07-10 — audit baseline

- Focused baseline passed: `src/i18n.test.ts`, `src/components/FieldPanel.test.ts`, and `src/components/ProjectPanel.test.ts` ran 36 tests with no failures.
- Three independent read-only reviews agreed on the main defects: inconsistent names for the same concepts, implementation terms in primary actions, errors without a next step, Chinese UI paths that can expose English runtime details, and stale README/roadmap claims.
- The UI text objects currently have matching language keys, but the test suite does not enforce that recursive contract.
- The local library list exposes internal `kind`, `nation`, and `set` IDs instead of the localized labels already used elsewhere.
- `docs/active/kards-style-replication/` is completed implementation evidence. Its historical records should be archived unchanged; its manifest example remains a current reference and should move to a stable reference-doc path.
- The main agent owns all focused tests, validation, build, and browser smoke for this task.

## 2026-07-10 — implementation pass

- The UI now uses task labels instead of implementation labels: project files replace “Project JSON” in primary actions, export settings replace “export workbench,” and reference actions state whether they change artwork or the entire card.
- Known runtime failures from style-pack loading, card-library access, image comparison, and project import now have direct English and Chinese user messages while retaining file names and manifest field names needed for repair.
- Export diagnostics localize warning details instead of appending English text to Chinese status messages.
- The local library formats card type, nation, and set with the existing preset translations instead of exposing internal IDs.
- README is now ordered around first use, the four workspace tabs, save choices, local style packs, development, and publication boundaries. Both listed production URLs returned HTTP 200 during this pass.
- The roadmap now describes the v0.3.0 baseline and removes the completed local-library workbench from future work.
- The live manifest example moved from completed implementation evidence to `docs/reference/` and was rewritten as a generic user example.
- Completed style-replication plan/context/task/research files moved unchanged to `docs/archive/kards-style-replication/`. Historical paths inside old delivery records and registry entries remain unchanged because they describe the state at the time of delivery.

## Working terminology

- Product: KARDS Card Forge / KARDS 卡牌工坊
- Main object: card / 卡牌
- User image: artwork / 卡图
- Built-in comparison content: reference / 参考
- User-selected appearance resources: local style pack / 本地风格包
- Saved reusable records: local card library / 本地卡库
- Complete editable file: project file / 项目文件
- Classification: card type / 卡种; nation / 阵营; set / 卡包

## 2026-07-10 — final review and verification

- Three independent read-only reviews checked user-facing copy, documentation truth, and copy/test quality. Confirmed findings were fixed: successful folder selection now clears an old export error, style-pack warnings no longer refer to a nonexistent position, README explains the reference actions and browser file limits precisely, and unknown runtime failures no longer expose raw English in Chinese UI.
- Exact runtime-message families and recursive Chinese/English key parity are covered by existing copy tests. The message formatter was then separated from the main UI dictionary so `src/i18n.ts` remains focused and imports stay unchanged.
- Final `npm run validate` passed 16 Vitest files / 240 tests, 13 Python private-tool contracts, TypeScript, the production build, and the strict dist/private-boundary verifier.
- The in-app browser connected, but localhost interaction was rejected by its URL security policy. Per the tool boundary, no retry or workaround was attempted. Component SSR tests, the full repository gate, and the earlier HTTP 200 probes for both production URLs provide the nonvisual evidence; desktop and narrow-screen visual reading remain the only explicit gap.
- The completed style-replication archive was hash-checked against `HEAD`; all five moved historical files are byte-equivalent. The generic current manifest example is maintained separately under `docs/reference/`.
- First-principles closeout: the shortest stable solution is a single terminology contract, direct action labels, actionable errors at the render boundary, and current user-first docs. No new dependency, fallback layer, or behavior-changing abstraction is needed.
