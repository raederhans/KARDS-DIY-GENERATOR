import type { CardSpec, KeywordPreset } from "./types";

export const MAX_CARD_KEYWORDS = 4;

export const KEYWORD_PRESETS: KeywordPreset[] = [
  { id: "guard", label: "Guard" },
  { id: "blitz", label: "Blitz" },
  { id: "shock", label: "Shock" },
  { id: "smokescreen", label: "Smokescreen" },
  { id: "fury", label: "Fury" },
  { id: "ambush", label: "Ambush" },
  { id: "heavyArmor1", label: "Heavy Armor 1" },
  { id: "heavyArmor2", label: "Heavy Armor 2" },
  { id: "heavyArmor3", label: "Heavy Armor 3" },
  { id: "bond", label: "Bond" },
  { id: "alpine", label: "Alpine" },
  { id: "pincer", label: "Pincer" },
  { id: "covert", label: "Covert" },
  { id: "intel1", label: "Intel 1" },
  { id: "intel2", label: "Intel 2" },
  { id: "intel3", label: "Intel 3" },
  { id: "salvage", label: "Salvage" },
  { id: "mobilize", label: "Mobilize" },
];

const KEYWORD_BY_ID = new Map(KEYWORD_PRESETS.map((keyword) => [keyword.id, keyword]));
const EXCLUSIVE_KEYWORD_GROUP_BY_ID = new Map([
  ["heavyArmor1", "heavyArmor"],
  ["heavyArmor2", "heavyArmor"],
  ["heavyArmor3", "heavyArmor"],
  ["intel1", "intel"],
  ["intel2", "intel"],
  ["intel3", "intel"],
]);
const KEYWORD_ALIASES = new Map(
  KEYWORD_PRESETS.flatMap((keyword) => [
    [normalizeKeywordToken(keyword.id), keyword.id],
    [normalizeKeywordToken(keyword.label), keyword.id],
  ]),
);

KEYWORD_ALIASES.set("armor1", "heavyArmor1");
KEYWORD_ALIASES.set("armor2", "heavyArmor2");
KEYWORD_ALIASES.set("armor3", "heavyArmor3");
KEYWORD_ALIASES.set("heavyarmor", "heavyArmor1");
KEYWORD_ALIASES.set("intel", "intel1");

export function getKeywordPreset(id: string): KeywordPreset | undefined {
  return KEYWORD_BY_ID.get(id);
}

export function normalizeCardKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeKeywordIds(value.map(resolveKeywordId).filter(Boolean) as string[]);
}

export function parseKeywordLine(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return dedupeKeywordIds(value.split(/[,;/|]+/).map(resolveKeywordId).filter(Boolean) as string[]);
}

export function resolveCardKeywordIds(card: Pick<CardSpec, "keywords" | "keywordLine">): string[] {
  if (Array.isArray(card.keywords)) {
    return normalizeCardKeywords(card.keywords);
  }

  return parseKeywordLine(card.keywordLine);
}

export function formatKeywordLineFromIds(keywordIds: string[]): string {
  return keywordIds
    .map((keywordId) => getKeywordPreset(keywordId)?.label.toUpperCase())
    .filter(Boolean)
    .join(", ");
}

export function canAddKeywordId(selectedKeywordIds: string[], keywordId: string): boolean {
  const resolvedKeywordId = resolveKeywordId(keywordId);
  if (!resolvedKeywordId) {
    return false;
  }

  const normalizedKeywordIds = normalizeCardKeywords(selectedKeywordIds);
  if (normalizedKeywordIds.length >= MAX_CARD_KEYWORDS || normalizedKeywordIds.includes(resolvedKeywordId)) {
    return false;
  }

  const exclusiveGroup = EXCLUSIVE_KEYWORD_GROUP_BY_ID.get(resolvedKeywordId);
  return !exclusiveGroup || !normalizedKeywordIds.some((selectedKeywordId) => EXCLUSIVE_KEYWORD_GROUP_BY_ID.get(selectedKeywordId) === exclusiveGroup);
}

export function reorderKeywordIds(keywordIds: string[], fromIndex: number, toIndex: number): string[] {
  const normalizedKeywordIds = normalizeCardKeywords(keywordIds);
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || normalizedKeywordIds.length < 2) {
    return normalizedKeywordIds;
  }

  if (fromIndex < 0 || fromIndex >= normalizedKeywordIds.length) {
    return normalizedKeywordIds;
  }

  const targetIndex = Math.max(0, Math.min(toIndex, normalizedKeywordIds.length - 1));
  if (fromIndex === targetIndex) {
    return normalizedKeywordIds;
  }

  const nextKeywordIds = [...normalizedKeywordIds];
  const [movedKeywordId] = nextKeywordIds.splice(fromIndex, 1);
  nextKeywordIds.splice(targetIndex, 0, movedKeywordId);
  return nextKeywordIds;
}

function resolveKeywordId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return KEYWORD_ALIASES.get(normalizeKeywordToken(stripInternalKeywordPayload(value)));
}

function stripInternalKeywordPayload(value: string): string {
  return value.includes(":") ? value.slice(0, value.indexOf(":")) : value;
}

function dedupeKeywordIds(keywordIds: string[]): string[] {
  const selectedKeywordIds: string[] = [];
  const selectedKeywordSet = new Set<string>();
  const selectedExclusiveGroups = new Set<string>();

  for (const keywordId of keywordIds) {
    if (selectedKeywordSet.has(keywordId)) {
      continue;
    }

    const exclusiveGroup = EXCLUSIVE_KEYWORD_GROUP_BY_ID.get(keywordId);
    if (exclusiveGroup && selectedExclusiveGroups.has(exclusiveGroup)) {
      continue;
    }

    selectedKeywordIds.push(keywordId);
    selectedKeywordSet.add(keywordId);
    if (exclusiveGroup) {
      selectedExclusiveGroups.add(exclusiveGroup);
    }

    if (selectedKeywordIds.length >= MAX_CARD_KEYWORDS) {
      break;
    }
  }

  return selectedKeywordIds;
}

function normalizeKeywordToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
