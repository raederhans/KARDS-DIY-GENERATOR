import { normalizeCardSpec } from "./cardModel";
import { getLocalizedDefaultCard, type Language } from "./i18n";
import type { CardKind, CardSpec, CardUpdate } from "./types";

export type CardEditorState = {
  card: CardSpec;
  hasUserEdits: boolean;
  clearedNumericFields: NumericCardField[];
  artworkOrigin: ArtworkOrigin;
  artworkRevision: number;
};

export type ArtworkOrigin =
  | { kind: "none" }
  | { kind: "user" }
  | { kind: "auto-reference"; sampleId: string };

export const NUMERIC_CARD_FIELDS = [
  "deployment",
  "operation",
  "attack",
  "defense",
  "hqDefense",
] as const;

export type NumericCardField = (typeof NUMERIC_CARD_FIELDS)[number];

const NUMERIC_CARD_FIELD_SET = new Set<string>(NUMERIC_CARD_FIELDS);

const EDITABLE_NUMERIC_FIELDS_BY_KIND: Record<CardKind, readonly NumericCardField[]> = {
  hq: ["hqDefense"],
  infantry: ["deployment", "operation", "attack", "defense"],
  tank: ["deployment", "operation", "attack", "defense"],
  fighter: ["deployment", "operation", "attack", "defense"],
  bomber: ["deployment", "operation", "attack", "defense"],
  artillery: ["deployment", "operation", "attack", "defense"],
  order: ["deployment"],
  countermeasure: ["deployment"],
};

type LocalizedText = Record<Language, string>;

type CardKindReferenceDefinition = {
  nation: CardSpec["nation"];
  rarity: CardSpec["rarity"];
  set: CardSpec["set"];
  title: LocalizedText;
  body: LocalizedText;
  keywords: string[];
  costs: CardSpec["costs"];
  stats: CardSpec["stats"];
};

const CARD_KIND_REFERENCE_DEFINITIONS = {
  hq: {
    nation: "us",
    rarity: "none",
    set: "base",
    title: { en: "FRONTLINE HQ", zh: "前线总部" },
    body: {
      en: "Protect this headquarters. You lose the battle when its defense reaches 0.",
      zh: "保护这座总部。当总部防御力降至 0 时，你将输掉战斗。",
    },
    keywords: [],
    costs: {},
    stats: { hqDefense: 20 },
  },
  infantry: {
    nation: "britain",
    rarity: "standard",
    set: "base",
    title: { en: "FRONTLINE INFANTRY", zh: "前线步兵" },
    body: {
      en: "Deployment: Give a friendly unit +1 defense.",
      zh: "部署：使一个友方单位获得 +1 防御力。",
    },
    keywords: ["guard"],
    costs: { deployment: 2, operation: 1 },
    stats: { attack: 2, defense: 3 },
  },
  tank: {
    nation: "us",
    rarity: "limited",
    set: "base",
    title: { en: "CUSTOM TANK", zh: "自定义坦克" },
    body: {
      en: "When this unit advances, it deals 1 damage to a target.",
      zh: "当该单位推进时，对一个目标造成 1 点伤害。",
    },
    keywords: ["heavyArmor1"],
    costs: { deployment: 4, operation: 2 },
    stats: { attack: 3, defense: 5 },
  },
  fighter: {
    nation: "japan",
    rarity: "limited",
    set: "base",
    title: { en: "INTERCEPTOR SQUADRON", zh: "截击中队" },
    body: {
      en: "Deployment: Deal 1 damage to an enemy air unit.",
      zh: "部署：对一个敌方空军单位造成 1 点伤害。",
    },
    keywords: ["fury"],
    costs: { deployment: 3, operation: 1 },
    stats: { attack: 3, defense: 3 },
  },
  bomber: {
    nation: "soviet",
    rarity: "limited",
    set: "base",
    title: { en: "TACTICAL BOMBER", zh: "战术轰炸机" },
    body: {
      en: "After this unit attacks, deal 1 damage to the enemy headquarters.",
      zh: "该单位攻击后，对敌方总部造成 1 点伤害。",
    },
    keywords: ["smokescreen"],
    costs: { deployment: 5, operation: 2 },
    stats: { attack: 4, defense: 4 },
  },
  artillery: {
    nation: "germany",
    rarity: "standard",
    set: "base",
    title: { en: "FIELD ARTILLERY", zh: "野战炮兵" },
    body: {
      en: "If this unit did not move this turn, it gets +1 attack.",
      zh: "若该单位本回合没有移动，则获得 +1 攻击力。",
    },
    keywords: ["ambush"],
    costs: { deployment: 3, operation: 2 },
    stats: { attack: 3, defense: 3 },
  },
  order: {
    nation: "us",
    rarity: "standard",
    set: "base",
    title: { en: "COORDINATED ASSAULT", zh: "协同进攻" },
    body: {
      en: "Give a friendly unit +2 attack until the end of the turn.",
      zh: "使一个友方单位获得 +2 攻击力，持续到回合结束。",
    },
    keywords: [],
    costs: { deployment: 2 },
    stats: {},
  },
  countermeasure: {
    nation: "britain",
    rarity: "limited",
    set: "base",
    title: { en: "PREPARED AMBUSH", zh: "伏击准备" },
    body: {
      en: "When the enemy deploys a unit, deal 2 damage to it.",
      zh: "当敌方部署一个单位时，对其造成 2 点伤害。",
    },
    keywords: ["ambush"],
    costs: { deployment: 2 },
    stats: {},
  },
} satisfies Record<CardKind, CardKindReferenceDefinition>;

function getNumericCardValues(card: CardSpec): Record<NumericCardField, number | undefined> {
  return {
    deployment: card.costs.deployment,
    operation: card.costs.operation,
    attack: card.stats.attack,
    defense: card.stats.defense,
    hqDefense: card.stats.hqDefense,
  };
}

export function normalizeClearedNumericFields(value: unknown): NumericCardField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const fields = new Set<NumericCardField>();
  for (const candidate of value) {
    if (typeof candidate === "string" && NUMERIC_CARD_FIELD_SET.has(candidate)) {
      fields.add(candidate as NumericCardField);
    }
  }
  return [...fields];
}

export function getMissingEditableNumericFields(card: CardSpec): NumericCardField[] {
  const values = getNumericCardValues(card);
  return EDITABLE_NUMERIC_FIELDS_BY_KIND[card.kind].filter((field) => values[field] === undefined);
}

export function getCardKindReferenceCard(kind: CardKind, language: Language): CardSpec {
  const definition = CARD_KIND_REFERENCE_DEFINITIONS[kind];
  const defaultCard = getLocalizedDefaultCard(language);

  return normalizeCardSpec({
    ...defaultCard,
    kind,
    nation: definition.nation,
    rarity: definition.rarity,
    set: definition.set,
    title: definition.title[language],
    body: definition.body[language],
    keywords: definition.keywords,
    keywordLine: "",
    costs: definition.costs,
    stats: definition.stats,
    artwork: {
      source: "none",
      crop: { x: 0, y: 0, scale: 1 },
    },
  });
}

export function createCardEditorState(
  card: CardSpec,
  hasUserEdits: boolean,
  clearedNumericFields?: readonly NumericCardField[],
): CardEditorState {
  const normalizedCard = normalizeCardSpec(card);
  return {
    card: normalizedCard,
    hasUserEdits,
    clearedNumericFields: clearedNumericFields === undefined
      ? hasUserEdits ? getMissingEditableNumericFields(normalizedCard) : []
      : normalizeClearedNumericFields(clearedNumericFields),
    artworkOrigin: normalizedCard.artwork.source === "upload"
      ? { kind: "user" }
      : { kind: "none" },
    artworkRevision: 0,
  };
}

export function applyUserCardUpdate(state: CardEditorState, update: CardUpdate): CardEditorState {
  const currentCard = normalizeCardSpec(state.card);
  const nextCard = normalizeCardSpec(typeof update === "function" ? update(currentCard) : update);
  const currentValues = getNumericCardValues(currentCard);
  const nextValues = getNumericCardValues(nextCard);
  const clearedNumericFields = new Set(state.clearedNumericFields);

  for (const field of NUMERIC_CARD_FIELDS) {
    if (currentValues[field] !== undefined && nextValues[field] === undefined) {
      clearedNumericFields.add(field);
    } else if (nextValues[field] !== undefined) {
      clearedNumericFields.delete(field);
    }
  }

  return {
    card: nextCard,
    hasUserEdits: true,
    clearedNumericFields: [...clearedNumericFields],
    artworkOrigin: hasArtworkChanged(currentCard.artwork, nextCard.artwork)
      ? { kind: "user" }
      : state.artworkOrigin,
    artworkRevision: hasArtworkChanged(currentCard.artwork, nextCard.artwork)
      ? state.artworkRevision + 1
      : state.artworkRevision,
  };
}

export function applyAutomaticArtwork(
  state: CardEditorState,
  sampleId: string,
  artwork: CardSpec["artwork"],
): CardEditorState {
  if (state.artworkOrigin.kind === "user") {
    return state;
  }

  return {
    ...state,
    card: normalizeCardSpec({ ...state.card, artwork }),
    artworkOrigin: { kind: "auto-reference", sampleId },
  };
}

export function clearAutomaticArtwork(state: CardEditorState): CardEditorState {
  if (state.artworkOrigin.kind !== "auto-reference") {
    return state;
  }
  return {
    ...state,
    card: normalizeCardSpec({
      ...state.card,
      artwork: { source: "none", crop: { x: 0, y: 0, scale: 1 } },
    }),
    artworkOrigin: { kind: "none" },
  };
}

export function clearMismatchedAutomaticArtwork(
  state: CardEditorState,
  expectedSampleId: string,
): CardEditorState {
  return state.artworkOrigin.kind === "auto-reference"
    && state.artworkOrigin.sampleId !== expectedSampleId
    ? clearAutomaticArtwork(state)
    : state;
}

export function applyUserArtworkIfRevisionMatches(
  state: CardEditorState,
  expectedArtworkRevision: number,
  artwork: CardSpec["artwork"],
): CardEditorState {
  if (state.artworkRevision !== expectedArtworkRevision) {
    return state;
  }
  return applyUserCardUpdate(state, (card) => ({ ...card, artwork }));
}

export function selectCardKind(
  state: CardEditorState,
  kind: CardKind,
  language: Language,
): CardEditorState {
  if (!state.hasUserEdits) {
    return {
      card: getCardKindReferenceCard(kind, language),
      hasUserEdits: false,
      clearedNumericFields: [],
      artworkOrigin: { kind: "none" },
      artworkRevision: state.artworkRevision,
    };
  }

  const referenceCard = getCardKindReferenceCard(kind, language);
  const costs = { ...state.card.costs };
  const stats = { ...state.card.stats };
  const clearedNumericFields = new Set(state.clearedNumericFields);

  if (!clearedNumericFields.has("deployment") && costs.deployment === undefined && referenceCard.costs.deployment !== undefined) {
    costs.deployment = referenceCard.costs.deployment;
  }
  if (!clearedNumericFields.has("operation") && costs.operation === undefined && referenceCard.costs.operation !== undefined) {
    costs.operation = referenceCard.costs.operation;
  }
  if (!clearedNumericFields.has("attack") && stats.attack === undefined && referenceCard.stats.attack !== undefined) {
    stats.attack = referenceCard.stats.attack;
  }
  if (!clearedNumericFields.has("defense") && stats.defense === undefined && referenceCard.stats.defense !== undefined) {
    stats.defense = referenceCard.stats.defense;
  }
  if (!clearedNumericFields.has("hqDefense") && stats.hqDefense === undefined && referenceCard.stats.hqDefense !== undefined) {
    stats.hqDefense = referenceCard.stats.hqDefense;
  }

  return {
    card: normalizeCardSpec({
      ...state.card,
      kind,
      costs,
      stats,
    }),
    hasUserEdits: true,
    clearedNumericFields: state.clearedNumericFields,
    artworkOrigin: state.artworkOrigin,
    artworkRevision: state.artworkRevision,
  };
}

export function replaceCardEditorContent(card: CardSpec): CardEditorState {
  return {
    ...createCardEditorState(card, true),
    artworkOrigin: { kind: "user" },
  };
}

export function resetCardEditorState(language: Language): CardEditorState {
  return createCardEditorState(getCardKindReferenceCard("tank", language), false);
}

function hasArtworkChanged(current: CardSpec["artwork"], next: CardSpec["artwork"]): boolean {
  return current.source !== next.source
    || current.dataUrl !== next.dataUrl
    || current.crop.x !== next.crop.x
    || current.crop.y !== next.crop.y
    || current.crop.scale !== next.crop.scale;
}
