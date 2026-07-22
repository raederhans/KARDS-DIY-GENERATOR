import { normalizeCardSpec } from "./cardModel";
import type { CardKeywordLanguage, CardSpec, CardUpdate } from "./types";
import type { Language } from "./i18n";

export type DevPreviewCardLocalization = Pick<CardSpec, "title" | "body"> & {
  keywordLanguage: CardKeywordLanguage;
};

export type DevPreviewReferenceSample = {
  id: string;
  referenceUrl: string;
  referenceUrls?: Partial<Record<Language, string>>;
};

export type DevPreviewReferenceSelection = {
  selectedReferenceSampleId: string;
  referenceImageUrl: string;
};

export type DevPreviewSampleCardSource = ({ card: CardSpec } | { cardUrl: string }) & {
  cardLocalizations?: Partial<Record<Language, DevPreviewCardLocalization>>;
  cardLocalizationUrls?: Partial<Record<Language, string>>;
};

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
  language: Language = "en",
): DevPreviewReferenceSelection {
  return {
    selectedReferenceSampleId: sample.id,
    referenceImageUrl: resolveDevPreviewReferenceUrl(sample, language),
  };
}

export function resolveDevPreviewReferenceUrl(
  sample: DevPreviewReferenceSample,
  language: Language,
): string {
  return sample.referenceUrls?.[language] ?? sample.referenceUrl;
}

export async function resolveDevPreviewSampleCard(
  sample: DevPreviewSampleCardSource & { artworkReferenceCrop?: DevPreviewArtworkReferenceCrop },
  readCardUrl: (cardUrl: string) => Promise<unknown>,
  readArtworkCrop?: (crop: DevPreviewArtworkReferenceCrop) => Promise<string>,
  language: Language = "en",
): Promise<CardSpec> {
  const loadedCard = normalizeCardSpec("card" in sample ? sample.card : await readCardUrl(sample.cardUrl));
  const localization = sample.cardLocalizations?.[language]
    ?? (sample.cardLocalizationUrls?.[language]
      ? parseCardLocalization(await readCardUrl(sample.cardLocalizationUrls[language]))
      : undefined);
  const card = normalizeCardSpec({
    ...loadedCard,
    ...localization,
    keywordLanguage: language,
  });
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
  language: Language = "en",
): Promise<DevPreviewTemplateSelection> {
  return {
    referenceImageUrl: resolveDevPreviewReferenceUrl(sample, language),
    card: await resolveDevPreviewSampleCard(sample, readCardUrl, readArtworkCrop, language),
  };
}

function parseCardLocalization(value: unknown): DevPreviewCardLocalization | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const localization = value as Record<string, unknown>;
  if (
    typeof localization.title !== "string"
    || typeof localization.body !== "string"
    || (localization.keywordLanguage !== "en" && localization.keywordLanguage !== "zh")
  ) {
    return undefined;
  }

  return {
    title: localization.title,
    body: localization.body,
    keywordLanguage: localization.keywordLanguage,
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

export function getTemplateSampleIdForLanguageRefresh(
  activeTemplateSampleId: string | null,
  pendingTemplateSampleId: string | null,
): string | null {
  return pendingTemplateSampleId ?? activeTemplateSampleId;
}
