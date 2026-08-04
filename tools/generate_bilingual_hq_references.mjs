import { spawn } from "node:child_process";
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
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 5186;
const LOCAL_URL = `http://${SERVER_HOST}:${SERVER_PORT}/`;
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
  const server = startOwnedHqServer(REPO_ROOT, SERVER_PORT);
  let browser;
  try {
    await waitForOwnedHqServer(server, LOCAL_URL);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const response = await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response?.ok()) {
      throw new Error(`Owned KARDS UI is not reachable: ${LOCAL_URL}`);
    }
    await page.waitForSelector('input[name="card-title"]', { state: "visible", timeout: 30_000 });

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
    try {
      await browser?.close();
    } finally {
      await stopOwnedHqServer(server);
    }
  }
}

export function createOwnedHqServerCommand(repoRoot, port) {
  return {
    command: process.execPath,
    args: [
      path.join(repoRoot, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      SERVER_HOST,
      "--port",
      String(port),
      "--strictPort",
    ],
    cwd: repoRoot,
  };
}

function startOwnedHqServer(repoRoot, port) {
  const command = createOwnedHqServerCommand(repoRoot, port);
  const output = [];
  const child = spawn(command.command, command.args, {
    cwd: command.cwd,
    env: { ...process.env, BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));
  child.once("error", (error) => output.push(`Vite spawn failed: ${error.message}\n`));
  return { child, output };
}

async function waitForOwnedHqServer(server, url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (hasChildExited(server.child)) {
      throw new Error(`Owned Vite server exited before startup.\n${server.output.join("")}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // Startup polling is expected to fail until Vite is ready.
    }
    await delay(250);
  }
  throw new Error(`Owned Vite server did not become ready at ${url}.\n${server.output.join("")}`);
}

async function stopOwnedHqServer(server) {
  if (hasChildExited(server.child)) return;
  if (!server.child.pid) {
    throw new Error("Owned Vite server has no PID; cannot verify shutdown.");
  }

  await stopProcessTree(server.child.pid);
  const didExit = await waitForChildExit(server.child, 5_000);
  if (!didExit) {
    throw new Error(`Owned Vite process tree did not stop (PID ${server.child.pid}).`);
  }
}

async function stopProcessTree(pid) {
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      killer.once("exit", resolve);
      killer.once("error", resolve);
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
  await delay(500);
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // The process already stopped after SIGTERM.
  }
}

function waitForChildExit(child, timeoutMs) {
  if (hasChildExited(child)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.removeListener("exit", handleExit);
      resolve(hasChildExited(child));
    }, timeoutMs);
    function handleExit() {
      clearTimeout(timeout);
      resolve(true);
    }
    child.once("exit", handleExit);
  });
}

function hasChildExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
