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
    expect(UI_TEXT.zh.fieldPanel.officialReference).toBe("官方参考");
    expect(translatePresetLabel("zh", "kind", "tank", "Tank")).toBe("坦克");
    expect(translatePresetLabel("zh", "nation", "us", "United States")).toBe("美国");
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

  it("localizes runtime messages while preserving file names and unknown messages", () => {
    expect(localizeRuntimeMessage("zh", "Missing image: frames/tank.png")).toBe("缺少图片：frames/tank.png");
    expect(localizeRuntimeMessage("zh", "Could not read bad-image.png as an image.")).toBe(
      "无法将 bad-image.png 读取为图片。",
    );
    expect(localizeRuntimeMessage("zh", "kards-asset-pack.json must use version 1.")).toBe(
      "kards-asset-pack.json 必须使用版本 1。",
    );
    expect(localizeRuntimeMessage("zh", "Unknown render asset slot: frame-board")).toBe(
      "未知渲染素材槽位：frame-board",
    );
    expect(localizeRuntimeMessage("zh", "Asset slot type-icon is missing a file path.")).toBe(
      "素材槽位 type-icon 缺少文件路径。",
    );
    expect(localizeRuntimeMessage("en", "Missing image: frames/tank.png")).toBe("Missing image: frames/tank.png");
    expect(localizeRuntimeMessage("zh", "Unexpected message")).toBe("Unexpected message");
  });
});
