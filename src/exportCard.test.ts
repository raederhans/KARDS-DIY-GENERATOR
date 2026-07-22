import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import {
  CardExportError,
  createCardExportBlob,
  createCardExportResult,
  completeCardExportDelivery,
  getCardAdjustmentFilter,
  getCardExportPreflight,
  getExportDimensions,
  getExportExtension,
  getExportMimeType,
  normalizeExportOptions,
} from "./exportCard";

const renderCardMock = vi.hoisted(() =>
  vi.fn(
    (
      _canvas: HTMLCanvasElement,
      _card: unknown,
      _artworkImage: unknown,
      _options?: { pixelScale?: number },
    ) => {},
  ),
);

vi.mock("./canvas/cardRenderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./canvas/cardRenderer")>();
  renderCardMock.mockImplementation((canvas, _card, _artworkImage, options) => {
    const pixelScale = options?.pixelScale ?? 1;
    canvas.width = actual.CARD_WIDTH * pixelScale;
    canvas.height = actual.CARD_HEIGHT * pixelScale;
  });
  return {
    ...actual,
    renderCard: renderCardMock,
  };
});

beforeEach(() => {
  renderCardMock.mockClear();
  vi.unstubAllGlobals();
});

describe("card export options", () => {
  it("reports structured preflight severity without translating diagnostic codes", () => {
    expect(getCardExportPreflight({
      canvasAvailable: false,
      artworkReady: false,
      assetPackWarnings: ["missing font"],
      usesProgramTexture: true,
      requiresPrivateConfirmation: true,
    })).toMatchObject({
      status: "blocking",
      items: expect.arrayContaining([
        { phase: "preflight", severity: "blocking", code: "canvas-unavailable" },
        { phase: "preflight", severity: "blocking", code: "artwork-not-ready" },
        { phase: "preflight", severity: "warning", code: "asset-pack-warning", detail: "missing font" },
        { phase: "preflight", severity: "info", code: "program-texture" },
        { phase: "preflight", severity: "info", code: "private-confirmation-required" },
      ]),
    });
    expect(getCardExportPreflight({
      canvasAvailable: true,
      artworkReady: true,
      assetPackWarnings: [],
      usesProgramTexture: false,
      requiresPrivateConfirmation: false,
    }).status).toBe("ready");
  });

  it("resolves the supported card export dimensions", () => {
    expect(getExportDimensions(1)).toEqual({ width: 500, height: 702 });
    expect(getExportDimensions(2)).toEqual({ width: 1000, height: 1404 });
    expect(getExportDimensions(3)).toEqual({ width: 1500, height: 2106 });
    expect(getExportDimensions(9)).toEqual({ width: 500, height: 702 });
  });

  it("maps export formats to file extensions and mime types", () => {
    expect(getExportExtension("png")).toBe("png");
    expect(getExportExtension("jpg")).toBe("jpg");
    expect(getExportExtension("pdf")).toBe("pdf");
    expect(getExportMimeType("png")).toBe("image/png");
    expect(getExportMimeType("jpg")).toBe("image/jpeg");
    expect(getExportMimeType("pdf")).toBe("application/pdf");
  });

  it("clamps adjustment controls before export rendering", () => {
    expect(
      normalizeExportOptions({
        format: "jpg",
        scale: 4,
        exposure: 99,
        contrast: -99,
        jpegQuality: 2,
      }),
    ).toEqual({
      format: "jpg",
      scale: 1,
      exposure: 30,
      contrast: -30,
      jpegQuality: 0.98,
    });
  });

  it("uses one normalized exposure and contrast filter for preview and export", () => {
    expect(getCardAdjustmentFilter(0, 0)).toBe("none");
    expect(getCardAdjustmentFilter(12.4, -9.6)).toBe("brightness(112%) contrast(90%)");
    expect(getCardAdjustmentFilter(99, -99)).toBe("brightness(130%) contrast(70%)");
  });

  it("rerenders source cards at the requested backing resolution", async () => {
    let exportCanvas: HTMLCanvasElement | null = null;
    const fallbackArtworkImage = { naturalWidth: 716, naturalHeight: 872 } as HTMLImageElement;
    const getExportCanvas = () => {
      if (!exportCanvas) {
        throw new Error("Expected export canvas to be created.");
      }
      return exportCanvas;
    };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => {
        const canvas = {
          width: 0,
          height: 0,
          toBlob(callback: BlobCallback, mimeType: string) {
            callback(new Blob([`${this.width}x${this.height}`], { type: mimeType }));
          },
        } as HTMLCanvasElement;
        exportCanvas = canvas;
        return canvas;
      }),
    });

    const blob = await createCardExportBlob(
      {} as HTMLCanvasElement,
      { format: "png", scale: 2, exposure: 0, contrast: 0, jpegQuality: 0.92 },
      {
        card: DEFAULT_CARD,
        renderOptions: {
          fallbackArtworkImage,
          textureSeed: 123,
          textureIntensity: 2.1,
          textureRandomness: 1.8,
          textureMottle: 1.4,
        },
      },
    );

    expect(renderCardMock).toHaveBeenCalledWith(getExportCanvas(), DEFAULT_CARD, undefined, {
      fallbackArtworkImage,
      textureSeed: 123,
      textureIntensity: 2.1,
      textureRandomness: 1.8,
      textureMottle: 1.4,
      pixelScale: 2,
    });
    expect(getExportCanvas().width).toBe(1000);
    expect(getExportCanvas().height).toBe(1404);
    expect(blob.type).toBe("image/png");
    expect(await blob.text()).toBe("1000x1404");
  });

  it("returns one-render export metadata for the current run", async () => {
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          imageSmoothingEnabled: false,
          imageSmoothingQuality: "low",
          filter: "none",
          drawImage: vi.fn(),
        })),
        toBlob(callback: BlobCallback, mimeType: string) {
          callback(new Blob(["result-bytes"], { type: mimeType }));
        },
      } as unknown as HTMLCanvasElement)),
    });

    const result = await createCardExportResult(
      {} as HTMLCanvasElement,
      { format: "png", scale: 2, exposure: 99, contrast: -99, jpegQuality: 0.92 },
      { card: DEFAULT_CARD },
      "sample.png",
    );

    expect(result).toMatchObject({
      fileName: "sample.png",
      format: "png",
      mimeType: "image/png",
      width: 1000,
      height: 1404,
      byteLength: 12,
      normalizedOptions: {
        format: "png",
        scale: 2,
        exposure: 30,
        contrast: -30,
        jpegQuality: 0.92,
      },
      target: { kind: "generated" },
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(renderCardMock).toHaveBeenCalledTimes(1);
  });

  it("reports delivery only after write completion and classifies delivery failures", async () => {
    const result = {
      blob: new Blob(["result"]),
      fileName: "card.png",
      format: "png" as const,
      mimeType: "image/png",
      width: 500,
      height: 702,
      byteLength: 6,
      durationMs: 1,
      normalizedOptions: { format: "png" as const, scale: 1, exposure: 0, contrast: 0, jpegQuality: 0.92 },
      target: { kind: "generated" as const },
    };
    let finishWrite!: () => void;
    const write = vi.fn(() => new Promise<void>((resolve) => { finishWrite = resolve; }));
    const pending = completeCardExportDelivery(result, {
      kind: "directory",
      directoryName: "Exports",
      write,
    });
    let settled = false;
    void pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    finishWrite();
    await expect(pending).resolves.toMatchObject({
      target: { kind: "directory", status: "written", directoryName: "Exports" },
    });

    await expect(completeCardExportDelivery(result, {
      kind: "directory",
      directoryName: "Exports",
      write: async () => { throw new Error("disk full"); },
    })).rejects.toMatchObject({ phase: "write", code: "write-failed" });
    await expect(completeCardExportDelivery(result, {
      kind: "download",
      download: () => { throw new Error("click failed"); },
    })).rejects.toMatchObject({ phase: "download", code: "download-failed" });
  });

  it("reports actual rendered dimensions and rejects an unusable render surface", async () => {
    renderCardMock.mockImplementationOnce(() => undefined);
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 300,
        height: 150,
        toBlob: vi.fn(),
      } as unknown as HTMLCanvasElement)),
    });

    await expect(createCardExportResult(
      {} as HTMLCanvasElement,
      { format: "png", scale: 2, exposure: 0, contrast: 0, jpegQuality: 0.92 },
      { card: DEFAULT_CARD },
    )).rejects.toMatchObject({ phase: "render", code: "render-failed" });
  });

  it("classifies encoding failures with a stable phase and code", async () => {
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        toBlob(callback: BlobCallback) {
          callback(null);
        },
      } as HTMLCanvasElement)),
    });

    const failure = createCardExportResult(
      {} as HTMLCanvasElement,
      { format: "png", scale: 1, exposure: 0, contrast: 0, jpegQuality: 0.92 },
      { card: DEFAULT_CARD },
      "sample.png",
    );

    await expect(failure).rejects.toMatchObject({
      phase: "encode",
      code: "encode-failed",
    });
  });

  it("keeps the PDF page size fixed while increasing only the embedded image resolution", async () => {
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        toBlob(callback: BlobCallback, mimeType: string) {
          callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: mimeType }));
        },
      } as HTMLCanvasElement)),
    });

    const exportPdf = (scale: number) => createCardExportBlob(
      {} as HTMLCanvasElement,
      { format: "pdf", scale, exposure: 0, contrast: 0, jpegQuality: 0.92 },
      { card: DEFAULT_CARD },
    );

    const oneXText = await (await exportPdf(1)).text();
    const threeXText = await (await exportPdf(3)).text();

    expect(oneXText).toContain("/MediaBox [0 0 500 702]");
    expect(threeXText).toContain("/MediaBox [0 0 500 702]");
    expect(oneXText).toContain("500 0 0 702 0 0 cm");
    expect(threeXText).toContain("500 0 0 702 0 0 cm");
    expect(threeXText).toContain("/Width 1500 /Height 2106");
  });
});
