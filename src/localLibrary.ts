import { normalizeCardSpec } from "./cardModel";
import { toAutosaveCard } from "./storage";
import type { CardSpec } from "./types";

export const LOCAL_LIBRARY_FILE_NAME = "card-forge-library.json";
const LOCAL_LIBRARY_DB = "card-forge-local-library";
const LOCAL_LIBRARY_STORE = "handles";
const LOCAL_LIBRARY_HANDLE_KEY = "library-directory";

export type CardLibraryEntry = {
  id: string;
  title: string;
  kind: string;
  nation: string;
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
  return typeof (window as WindowWithDirectoryPicker).showDirectoryPicker === "function";
}

export async function pickWritableDirectory(): Promise<LocalDirectoryHandle> {
  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (!picker) {
    throw new Error("Directory export is not supported in this browser.");
  }
  return picker({ mode: "readwrite" });
}

export async function readLocalLibrary(directory: LocalDirectoryHandle): Promise<CardLibraryFile> {
  await ensureReadWritePermission(directory);
  const fileHandle = await directory.getFileHandle(LOCAL_LIBRARY_FILE_NAME, { create: true });
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    return createEmptyLibrary();
  }

  return normalizeCardLibrary(JSON.parse(await file.text()));
}

export async function saveCardToLocalLibrary(
  directory: LocalDirectoryHandle,
  card: CardSpec,
): Promise<CardLibraryFile> {
  const library = await readLocalLibrary(directory);
  const nextLibrary: CardLibraryFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    cards: [...library.cards, createCardLibraryEntry(card)],
  };
  await writeLocalLibrary(directory, nextLibrary);
  return nextLibrary;
}

export async function writeBlobToDirectory(
  directory: LocalDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> {
  await ensureReadWritePermission(directory);
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

export function createCardLibraryEntry(card: CardSpec): CardLibraryEntry {
  const normalizedCard = normalizeCardSpec(toAutosaveCard(card));
  const updatedAt = new Date().toISOString();
  return {
    id: `${updatedAt}-${safeRecordId(normalizedCard.title)}`,
    title: normalizedCard.title,
    kind: normalizedCard.kind,
    nation: normalizedCard.nation,
    set: normalizedCard.set,
    updatedAt,
    card: normalizedCard,
  };
}

export function normalizeCardLibrary(input: unknown): CardLibraryFile {
  if (!isRecord(input)) {
    return createEmptyLibrary();
  }

  const rawCards = Array.isArray(input.cards) ? input.cards : [];
  const cards = rawCards
    .filter(isRecord)
    .map((rawCard): CardLibraryEntry => {
      const card = normalizeCardSpec(rawCard.card);
      return {
        id: typeof rawCard.id === "string" && rawCard.id ? rawCard.id : createCardLibraryEntry(card).id,
        title: typeof rawCard.title === "string" && rawCard.title ? rawCard.title : card.title,
        kind: card.kind,
        nation: card.nation,
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

async function ensureReadWritePermission(directory: LocalDirectoryHandle): Promise<void> {
  if (!directory.queryPermission || !directory.requestPermission) {
    return;
  }

  const currentPermission = await directory.queryPermission({ mode: "readwrite" });
  if (currentPermission === "granted") {
    return;
  }

  const nextPermission = await directory.requestPermission({ mode: "readwrite" });
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

function safeRecordId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "") || "custom-card";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
