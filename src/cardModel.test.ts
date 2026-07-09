import { describe, expect, it } from "vitest";
import { CARD_TEXT_APPEARANCE_BOUNDS, DEFAULT_CARD, normalizeCardSpec, sanitizeInteger } from "./cardModel";
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
      appearance: {
        texture: {
          seed: 123,
          intensity: 2.4,
          randomness: 2.2,
          mottle: 1.8,
        },
        text: {
          title: { fontScale: 1.2, scaleX: 0.9, scaleY: 1.1, offsetX: 12, offsetY: -6, bold: false },
          keywords: { fontScale: 0.85, scaleX: 1.15, scaleY: 0.95, offsetX: -10, offsetY: 4 },
          body: { fontScale: 1.1, scaleX: 0.92, scaleY: 1.08, offsetX: 6, offsetY: -12 },
        },
      },
    });

    expect(card.kind).toBe("fighter");
    expect(card.nation).toBe("britain");
    expect(card.rarity).toBe("elite");
    expect(card.set).toBe("blood-and-iron");
    expect(card.artwork.source).toBe("upload");
    expect(card.artwork.crop.scale).toBe(1.4);
    expect(card.keywords).toEqual(["guard"]);
    expect(card.keywordLine).toBe("GUARD");
    expect(card.appearance.texture).toEqual({
      seed: 123,
      intensity: 2.4,
      randomness: 2.2,
      mottle: 1.8,
    });
    expect(card.appearance.text.title).toEqual({
      fontScale: 1.2,
      scaleX: 0.9,
      scaleY: 1.1,
      offsetX: 12,
      offsetY: -6,
      bold: false,
    });
    expect(card.appearance.text.keywords).toEqual({
      fontScale: 0.85,
      scaleX: 1.15,
      scaleY: 0.95,
      offsetX: -10,
      offsetY: 4,
    });
    expect(card.appearance.text.body).toEqual({
      fontScale: 1.1,
      scaleX: 0.92,
      scaleY: 1.08,
      offsetX: 6,
      offsetY: -12,
    });
  });

  it("normalizes card appearance so project files reproduce texture settings safely", () => {
    const card = normalizeCardSpec({
      appearance: {
        texture: {
          seed: -1,
          intensity: 99,
          randomness: -99,
          mottle: "not-a-number",
        },
        text: {
          title: {
            fontScale: 99,
            scaleX: -99,
            scaleY: "not-a-number",
            offsetX: 999,
            offsetY: -999,
            bold: "yes",
          },
          keywords: {
            fontScale: 0,
            scaleX: 2,
            scaleY: 2,
            offsetX: "not-a-number",
            offsetY: 24,
          },
        },
      },
    });

    expect(card.appearance.texture).toEqual({
      seed: 0xffffffff,
      intensity: 3,
      randomness: 0.5,
      mottle: DEFAULT_CARD.appearance.texture.mottle,
    });
    expect(card.appearance.text.title).toEqual({
      fontScale: CARD_TEXT_APPEARANCE_BOUNDS.fontScale.max,
      scaleX: CARD_TEXT_APPEARANCE_BOUNDS.scaleX.min,
      scaleY: DEFAULT_CARD.appearance.text.title.scaleY,
      offsetX: CARD_TEXT_APPEARANCE_BOUNDS.offsetX.max,
      offsetY: CARD_TEXT_APPEARANCE_BOUNDS.offsetY.min,
      bold: DEFAULT_CARD.appearance.text.title.bold,
    });
    expect(card.appearance.text.keywords).toEqual({
      fontScale: CARD_TEXT_APPEARANCE_BOUNDS.fontScale.min,
      scaleX: CARD_TEXT_APPEARANCE_BOUNDS.scaleX.max,
      scaleY: CARD_TEXT_APPEARANCE_BOUNDS.scaleY.max,
      offsetX: DEFAULT_CARD.appearance.text.keywords.offsetX,
      offsetY: 24,
    });
    expect(card.appearance.text.body).toEqual(DEFAULT_CARD.appearance.text.body);
  });

  it("keeps ordinary card-face numeric values within the two-digit range", () => {
    const card = normalizeCardSpec({
      costs: { deployment: 120, operation: 12 },
      stats: { attack: 101, defense: 99, hqDefense: 120 },
    });

    expect(card.costs.deployment).toBe(99);
    expect(card.costs.operation).toBe(12);
    expect(card.stats.attack).toBe(99);
    expect(card.stats.defense).toBe(99);
    expect(card.stats.hqDefense).toBe(99);
  });

  it("normalizes structured keywords and ignores duplicate or unknown keyword values", () => {
    const card = normalizeCardSpec({
      keywords: ["guard", "guard", "blitz", "unknown", "shock", "fury", "ambush"],
      keywordLine: "SMOKESCREEN",
    });

    expect(card.keywords).toEqual(["guard", "blitz", "shock", "fury"]);
    expect(card.keywordLine).toBe("GUARD, BLITZ, SHOCK, FURY");
  });

  it("preserves cards with no visible rarity mark", () => {
    const card = normalizeCardSpec({ rarity: "none" });

    expect(card.rarity).toBe("none");
  });

  it("migrates old comma-separated keyword lines into structured keywords", () => {
    const card = normalizeCardSpec({
      keywordLine: "BECOMESVETERAN:641ST RIFLES VET, ONLYSPAWNABLE, BLITZ, GUARD",
    });

    expect(card.keywords).toEqual(["blitz", "guard"]);
    expect(card.keywordLine).toBe("BLITZ, GUARD");
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
    expect(card.costs.deployment).toBe(99);
    expect(card.artwork.source).toBe("none");
    expect(card.artwork.crop.scale).toBe(3);
  });
});
