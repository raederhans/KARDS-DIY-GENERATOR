import { DEFAULT_CARD } from "./cardModel";
import type { CardSpec } from "./types";

export const LANGUAGE_STORAGE_KEY = "card-forge:language:v1";
export const LANGUAGES = ["zh", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export const UI_TEXT = {
  en: {
    documentTitle: "KARDS Card Forge",
    documentDescription: "A static fan card-face editor for creating custom KARDS-style images.",
    appSubtitle: "Custom KARDS-style card-face editor",
    languageToggle: "中文",
    languageToggleAria: "Switch language to Chinese",
    fieldPanel: {
      aria: "Card fields",
      heading: "Fields",
      scope: "Single card",
      artwork: "Artwork",
      artX: "Art X",
      artY: "Art Y",
      zoom: "Zoom",
      title: "Title",
      titleAppearance: "Title typography",
      fontSize: "Size",
      horizontalScale: "Width",
      verticalScale: "Height",
      offsetX: "X",
      offsetY: "Y",
      titleBold: "Bold title",
      keywords: "Keywords",
      keywordAppearance: "Keyword typography",
      addKeyword: "Add",
      removeKeyword: (label: string) => `Remove ${label}`,
      body: "Body",
      bodyAppearance: "Body typography",
      addBodyEmphasis: "Insert emphasis",
      addBodyBold: "Bold markers",
      nation: "Nation",
      type: "Type",
      rarity: "Rarity",
      set: "Set mark",
      cost: "Cost",
      operation: "Op",
      attack: "Attack",
      defense: "Defense",
      hqDefense: "HQ defense",
      officialReference: "Official reference",
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
      exportWorkbench: "Export workbench",
      textureControls: "Card texture",
      textureCurrent: "CC0 paper",
      textureFallback: "Program texture",
      textureIntensity: "Strength",
      textureRandomness: "Randomness",
      textureMottle: "Mottle",
      randomTexture: "Random texture",
      exportFormat: "Format",
      exportSize: "Size",
      exposure: "Exposure",
      contrast: "Contrast",
      chooseExportDirectory: "Choose Folder",
      exportPrivateCard: "Export Private Card",
      exportCard: "Export Card",
      exportDirectorySelected: (name: string) => `Folder selected: ${name}`,
      savedToDirectory: (name: string) => `Saved to ${name}`,
      savedToDownloads: "Saved through browser downloads",
      exportFailed: "Could not export this card.",
      directoryUnavailable: "Could not open a local folder.",
      directoryUnsupported: "Folder selection is unavailable; browser downloads will be used.",
      projectJson: "Project JSON",
      projectJsonScope: "current card",
      saveJson: "Save Project JSON",
      openJson: "Open Project JSON",
      localLibrary: "Local card library",
      chooseLibraryDirectory: "Choose Library Folder",
      saveToLibrary: "Save Record",
      libraryRemembered: (name: string) => `Remembered library folder: ${name}`,
      libraryReady: (name: string, count: number) => `${name}: ${count} saved records`,
      librarySaved: (name: string, count: number) => `${name}: saved, ${count} records`,
      libraryUnavailable: "Could not update the local card library.",
      libraryRememberFailed: "Saved the card, but could not remember this folder for next time.",
      referenceTools: "Reference tools",
      referenceOn: "visible",
      referenceOff: "hidden",
      showReference: "Show reference card",
      comparePng: "Compare Image",
      cardTemplate: "Card sample",
      hqTemplate: "HQ template",
      loadHqSample: "Load HQ Sample",
      stylePack: "Private style pack",
      loadAssets: "Load Private Pack",
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
      manifest: "Style pack file",
      imageFontCounts: (imageCount: number, fontCount: number) => `${imageCount} images / ${fontCount} fonts`,
      averageDiff: "Avg diff",
      overallDiff: "Overall diff",
      changed: "Changed pixels",
      privateCardConfirm: "This export includes pixels from your local style pack. Keep the exported file private?",
      projectTooLarge: "This card project is too large to open. Please choose a JSON file under 8 MB.",
      jsonOpenFailed: "This JSON file could not be opened as a card project.",
    },
    errors: {
      privatePreviewCatalog: "Could not load the local reference catalog.",
      localAssetPack: "Could not load the local asset pack.",
      privateReferencePreview: "Could not load the local reference preview.",
      referenceCompare: "Could not compare this reference image.",
      loadCardUrl: (url: string) => `Could not load ${url}.`,
    },
  },
  zh: {
    documentTitle: "KARDS Card Forge 卡牌工坊",
    documentDescription: "静态粉丝卡面编辑器，用于制作自定义 KARDS 风格图片。",
    appSubtitle: "自定义 KARDS 风格卡面编辑器",
    languageToggle: "EN",
    languageToggleAria: "切换到英文界面",
    fieldPanel: {
      aria: "卡牌字段",
      heading: "字段",
      scope: "单张卡牌",
      artwork: "卡图",
      artX: "卡图 X",
      artY: "卡图 Y",
      zoom: "缩放",
      title: "标题",
      titleAppearance: "标题文字参数",
      fontSize: "字号",
      horizontalScale: "横向",
      verticalScale: "纵向",
      offsetX: "X",
      offsetY: "Y",
      titleBold: "标题加粗",
      keywords: "词条",
      keywordAppearance: "词条文字参数",
      addKeyword: "添加",
      removeKeyword: (label: string) => `移除 ${label}`,
      body: "正文",
      bodyAppearance: "正文文字参数",
      addBodyEmphasis: "插入强调",
      addBodyBold: "加粗符号",
      nation: "阵营",
      type: "类型",
      rarity: "稀有度",
      set: "卡包",
      cost: "费用",
      operation: "行动",
      attack: "攻击",
      defense: "防御",
      hqDefense: "总部防御",
      officialReference: "官方参考",
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
      exportWorkbench: "导出工作台",
      textureControls: "卡面纹理",
      textureCurrent: "CC0 纸纹",
      textureFallback: "程序纹理",
      textureIntensity: "强度",
      textureRandomness: "随机度",
      textureMottle: "斑驳",
      randomTexture: "随机纹理",
      exportFormat: "格式",
      exportSize: "大小",
      exposure: "曝光",
      contrast: "对比度",
      chooseExportDirectory: "选择文件夹",
      exportPrivateCard: "导出私有卡面",
      exportCard: "导出卡面",
      exportDirectorySelected: (name: string) => `已选择文件夹：${name}`,
      savedToDirectory: (name: string) => `已保存到 ${name}`,
      savedToDownloads: "已通过浏览器下载保存",
      exportFailed: "无法导出这张卡面。",
      directoryUnavailable: "无法打开本地文件夹。",
      directoryUnsupported: "当前浏览器不可选择文件夹，将使用浏览器下载。",
      projectJson: "项目 JSON",
      projectJsonScope: "当前卡牌",
      saveJson: "保存项目 JSON",
      openJson: "打开项目 JSON",
      localLibrary: "本地制卡库",
      chooseLibraryDirectory: "选择库文件夹",
      saveToLibrary: "保存记录",
      libraryRemembered: (name: string) => `已记住库文件夹：${name}`,
      libraryReady: (name: string, count: number) => `${name}：已有 ${count} 条记录`,
      librarySaved: (name: string, count: number) => `${name}：已保存，共 ${count} 条记录`,
      libraryUnavailable: "无法更新本地制卡库。",
      libraryRememberFailed: "卡牌已保存，但无法为下次记住这个文件夹。",
      referenceTools: "参考工具",
      referenceOn: "显示中",
      referenceOff: "已隐藏",
      showReference: "显示参考卡图",
      comparePng: "对比图片",
      cardTemplate: "卡牌示例",
      hqTemplate: "总部模板",
      loadHqSample: "加载总部示例",
      stylePack: "私人风格包",
      loadAssets: "加载私人包",
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
      manifest: "风格包文件",
      imageFontCounts: (imageCount: number, fontCount: number) => `${imageCount} 张图片 / ${fontCount} 个字体`,
      averageDiff: "平均差异",
      overallDiff: "整体差异",
      changed: "变化像素",
      privateCardConfirm: "这次导出包含你本地风格包里的像素。确认只私下保存这个文件？",
      projectTooLarge: "这个卡牌项目太大，无法打开。请选择 8 MB 以下的 JSON 文件。",
      jsonOpenFailed: "这个 JSON 文件无法作为卡牌项目打开。",
    },
    errors: {
      privatePreviewCatalog: "无法加载本地参考目录。",
      localAssetPack: "无法加载本地素材包。",
      privateReferencePreview: "无法加载本地参考预览。",
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
    keywords: ["heavyArmor1"],
    keywordLine: "HEAVY ARMOR 1",
  },
};

const PRESET_LABELS: Record<Language, Record<string, Record<string, string>>> = {
  en: {
    kind: {},
    nation: {},
    rarity: {},
    set: {},
    keyword: {},
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
      none: "0 / 无",
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
    keyword: {
      guard: "守护",
      blitz: "闪击",
      shock: "冲击",
      smokescreen: "烟幕",
      fury: "奋战",
      ambush: "伏击",
      heavyArmor1: "重甲 1",
      heavyArmor2: "重甲 2",
      heavyArmor3: "重甲 3",
      bond: "协力",
      alpine: "山地",
      pincer: "钳击",
      covert: "隐蔽",
      intel1: "情报 1",
      intel2: "情报 2",
      intel3: "情报 3",
      salvage: "收缴",
      mobilize: "动员",
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

export function translateKeywordLabel(language: Language, id: string, fallback: string): string {
  return PRESET_LABELS[language].keyword[id] ?? fallback;
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

  if (
    message === "Could not load the private preview catalog." ||
    message === "Could not load the local reference catalog."
  ) {
    return "无法加载本地参考目录。";
  }

  if (message === "Could not load the local asset pack.") {
    return "无法加载本地素材包。";
  }

  if (
    message === "Could not load the private reference preview." ||
    message === "Could not load the local reference preview."
  ) {
    return "无法加载本地参考预览。";
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
