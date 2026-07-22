# Context

## Final truth

- 公开参考包包含 69 张普通卡；每张保留英文完整 JSON，并新增一份中文标题、正文和关键词语言覆盖。
- 69 张普通卡同时具有英文 PNG 与中文 AVIF 整卡参考图。
- 5 张总部卡具有内嵌中英文内容、英文项目渲染 PNG 和原有中文参考 PNG。
- 所有示例通过统一语言解析契约选择内容和参考图。

## Decisions and evidence

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-21 | 69 个普通示例均能按稳定 `cardId` 对应本地上游双语数据 | 用生成脚本保持公开双语资源可复验，避免人工逐卡漂移 |
| 2026-07-21 | 10 张卡的正文在中英文上游数据中都为空 | 将其视为合法空正文，而不是翻译缺失 |
| 2026-07-21 | 用户编辑与样例语言刷新需要不同所有权 | 仅未编辑的已加载示例随语言切换；发生编辑后只切 UI 和参考图 |
| 2026-07-21 | `.runtime/releases` 会被 Vitest 默认递归发现 | 测试入口显式排除 `.runtime/**`，避免历史快照污染当前测试 |
| 2026-07-21 | 普通卡与总部卡的中英切换均通过真实浏览器验证 | 保留静态资源检查之外的交互证据 |

## Validation summary

- `npm run samples:bilingual:check`: 69 份中文覆盖和 69 张中文参考图通过。
- `npm run samples:hq:en:check`: 5 张英文总部参考图通过。
- `npm run validate`: 269 个 Vitest 测试、26 个 Python 契约测试、TypeScript、Vite build 和 dist 私有边界检查通过。
- HTTP 200: 根页面、中文示例 JSON、中文普通卡图、英文总部卡图。
- Browser smoke: `无心漫谈` 与 `华盛顿` 的标题、正文、参考图双向切换通过；编辑保护通过。

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| Local UI `http://127.0.0.1:5173/` | `/root` | `.runtime/local-ui.log` | running; retained for user inspection |

## Handoff

本任务没有创建提交。工作树仍包含用户先前的预览、导出、样式与启动脚本改动；收口时未回退或重写这些内容。
