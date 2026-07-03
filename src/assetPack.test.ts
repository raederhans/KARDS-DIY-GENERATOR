import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import { loadAssetPackFromFiles, loadAssetPackFromUrl } from "./assetPack";
import type { CardRenderAssetContext } from "./canvas/renderAssets";

const assetContext: CardRenderAssetContext = {
  card: DEFAULT_CARD,
  kind: DEFAULT_CARD.kind,
  nationId: DEFAULT_CARD.nation,
  rarityId: DEFAULT_CARD.rarity,
  setId: DEFAULT_CARD.set,
  template: "unit",
};

const NativeURL = globalThis.URL;
let objectUrlCounter = 0;
let createdUrls: string[] = [];
let revokedUrls: string[] = [];
let deletedFonts: unknown[] = [];

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 1;
  height = 1;

  set src(value: string) {
    queueMicrotask(() => {
      if (value.includes("bad-image")) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

class FakeFontFace {
  family: string;

  constructor(family: string) {
    this.family = family;
  }

  async load() {
    return this;
  }
}

describe("local asset pack loader", () => {
  beforeEach(() => {
    objectUrlCounter = 0;
    createdUrls = [];
    revokedUrls = [];
    deletedFonts = [];
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("FontFace", FakeFontFace);
    vi.stubGlobal("document", {
      fonts: {
        add: vi.fn(),
        delete: vi.fn((font: unknown) => {
          deletedFonts.push(font);
          return true;
        }),
      },
    });
    vi.stubGlobal(
      "URL",
      class TestURL extends NativeURL {
        static createObjectURL(file: File) {
          const url = `blob:${file.name}:${objectUrlCounter}`;
          objectUrlCounter += 1;
          createdUrls.push(url);
          return url;
        }

        static revokeObjectURL(url: string) {
          revokedUrls.push(url);
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads manifest images and fonts from a selected local folder", async () => {
    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          name: "Test pack",
          images: [{ slot: "frame", file: "images/frame.png", template: "unit" }],
          fonts: [{ role: "title", family: "Kards Test", file: "fonts/header.ttf" }],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("frame.png", "image", "pack/images/frame.png"),
      createFile("header.ttf", "font", "pack/fonts/header.ttf"),
    ]);

    expect(pack.name).toBe("Test pack");
    expect(pack.imageCount).toBe(1);
    expect(pack.fontCount).toBe(1);
    expect(pack.warnings).toEqual([]);
    expect(pack.resolveImage("frame", assetContext)).toBeInstanceOf(FakeImage);

    pack.dispose();

    expect(revokedUrls).toEqual(createdUrls);
    expect(deletedFonts).toHaveLength(1);
  });

  it("reports missing assets as warnings instead of guessing replacements", async () => {
    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          images: [{ slot: "frame", file: "images/missing.png" }],
        }),
        "pack/kards-asset-pack.json",
      ),
    ]);

    expect(pack.imageCount).toBe(0);
    expect(pack.resolveImage("frame", assetContext)).toBeUndefined();
    expect(pack.warnings).toEqual(["Missing image: images/missing.png"]);
  });

  it("loads manifest images from a dev-server URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            version: 1,
            name: "Dev pack",
            images: [{ slot: "type-icon", kind: "tank", file: "images/tank.png" }],
          }),
        );
      }),
    );
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5174/" } });

    const pack = await loadAssetPackFromUrl(
      "http://127.0.0.1:5174/.runtime/kards-private-assets/stage6/kards-asset-pack.json",
    );

    expect(pack.name).toBe("Dev pack");
    expect(pack.imageCount).toBe(1);
    expect(pack.resolveImage("type-icon", assetContext)).toBeInstanceOf(FakeImage);
  });

  it("releases already loaded URLs when a later image fails", async () => {
    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            images: [
              { slot: "frame", file: "images/good.png" },
              { slot: "cost-board", file: "images/bad-image.png" },
            ],
          }),
          "pack/kards-asset-pack.json",
        ),
        createFile("good.png", "good", "pack/images/good.png"),
        createFile("bad-image.png", "bad", "pack/images/bad-image.png"),
      ]),
    ).rejects.toThrow("Could not read bad-image.png as an image");

    expect(new Set(revokedUrls)).toEqual(new Set(createdUrls));
  });
});

function createFile(name: string, content: string, webkitRelativePath: string): File {
  const file = new File([content], name);
  Object.defineProperty(file, "webkitRelativePath", {
    value: webkitRelativePath,
  });
  return file;
}
