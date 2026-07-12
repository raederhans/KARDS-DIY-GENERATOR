import { getKind, getNation, getRarity, getSet } from "../presets";
import { CARD_TEXTURE_BOUNDS, DEFAULT_CARD_APPEARANCE } from "../cardModel";
import type { CardKind, CardSpec } from "../types";
import { translateKeywordLabel } from "../i18n";
import { getKeywordPreset, resolveCardKeywordIds } from "../keywords";
import { CARD_FACE_VALUE_MAX } from "../limits";
import { drawMarkedBodyText } from "./bodyTextRenderer";
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
const HQ_DEFENSE_FONT_SIZE = 104;
const HQ_DEFENSE_SCALE_X = 0.85;
const HQ_DEFENSE_Y_OFFSET = -12;
const HQ_DEFENSE_FONT = "'Microsoft YaHei UI', 'Microsoft YaHei'";
const DARK = "#4f514c";
const LIGHT = "#cfd5c2";
const PAPER = "#d8d2bd";
const TYPE_ICON_PAPER = PAPER;
const TYPE_ICON_PAPER_RGB = { r: 216, g: 210, b: 189 };
const TYPE_ICON_BOARD_DARK = "#41433d";
const COST_BOARD_DARK = "#3f423b";
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

type StatBoardShape = "shield" | "inverted-shield" | "reticle" | "hq-shield";

type ResolvedRenderFonts = Required<CardRenderFontSet>;

type NumberGlyphStyle = {
  fontSize: number;
  scaleX: number;
  scaleY: number;
};

type PrintWearSettings = {
  seed: number;
  image: CanvasImageSource | null;
  intensity: number;
  randomness: number;
  mottle: number;
};

type PrintWearProtectedRegion =
  | { kind: "rect"; rect: Rect }
  | { kind: "stat-board"; rect: Rect; shape: StatBoardShape }
  | { kind: "round-rect"; rect: Rect; radius: number };

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

  const pixelScale = normalizePixelScale(options.pixelScale);
  canvas.width = CARD_WIDTH * pixelScale;
  canvas.height = CARD_HEIGHT * pixelScale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (pixelScale !== 1) {
    ctx.scale(pixelScale, pixelScale);
  }

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
  drawArtwork(ctx, layout, card, artworkImage, nation.deep);
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
      isUnitKind(card.kind) ? card.costs.operation ?? 0 : undefined,
      options,
      assetContext,
      fonts,
      layout.costBoardGap,
    );
  }
  if (layout.template !== "hq") {
    drawNationMark(ctx, layout, nation, options, assetContext, fonts);
  }
  drawFrame(ctx, options, assetContext);
  if (!options.disablePrintWear) {
    drawPrintWear(ctx, resolvePrintWearSettings(options), getPrintWearProtectedRegions(layout, card.kind), pixelScale);
  }
  drawRarity(ctx, layout, rarity.color, card.rarity, options, assetContext);
  drawSet(ctx, layout, set.mark, options, assetContext, fonts);
  drawValues(ctx, layout, card, options, assetContext, fonts);
  drawTypeIcon(ctx, layout, card.kind, kind.symbol, options, assetContext, fonts);
  drawText(ctx, layout, card, fonts, options);
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
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.restore();
}

function drawArtwork(
  ctx: CanvasRenderingContext2D,
  layout: CardFaceLayout,
  card: CardSpec,
  artworkImage: HTMLImageElement | null | undefined,
  deepColor: string,
): void {
  const rect = layout.artwork;
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
  } else if (layout.template === "hq") {
    drawHqArtworkPlaceholder(ctx, rect, deepColor);
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
  const hasNameBarAsset = drawAsset(ctx, options, "unit-name-bar", layout.nameBar, assetContext);
  if (!hasNameBarAsset) {
    ctx.fillStyle = accent;
    ctx.fillRect(layout.nameBar.x, layout.nameBar.y, layout.nameBar.width, layout.nameBar.height);
  }

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
  gap = 0,
): void {
  ctx.save();
  if (gap > 0) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(rect.x + rect.width, rect.y, gap, rect.height + gap);
    ctx.fillRect(rect.x, rect.y + rect.height, rect.width + gap, gap);
  }

  const hasAsset = drawAsset(ctx, options, "cost-board", rect, assetContext);
  if (!hasAsset) {
    ctx.fillStyle = COST_BOARD_DARK;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  const deploymentText = formatCardFaceValue(deployment);
  const deploymentStyle = resolveBoardNumberStyle(
    deploymentText,
    { fontSize: 72, scaleX: getTextScale(deploymentText, 1.12, 1), scaleY: 1.06 },
    { fontSize: 50, scaleX: 0.86, scaleY: 1.02 },
  );
  const sideCostScaleY = 1;
  const deploymentCenterX = rect.x + rect.width * 0.38;
  const sideCostCenterX = rect.x + rect.width * 0.785;
  const sideCostTopY = rect.y + rect.height * 0.32;
  const sideCostBottomY = rect.y + rect.height * 0.69;
  ctx.fillStyle = LIGHT;
  ctx.font = `900 ${deploymentStyle.fontSize}px ${fonts.cost}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fillScaledText(ctx, deploymentText, deploymentCenterX, rect.y + rect.height * 0.56, deploymentStyle.scaleX, deploymentStyle.scaleY);

  ctx.fillStyle = ACTIVATED;
  const kreditSize = gap > 0 ? 25 : 23;
  const kreditScale = gap > 0 ? 1.08 : 1.02;
  ctx.font = `900 ${kreditSize}px ${fonts.cost}`;
  fillScaledText(ctx, "K", sideCostCenterX, sideCostTopY, kreditScale, sideCostScaleY);

  if (operation !== undefined) {
    ctx.fillStyle = LIGHT;
    const operationText = formatCardFaceValue(operation);
    const operationStyle = resolveBoardNumberStyle(
      operationText,
      { fontSize: 27, scaleX: getTextScale(operationText, 1.14, 1.02), scaleY: 1.08 },
      { fontSize: 21, scaleX: 0.86, scaleY: 1 },
    );
    ctx.font = `900 ${operationStyle.fontSize}px ${fonts.cost}`;
    fillScaledText(ctx, operationText, sideCostCenterX, sideCostBottomY, operationStyle.scaleX, operationStyle.scaleY);
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
  if (assetContext.nationId === "custom") {
    ctx.restore();
    return;
  }

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

  if (rarityId === "none") {
    return;
  }

  if (rarityId === "elite" || rarityId === "special") {
    const markImage = options.assets?.resolveImage("rarity-pip", assetContext);
    if (markImage) {
      drawCenteredRarityMark(ctx, markImage, layout.rarity, rarityId);
      return;
    }
  }

  ctx.save();
  const pipCount = getRarityPipCount(rarityId);
  const pipWidth = 9;
  const pipHeight = 12;
  const gap = 4;
  const totalWidth = pipCount * pipWidth + (pipCount - 1) * gap;
  const startX = Math.round(layout.rarity.x + (layout.rarity.width - totalWidth) / 2);
  ctx.fillStyle = color;
  for (let i = 0; i < pipCount; i += 1) {
    const centerOffset = i - (pipCount - 1) / 2;
    const centerX = startX + i * (pipWidth + gap) + pipWidth / 2;
    const centerY = layout.rarity.y + 10 + Math.abs(centerOffset) * 1.1;
    const rotation = centerOffset * 0.08;
    const pipRect = { x: -pipWidth / 2, y: -pipHeight / 2, width: pipWidth, height: pipHeight };
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    if (!drawAsset(ctx, options, "rarity-pip", pipRect, assetContext)) {
      drawRarityPipShape(ctx, pipRect);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawCenteredRarityMark(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  slot: Rect,
  rarityId: string,
): void {
  const sourceSize = getCanvasImageSize(image, slot);
  const maxSize = rarityId === "elite" ? { width: 48, height: 20 } : { width: 34, height: 20 };
  const scale = Math.min(1, maxSize.width / sourceSize.width, maxSize.height / sourceSize.height);
  const width = Math.round(sourceSize.width * scale);
  const height = Math.round(sourceSize.height * scale);
  const x = slot.x + (slot.width - width) / 2;
  const y = slot.y + (slot.height - height) / 2;

  ctx.drawImage(image, x, y, width, height);
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
  const setImage = options.assets?.resolveImage("set-mark", assetContext);
  if (setImage) {
    const sourceSize = getCanvasImageSize(setImage, { x: 0, y: 0, width: 30, height: 28 });
    const scale = Math.min(1, 30 / sourceSize.width, 28 / sourceSize.height);
    const width = Math.round(sourceSize.width * scale);
    const height = Math.round(sourceSize.height * scale);
    ctx.drawImage(setImage, layout.setAnchor.x - width, layout.setAnchor.y - 26, width, height);
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
    drawStatBoard(
      ctx,
      layout.hqDefenseBoard,
      card.stats.hqDefense,
      "",
      HQ_DEFENSE_FONT_SIZE,
      "hq-defense-board",
      options,
      assetContext,
      fonts,
      HQ_DEFENSE_Y_OFFSET,
      "hq-shield",
    );
    return;
  }

  if (!isUnitKind(card.kind) || !layout.defenseBoard) {
    return;
  }

  const specialAttack = isSpecialAttackKind(card.kind);
  const attackRect = specialAttack && layout.specialAttackBoard ? layout.specialAttackBoard : layout.attackBoard;
  if (attackRect) {
    drawStatBoard(
      ctx,
      attackRect,
      card.stats.attack,
      "",
      52,
      specialAttack ? "special-attack-board" : "attack-board",
      options,
      assetContext,
      fonts,
      7,
      getAttackBoardShape(card.kind),
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
  options: RenderCardOptions,
): void {
  const textAppearance = card.appearance?.text ?? DEFAULT_CARD_APPEARANCE.text;
  const titleAppearance = textAppearance.title ?? DEFAULT_CARD_APPEARANCE.text.title;
  const keywordAppearance = textAppearance.keywords ?? DEFAULT_CARD_APPEARANCE.text.keywords;
  const bodyAppearance = textAppearance.body ?? DEFAULT_CARD_APPEARANCE.text.body;
  const keywordLabels = resolveCardKeywordIds(card)
    .map((keywordId) => {
      const preset = getKeywordPreset(keywordId);
      return preset ? translateKeywordLabel(options.language ?? "en", keywordId, preset.label) : undefined;
    })
    .filter(Boolean) as string[];
  const visibleKeywordLabels = layout.template === "hq" ? [] : keywordLabels;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (layout.title) {
    ctx.fillStyle = shouldUseDarkTitle(card.nation) ? DARK : LIGHT;
    const baseScaleX = getTextScale(card.title, 1.12, 1.02);
    fitText(
      ctx,
      card.title.toUpperCase(),
      layout.title.x + titleAppearance.offsetX,
      layout.title.y + titleAppearance.offsetY,
      layout.title.maxWidth,
      Math.round(layout.title.size * titleAppearance.fontScale),
      fonts.title,
      baseScaleX * titleAppearance.scaleX,
      titleAppearance.scaleY,
      titleAppearance.bold ? 800 : 600,
    );
  } else if (layout.text.titleY !== undefined) {
    ctx.fillStyle = DARK;
    const isCommandTemplate = layout.template === "command";
    const isHqTemplate = layout.template === "hq";
    const baseScaleX = isCommandTemplate ? 0.98 : getTextScale(card.title, 1.08, 1.02);
    fitText(
      ctx,
      card.title.toUpperCase(),
      250 + titleAppearance.offsetX,
      layout.text.titleY + titleAppearance.offsetY,
      isCommandTemplate ? 420 : isHqTemplate ? 440 : 340,
      Math.round((isCommandTemplate || isHqTemplate ? 40 : 36) * titleAppearance.fontScale),
      fonts.title,
      baseScaleX * titleAppearance.scaleX,
      titleAppearance.scaleY,
      titleAppearance.bold ? 800 : 600,
    );
  }

  if (visibleKeywordLabels.length > 0) {
    drawKeywordLabels(
      ctx,
      visibleKeywordLabels,
      250 + keywordAppearance.offsetX,
      layout.text.keywordY + keywordAppearance.offsetY,
      layout.text.maxWidth,
      fonts.keyword,
      keywordAppearance,
    );
  }

  ctx.fillStyle = DARK;
  const bodyFont = layout.template === "command" ? fonts.utility : fonts.body;
  const bodyScale = (layout.template === "command" ? 0.92 : getTextScale(card.body, 0.96, 1)) * bodyAppearance.scaleX;
  const bodyWeights = layout.template === "command" ? { regular: 400, bold: 800 } : undefined;
  const bodyFontSize = Math.round(24 * bodyAppearance.fontScale);
  ctx.font = `${bodyWeights?.regular ?? 500} ${bodyFontSize}px ${bodyFont}`;
  const bodyY = visibleKeywordLabels.length > 0 ? layout.text.bodyY : layout.text.keywordY;
  drawMarkedBodyText(
    ctx,
    card.body,
    250 + bodyAppearance.offsetX,
    bodyY + bodyAppearance.offsetY,
    layout.text.maxWidth,
    layout.text.bodyBottomY + bodyAppearance.offsetY,
    layout.text.maxLines,
    layout.text.lineHeight,
    bodyFont,
    bodyScale,
    bodyAppearance.scaleY,
    bodyWeights,
    bodyFontSize,
  );
  ctx.restore();
}

function drawKeywordLabels(
  ctx: CanvasRenderingContext2D,
  keywordLabels: string[],
  centerX: number,
  y: number,
  maxWidth: number,
  fontFamily: string,
  appearance: CardSpec["appearance"]["text"]["keywords"],
): void {
  const keywordLine = keywordLabels.join(", ");
  const scaleX = getTextScale(keywordLine, 1.02, 1) * appearance.scaleX;
  const initialSize = Math.round(27 * appearance.fontScale);
  const minimumSize = Math.max(10, Math.round(18 * Math.min(1, appearance.fontScale)));
  const fontSize = getFittedKeywordFontSize(ctx, keywordLine, maxWidth, initialSize, minimumSize, fontFamily, scaleX);
  ctx.fillStyle = DARK;
  ctx.font = `800 ${fontSize}px ${fontFamily}`;
  fillScaledText(ctx, keywordLine, centerX, y, scaleX, appearance.scaleY);
}

function getFittedKeywordFontSize(
  ctx: TextMeasureContext,
  keywordLine: string,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
  fontFamily: string,
  scaleX: number,
): number {
  let size = initialSize;
  while (size > minimumSize) {
    ctx.font = `800 ${size}px ${fontFamily}`;
    if (measureScaledText(ctx, keywordLine, scaleX) <= maxWidth) {
      break;
    }
    size -= 1;
  }
  return size;
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
  shape: StatBoardShape = "shield",
): void {
  ctx.save();
  const hasAsset = drawAsset(ctx, options, assetSlot, rect, assetContext);
  if (!hasAsset) {
    ctx.fillStyle = DARK;
    ctx.beginPath();
    drawStatBoardFallbackPath(ctx, rect, shape);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(223, 222, 196, 0.75)";
    ctx.lineWidth = shape === "hq-shield" ? 9 : 3;
    ctx.stroke();
  }

  ctx.fillStyle = LIGHT;
  const valueText = formatCardFaceValue(value);
  const valueStyle =
    shape === "hq-shield"
      ? { fontSize, scaleX: HQ_DEFENSE_SCALE_X, scaleY: 1 }
      : resolveBoardNumberStyle(
          valueText,
          { fontSize: fontSize + 2, scaleX: getTextScale(valueText, 1.18, 1.02), scaleY: 1 },
          { fontSize: Math.max(38, fontSize - 8), scaleX: 0.86, scaleY: 0.98 },
        );
  const valueWeight = shape === "hq-shield" ? 700 : 900;
  const valueFont = shape === "hq-shield" ? `${HQ_DEFENSE_FONT}, ${fonts.stat}` : fonts.stat;
  ctx.font = `${valueWeight} ${valueStyle.fontSize}px ${valueFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fillScaledText(ctx, valueText, rect.x + rect.width / 2, rect.y + rect.height / 2 + valueYOffset, valueStyle.scaleX, valueStyle.scaleY);
  if (label) {
    ctx.font = `900 14px ${fonts.stat}`;
    fillScaledText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height - 22, getTextScale(label, 1.08, 1.02));
  }
  ctx.restore();
}

function drawStatBoardFallbackPath(ctx: CanvasRenderingContext2D, rect: Rect, shape: StatBoardShape): void {
  const left = rect.x + 6;
  const right = rect.x + rect.width - 6;
  const centerX = rect.x + rect.width / 2;
  const top = rect.y + 4;
  const bottom = rect.y + rect.height - 4;
  const upperShoulderY = rect.y + 18;
  const lowerShoulderY = rect.y + rect.height - 18;
  const radius = 6;

  if (shape === "reticle") {
    const reticleLeft = rect.x + 4;
    const reticleRight = rect.x + rect.width - 4;
    const reticleTop = rect.y + 2;
    const reticleBottom = rect.y + rect.height - 2;
    const centerY = rect.y + rect.height / 2;
    const notchHalf = 5;
    const notchDepth = 7;

    ctx.moveTo(centerX - notchHalf, reticleTop);
    ctx.lineTo(centerX - notchHalf, reticleTop + notchDepth);
    ctx.lineTo(centerX + notchHalf, reticleTop + notchDepth);
    ctx.lineTo(centerX + notchHalf, reticleTop);
    ctx.quadraticCurveTo(reticleRight, reticleTop, reticleRight, centerY - notchHalf);
    ctx.lineTo(reticleRight - notchDepth, centerY - notchHalf);
    ctx.lineTo(reticleRight - notchDepth, centerY + notchHalf);
    ctx.lineTo(reticleRight, centerY + notchHalf);
    ctx.quadraticCurveTo(reticleRight, reticleBottom, centerX + notchHalf, reticleBottom);
    ctx.lineTo(centerX + notchHalf, reticleBottom - notchDepth);
    ctx.lineTo(centerX - notchHalf, reticleBottom - notchDepth);
    ctx.lineTo(centerX - notchHalf, reticleBottom);
    ctx.quadraticCurveTo(reticleLeft, reticleBottom, reticleLeft, centerY + notchHalf);
    ctx.lineTo(reticleLeft + notchDepth, centerY + notchHalf);
    ctx.lineTo(reticleLeft + notchDepth, centerY - notchHalf);
    ctx.lineTo(reticleLeft, centerY - notchHalf);
    ctx.quadraticCurveTo(reticleLeft, reticleTop, centerX - notchHalf, reticleTop);
    return;
  }

  if (shape === "hq-shield") {
    const shoulderY = rect.y + rect.height * 0.58;
    ctx.moveTo(left + radius, top);
    ctx.lineTo(right - radius, top);
    ctx.quadraticCurveTo(right, top, right, top + radius);
    ctx.lineTo(right, shoulderY);
    ctx.quadraticCurveTo(right, bottom - 24, centerX, bottom);
    ctx.quadraticCurveTo(left, bottom - 24, left, shoulderY);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    return;
  }

  if (shape === "inverted-shield") {
    ctx.moveTo(centerX, top);
    ctx.lineTo(right - radius, upperShoulderY - radius);
    ctx.quadraticCurveTo(right, upperShoulderY, right, upperShoulderY + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    ctx.lineTo(left + radius, bottom);
    ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
    ctx.lineTo(left, upperShoulderY + radius);
    ctx.quadraticCurveTo(left, upperShoulderY, left + radius, upperShoulderY - radius);
    return;
  }

  ctx.moveTo(left + radius, top);
  ctx.lineTo(right - radius, top);
  ctx.quadraticCurveTo(right, top, right, top + radius);
  ctx.lineTo(right, lowerShoulderY - radius);
  ctx.quadraticCurveTo(right, lowerShoulderY, right - radius, lowerShoulderY + radius);
  ctx.lineTo(centerX, bottom);
  ctx.lineTo(left + radius, lowerShoulderY + radius);
  ctx.quadraticCurveTo(left, lowerShoulderY, left, lowerShoulderY - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
}

function drawPrintWear(
  ctx: CanvasRenderingContext2D,
  settings: PrintWearSettings,
  protectedRegions: PrintWearProtectedRegion[],
  pixelScale: number,
): void {
  const layerCtx = createPrintWearLayerContext(ctx, pixelScale);
  if (layerCtx) {
    drawPrintWearLayer(layerCtx, settings, protectedRegions);
    ctx.drawImage(layerCtx.canvas, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    return;
  }

  ctx.save();
  applyPrintWearClip(ctx, protectedRegions);
  drawPrintWearContent(ctx, settings);
  ctx.restore();
}

function createPrintWearLayerContext(ctx: CanvasRenderingContext2D, pixelScale: number): CanvasRenderingContext2D | null {
  const canvas = ctx.canvas as HTMLCanvasElement | undefined;
  const ownerDocument = canvas?.ownerDocument ?? (typeof document === "undefined" ? undefined : document);
  const layer = ownerDocument?.createElement("canvas");
  if (!layer) {
    return null;
  }

  layer.width = CARD_WIDTH * pixelScale;
  layer.height = CARD_HEIGHT * pixelScale;
  const layerCtx = layer.getContext("2d");
  if (layerCtx && pixelScale !== 1) {
    layerCtx.scale(pixelScale, pixelScale);
  }
  return layerCtx;
}

function drawPrintWearLayer(
  ctx: CanvasRenderingContext2D,
  settings: PrintWearSettings,
  protectedRegions: PrintWearProtectedRegion[],
): void {
  drawPrintWearContent(ctx, settings);
  erasePrintWearProtectedRegions(ctx, protectedRegions);
}

function drawPrintWearContent(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  drawPaperTextureImage(ctx, settings);
  drawPaperToneVariation(ctx, settings);
  drawPaperFiberMesh(ctx, settings);
  drawSlantedPaperFibers(ctx, settings);
  drawPaperMottle(ctx, settings);
  drawEdgeAging(ctx, settings);
  drawPaperFibers(ctx, settings);
  drawPrintGrain(ctx, settings);
  drawFineDustAndScuffs(ctx, settings);
}

function erasePrintWearProtectedRegions(
  ctx: CanvasRenderingContext2D,
  protectedRegions: PrintWearProtectedRegion[],
): void {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for (const region of protectedRegions) {
    ctx.beginPath();
    addPrintWearProtectedRegionPath(ctx, region);
    ctx.fill();
  }
  ctx.restore();
}

function applyPrintWearClip(ctx: CanvasRenderingContext2D, protectedRegions: PrintWearProtectedRegion[]): void {
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 18);
  for (const region of protectedRegions) {
    addPrintWearProtectedRegionPath(ctx, region);
  }
  ctx.clip("evenodd");
}

function addPrintWearProtectedRegionPath(ctx: CanvasRenderingContext2D, region: PrintWearProtectedRegion): void {
  if (region.kind === "rect") {
    ctx.rect(region.rect.x, region.rect.y, region.rect.width, region.rect.height);
    return;
  }

  if (region.kind === "round-rect") {
    addRoundRectPath(ctx, region.rect.x, region.rect.y, region.rect.width, region.rect.height, region.radius);
    return;
  }

  drawStatBoardFallbackPath(ctx, region.rect, region.shape);
  ctx.closePath();
}

function drawPaperTextureImage(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  if (!settings.image) {
    return;
  }

  const imageSize = getTextureImageSize(settings.image);
  if (!imageSize) {
    return;
  }

  const nextNoise = createDeterministicNoise(settings.seed ^ 0x2f6d5a91);
  const sourceWidth = Math.max(1, Math.floor(imageSize.width * (0.68 + nextNoise() * 0.24)));
  const sourceHeight = Math.max(1, Math.floor(imageSize.height * (0.68 + nextNoise() * 0.24)));
  const sourceX = Math.floor(nextNoise() * Math.max(1, imageSize.width - sourceWidth));
  const sourceY = Math.floor(nextNoise() * Math.max(1, imageSize.height - sourceHeight));

  ctx.save();
  ctx.globalAlpha = clamp(0.28 * settings.intensity, 0.12, 0.68);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(settings.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();
}

function drawPaperToneVariation(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed);
  ctx.fillStyle = `rgba(95, 78, 48, ${textureAlpha(0.065, 0.02, nextNoise(), settings.intensity)})`;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const count = Math.floor(128 * settings.randomness);
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 26 + Math.floor(nextNoise() * 160);
    const height = 2 + Math.floor(nextNoise() * 24);
    const warm = nextNoise() > 0.42;
    const alpha = textureAlpha(0.022, 0.052, nextNoise(), settings.intensity * settings.mottle);
    const angle = (nextNoise() - 0.5) * (0.28 + settings.randomness * 0.18);
    ctx.fillStyle = warm ? `rgba(169, 145, 92, ${alpha})` : `rgba(68, 61, 45, ${alpha})`;
    fillOrganicPatch(ctx, x, y, width / 2, height / 2, angle, nextNoise, 7);
  }
}

function drawPaperFiberMesh(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed ^ 0xa5a5f00d);

  const horizontalCount = Math.floor(210 * settings.randomness);
  for (let i = 0; i < horizontalCount; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 18 + Math.floor(nextNoise() * 126);
    const alpha = textureAlpha(0.016, 0.034, nextNoise(), settings.intensity);
    ctx.fillStyle = nextNoise() > 0.54 ? `rgba(255, 245, 212, ${alpha})` : `rgba(70, 61, 42, ${alpha})`;
    ctx.fillRect(x, y, width, 1);
  }

  const verticalCount = Math.floor(120 * settings.randomness);
  for (let i = 0; i < verticalCount; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const height = 8 + Math.floor(nextNoise() * 60);
    const alpha = textureAlpha(0.012, 0.026, nextNoise(), settings.intensity);
    ctx.fillStyle = nextNoise() > 0.5 ? `rgba(255, 245, 212, ${alpha})` : `rgba(70, 61, 42, ${alpha})`;
    ctx.fillRect(x, y, 1, height);
  }
}

function drawSlantedPaperFibers(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed ^ 0x1d872b41);
  const count = Math.floor(115 * settings.randomness);

  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 14 + Math.floor(nextNoise() * 88);
    const angle = (nextNoise() - 0.5) * (0.35 + settings.randomness * 0.22);
    const alpha = textureAlpha(0.014, 0.032, nextNoise(), settings.intensity);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = nextNoise() > 0.52 ? `rgba(246, 233, 196, ${alpha})` : `rgba(83, 72, 50, ${alpha})`;
    ctx.fillRect(0, 0, width, 1);
    ctx.restore();
  }
}

function drawPaperMottle(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed ^ 0x8c9f53a7);
  const count = Math.floor(42 * settings.mottle * settings.randomness);

  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 12 + Math.floor(nextNoise() * 78);
    const height = 3 + Math.floor(nextNoise() * 24);
    const alpha = textureAlpha(0.014, 0.036, nextNoise(), settings.intensity * settings.mottle);
    const angle = (nextNoise() - 0.5) * (0.55 + settings.randomness * 0.25);
    ctx.fillStyle = nextNoise() > 0.45 ? `rgba(177, 153, 101, ${alpha})` : `rgba(54, 47, 35, ${alpha})`;
    fillOrganicPatch(ctx, x, y, width / 2, height / 2, angle, nextNoise, 8);
  }
}

function drawEdgeAging(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  drawVerticalEdgeFade(ctx, 0, 72, "top");
  drawVerticalEdgeFade(ctx, CARD_HEIGHT - 82, 82, "bottom");
  drawHorizontalEdgeFade(ctx, 0, 54, "left");
  drawHorizontalEdgeFade(ctx, CARD_WIDTH - 58, 58, "right");

  ctx.fillStyle = "rgba(46, 38, 25, 0.11)";
  ctx.fillRect(0, 0, CARD_WIDTH, 5);
  ctx.fillRect(0, CARD_HEIGHT - 7, CARD_WIDTH, 7);
  ctx.fillStyle = "rgba(46, 38, 25, 0.075)";
  ctx.fillRect(0, 0, 5, CARD_HEIGHT);
  ctx.fillRect(CARD_WIDTH - 6, 0, 6, CARD_HEIGHT);

  const nextNoise = createDeterministicNoise(settings.seed ^ 0x9e3779b9);
  const count = Math.floor(40 * settings.mottle);
  for (let i = 0; i < count; i += 1) {
    const nearRight = nextNoise() > 0.5;
    const nearBottom = nextNoise() > 0.5;
    const x = nearRight ? CARD_WIDTH - 76 + nextNoise() * 70 : nextNoise() * 70;
    const y = nearBottom ? CARD_HEIGHT - 82 + nextNoise() * 76 : nextNoise() * 76;
    const width = 6 + nextNoise() * 28;
    const height = 2 + nextNoise() * 14;
    const alpha = textureAlpha(0.024, 0.055, nextNoise(), settings.intensity * settings.mottle);
    ctx.fillStyle = `rgba(54, 45, 30, ${alpha})`;
    ctx.fillRect(x, y, width, height);
  }
}

function drawVerticalEdgeFade(ctx: CanvasRenderingContext2D, y: number, height: number, edge: "top" | "bottom"): void {
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  if (edge === "top") {
    gradient.addColorStop(0, "rgba(43, 35, 22, 0.24)");
    gradient.addColorStop(1, "rgba(43, 35, 22, 0)");
  } else {
    gradient.addColorStop(0, "rgba(43, 35, 22, 0)");
    gradient.addColorStop(1, "rgba(43, 35, 22, 0.23)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, CARD_WIDTH, height);
}

function drawHorizontalEdgeFade(ctx: CanvasRenderingContext2D, x: number, width: number, edge: "left" | "right"): void {
  const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
  if (edge === "left") {
    gradient.addColorStop(0, "rgba(43, 35, 22, 0.17)");
    gradient.addColorStop(1, "rgba(43, 35, 22, 0)");
  } else {
    gradient.addColorStop(0, "rgba(43, 35, 22, 0)");
    gradient.addColorStop(1, "rgba(43, 35, 22, 0.17)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(x, 0, width, CARD_HEIGHT);
}

function drawPaperFibers(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed ^ 0x5f3759df);
  const count = Math.floor(190 * settings.randomness);
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 12 + Math.floor(nextNoise() * 94);
    const alpha = textureAlpha(0.018, 0.04, nextNoise(), settings.intensity);
    ctx.fillStyle = nextNoise() > 0.48 ? `rgba(255, 247, 215, ${alpha})` : `rgba(79, 68, 46, ${alpha})`;
    ctx.fillRect(x, y, width, 1);
  }
}

function drawPrintGrain(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed ^ 0xc2b2ae35);
  const count = Math.floor(1020 * settings.randomness);
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 1 + Math.floor(nextNoise() * 2);
    const height = 1 + Math.floor(nextNoise() * 2);
    const light = nextNoise() > 0.52;
    const alpha = textureAlpha(0.03, 0.06, nextNoise(), settings.intensity);
    ctx.fillStyle = light ? `rgba(255, 250, 225, ${alpha})` : `rgba(31, 29, 23, ${alpha})`;
    ctx.fillRect(x, y, width, height);
  }
}

function drawFineDustAndScuffs(ctx: CanvasRenderingContext2D, settings: PrintWearSettings): void {
  const nextNoise = createDeterministicNoise(settings.seed ^ 0x7f4a7c15);

  const dustCount = Math.floor(180 * settings.randomness * settings.mottle);
  for (let i = 0; i < dustCount; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 1.2 + nextNoise() * 4.4;
    const height = 1 + nextNoise() * 3.2;
    const alpha = textureAlpha(0.02, 0.045, nextNoise(), settings.intensity);
    ctx.fillStyle = nextNoise() > 0.45 ? `rgba(237, 224, 184, ${alpha})` : `rgba(38, 33, 24, ${alpha})`;
    fillOrganicPatch(ctx, x, y, width, height, nextNoise() * Math.PI, nextNoise, 6);
  }

  const scuffCount = Math.floor(54 * settings.randomness);
  for (let i = 0; i < scuffCount; i += 1) {
    const x = Math.floor(nextNoise() * CARD_WIDTH);
    const y = Math.floor(nextNoise() * CARD_HEIGHT);
    const width = 8 + Math.floor(nextNoise() * 34);
    const angle = (nextNoise() - 0.5) * 0.55;
    const alpha = textureAlpha(0.016, 0.035, nextNoise(), settings.intensity);
    drawCurvedFiber(
      ctx,
      x,
      y,
      width,
      angle,
      nextNoise() > 0.4 ? `rgba(249, 237, 201, ${alpha})` : `rgba(36, 31, 23, ${alpha})`,
      nextNoise,
    );
  }
}

function fillOrganicPatch(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  angle: number,
  nextNoise: () => number,
  pointCount: number,
): void {
  const points = Array.from({ length: pointCount }, (_, index) => {
    const pointAngle = (index / pointCount) * Math.PI * 2 + (nextNoise() - 0.5) * 0.34;
    const radiusScale = 0.62 + nextNoise() * 0.52;
    return {
      angle: pointAngle,
      x: Math.cos(pointAngle) * radiusX * radiusScale,
      y: Math.sin(pointAngle) * radiusY * radiusScale,
    };
  });

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 0; index < points.length; index += 1) {
    const currentPoint = points[index];
    const nextPoint = points[(index + 1) % points.length];
    const controlAngle = (currentPoint.angle + nextPoint.angle) / 2;
    const controlRadiusX = radiusX * (0.92 + nextNoise() * 0.36);
    const controlRadiusY = radiusY * (0.92 + nextNoise() * 0.36);
    ctx.quadraticCurveTo(
      Math.cos(controlAngle) * controlRadiusX,
      Math.sin(controlAngle) * controlRadiusY,
      nextPoint.x,
      nextPoint.y,
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHqArtworkPlaceholder(ctx: CanvasRenderingContext2D, rect: Rect, deepColor: string): void {
  const backdrop = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  backdrop.addColorStop(0, "#d8cfaf");
  backdrop.addColorStop(1, deepColor);
  ctx.fillStyle = backdrop;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = "#4f514c";
  ctx.lineWidth = 2;
  for (let offset = -120; offset <= rect.width + 120; offset += 54) {
    ctx.beginPath();
    ctx.moveTo(rect.x + offset, rect.y);
    ctx.lineTo(rect.x + offset + 150, rect.y + rect.height);
    ctx.stroke();
  }
  for (let offset = 36; offset < rect.height; offset += 58) {
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + offset);
    ctx.lineTo(rect.x + rect.width, rect.y + offset - 28);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCurvedFiber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  angle: number,
  strokeStyle: string,
  nextNoise: () => number,
): void {
  const bend = (nextNoise() - 0.5) * 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(width * 0.48, bend, width, (nextNoise() - 0.5) * 5);
  ctx.stroke();
  ctx.restore();
}

function resolvePrintWearSettings(options: RenderCardOptions): PrintWearSettings {
  return {
    seed: normalizeTextureSeed(options.textureSeed),
    image: options.textureImage ?? null,
    intensity: normalizeTextureFactor(
      options.textureIntensity,
      DEFAULT_CARD_APPEARANCE.texture.intensity,
      CARD_TEXTURE_BOUNDS.intensity.min,
      CARD_TEXTURE_BOUNDS.intensity.max,
    ),
    randomness: normalizeTextureFactor(
      options.textureRandomness,
      DEFAULT_CARD_APPEARANCE.texture.randomness,
      CARD_TEXTURE_BOUNDS.randomness.min,
      CARD_TEXTURE_BOUNDS.randomness.max,
    ),
    mottle: normalizeTextureFactor(
      options.textureMottle,
      DEFAULT_CARD_APPEARANCE.texture.mottle,
      CARD_TEXTURE_BOUNDS.mottle.min,
      CARD_TEXTURE_BOUNDS.mottle.max,
    ),
  };
}

function createDeterministicNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function normalizeTextureSeed(seed: number | undefined): number {
  return Number.isFinite(seed) ? Number(seed) >>> 0 : DEFAULT_CARD_APPEARANCE.texture.seed;
}

function normalizeTextureFactor(value: number | undefined, fallback: number, min: number, max: number): number {
  return Number.isFinite(value) ? clamp(Number(value), min, max) : fallback;
}

function textureAlpha(base: number, variance: number, noise: number, factor: number): string {
  return clamp((base + variance * noise) * factor, 0.004, 0.24).toFixed(3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTextureImageSize(image: CanvasImageSource): { width: number; height: number } | null {
  const source = image as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number };
  const width = Number(source.naturalWidth ?? source.videoWidth ?? source.width);
  const height = Number(source.naturalHeight ?? source.videoHeight ?? source.height);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null;
}

function getPrintWearProtectedRegions(layout: CardFaceLayout, kind: CardKind): PrintWearProtectedRegion[] {
  const regions: PrintWearProtectedRegion[] = [];

  regions.push({ kind: "rect", rect: layout.artwork });
  if (layout.nameBar) {
    regions.push({ kind: "rect", rect: layout.nameBar });
  }

  if (layout.costBoard) {
    regions.push(
      {
        kind: "rect",
        rect: expandRect(
          {
            ...layout.costBoard,
            width: layout.costBoard.width + (layout.costBoardGap ?? 0),
            height: layout.costBoard.height + (layout.costBoardGap ?? 0),
          },
          2,
        ),
      },
    );
  }

  const nationMarkRect = expandRect(getNationMarkRect(layout), 4);
  if (!isRectCoveredByProtectedRect(regions, nationMarkRect)) {
    regions.push({ kind: "rect", rect: nationMarkRect });
  }

  if (layout.template === "hq" && layout.hqDefenseBoard) {
    regions.push({ kind: "stat-board", rect: layout.hqDefenseBoard, shape: "hq-shield" });
  } else if (isUnitKind(kind)) {
    const attackBoard = isSpecialAttackKind(kind) && layout.specialAttackBoard ? layout.specialAttackBoard : layout.attackBoard;
    if (attackBoard) {
      regions.push({ kind: "stat-board", rect: attackBoard, shape: getAttackBoardShape(kind) });
    }
    if (layout.defenseBoard) {
      regions.push({ kind: "stat-board", rect: layout.defenseBoard, shape: "shield" });
    }
  }

  if (layout.typeIcon) {
    regions.push({ kind: "round-rect", rect: layout.typeIcon, radius: 9 });
  }

  return regions;
}

function getNationMarkRect(layout: CardFaceLayout): Rect {
  return {
    x: layout.nationCenter.x - layout.nationSize / 2,
    y: layout.nationCenter.y - layout.nationSize / 2,
    width: layout.nationSize,
    height: layout.nationSize,
  };
}

function isRectCoveredByProtectedRect(regions: PrintWearProtectedRegion[], rect: Rect): boolean {
  return regions.some((region) => region.kind === "rect" && containsRect(region.rect, rect));
}

function containsRect(container: Rect, rect: Rect): boolean {
  return (
    rect.x >= container.x &&
    rect.y >= container.y &&
    rect.x + rect.width <= container.x + container.width &&
    rect.y + rect.height <= container.y + container.height
  );
}

function expandRect(rect: Rect, padding: number): Rect {
  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  const right = Math.min(CARD_WIDTH, rect.x + rect.width + padding);
  const bottom = Math.min(CARD_HEIGHT, rect.y + rect.height + padding);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
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
  scaleY = 1,
  fontWeight = 800,
): void {
  const size = getFittedFontSize(ctx, text, maxWidth, initialSize, 18, fontFamily, scaleX, fontWeight);
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  fillScaledText(ctx, truncateToWidth(ctx, text, maxWidth, scaleX), x, y, scaleX, scaleY);
}

export function getFittedFontSize(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
  fontFamily = DEFAULT_TEXT_FONT,
  scaleX = 1,
  fontWeight = 800,
): number {
  let size = initialSize;
  while (size > minimumSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
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

function fillScaledText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scaleX = 1, scaleY = 1): void {
  if (scaleX === 1 && scaleY === 1) {
    ctx.fillText(text, x, y);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);
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

function formatCardFaceValue(value: number | undefined): string {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return String(Math.min(CARD_FACE_VALUE_MAX, Math.max(0, Math.round(numericValue))));
}

function resolveBoardNumberStyle(text: string, singleDigit: NumberGlyphStyle, twoDigit: NumberGlyphStyle): NumberGlyphStyle {
  return text.length > 1 ? twoDigit : singleDigit;
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
  ctx.beginPath();
  addRoundRectPath(ctx, x, y, width, height, radius);
  ctx.closePath();
}

function addRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 8,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
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
    case "none":
      return 0;
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

function getAttackBoardShape(kind: CardKind): StatBoardShape {
  return isSpecialAttackKind(kind) ? "reticle" : "inverted-shield";
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

function normalizePixelScale(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(3, Math.max(1, Math.round(value)));
}
