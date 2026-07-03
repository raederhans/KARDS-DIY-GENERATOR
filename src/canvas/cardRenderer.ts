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

const DEFAULT_TEXT_FONT = "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif";
const DARK = "#4f514c";
const LIGHT = "#cfd5c2";
const PAPER = "#d8d2bd";
const ACTIVATED = "#ce8a31";

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
  drawText(ctx, layout, card, nation.accent, fonts);
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
  const deploymentSize = deploymentText.length > 1 ? 45 : 58;
  ctx.fillStyle = LIGHT;
  ctx.font = `800 ${deploymentSize}px ${fonts.utility}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(deploymentText, rect.x + 36, rect.y + 45);

  ctx.fillStyle = ACTIVATED;
  ctx.font = `800 22px ${fonts.utility}`;
  ctx.fillText("K", rect.x + 66, rect.y + 26);

  if (operation !== undefined) {
    ctx.fillStyle = LIGHT;
    ctx.font = `800 20px ${fonts.utility}`;
    ctx.fillText(String(operation), rect.x + 68, rect.y + 63);
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
  const pipWidth = 9;
  const gap = 4;
  const totalWidth = pipCount * pipWidth + (pipCount - 1) * gap;
  const startX = layout.rarity.x + (layout.rarity.width - totalWidth) / 2;
  ctx.fillStyle = color;
  let usedPipAsset = false;
  for (let i = 0; i < pipCount; i += 1) {
    const pipRect = { x: startX + i * (pipWidth + gap), y: layout.rarity.y + 4, width: pipWidth, height: layout.rarity.height - 8 };
    const hasPipAsset = drawAsset(ctx, options, "rarity-pip", pipRect, assetContext);
    usedPipAsset = hasPipAsset || usedPipAsset;
    if (!hasPipAsset) {
      ctx.fillRect(pipRect.x, pipRect.y, pipRect.width, pipRect.height);
    }
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
      42,
      isSpecialAttackKind(card.kind) ? "special-attack-board" : "attack-board",
      options,
      assetContext,
      fonts,
    );
  }
  drawStatBoard(ctx, layout.defenseBoard, card.stats.defense, "", 42, "defense-board", options, assetContext, fonts);
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
  if (drawAsset(ctx, options, "type-icon", rect, assetContext)) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = DARK;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "rgba(223, 222, 196, 0.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4);
  ctx.fillStyle = LIGHT;
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
  accent: string,
  fonts: ResolvedRenderFonts,
): void {
  const keywordLine = card.keywordLine?.trim();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (layout.title) {
    ctx.fillStyle = shouldUseDarkTitle(card.nation) ? DARK : LIGHT;
    fitText(ctx, card.title.toUpperCase(), layout.title.x, layout.title.y, layout.title.maxWidth, layout.title.size, fonts.title);
  } else if (layout.text.titleY !== undefined) {
    ctx.fillStyle = DARK;
    fitText(ctx, card.title.toUpperCase(), 250, layout.text.titleY, 340, 32, fonts.title);
  }

  if (keywordLine) {
    ctx.fillStyle = accent;
    ctx.font = `800 22px ${fonts.utility}`;
    ctx.fillText(keywordLine, 250, layout.text.keywordY);
  }

  ctx.fillStyle = DARK;
  ctx.font = `400 24px ${fonts.body}`;
  const bodyY = keywordLine ? layout.text.bodyY : layout.text.keywordY + 8;
  const bodyMaxLines = Math.max(
    1,
    Math.min(layout.text.maxLines, Math.floor((layout.text.bodyBottomY - bodyY) / layout.text.lineHeight) + 1),
  );
  drawWrappedText(ctx, card.body, 250, bodyY, layout.text.maxWidth, layout.text.lineHeight, bodyMaxLines);
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
  ctx.font = `800 ${fontSize}px ${fonts.utility}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value ?? 0), rect.x + rect.width / 2, rect.y + rect.height / 2 - 4);
  if (label) {
    ctx.font = `800 14px ${fonts.utility}`;
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height - 22);
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
): void {
  const lines = createWrappedTextLines(ctx, text, maxWidth, maxLines);

  lines.forEach((wrappedLine, index) => {
    ctx.fillText(wrappedLine, x, y + index * lineHeight);
  });
}

export function createWrappedTextLines(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean).flatMap((word) => splitLongToken(ctx, word, maxWidth));
  const lines: string[] = [];
  let line = "";
  let usedWordCount = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
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

  const wrappedLines = lines.map((wrappedLine) => truncateToWidth(ctx, wrappedLine, maxWidth));
  if (usedWordCount < words.length && wrappedLines.length > 0) {
    const lastLineIndex = wrappedLines.length - 1;
    wrappedLines[lastLineIndex] = appendEllipsisToWidth(ctx, wrappedLines[lastLineIndex], maxWidth);
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
): void {
  const size = getFittedFontSize(ctx, text, maxWidth, initialSize, 18, fontFamily);
  ctx.font = `800 ${size}px ${fontFamily}`;
  ctx.fillText(truncateToWidth(ctx, text, maxWidth), x, y);
}

export function getFittedFontSize(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
  fontFamily = DEFAULT_TEXT_FONT,
): number {
  let size = initialSize;
  while (size > minimumSize) {
    ctx.font = `800 ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }
    size -= 1;
  }
  return size;
}

export function truncateToWidth(ctx: TextMeasureContext, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  return appendEllipsisToWidth(ctx, text, maxWidth);
}

function appendEllipsisToWidth(ctx: TextMeasureContext, text: string, maxWidth: number): string {
  let truncatedText = text;
  while (truncatedText.length > 1 && ctx.measureText(`${truncatedText}...`).width > maxWidth) {
    truncatedText = truncatedText.slice(0, -1);
  }
  return `${truncatedText}...`;
}

function splitLongToken(ctx: TextMeasureContext, token: string, maxWidth: number): string[] {
  if (ctx.measureText(token).width <= maxWidth) {
    return [token];
  }

  const chunks: string[] = [];
  let chunk = "";
  for (const char of token) {
    const testChunk = `${chunk}${char}`;
    if (chunk && ctx.measureText(testChunk).width > maxWidth) {
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
  return {
    title: fonts?.title ?? fonts?.body ?? DEFAULT_TEXT_FONT,
    body: fonts?.body ?? DEFAULT_TEXT_FONT,
    utility: fonts?.utility ?? fonts?.title ?? fonts?.body ?? DEFAULT_TEXT_FONT,
  };
}
