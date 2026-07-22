import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH = path.join(
  REPO_ROOT,
  ".runtime",
  "kards-private-assets",
  "sources",
  "craftsoul-data.json",
);
const SAMPLE_ROOT = path.join(REPO_ROOT, "public", "reference-pack", "v1", "samples");
const ZH_SAMPLE_ROOT = path.join(SAMPLE_ROOT, "zh");
const ZH_REFERENCE_ROOT = path.join(
  REPO_ROOT,
  "public",
  "reference-pack",
  "v1",
  "references",
  "cards",
  "zh",
);
const REFERENCE_MANIFEST_PATH = path.join(
  REPO_ROOT,
  "tools",
  "bilingual_sample_reference_hashes.json",
);
const OFFICIAL_ZH_CARD_ROOT = "https://www.kards.com/images/card/v52/zh-Hans";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const TITLE_MAX_LENGTH = 48;
const BODY_MAX_LENGTH = 180;
const CHECK_ONLY = process.argv.includes("--check");
const execFileAsync = promisify(execFile);

const isCommandLineEntry = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLineEntry) {
  await main();
}

async function main() {
  const source = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
  if (!Array.isArray(source.cards)) {
    throw new Error(`Invalid bilingual card source: ${SOURCE_PATH}`);
  }

  const cardsById = new Map();
  for (const wrapper of source.cards) {
    const card = wrapper?.json;
    const id = wrapper?.cardId ?? card?.id;
    if (!id || !card || cardsById.has(id)) {
      continue;
    }
    cardsById.set(id, card);
  }

  const sampleIds = (await readdir(SAMPLE_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".card.json"))
    .map((entry) => entry.name.slice(0, -".card.json".length))
    .sort();

  if (sampleIds.length === 0) {
    throw new Error("No public sample cards were found.");
  }

  const records = sampleIds.map((id) => {
    const card = cardsById.get(id);
    if (!card) {
      throw new Error(`Missing bilingual source card: ${id}`);
    }

    const title = readLocalizedField(card.title, "zh-Hans", id, "title", true)
      .slice(0, TITLE_MAX_LENGTH);
    const body = readLocalizedField(card.text, "zh-Hans", id, "text", false)
      .slice(0, BODY_MAX_LENGTH);
    if (!title || typeof card.image !== "string" || !card.image.endsWith(".avif")) {
      throw new Error(`Incomplete Chinese sample source: ${id}`);
    }

    return {
      id,
      image: card.image,
      localization: {
        title,
        body,
        keywordLanguage: "zh",
      },
    };
  });

  if (!CHECK_ONLY) {
    await mkdir(ZH_SAMPLE_ROOT, { recursive: true });
    await mkdir(ZH_REFERENCE_ROOT, { recursive: true });
  }

  for (const record of records) {
    const target = path.join(ZH_SAMPLE_ROOT, `${record.id}.card.json`);
    const expected = `${JSON.stringify(record.localization, null, 2)}\n`;
    if (CHECK_ONLY) {
      if (await readFile(target, "utf8") !== expected) {
        throw new Error(`Stale Chinese sample localization: ${record.id}`);
      }
    } else {
      await writeFile(target, expected, "utf8");
    }
  }

  const referenceManifest = await readReferenceManifest(records, CHECK_ONLY);
  await mapLimit(records, 2, async (record) => {
    const target = path.join(ZH_REFERENCE_ROOT, `${record.id}.avif`);
    if (CHECK_ONLY) {
      const bytes = await readBoundedAvif(target, record.id);
      const expected = referenceManifest.references[record.id];
      if (expected.source !== record.image || expected.sha256 !== sha256(bytes)) {
        throw new Error(`Stale or mismatched Chinese reference image: ${record.id}`);
      }
      return;
    }

    const existingBytes = await readOptionalBoundedAvif(target);
    const existingEntry = referenceManifest?.references?.[record.id];
    if (shouldReuseExistingReference(referenceManifest, existingEntry, record, existingBytes)) {
      return;
    }

    const url = `${OFFICIAL_ZH_CARD_ROOT}/${encodeURIComponent(record.image)}`;
    const bytes = await downloadWithProjectTool(url, record.id);
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !isAvif(bytes)) {
      throw new Error(`Chinese reference is not a bounded AVIF image: ${record.id}`);
    }
    await writeFile(target, bytes);
  });

  if (!CHECK_ONLY) {
    const references = {};
    for (const record of records) {
      const bytes = await readBoundedAvif(
        path.join(ZH_REFERENCE_ROOT, `${record.id}.avif`),
        record.id,
      );
      references[record.id] = { source: record.image, sha256: sha256(bytes) };
    }
    await writeFile(
      REFERENCE_MANIFEST_PATH,
      `${JSON.stringify({ version: 1, references }, null, 2)}\n`,
      "utf8",
    );
  }

  console.log(
    `${CHECK_ONLY ? "Verified" : "Generated"} ${records.length} Chinese sample overlays and reference images.`,
  );
}

async function downloadWithProjectTool(url, sampleId) {
  const python = process.platform === "win32" ? "py" : "python3";
  const pythonArgs = process.platform === "win32" ? ["-3"] : [];
  const downloader = [
    "from tools.kards_private_calibration import download_bytes",
    "import sys",
    "sys.stdout.buffer.write(download_bytes(sys.argv[1]))",
  ].join("; ");
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await execFileAsync(python, [...pythonArgs, "-c", downloader, url], {
        cwd: REPO_ROOT,
        encoding: "buffer",
        maxBuffer: MAX_IMAGE_BYTES + 1024,
        timeout: 50_000,
        windowsHide: true,
      });
      return Buffer.from(result.stdout);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw new Error(`Chinese reference download timed out: ${sampleId}`, { cause: lastError });
}

export function readLocalizedField(value, language, sampleId, field, required) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (required || (typeof value === "string" && value.trim())) {
      throw new Error(`Missing ${language} ${field} for sample: ${sampleId}`);
    }
    return "";
  }
  if (Object.hasOwn(value, language)) {
    return String(value[language] ?? "");
  }
  const hasOtherLanguageContent = Object.values(value).some((entry) => String(entry ?? "").trim());
  if (required || hasOtherLanguageContent) {
    throw new Error(`Missing ${language} ${field} for sample: ${sampleId}`);
  }
  return "";
}

async function readOptionalBoundedAvif(filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile() || fileStat.size <= 0 || fileStat.size > MAX_IMAGE_BYTES) {
      return null;
    }
    const bytes = await readFile(filePath);
    return isAvif(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

async function readBoundedAvif(filePath, sampleId) {
  const bytes = await readOptionalBoundedAvif(filePath);
  if (!bytes) {
    throw new Error(`Missing or invalid Chinese reference image: ${sampleId}`);
  }
  return bytes;
}

async function readReferenceManifest(records, required) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(REFERENCE_MANIFEST_PATH, "utf8"));
  } catch (error) {
    if (!required && error?.code === "ENOENT") {
      return null;
    }
    throw new Error("Chinese reference hash manifest is missing or invalid.", { cause: error });
  }
  assertReferenceManifest(manifest, records);
  return manifest;
}

export function assertReferenceManifest(manifest, records) {
  const expectedIds = records.map((record) => record.id).sort();
  const actualIds = manifest?.references && typeof manifest.references === "object"
    ? Object.keys(manifest.references).sort()
    : [];
  if (manifest?.version !== 1 || JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("Chinese reference hash manifest does not match the sample catalog.");
  }
  for (const record of records) {
    const entry = manifest.references[record.id];
    if (
      !entry
      || entry.source !== record.image
      || typeof entry.sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(entry.sha256)
    ) {
      throw new Error(`Invalid Chinese reference hash manifest entry: ${record.id}`);
    }
  }
}

export function shouldReuseExistingReference(manifest, entry, record, bytes) {
  return Boolean(
    manifest
    && bytes
    && entry?.source === record.image
    && entry.sha256 === sha256(bytes),
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isAvif(bytes) {
  if (bytes.length < 16 || bytes.toString("ascii", 4, 8) !== "ftyp") {
    return false;
  }
  const brands = bytes.subarray(8, Math.min(bytes.length, 32)).toString("ascii");
  return brands.includes("avif") || brands.includes("avis");
}

async function mapLimit(items, limit, operation) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await operation(item);
    }
  });
  await Promise.all(workers);
}
