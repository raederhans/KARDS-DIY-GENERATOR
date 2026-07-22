# KARDS Card Forge v1.4.0 — Editor Quality Update

## 简体中文

### 主要改进

- 加入有界撤销/重做历史，以及顶部按钮和标准键盘快捷键。
- 视觉差异现在显示检查等级、通道阈值和变化区域坐标，便于定位需要人工复核的像素。
- 加入五种外观预设：平衡纸感、旧化纸张、标题突出、清晰阅读和紧凑文字。预设只修改现有的可序列化外观字段。
- Canvas 预览新增可读卡牌摘要；卡图裁剪数字框和滑杆继续提供键盘替代操作。

### 可访问性与限制

- Undo/Redo、工作台标签、预设和视觉差异结果都有明确名称与键盘路径。
- 视觉差异是复核信号，不是自动通过/失败判定。
- 本版不宣称全面符合 WCAG；读屏、缩放和对比度仍需人工检查。

### 参考素材边界

- 本版没有新增公共卡图，公开目录仍为 74 张参考卡。
- 候选素材只有在双语 JSON/图片、来源、SHA-256、权利记录、目录和构建闭环全部完成后才会进入公开包。

### Release 资产

- Release 附带纯代码 ZIP 和 `SHA256SUMS.txt`。
- 纯代码包继续排除参考包、项目品牌图片、卡图、维护者托管配置和私有运行时数据。

## English

### Highlights

- Adds bounded Undo/Redo history with visible controls and standard keyboard shortcuts.
- Visual comparison now reports a review level, channel threshold, and changed-area coordinates for human inspection.
- Adds five appearance presets: Balanced paper, Weathered stock, Headline forward, Clear reading, and Compact copy. Presets only change existing serialized appearance fields.
- Associates the Canvas preview with a readable card summary while keeping crop fields and sliders as keyboard alternatives.

### Accessibility and limits

- Undo/Redo, workspace tabs, presets, and visual-difference results have clear names and keyboard paths.
- Visual differences are review signals, not automatic pass/fail decisions.
- This release does not claim full WCAG conformance; screen-reader behavior, zoom, and contrast still require human review.

### Reference-resource boundary

- This release adds no public card images; the public catalog remains at 74 reference cards.
- A candidate enters the public pack only after bilingual JSON/images, source identity, SHA-256, rights, catalog, and build closure are complete.

### Release assets

- The Release includes a code-only ZIP and `SHA256SUMS.txt`.
- The code-only archive continues to exclude the reference pack, project brand images, artwork, maintainer hosting metadata, and private runtime data.
