import { normalizeCardSpec } from "./cardModel";
import {
  getMissingEditableNumericFields,
  normalizeClearedNumericFields,
  type NumericCardField,
} from "./cardEditorState";
import type { CardSpec } from "./types";

export const STORAGE_KEY = "card-forge:card:v1";
export const DRAFT_STATE_STORAGE_KEY = "card-forge:draft-state:v2";
export const AUTO_ARTWORK_STORAGE_KEY = "card-forge:auto-artwork:v1";

export type DraftCardState = {
  card: CardSpec;
  hasUserEdits: boolean;
  clearedNumericFields: NumericCardField[];
};

type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export function loadAutoArtworkPreference(storage: DraftStorage): boolean {
  try {
    const stored = storage.getItem(AUTO_ARTWORK_STORAGE_KEY);
    return stored === "false" ? false : true;
  } catch {
    return true;
  }
}

export function saveAutoArtworkPreference(storage: DraftStorage, enabled: boolean): boolean {
  try {
    storage.setItem(AUTO_ARTWORK_STORAGE_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

function parseDraftState(serializedState: string): DraftCardState | null {
  try {
    const parsedState = JSON.parse(serializedState) as unknown;
    if (
      typeof parsedState !== "object"
      || parsedState === null
      || !("card" in parsedState)
    ) {
      return null;
    }

    const storedState = parsedState as {
      card: unknown;
      hasUserEdits?: unknown;
      clearedNumericFields?: unknown;
    };
    const card = toAutosaveCard(normalizeCardSpec(storedState.card));
    const hasUserEdits = storedState.hasUserEdits !== false;
    return {
      card,
      // Only an explicit false may unlock reference replacement.
      hasUserEdits,
      clearedNumericFields: storedState.clearedNumericFields === undefined && hasUserEdits
        ? getMissingEditableNumericFields(card)
        : normalizeClearedNumericFields(storedState.clearedNumericFields),
    };
  } catch {
    return null;
  }
}

export function toAutosaveCard(card: CardSpec): CardSpec {
  const normalizedCard = normalizeCardSpec(card);

  if (normalizedCard.artwork.source !== "upload") {
    return normalizedCard;
  }

  return {
    ...normalizedCard,
    artwork: {
      source: "none",
      crop: normalizedCard.artwork.crop,
    },
  };
}

export function loadDraftCard(storage: DraftStorage, fallbackCard: CardSpec): CardSpec {
  return loadDraftCardState(storage, fallbackCard).card;
}

export function loadDraftCardState(storage: DraftStorage, fallbackCard: CardSpec): DraftCardState {
  try {
    const savedState = storage.getItem(DRAFT_STATE_STORAGE_KEY);
    if (savedState) {
      const parsedState = parseDraftState(savedState);
      if (parsedState) {
        return parsedState;
      }
    }

    const legacyCard = storage.getItem(STORAGE_KEY);
    if (legacyCard) {
      const card = toAutosaveCard(normalizeCardSpec(JSON.parse(legacyCard)));
      return {
        card,
        hasUserEdits: true,
        clearedNumericFields: getMissingEditableNumericFields(card),
      };
    }
  } catch {
    // Invalid or unavailable storage must not prevent the editor from opening.
  }

  return { card: fallbackCard, hasUserEdits: false, clearedNumericFields: [] };
}

export function saveDraftCard(
  storage: DraftStorage,
  card: CardSpec,
  hasUserEdits = true,
  clearedNumericFields: readonly NumericCardField[] = [],
): boolean {
  try {
    const serializedState = JSON.stringify({
      card: toAutosaveCard(card),
      hasUserEdits,
      clearedNumericFields: normalizeClearedNumericFields(clearedNumericFields),
    } satisfies DraftCardState);
    storage.setItem(DRAFT_STATE_STORAGE_KEY, serializedState);
    return true;
  } catch {
    return false;
  }
}
