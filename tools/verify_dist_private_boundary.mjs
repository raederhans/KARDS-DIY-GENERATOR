import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const REFERENCE_PACK_DIR = path.join(DIST_DIR, "reference-pack", "v1");
const CATALOG_SOURCE = path.resolve("src", "devPreviewCatalog.ts");
const FORBIDDEN_MARKERS = [
  ".runtime",
  "kards-private-assets",
  "private local validation only",
  "must not be committed, bundled, or redistributed",
  "source-snapshots",
  "calibration-report",
  "stage5",
  "stage6",
  "stage6-source-inventory",
  "stage6-private-assets-manifest",
  "\\users\\raede\\",
  "/users/raede/",
  "steamapps",
];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt"]);
const IMAGE_EXTENSIONS = new Set([".avif", ".jpg", ".jpeg", ".png", ".webp"]);
const SENSITIVE_PATTERNS = [
  { label: "Windows user path", pattern: /[a-z]:[\\/]+users[\\/]+[^\\/]+[\\/]+/i },
  { label: "Unix user path", pattern: /\/users\/[^/]+\//i },
  { label: "Unix home path", pattern: /\/home\/[^/]+\//i },
  { label: "sourcePath field", pattern: /["']sourcePath["']\s*:/i },
  { label: "credential field", pattern: /["'](?:apiKey|password|secret|token)["']\s*:/i },
  { label: "credential assignment", pattern: /(?:API_KEY|GITHUB_TOKEN|VERCEL_TOKEN)\s*=/i },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { label: "secret key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
];

const lowerCaseMarkers = FORBIDDEN_MARKERS.map((marker) => marker.toLowerCase());
const findings = [];

export async function verifyDistBoundary() {
  findings.length = 0;
  await scanPath(DIST_DIR);
  await verifyPublicReferencePack();
  if (findings.length > 0) {
    throw new Error([
      "Private or intermediate asset markers were found in dist:",
      ...findings.map((finding) => `- ${finding}`),
    ].join("\n"));
  }
}

const isCommandLineEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLineEntry) {
  try {
    await verifyDistBoundary();
    console.log("dist private boundary and authorized reference pack verified.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function scanPath(targetPath) {
  const targetStat = await stat(targetPath);
  if (targetStat.isDirectory()) {
    const entries = await readdir(targetPath);
    await Promise.all(entries.map((entry) => scanPath(path.join(targetPath, entry))));
    return;
  }

  const relativePath = path.relative(DIST_DIR, targetPath).replace(/\\/g, "/");
  const pathMatch = findMarker(relativePath);
  if (pathMatch) {
    findings.push(`${relativePath} path contains ${pathMatch}`);
  }

  if (TEXT_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    const content = await readFile(targetPath, "utf8");
    const contentMatch = findMarker(content);
    if (contentMatch) {
      findings.push(`${relativePath} content contains ${contentMatch}`);
    }
    addSensitiveFindings(relativePath, content);
  } else if (IMAGE_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    addSensitiveFindings(relativePath, (await readFile(targetPath)).toString("latin1"));
  }
}

async function verifyPublicReferencePack() {
  const manifestPath = path.join(REFERENCE_PACK_DIR, "kards-asset-pack.json");
  const noticePath = path.join(REFERENCE_PACK_DIR, "RIGHTS-NOTICE.txt");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const rightsNotice = await readFile(noticePath, "utf8");
  const catalogSource = await readFile(CATALOG_SOURCE, "utf8");
  const sampleIds = [...catalogSource.matchAll(/cardSample\("([^"]+)"/g)].map((match) => match[1]);
  const hqFiles = catalogSource
    .split(/\r?\n/)
    .filter((line) => /^\s{2}hqSample\("/.test(line))
    .map((line) => [...line.matchAll(/"([^"]+)"/g)][4]?.[1]);

  if (manifest.version !== 1) {
    throw new Error("The bundled authorized pack must use manifest version 1.");
  }
  if (manifest.requiresPrivateExportConfirm !== false) {
    throw new Error("The bundled authorized pack must disable private export confirmation explicitly.");
  }
  if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
    throw new Error("The bundled authorized pack must list its images.");
  }
  if (manifest.fonts !== undefined && (!Array.isArray(manifest.fonts) || manifest.fonts.length > 0)) {
    throw new Error("The bundled authorized pack must not contain undeclared font files.");
  }
  if (!/rights holders/i.test(rightsNotice) || !/no ownership or redistribution rights/i.test(rightsNotice)) {
    throw new Error("The public rights notice must state retained ownership and use limits.");
  }
  if (sampleIds.length === 0 || new Set(sampleIds).size !== sampleIds.length) {
    throw new Error("The reference catalog must contain a unique card sample list.");
  }
  if (hqFiles.length === 0 || hqFiles.some((file) => !file) || new Set(hqFiles).size !== hqFiles.length) {
    throw new Error("The reference catalog must contain a unique HQ reference list.");
  }

  await assertDirectoryShape(
    REFERENCE_PACK_DIR,
    ["RIGHTS-NOTICE.txt", "kards-asset-pack.json"],
    ["images", "references", "samples"],
  );
  await assertDirectoryShape(
    path.join(REFERENCE_PACK_DIR, "references"),
    [],
    ["cards", "hq"],
  );

  const manifestFiles = new Set();
  for (const entry of manifest.images) {
    if (
      !entry.file ||
      path.isAbsolute(entry.file) ||
      entry.file.split(/[\\/]+/).includes("..") ||
      !entry.file.startsWith("images/") ||
      path.extname(entry.file).toLowerCase() !== ".png"
    ) {
      throw new Error(`Unsafe public manifest path: ${entry.file ?? "<missing>"}`);
    }
    if (manifestFiles.has(entry.file)) {
      throw new Error(`Duplicate public manifest path: ${entry.file}`);
    }
    manifestFiles.add(entry.file);
    const imagePath = path.join(REFERENCE_PACK_DIR, entry.file);
    const imageStat = await stat(imagePath);
    if (!imageStat.isFile() || !(await hasPngSignature(imagePath))) {
      throw new Error(`Invalid public manifest image: ${entry.file}`);
    }
  }

  await assertExactFiles(
    path.join(REFERENCE_PACK_DIR, "images"),
    [...manifestFiles].map((file) => file.slice("images/".length)),
    "manifest images",
    true,
  );
  await assertDirectoryShape(
    path.join(REFERENCE_PACK_DIR, "samples"),
    sampleIds.map((id) => `${id}.card.json`),
    ["zh"],
  );
  await assertExactFiles(
    path.join(REFERENCE_PACK_DIR, "samples", "zh"),
    sampleIds.map((id) => `${id}.card.json`),
    "Chinese sample cards",
  );
  await assertDirectoryShape(
    path.join(REFERENCE_PACK_DIR, "references", "cards"),
    sampleIds.map((id) => `${id}.png`),
    ["zh"],
  );
  await assertExactFiles(
    path.join(REFERENCE_PACK_DIR, "references", "cards", "zh"),
    sampleIds.map((id) => `${id}.avif`),
    "Chinese card references",
  );
  await assertDirectoryShape(
    path.join(REFERENCE_PACK_DIR, "references", "hq"),
    hqFiles,
    ["en"],
  );
  await assertExactFiles(
    path.join(REFERENCE_PACK_DIR, "references", "hq", "en"),
    hqFiles,
    "English HQ references",
  );

  for (const sampleId of sampleIds) {
    const sample = JSON.parse(
      await readFile(path.join(REFERENCE_PACK_DIR, "samples", `${sampleId}.card.json`), "utf8"),
    );
    if (sample.version !== 1 || !sample.artwork?.dataUrl?.startsWith("data:image/png;base64,")) {
      throw new Error(`Invalid bundled sample card: ${sampleId}`);
    }
    const chineseSample = JSON.parse(
      await readFile(path.join(REFERENCE_PACK_DIR, "samples", "zh", `${sampleId}.card.json`), "utf8"),
    );
    if (
      typeof chineseSample.title !== "string"
      || !chineseSample.title
      || typeof chineseSample.body !== "string"
      || chineseSample.keywordLanguage !== "zh"
    ) {
      throw new Error(`Invalid Chinese bundled sample card: ${sampleId}`);
    }
    if (!(await hasAvifSignature(path.join(
      REFERENCE_PACK_DIR,
      "references",
      "cards",
      "zh",
      `${sampleId}.avif`,
    )))) {
      throw new Error(`Invalid Chinese bundled reference image: ${sampleId}`);
    }
  }

  for (const hqFile of hqFiles) {
    if (!(await hasPngSignature(path.join(REFERENCE_PACK_DIR, "references", "hq", "en", hqFile)))) {
      throw new Error(`Invalid English HQ reference image: ${hqFile}`);
    }
  }
}

async function assertExactFiles(directory, expectedFiles, label, recursive = false) {
  const actualFiles = recursive
    ? await listRelativeFiles(directory)
    : (await readdir(directory, { withFileTypes: true })).map((entry) => {
        if (!entry.isFile()) {
          throw new Error(`Unexpected directory in ${label}: ${entry.name}`);
        }
        return entry.name;
      });
  const expected = [...expectedFiles].sort();
  const actual = actualFiles.sort();
  assertExactFileNames(actual, expected, label);
}

export function assertExactFileNames(actualFiles, expectedFiles, label) {
  const actual = [...actualFiles].sort();
  const expected = [...expectedFiles].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} do not match the reference catalog.`);
  }
}

async function assertDirectoryShape(directory, expectedFiles, expectedDirectories) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const unsupported = entries.filter((entry) => !entry.isFile() && !entry.isDirectory());
  if (
    unsupported.length > 0 ||
    JSON.stringify(files) !== JSON.stringify([...expectedFiles].sort()) ||
    JSON.stringify(directories) !== JSON.stringify([...expectedDirectories].sort())
  ) {
    throw new Error(`Unexpected public pack structure under ${path.relative(DIST_DIR, directory)}.`);
  }
}

async function listRelativeFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRelativeFiles(entryPath, root));
    } else if (entry.isFile()) {
      files.push(path.relative(root, entryPath).replace(/\\/g, "/"));
    } else {
      throw new Error(`Unsupported link or device in the public pack: ${entryPath}`);
    }
  }
  return files;
}

async function hasPngSignature(filePath) {
  const content = await readFile(filePath);
  return content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

async function hasAvifSignature(filePath) {
  const content = await readFile(filePath);
  return content.length >= 16
    && content.toString("ascii", 4, 8) === "ftyp"
    && /avi[fs]/.test(content.subarray(8, Math.min(content.length, 32)).toString("ascii"));
}

function addSensitiveFindings(relativePath, content) {
  for (const { label, pattern } of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      findings.push(`${relativePath} content contains ${label}`);
    }
  }
}

export function findMarker(value) {
  const normalizedValue = value.toLowerCase();
  const markerIndex = lowerCaseMarkers.findIndex((marker) => normalizedValue.includes(marker));
  return markerIndex >= 0 ? FORBIDDEN_MARKERS[markerIndex] : null;
}
