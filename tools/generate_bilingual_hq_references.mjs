import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.join(
  REPO_ROOT,
  "public",
  "reference-pack",
  "v1",
  "references",
  "hq",
  "en",
);
const LOCAL_URL = process.env.KARDS_LOCAL_URL ?? "http://127.0.0.1:5173/";
const CHECK_ONLY = process.argv.includes("--check");
const EXPECTED_FILES = ["Danzig.png", "London.png", "Moscow.png", "Truk.png", "Washington.png"];

const isCommandLineEntry = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLineEntry) {
  await main();
}

async function main() {
  if (!CHECK_ONLY) {
    await mkdir(OUTPUT_ROOT, { recursive: true });
  }
  const browser = await chromium.launch({ headless: true });
  try {
  const page = await browser.newPage();
  const response = await page.goto(LOCAL_URL, { waitUntil: "networkidle", timeout: 30_000 });
  if (!response?.ok()) {
    throw new Error(`Local KARDS UI is not reachable: ${LOCAL_URL}`);
  }

  const rendered = await page.evaluate(async () => {
    const catalog = await import("/src/devPreviewCatalog.ts");
    const previewState = await import("/src/devPreviewState.ts");
    const renderer = await import("/src/canvas/cardRenderer.ts");
    const assetPackModule = await import("/src/assetPack.ts");

    await document.fonts.ready;
    const assetPack = await assetPackModule.loadAssetPackFromUrl(catalog.DEV_PREVIEW_ASSET_PACK_URL);
    const textureImage = await loadImage("/textures/ambientcg-paper001-960.png");
    const results = [];

    try {
      for (const sample of catalog.DEV_PREVIEW_HQ_SAMPLES) {
        const card = await previewState.resolveDevPreviewSampleCard(
          sample,
          async (url) => {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) throw new Error(`Card load failed: ${url}`);
            return response.json();
          },
          cropArtwork,
          "en",
        );
        const artworkImage = card.artwork.dataUrl ? await loadImage(card.artwork.dataUrl) : null;
        const canvas = document.createElement("canvas");
        const texture = card.appearance.texture;
        renderer.renderCard(canvas, card, artworkImage, {
          assets: assetPack,
          fonts: assetPack.fonts,
          language: "en",
          textureSeed: texture.seed,
          textureImage,
          textureIntensity: texture.intensity,
          textureRandomness: texture.randomness,
          textureMottle: texture.mottle,
        });
        results.push({
          file: sample.referenceUrl.split("/").at(-1),
          dataUrl: canvas.toDataURL("image/png"),
        });
      }
    } finally {
      assetPack.dispose();
    }

    return results;

    async function cropArtwork(crop) {
      const image = await loadImage(crop.sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = crop.sourceRect.width;
      canvas.height = crop.sourceRect.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas context unavailable.");
      context.drawImage(
        image,
        crop.sourceRect.x,
        crop.sourceRect.y,
        crop.sourceRect.width,
        crop.sourceRect.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      return canvas.toDataURL("image/png");
    }

    function loadImage(source) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Image load failed: ${source}`));
        image.src = source;
      });
    }
  });

    for (const item of rendered) {
      if (!item.file || !EXPECTED_FILES.includes(item.file) || !item.dataUrl.startsWith("data:image/png;base64,")) {
        throw new Error("Renderer returned an unexpected HQ reference payload.");
      }
      const renderedBytes = Buffer.from(item.dataUrl.split(",", 2)[1], "base64");
      const target = path.join(OUTPUT_ROOT, item.file);
      if (CHECK_ONLY) {
        const committedBytes = await readFile(target);
        assertMatchingRenderedReference(item.file, committedBytes, renderedBytes);
      } else {
        await writeFile(target, renderedBytes);
      }
    }
    if (rendered.length !== EXPECTED_FILES.length) {
      throw new Error(`Expected ${EXPECTED_FILES.length} HQ references, received ${rendered.length}.`);
    }
    console.log(
      `${CHECK_ONLY ? "Verified" : "Generated"} ${rendered.length} English HQ references against the current renderer.`,
    );
  } finally {
    await browser.close();
  }
}

export function assertMatchingRenderedReference(file, committedBytes, renderedBytes) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    !committedBytes.subarray(0, 8).equals(pngSignature)
    || !renderedBytes.subarray(0, 8).equals(pngSignature)
    || !committedBytes.equals(renderedBytes)
  ) {
    throw new Error(`Stale or mismatched English HQ reference: ${file}`);
  }
}
