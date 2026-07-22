import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1";
const defaultPort = 5173;
const startupTimeoutMs = 30_000;
const assetManifestPath = "/reference-pack/v1/kards-asset-pack.json";
const args = parseArgs(process.argv.slice(2));
const baseUrl = `http://${host}:${args.port}`;
const uiUrl = `${baseUrl}/`;
const assetManifestUrl = `${baseUrl}${assetManifestPath}`;
const logName = args.port === defaultPort ? "local-ui.log" : `local-ui-${args.port}.log`;
const logPath = resolve(projectRoot, ".runtime", logName);
const viteCliPath = resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");

const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 12)) {
  fail(`Node.js 22.12 or newer is required; found ${process.versions.node}.`);
}

if (!existsSync(viteCliPath)) {
  fail("Dependencies are missing. Run npm ci, then try again.");
}

mkdirSync(dirname(logPath), { recursive: true });
const log = createWriteStream(logPath, { flags: "w" });
log.write(`[KARDS] ${new Date().toISOString()} local UI startup\n`);

const vite = spawn(
  process.execPath,
  [viteCliPath, "--host", host, "--port", String(args.port), "--strictPort"],
  {
    cwd: projectRoot,
    env: { ...process.env, BROWSER: "none" },
    stdio: ["inherit", "pipe", "pipe"],
  },
);

pipeOutput(vite.stdout, process.stdout, log);
pipeOutput(vite.stderr, process.stderr, log);

let stopping = false;
let startupComplete = false;

vite.once("error", (error) => {
  fail(`Could not start the local server: ${error.message}`);
});

vite.once("exit", (code, signal) => {
  log.end(`[KARDS] Vite stopped (code=${code ?? "none"}, signal=${signal ?? "none"}).\n`);
  if (!stopping && !startupComplete) {
    process.stderr.write("[KARDS] The local server stopped before it became ready.\n");
  }
  process.exitCode = stopping && startupComplete ? 0 : code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

try {
  const manifest = await waitForLocalServices();
  startupComplete = true;
  const imageCount = Array.isArray(manifest.images) ? manifest.images.length : 0;
  const fontCount = Array.isArray(manifest.fonts) ? manifest.fonts.length : 0;
  const stopHint = process.platform === "win32"
    ? "Press Ctrl+C and confirm Y if Command Prompt asks to stop."
    : "Press Ctrl+C to stop the server.";

  report([
    "",
    "[KARDS] Local UI is ready.",
    `[KARDS] UI:            ${uiUrl}`,
    `[KARDS] Asset library: ${assetManifestUrl}`,
    `[KARDS] Assets:        ${imageCount} images, ${fontCount} fonts`,
    `[KARDS] Log:           ${logPath}`,
    `[KARDS] ${stopHint}`,
    "",
  ].join("\n"));

  if (args.openBrowser) {
    openBrowser(uiUrl);
  }
} catch (error) {
  process.stderr.write(`[KARDS] ${error instanceof Error ? error.message : String(error)}\n`);
  stop("SIGTERM");
}

async function waitForLocalServices() {
  const deadline = Date.now() + startupTimeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (vite.exitCode !== null) {
      throw new Error("The local server exited during startup. See the log for details.");
    }

    try {
      const uiResponse = await fetch(uiUrl, { signal: AbortSignal.timeout(2_000) });
      if (!uiResponse.ok) {
        throw new Error(`UI returned HTTP ${uiResponse.status}.`);
      }

      const uiHtml = await uiResponse.text();
      const entryModuleUrl = readEntryModuleUrl(uiHtml);
      const entryResponse = await fetch(entryModuleUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      });
      if (!entryResponse.ok) {
        throw new Error(`UI entry module returned HTTP ${entryResponse.status}.`);
      }
      const entryModule = await entryResponse.text();
      if (!entryModule.trim()) {
        throw new Error("UI entry module is empty.");
      }

      const manifestResponse = await fetch(assetManifestUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(2_000),
      });
      if (!manifestResponse.ok) {
        throw new Error(`Asset library returned HTTP ${manifestResponse.status}.`);
      }

      const manifest = await manifestResponse.json();
      if (manifest?.version !== 1 || !Array.isArray(manifest.images)) {
        throw new Error("Asset library manifest is invalid.");
      }
      return manifest;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  const detail = lastError instanceof Error ? ` Last check: ${lastError.message}` : "";
  throw new Error(`Local UI was not ready within ${startupTimeoutMs / 1_000} seconds.${detail}`);
}

function readEntryModuleUrl(html) {
  const match = html.match(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*\btype=["']module["'][^>]*>/i);
  if (!match) {
    throw new Error("UI HTML does not declare an entry module.");
  }
  return new URL(match[1], uiUrl);
}

function parseArgs(argv) {
  let openBrowser = true;
  let port = defaultPort;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--no-open") {
      openBrowser = false;
      continue;
    }
    if (arg === "--port") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 1 || value > 65_535) {
        fail("--port must be an integer between 1 and 65535.");
      }
      port = value;
      index += 1;
      continue;
    }
    fail(`Unknown option: ${arg}`);
  }

  return { openBrowser, port };
}

function pipeOutput(source, target, destination) {
  source.on("data", (chunk) => {
    target.write(chunk);
    destination.write(chunk);
  });
}

function report(message) {
  process.stdout.write(message);
  log.write(message);
}

function openBrowser(url) {
  const commands = {
    win32: ["cmd.exe", ["/d", "/s", "/c", "start", "", url]],
    darwin: ["open", [url]],
    linux: ["xdg-open", [url]],
  };
  const [command, commandArgs] = commands[process.platform] ?? commands.linux;
  const browser = spawn(command, commandArgs, { detached: true, stdio: "ignore" });
  browser.once("error", () => {
    report(`[KARDS] Could not open the browser automatically. Open ${uiUrl} manually.\n`);
  });
  browser.unref();
}

function stop(signal) {
  if (stopping) {
    return;
  }
  stopping = true;
  if (vite.exitCode === null) {
    vite.kill(signal);
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function fail(message) {
  process.stderr.write(`[KARDS] ${message}\n`);
  process.exit(1);
}
