#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const CARD_WIDTH = 500;
const CARD_HEIGHT = 702;
const PASS_MAX_CHANNEL_DELTA = 1;
const PASS_CHANGED_PIXEL_RATIO = 0.001;

const DEFAULT_PACK = path.resolve(".runtime/kards-private-assets/stage3-official-coverage-pack");
const DEFAULT_OUTPUT = path.resolve(".runtime/kards-visual-smoke-calibration/latest");
const PIXEL_AUDIT_TOOL = path.resolve("tools/kards_artifact_pixel_audit.py");
const FORBIDDEN_OUTPUT_SEGMENTS = new Set(["public", "dist", "src"]);

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packRoot = path.resolve(options.pack || DEFAULT_PACK);
  const outputRoot = path.resolve(options.output || DEFAULT_OUTPUT);
  const port = Number(options.port || 5178);
  const host = "127.0.0.1";
  const appUrl = `http://${host}:${port}`;

  await assertPrivatePack(packRoot);
  await prepareOutput(outputRoot);

  const manifest = await readJson(path.join(packRoot, "kards-asset-pack.json"));
  const calibrationReport = await readJson(path.join(packRoot, "calibration-report.json"));
  const elements = await buildElementInputs(packRoot, manifest, calibrationReport);
  const devServer = await startDevServer({ host, port, outputRoot });

  try {
    const browserReport = await runBrowserSmoke({
      appUrl,
      manifest,
      elements,
      outputRoot,
    });
    const report = {
      generatedAt: new Date().toISOString(),
      appUrl,
      packRoot,
      outputRoot,
      sourceCalibrationReport: path.join(packRoot, "calibration-report.json"),
      thresholds: {
        passMaxChannelDelta: PASS_MAX_CHANNEL_DELTA,
        passChangedPixelRatio: PASS_CHANGED_PIXEL_RATIO,
      },
      probeMode: {
        name: "asset-slot-isolated",
        printWearDisabled: true,
        textDisabled: true,
      },
      scope: {
        validates: "asset slot geometry and per-element rendered crop identity",
        doesNotValidate: "full-card typography, print wear, or complete card visual equivalence",
      },
      summary: summarize(browserReport.elementResults),
      pixelAudit: browserReport.pixelAudit,
      appSmoke: browserReport.appSmoke,
      elementResults: browserReport.elementResults,
    };

    await writeJson(path.join(outputRoot, "visual-smoke-report.json"), report);
    await writeMarkdown(path.join(outputRoot, "visual-smoke-report.md"), report);
    console.log(JSON.stringify(report.summary, null, 2));

    if (!report.appSmoke.ok || report.summary.reviewCount > 0 || report.summary.failCount > 0) {
      process.exitCode = 2;
    }
  } finally {
    await stopDevServer(devServer);
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--pack") {
      options.pack = argv[++index];
    } else if (arg === "--output") {
      options.output = argv[++index];
    } else if (arg === "--port") {
      options.port = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node tools/kards_browser_visual_smoke.mjs [--pack PATH] [--output PATH] [--port 5178]

Runs a browser-backed visual smoke against a private KARDS asset pack.
Official-derived output should stay under .runtime and out of git.`);
}

async function assertPrivatePack(packRoot) {
  const markers = [
    path.join(packRoot, ".kards-private-calibration-output"),
    path.join(packRoot, ".kards-stage6-multisource-output"),
  ];
  const manifest = path.join(packRoot, "kards-asset-pack.json");
  const report = path.join(packRoot, "calibration-report.json");
  if (!markers.some((marker) => existsSync(marker))) {
    throw new Error(`Missing private pack marker: ${markers.join(" or ")}`);
  }
  for (const requiredPath of [manifest, report]) {
    if (!existsSync(requiredPath)) {
      throw new Error(`Missing private pack file: ${requiredPath}`);
    }
  }
}

async function prepareOutput(outputRoot) {
  const resolved = path.resolve(outputRoot);
  const lowerParts = resolved.toLowerCase().split(path.sep);
  const forbiddenPart = lowerParts.find((part) => FORBIDDEN_OUTPUT_SEGMENTS.has(part));
  if (forbiddenPart) {
    throw new Error(`Refusing to write visual smoke artifacts under ${forbiddenPart}: ${resolved}`);
  }
  if (!lowerParts.includes(".runtime")) {
    throw new Error(`Refusing to write visual smoke artifacts outside .runtime: ${resolved}`);
  }
  const markerPath = path.join(outputRoot, ".kards-visual-smoke-output");
  if (existsSync(outputRoot) && !existsSync(markerPath)) {
    const existingEntries = await fs.readdir(outputRoot);
    if (existingEntries.length > 0) {
      throw new Error(
        `Refusing to clean non-owned visual smoke output folder without .kards-visual-smoke-output: ${resolved}`,
      );
    }
  }
  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(
    markerPath,
    "Generated by tools/kards_browser_visual_smoke.mjs. Official-derived artifacts are private only.\n",
    "utf8",
  );
}

async function buildElementInputs(packRoot, manifest, calibrationReport) {
  const samples = calibrationReport.samples || [];
  if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
    throw new Error("Asset pack manifest does not contain images.");
  }

  return Promise.all(
    manifest.images.map(async (entry, index) => {
      const sample = findSampleForEntry(samples, entry);
      const sampleCardPath = path.join(packRoot, "samples", `${sample.id}.card.json`);
      const referencePath = resolvePackFile(packRoot, entry.file);
      if (!existsSync(referencePath)) {
        throw new Error(`Missing reference element image: ${referencePath}`);
      }
      if (!existsSync(sampleCardPath)) {
        throw new Error(`Missing sample card JSON: ${sampleCardPath}`);
      }

      return {
        id: `${String(index + 1).padStart(2, "0")}-${entry.slot}-${elementValue(entry)}`,
        entry,
        sample,
        sampleCard: await readJson(sampleCardPath),
        assetDataUrl: await fileToDataUrl(referencePath),
        referenceDataUrl: await fileToDataUrl(referencePath),
        sourceReferencePath: referencePath,
      };
    }),
  );
}

function resolvePackFile(packRoot, manifestPath) {
  if (typeof manifestPath !== "string" || manifestPath.length === 0) {
    throw new Error("Asset manifest contains an empty file path.");
  }
  if (path.isAbsolute(manifestPath)) {
    throw new Error(`Asset manifest path must be relative: ${manifestPath}`);
  }
  const normalizedParts = manifestPath.replace(/\\/g, "/").split("/");
  if (normalizedParts.some((part) => part === ".." || part === "")) {
    throw new Error(`Asset manifest path must stay inside the private pack: ${manifestPath}`);
  }
  const resolved = path.resolve(packRoot, manifestPath);
  const relative = path.relative(packRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Asset manifest path escapes the private pack: ${manifestPath}`);
  }
  return resolved;
}

function findSampleForEntry(samples, entry) {
  const sample = samples.find((candidate) => {
    return (
      matchesFilter(entry.nationId, candidate.nationId) &&
      matchesFilter(entry.kind, candidate.kind) &&
      matchesFilter(entry.rarityId, candidate.rarityId) &&
      matchesFilter(entry.setId, candidate.setId)
    );
  });
  if (!sample) {
    throw new Error(`Could not find calibration sample for ${entry.slot}:${elementValue(entry)}`);
  }
  return sample;
}

function matchesFilter(filterValue, sampleValue) {
  return filterValue === undefined || filterValue === sampleValue;
}

function elementValue(entry) {
  return entry.nationId || entry.kind || entry.rarityId || entry.setId || "generic";
}

async function startDevServer({ host, port, outputRoot }) {
  await assertPortAvailable(host, port);
  const logPath = path.join(outputRoot, "vite-dev-server.log");
  const logFile = await fs.open(logPath, "w");
  const child = spawn("npm", ["run", "dev", "--", "--host", host, "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    logFile.write(chunk).catch(() => {});
  });
  child.stderr.on("data", (chunk) => {
    logFile.write(chunk).catch(() => {});
  });

  try {
    await waitForHttp(`http://${host}:${port}/`, 30000);
    return { child, logFile, logPath };
  } catch (error) {
    await stopDevServer({ child, logFile, logPath });
    throw error;
  }
}

function assertPortAvailable(host, port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.once("listening", () => {
      server.close(() => resolve());
    });
    server.listen(port, host);
  });
}

function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(url)
        .then((response) => {
          if (response.ok) {
            resolve();
          } else {
            retry();
          }
        })
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
      } else {
        setTimeout(tick, 250);
      }
    };
    tick();
  });
}

async function stopDevServer(devServer) {
  if (!devServer) {
    return;
  }
  const { child, logFile } = devServer;
  if (child?.pid) {
    await stopProcessTree(child.pid);
  }
  if (logFile) {
    await logFile.close().catch(() => {});
  }
}

function stopProcessTree(pid) {
  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      killer.once("exit", () => resolve());
      killer.once("error", () => resolve());
    });
  }

  return new Promise((resolve) => {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      resolve();
      return;
    }
    setTimeout(() => {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already stopped.
      }
      resolve();
    }, 500);
  });
}

async function runBrowserSmoke({ appUrl, manifest, elements, outputRoot }) {
  const { chromium } = await import("playwright");
  const browser = await launchBrowser(chromium);
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });

  try {
    await page.goto(`${appUrl}/?visual-smoke=stage4`, { waitUntil: "networkidle" });
    const appSmoke = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) {
        return { ok: false, reason: "missing canvas" };
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return { ok: false, reason: "missing 2d context", width: canvas.width, height: canvas.height };
      }
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonTransparentPixels = 0;
      let nonWhitePixels = 0;
      for (let index = 0; index < imageData.length; index += 4) {
        const alpha = imageData[index + 3];
        if (alpha !== 0) {
          nonTransparentPixels += 1;
        }
        if (imageData[index] !== 255 || imageData[index + 1] !== 255 || imageData[index + 2] !== 255) {
          nonWhitePixels += 1;
        }
      }
      return {
        ok: canvas.width === 500 && canvas.height === 702 && nonTransparentPixels > 0 && nonWhitePixels > 0,
        width: canvas.width,
        height: canvas.height,
        nonTransparentPixels,
        nonWhitePixels,
      };
    });
    await page.screenshot({ path: path.join(outputRoot, "app-smoke.png"), fullPage: true });

    const elementResults = await page.evaluate(
      async ({ manifest, elements, thresholds }) => {
        const { renderCard } = await import("/src/canvas/cardRenderer.ts");
        const { createStaticAssetResolver } = await import("/src/canvas/renderAssets.ts");
        const { getCardFaceLayout } = await import("/src/canvas/layout.ts");

        const imageEntries = await Promise.all(
          manifest.images.map(async (entry, index) => ({
            ...entry,
            image: await loadImage(elements[index].assetDataUrl),
          })),
        );
        const assets = createStaticAssetResolver(imageEntries, manifest.name);
        const results = [];

        for (const item of elements) {
          const card = {
            ...item.sampleCard,
            body: "",
            keywordLine: "",
          };
          const artworkImage = await loadImage(card.artwork.dataUrl);
          const referenceImage = await loadImage(item.referenceDataUrl);
          const canvas = document.createElement("canvas");
          canvas.width = 500;
          canvas.height = 702;
          renderCard(canvas, card, artworkImage, { assets, disablePrintWear: true });

          const rect = resolveSlotRect(getCardFaceLayout, card.kind, item.entry.slot, card.rarity);
          const actualCrop = cropCanvas(canvas, rect);
          const referenceCrop = imageToCanvas(referenceImage, rect.width, rect.height);
          const diff = diffCanvases(actualCrop, referenceCrop, thresholds);
          results.push({
            id: item.id,
            slot: item.entry.slot,
            value: item.entry.nationId || item.entry.kind || item.entry.rarityId || item.entry.setId || "generic",
            sampleCardId: item.sample.id,
            sampleTitle: item.sample.title,
            sampleKind: card.kind,
            slotRect: rect,
            referenceSize: { width: referenceImage.naturalWidth, height: referenceImage.naturalHeight },
            metrics: diff.metrics,
            status: diff.status,
            renderedCropDataUrl: actualCrop.toDataURL("image/png"),
            diffDataUrl: diff.canvas.toDataURL("image/png"),
          });
        }

        return results;

        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 80)}`));
            image.src = src;
          });
        }

        function resolveSlotRect(getLayout, kind, slot, rarityId) {
          const layout = getLayout(kind);
          if (slot === "nation-mark") {
            const size = layout.nationSize;
            return {
              x: Math.round(layout.nationCenter.x - size / 2),
              y: Math.round(layout.nationCenter.y - size / 2),
              width: size,
              height: size,
            };
          }
          if (slot === "type-icon" && layout.typeIcon) {
            return copyRect(layout.typeIcon);
          }
          if (slot === "set-mark" && layout.setAnchor) {
            return { x: layout.setAnchor.x - 28, y: layout.setAnchor.y - 26, width: 28, height: 28 };
          }
          if (slot === "rarity-pip" && layout.rarity) {
            return copyRect(layout.rarity);
          }
          throw new Error(`Unsupported slot for smoke: ${slot}`);
        }

        function copyRect(rect) {
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }

        function cropCanvas(sourceCanvas, rect) {
          const target = document.createElement("canvas");
          target.width = rect.width;
          target.height = rect.height;
          target.getContext("2d").drawImage(
            sourceCanvas,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            0,
            0,
            rect.width,
            rect.height,
          );
          return target;
        }

        function imageToCanvas(image, width, height) {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(image, 0, 0, width, height);
          return canvas;
        }

        function diffCanvases(actual, reference, thresholds) {
          const actualData = actual.getContext("2d").getImageData(0, 0, actual.width, actual.height);
          const referenceData = reference.getContext("2d").getImageData(0, 0, reference.width, reference.height);
          const diffCanvas = document.createElement("canvas");
          diffCanvas.width = actual.width;
          diffCanvas.height = actual.height;
          const diffContext = diffCanvas.getContext("2d");
          const diffData = diffContext.createImageData(actual.width, actual.height);

          let changedPixels = 0;
          let absoluteDeltaSum = 0;
          let squaredDeltaSum = 0;
          let maxChannelDelta = 0;
          const comparedPixels = actual.width * actual.height;

          for (let index = 0; index < actualData.data.length; index += 4) {
            let pixelMax = 0;
            for (let channel = 0; channel < 4; channel += 1) {
              const delta = Math.abs(actualData.data[index + channel] - referenceData.data[index + channel]);
              absoluteDeltaSum += delta;
              squaredDeltaSum += delta * delta;
              maxChannelDelta = Math.max(maxChannelDelta, delta);
              pixelMax = Math.max(pixelMax, delta);
            }
            if (pixelMax > 0) {
              changedPixels += 1;
            }
            diffData.data[index] = 255;
            diffData.data[index + 1] = 0;
            diffData.data[index + 2] = 0;
            diffData.data[index + 3] = pixelMax === 0 ? 0 : Math.max(96, pixelMax);
          }
          diffContext.putImageData(diffData, 0, 0);

          const channelCount = comparedPixels * 4;
          const metrics = {
            comparedPixels,
            changedPixels,
            changedPixelRatio: round(changedPixels / comparedPixels),
            meanAbsoluteError: round(absoluteDeltaSum / channelCount),
            rootMeanSquaredError: round(Math.sqrt(squaredDeltaSum / channelCount)),
            maxChannelDelta,
          };
          const status =
            metrics.maxChannelDelta <= thresholds.maxChannelDelta &&
            metrics.changedPixelRatio <= thresholds.changedPixelRatio
              ? "pass"
              : "review";
          return { canvas: diffCanvas, metrics, status };
        }

        function round(value) {
          return Math.round(value * 1_000_000) / 1_000_000;
        }
      },
      {
        manifest,
        elements,
        thresholds: {
          maxChannelDelta: PASS_MAX_CHANNEL_DELTA,
          changedPixelRatio: PASS_CHANGED_PIXEL_RATIO,
        },
      },
    );

    const artifacts = await writeElementArtifacts({ outputRoot, elements, elementResults });
    const pixelAudit = await runArtifactPixelAudit({
      outputRoot,
      thresholds: {
        maxChannelDelta: PASS_MAX_CHANNEL_DELTA,
        changedPixelRatio: PASS_CHANGED_PIXEL_RATIO,
      },
      artifacts,
    });
    mergePixelAuditResults(elementResults, pixelAudit.results);
    return { appSmoke, elementResults, pixelAudit: pixelAudit.summary };
  } finally {
    await browser.close();
  }
}

async function launchBrowser(chromium) {
  const attempts = [{ headless: true }, { headless: true, channel: "msedge" }, { headless: true, channel: "chrome" }];
  let lastError;
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function writeElementArtifacts({ outputRoot, elements, elementResults }) {
  const artifacts = [];
  for (const result of elementResults) {
    const element = elements.find((candidate) => candidate.id === result.id);
    if (!element) {
      throw new Error(`Missing source element for visual smoke result: ${result.id}`);
    }
    const safeName = safeFileName(`${result.id}-${result.value}`);
    const slot = safeFileName(result.slot);
    const renderedPath = path.join(outputRoot, "rendered", slot, `${safeName}.png`);
    const diffPath = path.join(outputRoot, "diff", slot, `${safeName}.png`);
    const extractedPath = path.join(outputRoot, "extracted", slot, `${safeName}.png`);
    await writeDataUrl(renderedPath, result.renderedCropDataUrl);
    await writeDataUrl(diffPath, result.diffDataUrl);
    await fs.mkdir(path.dirname(extractedPath), { recursive: true });
    await fs.copyFile(element.sourceReferencePath, extractedPath);
    artifacts.push({
      id: result.id,
      slot: result.slot,
      value: result.value,
      renderedPath,
      extractedPath,
      diffPath,
      sourceReferencePath: element.sourceReferencePath,
    });
    delete result.renderedCropDataUrl;
    delete result.diffDataUrl;
  }
  return artifacts;
}

async function runArtifactPixelAudit({ outputRoot, thresholds, artifacts }) {
  const inputPath = path.join(outputRoot, "pixel-audit-input.json");
  await writeJson(inputPath, {
    outputRoot,
    thresholds,
    artifacts,
  });

  const attempts =
    process.platform === "win32"
      ? [
          { command: "py", args: ["-3", PIXEL_AUDIT_TOOL, "--input", inputPath] },
          { command: "python", args: [PIXEL_AUDIT_TOOL, "--input", inputPath] },
        ]
      : [
          { command: "python3", args: [PIXEL_AUDIT_TOOL, "--input", inputPath] },
          { command: "python", args: [PIXEL_AUDIT_TOOL, "--input", inputPath] },
        ];

  let lastError;
  for (const attempt of attempts) {
    try {
      const stdout = await runCommand(attempt.command, attempt.args);
      return JSON.parse(stdout);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

function mergePixelAuditResults(elementResults, auditResults) {
  const auditById = new Map(auditResults.map((result) => [result.id, result]));
  for (const result of elementResults) {
    const audit = auditById.get(result.id);
    if (!audit) {
      result.status = "fail";
      result.pixelAudit = { error: "missing audit result" };
      continue;
    }
    result.browserCanvasMetrics = result.metrics;
    result.browserCanvasStatus = result.status;
    result.metrics = audit.metrics;
    result.status = audit.status;
    result.pixelAudit = {
      renderedPath: audit.renderedPath,
      extractedPath: audit.extractedPath,
      diffPath: audit.diffPath,
      sourceReferencePath: audit.sourceReferencePath,
      note: audit.note,
    };
  }
}

function summarize(elementResults) {
  const bySlot = {};
  let passCount = 0;
  let reviewCount = 0;
  let failCount = 0;
  for (const result of elementResults) {
    bySlot[result.slot] = (bySlot[result.slot] || 0) + 1;
    if (result.status === "pass") {
      passCount += 1;
    } else if (result.status === "review") {
      reviewCount += 1;
    } else {
      failCount += 1;
    }
  }
  return {
    totalElements: elementResults.length,
    passCount,
    reviewCount,
    failCount,
    bySlot,
  };
}

async function writeMarkdown(filePath, report) {
  const lines = [
    "# KARDS Visual Smoke Calibration",
    "",
    `- Generated: \`${report.generatedAt}\``,
    `- Pack: \`${report.packRoot}\``,
    `- App URL: \`${report.appUrl}\``,
    `- Probe mode: \`${report.probeMode?.name || "unknown"}\``,
    `- Elements: \`${report.summary.totalElements}\``,
    `- Pass: \`${report.summary.passCount}\``,
    `- Review: \`${report.summary.reviewCount}\``,
    `- Fail: \`${report.summary.failCount}\``,
    `- App smoke: \`${report.appSmoke.ok ? "pass" : "fail"}\``,
    `- App canvas: \`${report.appSmoke.width || 0}x${report.appSmoke.height || 0}\``,
    `- Pixel audit: \`${report.pixelAudit?.passCount || 0} pass / ${report.pixelAudit?.reviewCount || 0} review / ${report.pixelAudit?.failCount || 0} fail\``,
    `- Scope: validates ${report.scope?.validates || "unknown"}; does not validate ${report.scope?.doesNotValidate || "unknown"}`,
    "",
    "## Slot Counts",
    "",
  ];
  for (const [slot, count] of Object.entries(report.summary.bySlot)) {
    lines.push(`- ${slot}: ${count}`);
  }
  lines.push("", "## Element Results", "");
  for (const item of report.elementResults) {
    const browserNote =
      item.browserCanvasStatus && item.browserCanvasStatus !== item.status
        ? ` browserReadback=\`${item.browserCanvasStatus},maxDelta:${item.browserCanvasMetrics.maxChannelDelta},ratio:${item.browserCanvasMetrics.changedPixelRatio}\``
        : "";
    lines.push(
      `- ${item.status.toUpperCase()} \`${item.slot}:${item.value}\` sample=\`${item.sampleCardId}\` rect=` +
        `\`${item.slotRect.x},${item.slotRect.y},${item.slotRect.width},${item.slotRect.height}\` ` +
        `maxDelta=\`${item.metrics.maxChannelDelta}\` changedRatio=\`${item.metrics.changedPixelRatio}\`${browserNote}`,
    );
  }
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fileToDataUrl(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  const data = await fs.readFile(filePath);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

async function writeDataUrl(filePath, dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error(`Invalid data URL for ${filePath}`);
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(dataUrl.slice(commaIndex + 1), "base64"));
}

function safeFileName(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
