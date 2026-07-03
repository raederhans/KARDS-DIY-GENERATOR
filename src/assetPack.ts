import {
  createStaticAssetResolver,
  isCardRenderAssetSlot,
  type CardRenderAssetEntry,
  type CardRenderAssetSlot,
  type CardRenderAssets,
  type CardRenderFontSet,
} from "./canvas/renderAssets";
import type { CardKind } from "./types";
import type { CardTemplate } from "./canvas/layout";

export const LOCAL_ASSET_PACK_MANIFEST = "kards-asset-pack.json";
const FONT_ROLES = new Set(["title", "body", "utility"]);

type AssetPackImageManifestEntry = {
  slot: CardRenderAssetSlot;
  file: string;
  kind?: CardKind;
  nationId?: string;
  rarityId?: string;
  setId?: string;
  template?: CardTemplate;
};

type AssetPackFontManifestEntry = {
  family: string;
  file: string;
  role?: keyof CardRenderFontSet;
};

type AssetPackManifest = {
  version: 1;
  name?: string;
  rightsNotice?: string;
  images?: AssetPackImageManifestEntry[];
  fonts?: AssetPackFontManifestEntry[];
};

export type LoadedAssetPack = CardRenderAssets & {
  name: string;
  imageCount: number;
  fontCount: number;
  warnings: string[];
  fonts: CardRenderFontSet;
  dispose: () => void;
};

export async function loadAssetPackFromFiles(fileList: FileList | File[]): Promise<LoadedAssetPack> {
  const files = Array.from(fileList);
  const filesByPath = indexFilesByPath(files);
  const manifestFile = files.find((file) => getBaseName(getFilePath(file)) === LOCAL_ASSET_PACK_MANIFEST);

  if (!manifestFile) {
    throw new Error(`Select a folder that contains ${LOCAL_ASSET_PACK_MANIFEST}.`);
  }

  const manifest = parseAssetPackManifest(JSON.parse(await manifestFile.text()));
  const objectUrls: string[] = [];
  const loadedFonts: FontFace[] = [];
  const warnings: string[] = [];
  const imageEntries: CardRenderAssetEntry[] = [];
  const fonts: CardRenderFontSet = {};

  try {
    for (const entry of manifest.images ?? []) {
      const imageFile = filesByPath.get(normalizePath(entry.file));
      if (!imageFile) {
        warnings.push(`Missing image: ${entry.file}`);
        continue;
      }

      const loadedImage = await loadImageFile(imageFile);
      objectUrls.push(loadedImage.url);
      imageEntries.push({ ...entry, image: loadedImage.image });
    }

    for (const entry of manifest.fonts ?? []) {
      const fontFile = filesByPath.get(normalizePath(entry.file));
      if (!fontFile) {
        warnings.push(`Missing font: ${entry.file}`);
        continue;
      }

      try {
        loadedFonts.push(await loadFontFile(entry.family, fontFile));
        fonts[entry.role ?? "body"] = quoteFontFamily(entry.family);
      } catch {
        warnings.push(`Could not load font: ${entry.file}`);
      }
    }
  } catch (error) {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }

  const resolver = createStaticAssetResolver(imageEntries, manifest.name ?? "Local KARDS asset pack");
  return {
    ...resolver,
    name: manifest.name ?? "Local KARDS asset pack",
    imageCount: imageEntries.length,
    fontCount: Object.keys(fonts).length,
    warnings,
    fonts,
    dispose() {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      loadedFonts.forEach((font) => document.fonts.delete(font));
    },
  };
}

function parseAssetPackManifest(value: unknown): AssetPackManifest {
  if (!value || typeof value !== "object") {
    throw new Error(`${LOCAL_ASSET_PACK_MANIFEST} must contain a JSON object.`);
  }

  const manifest = value as Partial<AssetPackManifest>;
  if (manifest.version !== 1) {
    throw new Error(`${LOCAL_ASSET_PACK_MANIFEST} must use version 1.`);
  }
  if (manifest.images !== undefined && !Array.isArray(manifest.images)) {
    throw new Error(`${LOCAL_ASSET_PACK_MANIFEST} images must be an array.`);
  }
  if (manifest.fonts !== undefined && !Array.isArray(manifest.fonts)) {
    throw new Error(`${LOCAL_ASSET_PACK_MANIFEST} fonts must be an array.`);
  }

  for (const entry of manifest.images ?? []) {
    if (!isCardRenderAssetSlot(entry.slot)) {
      throw new Error(`Unknown render asset slot: ${entry.slot}`);
    }
    if (!entry.file) {
      throw new Error(`Asset slot ${entry.slot} is missing a file path.`);
    }
  }

  for (const entry of manifest.fonts ?? []) {
    if (!entry.family || !entry.file) {
      throw new Error("Every font entry needs both family and file.");
    }
    if (entry.role && !FONT_ROLES.has(entry.role)) {
      throw new Error(`Unknown font role: ${entry.role}`);
    }
  }

  return {
    version: 1,
    name: manifest.name,
    rightsNotice: manifest.rightsNotice,
    images: manifest.images ?? [],
    fonts: manifest.fonts ?? [],
  };
}

function indexFilesByPath(files: File[]): Map<string, File> {
  const filesByPath = new Map<string, File>();
  for (const file of files) {
    const fullPath = normalizePath(getFilePath(file));
    filesByPath.set(fullPath, file);
    filesByPath.set(getBaseName(fullPath), file);
    const pathAfterRoot = fullPath.split("/").slice(1).join("/");
    if (pathAfterRoot) {
      filesByPath.set(pathAfterRoot, file);
    }
  }
  return filesByPath;
}

function getFilePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

function getBaseName(path: string): string {
  return normalizePath(path).split("/").at(-1) ?? path;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
}

function loadImageFile(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name} as an image.`));
    };
    image.src = url;
  });
}

async function loadFontFile(family: string, file: File): Promise<FontFace> {
  const font = new FontFace(family, await file.arrayBuffer());
  await font.load();
  document.fonts.add(font);
  return font;
}

function quoteFontFamily(family: string): string {
  return `"${family.replace(/"/g, '\\"')}"`;
}
