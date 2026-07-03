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


  it("does not render whitespace-only keyword lines", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywordLine: "   ",
    };

    renderCard(canvas, card, null);

    expect(calls.fillText.some(([text]) => text === "   ")).toBe(false);
  });

  it("keeps keyword cards from drawing body text into the footer area", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywordLine: "ARMOR 1",
      body: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma",
    };

    renderCard(canvas, card, null);

    const lowerBodyTextYs = calls.fillText
      .map(([, , y]) => Number(y))
      .filter((y) => y >= 585 && y < 675);
    expect(lowerBodyTextYs.length).toBeGreaterThan(0);
    expect(Math.max(...lowerBodyTextYs)).toBeLessThanOrEqual(650);
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

function createFakeCanvas() {
  const calls: {
    clearRect: Array<[number, number, number, number]>;
    drawImage: unknown[][];
    fillRect: Array<[number, number, number, number]>;
    fillText: unknown[][];
  } = {
    clearRect: [],
    drawImage: [],
    fillRect: [],
    fillText: [],
  };

  const gradient = { addColorStop() {} };
  let font = "400 24px Arial, sans-serif";
  const ctx = {
    fillStyle: "",
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
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    clip() {},
    fill() {},
    stroke() {},
    rect() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    fillRect(x: number, y: number, width: number, height: number) {
      calls.fillRect.push([x, y, width, height]);
    },
    strokeRect() {},
    clearRect(x: number, y: number, width: number, height: number) {
      calls.clearRect.push([x, y, width, height]);
    },
    drawImage(...args: unknown[]) {
      calls.drawImage.push(args);
    },
    fillText(...args: unknown[]) {
      calls.fillText.push(args);
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
