import { normalizeCardSpec } from "./cardModel";
import { MAX_LOCAL_LIBRARY_CARDS, MAX_LOCAL_LIBRARY_FILE_BYTES } from "./limits";
import { toAutosaveCard } from "./storage";
import type { CardSpec } from "./types";

export const LOCAL_LIBRARY_FILE_NAME = "card-forge-library.json";
const LOCAL_LIBRARY_DB = "card-forge-local-library";
const LOCAL_LIBRARY_STORE = "handles";
const LOCAL_LIBRARY_HANDLE_KEY = "library-directory";
const LOCAL_LIBRARY_WRITE_LOCK = "card-forge-local-library-write";

export type CardLibraryEntry = {
  id: string;
  title: string;
  kind: string;
  nation: string;
  rarity: string;
  set: string;
  updatedAt: string;
  card: CardSpec;
};

export type CardLibraryFile = {
  version: 1;
  updatedAt: string;
  cards: CardLibraryEntry[];
};

export type LocalDirectoryHandle = {
  name: string;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<{
    getFile(): Promise<File>;
    createWritable(): Promise<{
      write(data: Blob | string): Promise<void>;
      close(): Promise<void>;
    }>;
  }>;
  queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<LocalDirectoryHandle>;
};

export function isDirectoryPickerAvailable(): boolean {
  return typeof window !== "undefined"
    && typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === "function";
}

export async function pickWritableDirectory(): Promise<LocalDirectoryHandle> {
  return pickDirectory("readwrite");
}

export async function pickReadableDirectory(): Promise<LocalDirectoryHandle> {
  return pickDirectory("read");
}

async function pickDirectory(mode: "read" | "readwrite"): Promise<LocalDirectoryHandle> {
  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (!picker) {
    throw new Error("Directory export is not supported in this browser.");
  }
  return picker({ mode });
}

export async function readLocalLibrary(directory: LocalDirectoryHandle): Promise<CardLibraryFile> {
  await ensurePermission(directory, "read");
  let fileHandle: Awaited<ReturnType<LocalDirectoryHandle["getFileHandle"]>>;
  try {
    fileHandle = await directory.getFileHandle(LOCAL_LIBRARY_FILE_NAME);
  } catch (error) {
    if (isNotFoundError(error)) {
      return createEmptyLibrary();
    }
    throw error;
  }
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    throw new Error("Local library file is empty or damaged.");
  }
  if (file.size > MAX_LOCAL_LIBRARY_FILE_BYTES) {
    throw new Error("Local library file is too large.");
  }

  return normalizeCardLibrary(JSON.parse(await file.text()));
}

export async function createCardInLocalLibrary(
  directory: LocalDirectoryHandle,
  card: CardSpec,
): Promise<CardLibraryFile> {
  return withLocalLibraryWriteLock(async () => {
    const library = await readLocalLibrary(directory);
    const nextLibrary: CardLibraryFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      cards: [...library.cards, createCardLibraryEntry(card)].slice(-MAX_LOCAL_LIBRARY_CARDS),
    };
    await writeLocalLibrary(directory, nextLibrary);
    return nextLibrary;
  });
}

export async function updateCardInLocalLibrary(
  directory: LocalDirectoryHandle,
  entryId: string,
  card: CardSpec,
): Promise<CardLibraryFile> {
  return withLocalLibraryWriteLock(async () => {
    const library = await readLocalLibrary(directory);
    const entryIndex = library.cards.findIndex((entry) => entry.id === entryId);
    if (entryIndex === -1) {
      throw new Error("Local library card was not found.");
    }
    const nextEntry = createCardLibraryEntry(card, entryId);
    const nextLibrary: CardLibraryFile = {
      version: 1,
      updatedAt: nextEntry.updatedAt,
      cards: [
        ...library.cards.slice(0, entryIndex),
        ...library.cards.slice(entryIndex + 1),
        nextEntry,
      ].slice(-MAX_LOCAL_LIBRARY_CARDS),
    };
    await writeLocalLibrary(directory, nextLibrary);
    return nextLibrary;
  });
}

export async function deleteCardFromLocalLibrary(
  directory: LocalDirectoryHandle,
  entryId: string,
): Promise<CardLibraryFile> {
  return withLocalLibraryWriteLock(async () => {
    const library = await readLocalLibrary(directory);
    const cards = library.cards.filter((entry) => entry.id !== entryId);
    if (cards.length === library.cards.length) {
      throw new Error("Local library card was not found.");
    }
    const nextLibrary: CardLibraryFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      cards,
    };
    await writeLocalLibrary(directory, nextLibrary);
    return nextLibrary;
  });
}

export function isLocalLibraryWriteAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.locks);
}

export async function requestDirectoryWritePermission(
  directory: LocalDirectoryHandle,
): Promise<void> {
  return requestLocalLibraryPermission(directory, "readwrite");
}

export async function requestLocalLibraryReadPermission(
  directory: LocalDirectoryHandle,
): Promise<void> {
  return requestLocalLibraryPermission(directory, "read");
}

async function requestLocalLibraryPermission(
  directory: LocalDirectoryHandle,
  mode: "read" | "readwrite",
): Promise<void> {
  if (!directory.requestPermission) {
    return;
  }
  const permission = await directory.requestPermission({ mode });
  if (permission !== "granted") {
    throw new Error("Local folder permission was not granted.");
  }
}

export function reconcileActiveLibraryEntryId(
  activeEntryId: string | null,
  library: Pick<CardLibraryFile, "cards">,
): string | null {
  return activeEntryId && library.cards.some((entry) => entry.id === activeEntryId)
    ? activeEntryId
    : null;
}

function withLocalLibraryWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new Error("Local library saves require browser Web Locks support.");
  }
  return navigator.locks.request(LOCAL_LIBRARY_WRITE_LOCK, operation).then((result) => result);
}

export async function writeBlobToDirectory(
  directory: LocalDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> {
  await ensurePermission(directory, "readwrite");
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function saveLibraryDirectoryHandle(directory: LocalDirectoryHandle): Promise<void> {
  const database = await openLibraryDatabase();
  try {
    await runStoreRequest(database, "readwrite", (store) => store.put(directory, LOCAL_LIBRARY_HANDLE_KEY));
  } finally {
    database.close();
  }
}

export async function loadSavedLibraryDirectoryHandle(): Promise<LocalDirectoryHandle | null> {
  const database = await openLibraryDatabase();
  try {
    const handle = await runStoreRequest<unknown>(database, "readonly", (store) => store.get(LOCAL_LIBRARY_HANDLE_KEY));
    return isLocalDirectoryHandle(handle) ? handle : null;
  } finally {
    database.close();
  }
}

export function createCardLibraryEntry(card: CardSpec, id: string = crypto.randomUUID()): CardLibraryEntry {
  const normalizedCard = normalizeCardSpec(toAutosaveCard(card));
  const updatedAt = new Date().toISOString();
  return {
    id,
    title: normalizedCard.title,
    kind: normalizedCard.kind,
    nation: normalizedCard.nation,
    rarity: normalizedCard.rarity,
    set: normalizedCard.set,
    updatedAt,
    card: normalizedCard,
  };
}

export function normalizeCardLibrary(input: unknown): CardLibraryFile {
  if (!isRecord(input)) {
    throw new Error("Local library has an invalid top-level structure.");
  }
  if (input.version !== 1) {
    throw new Error("Local library version is not supported.");
  }
  if (!Array.isArray(input.cards)) {
    throw new Error("Local library cards must be an array.");
  }

  const usedIds = new Set<string>();
  const rawCards = input.cards.slice(-MAX_LOCAL_LIBRARY_CARDS);
  const cards = rawCards
    .filter(isRecord)
    .map((rawCard): CardLibraryEntry => {
      const card = toAutosaveCard(normalizeCardSpec(rawCard.card));
      const rawId = typeof rawCard.id === "string" ? rawCard.id.trim() : "";
      const id = rawId && !usedIds.has(rawId) ? rawId : crypto.randomUUID();
      usedIds.add(id);
      return {
        id,
        title: typeof rawCard.title === "string" && rawCard.title ? rawCard.title : card.title,
        kind: card.kind,
        nation: card.nation,
        rarity: card.rarity,
        set: card.set,
        updatedAt: typeof rawCard.updatedAt === "string" ? rawCard.updatedAt : new Date().toISOString(),
        card,
      };
    });

  return {
    version: 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
    cards,
  };
}

function writeLocalLibrary(directory: LocalDirectoryHandle, library: CardLibraryFile): Promise<void> {
  const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
  return writeBlobToDirectory(directory, LOCAL_LIBRARY_FILE_NAME, blob);
}

async function ensurePermission(directory: LocalDirectoryHandle, mode: "read" | "readwrite"): Promise<void> {
  if (!directory.queryPermission || !directory.requestPermission) {
    return;
  }

  const currentPermission = await directory.queryPermission({ mode });
  if (currentPermission === "granted") {
    return;
  }

  const nextPermission = await directory.requestPermission({ mode });
  if (nextPermission !== "granted") {
    throw new Error("Local folder permission was not granted.");
  }
}

function openLibraryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_LIBRARY_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(LOCAL_LIBRARY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local library storage."));
  });
}

function runStoreRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_LIBRARY_STORE, mode);
    let requestResult: T;
    const request = createRequest(transaction.objectStore(LOCAL_LIBRARY_STORE));
    request.onsuccess = () => {
      requestResult = request.result;
    };
    request.onerror = () => reject(request.error ?? new Error("Could not update local library storage."));
    transaction.oncomplete = () => resolve(requestResult);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not update local library storage."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not update local library storage."));
  });
}

function isLocalDirectoryHandle(value: unknown): value is LocalDirectoryHandle {
  return isRecord(value) && typeof value.name === "string" && typeof value.getFileHandle === "function";
}

function createEmptyLibrary(): CardLibraryFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    cards: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.name === "NotFoundError";
}
