import { describe, expect, it } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import {
  AUTO_ARTWORK_STORAGE_KEY,
  DRAFT_STATE_STORAGE_KEY,
  loadDraftCard,
  loadDraftCardState,
  loadAutoArtworkPreference,
  saveDraftCard,
  saveAutoArtworkPreference,
  STORAGE_KEY,
  toAutosaveCard,
} from "./storage";
import type { CardSpec } from "./types";

describe("card draft storage", () => {
  it("keeps the automatic artwork toggle in a separate default-on preference", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(loadAutoArtworkPreference(storage)).toBe(true);
    expect(saveAutoArtworkPreference(storage, false)).toBe(true);
    expect(values.get(AUTO_ARTWORK_STORAGE_KEY)).toBe("false");
    expect(loadAutoArtworkPreference(storage)).toBe(false);
    expect(values.has(DRAFT_STATE_STORAGE_KEY)).toBe(false);
  });

  it("falls back to enabled when the automatic artwork preference is invalid or unavailable", () => {
    expect(loadAutoArtworkPreference({ getItem: () => "invalid", setItem: () => undefined })).toBe(true);
    expect(loadAutoArtworkPreference({
      getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      setItem: () => undefined,
    })).toBe(true);
  });

  it("keeps uploaded images out of automatic localStorage drafts", () => {
    const card: CardSpec = {
      ...DEFAULT_CARD,
      appearance: {
        ...DEFAULT_CARD.appearance,
        texture: {
          seed: 456,
          intensity: 2.1,
          randomness: 1.7,
          mottle: 1.2,
        },
        text: {
          ...DEFAULT_CARD.appearance.text,
          body: {
            ...DEFAULT_CARD.appearance.text.body,
            fontScale: 1.2,
            offsetY: -8,
          },
        },
      },
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,large-image",
        crop: { x: 5, y: 6, scale: 1.2 },
      },
    };

    const draft = toAutosaveCard(card);

    expect(draft.artwork.source).toBe("none");
    expect(draft.artwork.dataUrl).toBeUndefined();
    expect(draft.artwork.crop).toEqual({ x: 5, y: 6, scale: 1.2 });
    expect(draft.appearance.texture).toEqual(card.appearance.texture);
    expect(draft.appearance.text.body).toEqual(card.appearance.text.body);
  });

  it("reports autosave failure instead of throwing when storage quota is exceeded", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    };

    expect(saveDraftCard(storage, DEFAULT_CARD)).toBe(false);
  });

  it("loads normalized drafts and falls back on invalid JSON", () => {
    const savedStorage = {
      getItem: (key: string) => key === DRAFT_STATE_STORAGE_KEY
        ? JSON.stringify({ card: { ...DEFAULT_CARD, title: "SAVED" }, hasUserEdits: true })
        : null,
      setItem: () => undefined,
    };
    const invalidStorage = {
      getItem: (key: string) => key === DRAFT_STATE_STORAGE_KEY ? "{" : null,
      setItem: () => undefined,
    };

    expect(loadDraftCard(savedStorage, DEFAULT_CARD).title).toBe("SAVED");
    expect(loadDraftCard(invalidStorage, DEFAULT_CARD).title).toBe(DEFAULT_CARD.title);
  });

  it("cleans uploaded artwork from legacy drafts when loading", () => {
    const savedStorage = {
      getItem: (key: string) => key === STORAGE_KEY
        ? JSON.stringify({
            ...DEFAULT_CARD,
            artwork: {
              source: "upload",
              dataUrl: "data:image/png;base64,legacy-image",
              crop: { x: 9, y: -4, scale: 1.3 },
            },
          })
        : null,
      setItem: () => undefined,
    };

    const draft = loadDraftCard(savedStorage, DEFAULT_CARD);

    expect(draft.artwork.source).toBe("none");
    expect(draft.artwork.dataUrl).toBeUndefined();
    expect(draft.artwork.crop).toEqual({ x: 9, y: -4, scale: 1.3 });
  });

  it("falls back if browser storage is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
      setItem: () => undefined,
    };

    expect(loadDraftCard(storage, DEFAULT_CARD).title).toBe(DEFAULT_CARD.title);
  });

  it("writes card content and edit protection under one atomic versioned key", () => {
    const writtenKeys: string[] = [];
    const storage = {
      getItem: () => null,
      setItem: (key: string) => {
        writtenKeys.push(key);
      },
    };

    saveDraftCard(storage, DEFAULT_CARD);

    expect(writtenKeys).toEqual([DRAFT_STATE_STORAGE_KEY]);
  });

  it("persists pristine and edited status together with the card payload", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };

    saveDraftCard(storage, DEFAULT_CARD, false);
    expect(loadDraftCardState(storage, DEFAULT_CARD).hasUserEdits).toBe(false);

    saveDraftCard(storage, DEFAULT_CARD, true);
    expect(loadDraftCardState(storage, DEFAULT_CARD).hasUserEdits).toBe(true);
  });

  it("persists deliberately cleared numeric fields with the atomic draft", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };

    saveDraftCard(storage, DEFAULT_CARD, true, ["attack", "operation"]);

    expect(loadDraftCardState(storage, DEFAULT_CARD).clearedNumericFields).toEqual([
      "attack",
      "operation",
    ]);
  });

  it("protects legacy saved cards but keeps fallback cards pristine", () => {
    const legacyStorage = {
      getItem: (key: string) => key === STORAGE_KEY ? JSON.stringify(DEFAULT_CARD) : null,
      setItem: () => undefined,
    };
    const emptyStorage = {
      getItem: () => null,
      setItem: () => undefined,
    };

    expect(loadDraftCardState(legacyStorage, DEFAULT_CARD).hasUserEdits).toBe(true);
    expect(loadDraftCardState(emptyStorage, DEFAULT_CARD).hasUserEdits).toBe(false);
  });

  it("recovers a protected legacy card when the atomic state is corrupted", () => {
    const legacyCard = { ...DEFAULT_CARD, title: "LEGACY AUTHORED" };
    const storage = {
      getItem: (key: string) => {
        if (key === DRAFT_STATE_STORAGE_KEY) return "{";
        if (key === STORAGE_KEY) return JSON.stringify(legacyCard);
        return null;
      },
      setItem: () => undefined,
    };

    expect(loadDraftCardState(storage, DEFAULT_CARD)).toMatchObject({
      card: { title: "LEGACY AUTHORED" },
      hasUserEdits: true,
    });
  });

  it("keeps the previous atomic state when a save fails", () => {
    const previousState = {
      card: DEFAULT_CARD,
      hasUserEdits: false,
    };
    const values = new Map<string, string>([
      [DRAFT_STATE_STORAGE_KEY, JSON.stringify(previousState)],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        throw new DOMException(`Write blocked for ${key}: ${value.length}`, "QuotaExceededError");
      },
    };

    expect(saveDraftCard(storage, { ...DEFAULT_CARD, title: "AUTHORED" }, true)).toBe(false);
    expect(loadDraftCardState(storage, DEFAULT_CARD)).toEqual({
      card: DEFAULT_CARD,
      hasUserEdits: false,
      clearedNumericFields: [],
    });
  });
});
