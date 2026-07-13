import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import {
  LOCAL_ASSET_PACK_MANIFEST,
  loadAssetPackFromFiles,
  loadAssetPackFromUrl,
} from "./assetPack";
import type { CardRenderAssetContext } from "./canvas/renderAssets";
import { SETS } from "./presets";

const assetContext: CardRenderAssetContext = {
  card: DEFAULT_CARD,
  kind: DEFAULT_CARD.kind,
  nationId: DEFAULT_CARD.nation,
  rarityId: DEFAULT_CARD.rarity,
  setId: DEFAULT_CARD.set,
  template: "unit",
};

const NativeURL = globalThis.URL;
const MAX_ASSET_PACK_MANIFEST_BYTES = 256 * 1024;
let objectUrlCounter = 0;
let createdUrls: string[] = [];
let revokedUrls: string[] = [];
let deletedFonts: unknown[] = [];

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 1;
  height = 1;
  naturalWidth = 1;
  naturalHeight = 1;

  set src(value: string) {
    this.naturalWidth = value.includes("huge-pixels") ? 5000 : 1;
    this.naturalHeight = value.includes("huge-pixels") ? 5000 : 1;
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
          images: [{ slot: "frame", file: "images/FRAME.PNG", template: "unit" }],
          fonts: [{ role: "title", family: "Kards Test", file: "fonts/HEADER.TTF" }],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("FRAME.PNG", pngHeader(), "pack/images/FRAME.PNG"),
      createFile("HEADER.TTF", "font", "pack/fonts/HEADER.TTF"),
    ]);

    expect(pack.name).toBe("Test pack");
    expect(pack.imageCount).toBe(1);
    expect(pack.fontCount).toBe(1);
    expect(pack.requiresPrivateExportConfirm).toBe(false);
    expect(pack.warnings).toEqual([]);
    expect(pack.resolveImage("frame", assetContext)).toBeInstanceOf(FakeImage);

    pack.dispose();

    expect(revokedUrls).toEqual(createdUrls);
    expect(deletedFonts).toHaveLength(1);
  });

  it("accepts Republic of China and Chinese Communist nation-mark selectors", async () => {
    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          images: [
            { slot: "nation-mark", nationId: "roc", kind: "fighter", template: "unit", file: "images/roc-fighter.png" },
            { slot: "nation-mark", nationId: "ccp", kind: "artillery", template: "unit", file: "images/ccp-artillery.png" },
          ],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("roc-fighter.png", pngHeader(), "pack/images/roc-fighter.png", "image/png"),
      createFile("ccp-artillery.png", pngHeader(), "pack/images/ccp-artillery.png", "image/png"),
    ]);

    expect(pack.imageCount).toBe(2);
    expect(pack.resolveImage("nation-mark", {
      ...assetContext,
      nationId: "roc",
      kind: "fighter",
    })).toBeInstanceOf(FakeImage);
    expect(pack.resolveImage("nation-mark", {
      ...assetContext,
      nationId: "ccp",
      kind: "artillery",
    })).toBeInstanceOf(FakeImage);

    pack.dispose();
  });

  it("rejects oversized local and URL manifests before loading their entries", async () => {
    const oversizedManifest = JSON.stringify({
      version: 1,
      name: "x".repeat(MAX_ASSET_PACK_MANIFEST_BYTES),
    });

    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          oversizedManifest,
          "pack/kards-asset-pack.json",
        ),
      ]),
    ).rejects.toThrow(/manifest.*large/i);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(oversizedManifest)));
    vi.stubGlobal("window", { location: { href: "https://cards.example/" } });

    await expect(
      loadAssetPackFromUrl("https://cards.example/reference-pack/v1/kards-asset-pack.json"),
    ).rejects.toThrow(/manifest.*large/i);
  });

  it("rejects folders with multiple asset pack manifests", async () => {
    await expect(
      loadAssetPackFromFiles([
        createFile(
          LOCAL_ASSET_PACK_MANIFEST,
          JSON.stringify({ version: 1 }),
          `pack/${LOCAL_ASSET_PACK_MANIFEST}`,
        ),
        createFile(
          LOCAL_ASSET_PACK_MANIFEST,
          JSON.stringify({ version: 1 }),
          `pack/backup/${LOCAL_ASSET_PACK_MANIFEST}`,
        ),
      ]),
    ).rejects.toThrow(/multiple.*kards-asset-pack\.json/i);
  });

  it("rejects manifests with excessive image or font entry counts", async () => {
    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            images: Array.from({ length: 257 }, (_, index) => ({
              slot: "frame",
              setId: `set-${index}`,
              file: `images/frame-${index}.png`,
            })),
          }),
          "pack/kards-asset-pack.json",
        ),
      ]),
    ).rejects.toThrow(/image entries/i);

    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            fonts: Array.from({ length: 7 }, (_, index) => ({
              family: `Font ${index}`,
              file: `fonts/font-${index}.woff2`,
            })),
          }),
          "pack/kards-asset-pack.json",
        ),
      ]),
    ).rejects.toThrow(/font entries/i);
  });

  it("rejects duplicate asset selectors instead of depending on manifest order", async () => {
    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            images: [
              { slot: "frame", template: "unit", file: "images/frame-a.png" },
              { slot: "frame", template: "unit", file: "images/frame-b.png" },
            ],
          }),
          "pack/kards-asset-pack.json",
        ),
        createFile("frame-a.png", pngHeader(), "pack/images/frame-a.png", "image/png"),
        createFile("frame-b.png", pngHeader(), "pack/images/frame-b.png", "image/png"),
      ]),
    ).rejects.toThrow(/duplicate.*selector/i);

    await expect(loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          fonts: [
            { family: "Body A", role: "body", file: "fonts/a.woff2" },
            { family: "Body B", file: "fonts/b.woff2" },
          ],
        }),
        "pack/kards-asset-pack.json",
      ),
    ])).rejects.toThrow(/duplicate.*font role/i);
  });

  it("rejects invalid manifest field types while accepting the command template", async () => {
    await expect(loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({ version: 1, name: {}, images: [] }),
        "pack/kards-asset-pack.json",
      ),
    ])).rejects.toThrow(/name.*string/i);

    await expect(loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          fonts: [{ family: "Body", role: "", file: "fonts/body.woff2" }],
        }),
        "pack/kards-asset-pack.json",
      ),
    ])).rejects.toThrow(/unknown font role/i);

    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          images: [{ slot: "frame", template: "command", file: "images/command.png" }],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("command.png", pngHeader(), "pack/images/command.png", "image/png"),
    ]);
    expect(pack.imageCount).toBe(1);
    pack.dispose();
  });

  it("decodes a repeatedly referenced image path only once", async () => {
    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          images: [
            { slot: "frame", template: "unit", file: "images/shared.png" },
            { slot: "frame", template: "command", file: "images/shared.png" },
          ],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("shared.png", pngHeader(), "pack/images/shared.png", "image/png"),
    ]);

    expect(pack.imageCount).toBe(2);
    expect(createdUrls).toHaveLength(1);

    pack.dispose();
    expect(revokedUrls).toEqual(createdUrls);
  });

  it("does not guess when a basename matches multiple local files", async () => {
    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({ version: 1, images: [{ slot: "frame", file: "shared.png" }] }),
        "pack/kards-asset-pack.json",
      ),
      createFile("shared.png", pngHeader(), "pack/a/shared.png", "image/png"),
      createFile("shared.png", pngHeader(), "pack/b/shared.png", "image/png"),
    ]);

    expect(pack.imageCount).toBe(0);
    expect(pack.warnings).toEqual(["Missing image: shared.png"]);
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

  it("skips unsupported or oversized local asset pack files", async () => {
    const pack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          images: [
            { slot: "frame", file: "images/frame.gif" },
            { slot: "cost-board", file: "images/huge.png" },
          ],
          fonts: [
            { role: "title", family: "Bad Font", file: "fonts/font.exe" },
            { role: "body", family: "Huge Font", file: "fonts/huge.ttf" },
          ],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("frame.gif", "gif", "pack/images/frame.gif", "image/gif"),
      createFile("huge.png", new Uint8Array(5 * 1024 * 1024 + 1), "pack/images/huge.png", "image/png"),
      createFile("font.exe", "font", "pack/fonts/font.exe"),
      createFile("huge.ttf", new Uint8Array(8 * 1024 * 1024 + 1), "pack/fonts/huge.ttf"),
    ]);

    expect(pack.imageCount).toBe(0);
    expect(pack.fontCount).toBe(0);
    expect(pack.warnings).toEqual([
      "Unsupported image: images/frame.gif",
      "Image too large: images/huge.png",
      "Unsupported font: fonts/font.exe",
      "Font too large: fonts/huge.ttf",
    ]);
  });

  it("rejects local asset pack images with fake signatures or excessive decoded pixels", async () => {
    const fakeSignaturePack = await loadAssetPackFromFiles([
      createFile(
        "kards-asset-pack.json",
        JSON.stringify({
          version: 1,
          images: [{ slot: "frame", file: "images/fake.png" }],
        }),
        "pack/kards-asset-pack.json",
      ),
      createFile("fake.png", new Uint8Array([1, 2, 3]), "pack/images/fake.png", "image/png"),
    ]);

    expect(fakeSignaturePack.imageCount).toBe(0);
    expect(fakeSignaturePack.warnings).toEqual(["Unsupported image: images/fake.png"]);

    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            images: [{ slot: "frame", file: "images/huge-pixels.png" }],
          }),
          "pack/kards-asset-pack.json",
        ),
        createFile("huge-pixels.png", pngHeader(), "pack/images/huge-pixels.png", "image/png"),
      ]),
    ).rejects.toThrow("Image dimensions are too large");
  });

  it("loads manifest images from a dev-server URL", async () => {
    vi.stubGlobal(
      "fetch",
      createAssetPackFetch({
        version: 1,
        name: "Dev pack",
        images: [{ slot: "type-icon", kind: "tank", file: "images/tank.png" }],
      }),
    );
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5174/" } });

    const pack = await loadAssetPackFromUrl(
      "http://127.0.0.1:5174/.runtime/kards-private-assets/stage6/kards-asset-pack.json",
    );

    expect(pack.name).toBe("Dev pack");
    expect(pack.imageCount).toBe(1);
    expect(pack.requiresPrivateExportConfirm).toBe(true);
    expect(pack.resolveImage("type-icon", assetContext)).toBeInstanceOf(FakeImage);
  });

  it("loads URL images with no more than four decodes in flight", async () => {
    let activeImages = 0;
    let peakActiveImages = 0;

    class ConcurrentImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 1;
      height = 1;
      naturalWidth = 1;
      naturalHeight = 1;

      set src(_value: string) {
        activeImages += 1;
        peakActiveImages = Math.max(peakActiveImages, activeImages);
        setTimeout(() => {
          activeImages -= 1;
          this.onload?.();
        }, 0);
      }
    }

    vi.stubGlobal("Image", ConcurrentImage);
    vi.stubGlobal(
      "fetch",
      createAssetPackFetch({
        version: 1,
        images: Array.from({ length: 9 }, (_, index) => ({
          slot: "frame",
          setId: SETS[index].id,
          file: `images/frame-${index}.png`,
        })),
      }),
    );
    vi.stubGlobal("window", { location: { href: "https://cards.example/" } });

    const pack = await loadAssetPackFromUrl(
      "https://cards.example/reference-pack/v1/kards-asset-pack.json",
    );

    expect(pack.imageCount).toBe(9);
    expect(peakActiveImages).toBeLessThanOrEqual(4);
  });

  it("stops URL image scheduling when the aggregate pixel budget is exceeded", async () => {
    class MaxAllowedUrlImage extends FakeImage {
      width = 4000;
      height = 4000;
      naturalWidth = 4000;
      naturalHeight = 4000;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    const manifest = {
      version: 1,
      images: Array.from({ length: 10 }, (_, index) => ({
        slot: "frame",
        setId: SETS[index].id,
        file: `images/frame-${index}.png`,
      })),
    };
    vi.stubGlobal("Image", MaxAllowedUrlImage);
    vi.stubGlobal("fetch", createAssetPackFetch(manifest));
    vi.stubGlobal("window", { location: { href: "https://cards.example/" } });

    await expect(loadAssetPackFromUrl(
      "https://cards.example/reference-pack/v1/kards-asset-pack.json",
    )).rejects.toThrow(/pixel budget/i);

    expect(createdUrls.length).toBeLessThan(10);
    expect(new Set(revokedUrls)).toEqual(new Set(createdUrls));
  });

  it("skips URL images with invalid signatures or oversized declared bytes", async () => {
    const manifest = {
      version: 1,
      images: [
        { slot: "frame", file: "images/invalid.png" },
        { slot: "cost-board", file: "images/oversized.png" },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith(LOCAL_MANIFEST_PATH)) {
        return new Response(JSON.stringify(manifest));
      }
      if (url.endsWith("oversized.png")) {
        return new Response(toBlobPart(pngHeader()), {
          headers: {
            "content-type": "image/png",
            "content-length": String(5 * 1024 * 1024 + 1),
          },
        });
      }
      return new Response(toBlobPart(new Uint8Array([1, 2, 3])), {
        headers: { "content-type": "image/png" },
      });
    }));
    vi.stubGlobal("window", { location: { href: "https://cards.example/" } });

    const pack = await loadAssetPackFromUrl(
      "https://cards.example/reference-pack/v1/kards-asset-pack.json",
    );

    expect(pack.imageCount).toBe(0);
    expect(pack.warnings).toEqual([
      "Could not load image: images/invalid.png",
      "Could not load image: images/oversized.png",
    ]);
  });

  it("fails closed when URL image and font declarations exceed the aggregate byte budget", async () => {
    const manifest = {
      version: 1,
      images: Array.from({ length: 4 }, (_, index) => ({
        slot: "frame",
        setId: SETS[index].id,
        file: `images/frame-${index}.png`,
      })),
      fonts: Array.from({ length: 6 }, (_, index) => ({
        role: ["title", "body", "keyword", "cost", "stat", "utility"][index],
        family: `Font ${index}`,
        file: `fonts/font-${index}.woff2`,
      })),
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith(LOCAL_MANIFEST_PATH)) {
        return new Response(JSON.stringify(manifest));
      }
      if (url.endsWith(".woff2")) {
        return new Response("font", {
          headers: { "content-length": String(8 * 1024 * 1024) },
        });
      }
      return new Response(toBlobPart(pngHeader()), {
        headers: {
          "content-type": "image/png",
          "content-length": String(5 * 1024 * 1024),
        },
      });
    }));
    vi.stubGlobal("window", { location: { href: "https://cards.example/" } });

    await expect(loadAssetPackFromUrl(
      "https://cards.example/reference-pack/v1/kards-asset-pack.json",
    )).rejects.toThrow(/file budget/i);
    expect(new Set(revokedUrls)).toEqual(new Set(createdUrls));
  });

  it("rejects packs whose images exceed the aggregate decoded-pixel budget", async () => {
    class MaxAllowedImage extends FakeImage {
      width = 4000;
      height = 4000;
      naturalWidth = 4000;
      naturalHeight = 4000;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal("Image", MaxAllowedImage);
    const imageEntries = Array.from({ length: 5 }, (_, index) => ({
      slot: "frame",
      setId: SETS[index].id,
      file: `images/frame-${index}.png`,
    }));
    const files = imageEntries.map((entry, index) => (
      createFile(`frame-${index}.png`, pngHeader(), `pack/${entry.file}`, "image/png")
    ));

    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({ version: 1, images: imageEntries }),
          "pack/kards-asset-pack.json",
        ),
        ...files,
      ]),
    ).rejects.toThrow(/pixel/i);

    expect(new Set(revokedUrls)).toEqual(new Set(createdUrls));
  });

  it("honors an explicit public-pack export confirmation policy", async () => {
    vi.stubGlobal(
      "fetch",
      createAssetPackFetch({
        version: 1,
        name: "Authorized public pack",
        requiresPrivateExportConfirm: false,
        images: [{ slot: "type-icon", kind: "tank", file: "images/tank.png" }],
      }),
    );
    vi.stubGlobal("window", { location: { href: "https://cards.example/" } });

    const pack = await loadAssetPackFromUrl(
      "https://cards.example/reference-pack/v1/kards-asset-pack.json",
    );

    expect(pack.name).toBe("Authorized public pack");
    expect(pack.requiresPrivateExportConfirm).toBe(false);
  });

  it("rejects manifest paths that escape the selected pack", async () => {
    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            images: [{ slot: "frame", file: "../private/frame.png" }],
          }),
          "pack/kards-asset-pack.json",
        ),
      ]),
    ).rejects.toThrow("Asset manifest paths must stay relative");

    await expect(
      loadAssetPackFromFiles([
        createFile(
          "kards-asset-pack.json",
          JSON.stringify({
            version: 1,
            images: [{ slot: "frame", file: "%2e%2e/private/frame.png" }],
          }),
          "pack/kards-asset-pack.json",
        ),
      ]),
    ).rejects.toThrow("Asset manifest paths must stay relative");
  });

  it("rejects absolute URLs in dev-server manifests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            version: 1,
            images: [{ slot: "type-icon", kind: "tank", file: "https://example.test/tank.png" }],
          }),
        );
      }),
    );
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5174/" } });

    await expect(
      loadAssetPackFromUrl(
        "http://127.0.0.1:5174/.runtime/kards-private-assets/stage6/kards-asset-pack.json",
      ),
    ).rejects.toThrow("Asset manifest paths must stay relative");
  });

  it("rejects encoded traversal in dev-server manifests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            version: 1,
            images: [{ slot: "type-icon", kind: "tank", file: "%2e%2e/private/tank.png" }],
          }),
        );
      }),
    );
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5174/" } });

    await expect(
      loadAssetPackFromUrl(
        "http://127.0.0.1:5174/.runtime/kards-private-assets/stage6/kards-asset-pack.json",
      ),
    ).rejects.toThrow("Asset manifest paths must stay relative");
  });

  it("skips dev-server images that decode to excessive pixels", async () => {
    vi.stubGlobal(
      "fetch",
      createAssetPackFetch({
        version: 1,
        images: [{ slot: "frame", file: "images/huge-pixels.png" }],
      }),
    );
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5174/" } });

    const pack = await loadAssetPackFromUrl(
      "http://127.0.0.1:5174/.runtime/kards-private-assets/stage6/kards-asset-pack.json",
    );

    expect(pack.imageCount).toBe(0);
    expect(pack.warnings).toEqual(["Could not load image: images/huge-pixels.png"]);
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
        createFile("good.png", pngHeader(), "pack/images/good.png"),
        createFile("bad-image.png", pngHeader(), "pack/images/bad-image.png"),
      ]),
    ).rejects.toThrow("Could not read bad-image.png as an image");

    expect(new Set(revokedUrls)).toEqual(new Set(createdUrls));
  });
});

function createFile(
  name: string,
  content: string | Uint8Array,
  webkitRelativePath: string,
  type = "",
): File {
  const file = new File([toBlobPart(content)], name, { type });
  Object.defineProperty(file, "webkitRelativePath", {
    value: webkitRelativePath,
  });
  return file;
}

function toBlobPart(content: string | Uint8Array): BlobPart {
  if (typeof content === "string") {
    return content;
  }

  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);
  return buffer;
}

function pngHeader(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function createAssetPackFetch(manifest: unknown): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(LOCAL_MANIFEST_PATH)) {
      return new Response(JSON.stringify(manifest), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(toBlobPart(pngHeader()), {
      headers: { "content-type": "image/png" },
    });
  });
}

const LOCAL_MANIFEST_PATH = "kards-asset-pack.json";
