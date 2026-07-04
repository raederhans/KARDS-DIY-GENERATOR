import { describe, expect, it } from "vitest";
import { DEFAULT_CARD } from "../cardModel";
import type { CardSpec } from "../types";
import { CARD_HEIGHT, CARD_WIDTH, createWrappedTextLines, getFittedFontSize, renderCard, truncateToWidth } from "./cardRenderer";
import { createStaticAssetResolver } from "./renderAssets";

function createMeasureContext() {
  return {
    font: "400 24px Georgia, serif",
    measureText(text: string) {
      const sizeMatch = /(\d+)px/.exec(this.font);
      const size = sizeMatch ? Number(sizeMatch[1]) : 16;
      return { width: text.length * size * 0.58 } as TextMetrics;
    },
  };
}

describe("card renderer text fitting", () => {
  it("splits long body tokens so every rendered line fits the target width", () => {
    const ctx = createMeasureContext();
    const lines = createWrappedTextLines(ctx, "SUPERCALIFRAGILISTICEXPIALIDOCIOUS", 120, 4);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => ctx.measureText(line).width <= 120)).toBe(true);
  });

  it("shrinks and truncates long titles within the title area", () => {
    const ctx = createMeasureContext();
    const title = "EXTREMELYLONGTITLEWITHOUTSPACES";
    const size = getFittedFontSize(ctx, title, 160, 39, 18);
    ctx.font = `700 ${size}px Georgia, serif`;
    const fittedTitle = truncateToWidth(ctx, title, 160);

    expect(size).toBeGreaterThanOrEqual(18);
    expect(ctx.measureText(fittedTitle).width).toBeLessThanOrEqual(160);
  });

  it("marks overflowing body copy with an ellipsis on the last visible line", () => {
    const ctx = createMeasureContext();
    const lines = createWrappedTextLines(
      ctx,
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron",
      90,
      2,
    );

    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("...")).toBe(true);
    expect(lines.every((line) => ctx.measureText(line).width <= 90)).toBe(true);
  });

  it("returns no rendered body lines for blank text", () => {
    const ctx = createMeasureContext();

    expect(createWrappedTextLines(ctx, "   ", 120, 4)).toEqual([]);
  });
});

describe("card renderer output", () => {
  it("sets the fixed card canvas dimensions and clears the full surface", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null);

    expect(canvas.width).toBe(CARD_WIDTH);
    expect(canvas.height).toBe(CARD_HEIGHT);
    expect(calls.clearRect[0]).toEqual([0, 0, CARD_WIDTH, CARD_HEIGHT]);
  });

  it("does not add a generated dark edge frame around placeholder cards", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    expect(calls.fills.some((call) => call.fillStyle === "#12110d")).toBe(false);
  });

  it("covers unit artwork inside the unit artwork rectangle", () => {
    const { canvas, calls } = createFakeCanvas();
    const artworkImage = { naturalWidth: 1000, naturalHeight: 500 } as HTMLImageElement;

    renderCard(canvas, DEFAULT_CARD, artworkImage);

    expect(calls.drawImage).toHaveLength(1);
    expect(calls.drawImage[0][1]).toBeCloseTo(-176);
    expect(calls.drawImage[0][2]).toBeCloseTo(99);
    expect(calls.drawImage[0][3]).toBeCloseTo(852);
    expect(calls.drawImage[0][4]).toBeCloseTo(426);
  });

  it("uses the command artwork rectangle for orders", () => {
    const { canvas, calls } = createFakeCanvas();
    const artworkImage = { naturalWidth: 600, naturalHeight: 900 } as HTMLImageElement;
    const orderCard: CardSpec = {
      ...DEFAULT_CARD,
      kind: "order",
      costs: { deployment: 4 },
    };

    renderCard(canvas, orderCard, artworkImage);

    expect(calls.drawImage).toHaveLength(1);
    expect(calls.drawImage[0][1]).toBeCloseTo(12);
    expect(calls.drawImage[0][2]).toBeCloseTo(-106);
    expect(calls.drawImage[0][3]).toBeCloseTo(476);
    expect(calls.drawImage[0][4]).toBeCloseTo(714);
  });

  it("uses the command lower border height from the layout table", () => {
    const { canvas, calls } = createFakeCanvas();
    const orderCard: CardSpec = {
      ...DEFAULT_CARD,
      kind: "order",
      costs: { deployment: 4 },
    };

    renderCard(canvas, orderCard, null);

    expect(calls.fillRect).toContainEqual([8, 489, 484, 64]);
    expect(calls.fillRect).not.toContainEqual([8, 489, 484, 160]);
  });

  it("leaves the nation mark blank for custom cards", () => {
    const { canvas, calls } = createFakeCanvas();
    const customMark = { width: 40, height: 40 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "nation-mark", nationId: "custom", image: customMark }]);

    renderCard(canvas, { ...DEFAULT_CARD, nation: "custom" }, null, { assets, disablePrintWear: true });

    expect(calls.drawImage.some(([image]) => image === customMark)).toBe(false);
    expect(calls.fillText.some(([text]) => text === "CU")).toBe(false);
  });

  it("draws the neutral nation mark from a same-nation unit fallback instead of text", () => {
    const { canvas, calls } = createFakeCanvas();
    const neutralMark = { width: 40, height: 40 } as CanvasImageSource;
    const assets = createStaticAssetResolver([
      { slot: "nation-mark", nationId: "neutral", kind: "infantry", template: "unit", image: neutralMark },
    ]);

    renderCard(canvas, { ...DEFAULT_CARD, nation: "neutral", kind: "tank" }, null, {
      assets,
      disablePrintWear: true,
    });

    expect(calls.drawImage.some(([image]) => image === neutralMark)).toBe(true);
    expect(calls.fillText.some(([text]) => text === "NE")).toBe(false);
  });

  it("does not render whitespace-only keyword lines", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: undefined,
      keywordLine: "   ",
    };

    renderCard(canvas, card, null);

    expect(calls.fillText.some(([text]) => text === "   ")).toBe(false);
  });

  it("renders keyword labels as dark card text instead of nation-colored labels", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, keywords: undefined, keywordLine: "GUARD" }, null);

    const keywordStyle = calls.fillTextStyles.find((call) => call.text === "Guard");
    expect(keywordStyle?.fillStyle).toBe("#4f514c");
    expect(keywordStyle?.font).toContain("27px");
    expect(keywordStyle?.font).toContain("Libre Franklin");
  });

  it("renders multiple selected keywords horizontally without duplicates", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, keywords: ["guard", "blitz", "shock"] }, null);

    const keywordCall = calls.fillText.find(([text]) => text === "Guard, Blitz, Shock");
    expect(keywordCall).toBeDefined();
    expect(keywordCall?.[1]).toBe(250);
    expect(keywordCall?.[2]).toBe(580);
  });

  it("renders selected keywords in the requested language", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, keywords: ["fury", "heavyArmor3", "bond", "salvage"] }, null, {
      language: "zh",
    });

    expect(calls.fillText.some(([text]) => text === "奋战, 重甲 3, 协力, 收缴")).toBe(true);
    expect(calls.fillText.some(([text]) => text === "Fury, Heavy Armor 3, Bond, Salvage")).toBe(false);
  });

  it("shrinks dense four-keyword rows with comma separators to stay inside the official text band", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, keywords: ["smokescreen", "heavyArmor3", "mobilize", "ambush"] }, null);

    const keywordStyle = calls.fillTextStyles.find((call) => call.text === "Smokescreen, Heavy Armor 3, Mobilize, Ambush");
    expect(keywordStyle?.font).toMatch(/1[89]px|2[0-6]px/);
    expect(calls.fillText.some(([text]) => text === "Smokescreen, Heavy Armor 3, Mobilize, Ambush")).toBe(true);
  });

  it("widens the official-style title, cost, and stat text instead of compressing it", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, title: "T-70", costs: { deployment: 2, operation: 1 }, stats: { attack: 3, defense: 2 } }, null);

    const titleStyle = calls.fillTextStyles.find((call) => call.text === "T-70");
    const deploymentStyle = calls.fillTextStyles.find((call) => call.text === "2" && call.font.includes("78px"));
    const deploymentCall = calls.fillText.find(([text, , y]) => text === "2" && y === 60);
    const kreditCall = calls.fillText.find(([text]) => text === "K");
    const operationStyle = calls.fillTextStyles.find((call) => call.text === "1");
    const operationCall = calls.fillText.find(([text]) => text === "1");
    const attackStyle = calls.fillTextStyles.find((call) => call.text === "3");
    const attackCall = calls.fillText.find(([text]) => text === "3");
    const defenseCall = calls.fillText.find(([text, , y]) => text === "2" && y === 516);

    expect(titleStyle?.scaleX).toBeGreaterThan(1);
    expect(titleStyle?.scaleX).toBeLessThanOrEqual(1.12);
    expect(deploymentStyle?.scaleX).toBeGreaterThan(1.1);
    expect(operationStyle?.scaleX).toBeGreaterThan(1.1);
    expect(attackStyle?.scaleX).toBeGreaterThan(1.15);
    expect(deploymentCall?.[1]).toBe(45);
    expect(kreditCall?.[1]).toBe(79);
    expect(operationCall?.[1]).toBe(79);
    expect(Number(operationCall?.[2]) - Number(kreditCall?.[2])).toBe(27);
    expect(attackCall?.[2]).toBe(516);
    expect(defenseCall?.[2]).toBe(516);
    expect(deploymentStyle?.font).toContain("Yantramanav");
  });

  it("keeps keyword cards from drawing body text into the footer area", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: undefined,
      keywordLine: "ARMOR 1",
      body: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma",
    };

    renderCard(canvas, card, null);

    const lowerBodyTextYs = calls.fillText
      .map(([, , y]) => Number(y))
      .filter((y) => y >= 616 && y < 675);
    expect(lowerBodyTextYs.length).toBeGreaterThan(0);
    expect(Math.max(...lowerBodyTextYs)).toBeLessThanOrEqual(650);
  });

  it("starts body copy below the unit type icon even without a keyword line", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: [],
      keywordLine: "",
      body: "alpha beta",
    };

    renderCard(canvas, card, null);

    const bodyCall = calls.fillText.find(([text]) => text === "alpha beta");
    expect(bodyCall?.[2]).toBe(580);
  });

  it("does not redraw legacy combined type icon crops when glyph masking is unavailable", () => {
    const { canvas, calls } = createFakeCanvas();
    const localImage = { width: 84, height: 78 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "type-icon", kind: "tank", image: localImage }]);

    renderCard(canvas, DEFAULT_CARD, null, { assets, disablePrintWear: true });

    const iconDraw = calls.drawImageStyles.find((call) => call.image === localImage);
    expect(iconDraw).toBeUndefined();
    expect(calls.fillText.some(([text]) => text === "TNK")).toBe(true);
  });

  it("draws unit type icon boards below separately resolved glyph layers", () => {
    const { canvas, calls } = createFakeCanvas();
    const boardImage = { width: 84, height: 82 } as CanvasImageSource;
    const tankGlyph = { width: 84, height: 78 } as CanvasImageSource;
    const fighterGlyph = { width: 84, height: 78 } as CanvasImageSource;
    const bomberGlyph = { width: 84, height: 78 } as CanvasImageSource;
    const artilleryGlyph = { width: 84, height: 78 } as CanvasImageSource;
    const assets = createStaticAssetResolver([
      { slot: "type-icon-board", template: "unit", image: boardImage },
      { slot: "type-icon-glyph", kind: "tank", image: tankGlyph },
      { slot: "type-icon-glyph", kind: "fighter", image: fighterGlyph },
      { slot: "type-icon-glyph", kind: "bomber", image: bomberGlyph },
      { slot: "type-icon-glyph", kind: "artillery", image: artilleryGlyph },
    ]);

    renderCard(canvas, DEFAULT_CARD, null, { assets, disablePrintWear: true });
    renderCard(canvas, { ...DEFAULT_CARD, kind: "fighter" }, null, { assets, disablePrintWear: true });
    renderCard(canvas, { ...DEFAULT_CARD, kind: "bomber" }, null, { assets, disablePrintWear: true });
    renderCard(canvas, { ...DEFAULT_CARD, kind: "artillery" }, null, { assets, disablePrintWear: true });

    const boardDraws = calls.drawImage.filter(([image]) => image === boardImage);
    const tankGlyphDraw = calls.drawImageStyles.find((call) => call.image === tankGlyph);
    const fighterGlyphDraw = calls.drawImageStyles.find((call) => call.image === fighterGlyph);
    const bomberGlyphDraw = calls.drawImageStyles.find((call) => call.image === bomberGlyph);
    const artilleryGlyphDraw = calls.drawImageStyles.find((call) => call.image === artilleryGlyph);

    expect(boardDraws).toHaveLength(4);
    expect(tankGlyphDraw?.centerY).toBe(507);
    expect(fighterGlyphDraw?.centerY).toBe(510);
    expect(bomberGlyphDraw?.centerX).toBe(251);
    expect(bomberGlyphDraw?.centerY).toBe(507);
    expect(artilleryGlyphDraw?.centerX).toBe(253);
    expect(artilleryGlyphDraw?.centerY).toBe(504);
    expect(artilleryGlyphDraw?.width).toBeGreaterThan(Number(tankGlyphDraw?.width));
    expect(calls.drawImage.findIndex(([image]) => image === boardImage)).toBeLessThan(
      calls.drawImage.findIndex(([image]) => image === tankGlyph),
    );
  });

  it("uses a darker official-matched inner board tone for type icons", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    expect(calls.fills.some((call) => call.fillStyle === "#41433d")).toBe(true);
  });

  it("keeps rounded attack and defense fallback boards pointed in opposite directions", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    const attackBoardPath = calls.paths.find((path) =>
      path.points.some((point) => point.kind === "moveTo" && point.x === 129 && point.y === 472),
    );
    const defenseBoardPath = calls.paths.find((path) =>
      path.points.some((point) => point.kind === "lineTo" && point.x === 371 && point.y === 551),
    );

    expect(attackBoardPath?.points).toContainEqual({ kind: "moveTo", x: 129, y: 472 });
    expect(attackBoardPath?.points).not.toContainEqual({ kind: "lineTo", x: 129, y: 546 });
    expect(attackBoardPath?.points.some((point) => point.kind === "quadraticCurveTo")).toBe(true);
    expect(defenseBoardPath?.points).toContainEqual({ kind: "lineTo", x: 371, y: 551 });
    expect(defenseBoardPath?.points.some((point) => point.kind === "quadraticCurveTo")).toBe(true);
  });

  it("keeps HQ defense board art below generated HQ text and values", () => {
    const { canvas, calls } = createFakeCanvas();
    const boardImage = { width: 168, height: 112 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "hq-defense-board", template: "hq", image: boardImage }]);
    const hqCard: CardSpec = {
      ...DEFAULT_CARD,
      kind: "hq",
      costs: {},
      stats: { hqDefense: 20 },
      keywordLine: "HQ",
    };

    renderCard(canvas, hqCard, null, { assets, disablePrintWear: true });

    const boardIndex = calls.drawImage.findIndex(([image]) => image === boardImage);
    const hqLabel = calls.fillText.find(([text]) => text === "HQ");
    const hqValue = calls.fillText.find(([text]) => text === "20");
    const boardOpIndex = calls.operations.findIndex((op) => op.kind === "drawImage" && op.value === boardImage);
    const labelOpIndex = calls.operations.findIndex((op) => op.kind === "fillText" && op.value === "HQ");
    const valueOpIndex = calls.operations.findIndex((op) => op.kind === "fillText" && op.value === "20");

    expect(boardIndex).toBeGreaterThanOrEqual(0);
    expect(hqLabel).toBeDefined();
    expect(hqValue).toBeDefined();
    expect(boardOpIndex).toBeLessThan(labelOpIndex);
    expect(boardOpIndex).toBeLessThan(valueOpIndex);
  });

  it("draws limited rarity pips with a subtle fan perspective", () => {
    const { canvas, calls } = createFakeCanvas();
    const localImage = { width: 8, height: 13 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "rarity-pip", rarityId: "limited", image: localImage }]);

    renderCard(canvas, { ...DEFAULT_CARD, rarity: "limited" }, null, { assets, disablePrintWear: true });

    const pipDraws = calls.drawImageStyles.filter((call) => call.image === localImage);
    expect(pipDraws.map((call) => call.rotation)).toEqual([-0.08, 0, 0.08]);
    expect(pipDraws[1].centerY).toBeLessThan(pipDraws[0].centerY);
    expect(pipDraws[1].centerY).toBeLessThan(pipDraws[2].centerY);
  });

  it("draws local asset-pack layers without replacing dynamic text values", () => {
    const { canvas, calls } = createFakeCanvas();
    const localImage = { width: 20, height: 20 } as CanvasImageSource;
    const assets = createStaticAssetResolver([
      { slot: "frame", image: localImage },
      { slot: "cost-board", image: localImage },
      { slot: "nation-mark", nationId: DEFAULT_CARD.nation, image: localImage },
      { slot: "type-icon", kind: DEFAULT_CARD.kind, image: localImage },
    ]);

    renderCard(canvas, DEFAULT_CARD, null, { assets, disablePrintWear: true });

    expect(calls.drawImage).toContainEqual([localImage, 0, 0, CARD_WIDTH, CARD_HEIGHT]);
    expect(calls.drawImage).toContainEqual([localImage, 12, 13, 86, 86]);
    expect(calls.fillText.some(([text]) => text === String(DEFAULT_CARD.costs.deployment))).toBe(true);
  });
});

type CanvasPathPoint =
  | { kind: "moveTo" | "lineTo"; x: number; y: number }
  | { kind: "quadraticCurveTo"; cpx: number; cpy: number; x: number; y: number };

function createFakeCanvas() {
  const calls: {
    clearRect: Array<[number, number, number, number]>;
    drawImage: unknown[][];
    fillRect: Array<[number, number, number, number]>;
    fillText: unknown[][];
    fillTextStyles: Array<{ text: unknown; font: string; fillStyle: string; scaleX: number }>;
    drawImageStyles: Array<{ image: unknown; centerX: number; centerY: number; width: number; height: number; rotation: number; clipDepth: number }>;
    operations: Array<{ kind: "drawImage" | "fillText"; value: unknown }>;
    fills: Array<{ fillStyle: unknown }>;
    paths: Array<{ fillStyle: unknown; points: CanvasPathPoint[] }>;
  } = {
    clearRect: [],
    drawImage: [],
    fillRect: [],
    fillText: [],
    fillTextStyles: [],
    drawImageStyles: [],
    operations: [],
    fills: [],
    paths: [],
  };

  const gradient = { addColorStop() {} };
  let font = "400 24px Arial, sans-serif";
  let fillStyle = "";
  let transform = { x: 0, y: 0, scaleX: 1, rotation: 0, clipDepth: 0 };
  const transformStack: Array<typeof transform> = [];
  let currentPath: CanvasPathPoint[] = [];
  const ctx = {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
    strokeStyle: "",
    get font() {
      return font;
    },
    set font(value: string) {
      font = value;
    },
    textAlign: "left",
    textBaseline: "alphabetic",
    lineWidth: 1,
    globalAlpha: 1,
    save() {
      transformStack.push({ ...transform });
    },
    restore() {
      transform = transformStack.pop() ?? { x: 0, y: 0, scaleX: 1, rotation: 0, clipDepth: 0 };
    },
    beginPath() {
      currentPath = [];
    },
    closePath() {},
    clip() {
      transform = { ...transform, clipDepth: transform.clipDepth + 1 };
    },
    fill() {
      calls.fills.push({ fillStyle });
      if (currentPath.length > 0) {
        calls.paths.push({ fillStyle, points: currentPath });
      }
    },
    stroke() {},
    rect() {},
    moveTo(x: number, y: number) {
      currentPath.push({ kind: "moveTo", x, y });
    },
    lineTo(x: number, y: number) {
      currentPath.push({ kind: "lineTo", x, y });
    },
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
      currentPath.push({ kind: "quadraticCurveTo", cpx, cpy, x, y });
    },
    arcTo() {},
    translate(x: number, y: number) {
      transform = { ...transform, x: transform.x + x * transform.scaleX, y: transform.y + y };
    },
    scale(x: number) {
      transform = { ...transform, scaleX: transform.scaleX * x };
    },
    rotate(angle: number) {
      transform = { ...transform, rotation: transform.rotation + angle };
    },
    fillRect(x: number, y: number, width: number, height: number) {
      calls.fillRect.push([x, y, width, height]);
    },
    strokeRect() {},
    clearRect(x: number, y: number, width: number, height: number) {
      calls.clearRect.push([x, y, width, height]);
    },
    drawImage(...args: unknown[]) {
      calls.drawImage.push(args);
      calls.operations.push({ kind: "drawImage", value: args[0] });
      const [, ...drawArgs] = args;
      const [x = 0, y = 0, width = 0, height = 0] =
        args.length >= 9 ? drawArgs.slice(4, 8) : drawArgs.slice(0, 4);
      calls.drawImageStyles.push({
        image: args[0],
        centerX: transform.x + (Number(x) + Number(width) / 2) * transform.scaleX,
        centerY: transform.y + Number(y) + Number(height) / 2,
        width: Number(width) * transform.scaleX,
        height: Number(height),
        rotation: transform.rotation,
        clipDepth: transform.clipDepth,
      });
    },
    fillText(...args: unknown[]) {
      const [, x = 0, y = 0] = args;
      calls.fillText.push([args[0], transform.x + Number(x) * transform.scaleX, transform.y + Number(y), ...args.slice(3)]);
      calls.fillTextStyles.push({ text: args[0], font, fillStyle, scaleX: transform.scaleX });
      calls.operations.push({ kind: "fillText", value: args[0] });
    },
    createLinearGradient() {
      return gradient;
    },
    measureText(text: string) {
      const sizeMatch = /(\d+)px/.exec(font);
      const size = sizeMatch ? Number(sizeMatch[1]) : 16;
      return { width: text.length * size * 0.58 } as TextMetrics;
    },
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;

  return { canvas, calls };
}
