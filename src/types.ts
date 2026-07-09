export type CardKind =
  | "hq"
  | "infantry"
  | "tank"
  | "fighter"
  | "bomber"
  | "artillery"
  | "order"
  | "countermeasure";

export type ArtworkSource = "upload" | "none";

export type CardTextAppearance = {
  fontScale: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
};

export type CardAppearance = {
  texture: {
    seed: number;
    intensity: number;
    randomness: number;
    mottle: number;
  };
  text: {
    title: CardTextAppearance & {
      bold: boolean;
    };
    keywords: CardTextAppearance;
    body: CardTextAppearance;
  };
};

export type CardSpec = {
  version: 1;
  kind: CardKind;
  nation: string;
  rarity: string;
  set: string;
  title: string;
  body: string;
  keywords?: string[];
  keywordLine?: string;
  costs: {
    deployment?: number;
    operation?: number;
  };
  stats: {
    attack?: number;
    defense?: number;
    hqDefense?: number;
  };
  artwork: {
    source: ArtworkSource;
    crop: {
      x: number;
      y: number;
      scale: number;
    };
    dataUrl?: string;
  };
  appearance: CardAppearance;
};

export type CardUpdate = CardSpec | ((current: CardSpec) => CardSpec);

export type NationPreset = {
  id: string;
  label: string;
  shortLabel: string;
  emblem: string;
  accent: string;
  deep: string;
};

export type RarityPreset = {
  id: string;
  label: string;
  color: string;
};

export type SetPreset = {
  id: string;
  label: string;
  mark: string;
};

export type KindPreset = {
  id: CardKind;
  label: string;
  symbol: string;
  hasStats: boolean;
  hasOperationCost: boolean;
};

export type KeywordPreset = {
  id: string;
  label: string;
};
