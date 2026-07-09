import { parseBodyMarkup, type BodyMarkupSegment } from "../bodyMarkup";

type TextMeasureContext = Pick<CanvasRenderingContext2D, "font" | "measureText">;
type BodyTextWeights = { regular: number; bold: number };

const BODY_BASE_FONT_SIZE = 24;
const BODY_MIN_FONT_SIZE = 16;
const DEFAULT_BODY_TEXT_WEIGHTS: BodyTextWeights = { regular: 500, bold: 800 };

export function drawMarkedBodyText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  bodyBottomY: number,
  maxLinesCap: number,
  baseLineHeight: number,
  fontFamily: string,
  scaleX = 1,
  scaleY = 1,
  weights: BodyTextWeights = DEFAULT_BODY_TEXT_WEIGHTS,
  baseFontSize = BODY_BASE_FONT_SIZE,
): void {
  const layout = fitBodyMarkupLayout(
    ctx,
    text,
    maxWidth,
    bodyBottomY - y,
    maxLinesCap,
    baseLineHeight,
    fontFamily,
    scaleX,
    scaleY,
    weights,
    baseFontSize,
  );
  const previousTextAlign = ctx.textAlign;
  ctx.textAlign = "left";

  layout.lines.forEach((line, index) => {
    drawBodyMarkupLine(ctx, line, centerX, y + index * layout.lineHeight, fontFamily, layout.fontSize, scaleX, scaleY, weights);
  });
  ctx.textAlign = previousTextAlign;
}

function fitBodyMarkupLayout(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxLinesCap: number,
  baseLineHeight: number,
  fontFamily: string,
  scaleX: number,
  scaleY: number,
  weights: BodyTextWeights,
  baseFontSize: number,
): { lines: BodyMarkupSegment[][]; fontSize: number; lineHeight: number } {
  const initialFontSize = Math.max(10, Math.round(baseFontSize));
  const minimumFontSize = Math.min(BODY_MIN_FONT_SIZE, initialFontSize);
  let fallbackLayout = createWrappedBodyMarkupLines(
    ctx,
    text,
    maxWidth,
    resolveMaxLines(maxHeight, resolveScaledBodyLineHeight(minimumFontSize, baseLineHeight, scaleY), maxLinesCap),
    fontFamily,
    minimumFontSize,
    scaleX,
    weights,
  );

  for (let fontSize = initialFontSize; fontSize >= minimumFontSize; fontSize -= 1) {
    const lineHeight = resolveScaledBodyLineHeight(fontSize, baseLineHeight, scaleY);
    const maxLines = resolveMaxLines(maxHeight, lineHeight, maxLinesCap);
    const layout = createWrappedBodyMarkupLines(ctx, text, maxWidth, maxLines, fontFamily, fontSize, scaleX, weights);
    if (!layout.didOverflow) {
      return { lines: layout.lines, fontSize, lineHeight };
    }
    fallbackLayout = layout;
  }

  return {
    lines: fallbackLayout.lines,
    fontSize: minimumFontSize,
    lineHeight: resolveScaledBodyLineHeight(minimumFontSize, baseLineHeight, scaleY),
  };
}

function drawBodyMarkupLine(
  ctx: CanvasRenderingContext2D,
  line: BodyMarkupSegment[],
  centerX: number,
  y: number,
  fontFamily: string,
  fontSize: number,
  scaleX: number,
  scaleY: number,
  weights: BodyTextWeights,
): void {
  const lineWidth = measureBodyMarkupLine(ctx, line, fontFamily, fontSize, scaleX, weights);
  let cursorX = centerX - lineWidth / 2;

  for (const segment of line) {
    if (!segment.text) {
      continue;
    }

    setBodySegmentFont(ctx, fontFamily, fontSize, segment.bold, weights);
    fillScaledText(ctx, segment.text, cursorX, y, scaleX, scaleY);
    cursorX += measureScaledText(ctx, segment.text, scaleX);
  }
}

function createWrappedBodyMarkupLines(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  maxLines: number,
  fontFamily: string,
  fontSize: number,
  scaleX = 1,
  weights: BodyTextWeights = DEFAULT_BODY_TEXT_WEIGHTS,
): { lines: BodyMarkupSegment[][]; didOverflow: boolean } {
  if (!text.trim()) {
    return { lines: [], didOverflow: false };
  }

  const wrappedLines: BodyMarkupSegment[][] = [];
  let didOverflow = false;

  for (const logicalLine of parseBodyMarkup(text)) {
    if (wrappedLines.length >= maxLines) {
      didOverflow = true;
      break;
    }

    const tokens = createBodyMarkupTokens(ctx, logicalLine, maxWidth, fontFamily, fontSize, scaleX, weights);
    if (tokens.length === 0) {
      wrappedLines.push([]);
      continue;
    }

    let currentLine: BodyMarkupSegment[] = [];
    for (const token of tokens) {
      const candidateLine = currentLine.length === 0 ? [trimLeadingBodySegment(token)] : [...currentLine, token];
      if (currentLine.length > 0 && measureBodyMarkupLine(ctx, candidateLine, fontFamily, fontSize, scaleX, weights) > maxWidth) {
        wrappedLines.push(trimTrailingBodySegments(currentLine));
        currentLine = [trimLeadingBodySegment(token)];
        if (wrappedLines.length >= maxLines) {
          didOverflow = true;
          break;
        }
        continue;
      }

      currentLine = candidateLine;
    }

    if (didOverflow) {
      break;
    }

    if (currentLine.length > 0 && wrappedLines.length < maxLines) {
      wrappedLines.push(trimTrailingBodySegments(currentLine));
    } else if (currentLine.length > 0) {
      didOverflow = true;
      break;
    }
  }

  const visibleLines = wrappedLines.slice(0, maxLines);
  if (didOverflow && visibleLines.length > 0) {
    visibleLines[visibleLines.length - 1] = appendEllipsisToBodyMarkupLine(
      ctx,
      visibleLines[visibleLines.length - 1],
      maxWidth,
      fontFamily,
      fontSize,
      scaleX,
      weights,
    );
  }

  return { lines: visibleLines, didOverflow };
}

function createBodyMarkupTokens(
  ctx: TextMeasureContext,
  segments: BodyMarkupSegment[],
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  scaleX: number,
  weights: BodyTextWeights,
): BodyMarkupSegment[] {
  return segments.flatMap((segment) => {
    const tokens = segment.text.match(/\s+|[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*|[\u3400-\u9fff\uf900-\ufaff]|[^\sA-Za-z0-9\u3400-\u9fff\uf900-\ufaff]/g) ?? [];
    return tokens.flatMap((token) => splitBodyMarkupToken(ctx, token, segment.bold, maxWidth, fontFamily, fontSize, scaleX, weights));
  });
}

function splitBodyMarkupToken(
  ctx: TextMeasureContext,
  token: string,
  bold: boolean,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  scaleX: number,
  weights: BodyTextWeights,
): BodyMarkupSegment[] {
  setBodySegmentFont(ctx, fontFamily, fontSize, bold, weights);
  if (measureScaledText(ctx, token, scaleX) <= maxWidth) {
    return [{ text: token, bold }];
  }

  const leadingSpace = token.match(/^\s*/)?.[0] ?? "";
  const trailingSpace = token.match(/\s*$/)?.[0] ?? "";
  const core = token.trim();
  const chunks: BodyMarkupSegment[] = [];
  let chunk = leadingSpace;

  for (const char of core) {
    const testChunk = `${chunk}${char}`;
    if (chunk.trim() && measureScaledText(ctx, testChunk, scaleX) > maxWidth) {
      chunks.push({ text: chunk, bold });
      chunk = char;
    } else {
      chunk = testChunk;
    }
  }

  if (chunk) {
    chunks.push({ text: `${chunk}${trailingSpace}`, bold });
  }

  return chunks;
}

function measureBodyMarkupLine(
  ctx: TextMeasureContext,
  line: BodyMarkupSegment[],
  fontFamily: string,
  fontSize: number,
  scaleX: number,
  weights: BodyTextWeights,
): number {
  return line.reduce((width, segment) => {
    setBodySegmentFont(ctx, fontFamily, fontSize, segment.bold, weights);
    return width + measureScaledText(ctx, segment.text, scaleX);
  }, 0);
}

function appendEllipsisToBodyMarkupLine(
  ctx: TextMeasureContext,
  line: BodyMarkupSegment[],
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  scaleX: number,
  weights: BodyTextWeights,
): BodyMarkupSegment[] {
  const nextLine = trimTrailingBodySegments(line);
  if (nextLine.length === 0) {
    return [{ text: "...", bold: false }];
  }

  let lastSegmentIndex = nextLine.length - 1;
  while (
    lastSegmentIndex >= 0 &&
    measureBodyMarkupLine(ctx, [...nextLine, { text: "...", bold: false }], fontFamily, fontSize, scaleX, weights) > maxWidth
  ) {
    nextLine[lastSegmentIndex] = {
      ...nextLine[lastSegmentIndex],
      text: nextLine[lastSegmentIndex].text.slice(0, -1),
    };
    if (!nextLine[lastSegmentIndex].text) {
      nextLine.splice(lastSegmentIndex, 1);
      lastSegmentIndex -= 1;
    }
    if (nextLine.length === 0) {
      return [{ text: "...", bold: false }];
    }
  }

  return mergeAdjacentBodySegments([...nextLine, { text: "...", bold: false }]);
}

function trimLeadingBodySegment(segment: BodyMarkupSegment): BodyMarkupSegment {
  return { ...segment, text: segment.text.trimStart() };
}

function trimTrailingBodySegments(line: BodyMarkupSegment[]): BodyMarkupSegment[] {
  const nextLine = line.map((segment) => ({ ...segment }));
  while (nextLine.length > 0) {
    const lastSegment = nextLine[nextLine.length - 1];
    lastSegment.text = lastSegment.text.trimEnd();
    if (lastSegment.text) {
      break;
    }
    nextLine.pop();
  }
  return mergeAdjacentBodySegments(nextLine);
}

function mergeAdjacentBodySegments(line: BodyMarkupSegment[]): BodyMarkupSegment[] {
  const mergedLine: BodyMarkupSegment[] = [];
  for (const segment of line) {
    if (!segment.text) {
      continue;
    }
    const previous = mergedLine.at(-1);
    if (previous?.bold === segment.bold) {
      previous.text += segment.text;
    } else {
      mergedLine.push({ ...segment });
    }
  }
  return mergedLine;
}

function setBodySegmentFont(
  ctx: TextMeasureContext,
  fontFamily: string,
  fontSize: number,
  bold: boolean,
  weights: BodyTextWeights = DEFAULT_BODY_TEXT_WEIGHTS,
): void {
  ctx.font = `${bold ? weights.bold : weights.regular} ${fontSize}px ${fontFamily}`;
}

function resolveBodyLineHeight(fontSize: number, baseLineHeight: number): number {
  if (fontSize === BODY_BASE_FONT_SIZE) {
    return baseLineHeight;
  }
  return Math.max(fontSize + 1, Math.round(baseLineHeight - (BODY_BASE_FONT_SIZE - fontSize) * 1.4));
}

function resolveScaledBodyLineHeight(fontSize: number, baseLineHeight: number, scaleY: number): number {
  return Math.max(fontSize + 1, Math.round(resolveBodyLineHeight(fontSize, baseLineHeight) * scaleY));
}

function resolveMaxLines(maxHeight: number, lineHeight: number, maxLinesCap: number): number {
  return Math.max(1, Math.min(maxLinesCap, Math.floor(maxHeight / lineHeight) + 1));
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

function measureScaledText(ctx: TextMeasureContext, text: string, scaleX = 1): number {
  return ctx.measureText(text).width * scaleX;
}
