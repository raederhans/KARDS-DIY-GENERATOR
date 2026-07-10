# Task

- [x] 建立工作树、留档并通过基线验证
- [x] 完成参考元数据、筛选、排序和唯一匹配测试与实现
- [x] 完成 artwork 来源状态和异步保护测试与实现
- [x] 完成本地卡库规范化与 CRUD 测试和实现
- [x] 完成结构化导出诊断测试和实现
- [x] 完成四标签工作台、App 状态接线和存储偏好
- [x] 完成目标测试、typecheck、全量 validate、Pages 构建、audit 和 browser smoke
- [x] 完成代码、架构、测试三轮独立复核并修复发现
- [ ] 提交、整合 main、合并后验证、推送、归档并清理 worktree

## 交付包

1. 改动摘要
   - 将右栏改为常驻挂载的外观、卡库、导出、参考四标签工作台，保留固定底部重置与输出摘要。
   - 增加参考 AND 筛选、三种稳定排序、唯一自动卡图匹配、用户来源保护和失败竞态清理。
   - 完成 v1 单文件本地卡库 CRUD、Web Lock 锁内重读、旧 ID 修复、只读模式、目录句柄记忆与损坏文件保护。
   - 增加一次渲染的结构化导出诊断、稳定 phase/code、实际结果元数据和目录/下载不同完成语义。
   - 扩展现有六个测试入口并完成键盘、并发、损坏数据、异步覆盖和导出交付回归。
2. 文件分组
   - 核心文件：`src/App.tsx`、`src/cardEditorState.ts`、`src/devPreviewCatalog.ts`、`src/devPreviewState.ts`、`src/localLibrary.ts`、`src/exportCard.ts`、`src/storage.ts`、`src/i18n.ts`。
   - UI 文件：`src/components/ProjectPanel.tsx`、`src/components/LocalLibraryWorkbench.tsx`、`src/components/ReferenceWorkbench.tsx`、`src/styles.css`。
   - 测试文件：`src/cardModel.test.ts`、`src/devPreviewCatalog.test.ts`、`src/localLibrary.test.ts`、`src/exportCard.test.ts`、`src/components/ProjectPanel.test.ts`、`src/storage.test.ts`。
   - 文档文件：本目录三份记录和 `docs/active/_worktree_registry.md`；没有需要提交的临时文件。
3. Diff 摘要：相对 base 共 23 个产品、测试、留档和经验记录文件有变更，约 2920 行新增、499 行删除；未增加依赖，未修改 README、公开授权展示或发布边界。
4. Commit 状态：功能工作树将在本交付包完成后按 Lore protocol 提交；提交前保持单一可审查 diff。
5. Base 分叉：base `a8f6f2e447bb3ca09da296bbf154bc709bfad115`；整合检查时 `main`、`origin/main` 和 feature base 三者一致，未分叉。
6. 冲突分析：当前仅 main 与本 feature worktree；main 干净且 changed-files 交集为空，评级绿色。语义热点集中在 App 状态、右栏、持久化和导出，但没有并行修改者。
7. 验证：目标回归 72/72；最终 `npm run validate` 通过 16 个文件、233 个 Vitest、13 个 Python 契约、TypeScript、Vite build 与 dist verifier；Pages 模式 build 通过；`npm audit --audit-level=moderate` 为 0；有限浏览器 smoke 通过四标签、状态保留、键盘切换、窄屏布局、真实下载触发和零 console warning/error。
8. 尚未验证风险：自动化环境不能真实确认不同浏览器的原生目录选择授权弹窗；Web Lock 跨标签页竞争通过确定性单元测试验证，未做人工双标签操作。
9. 推荐下一步：在干净且最新的 main 上 `--ff-only` 合并整个 feature commit；不需要 rebase 或部分 cherry-pick。
10. 可整合性：三名独立复核者已分别批准架构、代码正确性和测试充分性；当前状态为 ready-for-integration。
