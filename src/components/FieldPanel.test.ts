import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD } from "../cardModel";
import { UI_TEXT } from "../i18n";
import { FieldPanel, hasDraggedFiles, isImportableArtworkFile, toggleFieldPanelSection } from "./FieldPanel";

describe("FieldPanel collapsible sections", () => {
  it("toggles one section without changing the other collapsed sections", () => {
    const collapsed = toggleFieldPanelSection({ title: true }, "artwork");

    expect(collapsed).toEqual({
      title: true,
      artwork: true,
    });
    expect(toggleFieldPanelSection(collapsed, "artwork")).toEqual({
      title: true,
      artwork: false,
    });
  });
});

describe("FieldPanel value fields", () => {
  it("shows only HQ defense for headquarters cards", () => {
    const markup = renderToStaticMarkup(
      createElement(FieldPanel, {
        card: {
          ...DEFAULT_CARD,
          kind: "hq",
          costs: {},
          stats: { hqDefense: 20 },
        },
        language: "zh",
        text: UI_TEXT.zh.fieldPanel,
        onCardChange: vi.fn(),
      }),
    );

    expect(markup).toContain('name="card-hq-defense"');
    expect(markup).not.toContain('name="card-deployment-cost"');
    expect(markup).not.toContain('name="card-operation-cost"');
    expect(markup).not.toContain('name="card-attack"');
    expect(markup).not.toContain('name="card-defense"');
  });

  it("keeps ordinary unit values without showing HQ defense", () => {
    const markup = renderToStaticMarkup(
      createElement(FieldPanel, {
        card: DEFAULT_CARD,
        language: "zh",
        text: UI_TEXT.zh.fieldPanel,
        onCardChange: vi.fn(),
      }),
    );

    expect(markup).toContain('name="card-deployment-cost"');
    expect(markup).toContain('name="card-operation-cost"');
    expect(markup).toContain('name="card-attack"');
    expect(markup).toContain('name="card-defense"');
    expect(markup).not.toContain('name="card-hq-defense"');
  });
});

describe("FieldPanel artwork drop import", () => {
  it("uses the same file conditions as artwork upload", async () => {
    await expect(isImportableArtworkFile(createImageFile("art.png", pngHeader(), "image/png"))).resolves.toBe(true);
    await expect(isImportableArtworkFile(createImageFile("art.webp", webpHeader(), "image/webp"))).resolves.toBe(true);
    await expect(isImportableArtworkFile(createImageFile("art.png", pngHeader(), ""))).resolves.toBe(true);
    await expect(isImportableArtworkFile(createImageFile("art.gif", new Uint8Array([0x47, 0x49]), "image/gif"))).resolves.toBe(false);
    await expect(
      isImportableArtworkFile(createImageFile("art.png", new Uint8Array(5 * 1024 * 1024 + 1), "image/png")),
    ).resolves.toBe(false);
    await expect(isImportableArtworkFile(createImageFile("fake.png", new Uint8Array([1, 2, 3]), "image/png"))).resolves.toBe(false);
  });

  it("recognizes file drags without treating text drags as artwork drops", () => {
    const fileItem = { kind: "file" };
    const textItem = { kind: "string" };

    expect(hasDraggedFiles({ items: [fileItem], files: [] } as unknown as DataTransfer)).toBe(true);
    expect(hasDraggedFiles({ items: [textItem], files: [] } as unknown as DataTransfer)).toBe(false);
    expect(hasDraggedFiles({ items: [], files: [{}] } as unknown as DataTransfer)).toBe(true);
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
