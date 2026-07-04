import type { CardKind, CardSpec } from "./types";

const PRIVATE_PREVIEW_ROOT = "/.runtime/kards-private-assets/stage6-multisource-clean-extraction";
const SAMPLE_ROOT = `${PRIVATE_PREVIEW_ROOT}/samples`;
const REFERENCE_ROOT = "/.runtime/kards-private-assets/stage5-card-face-elements/references/cards";
const HQ_REFERENCE_ROOT = `${PRIVATE_PREVIEW_ROOT}/references/kards-assets/hq2`;

export const DEV_PREVIEW_ASSET_PACK_URL =
  `${PRIVATE_PREVIEW_ROOT}/kards-asset-pack.json`;

export type DevPreviewSample = {
  id: string;
  label: string;
  kind: CardKind;
  set: string;
  referenceUrl: string;
} & ({ cardUrl: string } | { card: CardSpec });

const WASHINGTON_HQ_CARD: CardSpec = {
  version: 1,
  kind: "hq",
  nation: "us",
  rarity: "standard",
  set: "base",
  title: "WASHINGTON",
  body: "HQ reference sample from the private KARDS-Assets snapshot.",
  keywordLine: "HQ",
  costs: {},
  stats: {
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
};

export const DEV_PREVIEW_HQ_SAMPLE: DevPreviewSample = {
  id: "washington_hq",
  label: "WASHINGTON",
  kind: "hq",
  set: "base",
  referenceUrl: `${HQ_REFERENCE_ROOT}/Washington.png`,
  card: WASHINGTON_HQ_CARD,
};

export const DEV_PREVIEW_SET_SAMPLES: DevPreviewSample[] = [
  cardSample("t70", "base", "tank", "T-70"),
  cardSample("a26_invader", "allegiance", "bomber", "A-26 INVADER"),
  cardSample("macchi_c_200", "blood-and-iron", "fighter", "MACCHI C.200"),
  cardSample("royal_scots", "breakthrough", "infantry", "ROYAL SCOTS"),
  cardSample("plan_d", "brothers-in-arms", "order", "PLAN D"),
  cardSample("katalina", "covert-ops", "bomber", "KATALINA"),
  cardSample("m2a4", "homefront", "tank", "M2A4"),
  cardSample("kikka", "legions", "fighter", "KIKKA"),
  cardSample("gordon_highlanders", "naval-warfare", "infantry", "GORDON HIGHLANDERS"),
  cardSample("dingo", "oceania-storm", "tank", "DINGO"),
  cardSample("routed_troops", "only-spawnable", "infantry", "ROUTED TROOPS"),
  cardSample("the_regulars_vet", "special", "infantry", "THE REGULARS"),
  cardSample("wespe", "theaters-of-war", "artillery", "WESPE"),
  cardSample("jet_prototype", "winter-war", "fighter", "JET PROTOTYPE"),
  cardSample("hold_the_line", "world-at-war", "countermeasure", "HOLD THE LINE"),
];

export function getDefaultDevPreviewSample(): DevPreviewSample {
  return DEV_PREVIEW_SET_SAMPLES[0];
}

export function getDevPreviewSampleBySet(setId: string): DevPreviewSample | undefined {
  return DEV_PREVIEW_SET_SAMPLES.find((sample) => sample.set === setId);
}

export function getDevPreviewSampleByKind(kind: CardKind): DevPreviewSample | undefined {
  return kind === "hq" ? DEV_PREVIEW_HQ_SAMPLE : undefined;
}

export function getDevPreviewSampleForCard(card: Pick<CardSpec, "kind" | "set">): DevPreviewSample | undefined {
  return getDevPreviewSampleByKind(card.kind) ?? getDevPreviewSampleBySet(card.set);
}

export function getDevPreviewReferenceForCard(card: Pick<CardSpec, "kind" | "set">): string | undefined {
  return getDevPreviewSampleForCard(card)?.referenceUrl;
}

function cardSample(id: string, set: string, kind: CardKind, label: string): DevPreviewSample {
  return {
    id,
    label,
    kind,
    set,
    cardUrl: `${SAMPLE_ROOT}/${id}.card.json`,
    referenceUrl: `${REFERENCE_ROOT}/${id}.png`,
  };
}
