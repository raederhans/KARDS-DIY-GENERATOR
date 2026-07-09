import { describe, expect, it } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import { loadDraftCard, saveDraftCard, STORAGE_KEY, toAutosaveCard } from "./storage";
import type { CardSpec } from "./types";

describe("card draft storage", () => {
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
      getItem: () => JSON.stringify({ ...DEFAULT_CARD, title: "SAVED" }),
      setItem: () => undefined,
    };
    const invalidStorage = {
      getItem: () => "{",
      setItem: () => undefined,
    };

    expect(loadDraftCard(savedStorage, DEFAULT_CARD).title).toBe("SAVED");
    expect(loadDraftCard(invalidStorage, DEFAULT_CARD).title).toBe(DEFAULT_CARD.title);
  });

  it("cleans uploaded artwork from legacy drafts when loading", () => {
    const savedStorage = {
      getItem: () => JSON.stringify({
        ...DEFAULT_CARD,
        artwork: {
          source: "upload",
          dataUrl: "data:image/png;base64,legacy-image",
          crop: { x: 9, y: -4, scale: 1.3 },
        },
      }),
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

  it("writes under the versioned storage key", () => {
    let writtenKey = "";
    const storage = {
      getItem: () => null,
      setItem: (key: string) => {
        writtenKey = key;
      },
    };

    saveDraftCard(storage, DEFAULT_CARD);

    expect(writtenKey).toBe(STORAGE_KEY);
  });
});
