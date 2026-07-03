import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, getArtworkRect, getCardFaceLayout, isPointInsideArtwork } from "./layout";

describe("card face layout", () => {
  it("keeps the KARDS-style 500x702 output contract", () => {
    expect(CARD_WIDTH).toBe(500);
    expect(CARD_HEIGHT).toBe(702);
  });

  it("uses the unit artwork and stat-row geometry from the research baseline", () => {
    const layout = getCardFaceLayout("tank");

    expect(layout.template).toBe("unit");
    expect(layout.artwork).toEqual({ x: 12, y: 99, width: 476, height: 426 });
    expect(layout.attackBoard).toEqual({ x: 88, y: 468, width: 82, height: 82 });
    expect(layout.typeIcon).toEqual({ x: 208, y: 473, width: 84, height: 72 });
    expect(layout.defenseBoard).toEqual({ x: 330, y: 473, width: 82, height: 82 });
    expect(layout.rarity).toEqual({ x: 222, y: 675, width: 56, height: 20 });
    expect(layout.setAnchor).toEqual({ x: 488, y: 692 });
  });

  it("uses the command artwork geometry for orders and countermeasures", () => {
    expect(getArtworkRect("order")).toEqual({ x: 12, y: 13, width: 476, height: 476 });
    expect(getArtworkRect("countermeasure")).toEqual({ x: 12, y: 13, width: 476, height: 476 });
    expect(getCardFaceLayout("order").typeIcon).toEqual({ x: 222, y: 448, width: 56, height: 56 });
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
