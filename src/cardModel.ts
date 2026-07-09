import type { CardAppearance, CardKind, CardSpec } from "./types";
import { CARD_KINDS, NATIONS, RARITIES, SETS } from "./presets";
import { BODY_MAX_LENGTH, CARD_FACE_VALUE_MAX, isAllowedImageDataUrl, KEYWORD_MAX_LENGTH, TITLE_MAX_LENGTH } from "./limits";
import { formatKeywordLineFromIds, normalizeCardKeywords, parseKeywordLine } from "./keywords";

const VALID_KINDS = new Set(CARD_KINDS.map((kind) => kind.id));
const VALID_NATIONS = new Set(NATIONS.map((nation) => nation.id));
const VALID_RARITIES = new Set(RARITIES.map((rarity) => rarity.id));
const VALID_SETS = new Set(SETS.map((set) => set.id));

export const DEFAULT_CARD_APPEARANCE: CardAppearance = {
  texture: {
    seed: 0x4b415244,
    intensity: 1.85,
    randomness: 1.55,
    mottle: 1.35,
  },
  text: {
    title: {
      fontScale: 1,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      bold: true,
    },
    keywords: {
      fontScale: 1,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    },
    body: {
      fontScale: 1,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    },
  },
};

export const CARD_TEXTURE_BOUNDS = {
  intensity: { min: 0.35, max: 3 },
  randomness: { min: 0.5, max: 3 },
  mottle: { min: 0.35, max: 3 },
} as const;

export const CARD_TEXT_APPEARANCE_BOUNDS = {
  fontScale: { min: 0.65, max: 1.45 },
  scaleX: { min: 0.75, max: 1.25 },
  scaleY: { min: 0.75, max: 1.25 },
  offsetX: { min: -80, max: 80 },
  offsetY: { min: -80, max: 80 },
} as const;

export const DEFAULT_CARD: CardSpec = {
  version: 1,
  kind: "tank",
  nation: "us",
  rarity: "limited",
  set: "base",
  title: "CUSTOM TANK",
  body: "When this unit advances, it deals 1 damage to a target.",
  keywords: ["heavyArmor1"],
  keywordLine: "HEAVY ARMOR 1",
  costs: {
    deployment: 4,
    operation: 2,
  },
  stats: {
    attack: 3,
    defense: 5,
    hqDefense: 20,
  },
  artwork: {
    source: "none",
    crop: {
      x: 0,
      y: 0,
      scale: 1,
    },
  },
  appearance: DEFAULT_CARD_APPEARANCE,
};

export function sanitizeInteger(value: unknown, min: number, max: number): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

export function normalizeCardSpec(input: unknown): CardSpec {
  const raw = isRecord(input) ? input : {};
  const costs = isRecord(raw.costs) ? raw.costs : {};
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const artwork = isRecord(raw.artwork) ? raw.artwork : {};
  const crop = isRecord(artwork.crop) ? artwork.crop : {};
  const appearance = isRecord(raw.appearance) ? raw.appearance : {};

  const kind = typeof raw.kind === "string" && VALID_KINDS.has(raw.kind as CardKind)
    ? (raw.kind as CardKind)
    : DEFAULT_CARD.kind;

  const keywords = normalizeImportedKeywords(raw.keywords, raw.keywordLine);

  return {
    version: 1,
    kind,
    nation: choosePreset(raw.nation, VALID_NATIONS, DEFAULT_CARD.nation),
    rarity: choosePreset(raw.rarity, VALID_RARITIES, DEFAULT_CARD.rarity),
    set: choosePreset(raw.set, VALID_SETS, DEFAULT_CARD.set),
    title: limitText(raw.title, DEFAULT_CARD.title, TITLE_MAX_LENGTH),
    body: limitText(raw.body, DEFAULT_CARD.body, BODY_MAX_LENGTH),
    keywords,
    keywordLine: limitText(formatKeywordLineFromIds(keywords), "", KEYWORD_MAX_LENGTH),
    costs: {
      deployment: sanitizeInteger(costs.deployment, 0, CARD_FACE_VALUE_MAX),
      operation: sanitizeInteger(costs.operation, 0, CARD_FACE_VALUE_MAX),
    },
    stats: {
      attack: sanitizeInteger(stats.attack, 0, CARD_FACE_VALUE_MAX),
      defense: sanitizeInteger(stats.defense, 0, CARD_FACE_VALUE_MAX),
      hqDefense: sanitizeInteger(stats.hqDefense, 1, CARD_FACE_VALUE_MAX),
    },
    artwork: normalizeArtwork(artwork, crop),
    appearance: normalizeCardAppearance(appearance),
  };
}

function normalizeImportedKeywords(keywords: unknown, keywordLine: unknown): string[] {
  if (Array.isArray(keywords)) {
    return normalizeCardKeywords(keywords);
  }

  return parseKeywordLine(keywordLine);
}

function normalizeArtwork(artwork: Record<string, unknown>, crop: Record<string, unknown>): CardSpec["artwork"] {
  const dataUrl = artwork.source === "upload" && typeof artwork.dataUrl === "string" && isAllowedImageDataUrl(artwork.dataUrl)
    ? artwork.dataUrl
    : undefined;

  return {
    source: artwork.source === "upload" && dataUrl ? "upload" : "none",
    crop: {
      x: clampNumber(crop.x, -300, 300, 0),
      y: clampNumber(crop.y, -300, 300, 0),
      scale: clampNumber(crop.scale, 0.6, 3, 1),
    },
    dataUrl,
  };
}

function normalizeCardAppearance(appearance: Record<string, unknown>): CardAppearance {
  const texture = isRecord(appearance.texture) ? appearance.texture : {};
  const text = isRecord(appearance.text) ? appearance.text : {};

  return {
    texture: {
      seed: normalizeSeed(texture.seed, DEFAULT_CARD_APPEARANCE.texture.seed),
      intensity: clampNumber(
        texture.intensity,
        CARD_TEXTURE_BOUNDS.intensity.min,
        CARD_TEXTURE_BOUNDS.intensity.max,
        DEFAULT_CARD_APPEARANCE.texture.intensity,
      ),
      randomness: clampNumber(
        texture.randomness,
        CARD_TEXTURE_BOUNDS.randomness.min,
        CARD_TEXTURE_BOUNDS.randomness.max,
        DEFAULT_CARD_APPEARANCE.texture.randomness,
      ),
      mottle: clampNumber(
        texture.mottle,
        CARD_TEXTURE_BOUNDS.mottle.min,
        CARD_TEXTURE_BOUNDS.mottle.max,
        DEFAULT_CARD_APPEARANCE.texture.mottle,
      ),
    },
    text: {
      title: normalizeTitleTextAppearance(isRecord(text.title) ? text.title : {}),
      keywords: normalizeTextAppearance("keywords", isRecord(text.keywords) ? text.keywords : {}),
      body: normalizeTextAppearance("body", isRecord(text.body) ? text.body : {}),
    },
  };
}

function normalizeTitleTextAppearance(text: Record<string, unknown>): CardAppearance["text"]["title"] {
  const defaultTitle = DEFAULT_CARD_APPEARANCE.text.title;

  return {
    ...normalizeTextAppearance("title", text),
    bold: typeof text.bold === "boolean" ? text.bold : defaultTitle.bold,
  };
}

function normalizeTextAppearance(
  role: keyof CardAppearance["text"],
  text: Record<string, unknown>,
): CardAppearance["text"]["body"] {
  const defaultText = DEFAULT_CARD_APPEARANCE.text[role];

  return {
    fontScale: clampNumber(
      text.fontScale,
      CARD_TEXT_APPEARANCE_BOUNDS.fontScale.min,
      CARD_TEXT_APPEARANCE_BOUNDS.fontScale.max,
      defaultText.fontScale,
    ),
    scaleX: clampNumber(
      text.scaleX,
      CARD_TEXT_APPEARANCE_BOUNDS.scaleX.min,
      CARD_TEXT_APPEARANCE_BOUNDS.scaleX.max,
      defaultText.scaleX,
    ),
    scaleY: clampNumber(
      text.scaleY,
      CARD_TEXT_APPEARANCE_BOUNDS.scaleY.min,
      CARD_TEXT_APPEARANCE_BOUNDS.scaleY.max,
      defaultText.scaleY,
    ),
    offsetX: clampNumber(
      text.offsetX,
      CARD_TEXT_APPEARANCE_BOUNDS.offsetX.min,
      CARD_TEXT_APPEARANCE_BOUNDS.offsetX.max,
      defaultText.offsetX,
    ),
    offsetY: clampNumber(
      text.offsetY,
      CARD_TEXT_APPEARANCE_BOUNDS.offsetY.min,
      CARD_TEXT_APPEARANCE_BOUNDS.offsetY.max,
      defaultText.offsetY,
    ),
  };
}

function choosePreset(value: unknown, validSet: Set<string>, fallback: string): string {
  return typeof value === "string" && validSet.has(value) ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeSeed(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue >>> 0 : fallback;
}

function limitText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
