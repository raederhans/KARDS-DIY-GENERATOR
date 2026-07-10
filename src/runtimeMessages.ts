type RuntimeMessageLanguage = "zh" | "en";

const RUNTIME_MESSAGE_TEXT: Record<string, Record<RuntimeMessageLanguage, string>> = {
  "Select a folder that contains kards-asset-pack.json.": {
    en: "Choose a folder that contains kards-asset-pack.json.",
    zh: "请选择包含 kards-asset-pack.json 的文件夹。",
  },
  "Selected folder contains multiple kards-asset-pack.json files.": {
    en: "This folder contains more than one kards-asset-pack.json file. Keep one and try again.",
    zh: "该文件夹包含多个 kards-asset-pack.json，请只保留一个后重试。",
  },
  "kards-asset-pack.json manifest is too large.": {
    en: "kards-asset-pack.json is too large. Reduce the file and try again.",
    zh: "kards-asset-pack.json 太大，请缩小文件后重试。",
  },
  "Asset pack image pixel budget is too large.": {
    en: "The style pack contains images with too many pixels. Reduce their dimensions and try again.",
    zh: "风格包图片的总像素过高，请缩小图片尺寸后重试。",
  },
  "Asset pack file budget is too large.": {
    en: "The style pack is too large. Remove or reduce files and try again.",
    zh: "风格包太大，请删除或缩小部分文件后重试。",
  },
  "kards-asset-pack.json must contain a JSON object.": {
    en: "kards-asset-pack.json must contain one JSON object.",
    zh: "kards-asset-pack.json 必须包含一个 JSON 对象。",
  },
  "kards-asset-pack.json must use version 1.": {
    en: "kards-asset-pack.json must use version 1.",
    zh: "kards-asset-pack.json 必须使用版本 1。",
  },
  "kards-asset-pack.json images must be an array.": {
    en: "The images field in kards-asset-pack.json must be an array.",
    zh: "kards-asset-pack.json 的 images 必须是数组。",
  },
  "kards-asset-pack.json fonts must be an array.": {
    en: "The fonts field in kards-asset-pack.json must be an array.",
    zh: "kards-asset-pack.json 的 fonts 必须是数组。",
  },
  "kards-asset-pack.json has too many image entries.": {
    en: "kards-asset-pack.json lists too many images. Remove entries and try again.",
    zh: "kards-asset-pack.json 的图片条目过多，请删除部分条目后重试。",
  },
  "kards-asset-pack.json has too many font entries.": {
    en: "kards-asset-pack.json lists too many fonts. Remove entries and try again.",
    zh: "kards-asset-pack.json 的字体条目过多，请删除部分条目后重试。",
  },
  "kards-asset-pack.json name must be a string.": {
    en: "The name field in kards-asset-pack.json must be text.",
    zh: "kards-asset-pack.json 的 name 必须是文本。",
  },
  "kards-asset-pack.json rightsNotice must be a string.": {
    en: "The rightsNotice field in kards-asset-pack.json must be text.",
    zh: "kards-asset-pack.json 的 rightsNotice 必须是文本。",
  },
  "kards-asset-pack.json requiresPrivateExportConfirm must be a boolean.": {
    en: "The requiresPrivateExportConfirm field in kards-asset-pack.json must be true or false.",
    zh: "kards-asset-pack.json 的 requiresPrivateExportConfirm 必须是 true 或 false。",
  },
  "Every image entry must be an object.": {
    en: "Every image entry must be a JSON object.",
    zh: "每个图片条目都必须是 JSON 对象。",
  },
  "Every font entry must be an object.": {
    en: "Every font entry must be a JSON object.",
    zh: "每个字体条目都必须是 JSON 对象。",
  },
  "Every font entry needs both family and file.": {
    en: "Every font entry needs both family and file.",
    zh: "每个字体条目都需要 family 和 file。",
  },
  "Font role must be a string.": {
    en: "Each font role must be text.",
    zh: "每个字体 role 都必须是文本。",
  },
  "Directory export is not supported in this browser.": {
    en: "This browser cannot save to a folder. Use the browser download instead.",
    zh: "当前浏览器不能保存到文件夹，请改用浏览器下载。",
  },
  "Local library file is empty or damaged.": {
    en: "The card library file is empty or damaged. Restore the original file, then open it again.",
    zh: "卡库文件为空或已损坏，请先恢复原文件，再重新打开。",
  },
  "Local library file is too large.": {
    en: "The card library file is too large. Reduce it before opening it again.",
    zh: "卡库文件太大，请缩小文件后重新打开。",
  },
  "Local library card was not found.": {
    en: "This card is no longer in the library. Reopen the library and try again.",
    zh: "卡库中已找不到这张卡牌，请重新打开卡库后重试。",
  },
  "Local folder permission was not granted.": {
    en: "Folder permission was not granted. Allow access and try again.",
    zh: "未获得文件夹权限，请允许访问后重试。",
  },
  "Local library saves require browser Web Locks support.": {
    en: "This browser cannot safely write the card library. You can still browse and load cards.",
    zh: "当前浏览器不能安全写入卡库，但仍可浏览和载入卡牌。",
  },
  "Local library has an invalid top-level structure.": {
    en: "The card library file has an invalid structure. Check the file and open it again.",
    zh: "卡库文件结构无效，请检查文件后重新打开。",
  },
  "Local library version is not supported.": {
    en: "This card library version is not supported. Open a version 1 library file.",
    zh: "不支持该卡库版本，请打开版本 1 的卡库文件。",
  },
  "Local library cards must be an array.": {
    en: "The cards field in the card library must be an array.",
    zh: "卡库文件的 cards 必须是数组。",
  },
  "Could not open local library storage.": {
    en: "Could not open saved library settings. Choose the library folder again.",
    zh: "无法打开已保存的卡库设置，请重新选择卡库文件夹。",
  },
  "Could not update local library storage.": {
    en: "Could not remember the library folder. Choose it again next time.",
    zh: "无法记住卡库文件夹，下次请重新选择。",
  },
  "Could not update the local card library.": {
    en: "Could not update the card library. Check folder permission and try again.",
    zh: "无法更新卡库，请检查文件夹权限后重试。",
  },
  "Embedded artwork is invalid or too large.": {
    en: "The project artwork is invalid or too large. Choose a different project file.",
    zh: "项目卡图无效或太大，请选择其他项目文件。",
  },
  "Could not create the private preview artwork crop.": {
    en: "Could not prepare the reference artwork. Choose another reference card and try again.",
    zh: "无法处理参考卡图，请选择其他参考卡后重试。",
  },
  "Could not load the reference catalog.": {
    en: "Could not load the reference catalog. Refresh the page and try again.",
    zh: "无法加载参考目录，请刷新页面后重试。",
  },
  "Could not load the local asset pack.": {
    en: "Could not load the local style pack. Check its files and try again.",
    zh: "无法加载本地风格包，请检查文件后重试。",
  },
  "Could not load the reference preview.": {
    en: "Could not load the reference preview. Choose another reference card and try again.",
    zh: "无法加载参考预览，请选择其他参考卡后重试。",
  },
  "Could not compare this reference image.": {
    en: "Could not compare this image. Choose another image and try again.",
    zh: "无法对比这张图片，请选择其他图片后重试。",
  },
  "The card canvas is not available for pixel diff.": {
    en: "The card preview is not ready for comparison. Refresh the page and try again.",
    zh: "卡牌预览尚未就绪，无法对比。请刷新页面后重试。",
  },
  "The reference canvas is not available for pixel diff.": {
    en: "The reference preview is not ready for comparison. Choose it again and retry.",
    zh: "参考预览尚未就绪，无法对比。请重新选择后重试。",
  },
  "Image data dimensions must match before pixel diff can run.": {
    en: "The two images must have the same dimensions before comparison.",
    zh: "两张图片的尺寸必须一致才能对比。",
  },
  "Image data dimensions must be positive before pixel diff can run.": {
    en: "The selected image has invalid dimensions. Choose another image.",
    zh: "所选图片尺寸无效，请选择其他图片。",
  },
  "Image data arrays must contain RGBA values for every compared pixel.": {
    en: "The selected image data is incomplete. Choose another image.",
    zh: "所选图片数据不完整，请选择其他图片。",
  },
};

export function localizeRuntimeMessage(language: RuntimeMessageLanguage, message: string): string {
  if (Object.prototype.hasOwnProperty.call(RUNTIME_MESSAGE_TEXT, message)) {
    return RUNTIME_MESSAGE_TEXT[message][language];
  }

  const missingImage = message.match(/^Missing image: (.+)$/);
  if (missingImage) {
    return language === "zh"
      ? `缺少图片：${missingImage[1]}。请补齐文件后重新加载。`
      : `Missing image: ${missingImage[1]}. Add the file and reload the style pack.`;
  }

  const missingFont = message.match(/^Missing font: (.+)$/);
  if (missingFont) {
    return language === "zh"
      ? `缺少字体：${missingFont[1]}。请补齐文件后重新加载。`
      : `Missing font: ${missingFont[1]}. Add the file and reload the style pack.`;
  }

  const unsupportedImage = message.match(/^Unsupported image: (.+)$/);
  if (unsupportedImage) {
    return language === "zh"
      ? `不支持图片：${unsupportedImage[1]}。请改用 PNG、JPEG 或 WebP。`
      : `Unsupported image: ${unsupportedImage[1]}. Use PNG, JPEG, or WebP.`;
  }

  const imageTooLarge = message.match(/^Image too large: (.+)$/);
  if (imageTooLarge) {
    return language === "zh"
      ? `图片太大：${imageTooLarge[1]}。请缩小文件后重试。`
      : `Image too large: ${imageTooLarge[1]}. Reduce the file and try again.`;
  }

  const couldNotLoadImage = message.match(/^Could not load image: (.+)$/);
  if (couldNotLoadImage) {
    return language === "zh"
      ? `无法加载图片：${couldNotLoadImage[1]}。请检查文件后重试。`
      : `Could not load image: ${couldNotLoadImage[1]}. Check the file and try again.`;
  }

  const unsupportedFont = message.match(/^Unsupported font: (.+)$/);
  if (unsupportedFont) {
    return language === "zh"
      ? `不支持字体：${unsupportedFont[1]}。请改用 TTF、OTF、WOFF 或 WOFF2。`
      : `Unsupported font: ${unsupportedFont[1]}. Use TTF, OTF, WOFF, or WOFF2.`;
  }

  const fontTooLarge = message.match(/^Font too large: (.+)$/);
  if (fontTooLarge) {
    return language === "zh"
      ? `字体太大：${fontTooLarge[1]}。请缩小文件后重试。`
      : `Font too large: ${fontTooLarge[1]}. Reduce the file and try again.`;
  }

  const couldNotLoadFont = message.match(/^Could not load font: (.+)$/);
  if (couldNotLoadFont) {
    return language === "zh"
      ? `无法加载字体：${couldNotLoadFont[1]}。请检查文件后重试。`
      : `Could not load font: ${couldNotLoadFont[1]}. Check the file and try again.`;
  }

  const couldNotReadImage = message.match(/^Could not read (.+) as an image\.$/);
  if (couldNotReadImage) {
    return language === "zh"
      ? `无法读取图片 ${couldNotReadImage[1]}，请检查文件后重试。`
      : `Could not read ${couldNotReadImage[1]} as an image. Check the file and try again.`;
  }

  const imageDimensionsTooLarge = message.match(/^Image dimensions are too large for (.+)\.$/);
  if (imageDimensionsTooLarge) {
    return language === "zh"
      ? `${imageDimensionsTooLarge[1]} 的尺寸太大，请缩小图片后重试。`
      : `${imageDimensionsTooLarge[1]} has dimensions that are too large. Resize it and try again.`;
  }

  const couldNotLoadManifest = message.match(/^Could not load kards-asset-pack\.json from (.+)\.$/);
  if (couldNotLoadManifest) {
    return language === "zh"
      ? `无法从 ${couldNotLoadManifest[1]} 加载 kards-asset-pack.json，请检查路径后重试。`
      : `Could not load kards-asset-pack.json from ${couldNotLoadManifest[1]}. Check the path and try again.`;
  }

  const unknownRenderSlot = message.match(/^Unknown render asset slot: (.+)$/);
  if (unknownRenderSlot) {
    return language === "zh"
      ? `未知素材槽位：${unknownRenderSlot[1]}。请检查清单。`
      : `Unknown asset slot: ${unknownRenderSlot[1]}. Check the manifest.`;
  }

  const assetSlotMissingFile = message.match(/^Asset slot (.+) is missing a file path\.$/);
  if (assetSlotMissingFile) {
    return language === "zh"
      ? `素材槽位 ${assetSlotMissingFile[1]} 缺少文件路径，请检查清单。`
      : `Asset slot ${assetSlotMissingFile[1]} has no file path. Check the manifest.`;
  }

  const unknownFontRole = message.match(/^Unknown font role: (.+)$/);
  if (unknownFontRole) {
    return language === "zh"
      ? `未知字体用途：${unknownFontRole[1]}。请检查清单。`
      : `Unknown font role: ${unknownFontRole[1]}. Check the manifest.`;
  }

  const selectorType = message.match(/^Asset selector (.+) must be a string\.$/);
  if (selectorType) {
    return language === "zh"
      ? `素材选择器 ${selectorType[1]} 必须是文本，请检查清单。`
      : `Asset selector ${selectorType[1]} must be text. Check the manifest.`;
  }

  const unknownSelector = message.match(/^Unknown (card kind|nation selector|rarity selector|set selector|asset template): (.+)\.$/);
  if (unknownSelector) {
    return language === "zh"
      ? `未知素材选择值：${unknownSelector[2]}。请检查清单。`
      : `Unknown asset selector value: ${unknownSelector[2]}. Check the manifest.`;
  }

  const duplicateAssetSelector = message.match(/^Duplicate asset selector: (.+)\.$/);
  if (duplicateAssetSelector) {
    return language === "zh"
      ? `素材选择器重复：${duplicateAssetSelector[1]}。请删除重复条目。`
      : `Duplicate asset selector: ${duplicateAssetSelector[1]}. Remove the duplicate entry.`;
  }

  const duplicateFontRole = message.match(/^Duplicate font role: (.+)\.$/);
  if (duplicateFontRole) {
    return language === "zh"
      ? `字体用途重复：${duplicateFontRole[1]}。请删除重复条目。`
      : `Duplicate font role: ${duplicateFontRole[1]}. Remove the duplicate entry.`;
  }

  const relativeAssetPath = message.match(/^Asset manifest paths must stay relative to the selected pack: (.+)$/);
  if (relativeAssetPath) {
    return language === "zh"
      ? `素材路径必须位于所选风格包内：${relativeAssetPath[1]}`
      : `Asset paths must stay inside the selected style pack: ${relativeAssetPath[1]}`;
  }

  const couldNotLoadPack = message.match(/^Could not load asset pack (.+): (.+)$/);
  if (couldNotLoadPack) {
    return language === "zh"
      ? `无法加载风格包 ${couldNotLoadPack[1]}，请检查 ${couldNotLoadPack[2]}。`
      : `Could not load style pack ${couldNotLoadPack[1]}. Check ${couldNotLoadPack[2]}.`;
  }

  const fileTooLarge = message.match(/^(.+) is too large\.$/);
  if (fileTooLarge) {
    return language === "zh"
      ? `${fileTooLarge[1]} 太大，请缩小文件后重试。`
      : `${fileTooLarge[1]} is too large. Reduce the file and try again.`;
  }

  if (
    message === "Could not load the private preview catalog." ||
    message === "Could not load the local reference catalog." ||
    message === "Could not load the reference catalog."
  ) {
    return RUNTIME_MESSAGE_TEXT["Could not load the reference catalog."][language];
  }

  if (
    message === "Could not load the private reference preview." ||
    message === "Could not load the local reference preview." ||
    message === "Could not load the reference preview."
  ) {
    return RUNTIME_MESSAGE_TEXT["Could not load the reference preview."][language];
  }

  const couldNotLoadPrivateArtwork = message.match(/^Could not load private preview artwork: (.+)$/);
  if (couldNotLoadPrivateArtwork) {
    return language === "zh"
      ? `无法加载参考卡图 ${couldNotLoadPrivateArtwork[1]}，请选择其他参考卡后重试。`
      : `Could not load reference artwork ${couldNotLoadPrivateArtwork[1]}. Choose another reference card and try again.`;
  }

  const couldNotReadFile = message.match(/^Could not read (.+)\.$/);
  if (couldNotReadFile) {
    return language === "zh"
      ? `无法读取 ${couldNotReadFile[1]}，请检查文件后重试。`
      : `Could not read ${couldNotReadFile[1]}. Check the file and try again.`;
  }

  const readingCancelled = message.match(/^Reading (.+) was cancelled\.$/);
  if (readingCancelled) {
    return language === "zh"
      ? `已取消读取 ${readingCancelled[1]}。`
      : `Reading ${readingCancelled[1]} was cancelled.`;
  }

  const couldNotLoadUrl = message.match(/^Could not load (.+)\.$/);
  if (couldNotLoadUrl) {
    return language === "zh"
      ? `无法加载 ${couldNotLoadUrl[1]}，请检查后重试。`
      : `Could not load ${couldNotLoadUrl[1]}. Check it and try again.`;
  }

  return language === "zh"
    ? "操作失败，请重试；如果问题持续，请检查所选文件或文件夹。"
    : "The operation failed. Try again; if it continues, check the selected file or folder.";
}
