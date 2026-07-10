import { afterEach, describe, expect, it, vi } from "vitest";
import { Children, createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CARD_TEXTURE_BOUNDS } from "../cardModel";
import { UI_TEXT } from "../i18n";
import { DEFAULT_CARD } from "../cardModel";
import { getDevPreviewSampleById } from "../devPreviewCatalog";
import { getCardExportPreflight } from "../exportCard";
import {
  ExportDiagnostics,
  TEXTURE_CONTROL_LIMITS,
  WorkbenchTabList,
  WorkbenchTabPanel,
  canStartCardExport,
  downloadBlob,
  isImportableReferenceImageFile,
  isArtworkReadyForExport,
  parseImportedCardProject,
  safeFileName,
} from "./ProjectPanel";
import {
  clearStaleActiveLibraryEntry,
  formatLibraryEntryMetadata,
  LocalLibraryWorkbench,
} from "./LocalLibraryWorkbench";
import { ReferenceWorkbench } from "./ReferenceWorkbench";
import { consumeSelectedFile, readBrowserFile } from "../browserFiles";
import { isAllowedEmbeddedImageDataUrl } from "../limits";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectPanel file names", () => {
  it("keeps readable Unicode titles instead of falling back to a generic file name", () => {
    expect(safeFileName("自定义坦克")).toBe("自定义坦克");
    expect(safeFileName("CUSTOM TANK")).toBe("custom-tank");
    expect(safeFileName("  T-70 / Elite  ")).toBe("t-70-elite");
  });

  it("uses the generic file name only when a title has no usable letters or numbers", () => {
    expect(safeFileName("!!!")).toBe("custom-card");
  });

  it("keeps the object URL alive until after the browser download click is queued", () => {
    vi.useFakeTimers();
    const revokeObjectUrl = vi.fn();
    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.fn();
    let href = "";
    let download = "";

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:card-export"),
      revokeObjectURL: revokeObjectUrl,
    });
    vi.stubGlobal("document", {
      body: { append },
      createElement: vi.fn(() => ({
        click,
        remove,
        set href(value: string) {
          href = value;
        },
        set download(value: string) {
          download = value;
        },
      })),
    });
    vi.stubGlobal("window", {
      setTimeout: (callback: () => void, delay?: number) => setTimeout(callback, delay),
    });

    downloadBlob(new Blob(["card"]), "card.png");

    expect(href).toBe("blob:card-export");
    expect(download).toBe("card.png");
    expect(append).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();

    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:card-export");
  });
});

describe("ProjectPanel texture controls", () => {
  it("uses the same texture range as imported card normalization", () => {
    expect(TEXTURE_CONTROL_LIMITS).toEqual(CARD_TEXTURE_BOUNDS);
  });
});

describe("ProjectPanel four-tab workbench", () => {
  it("renders four keyboard-addressable ARIA tabs", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkbenchTabList, {
        activeTab: "appearance",
        text: UI_TEXT.zh.projectPanel,
        onTabChange: vi.fn(),
      }),
    );

    expect(markup.match(/role="tab"/g)).toHaveLength(4);
    expect(markup).toContain("外观");
    expect(markup).toContain("卡库");
    expect(markup).toContain("导出");
    expect(markup).toContain("参考");
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('tabindex="-1"');
  });

  it("keeps inactive panel content mounted while hiding it accessibly", () => {
    const markup = renderToStaticMarkup(createElement(WorkbenchTabPanel, {
      activeTab: "appearance",
      tab: "library",
      children: createElement("span", null, "preserved state"),
    }));

    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('hidden=""');
    expect(markup).toContain("preserved state");
  });

  it("cycles tabs with arrow keys and supports Home and End", () => {
    const onTabChange = vi.fn();
    const focus = vi.fn();
    vi.stubGlobal("document", { getElementById: vi.fn(() => ({ focus })) });
    const tree = WorkbenchTabList({
      activeTab: "appearance",
      text: UI_TEXT.zh.projectPanel,
      onTabChange,
    });
    const buttons = Children.toArray(tree.props.children) as ReactElement<{
      onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
    }>[];
    const preventDefault = vi.fn();

    buttons[0].props.onKeyDown({ key: "ArrowLeft", preventDefault });
    buttons[0].props.onKeyDown({ key: "ArrowRight", preventDefault });
    buttons[2].props.onKeyDown({ key: "Home", preventDefault });
    buttons[1].props.onKeyDown({ key: "End", preventDefault });

    expect(onTabChange.mock.calls.map(([tab]) => tab)).toEqual(["reference", "library", "appearance", "reference"]);
    expect(preventDefault).toHaveBeenCalledTimes(4);
    expect(focus).toHaveBeenCalledTimes(4);
  });

  it("renders local-library empty and read-only states with disabled writes", () => {
    const markup = renderToStaticMarkup(
      createElement(LocalLibraryWorkbench, {
        card: DEFAULT_CARD,
        language: "zh",
        text: UI_TEXT.zh.projectPanel,
        activeEntryId: null,
        onEntryLoad: vi.fn(),
        onActiveEntryChange: vi.fn(),
        onDirectoryChange: vi.fn(),
      }),
    );

    expect(markup).toContain("请打开卡库，浏览已保存的卡牌");
    expect(markup).toContain("当前浏览器不能安全写入卡库");
    expect(markup).toContain('disabled=""');
  });

  it("notifies the App when a refreshed library no longer contains the active entry", () => {
    const onActiveEntryChange = vi.fn();
    clearStaleActiveLibraryEntry("stale", { cards: [] }, onActiveEntryChange);
    expect(onActiveEntryChange).toHaveBeenCalledWith(null);

    onActiveEntryChange.mockClear();
    clearStaleActiveLibraryEntry("current", {
      cards: [{
        id: "current",
        title: DEFAULT_CARD.title,
        kind: DEFAULT_CARD.kind,
        nation: DEFAULT_CARD.nation,
        rarity: DEFAULT_CARD.rarity,
        set: DEFAULT_CARD.set,
        updatedAt: "2026-07-09T00:00:00.000Z",
        card: DEFAULT_CARD,
      }],
    }, onActiveEntryChange);
    expect(onActiveEntryChange).not.toHaveBeenCalled();
  });

  it("shows localized card metadata instead of internal library IDs", () => {
    const entry = {
      id: "card-1",
      title: DEFAULT_CARD.title,
      kind: "tank",
      nation: "us",
      rarity: "standard",
      set: "blood-and-iron",
      updatedAt: "2026-07-09T00:00:00.000Z",
      card: DEFAULT_CARD,
    };

    expect(formatLibraryEntryMetadata(entry, "zh")).toBe("坦克 · 美国 · 血与铁");
    expect(formatLibraryEntryMetadata(entry, "en")).toBe("Tank · United States · Blood and Iron");
  });

  it("renders reference filters, selected-row actions, and auto-artwork control", () => {
    const sample = getDevPreviewSampleById("t70")!;
    const markup = renderToStaticMarkup(
      createElement(ReferenceWorkbench, {
        card: DEFAULT_CARD,
        language: "zh",
        text: UI_TEXT.zh.projectPanel,
        samples: [sample],
        selectedSampleId: sample.id,
        getVisibleSamples: () => [sample],
        onSampleSelect: vi.fn(),
        onArtworkApply: vi.fn(),
        onFullCardLoad: vi.fn(),
        autoArtworkEnabled: true,
        onAutoArtworkToggle: vi.fn(),
        showReferenceComparison: true,
        onReferenceComparisonToggle: vi.fn(),
        onReferenceFileSelect: vi.fn(),
        isLoading: false,
        error: null,
        referenceDiff: null,
        referenceDiffError: null,
      }),
    );

    expect(markup).toContain('name="reference-search"');
    expect(markup).toContain('name="reference-kind-filter"');
    expect(markup).toContain('name="reference-sort"');
    expect(markup).toContain("唯一匹配时自动填充卡图");
    expect(markup).toContain("仅应用卡图");
    expect(markup).toContain("载入整张卡牌（覆盖当前）");
    expect(markup).toContain("T-70");
  });

  it("renders preflight and latest export result without claiming a download was saved", () => {
    const preflight = getCardExportPreflight({
      canvasAvailable: true,
      artworkReady: true,
      assetPackWarnings: ["Missing font: fonts/body.ttf"],
      usesProgramTexture: true,
      requiresPrivateConfirmation: false,
    });
    const markup = renderToStaticMarkup(createElement(ExportDiagnostics, {
      language: "zh",
      text: UI_TEXT.zh.projectPanel,
      preflight,
      result: {
        blob: new Blob(["1234"], { type: "image/png" }),
        fileName: "card.png",
        format: "png",
        mimeType: "image/png",
        width: 500,
        height: 702,
        byteLength: 4,
        durationMs: 12,
        normalizedOptions: { format: "png", scale: 1, exposure: 0, contrast: 0, jpegQuality: 0.92 },
        target: { kind: "download", status: "triggered" },
      },
      error: null,
    }));

    expect(markup).toContain("请先检查");
    expect(markup).toContain("card.png");
    expect(markup).toContain("浏览器已开始下载");
    expect(markup).toContain("缺少字体：fonts/body.ttf");
    expect(markup).not.toContain("Missing font");
    expect(markup).not.toContain("已保存到下载目录");
  });
});

describe("ProjectPanel private export gate", () => {
  it("does not ask for confirmation for ordinary local asset packs", () => {
    const confirmPrivateExport = vi.fn(() => false);

    expect(canStartCardExport({ requiresPrivateExportConfirm: false }, confirmPrivateExport)).toBe(true);
    expect(canStartCardExport(null, confirmPrivateExport)).toBe(true);
    expect(confirmPrivateExport).not.toHaveBeenCalled();
  });

  it("blocks private preview exports when confirmation is cancelled", () => {
    const confirmPrivateExport = vi.fn(() => false);

    expect(canStartCardExport({ requiresPrivateExportConfirm: true }, confirmPrivateExport)).toBe(false);
    expect(confirmPrivateExport).toHaveBeenCalledTimes(1);
  });

  it("allows private preview exports after confirmation", () => {
    const confirmPrivateExport = vi.fn(() => true);

    expect(canStartCardExport({ requiresPrivateExportConfirm: true }, confirmPrivateExport)).toBe(true);
    expect(confirmPrivateExport).toHaveBeenCalledTimes(1);
  });

  it("blocks export while the current embedded artwork is still loading", () => {
    const confirmPrivateExport = vi.fn(() => true);

    expect(canStartCardExport(null, confirmPrivateExport, false)).toBe(false);
    expect(confirmPrivateExport).not.toHaveBeenCalled();
  });

  it("does not treat an image decoded for an older source as current artwork", () => {
    const image = {} as HTMLImageElement;

    expect(isArtworkReadyForExport("data:image/png;base64,new", image, "data:image/png;base64,old")).toBe(false);
    expect(isArtworkReadyForExport("data:image/png;base64,new", image, "data:image/png;base64,new")).toBe(true);
    expect(isArtworkReadyForExport(undefined, null, null)).toBe(true);
  });
});

describe("ProjectPanel project import", () => {
  it("rejects a project when its embedded artwork fails decoded-dimension validation", async () => {
    const dataUrl = "data:image/png;base64,valid-looking-project-artwork";
    const validateEmbeddedArtwork = vi.fn(async () => false);

    await expect(
      parseImportedCardProject(
        JSON.stringify({
          artwork: {
            source: "upload",
            dataUrl,
            crop: { x: 0, y: 0, scale: 1 },
          },
        }),
        validateEmbeddedArtwork,
      ),
    ).rejects.toThrow();
    expect(validateEmbeddedArtwork).toHaveBeenCalledWith(dataUrl);
  });

  it("rejects upload artwork before normalization can silently discard an invalid data URL", async () => {
    const invalidDataUrl = "data:image/gif;base64,not-supported";
    const validateEmbeddedArtwork = vi.fn(async () => false);

    await expect(
      parseImportedCardProject(
        JSON.stringify({ artwork: { source: "upload", dataUrl: invalidDataUrl } }),
        validateEmbeddedArtwork,
      ),
    ).rejects.toThrow(/artwork/i);
    expect(validateEmbeddedArtwork).toHaveBeenCalledWith(invalidDataUrl);
  });

  it("checks embedded artwork magic bytes and decoded dimensions", async () => {
    class BoundedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 100;
      naturalHeight = 100;
      width = 100;
      height = 100;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", BoundedImage);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(toBlobPart(pngHeader()), {
      headers: { "content-type": "image/png" },
    })));

    await expect(
      isAllowedEmbeddedImageDataUrl("data:image/png;base64,valid-looking-project-artwork"),
    ).resolves.toBe(true);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(toBlobPart(new Uint8Array([1, 2, 3])), {
      headers: { "content-type": "image/png" },
    })));
    await expect(
      isAllowedEmbeddedImageDataUrl("data:image/png;base64,invalid-project-artwork"),
    ).resolves.toBe(false);

    class OversizedImage extends BoundedImage {
      naturalWidth = 5000;
      naturalHeight = 5000;
      width = 5000;
      height = 5000;
    }
    vi.stubGlobal("Image", OversizedImage);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(toBlobPart(pngHeader()), {
      headers: { "content-type": "image/png" },
    })));
    await expect(
      isAllowedEmbeddedImageDataUrl("data:image/png;base64,oversized-project-artwork"),
    ).resolves.toBe(false);
  });

  it("reports FileReader error and abort outcomes as failed reads", async () => {
    const file = new File(["{}"], "card.card.json", { type: "application/json" });

    stubFileReaderFailure("error");
    await expect(readBrowserFile(file, "text")).rejects.toThrow();

    stubFileReaderFailure("abort");
    await expect(readBrowserFile(file, "text")).rejects.toThrow();
  });

  it("clears the selected file after both successful and failed consumption", async () => {
    const file = new File(["{}"], "card.card.json", { type: "application/json" });
    const successfulInput = createFileInput(file);
    const failedInput = createFileInput(file);

    await consumeSelectedFile(successfulInput, async () => undefined);
    expect(successfulInput.value).toBe("");

    await expect(
      consumeSelectedFile(failedInput, async () => {
        throw new Error("read failed");
      }),
    ).rejects.toThrow("read failed");
    expect(failedInput.value).toBe("");
  });
});

describe("ProjectPanel reference comparison import", () => {
  it("uses the same bounded image conditions as artwork import", async () => {
    await expect(isImportableReferenceImageFile(createImageFile("reference.png", pngHeader(), "image/png"))).resolves.toBe(true);
    await expect(isImportableReferenceImageFile(createImageFile("reference.webp", webpHeader(), "image/webp"))).resolves.toBe(true);
    await expect(isImportableReferenceImageFile(createImageFile("reference.jpg", jpegHeader(), ""))).resolves.toBe(true);
    await expect(
      isImportableReferenceImageFile(createImageFile("reference.gif", new Uint8Array([0x47, 0x49]), "image/gif")),
    ).resolves.toBe(false);
    await expect(
      isImportableReferenceImageFile(createImageFile("reference.png", new Uint8Array(5 * 1024 * 1024 + 1), "image/png")),
    ).resolves.toBe(false);
    await expect(
      isImportableReferenceImageFile(createImageFile("fake.png", new Uint8Array([1, 2, 3]), "image/png")),
    ).resolves.toBe(false);
  });
});

function createImageFile(name: string, content: Uint8Array, type: string): File {
  return new File([toBlobPart(content)], name, { type });
}

function toBlobPart(content: Uint8Array): BlobPart {
  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);
  return buffer;
}

function pngHeader(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function webpHeader(): Uint8Array {
  return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
}

function jpegHeader(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff]);
}

function createFileInput(file: File): Pick<HTMLInputElement, "files" | "value"> {
  return {
    files: [file] as unknown as FileList,
    value: "C:\\fakepath\\card.card.json",
  };
}

function stubFileReaderFailure(outcome: "error" | "abort"): void {
  vi.stubGlobal("FileReader", class {
    result: string | ArrayBuffer | null = null;
    private readonly listeners = new Map<string, () => void>();

    addEventListener(type: string, listener: () => void): void {
      this.listeners.set(type, listener);
    }

    readAsText(): void {
      queueMicrotask(() => this.listeners.get(outcome)?.());
    }
  });
}
