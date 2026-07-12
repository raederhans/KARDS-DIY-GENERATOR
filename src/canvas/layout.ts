import type { CardKind } from "../types";

export const CARD_WIDTH = 500;
export const CARD_HEIGHT = 702;

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type CardTemplate = "unit" | "command" | "hq";

export type CardFaceLayout = {
  template: CardTemplate;
  artwork: Rect;
  title?: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
  };
  nameBar?: Rect;
  splitter?: Rect;
  extraBorder?: Rect;
  costBoard?: Rect;
  costBoardGap?: number;
  nationCenter: Point;
  nationSize: number;
  rarity?: Rect;
  setAnchor?: Point;
  attackBoard?: Rect;
  specialAttackBoard?: Rect;
  defenseBoard?: Rect;
  hqDefenseBoard?: Rect;
  typeIcon?: Rect;
  text: {
    titleY?: number;
    keywordY: number;
    bodyY: number;
    bodyBottomY: number;
    maxWidth: number;
    lineHeight: number;
    maxLines: number;
  };
};

const UNIT_LAYOUT: CardFaceLayout = {
  template: "unit",
  artwork: { x: 12, y: 99, width: 476, height: 426 },
  nameBar: { x: 98, y: 13, width: 390, height: 86 },
  splitter: { x: 98, y: 91, width: 390, height: 8 },
  costBoard: { x: 12, y: 13, width: 78, height: 78 },
  title: { x: 265, y: 56, maxWidth: 320, size: 45 },
  nationCenter: { x: 450, y: 52 },
  nationSize: 54,
  rarity: { x: 222, y: 675, width: 56, height: 20 },
  setAnchor: { x: 488, y: 692 },
  attackBoard: { x: 88, y: 468, width: 82, height: 82 },
  specialAttackBoard: { x: 82, y: 468, width: 94, height: 94 },
  defenseBoard: { x: 330, y: 473, width: 82, height: 82 },
  typeIcon: { x: 208, y: 473, width: 84, height: 82 },
  text: { keywordY: 580, bodyY: 616, bodyBottomY: 650, maxWidth: 390, lineHeight: 28, maxLines: 3 },
};

const COMMAND_LAYOUT: CardFaceLayout = {
  template: "command",
  artwork: { x: 12, y: 13, width: 476, height: 476 },
  extraBorder: { x: 0, y: 489, width: 500, height: 64 },
  costBoard: { x: 12, y: 13, width: 86, height: 86 },
  costBoardGap: 8,
  nationCenter: { x: 450, y: 52 },
  nationSize: 54,
  rarity: { x: 222, y: 675, width: 56, height: 20 },
  setAnchor: { x: 488, y: 692 },
  typeIcon: { x: 222, y: 448, width: 56, height: 56 },
  text: { titleY: 538, keywordY: 590, bodyY: 618, bodyBottomY: 660, maxWidth: 390, lineHeight: 28, maxLines: 3 },
};

const HQ_LAYOUT: CardFaceLayout = {
  template: "hq",
  artwork: { x: 12, y: 13, width: 476, height: 476 },
  extraBorder: { x: 0, y: 489, width: 500, height: 64 },
  nationCenter: { x: 450, y: 52 },
  nationSize: 54,
  hqDefenseBoard: { x: 166, y: 343, width: 166, height: 179 },
  text: { titleY: 548, keywordY: 598, bodyY: 628, bodyBottomY: 666, maxWidth: 450, lineHeight: 32, maxLines: 3 },
};

const UNIT_KINDS = new Set<CardKind>(["infantry", "tank", "fighter", "bomber", "artillery"]);

export function isUnitKind(kind: CardKind): boolean {
  return UNIT_KINDS.has(kind);
}

export function isCommandKind(kind: CardKind): boolean {
  return kind === "order" || kind === "countermeasure";
}

export function getCardFaceLayout(kind: CardKind): CardFaceLayout {
  if (kind === "hq") {
    return HQ_LAYOUT;
  }

  if (isCommandKind(kind)) {
    return COMMAND_LAYOUT;
  }

  return UNIT_LAYOUT;
}

export function getArtworkRect(kind: CardKind): Rect {
  return getCardFaceLayout(kind).artwork;
}

export function isPointInsideArtwork(kind: CardKind, x: number, y: number): boolean {
  const rect = getArtworkRect(kind);
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}
