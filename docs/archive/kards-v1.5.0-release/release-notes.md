# KARDS Card Forge v1.5.0 — Adaptive Text Update

## 简体中文

### 主要改进

- 标题和正文现在由同一个 Canvas 渲染器报告“适合”“已调整”或“已截断”状态，不再只在画面中静默缩小或省略。
- 自动适配会从现有人工字号、横纵缩放、偏移和标题粗体设置开始计算，但不会改写卡牌数据或撤销/重做历史。
- 正文继续按固定区域换行和缩小；达到最小字号后只在最后可见行省略。标题继续保持官方风格的单行区域。
- 截断按 Unicode grapheme 边界处理，可避免切断 CJK 字符或 emoji 组合。
- 导出前会等待字体和最新文本布局报告，并用实际导出渲染结果再次核对，降低预览与导出不一致的风险。

### 可访问性与限制

- 中英文字段提供可读状态，并显示请求字号与最终字号；导出面板会明确警告仍然截断的标题或正文。
- 本版不宣称跨操作系统像素完全一致，也不把人工偏移解释成内容截断。
- 浏览器需要原生 `Intl.Segmenter` 才能提供完整的 grapheme 安全保证。

### Release 资产

- 本版没有增加依赖或公共卡图，资源权利边界保持不变。
- Release 附带纯代码 ZIP 和 `SHA256SUMS.txt`，继续排除参考包、项目品牌图片、卡图、维护者托管配置和私有运行时数据。

## English

### Highlights

- Title and body layout now report `fits`, `adjusted`, or `truncated` from the shared Canvas renderer instead of silently shrinking or ellipsizing.
- Adaptive fitting starts from the existing manual font size, X/Y scale, offsets, and title weight without rewriting card data or Undo/Redo history.
- Body copy still wraps and shrinks inside its fixed region, with ellipsis limited to the last visible line at minimum size. The official-style title remains a single line.
- Truncation follows Unicode grapheme boundaries to avoid cutting CJK characters or composed emoji.
- Export waits for fonts and a fresh layout report, then compares the authoritative export render before delivering the file.

### Accessibility and limits

- Chinese and English fields expose readable status plus requested and resolved sizes; export warnings identify any remaining title or body truncation.
- This release does not claim cross-platform pixel identity and does not classify deliberate manual offsets as content truncation.
- Full grapheme safety requires native `Intl.Segmenter` support.

### Release assets

- No dependency or public card image is added, so the resource-rights boundary is unchanged.
- The Release includes a code-only ZIP and `SHA256SUMS.txt`, excluding reference packs, project brand images, artwork, maintainer hosting metadata, and private runtime data.
