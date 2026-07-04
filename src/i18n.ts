import { DEFAULT_CARD } from "./cardModel";
import type { CardSpec } from "./types";

export const LANGUAGE_STORAGE_KEY = "card-forge:language:v1";
export const LANGUAGES = ["zh", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export const UI_TEXT = {
  en: {
    documentTitle: "Card Forge",
    documentDescription: "A local static card-face editor for creating custom war-card style images.",
    appSubtitle: "Static custom card-face generator",
    languageToggle: "中文",
    languageToggleAria: "Switch language to Chinese",
    autosavePaused: "Save JSON to keep changes",
    scopePill: "No gameplay tools",
    fieldPanel: {
      aria: "Card fields",
      heading: "Fields",
      scope: "Single card",
      artwork: "Artwork",
      artX: "Art X",
      artY: "Art Y",
      zoom: "Zoom",
      title: "Title",
      keywordLine: "Keyword line",
      body: "Body",
      nation: "Nation",
      type: "Type",
      rarity: "Rarity",
      set: "Set",
      cost: "Cost",
      operation: "Op",
      attack: "Attack",
      defense: "Defense",
      hqDefense: "HQ defense",
      invalidArtwork: "Please choose a PNG, JPEG, or WebP image under 5 MB.",
    },
    canvas: {
      aria: "Card canvas preview",
      generatedAria: "Generated card preview",
      generated: "Generated",
      officialReferenceAlt: "Official reference card",
      officialReference: "Official reference",
      officialReferenceWithLabel: (label: string) => `Official reference: ${label}`,
      hint: "Drag uploaded artwork inside the frame. Use the mouse wheel over artwork to zoom.",
    },
    projectPanel: {
      aria: "Project and export controls",
      heading: "Project",
      scope: "Local only",
      exportPrivatePng: "Export Private PNG",
      exportPng: "Export PNG",
      saveJson: "Save JSON",
      openJson: "Open JSON",
      loadAssets: "Load Assets",
      comparePng: "Compare PNG",
      loadSetSample: (label: string) => `Load ${label} Sample`,
      loadHqSample: "Load HQ Sample",
      resetCard: "Reset Card",
      output: "Output",
      artwork: "Artwork",
      artworkEmbedded: "embedded in JSON",
      artworkNotEmbedded: "not embedded",
      cardScope: "Scope",
      cardFaceOnly: "card face only",
      assets: "Assets",
      assetsLoaded: "local pack loaded",
      assetsPlaceholder: "placeholder",
      manifest: "Manifest",
      imageFontCounts: (imageCount: number, fontCount: number) => `${imageCount} images / ${fontCount} fonts`,
      changed: "Changed",
      privatePngConfirm: "This PNG includes local asset-pack pixels. Keep the exported image private?",
      projectTooLarge: "This card project is too large to open. Please choose a JSON file under 8 MB.",
      jsonOpenFailed: "This JSON file could not be opened as a card project.",
      disclaimer:
        "Unofficial non-commercial fan utility. It ships with original placeholder visuals only. Local asset packs and reference images stay in this browser session and are not saved into card JSON.",
    },
    errors: {
      privatePreviewCatalog: "Could not load the private preview catalog.",
      localAssetPack: "Could not load the local asset pack.",
      privateReferencePreview: "Could not load the private reference preview.",
      referenceCompare: "Could not compare this reference image.",
      loadCardUrl: (url: string) => `Could not load ${url}.`,
    },
  },
  zh: {
    documentTitle: "Card Forge 卡牌工坊",
    documentDescription: "本地静态卡面编辑器，用于制作自定义战争卡牌风格图片。",
    appSubtitle: "静态自定义卡面生成器",
    languageToggle: "EN",
    languageToggleAria: "切换到英文界面",
    autosavePaused: "请导出 JSON 保留修改",
    scopePill: "仅卡面，无玩法工具",
    fieldPanel: {
      aria: "卡牌字段",
      heading: "字段",
      scope: "单张卡牌",
      artwork: "卡图",
      artX: "卡图 X",
      artY: "卡图 Y",
      zoom: "缩放",
      title: "标题",
      keywordLine: "关键词行",
      body: "正文",
      nation: "阵营",
      type: "类型",
      rarity: "稀有度",
      set: "系列",
      cost: "费用",
      operation: "行动",
      attack: "攻击",
      defense: "防御",
      hqDefense: "总部防御",
      invalidArtwork: "请选择 5 MB 以下的 PNG、JPEG 或 WebP 图片。",
    },
    canvas: {
      aria: "卡面画布预览",
      generatedAria: "生成的卡面预览",
      generated: "生成图",
      officialReferenceAlt: "官方参考卡图",
      officialReference: "官方参考",
      officialReferenceWithLabel: (label: string) => `官方参考：${label}`,
      hint: "可在画框内拖动已上传卡图；鼠标滚轮悬停在卡图上时可缩放。",
    },
    projectPanel: {
      aria: "项目与导出控制",
      heading: "项目",
      scope: "仅本地",
      exportPrivatePng: "导出私有 PNG",
      exportPng: "导出 PNG",
      saveJson: "保存 JSON",
      openJson: "打开 JSON",
      loadAssets: "加载素材",
      comparePng: "对比 PNG",
      loadSetSample: (label: string) => `加载 ${label} 示例`,
      loadHqSample: "加载总部示例",
      resetCard: "重置卡牌",
      output: "输出",
      artwork: "卡图",
      artworkEmbedded: "已嵌入 JSON",
      artworkNotEmbedded: "未嵌入",
      cardScope: "范围",
      cardFaceOnly: "仅卡面",
      assets: "素材",
      assetsLoaded: "已加载本地包",
      assetsPlaceholder: "占位素材",
      manifest: "清单",
      imageFontCounts: (imageCount: number, fontCount: number) => `${imageCount} 张图片 / ${fontCount} 个字体`,
      changed: "变化像素",
      privatePngConfirm: "这个 PNG 包含本地素材包像素。确认只私下保存这张导出图？",
      projectTooLarge: "这个卡牌项目太大，无法打开。请选择 8 MB 以下的 JSON 文件。",
      jsonOpenFailed: "这个 JSON 文件无法作为卡牌项目打开。",
      disclaimer:
        "非官方、非商业的粉丝工具。默认只包含原创占位视觉。本地素材包和参考图只保留在当前浏览器会话中，不会保存进卡牌 JSON。",
    },
    errors: {
      privatePreviewCatalog: "无法加载私有预览目录。",
      localAssetPack: "无法加载本地素材包。",
      privateReferencePreview: "无法加载私有参考预览。",
      referenceCompare: "无法对比这张参考图。",
      loadCardUrl: (url: string) => `无法加载 ${url}。`,
    },
  },
} as const;

export type UiText = (typeof UI_TEXT)[Language];

const LOCALIZED_DEFAULT_CARD: Record<Language, CardSpec> = {
  en: DEFAULT_CARD,
  zh: {
    ...DEFAULT_CARD,
    title: "自定义坦克",
    body: "当该单位推进时，对一个目标造成 1 点伤害。",
    keywordLine: "装甲 1",
  },
};

const PRESET_LABELS: Record<Language, Record<string, Record<string, string>>> = {
  en: {
    kind: {},
    nation: {},
    rarity: {},
    set: {},
  },
  zh: {
    kind: {
      hq: "总部",
      infantry: "步兵",
      tank: "坦克",
      fighter: "战斗机",
      bomber: "轰炸机",
      artillery: "炮兵",
      order: "指令",
      countermeasure: "反制",
    },
    nation: {
      us: "美国",
      britain: "英国",
      germany: "德国",
      soviet: "苏联",
      japan: "日本",
      france: "法国",
      italy: "意大利",
      poland: "波兰",
      finland: "芬兰",
      anzac: "澳新军团",
      neutral: "中立",
      custom: "自定义",
    },
    rarity: {
      standard: "标准",
      limited: "限定",
      special: "特殊",
      elite: "精英",
    },
    set: {
      base: "基础",
      allegiance: "忠诚",
      "blood-and-iron": "血与铁",
      breakthrough: "突破",
      "brothers-in-arms": "战友同袍",
      "covert-ops": "秘密行动",
      homefront: "本土战线",
      legions: "军团",
      "naval-warfare": "海战",
      "oceania-storm": "大洋洲风暴",
      "only-spawnable": "仅生成",
      special: "特殊",
      "theaters-of-war": "战争剧场",
      "winter-war": "冬季战争",
      "world-at-war": "世界大战",
      custom: "自定义系列",
    },
  },
};

export function getInitialLanguage(storage: Pick<Storage, "getItem">): Language {
  try {
    const savedLanguage = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(savedLanguage) ? savedLanguage : "zh";
  } catch {
    return "zh";
  }
}

export function saveLanguage(storage: Pick<Storage, "setItem">, language: Language): boolean {
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
}

export function getNextLanguage(language: Language): Language {
  return language === "zh" ? "en" : "zh";
}

export function getLocalizedDefaultCard(language: Language): CardSpec {
  return LOCALIZED_DEFAULT_CARD[language];
}

export function translatePresetLabel(
  language: Language,
  group: "kind" | "nation" | "rarity" | "set",
  id: string,
  fallback: string,
): string {
  return PRESET_LABELS[language][group][id] ?? fallback;
}

export function localizeAssetPackName(language: Language, value: string): string {
  if (language === "zh" && value === "Local KARDS asset pack") {
    return "本地 KARDS 素材包";
  }
  return value;
}

export function localizeRuntimeMessage(language: Language, message: string): string {
  if (language === "en") {
    return message;
  }

  const missingImage = message.match(/^Missing image: (.+)$/);
  if (missingImage) {
    return `缺少图片：${missingImage[1]}`;
  }

  const missingFont = message.match(/^Missing font: (.+)$/);
  if (missingFont) {
    return `缺少字体：${missingFont[1]}`;
  }

  const couldNotLoadImage = message.match(/^Could not load image: (.+)$/);
  if (couldNotLoadImage) {
    return `无法加载图片：${couldNotLoadImage[1]}`;
  }

  const couldNotLoadFont = message.match(/^Could not load font: (.+)$/);
  if (couldNotLoadFont) {
    return `无法加载字体：${couldNotLoadFont[1]}`;
  }

  const couldNotReadImage = message.match(/^Could not read (.+) as an image\.$/);
  if (couldNotReadImage) {
    return `无法将 ${couldNotReadImage[1]} 读取为图片。`;
  }

  const couldNotLoadManifest = message.match(/^Could not load kards-asset-pack\.json from (.+)\.$/);
  if (couldNotLoadManifest) {
    return `无法从 ${couldNotLoadManifest[1]} 加载 kards-asset-pack.json。`;
  }

  const unknownRenderSlot = message.match(/^Unknown render asset slot: (.+)$/);
  if (unknownRenderSlot) {
    return `未知渲染素材槽位：${unknownRenderSlot[1]}`;
  }

  const assetSlotMissingFile = message.match(/^Asset slot (.+) is missing a file path\.$/);
  if (assetSlotMissingFile) {
    return `素材槽位 ${assetSlotMissingFile[1]} 缺少文件路径。`;
  }

  const unknownFontRole = message.match(/^Unknown font role: (.+)$/);
  if (unknownFontRole) {
    return `未知字体角色：${unknownFontRole[1]}`;
  }

  if (message === "Select a folder that contains kards-asset-pack.json.") {
    return "请选择包含 kards-asset-pack.json 的文件夹。";
  }

  if (message === "kards-asset-pack.json must contain a JSON object.") {
    return "kards-asset-pack.json 必须包含一个 JSON 对象。";
  }

  if (message === "kards-asset-pack.json must use version 1.") {
    return "kards-asset-pack.json 必须使用版本 1。";
  }

  if (message === "kards-asset-pack.json images must be an array.") {
    return "kards-asset-pack.json 的 images 必须是数组。";
  }

  if (message === "kards-asset-pack.json fonts must be an array.") {
    return "kards-asset-pack.json 的 fonts 必须是数组。";
  }

  if (message === "Every font entry needs both family and file.") {
    return "每个字体条目都需要 family 和 file。";
  }

  if (message === "Could not load the private preview catalog.") {
    return "无法加载私有预览目录。";
  }

  if (message === "Could not load the local asset pack.") {
    return "无法加载本地素材包。";
  }

  if (message === "Could not load the private reference preview.") {
    return "无法加载私有参考预览。";
  }

  if (message === "Could not compare this reference image.") {
    return "无法对比这张参考图。";
  }

  const couldNotLoadUrl = message.match(/^Could not load (.+)\.$/);
  if (couldNotLoadUrl) {
    return `无法加载 ${couldNotLoadUrl[1]}。`;
  }

  if (message === "The card canvas is not available for pixel diff.") {
    return "当前卡面画布不可用于像素对比。";
  }

  if (message === "The reference canvas is not available for pixel diff.") {
    return "当前参考画布不可用于像素对比。";
  }

  if (message === "Image data dimensions must match before pixel diff can run.") {
    return "像素对比前，两张图片的尺寸必须一致。";
  }

  if (message === "Image data dimensions must be positive before pixel diff can run.") {
    return "像素对比前，图片尺寸必须为正数。";
  }

  if (message === "Image data arrays must contain RGBA values for every compared pixel.") {
    return "像素对比数据必须为每个像素包含 RGBA 值。";
  }

  return message;
}

function isLanguage(value: string | null): value is Language {
  return value === "zh" || value === "en";
}
