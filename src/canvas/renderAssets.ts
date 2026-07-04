import type { CardKind, CardSpec } from "../types";
import type { Language } from "../i18n";
import type { CardTemplate } from "./layout";

export const CARD_RENDER_ASSET_SLOTS = [
  "card-mat",
  "unit-name-bar",
  "command-border",
  "cost-board",
  "nation-mark",
  "frame",
  "rarity-pip",
  "set-mark",
  "attack-board",
  "special-attack-board",
  "defense-board",
  "hq-defense-board",
  "type-icon",
  "type-icon-board",
  "type-icon-glyph",
] as const;

export type CardRenderAssetSlot = (typeof CARD_RENDER_ASSET_SLOTS)[number];

export type CardRenderAssetContext = {
  card: CardSpec;
  kind: CardKind;
  nationId: string;
  rarityId: string;
  setId: string;
  template: CardTemplate;
};

export type CardRenderAssetFilters = {
  kind?: CardKind;
  nationId?: string;
  rarityId?: string;
  setId?: string;
  template?: CardTemplate;
};

export type CardRenderAssetEntry = CardRenderAssetFilters & {
  slot: CardRenderAssetSlot;
  image: CanvasImageSource;
};

export type CardRenderAssetResolver = (
  slot: CardRenderAssetSlot,
  context: CardRenderAssetContext,
) => CanvasImageSource | null | undefined;

export type CardRenderAssets = {
  label?: string;
  resolveImage: CardRenderAssetResolver;
};

export type CardRenderFontSet = {
  title?: string;
  body?: string;
  keyword?: string;
  cost?: string;
  stat?: string;
  utility?: string;
};

export type RenderCardOptions = {
  assets?: CardRenderAssets | null;
  fonts?: CardRenderFontSet;
  disablePrintWear?: boolean;
  language?: Language;
};

const SLOT_SET = new Set<string>(CARD_RENDER_ASSET_SLOTS);

export function isCardRenderAssetSlot(value: string): value is CardRenderAssetSlot {
  return SLOT_SET.has(value);
}

export function createStaticAssetResolver(entries: CardRenderAssetEntry[], label?: string): CardRenderAssets {
  return {
    label,
    resolveImage(slot, context) {
      return resolveBestAssetEntry(entries, slot, context)?.image;
    },
  };
}

export function resolveBestAssetEntry(
  entries: CardRenderAssetEntry[],
  slot: CardRenderAssetSlot,
  context: CardRenderAssetContext,
): CardRenderAssetEntry | undefined {
  let bestEntry: CardRenderAssetEntry | undefined;
  let bestScore = -1;

  for (const entry of entries) {
    if (entry.slot !== slot || !doesAssetEntryMatch(entry, context)) {
      continue;
    }

    const score = getAssetEntryScore(entry, context);
    if (score > bestScore) {
      bestEntry = entry;
      bestScore = score;
    }
  }

  return bestEntry;
}

function doesAssetEntryMatch(entry: CardRenderAssetEntry, context: CardRenderAssetContext): boolean {
  if (entry.slot === "nation-mark" && entry.nationId === context.nationId) {
    return (
      doesFilterMatch(entry.rarityId, context.rarityId) &&
      doesFilterMatch(entry.setId, context.setId)
    );
  }

  return (
    doesFilterMatch(entry.kind, context.kind) &&
    doesFilterMatch(entry.nationId, context.nationId) &&
    doesFilterMatch(entry.rarityId, context.rarityId) &&
    doesFilterMatch(entry.setId, context.setId) &&
    doesFilterMatch(entry.template, context.template)
  );
}

function doesFilterMatch(filterValue: string | undefined, actualValue: string): boolean {
  return filterValue === undefined || filterValue === actualValue;
}

function getAssetEntryScore(entry: CardRenderAssetEntry, context: CardRenderAssetContext): number {
  if (entry.slot === "nation-mark") {
    return getNationMarkAssetEntryScore(entry, context);
  }

  let score = 0;
  if (entry.kind) score += 16;
  if (entry.nationId) score += 8;
  if (entry.rarityId) score += 4;
  if (entry.setId) score += 2;
  if (entry.template) score += 1;
  return score;
}

function getNationMarkAssetEntryScore(entry: CardRenderAssetEntry, context: CardRenderAssetContext): number {
  const hasKind = entry.kind !== undefined;
  const hasTemplate = entry.template !== undefined;
  const kindMatches = entry.kind === context.kind;
  const templateMatches = entry.template === context.template;
  const isGeneric = !hasKind && !hasTemplate;
  let score = entry.nationId === context.nationId ? 64 : 0;

  if ((hasKind && !kindMatches) || (hasTemplate && !templateMatches)) {
    score -= 32;
  }

  if (isGeneric) score += 16;
  if (kindMatches) score += 32;
  if (templateMatches) score += 20;
  if (entry.rarityId) score += 4;
  if (entry.setId) score += 2;
  return score;
}
