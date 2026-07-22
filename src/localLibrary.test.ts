import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import {
  createCardInLocalLibrary,
  createCardLibraryEntry,
  deleteCardFromLocalLibrary,
  normalizeCardLibrary,
  pickReadableDirectory,
  readLocalLibrary,
  reconcileActiveLibraryEntryId,
  requestDirectoryWritePermission,
  requestLocalLibraryReadPermission,
  saveLibraryDirectoryHandle,
  updateCardInLocalLibrary,
  type LocalDirectoryHandle,
} from "./localLibrary";
import type { CardSpec } from "./types";

describe("local card library records", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores card fields without embedding uploaded artwork data", () => {
    const card: CardSpec = {
      ...DEFAULT_CARD,
      title: "Library Tank",
      keywordLanguage: "en",
      appearance: {
        ...DEFAULT_CARD.appearance,
        texture: {
          seed: 789,
          intensity: 2,
          randomness: 1.6,
          mottle: 1.4,
        },
        text: {
          ...DEFAULT_CARD.appearance.text,
          title: {
            ...DEFAULT_CARD.appearance.text.title,
            fontScale: 1.15,
            scaleX: 0.9,
            offsetX: 12,
          },
        },
      },
      artwork: {
        source: "upload",
        dataUrl: "data:image/png;base64,large-image",
        crop: { x: 4, y: 5, scale: 1.1 },
      },
    };

    const entry = createCardLibraryEntry(card);

    expect(entry.title).toBe("Library Tank");
    expect(entry.card.artwork.source).toBe("none");
    expect(entry.card.artwork.dataUrl).toBeUndefined();
    expect(entry.card.artwork.crop).toEqual({ x: 4, y: 5, scale: 1.1 });
    expect(entry.card.appearance.texture).toEqual(card.appearance.texture);
    expect(entry.card.appearance.text.title).toEqual(card.appearance.text.title);
    expect(entry.card.keywordLanguage).toBe("en");
  });

  it("normalizes old or damaged library files instead of trusting raw JSON", () => {
    const library = normalizeCardLibrary({
      version: 1,
      updatedAt: "2026-07-04T00:00:00.000Z",
      cards: [
        {
          id: "saved-card",
          title: "Saved Card",
          updatedAt: "2026-07-04T00:00:00.000Z",
          card: {
            ...DEFAULT_CARD,
            title: "Saved Card",
            costs: { deployment: 99 },
            artwork: {
              source: "upload",
              dataUrl: "data:image/png;base64,legacy-library-image",
              crop: { x: 2, y: 3, scale: 1.2 },
            },
          },
        },
        null,
      ],
    });

    expect(library.cards).toHaveLength(1);
    expect(library.cards[0].id).toBe("saved-card");
    expect(library.cards[0].card.costs.deployment).toBe(99);
    expect(library.cards[0].card.artwork.source).toBe("none");
    expect(library.cards[0].card.artwork.dataUrl).toBeUndefined();
    expect(library.cards[0].card.artwork.crop).toEqual({ x: 2, y: 3, scale: 1.2 });
  });

  it("repairs missing and duplicate legacy ids while preserving valid ids", () => {
    const library = normalizeCardLibrary({
      version: 1,
      cards: [
        { id: "kept", card: { ...DEFAULT_CARD, title: "Kept" } },
        { id: "kept", card: { ...DEFAULT_CARD, title: "Duplicate" } },
        { card: { ...DEFAULT_CARD, title: "Missing" } },
      ],
    });

    expect(library.cards[0].id).toBe("kept");
    expect(new Set(library.cards.map((entry) => entry.id)).size).toBe(3);
    expect(library.cards.slice(1).every((entry) => entry.id.length > 0)).toBe(true);
  });

  it("rejects invalid top-level structures instead of converting them to an empty library", () => {
    expect(() => normalizeCardLibrary(null)).toThrow(/structure/i);
    expect(() => normalizeCardLibrary({ version: 2, cards: [] })).toThrow(/version/i);
    expect(() => normalizeCardLibrary({ version: 1, cards: "not-an-array" })).toThrow(/cards/i);
  });

  it("keeps only the most recent 200 cards when normalizing large local libraries", () => {
    const cards = Array.from({ length: 205 }, (_, index) => ({
      id: `card-${index}`,
      title: `Card ${index}`,
      updatedAt: "2026-07-04T00:00:00.000Z",
      card: {
        ...DEFAULT_CARD,
        title: `Card ${index}`,
      },
    }));

    const library = normalizeCardLibrary({ version: 1, cards });

    expect(library.cards).toHaveLength(200);
    expect(library.cards[0].id).toBe("card-5");
    expect(library.cards[199].id).toBe("card-204");
  });

  it("rejects oversized local library files before parsing JSON", async () => {
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(async () => ({
        getFile: async () => ({
          size: 2 * 1024 * 1024 + 1,
          text: vi.fn(async () => "{}"),
        }),
        createWritable: async () => ({
          write: vi.fn(async () => undefined),
          close: vi.fn(async () => undefined),
        }),
      })),
    } as unknown as LocalDirectoryHandle;

    await expect(readLocalLibrary(directory)).rejects.toThrow("Local library file is too large");
  });

  it("treats an existing zero-byte file as damaged instead of an empty library", async () => {
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(async () => ({
        getFile: async () => new File([], "card-forge-library.json"),
      })),
    } as unknown as LocalDirectoryHandle;

    await expect(readLocalLibrary(directory)).rejects.toThrow(/empty/i);
  });

  it("opens library directories with read permission before a write is requested", async () => {
    const directory = { name: "Cards" } as LocalDirectoryHandle;
    const picker = vi.fn(async () => directory);
    vi.stubGlobal("window", { showDirectoryPicker: picker });

    await expect(pickReadableDirectory()).resolves.toBe(directory);
    expect(picker).toHaveBeenCalledWith({ mode: "read" });
  });

  it("requests write permission directly before a user-initiated library write", async () => {
    const requestPermission = vi.fn(async () => "granted" as PermissionState);
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(),
      requestPermission,
    } as unknown as LocalDirectoryHandle;

    await expect(requestDirectoryWritePermission(directory)).resolves.toBeUndefined();
    expect(requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
  });

  it("requests remembered-directory read permission only from the explicit open action", async () => {
    const requestPermission = vi.fn(async () => "granted" as PermissionState);
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(),
      requestPermission,
    } as unknown as LocalDirectoryHandle;

    await expect(requestLocalLibraryReadPermission(directory)).resolves.toBeUndefined();
    expect(requestPermission).toHaveBeenCalledWith({ mode: "read" });
  });

  it("clears stale active ids after the opened library changes", () => {
    const entry = createCardLibraryEntry(DEFAULT_CARD, "current");
    expect(reconcileActiveLibraryEntryId("current", { cards: [entry] })).toBe("current");
    expect(reconcileActiveLibraryEntryId("missing", { cards: [entry] })).toBeNull();
    expect(reconcileActiveLibraryEntryId(null, { cards: [entry] })).toBeNull();
  });

  it("serializes overlapping saves to the same directory without losing either card", async () => {
    let libraryJson = JSON.stringify({
      version: 1,
      updatedAt: "2026-07-09T00:00:00.000Z",
      cards: [],
    });
    const fileHandle = {
      getFile: vi.fn(async () => {
        const snapshot = libraryJson;
        return new File([snapshot], "card-forge-library.json", { type: "application/json" });
      }),
      createWritable: vi.fn(async () => ({
        write: vi.fn(async (data: Blob | string) => {
          libraryJson = typeof data === "string" ? data : await data.text();
        }),
        close: vi.fn(async () => undefined),
      })),
    };
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(async () => fileHandle),
    } as unknown as LocalDirectoryHandle;

    let lockTail = Promise.resolve();
    const requestLock = vi.fn(<T>(_name: string, operation: () => Promise<T>): Promise<T> => {
      const result = lockTail.then(operation);
      lockTail = result.then(() => undefined, () => undefined);
      return result;
    });
    vi.stubGlobal("navigator", { locks: { request: requestLock } });

    await Promise.all([
      createCardInLocalLibrary(directory, { ...DEFAULT_CARD, title: "First Save" }),
      createCardInLocalLibrary(directory, { ...DEFAULT_CARD, title: "Second Save" }),
    ]);

    const savedLibrary = normalizeCardLibrary(JSON.parse(libraryJson));
    expect(savedLibrary.cards.map((entry) => entry.title)).toEqual(["First Save", "Second Save"]);
    expect(requestLock).toHaveBeenCalledTimes(2);
  });

  it("fails explicitly when the browser cannot provide cross-tab write locking", async () => {
    vi.stubGlobal("navigator", {});
    const directory = { name: "Cards" } as LocalDirectoryHandle;

    await expect(createCardInLocalLibrary(directory, DEFAULT_CARD)).rejects.toThrow(/Web Locks/i);
  });

  it("allows browsing without Web Locks and without creating a missing file", async () => {
    vi.stubGlobal("navigator", {});
    const notFound = Object.assign(new Error("missing"), { name: "NotFoundError" });
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(async () => Promise.reject(notFound)),
    } as unknown as LocalDirectoryHandle;

    await expect(readLocalLibrary(directory)).resolves.toMatchObject({ version: 1, cards: [] });
    expect(directory.getFileHandle).toHaveBeenCalledWith("card-forge-library.json");
  });

  it("creates, updates, and deletes by id using the latest locked file contents", async () => {
    const { directory, readJson, writableFactory } = createMemoryLibraryDirectory();
    installSerialWebLock();

    const created = await createCardInLocalLibrary(directory, { ...DEFAULT_CARD, title: "First" });
    const id = created.cards[0].id;
    const updated = await updateCardInLocalLibrary(directory, id, {
      ...DEFAULT_CARD,
      title: "Renamed",
      nation: "japan",
    });
    const deleted = await deleteCardFromLocalLibrary(directory, id);

    expect(updated.cards).toHaveLength(1);
    expect(updated.cards[0]).toMatchObject({ id, title: "Renamed", nation: "japan" });
    expect(deleted.cards).toEqual([]);
    expect(normalizeCardLibrary(readJson()).cards).toEqual([]);
    expect(writableFactory).toHaveBeenCalledTimes(3);
  });

  it("does not overwrite malformed JSON during any CRUD operation", async () => {
    const writableFactory = vi.fn();
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(async () => ({
        getFile: async () => new File(["{broken"], "card-forge-library.json"),
        createWritable: writableFactory,
      })),
    } as unknown as LocalDirectoryHandle;
    installSerialWebLock();

    await expect(createCardInLocalLibrary(directory, DEFAULT_CARD)).rejects.toThrow();
    await expect(updateCardInLocalLibrary(directory, "saved", DEFAULT_CARD)).rejects.toThrow();
    await expect(deleteCardFromLocalLibrary(directory, "saved")).rejects.toThrow();
    expect(writableFactory).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty file", () => new File([], "card-forge-library.json")],
    ["an oversized file", () => ({
      size: 2 * 1024 * 1024 + 1,
      text: vi.fn(async () => "{}"),
    })],
    ["an invalid top-level structure", () => new File(["[]"], "card-forge-library.json")],
  ])("never overwrites %s when a write is attempted", async (_label, createFile) => {
    const writableFactory = vi.fn();
    const directory = {
      name: "Cards",
      getFileHandle: vi.fn(async () => ({
        getFile: async () => createFile(),
        createWritable: writableFactory,
      })),
    } as unknown as LocalDirectoryHandle;
    installSerialWebLock();

    await expect(createCardInLocalLibrary(directory, DEFAULT_CARD)).rejects.toThrow();
    expect(writableFactory).not.toHaveBeenCalled();
  });

  it("serializes concurrent update/create and delete/stale-update races", async () => {
    const { directory, readJson } = createMemoryLibraryDirectory();
    installSerialWebLock();
    const created = await createCardInLocalLibrary(directory, { ...DEFAULT_CARD, title: "Original" });
    const id = created.cards[0].id;

    await Promise.all([
      updateCardInLocalLibrary(directory, id, { ...DEFAULT_CARD, title: "Updated" }),
      createCardInLocalLibrary(directory, { ...DEFAULT_CARD, title: "Second" }),
    ]);
    expect(normalizeCardLibrary(readJson()).cards.map((entry) => entry.title)).toEqual(["Updated", "Second"]);

    const [deleted, staleUpdate] = await Promise.allSettled([
      deleteCardFromLocalLibrary(directory, id),
      updateCardInLocalLibrary(directory, id, { ...DEFAULT_CARD, title: "Resurrected" }),
    ]);
    expect(deleted.status).toBe("fulfilled");
    expect(staleUpdate.status).toBe("rejected");
    expect(normalizeCardLibrary(readJson()).cards.map((entry) => entry.title)).toEqual(["Second"]);
  });

  it("does not recreate a record deleted by another locked operation", async () => {
    const { directory } = createMemoryLibraryDirectory();
    installSerialWebLock();
    const created = await createCardInLocalLibrary(directory, { ...DEFAULT_CARD, title: "First" });
    const id = created.cards[0].id;

    await deleteCardFromLocalLibrary(directory, id);
    await expect(updateCardInLocalLibrary(directory, id, { ...DEFAULT_CARD, title: "Stale" }))
      .rejects.toThrow(/not found/i);
  });

  it("waits for IndexedDB transaction completion before resolving saved handles", async () => {
    const putRequest = { result: "library-directory" } as IDBRequest<IDBValidKey>;
    const store = { put: vi.fn(() => putRequest) };
    const transaction = {
      objectStore: vi.fn(() => store),
      oncomplete: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onabort: null as (() => void) | null,
      error: null,
    };
    const database = {
      transaction: vi.fn(() => transaction),
      close: vi.fn(),
    };
    const openRequest = {
      result: database,
      onsuccess: null as ((event: Event) => void) | null,
    } as unknown as IDBOpenDBRequest;
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => openRequest),
    });

    let resolved = false;
    const savePromise = saveLibraryDirectoryHandle({
      name: "Cards",
      getFileHandle: vi.fn(),
    }).then(() => {
      resolved = true;
    });

    openRequest.onsuccess?.({} as Event);
    await Promise.resolve();
    putRequest.onsuccess?.({} as Event);
    await Promise.resolve();

    expect(resolved).toBe(false);

    transaction.oncomplete?.();
    await savePromise;

    expect(resolved).toBe(true);
    expect(store.put).toHaveBeenCalledWith(expect.objectContaining({ name: "Cards" }), "library-directory");
    expect(database.close).toHaveBeenCalledTimes(1);
  });
});

function createMemoryLibraryDirectory() {
  let libraryJson = JSON.stringify({ version: 1, updatedAt: "2026-07-09T00:00:00.000Z", cards: [] });
  const writableFactory = vi.fn(async () => ({
    write: vi.fn(async (data: Blob | string) => {
      libraryJson = typeof data === "string" ? data : await data.text();
    }),
    close: vi.fn(async () => undefined),
  }));
  const directory = {
    name: "Cards",
    getFileHandle: vi.fn(async () => ({
      getFile: async () => new File([libraryJson], "card-forge-library.json", { type: "application/json" }),
      createWritable: writableFactory,
    })),
  } as unknown as LocalDirectoryHandle;
  return { directory, writableFactory, readJson: () => JSON.parse(libraryJson) };
}

function installSerialWebLock() {
  let tail = Promise.resolve();
  const request = vi.fn(<T>(_name: string, operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  });
  vi.stubGlobal("navigator", { locks: { request } });
  return request;
}
