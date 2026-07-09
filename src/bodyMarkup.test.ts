import { describe, expect, it } from "vitest";
import {
  getBodyEffectPresetInsert,
  getBodyEffectPresetLabel,
  insertBodyTextAtSelection,
  parseBodyMarkup,
  wrapBodySelectionWithBold,
} from "./bodyMarkup";

describe("body markup", () => {
  it("parses only explicit double-star bold ranges", () => {
    expect(parseBodyMarkup("**Deployment**: draw a card")).toEqual([
      [
        { text: "Deployment", bold: true },
        { text: ": draw a card", bold: false },
      ],
    ]);
  });

  it("keeps unmatched markers as visible text", () => {
    expect(parseBodyMarkup("**Deployment: draw a card")).toEqual([[{ text: "**Deployment: draw a card", bold: false }]]);
  });

  it("preserves author-entered line breaks", () => {
    expect(parseBodyMarkup("alpha\n**beta**\n")).toEqual([
      [{ text: "alpha", bold: false }],
      [{ text: "beta", bold: true }],
      [],
    ]);
  });

  it("inserts preset markup at the selected body cursor", () => {
    expect(insertBodyTextAtSelection("alpha omega", "**部署**：", 6, 6, 40)).toEqual({
      value: "alpha **部署**：omega",
      cursor: 13,
    });
  });

  it("keeps preset markup complete when the body maximum length is reached", () => {
    expect(insertBodyTextAtSelection("abcdef", "**部署**：", 3, 6, 8)).toEqual({
      value: "abcdef",
      cursor: 3,
    });
  });

  it("localizes quick effect labels and inserted text", () => {
    expect(getBodyEffectPresetLabel("en", "bond")).toBe("Bond");
    expect(getBodyEffectPresetLabel("zh", "bond")).toBe("协力");
    expect(getBodyEffectPresetLabel("zh", "destruction")).toBe("亡计");
    expect(getBodyEffectPresetLabel("zh", "pincer")).toBe("钳击");
    expect(getBodyEffectPresetLabel("zh", "chooseOne")).toBe("抉择");
    expect(getBodyEffectPresetInsert("en", "pincer")).toBe("**Pincer**: ");
    expect(getBodyEffectPresetInsert("zh", "pincer")).toBe("**钳击**：");
    expect(getBodyEffectPresetInsert("en", "chooseOne")).toBe("**Choose One**: ");
    expect(getBodyEffectPresetInsert("zh", "chooseOne")).toBe("**抉择**：");
    expect(getBodyEffectPresetInsert("en", "bond")).toBe("**Bond**: ");
    expect(getBodyEffectPresetInsert("zh", "bond")).toBe("**协力**：");
  });

  it("wraps selected body text with bold markers", () => {
    expect(wrapBodySelectionWithBold("alpha beta", 6, 10, 30)).toEqual({
      value: "alpha **beta**",
      cursor: 14,
    });
  });

  it("inserts empty bold markers with the cursor between them", () => {
    expect(wrapBodySelectionWithBold("alpha", 5, 5, 30)).toEqual({
      value: "alpha****",
      cursor: 7,
    });
  });

  it("leaves selected text unchanged when bold markers would exceed the body maximum length", () => {
    expect(wrapBodySelectionWithBold("alpha beta", 6, 10, 10)).toEqual({
      value: "alpha beta",
      cursor: 6,
    });
  });
});
