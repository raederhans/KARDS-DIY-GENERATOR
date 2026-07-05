import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, safeFileName } from "./ProjectPanel";

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
