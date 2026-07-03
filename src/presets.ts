import type { KindPreset, NationPreset, RarityPreset, SetPreset } from "./types";

export const CARD_KINDS: KindPreset[] = [
  { id: "hq", label: "HQ", symbol: "HQ", hasStats: false, hasOperationCost: false },
  { id: "infantry", label: "Infantry", symbol: "INF", hasStats: true, hasOperationCost: true },
  { id: "tank", label: "Tank", symbol: "TNK", hasStats: true, hasOperationCost: true },
  { id: "fighter", label: "Fighter", symbol: "FTR", hasStats: true, hasOperationCost: true },
  { id: "bomber", label: "Bomber", symbol: "BMB", hasStats: true, hasOperationCost: true },
  { id: "artillery", label: "Artillery", symbol: "ART", hasStats: true, hasOperationCost: true },
  { id: "order", label: "Order", symbol: "ORD", hasStats: false, hasOperationCost: false },
  {
    id: "countermeasure",
    label: "Countermeasure",
    symbol: "CTR",
    hasStats: false,
    hasOperationCost: false,
  },
];

export const NATIONS: NationPreset[] = [
  {
    id: "us",
    label: "United States",
    shortLabel: "US",
    emblem: "star",
    accent: "#646c4e",
    deep: "#20261c",
  },
  {
    id: "britain",
    label: "Britain",
    shortLabel: "UK",
    emblem: "crown",
    accent: "#978c6f",
    deep: "#261619",
  },
  {
    id: "germany",
    label: "Germany",
    shortLabel: "DE",
    emblem: "cross",
    accent: "#5f6a67",
    deep: "#1b1c1d",
  },
  {
    id: "soviet",
    label: "Soviet",
    shortLabel: "SU",
    emblem: "diamond",
    accent: "#665644",
    deep: "#2a1814",
  },
  {
    id: "japan",
    label: "Japan",
    shortLabel: "JP",
    emblem: "sun",
    accent: "#a08241",
    deep: "#2f2519",
  },
  {
    id: "france",
    label: "France",
    shortLabel: "FR",
    emblem: "block",
    accent: "#505a79",
    deep: "#20243a",
  },
  {
    id: "italy",
    label: "Italy",
    shortLabel: "IT",
    emblem: "block",
    accent: "#69696a",
    deep: "#252525",
  },
  {
    id: "poland",
    label: "Poland",
    shortLabel: "PL",
    emblem: "block",
    accent: "#696353",
    deep: "#28251e",
  },
  {
    id: "finland",
    label: "Finland",
    shortLabel: "FI",
    emblem: "block",
    accent: "#bdbdad",
    deep: "#4a4a42",
  },
  {
    id: "neutral",
    label: "Neutral",
    shortLabel: "NE",
    emblem: "block",
    accent: "#3b3b43",
    deep: "#17171d",
  },
  {
    id: "custom",
    label: "Custom",
    shortLabel: "CU",
    emblem: "circle",
    accent: "#7b6b4a",
    deep: "#2a2419",
  },
];

export const RARITIES: RarityPreset[] = [
  { id: "standard", label: "Standard", color: "#9a8d72" },
  { id: "limited", label: "Limited", color: "#b08745" },
  { id: "special", label: "Special", color: "#b94a3d" },
  { id: "elite", label: "Elite", color: "#d7c06d" },
];

export const SETS: SetPreset[] = [
  { id: "base", label: "Base Archive", mark: "A" },
  { id: "frontline", label: "Frontline", mark: "F" },
  { id: "high-command", label: "High Command", mark: "H" },
  { id: "custom", label: "Custom Set", mark: "*" },
];

export function getKind(id: string): KindPreset {
  return CARD_KINDS.find((kind) => kind.id === id) ?? CARD_KINDS[1];
}

export function getNation(id: string): NationPreset {
  return NATIONS.find((nation) => nation.id === id) ?? NATIONS[0];
}

export function getRarity(id: string): RarityPreset {
  return RARITIES.find((rarity) => rarity.id === id) ?? RARITIES[0];
}

export function getSet(id: string): SetPreset {
  return SETS.find((set) => set.id === id) ?? SETS[0];
}
