import { describe, expect, it } from "vitest";
import { DEFAULT_CARD, normalizeCardSpec, sanitizeInteger } from "./cardModel";
import { BODY_MAX_LENGTH, MAX_DATA_URL_LENGTH } from "./limits";

describe("sanitizeInteger", () => {
  it("rounds finite values and clamps to the allowed range", () => {
    expect(sanitizeInteger(4.6, 0, 12)).toBe(5);
    expect(sanitizeInteger(-3, 0, 12)).toBe(0);
    expect(sanitizeInteger(99, 0, 12)).toBe(12);
  });

  it("returns undefined for empty or invalid values", () => {
    expect(sanitizeInteger("", 0, 12)).toBeUndefined();
    expect(sanitizeInteger("not-a-number", 0, 12)).toBeUndefined();
  });
});

describe("normalizeCardSpec", () => {
  it("preserves valid card data and normalizes imported project files", () => {
    const card = normalizeCardSpec({
      version: 1,
      kind: "fighter",
      nation: "britain",
      rarity: "elite",
      set: "blood-and-iron",
      title: "ACE",
      body: "Gain air superiority.",
      keywordLine: "GUARD",
      costs: { deployment: 3, operation: 1 },
      stats: { attack: 2, defense: 4, hqDefense: 30 },
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,abc",
        crop: { x: 10, y: -20, scale: 1.4 },
      },
    });

    expect(card.kind).toBe("fighter");
    expect(card.nation).toBe("britain");
    expect(card.rarity).toBe("elite");
    expect(card.set).toBe("blood-and-iron");
    expect(card.artwork.source).toBe("upload");
    expect(card.artwork.crop.scale).toBe(1.4);
  });

  it("keeps first-version imports inside implemented artwork boundaries", () => {
    const oversizedImage = `data:image/png;base64,${"a".repeat(MAX_DATA_URL_LENGTH)}`;
    const card = normalizeCardSpec({
      body: "x".repeat(BODY_MAX_LENGTH + 10),
      artwork: {
        source: "preset",
        dataUrl: oversizedImage,
        crop: { x: 0, y: 0, scale: 1 },
        presetId: "future-feature",
      },
      customIcons: { nation: "future-feature" },
    });

    expect(card.body).toHaveLength(BODY_MAX_LENGTH);
    expect(card.artwork.source).toBe("none");
    expect(card.artwork.dataUrl).toBeUndefined();
    expect("customIcons" in card).toBe(false);
  });

  it("falls back to the default shape for invalid imports", () => {
    const card = normalizeCardSpec({
      kind: "invalid",
      nation: "unknown",
      costs: { deployment: 999 },
      artwork: { source: "remote-url", crop: { scale: 99 } },
    });

    expect(card.kind).toBe(DEFAULT_CARD.kind);
    expect(card.nation).toBe(DEFAULT_CARD.nation);
    expect(card.costs.deployment).toBe(12);
    expect(card.artwork.source).toBe("none");
    expect(card.artwork.crop.scale).toBe(3);
  });
});
