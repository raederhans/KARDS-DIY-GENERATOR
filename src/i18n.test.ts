import { describe, expect, it } from "vitest";
import {
  LANGUAGE_STORAGE_KEY,
  UI_TEXT,
  getInitialLanguage,
  getLocalizedDefaultCard,
  getNextLanguage,
  localizeRuntimeMessage,
  translateKeywordLabel,
  translatePresetLabel,
} from "./i18n";

describe("i18n", () => {
  it("keeps the English and Chinese text contracts in sync", () => {
    expect(textShape(UI_TEXT.en)).toEqual(textShape(UI_TEXT.zh));
    expect(UI_TEXT.zh.canvas.officialReferenceWithLabel("哨兵卡")).toBe("参考卡：哨兵卡");
    expect(UI_TEXT.zh.projectPanel.libraryReady("哨兵目录", 7)).toBe("哨兵目录：7 张卡牌");
    expect(UI_TEXT.zh.projectPanel.imageFontCounts(2, 3)).toBe("2 张图片 · 3 个字体");
    expect(UI_TEXT.zh.projectPanel.diagnosticCount(4)).toBe("4 项");
  });

  it("defaults to Chinese and preserves a saved language choice", () => {
    expect(getInitialLanguage({ getItem: () => null })).toBe("zh");
    expect(getInitialLanguage({ getItem: (key) => (key === LANGUAGE_STORAGE_KEY ? "en" : null) })).toBe("en");
    expect(getInitialLanguage({ getItem: () => "invalid" })).toBe("zh");
  });

  it("switches between supported languages", () => {
    expect(getNextLanguage("zh")).toBe("en");
    expect(getNextLanguage("en")).toBe("zh");
  });

  it("localizes user-facing preset labels without changing unknown values", () => {
    expect(UI_TEXT.zh.fieldPanel.set).toBe("卡包");
    expect(UI_TEXT.zh.fieldPanel.type).toBe("卡种");
    expect(UI_TEXT.zh.projectPanel.referenceSet).toBe("卡包");
    expect(UI_TEXT.zh.projectPanel.manifest).toBe("必需文件");
    expect(UI_TEXT.en.projectPanel.comparePng).toBe("Choose comparison image");
    expect(UI_TEXT.zh.projectPanel.exportWorkbench).toBe("导出设置");
    expect(UI_TEXT.zh.projectPanel.textureControls).toBe("纸张纹理");
    expect(UI_TEXT.zh.projectPanel.textureCurrent).toBe("纸张纹理");
    expect(UI_TEXT.zh.projectPanel.textureFallback).toBe("生成纹理");
    expect(UI_TEXT.zh.projectPanel.textureIntensity).toBe("强度");
    expect(UI_TEXT.zh.projectPanel.randomTexture).toBe("换一种纹理");
    expect(UI_TEXT.en.projectPanel.textureFallback).toBe("Generated texture");
    expect(translatePresetLabel("zh", "kind", "tank", "Tank")).toBe("坦克");
    expect(translatePresetLabel("zh", "nation", "us", "United States")).toBe("美国");
    expect(translatePresetLabel("zh", "nation", "roc", "Republic of China")).toBe("中华民国");
    expect(translatePresetLabel("zh", "nation", "ccp", "Chinese Communist Forces")).toBe("中共");
    expect(translatePresetLabel("zh", "set", "blood-and-iron", "Blood and Iron")).toBe("血与铁");
    expect(translatePresetLabel("en", "kind", "tank", "Tank")).toBe("Tank");
    expect(translatePresetLabel("zh", "kind", "future-kind", "Future Kind")).toBe("Future Kind");
    expect(translateKeywordLabel("zh", "blitz", "Blitz")).toBe("闪击");
    expect(translateKeywordLabel("zh", "fury", "Fury")).toBe("奋战");
    expect(translateKeywordLabel("zh", "heavyArmor3", "Heavy Armor 3")).toBe("重甲 3");
    expect(translateKeywordLabel("zh", "bond", "Bond")).toBe("协力");
    expect(translateKeywordLabel("zh", "salvage", "Salvage")).toBe("收缴");
    expect(translateKeywordLabel("en", "blitz", "Blitz")).toBe("Blitz");
  });

  it("uses localized default card copy for reset and first load", () => {
    expect(getLocalizedDefaultCard("zh").title).toBe("自定义坦克");
    expect(getLocalizedDefaultCard("en").title).toBe("CUSTOM TANK");
  });

  it("localizes runtime messages while preserving file names and hiding unknown browser text", () => {
    expect(localizeRuntimeMessage("zh", "Missing image: frames/tank.png")).toBe(
      "缺少图片：frames/tank.png。请补齐文件后重新加载。",
    );
    expect(localizeRuntimeMessage("zh", "Could not read bad-image.png as an image.")).toBe(
      "无法读取图片 bad-image.png，请检查文件后重试。",
    );
    expect(localizeRuntimeMessage("zh", "kards-asset-pack.json must use version 1.")).toBe(
      "kards-asset-pack.json 必须使用版本 1。",
    );
    expect(
      localizeRuntimeMessage(
        "zh",
        "kards-asset-pack.json requiresPrivateExportConfirm must be a boolean.",
      ),
    ).toBe("kards-asset-pack.json 的 requiresPrivateExportConfirm 必须是 true 或 false。");
    expect(localizeRuntimeMessage("zh", "Could not load the reference catalog.")).toBe(
      "无法加载参考目录，请刷新页面后重试。",
    );
    expect(localizeRuntimeMessage("zh", "Unknown render asset slot: frame-board")).toBe(
      "未知素材槽位：frame-board。请检查清单。",
    );
    expect(localizeRuntimeMessage("zh", "Asset slot type-icon is missing a file path.")).toBe(
      "素材槽位 type-icon 缺少文件路径，请检查清单。",
    );
    expect(localizeRuntimeMessage("zh", "Unsupported image: frames/tank.gif")).toBe(
      "不支持图片：frames/tank.gif。请改用 PNG、JPEG 或 WebP。",
    );
    expect(localizeRuntimeMessage("zh", "Local library file is empty or damaged.")).toBe(
      "卡库文件为空或已损坏，请先恢复原文件，再重新打开。",
    );
    expect(localizeRuntimeMessage("zh", "Local library saves require browser Web Locks support.")).toBe(
      "当前浏览器不能安全写入卡库，但仍可浏览和载入卡牌。",
    );
    expect(localizeRuntimeMessage("en", "Missing image: frames/tank.png")).toBe(
      "Missing image: frames/tank.png. Add the file and reload the style pack.",
    );
    expect(localizeRuntimeMessage("zh", "Unexpected browser message")).toBe(
      "操作失败，请重试；如果问题持续，请检查所选文件或文件夹。",
    );
    expect(localizeRuntimeMessage("en", "Unexpected browser message")).toBe(
      "The operation failed. Try again; if it continues, check the selected file or folder.",
    );
    expect(localizeRuntimeMessage("zh", "constructor")).toBe(
      "操作失败，请重试；如果问题持续，请检查所选文件或文件夹。",
    );
  });

  it("covers every user-visible runtime error family in Chinese", () => {
    const messages: Array<[string, string]> = [
      ["Selected folder contains multiple kards-asset-pack.json files.", "该文件夹包含多个 kards-asset-pack.json，请只保留一个后重试。"],
      ["kards-asset-pack.json manifest is too large.", "kards-asset-pack.json 太大，请缩小文件后重试。"],
      ["Asset pack image pixel budget is too large.", "风格包图片的总像素过高，请缩小图片尺寸后重试。"],
      ["Asset pack file budget is too large.", "风格包太大，请删除或缩小部分文件后重试。"],
      ["kards-asset-pack.json has too many image entries.", "kards-asset-pack.json 的图片条目过多，请删除部分条目后重试。"],
      ["Every image entry must be an object.", "每个图片条目都必须是 JSON 对象。"],
      ["Unsupported image: images/frame.gif", "不支持图片：images/frame.gif。请改用 PNG、JPEG 或 WebP。"],
      ["Image too large: images/frame.png", "图片太大：images/frame.png。请缩小文件后重试。"],
      ["Unsupported font: fonts/title.bin", "不支持字体：fonts/title.bin。请改用 TTF、OTF、WOFF 或 WOFF2。"],
      ["Font too large: fonts/title.ttf", "字体太大：fonts/title.ttf。请缩小文件后重试。"],
      ["Asset selector nationId must be a string.", "素材选择器 nationId 必须是文本，请检查清单。"],
      ["Unknown nation selector: mars.", "未知素材选择值：mars。请检查清单。"],
      ["Duplicate asset selector: nation-mark:us.", "素材选择器重复：nation-mark:us。请删除重复条目。"],
      ["Duplicate font role: title.", "字体用途重复：title。请删除重复条目。"],
      ["Asset manifest paths must stay relative to the selected pack: ../outside.png", "素材路径必须位于所选风格包内：../outside.png"],
      ["Could not load asset pack Demo: /packs/demo", "无法加载风格包 Demo，请检查 /packs/demo。"],
      ["Local library card was not found.", "卡库中已找不到这张卡牌，请重新打开卡库后重试。"],
      ["Local folder permission was not granted.", "未获得文件夹权限，请允许访问后重试。"],
      ["Local library has an invalid top-level structure.", "卡库文件结构无效，请检查文件后重新打开。"],
      ["Local library version is not supported.", "不支持该卡库版本，请打开版本 1 的卡库文件。"],
      ["Could not open local library storage.", "无法打开已保存的卡库设置，请重新选择卡库文件夹。"],
      ["Directory export is not supported in this browser.", "当前浏览器不能保存到文件夹，请改用浏览器下载。"],
      ["Embedded artwork is invalid or too large.", "项目卡图无效或太大，请选择其他项目文件。"],
      ["Could not create the private preview artwork crop.", "无法处理参考卡图，请选择其他参考卡后重试。"],
      ["Could not load private preview artwork: images/reference.png", "无法加载参考卡图 images/reference.png，请选择其他参考卡后重试。"],
      ["Image dimensions are too large for comparison.png.", "comparison.png 的尺寸太大，请缩小图片后重试。"],
      ["Could not read project.card.json.", "无法读取 project.card.json，请检查文件后重试。"],
      ["Reading project.card.json was cancelled.", "已取消读取 project.card.json。"],
      ["The card canvas is not available for pixel diff.", "卡牌预览尚未就绪，无法对比。请刷新页面后重试。"],
    ];

    for (const [message, expected] of messages) {
      expect(localizeRuntimeMessage("zh", message), message).toBe(expected);
    }
  });
});

function textShape(value: unknown): unknown {
  if (typeof value === "function") return "function";
  if (!value || typeof value !== "object") return typeof value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, textShape(child)]),
  );
}
