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

  it("truncates inserted body markup at the body maximum length", () => {
    expect(insertBodyTextAtSelection("abcdef", "**部署**：", 3, 6, 8)).toEqual({
      value: "abc**部署*",
      cursor: 8,
    });
  });

  it("localizes quick effect labels and inserted text", () => {
    expect(getBodyEffectPresetLabel("zh", "destruction")).toBe("亡祭");
    expect(getBodyEffectPresetInsert("en", "pincer")).toBe("**Pincer**: ");
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
});
