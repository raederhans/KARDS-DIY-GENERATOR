import { parseBodyMarkup, type BodyMarkupSegment } from "../bodyMarkup";

type TextMeasureContext = Pick<CanvasRenderingContext2D, "font" | "measureText">;

export function drawMarkedBodyText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  fontFamily: string,
  scaleX = 1,
): void {
  const lines = createWrappedBodyMarkupLines(ctx, text, maxWidth, maxLines, fontFamily, scaleX);
  const previousTextAlign = ctx.textAlign;
  ctx.textAlign = "left";

  lines.forEach((line, index) => {
    drawBodyMarkupLine(ctx, line, centerX, y + index * lineHeight, fontFamily, scaleX);
  });
  ctx.textAlign = previousTextAlign;
}

function drawBodyMarkupLine(
  ctx: CanvasRenderingContext2D,
  line: BodyMarkupSegment[],
  centerX: number,
  y: number,
  fontFamily: string,
  scaleX: number,
): void {
  const lineWidth = measureBodyMarkupLine(ctx, line, fontFamily, scaleX);
  let cursorX = centerX - lineWidth / 2;

  for (const segment of line) {
    if (!segment.text) {
      continue;
    }

    setBodySegmentFont(ctx, fontFamily, segment.bold);
    fillScaledText(ctx, segment.text, cursorX, y, scaleX);
    cursorX += measureScaledText(ctx, segment.text, scaleX);
  }
}

function createWrappedBodyMarkupLines(
  ctx: TextMeasureContext,
  text: string,
  maxWidth: number,
  maxLines: number,
  fontFamily: string,
  scaleX = 1,
): BodyMarkupSegment[][] {
  if (!text.trim()) {
    return [];
  }

  const wrappedLines: BodyMarkupSegment[][] = [];
  let didOverflow = false;

  for (const logicalLine of parseBodyMarkup(text)) {
    if (wrappedLines.length >= maxLines) {
      didOverflow = true;
      break;
    }

    const tokens = createBodyMarkupTokens(ctx, logicalLine, maxWidth, fontFamily, scaleX);
    if (tokens.length === 0) {
      wrappedLines.push([]);
      continue;
    }

    let currentLine: BodyMarkupSegment[] = [];
    for (const token of tokens) {
      const candidateLine = currentLine.length === 0 ? [trimLeadingBodySegment(token)] : [...currentLine, token];
      if (currentLine.length > 0 && measureBodyMarkupLine(ctx, candidateLine, fontFamily, scaleX) > maxWidth) {
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
      scaleX,
    );
  }

  return visibleLines;
}

function createBodyMarkupTokens(
  ctx: TextMeasureContext,
  segments: BodyMarkupSegment[],
  maxWidth: number,
  fontFamily: string,
  scaleX: number,
): BodyMarkupSegment[] {
  return segments.flatMap((segment) => {
    const tokens = segment.text.match(/\s*\S+\s*/g) ?? [];
    return tokens.flatMap((token) => splitBodyMarkupToken(ctx, token, segment.bold, maxWidth, fontFamily, scaleX));
  });
}

function splitBodyMarkupToken(
  ctx: TextMeasureContext,
  token: string,
  bold: boolean,
  maxWidth: number,
  fontFamily: string,
  scaleX: number,
): BodyMarkupSegment[] {
  setBodySegmentFont(ctx, fontFamily, bold);
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
  scaleX: number,
): number {
  return line.reduce((width, segment) => {
    setBodySegmentFont(ctx, fontFamily, segment.bold);
    return width + measureScaledText(ctx, segment.text, scaleX);
  }, 0);
}

function appendEllipsisToBodyMarkupLine(
  ctx: TextMeasureContext,
  line: BodyMarkupSegment[],
  maxWidth: number,
  fontFamily: string,
  scaleX: number,
): BodyMarkupSegment[] {
  const nextLine = trimTrailingBodySegments(line);
  if (nextLine.length === 0) {
    return [{ text: "...", bold: false }];
  }

  let lastSegmentIndex = nextLine.length - 1;
  while (
    lastSegmentIndex >= 0 &&
    measureBodyMarkupLine(ctx, [...nextLine, { text: "...", bold: false }], fontFamily, scaleX) > maxWidth
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

function setBodySegmentFont(ctx: TextMeasureContext, fontFamily: string, bold: boolean): void {
  ctx.font = `${bold ? 800 : 500} 24px ${fontFamily}`;
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

function measureScaledText(ctx: TextMeasureContext, text: string, scaleX = 1): number {
  return ctx.measureText(text).width * scaleX;
}
