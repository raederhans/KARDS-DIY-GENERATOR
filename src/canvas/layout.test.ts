import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, getArtworkRect, getCardFaceLayout, isPointInsideArtwork } from "./layout";

describe("card face layout", () => {
  it("keeps the KARDS-style 500x702 output contract", () => {
    expect(CARD_WIDTH).toBe(500);
    expect(CARD_HEIGHT).toBe(702);
  });

  it("uses the unit artwork and stat-row geometry from the visible reference baseline", () => {
    const layout = getCardFaceLayout("tank");

    expect(layout.template).toBe("unit");
    expect(layout.artwork).toEqual({ x: 12, y: 99, width: 476, height: 426 });
    expect(layout.nameBar).toEqual({ x: 98, y: 13, width: 390, height: 86 });
    expect(layout.splitter).toEqual({ x: 98, y: 91, width: 390, height: 8 });
    expect(layout.costBoard).toEqual({ x: 12, y: 13, width: 78, height: 78 });
    const nameBar = layout.nameBar!;
    const costBoard = layout.costBoard!;
    const splitter = layout.splitter!;

    expect(layout.attackBoard).toEqual({ x: 88, y: 468, width: 82, height: 82 });
    expect(layout.typeIcon).toEqual({ x: 208, y: 473, width: 84, height: 82 });
    expect(layout.defenseBoard).toEqual({ x: 330, y: 473, width: 82, height: 82 });
    expect(layout.rarity).toEqual({ x: 222, y: 675, width: 56, height: 20 });
    expect(layout.setAnchor).toEqual({ x: 488, y: 692 });
    expect(nameBar.x - (costBoard.x + costBoard.width)).toBe(8);
    expect(layout.artwork.y - (costBoard.y + costBoard.height)).toBe(8);
    expect(nameBar.y + nameBar.height).toBe(layout.artwork.y);
    expect(splitter.y).toBe(costBoard.y + costBoard.height);
    expect(splitter.y + splitter.height).toBe(layout.artwork.y);
  });

  it("uses the command artwork geometry for orders and countermeasures", () => {
    expect(getArtworkRect("order")).toEqual({ x: 12, y: 13, width: 476, height: 476 });
    expect(getArtworkRect("countermeasure")).toEqual({ x: 12, y: 13, width: 476, height: 476 });
    const layout = getCardFaceLayout("order");
    expect(layout.costBoardGap).toBe(8);
    expect(layout.typeIcon).toEqual({ x: 222, y: 448, width: 56, height: 56 });
    expect(layout.text.titleY).toBe(538);
    expect(layout.text.keywordY).toBe(590);
    expect(layout.text.bodyY).toBe(618);
  });

  it("keeps HQ on its own template with a separate defense board", () => {
    const layout = getCardFaceLayout("hq");

    expect(layout.template).toBe("hq");
    expect(layout.artwork).toEqual({ x: 12, y: 13, width: 476, height: 476 });
    expect(layout.hqDefenseBoard).toEqual({ x: 166, y: 343, width: 168, height: 112 });
    expect(layout.attackBoard).toBeUndefined();
  });

  it("uses kind-specific artwork hit zones", () => {
    expect(isPointInsideArtwork("tank", 20, 20)).toBe(false);
    expect(isPointInsideArtwork("order", 20, 20)).toBe(true);
    expect(isPointInsideArtwork("hq", 20, 20)).toBe(true);
  });
});
