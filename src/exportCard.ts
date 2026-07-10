import { CARD_HEIGHT, CARD_WIDTH, renderCard } from "./canvas/cardRenderer";
import type { RenderCardOptions } from "./canvas/renderAssets";
import type { CardSpec } from "./types";

export type CardExportFormat = "png" | "jpg" | "pdf";

export type CardExportOptions = {
  format: CardExportFormat;
  scale: number;
  exposure: number;
  contrast: number;
  jpegQuality: number;
};

export type CardExportSource = {
  card: CardSpec;
  artworkImage?: HTMLImageElement | null;
  renderOptions?: RenderCardOptions;
};

export type ExportDiagnosticPhase = "preflight" | "render" | "encode" | "write" | "download";

export type ExportDiagnosticCode =
  | "canvas-unavailable"
  | "artwork-not-ready"
  | "asset-pack-warning"
  | "program-texture"
  | "private-confirmation-required"
  | "render-failed"
  | "encode-failed"
  | "write-failed"
  | "download-failed";

export type ExportDiagnosticItem = {
  phase: ExportDiagnosticPhase;
  severity: "info" | "warning" | "blocking";
  code: ExportDiagnosticCode;
  detail?: string;
};

export type CardExportPreflight = {
  status: "ready" | "warning" | "blocking";
  items: ExportDiagnosticItem[];
};

export type CardExportTarget =
  | { kind: "generated" }
  | { kind: "directory"; status: "written"; directoryName: string }
  | { kind: "download"; status: "triggered" };

export type CardExportResult = {
  blob: Blob;
  fileName: string;
  format: CardExportFormat;
  mimeType: string;
  width: number;
  height: number;
  byteLength: number;
  durationMs: number;
  normalizedOptions: CardExportOptions;
  target: CardExportTarget;
};

export type CardExportDelivery =
  | { kind: "directory"; directoryName: string; write: () => Promise<void> }
  | { kind: "download"; download: () => void };

export class CardExportError extends Error {
  constructor(
    public readonly phase: ExportDiagnosticPhase,
    public readonly code: ExportDiagnosticCode,
    cause?: unknown,
  ) {
    super(cause instanceof Error ? cause.message : "Card export failed.", { cause });
    this.name = "CardExportError";
  }
}

export const CARD_EXPORT_SCALES = [1, 2, 3] as const;

export function getExportDimensions(scale: number): { width: number; height: number } {
  const normalizedScale = normalizeExportScale(scale);
  return {
    width: CARD_WIDTH * normalizedScale,
    height: CARD_HEIGHT * normalizedScale,
  };
}

export function getExportExtension(format: CardExportFormat): string {
  return format === "jpg" ? "jpg" : format;
}

export function getExportMimeType(format: CardExportFormat): string {
  if (format === "png") {
    return "image/png";
  }
  if (format === "jpg") {
    return "image/jpeg";
  }
  return "application/pdf";
}

export function normalizeExportOptions(options: CardExportOptions): CardExportOptions {
  return {
    format: options.format,
    scale: normalizeExportScale(options.scale),
    exposure: clamp(Math.round(options.exposure), -30, 30),
    contrast: clamp(Math.round(options.contrast), -30, 30),
    jpegQuality: clamp(options.jpegQuality, 0.72, 0.98),
  };
}

export function getCardExportPreflight(input: {
  canvasAvailable: boolean;
  artworkReady: boolean;
  assetPackWarnings: readonly string[];
  usesProgramTexture: boolean;
  requiresPrivateConfirmation: boolean;
}): CardExportPreflight {
  const items: ExportDiagnosticItem[] = [];
  if (!input.canvasAvailable) {
    items.push({ phase: "preflight", severity: "blocking", code: "canvas-unavailable" });
  }
  if (!input.artworkReady) {
    items.push({ phase: "preflight", severity: "blocking", code: "artwork-not-ready" });
  }
  for (const warning of input.assetPackWarnings) {
    items.push({ phase: "preflight", severity: "warning", code: "asset-pack-warning", detail: warning });
  }
  if (input.usesProgramTexture) {
    items.push({ phase: "preflight", severity: "info", code: "program-texture" });
  }
  if (input.requiresPrivateConfirmation) {
    items.push({ phase: "preflight", severity: "info", code: "private-confirmation-required" });
  }
  return {
    status: items.some((item) => item.severity === "blocking")
      ? "blocking"
      : items.some((item) => item.severity === "warning") ? "warning" : "ready",
    items,
  };
}

export async function createCardExportBlob(
  sourceCanvas: HTMLCanvasElement,
  options: CardExportOptions,
  source?: CardExportSource,
): Promise<Blob> {
  return (await createCardExportResult(sourceCanvas, options, source)).blob;
}

export async function createCardExportResult(
  sourceCanvas: HTMLCanvasElement,
  options: CardExportOptions,
  source?: CardExportSource,
  fileName?: string,
): Promise<CardExportResult> {
  const startedAt = performance.now();
  const normalizedOptions = normalizeExportOptions(options);
  let exportCanvas: HTMLCanvasElement;
  try {
    exportCanvas = source
      ? renderCardExportCanvas(source, normalizedOptions)
      : renderAdjustedCanvas(sourceCanvas, normalizedOptions);
  } catch (error) {
    throw new CardExportError("render", "render-failed", error);
  }

  let blob: Blob;
  try {
    blob = normalizedOptions.format === "pdf"
      ? await createPdfBlob(exportCanvas, normalizedOptions.jpegQuality)
      : await canvasToBlob(
        exportCanvas,
        getExportMimeType(normalizedOptions.format),
        normalizedOptions.format === "jpg" ? normalizedOptions.jpegQuality : undefined,
      );
  } catch (error) {
    throw new CardExportError("encode", "encode-failed", error);
  }

  return {
    blob,
    fileName: fileName ?? `card.${getExportExtension(normalizedOptions.format)}`,
    format: normalizedOptions.format,
    mimeType: getExportMimeType(normalizedOptions.format),
    width: exportCanvas.width,
    height: exportCanvas.height,
    byteLength: blob.size,
    durationMs: Math.max(0, performance.now() - startedAt),
    normalizedOptions,
    target: { kind: "generated" },
  };
}

export async function completeCardExportDelivery(
  result: CardExportResult,
  delivery: CardExportDelivery,
): Promise<CardExportResult> {
  if (delivery.kind === "directory") {
    try {
      await delivery.write();
    } catch (error) {
      throw new CardExportError("write", "write-failed", error);
    }
    return {
      ...result,
      target: { kind: "directory", status: "written", directoryName: delivery.directoryName },
    };
  }

  try {
    delivery.download();
  } catch (error) {
    throw new CardExportError("download", "download-failed", error);
  }
  return { ...result, target: { kind: "download", status: "triggered" } };
}

function renderCardExportCanvas(source: CardExportSource, options: CardExportOptions): HTMLCanvasElement {
  const exportCanvas = document.createElement("canvas");
  renderCard(exportCanvas, source.card, source.artworkImage, {
    ...source.renderOptions,
    pixelScale: options.scale,
  });
  const expectedDimensions = getExportDimensions(options.scale);
  if (
    exportCanvas.width !== expectedDimensions.width
    || exportCanvas.height !== expectedDimensions.height
  ) {
    throw new Error("Card renderer did not produce the requested export dimensions.");
  }
  return applyCanvasAdjustments(exportCanvas, options);
}

function renderAdjustedCanvas(sourceCanvas: HTMLCanvasElement, options: CardExportOptions): HTMLCanvasElement {
  const dimensions = getExportDimensions(options.scale);
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = dimensions.width;
  exportCanvas.height = dimensions.height;
  return drawAdjustedCanvas(sourceCanvas, exportCanvas, options);
}

function applyCanvasAdjustments(sourceCanvas: HTMLCanvasElement, options: CardExportOptions): HTMLCanvasElement {
  if (options.exposure === 0 && options.contrast === 0) {
    return sourceCanvas;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = sourceCanvas.width;
  exportCanvas.height = sourceCanvas.height;
  return drawAdjustedCanvas(sourceCanvas, exportCanvas, options);
}

function drawAdjustedCanvas(
  sourceCanvas: HTMLCanvasElement,
  exportCanvas: HTMLCanvasElement,
  options: CardExportOptions,
): HTMLCanvasElement {
  const context = exportCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create export canvas.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = `brightness(${100 + options.exposure}%) contrast(${100 + options.contrast}%)`;
  context.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
  context.filter = "none";

  return exportCanvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create export file."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function createPdfBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const imageBlob = await canvasToBlob(canvas, "image/jpeg", quality);
  const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
  const pageWidth = CARD_WIDTH;
  const pageHeight = CARD_HEIGHT;
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const pdfBytes = buildSingleImagePdf(
    imageBytes,
    pageWidth,
    pageHeight,
    canvas.width,
    canvas.height,
    content,
  );
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

function buildSingleImagePdf(
  imageBytes: Uint8Array,
  pageWidth: number,
  pageHeight: number,
  imageWidth: number,
  imageHeight: number,
  content: string,
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const objectOffsets: number[] = [];
  let offset = 0;

  function pushBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    offset += bytes.length;
  }

  function pushText(value: string) {
    pushBytes(encoder.encode(value));
  }

  function beginObject(objectNumber: number) {
    objectOffsets[objectNumber] = offset;
    pushText(`${objectNumber} 0 obj\n`);
  }

  pushText("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  beginObject(1);
  pushText("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObject(2);
  pushText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  beginObject(3);
  pushText(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  beginObject(4);
  pushText(
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
  );
  pushBytes(imageBytes);
  pushText("\nendstream\nendobj\n");

  const contentBytes = encoder.encode(content);
  beginObject(5);
  pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushText("endstream\nendobj\n");

  const xrefOffset = offset;
  pushText("xref\n0 6\n0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    pushText(`${String(objectOffsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const output = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

function normalizeExportScale(value: number): number {
  return CARD_EXPORT_SCALES.includes(value as (typeof CARD_EXPORT_SCALES)[number]) ? value : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
