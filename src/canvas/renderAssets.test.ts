import { describe, expect, it } from "vitest";
import { DEFAULT_CARD } from "../cardModel";
import { createStaticAssetResolver, isCardRenderAssetSlot, resolveBestAssetEntry, type CardRenderAssetContext } from "./renderAssets";

const assetContext: CardRenderAssetContext = {
  card: DEFAULT_CARD,
  kind: "tank",
  nationId: "britain",
  rarityId: "standard",
  setId: "base",
  template: "unit",
};

describe("card render asset resolver", () => {
  it("accepts only known renderer asset slots", () => {
    expect(isCardRenderAssetSlot("frame")).toBe(true);
    expect(isCardRenderAssetSlot("unknown-official-slot")).toBe(false);
  });

  it("prefers the most specific matching asset entry", () => {
    const genericImage = { width: 1, height: 1 } as CanvasImageSource;
    const nationImage = { width: 2, height: 2 } as CanvasImageSource;
    const kindImage = { width: 3, height: 3 } as CanvasImageSource;
    const entries = [
      { slot: "nation-mark", image: genericImage },
      { slot: "nation-mark", nationId: "britain", image: nationImage },
      { slot: "nation-mark", nationId: "britain", kind: "tank", image: kindImage },
    ] as const;

    expect(resolveBestAssetEntry([...entries], "nation-mark", assetContext)?.image).toBe(kindImage);
  });

  it("returns undefined when filters do not match the card context", () => {
    const image = { width: 1, height: 1 } as CanvasImageSource;
    const resolver = createStaticAssetResolver([{ slot: "type-icon", kind: "order", image }]);

    expect(resolver.resolveImage("type-icon", assetContext)).toBeUndefined();
  });
});
