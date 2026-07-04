import { describe, expect, it } from "vitest";
import {
  MAX_CARD_KEYWORDS,
  canAddKeywordId,
  formatKeywordLineFromIds,
  normalizeCardKeywords,
  parseKeywordLine,
  reorderKeywordIds,
  resolveCardKeywordIds,
} from "./keywords";

describe("card keywords", () => {
  it("parses legacy keyword lines into known player-facing keyword ids", () => {
    expect(parseKeywordLine("GUARD, BLITZ, HEAVYARMOR2")).toEqual(["guard", "blitz", "heavyArmor2"]);
    expect(parseKeywordLine("Armor 1")).toEqual(["heavyArmor1"]);
  });

  it("deduplicates selected keywords and enforces the card keyword limit", () => {
    expect(normalizeCardKeywords(["guard", "guard", "blitz", "shock", "fury", "ambush"])).toEqual([
      "guard",
      "blitz",
      "shock",
      "fury",
    ]);
    expect(normalizeCardKeywords(["unknown"])).toEqual([]);
    expect(MAX_CARD_KEYWORDS).toBe(4);
  });

  it("allows only one keyword from each exclusive numbered group", () => {
    expect(normalizeCardKeywords(["intel1", "intel2", "guard", "intel3"])).toEqual(["intel1", "guard"]);
    expect(normalizeCardKeywords(["heavyArmor1", "heavyArmor3", "shock"])).toEqual(["heavyArmor1", "shock"]);
    expect(parseKeywordLine("INTEL 1, INTEL 2, HEAVY ARMOR 1, HEAVY ARMOR 3")).toEqual(["intel1", "heavyArmor1"]);
    expect(canAddKeywordId(["intel1"], "intel2")).toBe(false);
    expect(canAddKeywordId(["heavyArmor2"], "heavyArmor3")).toBe(false);
    expect(canAddKeywordId(["intel1", "heavyArmor2"], "guard")).toBe(true);
  });

  it("prefers structured keyword ids over the legacy text line", () => {
    expect(resolveCardKeywordIds({ keywords: ["shock"], keywordLine: "GUARD" })).toEqual(["shock"]);
    expect(resolveCardKeywordIds({ keywords: [], keywordLine: "GUARD" })).toEqual([]);
    expect(resolveCardKeywordIds({ keywordLine: "GUARD, BLITZ" })).toEqual(["guard", "blitz"]);
  });

  it("formats selected ids back to the compatibility keyword line", () => {
    expect(formatKeywordLineFromIds(["guard", "heavyArmor3"])).toBe("GUARD, HEAVY ARMOR 3");
  });

  it("reorders selected ids without changing the keyword contract", () => {
    expect(reorderKeywordIds(["guard", "shock", "smokescreen"], 0, 1)).toEqual(["shock", "guard", "smokescreen"]);
    expect(reorderKeywordIds(["guard", "shock", "guard", "blitz", "fury"], 2, 0)).toEqual([
      "blitz",
      "guard",
      "shock",
      "fury",
    ]);
    expect(reorderKeywordIds(["guard", "shock"], 3, 0)).toEqual(["guard", "shock"]);
  });
});
