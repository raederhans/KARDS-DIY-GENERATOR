import { getKind, getNation, getRarity, getSet } from "../presets";
import type { CardKind, CardSpec } from "../types";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  getCardFaceLayout,
  isUnitKind,
  type CardFaceLayout,
  type Rect,
} from "./layout";
import type {
  CardRenderAssetContext,
  CardRenderAssetSlot,
  CardRenderFontSet,
  RenderCardOptions,
} from "./renderAssets";

export { CARD_HEIGHT, CARD_WIDTH, getArtworkRect } from "./layout";
export { isPointInsideArtwork } from "./layout";

const LATIN_CONDENSED_FONT =
  "'Libre Franklin', 'Franklin Gothic Demi Cond', 'Franklin Gothic Demi Condensed', 'Franklin Gothic Medium Cond', 'Arial Narrow', 'Roboto Condensed'";
const NUMERIC_CARD_FONT = "'Yantramanav', 'Libre Franklin', 'Arial Narrow', 'Roboto Condensed'";
const CJK_CARD_FONT = "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB'";
const DEFAULT_TITLE_FONT = `${LATIN_CONDENSED_FONT}, ${CJK_CARD_FONT}, sans-serif`;
const DEFAULT_BODY_FONT = `${CJK_CARD_FONT}, ${LATIN_CONDENSED_FONT}, sans-serif`;
const DEFAULT_UTILITY_FONT = `${LATIN_CONDENSED_FONT}, ${CJK_CARD_FONT}, sans-serif`;
const DEFAULT_NUMERIC_FONT = `${NUMERIC_CARD_FONT}, ${CJK_CARD_FONT}, sans-serif`;
const DEFAULT_TEXT_FONT = DEFAULT_TITLE_FONT;
const DARK = "#4f514c";
const LIGHT = "#cfd5c2";
const PAPER = "#d8d2bd";
const TYPE_ICON_PAPER = PAPER;
const TYPE_ICON_PAPER_RGB = { r: 216, g: 210, b: 189 };
const TYPE_ICON_BOARD_DARK = "#41433d";
const ACTIVATED = "#ce8a31";
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const TYPE_ICON_GLYPH_CACHE = new WeakMap<object, CanvasImageSource>();
const TYPE_ICON_GLYPH_PLACEMENT: Partial<Record<CardKind, { offsetX?: number; offsetY?: number; scale?: number }>> = {
  tank: { offsetY: -7 },
  fighter: { offsetY: -4 },
  bomber: { offsetX: 1, offsetY: -7 },
  artillery: { offsetX: 3, offsetY: -10, scale: 1.08 },
};

type TextMeasureContext = Pick<CanvasRenderingContext2D, "font" | "measureText">;

type ResolvedRenderFonts = Required<CardRenderFontSet>;

export function renderCard(
  canvas: HTMLCanvasElement,
  card: CardSpec,
  artworkImage?: HTMLImageElement | null,
  options: RenderCardOptions = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const nation = getNation(card.nation);
  const rarity = getRarity(card.rarity);
  const set = getSet(card.set);
  const kind = getKind(card.kind);
  const layout = getCardFaceLayout(card.kind);
  const assetContext: CardRenderAssetContext = {
    card,
    kind: card.kind,
    nationId: card.nation,
    rarityId: card.rarity,
    setId: card.set,
    template: layout.template,
  };
  const fonts = resolveRenderFonts(options.fonts);

  drawCardMat(ctx, options, assetContext);
  drawArtwork(ctx, layout.artwork, card, artworkImage, nation.deep);
  if (layout.template === "unit") {
    drawNameBar(ctx, layout, nation.accent, options, assetContext);
  } else {
    drawExtraBorder(ctx, layout, options, assetContext);
  }
  if (layout.costBoard) {
    drawCostBoard(
      ctx,
      layout.costBoard,
      card.costs.deployment,
      isUnitKind(card.kind) ? card.costs.operation : undefined,
      options,
      assetContext,
      fonts,
    );
  }
  drawNationMark(ctx, layout, nation, options, assetContext, fonts);
  drawFrame(ctx, options, assetContext);
  drawRarity(ctx, layout, rarity.color, card.rarity, options, assetContext);
  drawSet(ctx, layout, set.mark, options, assetContext, fonts);
  drawValues(ctx, layout, card, options, assetContext, fonts);
  drawTypeIcon(ctx, layout, card.kind, kind.symbol, options, assetContext, fonts);
  drawText(ctx, layout, card, fonts);
  if (!options.disablePrintWear) {
    drawPrintWear(ctx);
  }
}

function drawCardMat(
  ctx: CanvasRenderingContext2D,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
): void {
  ctx.save();
  if (drawAsset(ctx, options, "card-mat", { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT }, assetContext)) {
    ctx.restore();
    return;
  }

  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 18);
  ctx.fillStyle = "#12110d";
  ctx.fill();

  roundRect(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 14);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.restore();
}

function drawArtwork(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  card: CardSpec,
  artworkImage: HTMLImageElement | null | undefined,
  deepColor: string,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  if (artworkImage) {
    const baseScale = Math.max(rect.width / artworkImage.naturalWidth, rect.height / artworkImage.naturalHeight);
    const scale = baseScale * card.artwork.crop.scale;
    const width = artworkImage.naturalWidth * scale;
    const height = artworkImage.naturalHeight * scale;
    const x = rect.x + (rect.width - width) / 2 + card.artwork.crop.x;
    const y = rect.y + (rect.height - height) / 2 + card.artwork.crop.y;
    ctx.drawImage(artworkImage, x, y, width, height);
  } else {
    const backdrop = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
    backdrop.addColorStop(0, "#dad1af");
    backdrop.addColorStop(0.45, deepColor);
    backdrop.addColorStop(1, "#59584a");
    ctx.fillStyle = backdrop;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#f0e4c6";
    for (let i = -2; i < 12; i += 1) {
      ctx.beginPath();
      ctx.moveTo(rect.x + i * 58, rect.y);
      ctx.lineTo(rect.x + i * 58 + 34, rect.y);
      ctx.lineTo(rect.x + i * 58 - 92, rect.y + rect.height);
      ctx.lineTo(rect.x + i * 58 - 126, rect.y + rect.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(35, 35, 29, 0.72)";
    ctx.font = `700 18px ${DEFAULT_TEXT_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("ARTWORK", rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  ctx.restore();
}

function drawNameBar(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  accent: string,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
): void {
  if (!layout.nameBar) {
    return;
  }

  ctx.save();
  if (drawAsset(ctx, options, "unit-name-bar", layout.nameBar, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = accent;
  ctx.fillRect(layout.nameBar.x, layout.nameBar.y, layout.nameBar.width, layout.nameBar.height);
  if (layout.splitter) {
    ctx.fillStyle = "rgba(205, 213, 194, 0.72)";
    ctx.fillRect(layout.splitter.x, layout.splitter.y, layout.splitter.width, layout.splitter.height);
  }
  ctx.restore();
}

function drawExtraBorder(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
): void {
  if (!layout.extraBorder) {
    return;
  }

  ctx.save();
  const rect = layout.extraBorder;
  if (drawAsset(ctx, options, "command-border", rect, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = PAPER;
  ctx.fillRect(rect.x + 8, rect.y, rect.width - 16, rect.height);
  ctx.strokeStyle = "rgba(79, 81, 76, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, rect.y);
  ctx.lineTo(488, rect.y);
  ctx.stroke();
  ctx.restore();
}

function drawCostBoard(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  deployment: number | undefined,
  operation: number | undefined,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
  fonts: ResolvedRenderFonts,
): void {
  ctx.save();
  const hasAsset = drawAsset(ctx, options, "cost-board", rect, assetContext);
  if (!hasAsset) {
    ctx.fillStyle = DARK;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = "rgba(223, 222, 196, 0.75)";
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);
  }

  const deploymentText = String(deployment ?? 0);
  const deploymentSize = deploymentText.length > 1 ? 58 : 78;
  const costScale = getTextScale(deploymentText, 1.22, 1.02);
  const deploymentCenterX = rect.x + 33;
  const sideCostCenterX = rect.x + 67;
  const sideCostTopY = rect.y + 31;
  const sideCostBottomY = rect.y + 58;
  ctx.fillStyle = LIGHT;
  ctx.font = `900 ${deploymentSize}px ${fonts.cost}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fillScaledText(ctx, deploymentText, deploymentCenterX, rect.y + 47, costScale);

  ctx.fillStyle = ACTIVATED;
  ctx.font = `900 27px ${fonts.cost}`;
  fillScaledText(ctx, "K", sideCostCenterX, sideCostTopY, 1.15);

  if (operation !== undefined) {
    ctx.fillStyle = LIGHT;
    const operationText = String(operation);
    ctx.font = `900 27px ${fonts.cost}`;
    fillScaledText(ctx, operationText, sideCostCenterX, sideCostBottomY, getTextScale(operationText, 1.14, 1.02));
  }
  ctx.restore();
}

function drawNationMark(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  nation: { accent: string; shortLabel: string; emblem: string },
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
  fonts: ResolvedRenderFonts,
): void {
  ctx.save();
  const size = layout.nationSize;
  const x = layout.nationCenter.x - size / 2;
  const y = layout.nationCenter.y - size / 2;
  if (drawAsset(ctx, options, "nation-mark", { x, y, width: size, height: size }, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(79, 81, 76, 0.88)";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "rgba(223, 222, 196, 0.68)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
  ctx.fillStyle = LIGHT;
  ctx.font = nation.emblem === "star" ? `800 34px ${fonts.utility}` : `800 20px ${fonts.utility}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(resolveNationGlyph(nation), layout.nationCenter.x, layout.nationCenter.y + 1);
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
): void {
  ctx.save();
  if (drawAsset(ctx, options, "frame", { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT }, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#c3bda8";
  roundRect(ctx, 4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, 16);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(35, 35, 29, 0.7)";
  roundRect(ctx, 11, 11, CARD_WIDTH - 22, CARD_HEIGHT - 22, 10);
  ctx.stroke();
  ctx.restore();
}

function drawRarity(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  color: string,
  rarityId: string,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
): void {
  if (!layout.rarity) {
    return;
  }

  ctx.save();
  const pipCount = getRarityPipCount(rarityId);
  const pipWidth = 8;
  const pipHeight = 13;
  const gap = 4;
  const totalWidth = pipCount * pipWidth + (pipCount - 1) * gap;
  const startX = Math.round(layout.rarity.x + (layout.rarity.width - totalWidth) / 2);
  ctx.fillStyle = color;
  let usedPipAsset = false;
  for (let i = 0; i < pipCount; i += 1) {
    const centerOffset = i - (pipCount - 1) / 2;
    const centerX = startX + i * (pipWidth + gap) + pipWidth / 2;
    const centerY = layout.rarity.y + 9 + Math.abs(centerOffset) * 1.1;
    const rotation = centerOffset * 0.08;
    const pipRect = { x: -pipWidth / 2, y: -pipHeight / 2, width: pipWidth, height: pipHeight };
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    const hasPipAsset = drawAsset(ctx, options, "rarity-pip", pipRect, assetContext);
    usedPipAsset = hasPipAsset || usedPipAsset;
    if (!hasPipAsset) {
      drawRarityPipShape(ctx, pipRect);
    }
    ctx.restore();
  }
  if (!usedPipAsset) {
    ctx.strokeStyle = "rgba(79, 81, 76, 0.35)";
    ctx.strokeRect(layout.rarity.x, layout.rarity.y, layout.rarity.width, layout.rarity.height);
  }
  ctx.restore();
}

function drawSet(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  mark: string,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
  fonts: ResolvedRenderFonts,
): void {
  if (!layout.setAnchor) {
    return;
  }

  ctx.save();
  const setRect = { x: layout.setAnchor.x - 28, y: layout.setAnchor.y - 26, width: 28, height: 28 };
  if (drawAsset(ctx, options, "set-mark", setRect, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(79, 81, 76, 0.55)";
  ctx.font = `800 16px ${fonts.utility}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(mark, layout.setAnchor.x, layout.setAnchor.y);
  ctx.restore();
}

function drawValues(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  card: CardSpec,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
  fonts: ResolvedRenderFonts,
): void {
  if (layout.template === "hq" && layout.hqDefenseBoard) {
    drawStatBoard(ctx, layout.hqDefenseBoard, card.stats.hqDefense, "HQ", 58, "hq-defense-board", options, assetContext, fonts);
    return;
  }

  if (!isUnitKind(card.kind) || !layout.defenseBoard) {
    return;
  }

  const attackRect = isSpecialAttackKind(card.kind) && layout.specialAttackBoard ? layout.specialAttackBoard : layout.attackBoard;
  if (attackRect) {
    drawStatBoard(
      ctx,
      attackRect,
      card.stats.attack,
      "",
      52,
      isSpecialAttackKind(card.kind) ? "special-attack-board" : "attack-board",
      options,
      assetContext,
      fonts,
      7,
    );
  }
  drawStatBoard(ctx, layout.defenseBoard, card.stats.defense, "", 52, "defense-board", options, assetContext, fonts);
}

function drawTypeIcon(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  kind: CardKind,
  symbol: string,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
  fonts: ResolvedRenderFonts,
): void {
  if (!layout.typeIcon) {
    return;
  }

  ctx.save();
  const rect = layout.typeIcon;
  drawTypeIconBoard(ctx, rect, options, assetContext);
  if (drawTypeIconGlyphAsset(ctx, options, rect, kind, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = TYPE_ICON_PAPER;
  ctx.font = `800 ${kind === "order" || kind === "countermeasure" ? 34 : 22}px ${fonts.utility}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(resolveTypeGlyph(kind, symbol), rect.x + rect.width / 2, rect.y + rect.height / 2 + 1);
  ctx.restore();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  card: CardSpec,
  fonts: ResolvedRenderFonts,
): void {
  const keywordLine = card.keywordLine?.trim();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (layout.title) {
    ctx.fillStyle = shouldUseDarkTitle(card.nation) ? DARK : LIGHT;
    fitText(
      ctx,
      card.title.toUpperCase(),
      layout.title.x,
      layout.title.y,
      layout.title.maxWidth,
      layout.title.size,
      fonts.title,
      getTextScale(card.title, 1.12, 1.02),
    );
  } else if (layout.text.titleY !== undefined) {
    ctx.fillStyle = DARK;
    fitText(ctx, card.title.toUpperCase(), 250, layout.text.titleY, 340, 36, fonts.title, getTextScale(card.title, 1.08, 1.02));
  }

  if (keywordLine) {
    const formattedKeywordLine = formatKeywordLine(keywordLine);
    ctx.fillStyle = DARK;
    ctx.font = `800 27px ${fonts.keyword}`;
    fillScaledText(ctx, formattedKeywordLine, 250, layout.text.keywordY, getTextScale(formattedKeywordLine, 1.02, 1));
  }

  ctx.fillStyle = DARK;
  ctx.font = `500 24px ${fonts.body}`;
  const bodyY = keywordLine ? layout.text.bodyY : layout.text.keywordY;
  const bodyMaxLines = Math.max(
    1,
    Math.min(layout.text.maxLines, Math.floor((layout.text.bodyBottomY - bodyY) / layout.text.lineHeight) + 1),
  );
  drawWrappedText(ctx, card.body, 250, bodyY, layout.text.maxWidth, layout.text.lineHeight, bodyMaxLines, getTextScale(card.body, 0.96, 1));
  ctx.restore();
}

function drawStatBoard(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  value: number | undefined,
  label: string,
  fontSize: number,
  assetSlot: CardRenderAssetSlot,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
  fonts: ResolvedRenderFonts,
  valueYOffset = 2,
): void {
  ctx.save();
  const hasAsset = drawAsset(ctx, options, assetSlot, rect, assetContext);
  if (!hasAsset) {
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.moveTo(rect.x + 6, rect.y + 4);
    ctx.lineTo(rect.x + rect.width - 6, rect.y + 4);
    ctx.lineTo(rect.x + rect.width - 6, rect.y + rect.height - 18);
    ctx.lineTo(rect.x + rect.width / 2, rect.y + rect.height - 4);
    ctx.lineTo(rect.x + 6, rect.y + rect.height - 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(223, 222, 196, 0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = LIGHT;
  const valueText = String(value ?? 0);
  ctx.font = `900 ${fontSize + 2}px ${fonts.stat}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fillScaledText(ctx, valueText, rect.x + rect.width / 2, rect.y + rect.height / 2 + valueYOffset, getTextScale(valueText, 1.18, 1.02));
  if (label) {
    ctx.font = `900 14px ${fonts.stat}`;
    fillScaledText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height - 22, getTextScale(label, 1.08, 1.02));
  }
  ctx.restore();
}

function drawPrintWear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 380; i += 1) {
    const x = (i * 37) % CARD_WIDTH;
    const y = (i * 73) % CARD_HEIGHT;
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#1f1d17";
    ctx.fillRect(x, y, 1 + (i % 2), 1 + (i % 3));
  }
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  scaleX = 1,
): void {
  const lines = createWrappedTextLines(ctx, text, maxWidth, maxLines, scaleX);

  lines.forEach((wrappedLine, index) => {
    fillScaledText(ctx, wrappedLine, x, y + index * lineHeight, scaleX);
  });
}

export function createWrappedTextLines(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  maxLines: number,
  scaleX = 1,
): string[] {
  const words = text.split(/\s+/).filter(Boolean).flatMap((word) => splitLongToken(ctx, word, maxWidth, scaleX));
  const lines: string[] = [];
  let line = "";
  let usedWordCount = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (measureScaledText(ctx, testLine, scaleX) > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) {
        break;
      }
    } else {
      line = testLine;
    }
    usedWordCount += 1;
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  const wrappedLines = lines.map((wrappedLine) => truncateToWidth(ctx, wrappedLine, maxWidth, scaleX));
  if (usedWordCount < words.length && wrappedLines.length > 0) {
    const lastLineIndex = wrappedLines.length - 1;
    wrappedLines[lastLineIndex] = appendEllipsisToWidth(ctx, wrappedLines[lastLineIndex], maxWidth, scaleX);
  }

  return wrappedLines;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number,
  fontFamily = DEFAULT_TEXT_FONT,
  scaleX = 1,
): void {
  const size = getFittedFontSize(ctx, text, maxWidth, initialSize, 18, fontFamily, scaleX);
  ctx.font = `800 ${size}px ${fontFamily}`;
  fillScaledText(ctx, truncateToWidth(ctx, text, maxWidth, scaleX), x, y, scaleX);
}

export function getFittedFontSize(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
  fontFamily = DEFAULT_TEXT_FONT,
  scaleX = 1,
): number {
  let size = initialSize;
  while (size > minimumSize) {
    ctx.font = `800 ${size}px ${fontFamily}`;
    if (measureScaledText(ctx, text, scaleX) <= maxWidth) {
      break;
    }
    size -= 1;
  }
  return size;
}

export function truncateToWidth(ctx: TextMeasureContext, text: string, maxWidth: number, scaleX = 1): string {
  if (measureScaledText(ctx, text, scaleX) <= maxWidth) {
    return text;
  }

  return appendEllipsisToWidth(ctx, text, maxWidth, scaleX);
}

function appendEllipsisToWidth(ctx: TextMeasureContext, text: string, maxWidth: number, scaleX = 1): string {
  let truncatedText = text;
  while (truncatedText.length > 1 && measureScaledText(ctx, `${truncatedText}...`, scaleX) > maxWidth) {
    truncatedText = truncatedText.slice(0, -1);
  }
  return `${truncatedText}...`;
}

function splitLongToken(ctx: TextMeasureContext, token: string, maxWidth: number, scaleX = 1): string[] {
  if (measureScaledText(ctx, token, scaleX) <= maxWidth) {
    return [token];
  }

  const chunks: string[] = [];
  let chunk = "";
  for (const char of token) {
    const testChunk = `${chunk}${char}`;
    if (chunk && measureScaledText(ctx, testChunk, scaleX) > maxWidth) {
      chunks.push(chunk);
      chunk = char;
    } else {
      chunk = testChunk;
    }
  }

  if (chunk) {
    chunks.push(chunk);
  }
  return chunks;
}

function fillScaledText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scaleX = 1): void {
  if (scaleX === 1) {
    ctx.fillText(text, x, y);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawRarityPipShape(ctx: CanvasRenderingContext2D, rect: Rect): void {
  ctx.beginPath();
  ctx.moveTo(rect.x + 1, rect.y);
  ctx.lineTo(rect.x + rect.width - 1, rect.y);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
  ctx.lineTo(rect.x, rect.y + rect.height);
  ctx.closePath();
  ctx.fill();
}

function drawTypeIconBoard(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  options: RenderCardOptions,
  assetContext: CardRenderAssetContext,
): void {
  const boardImage = options.assets?.resolveImage("type-icon-board", assetContext);
  if (boardImage) {
    ctx.drawImage(boardImage, rect.x, rect.y, rect.width, rect.height);
    return;
  }

  const border = Math.max(4, Math.round(Math.min(rect.width, rect.height) * 0.075));
  ctx.fillStyle = TYPE_ICON_PAPER;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 9);
  ctx.fill();
  ctx.fillStyle = TYPE_ICON_BOARD_DARK;
  roundRect(ctx, rect.x + border, rect.y + border, rect.width - border * 2, rect.height - border * 2, 5);
  ctx.fill();
}

function drawTypeIconGlyphAsset(
  ctx: CanvasRenderingContext2D,
  options: RenderCardOptions,
  rect: Rect,
  kind: CardKind,
  assetContext: CardRenderAssetContext,
): boolean {
  const glyphLayer = options.assets?.resolveImage("type-icon-glyph", assetContext);
  const legacyLayer = glyphLayer ? undefined : options.assets?.resolveImage("type-icon", assetContext);
  const image = glyphLayer ?? legacyLayer;
  if (!image) {
    return false;
  }

  const sourceSize = getCanvasImageSize(image, rect);
  const glyphImage = glyphLayer ?? createTypeIconGlyphImage(image, sourceSize);
  if (!glyphImage) {
    return false;
  }
  const sourceInsetX = Math.max(1, Math.round(sourceSize.width * 0.14));
  const sourceInsetY = Math.max(1, Math.round(sourceSize.height * 0.14));
  const sourceWidth = Math.max(1, sourceSize.width - sourceInsetX * 2);
  const sourceHeight = Math.max(1, sourceSize.height - sourceInsetY * 2);
  const glyphInsetX = Math.round(rect.width * 0.18);
  const glyphInsetY = Math.round(rect.height * 0.18);
  const placement = TYPE_ICON_GLYPH_PLACEMENT[kind] ?? {};
  const glyphScale = placement.scale ?? 1;
  const glyphWidth = (rect.width - glyphInsetX * 2) * glyphScale;
  const glyphHeight = (rect.height - glyphInsetY * 2) * glyphScale;
  const glyphX = rect.x + (rect.width - glyphWidth) / 2 + (placement.offsetX ?? 0);
  const glyphY = rect.y + (rect.height - glyphHeight) / 2 + (placement.offsetY ?? 0);

  ctx.save();
  roundRect(ctx, rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, 7);
  ctx.clip();
  ctx.drawImage(
    glyphImage,
    sourceInsetX,
    sourceInsetY,
    sourceWidth,
    sourceHeight,
    glyphX,
    glyphY,
    glyphWidth,
    glyphHeight,
  );
  ctx.restore();
  return true;
}

function createTypeIconGlyphImage(image: CanvasImageSource, sourceSize: { width: number; height: number }): CanvasImageSource | undefined {
  const cacheKey = image as object;
  const cached = TYPE_ICON_GLYPH_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (typeof document === "undefined") {
    return undefined;
  }

  const glyphCanvas = document.createElement("canvas");
  glyphCanvas.width = sourceSize.width;
  glyphCanvas.height = sourceSize.height;
  const glyphCtx = glyphCanvas.getContext("2d", { willReadFrequently: true });
  if (!glyphCtx) {
    return undefined;
  }

  try {
    glyphCtx.drawImage(image, 0, 0, sourceSize.width, sourceSize.height);
    const imageData = glyphCtx.getImageData(0, 0, sourceSize.width, sourceSize.height);
    const data = imageData.data;
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      const luma = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
      if (alpha < 24 || luma < 150) {
        data[index + 3] = 0;
        continue;
      }

      data[index] = TYPE_ICON_PAPER_RGB.r;
      data[index + 1] = TYPE_ICON_PAPER_RGB.g;
      data[index + 2] = TYPE_ICON_PAPER_RGB.b;
      data[index + 3] = Math.min(255, Math.max(alpha, Math.round((luma - 118) * 4.6)));
    }
    glyphCtx.clearRect(0, 0, sourceSize.width, sourceSize.height);
    glyphCtx.putImageData(imageData, 0, 0);
    TYPE_ICON_GLYPH_CACHE.set(cacheKey, glyphCanvas);
    return glyphCanvas;
  } catch {
    return undefined;
  }
}

function getCanvasImageSize(image: CanvasImageSource, fallback: Rect): { width: number; height: number } {
  const imageLike = image as {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
  };

  return {
    width: imageLike.naturalWidth || imageLike.videoWidth || Number(imageLike.width) || fallback.width,
    height: imageLike.naturalHeight || imageLike.videoHeight || Number(imageLike.height) || fallback.height,
  };
}

function measureScaledText(ctx: TextMeasureContext, text: string, scaleX = 1): number {
  return ctx.measureText(text).width * scaleX;
}

function getTextScale(text: string, latinScale: number, cjkScale: number): number {
  return CJK_RE.test(text) ? cjkScale : latinScale;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 8,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function resolveNationGlyph(nation: { shortLabel: string; emblem: string }): string {
  if (nation.emblem === "star") {
    return "*";
  }

  if (nation.emblem === "cross") {
    return "+";
  }

  return nation.shortLabel;
}

function resolveTypeGlyph(kind: CardKind, defaultSymbol: string): string {
  if (kind === "order") {
    return "!";
  }

  if (kind === "countermeasure") {
    return "?";
  }

  return defaultSymbol;
}

function formatKeywordLine(keywordLine: string): string {
  return keywordLine
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/^[A-Z]{2,}$/.test(word) ? `${word[0]}${word.slice(1).toLowerCase()}` : word))
    .join(" ");
}

function getRarityPipCount(rarityId: string): number {
  switch (rarityId) {
    case "elite":
      return 1;
    case "special":
      return 2;
    case "limited":
      return 3;
    default:
      return 4;
  }
}

function isSpecialAttackKind(kind: CardKind): boolean {
  return kind === "fighter" || kind === "bomber" || kind === "artillery";
}

function shouldUseDarkTitle(nationId: string): boolean {
  return nationId === "finland";
}

function drawAsset(
  ctx: CanvasRenderingContext2D,
  options: RenderCardOptions,
  slot: CardRenderAssetSlot,
  rect: Rect,
  assetContext: CardRenderAssetContext,
): boolean {
  const image = options.assets?.resolveImage(slot, assetContext);
  if (!image) {
    return false;
  }

  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  return true;
}

function resolveRenderFonts(fonts: CardRenderFontSet | undefined): ResolvedRenderFonts {
  const title = fonts?.title ?? fonts?.body ?? DEFAULT_TITLE_FONT;
  const body = fonts?.body ?? DEFAULT_BODY_FONT;
  const utility = fonts?.utility ?? fonts?.title ?? fonts?.body ?? DEFAULT_UTILITY_FONT;
  return {
    title,
    body,
    keyword: fonts?.keyword ?? utility,
    cost: fonts?.cost ?? DEFAULT_NUMERIC_FONT,
    stat: fonts?.stat ?? DEFAULT_NUMERIC_FONT,
    utility,
  };
}
