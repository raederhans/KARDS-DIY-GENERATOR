import { normalizeCardSpec } from "./cardModel";
import type { CardSpec, CardUpdate } from "./types";

export type DevPreviewReferenceSample = {
  id: string;
  referenceUrl: string;
};

export type DevPreviewReferenceSelection = {
  selectedReferenceSampleId: string;
  referenceImageUrl: string;
};

export type DevPreviewSampleCardSource =
  | { card: CardSpec }
  | { cardUrl: string };

export type DevPreviewArtworkReferenceCrop = {
  sourceUrl: string;
  sourceRect: { x: number; y: number; width: number; height: number };
};

export type DevPreviewTemplateSample = DevPreviewReferenceSample &
  DevPreviewSampleCardSource & {
    artworkReferenceCrop?: DevPreviewArtworkReferenceCrop;
  };

export type DevPreviewTemplateSelection = {
  referenceImageUrl: string;
  card: CardSpec;
};

export type DevPreviewSampleRequestState = {
  isMounted: boolean;
  requestId: number;
  activeRequestId: number;
  cardEditVersionAtStart: number;
  currentCardEditVersion: number;
};

export type AutomaticArtworkRequestState = {
  isMounted: boolean;
  requestId: number;
  activeRequestId: number;
  matchingKeyAtStart: string;
  currentMatchingKey: string;
  artworkOriginKind: "none" | "user" | "auto-reference";
};

export function applyCardUpdate(currentCard: CardSpec, update: CardUpdate): CardSpec {
  const normalizedCurrent = normalizeCardSpec(currentCard);
  return normalizeCardSpec(typeof update === "function" ? update(normalizedCurrent) : update);
}

export function resolveDevPreviewReferenceSelection(
  sample: DevPreviewReferenceSample,
): DevPreviewReferenceSelection {
  return {
    selectedReferenceSampleId: sample.id,
    referenceImageUrl: sample.referenceUrl,
  };
}

export async function resolveDevPreviewSampleCard(
  sample: DevPreviewSampleCardSource & { artworkReferenceCrop?: DevPreviewArtworkReferenceCrop },
  readCardUrl: (cardUrl: string) => Promise<unknown>,
  readArtworkCrop?: (crop: DevPreviewArtworkReferenceCrop) => Promise<string>,
): Promise<CardSpec> {
  const card = normalizeCardSpec("card" in sample ? sample.card : await readCardUrl(sample.cardUrl));
  if (!sample.artworkReferenceCrop || !readArtworkCrop) {
    return card;
  }

  return normalizeCardSpec({
    ...card,
    artwork: {
      ...card.artwork,
      source: "upload",
      dataUrl: await readArtworkCrop(sample.artworkReferenceCrop),
    },
  });
}

export async function resolveDevPreviewTemplateSelection(
  sample: DevPreviewTemplateSample,
  readCardUrl: (cardUrl: string) => Promise<unknown>,
  readArtworkCrop?: (crop: DevPreviewArtworkReferenceCrop) => Promise<string>,
): Promise<DevPreviewTemplateSelection> {
  return {
    referenceImageUrl: sample.referenceUrl,
    card: await resolveDevPreviewSampleCard(sample, readCardUrl, readArtworkCrop),
  };
}

export function shouldApplyDevPreviewSampleResult(state: DevPreviewSampleRequestState): boolean {
  return (
    state.isMounted &&
    state.requestId === state.activeRequestId &&
    state.cardEditVersionAtStart === state.currentCardEditVersion
  );
}

export function shouldApplyAutomaticArtworkResult(state: AutomaticArtworkRequestState): boolean {
  return state.isMounted
    && state.requestId === state.activeRequestId
    && state.matchingKeyAtStart === state.currentMatchingKey
    && state.artworkOriginKind !== "user";
}
