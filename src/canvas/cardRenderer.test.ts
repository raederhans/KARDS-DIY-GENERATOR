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

  it("rerenders the card at a higher backing resolution for export scale", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { pixelScale: 2 });

    expect(canvas.width).toBe(CARD_WIDTH * 2);
    expect(canvas.height).toBe(CARD_HEIGHT * 2);
    expect(calls.clearRect[0]).toEqual([0, 0, CARD_WIDTH * 2, CARD_HEIGHT * 2]);
    expect(calls.scales).toContainEqual([2, 2]);
  });

  it("does not add a generated dark edge frame around placeholder cards", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    expect(calls.fills.some((call) => call.fillStyle === "#12110d")).toBe(false);
  });

  it("adds layered deterministic paper aging by default", () => {
    const first = createFakeCanvas();
    const second = createFakeCanvas();

    renderCard(first.canvas, DEFAULT_CARD, null);
    renderCard(second.canvas, DEFAULT_CARD, null);

    const firstWear = getPrintWearFills(first.calls.fillRectStyles);
    const secondWear = getPrintWearFills(second.calls.fillRectStyles);
    const firstOrganicWear = getPrintWearPathFills(first.calls.paths);

    expect(firstWear.some((call) => String(call.fillStyle).startsWith("rgba(95, 78, 48,"))).toBe(true);
    expect(firstWear.some((call) => call.fillStyle === "rgba(46, 38, 25, 0.11)")).toBe(true);
    expect(firstWear.some((call) => String(call.fillStyle).startsWith("rgba(255, 250, 225,"))).toBe(true);
    expect(firstWear.some((call) => String(call.fillStyle).startsWith("rgba(255, 245, 212,"))).toBe(true);
    expect(firstOrganicWear.some((call) => String(call.fillStyle).startsWith("rgba(237, 224, 184,"))).toBe(true);
    expect(firstWear.length).toBeGreaterThan(1900);
    expect(firstWear.slice(0, 24)).toEqual(secondWear.slice(0, 24));
  });

  it("varies paper aging when a texture seed is provided", () => {
    const first = createFakeCanvas();
    const second = createFakeCanvas();

    renderCard(first.canvas, DEFAULT_CARD, null, { textureSeed: 111 });
    renderCard(second.canvas, DEFAULT_CARD, null, { textureSeed: 222 });

    const firstWear = getPrintWearFills(first.calls.fillRectStyles);
    const secondWear = getPrintWearFills(second.calls.fillRectStyles);

    expect(firstWear.slice(1, 24)).not.toEqual(secondWear.slice(1, 24));
  });

  it("uses organic curved patches for visible paper mottle instead of rectangular blotches", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, {
      textureIntensity: 2.4,
      textureRandomness: 2.2,
      textureMottle: 2.1,
    });

    const organicMottlePaths = calls.paths.filter((path) => {
      const fillStyle = String(path.fillStyle);
      return (
        fillStyle.startsWith("rgba(177, 153, 101,") ||
        fillStyle.startsWith("rgba(54, 47, 35,") ||
        fillStyle.startsWith("rgba(237, 224, 184,") ||
        fillStyle.startsWith("rgba(38, 33, 24,")
      );
    });

    expect(organicMottlePaths.length).toBeGreaterThan(80);
    expect(organicMottlePaths.every((path) => path.points.some((point) => point.kind === "quadraticCurveTo"))).toBe(
      true,
    );
  });

  it("clips paper aging away from artwork, title banner, and the direct cost, stat, and type regions", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null);

    const textureClip = calls.clips.find((clip) => clip.fillRule === "evenodd");

    expect(textureClip).toBeDefined();
    expect(textureClip?.points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "rect", x: 12, y: 99, width: 476, height: 426 }),
        expect.objectContaining({ kind: "rect", x: 98, y: 13, width: 390, height: 86 }),
        expect.objectContaining({ kind: "rect", x: 10, y: 11, width: 82, height: 82 }),
        expect.objectContaining({ kind: "moveTo", x: 129, y: 472 }),
        expect.objectContaining({ kind: "lineTo", x: 371, y: 551 }),
        expect.objectContaining({ kind: "moveTo", x: 217, y: 473 }),
        expect.objectContaining({ kind: "arcTo", x1: 292, y1: 473, x2: 292, y2: 555, radius: 9 }),
      ]),
    );
    expect(textureClip?.points).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "rect", x: 84, y: 464, width: 90, height: 90 }),
        expect.objectContaining({ kind: "rect", x: 326, y: 469, width: 90, height: 90 }),
        expect.objectContaining({ kind: "rect", x: 204, y: 469, width: 92, height: 90 }),
      ]),
    );
    expect(textureClip?.points).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "rect", x: 419, y: 21, width: 62, height: 62 }),
      ]),
    );
  });

  it("erases randomized paper aging from protected stat and type regions as a union", () => {
    const { canvas, calls } = createFakeCanvas({ enableLayerCanvas: true });

    renderCard(canvas, DEFAULT_CARD, null, {
      textureIntensity: 2.4,
      textureRandomness: 2.2,
      textureMottle: 2.1,
    });

    const layer = calls.layerCanvases[0];
    expect(layer).toBeDefined();
    const erasedPaths = layer.calls.paths.filter((path) => path.globalCompositeOperation === "destination-out");

    expect(erasedPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          points: expect.arrayContaining([expect.objectContaining({ kind: "rect", x: 12, y: 99, width: 476, height: 426 })]),
        }),
        expect.objectContaining({
          points: expect.arrayContaining([expect.objectContaining({ kind: "moveTo", x: 129, y: 472 })]),
        }),
        expect.objectContaining({
          points: expect.arrayContaining([expect.objectContaining({ kind: "lineTo", x: 371, y: 551 })]),
        }),
        expect.objectContaining({
          points: expect.arrayContaining([expect.objectContaining({ kind: "arcTo", x1: 292, y1: 473, x2: 292, y2: 555, radius: 9 })]),
        }),
      ]),
    );
    expect(calls.drawImage.some(([image]) => image === layer.canvas)).toBe(true);
  });

  it("renders the paper aging layer at the export pixel scale", () => {
    const { canvas, calls } = createFakeCanvas({ enableLayerCanvas: true });

    renderCard(canvas, DEFAULT_CARD, null, { pixelScale: 2 });

    const layer = calls.layerCanvases[0];
    expect(layer.canvas.width).toBe(CARD_WIDTH * 2);
    expect(layer.canvas.height).toBe(CARD_HEIGHT * 2);
    expect(layer.calls.scales).toContainEqual([2, 2]);
    expect(calls.drawImage).toContainEqual([layer.canvas, 0, 0, CARD_WIDTH, CARD_HEIGHT]);
  });

  it("draws keywords and rarity marks above the paper aging layer", () => {
    const { canvas, calls } = createFakeCanvas({ enableLayerCanvas: true });
    const rarityImage = { width: 8, height: 13 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "rarity-pip", rarityId: DEFAULT_CARD.rarity, image: rarityImage }]);

    renderCard(canvas, DEFAULT_CARD, null, {
      assets,
      textureIntensity: 2.4,
      textureRandomness: 2.2,
      textureMottle: 2.1,
    });

    const layer = calls.layerCanvases[0];
    const layerIndex = calls.operations.findIndex((op) => op.kind === "drawImage" && op.value === layer.canvas);
    const rarityIndex = calls.operations.findIndex((op) => op.kind === "drawImage" && op.value === rarityImage);
    const keywordIndex = calls.operations.findIndex((op) => op.kind === "fillText" && op.value === "Heavy Armor 1");

    expect(layerIndex).toBeGreaterThanOrEqual(0);
    expect(rarityIndex).toBeGreaterThan(layerIndex);
    expect(keywordIndex).toBeGreaterThan(layerIndex);
  });

  it("uses a supplied CC0 paper texture image when paper aging is enabled", () => {
    const { canvas, calls } = createFakeCanvas();
    const paperTexture = { width: 960, height: 563 } as CanvasImageSource;

    renderCard(canvas, DEFAULT_CARD, null, { textureImage: paperTexture });

    expect(calls.drawImage.some((call) => call[0] === paperTexture)).toBe(true);
  });

  it("skips paper aging when print wear is disabled", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    expect(getPrintWearFills(calls.fillRectStyles)).toEqual([]);
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

  it("keeps a paper gap around command cost boards and strengthens the K marker", () => {
    const { canvas, calls } = createFakeCanvas();
    const orderCard: CardSpec = {
      ...DEFAULT_CARD,
      kind: "order",
      costs: { deployment: 3 },
    };

    renderCard(canvas, orderCard, null, { disablePrintWear: true });

    expect(calls.fillRectStyles).toContainEqual({ x: 98, y: 13, width: 8, height: 94, fillStyle: "#d8d2bd" });
    expect(calls.fillRectStyles).toContainEqual({ x: 12, y: 99, width: 94, height: 8, fillStyle: "#d8d2bd" });
    const kreditStyle = calls.fillTextStyles.find((call) => call.text === "K");
    expect(kreditStyle?.font).toContain("25px");
    expect(kreditStyle?.scaleX).toBeCloseTo(1.08);
  });

  it("uses command-specific text spacing and Latin condensed body typography", () => {
    const { canvas, calls } = createFakeCanvas();
    const orderCard: CardSpec = {
      ...DEFAULT_CARD,
      kind: "order",
      title: "PLAN D",
      body: "Choose 1 of 3 random elite Soviet units to add to your hand.",
    };

    renderCard(canvas, orderCard, null, { disablePrintWear: true });

    const iconCall = calls.fillText.find(([text]) => text === "!");
    const titleCall = calls.fillText.find(([text]) => text === "PLAN D");
    const titleStyle = calls.fillTextStyles.find((call) => call.text === "PLAN D");
    const bodyStyle = calls.fillTextStyles.find((call) => String(call.text).startsWith("Choose"));

    expect(titleCall?.[2]).toBe(538);
    expect(Number(titleCall?.[2]) - Number(iconCall?.[2])).toBeGreaterThan(55);
    expect(titleStyle?.scaleX).toBeCloseTo(0.98);
    expect(titleStyle?.font).toContain("40px");
    expect(titleStyle?.font).toContain("800");
    expect(bodyStyle?.font).toContain("'Libre Franklin'");
    expect(bodyStyle?.font).toMatch(/^400 \d+px/);
    expect(bodyStyle?.scaleX).toBeCloseTo(0.92);
  });

  it("draws a darker unit cost board with gaps and no inner outline", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    expect(calls.fillRectStyles).toContainEqual({ x: 12, y: 13, width: 78, height: 78, fillStyle: "#3f423b" });
    expect(calls.strokeRect).not.toContainEqual([14, 15, 74, 74]);
  });

  it("keeps an independent unit header seam above the artwork", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, DEFAULT_CARD, null, { disablePrintWear: true });

    expect(calls.fillRectStyles).toContainEqual({
      x: 98,
      y: 91,
      width: 390,
      height: 8,
      fillStyle: "rgba(205, 213, 194, 0.72)",
    });
  });

  it("draws the unit header seam even when a name-bar asset is present", () => {
    const { canvas, calls } = createFakeCanvas();
    const nameBarImage = { width: 390, height: 86 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "unit-name-bar", template: "unit", image: nameBarImage }]);

    renderCard(canvas, DEFAULT_CARD, null, { assets, disablePrintWear: true });

    expect(calls.drawImage).toContainEqual([nameBarImage, 98, 13, 390, 86]);
    expect(calls.fillRectStyles).toContainEqual({
      x: 98,
      y: 91,
      width: 390,
      height: 8,
      fillStyle: "rgba(205, 213, 194, 0.72)",
    });
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
    const deploymentStyle = calls.fillTextStyles.find((call) => call.text === "2" && call.font.includes("72px"));
    const deploymentCall = calls.fillText.find(([text]) => text === "2");
    const kreditCall = calls.fillText.find(([text]) => text === "K");
    const operationStyle = calls.fillTextStyles.find((call) => call.text === "1");
    const operationCall = calls.fillText.find(([text]) => text === "1");
    const attackStyle = calls.fillTextStyles.find((call) => call.text === "3");
    const attackCall = calls.fillText.find(([text]) => text === "3");
    const defenseCall = calls.fillText.find(([text, , y]) => text === "2" && y === 516);

    expect(titleStyle?.scaleX).toBeGreaterThan(1);
    expect(titleStyle?.scaleX).toBeLessThanOrEqual(1.12);
    expect(deploymentStyle?.scaleX).toBeGreaterThan(1.05);
    expect(deploymentStyle?.scaleX).toBeLessThanOrEqual(1.12);
    expect(deploymentStyle?.scaleY).toBeCloseTo(1.06);
    expect(operationStyle?.scaleX).toBeGreaterThan(1.1);
    expect(operationStyle?.scaleY).toBeCloseTo(1.08);
    expect(calls.fillTextStyles.find((call) => call.text === "K")?.scaleY).toBeCloseTo(1);
    expect(attackStyle?.scaleX).toBeGreaterThan(1.15);
    expect(deploymentCall?.[1]).toBeCloseTo(41.6, 1);
    expect(deploymentCall?.[2]).toBeCloseTo(56.7, 1);
    expect(kreditCall?.[1]).toBeCloseTo(73.2, 1);
    expect(operationCall?.[1]).toBeCloseTo(73.2, 1);
    expect(Number(operationCall?.[2]) - Number(kreditCall?.[2])).toBeCloseTo(28.9, 1);
    expect(attackCall?.[2]).toBe(516);
    expect(defenseCall?.[2]).toBe(516);
    expect(deploymentStyle?.font).toContain("Yantramanav");
  });

  it("applies serialized title typography controls on unit and command title paths", () => {
    const unitCanvas = createFakeCanvas();
    renderCard(
      unitCanvas.canvas,
      {
        ...DEFAULT_CARD,
        title: "T-70",
        appearance: {
          ...DEFAULT_CARD.appearance,
          text: {
            ...DEFAULT_CARD.appearance.text,
            title: {
              fontScale: 1.2,
              scaleX: 0.9,
              scaleY: 1.1,
              offsetX: 14,
              offsetY: -5,
              bold: false,
            },
          },
        },
      },
      null,
    );

    const unitTitleStyle = unitCanvas.calls.fillTextStyles.find((call) => call.text === "T-70");
    const unitTitleCall = unitCanvas.calls.fillText.find(([text]) => text === "T-70");
    expect(unitTitleStyle?.font).toContain("600 54px");
    expect(unitTitleStyle?.scaleX).toBeCloseTo(1.12 * 0.9);
    expect(unitTitleStyle?.scaleY).toBeCloseTo(1.1);
    expect(unitTitleCall?.[1]).toBe(279);
    expect(unitTitleCall?.[2]).toBe(51);

    const commandCanvas = createFakeCanvas();
    renderCard(
      commandCanvas.canvas,
      {
        ...DEFAULT_CARD,
        kind: "order",
        title: "PLAN D",
        keywords: [],
        keywordLine: "",
        appearance: {
          ...DEFAULT_CARD.appearance,
          text: {
            ...DEFAULT_CARD.appearance.text,
            title: {
              fontScale: 1.1,
              scaleX: 1.05,
              scaleY: 0.95,
              offsetX: -20,
              offsetY: 8,
              bold: true,
            },
          },
        },
      },
      null,
    );

    const commandTitleStyle = commandCanvas.calls.fillTextStyles.find((call) => call.text === "PLAN D");
    const commandTitleCall = commandCanvas.calls.fillText.find(([text]) => text === "PLAN D");
    expect(commandTitleStyle?.font).toContain("800 44px");
    expect(commandTitleStyle?.scaleX).toBeCloseTo(0.98 * 1.05);
    expect(commandTitleStyle?.scaleY).toBeCloseTo(0.95);
    expect(commandTitleCall?.[1]).toBe(230);
    expect(commandTitleCall?.[2]).toBe(546);
  });

  it("uses compact numeric styling for two-digit costs and unit stats", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, costs: { deployment: 12, operation: 10 }, stats: { attack: 18, defense: 27 } }, null);

    const deploymentStyle = calls.fillTextStyles.find((call) => call.text === "12");
    const kreditStyle = calls.fillTextStyles.find((call) => call.text === "K");
    const operationStyle = calls.fillTextStyles.find((call) => call.text === "10");
    const attackStyle = calls.fillTextStyles.find((call) => call.text === "18");
    const defenseStyle = calls.fillTextStyles.find((call) => call.text === "27");

    expect(deploymentStyle?.font).toContain("50px");
    expect(deploymentStyle?.scaleX).toBeCloseTo(0.86);
    expect(deploymentStyle?.scaleY).toBeCloseTo(1.02);
    expect(kreditStyle?.font).toContain("23px");
    expect(kreditStyle?.scaleX).toBeCloseTo(1.02);
    expect(operationStyle?.font).toContain("21px");
    expect(operationStyle?.scaleX).toBeCloseTo(0.86);
    expect(attackStyle?.font).toContain("44px");
    expect(attackStyle?.scaleX).toBeCloseTo(0.86);
    expect(defenseStyle?.font).toContain("44px");
    expect(defenseStyle?.scaleX).toBeCloseTo(0.86);
  });

  it("renders missing unit operation cost as zero", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, costs: { deployment: 12 } }, null);

    const operationCall = calls.fillText.find(([text, , y]) => text === "0" && Number(y) > 50);
    expect(operationCall?.[1]).toBeCloseTo(73.2, 1);
  });

  it("caps rendered cost and stat values at two digits", () => {
    const { canvas, calls } = createFakeCanvas();

    renderCard(canvas, { ...DEFAULT_CARD, costs: { deployment: 120, operation: 123 }, stats: { attack: 101, defense: 250 } }, null);

    expect(calls.fillText.filter(([text]) => text === "99")).toHaveLength(4);
    expect(calls.fillText.some(([text]) => text === "120" || text === "123" || text === "101" || text === "250")).toBe(false);
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

  it("renders explicitly marked body text in bold without drawing the marker stars", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: [],
      keywordLine: "",
      body: "**Deployment**: draw a card",
    };

    renderCard(canvas, card, null);

    const emphasizedStyle = calls.fillTextStyles.find((call) => call.text === "Deployment");
    const plainStyle = calls.fillTextStyles.find((call) => call.text === ": draw a card");
    expect(emphasizedStyle?.font).toContain("800 24px");
    expect(plainStyle?.font).toContain("500 24px");
    expect(calls.fillText.some(([text]) => String(text).includes("**"))).toBe(false);
  });

  it("applies serialized keyword and body typography controls to whole text groups", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: ["guard"],
      body: "alpha beta",
      appearance: {
        ...DEFAULT_CARD.appearance,
        text: {
          ...DEFAULT_CARD.appearance.text,
          keywords: {
            fontScale: 1.2,
            scaleX: 0.85,
            scaleY: 1.1,
            offsetX: -16,
            offsetY: 6,
          },
          body: {
            fontScale: 1.25,
            scaleX: 0.8,
            scaleY: 1.15,
            offsetX: 18,
            offsetY: -10,
          },
        },
      },
    };

    renderCard(canvas, card, null);

    const keywordStyle = calls.fillTextStyles.find((call) => call.text === "Guard");
    const keywordCall = calls.fillText.find(([text]) => text === "Guard");
    const bodyStyle = calls.fillTextStyles.find((call) => call.text === "alpha beta");
    const bodyCall = calls.fillText.find(([text]) => text === "alpha beta");
    expect(keywordStyle?.font).toContain("32px");
    expect(keywordStyle?.scaleX).toBeCloseTo(1.02 * 0.85);
    expect(keywordStyle?.scaleY).toBeCloseTo(1.1);
    expect(keywordCall?.[1]).toBe(234);
    expect(keywordCall?.[2]).toBe(586);
    expect(bodyStyle?.font).toContain("30px");
    expect(bodyStyle?.scaleX).toBeCloseTo(0.96 * 0.8);
    expect(bodyStyle?.scaleY).toBeCloseTo(1.15);
    expect(bodyCall?.[2]).toBe(606);
  });

  it("keeps CJK body copy on the same line after an emphasized effect label when it fits", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: ["guard"],
      body: "**部署**：移除一个敌方单位，若花费高于4，则抽一张牌。",
    };

    renderCard(canvas, card, null);

    const labelCall = calls.fillText.find(([text]) => text === "部署");
    const followingCopyCall = calls.fillText.find(([text]) => String(text).startsWith("：移除"));
    expect(labelCall?.[2]).toBe(616);
    expect(followingCopyCall?.[2]).toBe(labelCall?.[2]);
  });

  it("shrinks dense CJK body copy to use the available text band before ellipsizing", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: ["guard"],
      body: "**部署**：移除一个敌方单位，若花费高于4，则抽一张牌。然后该单位获得护甲，并可以再次行动，直到回合结束前保持全部战斗修正。若目标被摧毁，则友方单位获得额外行动力，并且本回合所有友方坦克获得一点攻击。",
    };

    renderCard(canvas, card, null);

    const bodyTextStyles = calls.fillTextStyles.filter((call) => ["部署", "：", "。", "..."].every((token) => call.text !== token));
    expect(calls.fillText.some(([text]) => String(text).includes("..."))).toBe(false);
    expect(bodyTextStyles.some((call) => call.font.includes("16px"))).toBe(true);
    expect(Math.max(...calls.fillText.map(([, , y]) => Number(y)).filter((y) => y >= 616 && y <= 650))).toBe(650);
  });

  it("centers each wrapped body line independently when line lengths differ", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: [],
      keywordLine: "",
      body: "天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳短行",
    };

    renderCard(canvas, card, null);

    const firstLine = calls.fillText.find(([, , y]) => y === 580);
    const secondLine = calls.fillText.find(([, , y]) => y === 608);
    expect(firstLine?.[1]).toBeLessThan(100);
    expect(secondLine?.[1]).toBeGreaterThan(Number(firstLine?.[1]) + 100);
  });

  it("preserves author-entered body line breaks before wrapping", () => {
    const { canvas, calls } = createFakeCanvas();
    const card: CardSpec = {
      ...DEFAULT_CARD,
      keywords: [],
      keywordLine: "",
      body: "alpha\nbeta",
    };

    renderCard(canvas, card, null);

    expect(calls.fillText.find(([text]) => text === "alpha")?.[2]).toBe(580);
    expect(calls.fillText.find(([text]) => text === "beta")?.[2]).toBe(608);
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

    renderCard(canvas, { ...DEFAULT_CARD, rarity: "limited" }, null, { disablePrintWear: true });

    const pipPaths = calls.paths.filter((path) =>
      path.points.some((point) => "x" in point && point.x >= -4 && point.x <= 4),
    );
    const pipRotations = calls.fills.filter((fill) => fill.fillStyle === "#b08745").map((fill) => fill.rotation);
    expect(pipPaths.length).toBeGreaterThanOrEqual(3);
    expect(pipRotations).toEqual([-0.08, 0, 0.08]);
  });

  it("repeats standard and limited rarity pip assets without stretching them into the whole slot", () => {
    const { canvas, calls } = createFakeCanvas();
    const localImage = { width: 9, height: 12 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "rarity-pip", rarityId: "limited", image: localImage }]);

    renderCard(canvas, { ...DEFAULT_CARD, rarity: "limited" }, null, { assets, disablePrintWear: true });

    const pipDraws = calls.drawImageStyles.filter((call) => call.image === localImage);
    expect(pipDraws).toHaveLength(3);
    expect(pipDraws.map((call) => call.width)).toEqual([8, 8, 8]);
    expect(pipDraws.map((call) => call.height)).toEqual([13, 13, 13]);
    expect(pipDraws.map((call) => call.rotation)).toEqual([-0.08, 0, 0.08]);
  });

  it("draws elite and special rarity mark assets at their natural centered size", () => {
    const eliteCanvas = createFakeCanvas();
    const specialCanvas = createFakeCanvas();
    const eliteImage = { width: 47, height: 19 } as CanvasImageSource;
    const specialImage = { width: 31, height: 19 } as CanvasImageSource;

    renderCard(eliteCanvas.canvas, { ...DEFAULT_CARD, rarity: "elite" }, null, {
      assets: createStaticAssetResolver([{ slot: "rarity-pip", rarityId: "elite", image: eliteImage }]),
      disablePrintWear: true,
    });
    renderCard(specialCanvas.canvas, { ...DEFAULT_CARD, rarity: "special" }, null, {
      assets: createStaticAssetResolver([{ slot: "rarity-pip", rarityId: "special", image: specialImage }]),
      disablePrintWear: true,
    });

    const eliteDraw = eliteCanvas.calls.drawImageStyles.find((call) => call.image === eliteImage);
    const specialDraws = specialCanvas.calls.drawImageStyles.filter((call) => call.image === specialImage);

    expect(eliteDraw).toMatchObject({ centerX: 250, centerY: 685, width: 47, height: 19, rotation: 0 });
    expect(specialDraws).toHaveLength(1);
    expect(specialDraws[0]).toMatchObject({ centerX: 250, centerY: 685, width: 31, height: 19, rotation: 0 });
  });

  it("does not draw rarity marks when rarity is none", () => {
    const { canvas, calls } = createFakeCanvas();
    const rarityImage = { width: 56, height: 20 } as CanvasImageSource;
    const assets = createStaticAssetResolver([{ slot: "rarity-pip", rarityId: "none", image: rarityImage }]);

    renderCard(canvas, { ...DEFAULT_CARD, rarity: "none" }, null, { assets, disablePrintWear: true });

    expect(calls.drawImageStyles.some((call) => call.image === rarityImage)).toBe(false);
    expect(calls.strokeRect).not.toContainEqual([222, 675, 56, 20]);
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
    expect(calls.drawImage).toContainEqual([localImage, 12, 13, 78, 78]);
    expect(calls.fillText.some(([text]) => text === String(DEFAULT_CARD.costs.deployment))).toBe(true);
  });
});

type CanvasPathPoint =
  | { kind: "moveTo" | "lineTo"; x: number; y: number }
  | { kind: "quadraticCurveTo"; cpx: number; cpy: number; x: number; y: number }
  | { kind: "arcTo"; x1: number; y1: number; x2: number; y2: number; radius: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number };

function createFakeCanvas(options: { enableLayerCanvas?: boolean } = {}) {
  const calls: {
    clearRect: Array<[number, number, number, number]>;
    drawImage: unknown[][];
    fillRect: Array<[number, number, number, number]>;
    fillRectStyles: Array<{ x: number; y: number; width: number; height: number; fillStyle: unknown }>;
    strokeRect: Array<[number, number, number, number]>;
    fillText: unknown[][];
    fillTextStyles: Array<{ text: unknown; font: string; fillStyle: string; scaleX: number; scaleY: number }>;
    drawImageStyles: Array<{ image: unknown; centerX: number; centerY: number; width: number; height: number; rotation: number; clipDepth: number }>;
    operations: Array<{ kind: "drawImage" | "fillText"; value: unknown }>;
    fills: Array<{ fillStyle: unknown; rotation: number }>;
    paths: Array<{ fillStyle: unknown; points: CanvasPathPoint[]; globalCompositeOperation: string }>;
    clips: Array<{ fillRule: CanvasFillRule | undefined; points: CanvasPathPoint[] }>;
    scales: Array<[number, number]>;
    layerCanvases: Array<ReturnType<typeof createFakeCanvas>>;
  } = {
    clearRect: [],
    drawImage: [],
    fillRect: [],
    fillRectStyles: [],
    strokeRect: [],
    fillText: [],
    fillTextStyles: [],
    drawImageStyles: [],
    operations: [],
    fills: [],
    paths: [],
    clips: [],
    scales: [],
    layerCanvases: [],
  };

  const gradient = { addColorStop() {} };
  let font = "400 24px Arial, sans-serif";
  let fillStyle = "";
  let globalCompositeOperation = "source-over";
  let transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, clipDepth: 0 };
  const transformStack: Array<typeof transform> = [];
  let currentPath: CanvasPathPoint[] = [];
  let canvas = {} as HTMLCanvasElement;
  const ctx = {
    get canvas() {
      return canvas;
    },
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
    get globalCompositeOperation() {
      return globalCompositeOperation;
    },
    set globalCompositeOperation(value: string) {
      globalCompositeOperation = value;
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
    lineCap: "butt",
    globalAlpha: 1,
    save() {
      transformStack.push({ ...transform });
    },
    restore() {
      transform = transformStack.pop() ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, clipDepth: 0 };
    },
    beginPath() {
      currentPath = [];
    },
    closePath() {},
    clip(fillRule?: CanvasFillRule) {
      calls.clips.push({ fillRule, points: [...currentPath] });
      transform = { ...transform, clipDepth: transform.clipDepth + 1 };
    },
    fill() {
      calls.fills.push({ fillStyle, rotation: transform.rotation });
      if (currentPath.length > 0) {
        calls.paths.push({ fillStyle, points: currentPath, globalCompositeOperation });
      }
    },
    stroke() {},
    rect(x: number, y: number, width: number, height: number) {
      currentPath.push({ kind: "rect", x, y, width, height });
    },
    moveTo(x: number, y: number) {
      currentPath.push({ kind: "moveTo", x, y });
    },
    lineTo(x: number, y: number) {
      currentPath.push({ kind: "lineTo", x, y });
    },
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
      currentPath.push({ kind: "quadraticCurveTo", cpx, cpy, x, y });
    },
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {
      currentPath.push({ kind: "arcTo", x1, y1, x2, y2, radius });
    },
    translate(x: number, y: number) {
      transform = { ...transform, x: transform.x + x * transform.scaleX, y: transform.y + y * transform.scaleY };
    },
    scale(x: number, y = 1) {
      calls.scales.push([x, y]);
      transform = { ...transform, scaleX: transform.scaleX * x, scaleY: transform.scaleY * y };
    },
    rotate(angle: number) {
      transform = { ...transform, rotation: transform.rotation + angle };
    },
    fillRect(x: number, y: number, width: number, height: number) {
      calls.fillRect.push([x, y, width, height]);
      calls.fillRectStyles.push({ x, y, width, height, fillStyle });
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      calls.strokeRect.push([x, y, width, height]);
    },
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
        centerY: transform.y + (Number(y) + Number(height) / 2) * transform.scaleY,
        width: Number(width) * transform.scaleX,
        height: Number(height) * transform.scaleY,
        rotation: transform.rotation,
        clipDepth: transform.clipDepth,
      });
    },
    fillText(...args: unknown[]) {
      const [, x = 0, y = 0] = args;
      calls.fillText.push([args[0], transform.x + Number(x) * transform.scaleX, transform.y + Number(y) * transform.scaleY, ...args.slice(3)]);
      calls.fillTextStyles.push({ text: args[0], font, fillStyle, scaleX: transform.scaleX, scaleY: transform.scaleY });
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

  canvas = {
    width: 0,
    height: 0,
    ownerDocument: options.enableLayerCanvas
      ? {
          createElement(elementName: string) {
            if (elementName !== "canvas") {
              throw new Error(`Unsupported fake element: ${elementName}`);
            }
            const layer = createFakeCanvas();
            calls.layerCanvases.push(layer);
            return layer.canvas;
          },
        }
      : undefined,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;

  return { canvas, calls };
}

function getPrintWearFills(fillRectStyles: Array<{ x: number; y: number; width: number; height: number; fillStyle: unknown }>) {
  return fillRectStyles.filter((call) => {
    const fillStyle = String(call.fillStyle);
    return (
      fillStyle.startsWith("rgba(95, 78, 48,") ||
      fillStyle.startsWith("rgba(169, 145, 92,") ||
      fillStyle.startsWith("rgba(68, 61, 45,") ||
      fillStyle.startsWith("rgba(46, 38, 25,") ||
      fillStyle.startsWith("rgba(54, 45, 30,") ||
      fillStyle.startsWith("rgba(255, 245, 212,") ||
      fillStyle.startsWith("rgba(70, 61, 42,") ||
      fillStyle.startsWith("rgba(246, 233, 196,") ||
      fillStyle.startsWith("rgba(83, 72, 50,") ||
      fillStyle.startsWith("rgba(177, 153, 101,") ||
      fillStyle.startsWith("rgba(255, 247, 215,") ||
      fillStyle.startsWith("rgba(79, 68, 46,") ||
      fillStyle.startsWith("rgba(255, 250, 225,") ||
      fillStyle.startsWith("rgba(31, 29, 23,") ||
      fillStyle.startsWith("rgba(237, 224, 184,") ||
      fillStyle.startsWith("rgba(38, 33, 24,") ||
      fillStyle.startsWith("rgba(249, 237, 201,") ||
      fillStyle.startsWith("rgba(36, 31, 23,")
    );
  });
}

function getPrintWearPathFills(paths: Array<{ fillStyle: unknown; points: CanvasPathPoint[] }>) {
  return paths.filter((path) => {
    const fillStyle = String(path.fillStyle);
    return (
      fillStyle.startsWith("rgba(169, 145, 92,") ||
      fillStyle.startsWith("rgba(68, 61, 45,") ||
      fillStyle.startsWith("rgba(177, 153, 101,") ||
      fillStyle.startsWith("rgba(54, 47, 35,") ||
      fillStyle.startsWith("rgba(237, 224, 184,") ||
      fillStyle.startsWith("rgba(38, 33, 24,")
    );
  });
}
