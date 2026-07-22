# KARDS Card Forge v1.3.0 — Bilingual Workshop Update

## 简体中文

`v1.3.0` 是一次向后兼容的工作台更新，重点完善中英双语示例卡、本地启动、卡面细节和导出体验。

### 主要改进

- 69 张非总部示例卡现在同时提供英文与简体中文卡面内容和参考卡图；5 张总部参考卡也能按界面语言显示对应版本。
- 载入示例模板后切换界面语言，会同步刷新该模板的标题、正文、词条语言和参考卡图；手动编辑后的自定义卡不会被语言切换覆盖。
- 新增 `start-local.cmd` 和本地启动服务，可自动检查 Node/依赖、启动 UI、验证入口模块与素材清单，并输出可访问地址和日志位置。
- 卡面四角加入轻微内阴影，总部防御值位置和盾形边框调整得更接近参考样式。
- 导出页修复分辨率选项文字溢出，曝光与对比度可直接在卡面预览中查看。
- 本地目录导出会在点击导出时立即申请写权限，再开始渲染和编码，避免内嵌浏览器在延迟申请权限时退出。
- 左侧编辑栏移除重复小标题；帮助页重写说明、增加版块间距，并移除返回按钮中多余的箭头。

### 本地文件与素材

应用仍在本地浏览器中处理卡牌、卡图、项目文件、卡库和风格包。新加入的中英参考卡图属于版本化公共参考素材，只用于编辑器内的参考和模板流程；具体资源边界与使用限制仍以仓库中的 `RESOURCE-RIGHTS.md`、`public/THIRD-PARTY-NOTICES.txt` 和参考包权利说明为准。

### Release 资产

本 Release 继续只附带纯代码压缩包和 SHA-256 校验文件。压缩包排除 `public/reference-pack/v1/**`、`public/brand/**`、`public/artwork/**`、`public/favicon.svg` 和维护者专用托管配置，不提供完整 `dist` 或独立参考素材包。

GitHub 自动生成的源码归档仍会反映标签中已跟踪的文件；文件存在于仓库或自动归档中不代表获得资源使用或再分发权。

本地启动脚本面向包含参考包的完整仓库检出。纯代码 Release 附件不含参考包，不能单独作为完整素材版应用启动；请使用仓库检出或自行提供符合清单契约且有权使用的参考包。

## English

`v1.3.0` is a backward-compatible workshop update focused on bilingual samples, local startup, card-face detail, and export reliability.

### Highlights

- All 69 non-HQ samples now provide English and Simplified Chinese card content and reference images; the five HQ references also follow the selected interface language.
- Switching the interface language after loading a sample template refreshes that template's title, body, keyword language, and reference image. Manually edited custom cards are not overwritten.
- Added `start-local.cmd` and a local startup service that checks Node/dependencies, starts the UI, verifies the transformed entry module and asset manifest, and reports the reachable URL and log path.
- Added subtle inner shading at the four card corners and corrected HQ defense-value placement and shield geometry.
- Fixed export-resolution text overflow and added direct card-preview feedback for exposure and contrast controls.
- Directory export now requests write access directly from the export click before rendering and encoding, avoiding delayed permission prompts that can terminate an embedded browser view.
- Removed repeated editor subheadings, rewrote and spaced the Help page, and removed the unexplained arrow from its return action.

### Local files and resources

Cards, artwork, project files, local libraries, and style packs continue to be processed in the local browser. The new bilingual reference images are versioned public reference resources used by the editor's comparison and template workflows. Resource boundaries and use restrictions remain governed by `RESOURCE-RIGHTS.md`, `public/THIRD-PARTY-NOTICES.txt`, and the reference-pack rights notice.

### Release assets

This Release continues to attach only a code-only archive and its SHA-256 checksum. The archive excludes `public/reference-pack/v1/**`, `public/brand/**`, `public/artwork/**`, `public/favicon.svg`, and maintainer-specific hosting metadata; it does not include a complete `dist` or standalone reference pack.

GitHub-generated source archives still reflect tracked files at the tag. A file's presence in the repository or automatic archives is not a grant of resource-use or redistribution rights.

The local startup script targets a complete repository checkout that contains the reference pack. The code-only Release attachment excludes that pack and cannot start as the complete resource-enabled app by itself; use a repository checkout or provide a compatible reference pack that you are authorized to use.
