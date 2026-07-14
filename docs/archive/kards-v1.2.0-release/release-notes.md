# KARDS Card Forge v1.2.0 — Chinese Factions Update

## 简体中文

`v1.2.0` 是向后兼容的功能更新，为卡牌编辑器加入中华民国与中共两个可选阵营，并保持现有卡牌数据、渲染和导出流程不变。

### 主要改进

- 新增“中华民国”和“中共”阵营选项，以及各自低饱和、易区分的卡面配色。
- 每个阵营加入步兵、坦克、战斗机、轰炸机、炮兵、指令和反制共 7 种右上角徽标，共 14 张新图标。
- 陆军、空军和炮兵使用明确不同的外形；中共炮兵使用单独的炮兵构图。
- 总部卡继续只采用阵营配色，不显示阵营徽标。
- 所有新徽标继续使用现有资源清单和渲染选择器，没有引入阵营专用渲染分支。

### 图形来源与边界

新徽标以 Wikimedia Commons 上的公有领域简单几何或作者释放的公有领域图形为参考，并与项目自制的背板、翼形、圆环和炮兵构图重新组合。成品没有保留锤子镰刀细节，也没有保留年代较晚的“八一”文字，不是官方徽标的直接复制。

公有领域版权状态不等于获得各地对官方标志、商标或其他非版权权利的许可。具体来源和转换说明见应用随附的 `public/THIRD-PARTY-NOTICES.txt`。

### Release 资产

本 Release 继续只附带纯代码压缩包和 SHA-256 校验文件。压缩包排除 `public/reference-pack/v1/**`、`public/brand/**`、`public/artwork/**`、`public/favicon.svg` 和维护者专用托管配置，不提供完整 `dist` 或独立参考素材包。

GitHub 自动生成的源码归档仍会反映标签中已跟踪的文件；文件存在于仓库或自动归档中不代表获得资源使用或再分发权。

## English

`v1.2.0` is a backward-compatible feature update that adds Republic of China and Chinese Communist Forces as selectable factions without changing the existing card-data, rendering, or export contracts.

### Highlights

- Added Republic of China and Chinese Communist Forces faction options with distinct muted card palettes.
- Added seven top-right marks per faction for Infantry, Tank, Fighter, Bomber, Artillery, Order, and Countermeasure cards, for 14 new icons in total.
- Ground, air, and artillery marks use visibly different silhouettes; the Chinese Communist artillery mark has its own artillery composition.
- HQ cards continue to use the selected faction palette without displaying a nation mark.
- All new marks use the existing asset manifest and renderer selector system; no faction-specific rendering branch was added.

### Source geometry and limits

The new marks reference public-domain simple geometry or author-released public-domain artwork from Wikimedia Commons, recomposed with project-authored backplates, wings, rings, and artillery shapes. The finished marks omit hammer-and-sickle details and the historically later “八一” text and are not direct reproductions of official insignia.

Public-domain copyright status does not grant trademark, official-insignia, or other non-copyright rights that may apply in a particular jurisdiction. Source and transformation details are included in `public/THIRD-PARTY-NOTICES.txt`.

### Release assets

This Release continues to attach only a code-only archive and its SHA-256 checksum. The archive excludes `public/reference-pack/v1/**`, `public/brand/**`, `public/artwork/**`, `public/favicon.svg`, and maintainer-specific hosting metadata; it does not include a complete `dist` or standalone reference pack.

GitHub-generated source archives still reflect tracked files at the tag; presence in the repository or automatic archive is not a grant of resource-use or redistribution rights.
