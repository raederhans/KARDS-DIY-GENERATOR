import { useEffect, useRef, useState } from "react";
import type { Language, UiText } from "../i18n";
import { localizeRuntimeMessage, translatePresetLabel } from "../i18n";
import {
  createCardInLocalLibrary,
  deleteCardFromLocalLibrary,
  isDirectoryPickerAvailable,
  isLocalLibraryWriteAvailable,
  loadSavedLibraryDirectoryHandle,
  pickReadableDirectory,
  readLocalLibrary,
  reconcileActiveLibraryEntryId,
  requestDirectoryWritePermission,
  requestLocalLibraryReadPermission,
  saveLibraryDirectoryHandle,
  updateCardInLocalLibrary,
  type CardLibraryEntry,
  type CardLibraryFile,
  type LocalDirectoryHandle,
} from "../localLibrary";
import type { CardSpec } from "../types";
import { CARD_KINDS, NATIONS, SETS } from "../presets";

type LibraryNotice =
  | { kind: "remembered"; name: string }
  | { kind: "ready"; name: string; count: number }
  | { kind: "saved"; name: string; count: number }
  | { kind: "updated" }
  | { kind: "deleted" };

type LocalLibraryWorkbenchProps = {
  card: CardSpec;
  language: Language;
  text: UiText["projectPanel"];
  activeEntryId: string | null;
  onEntryLoad: (entry: CardLibraryEntry) => void;
  onActiveEntryChange: (entryId: string | null) => void;
  onDirectoryChange: () => void;
};

export function LocalLibraryWorkbench({
  card,
  language,
  text,
  activeEntryId,
  onEntryLoad,
  onActiveEntryChange,
  onDirectoryChange,
}: LocalLibraryWorkbenchProps) {
  const [directory, setDirectory] = useState<LocalDirectoryHandle | null>(null);
  const [library, setLibrary] = useState<CardLibraryFile | null>(null);
  const [notice, setNotice] = useState<LibraryNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const directoryRequestRef = useRef(0);
  const pickerAvailable = isDirectoryPickerAvailable();
  const writeAvailable = isLocalLibraryWriteAvailable();
  const activeEntryExists = Boolean(activeEntryId && library?.cards.some((entry) => entry.id === activeEntryId));

  useEffect(() => {
    if (!pickerAvailable) {
      return;
    }
    const requestId = directoryRequestRef.current + 1;
    directoryRequestRef.current = requestId;
    void loadSavedLibraryDirectoryHandle()
      .then((savedDirectory) => {
        if (requestId === directoryRequestRef.current && savedDirectory) {
          setDirectory(savedDirectory);
          setNotice({ kind: "remembered", name: savedDirectory.name });
        }
      })
      .catch(() => undefined);
    return () => {
      if (requestId === directoryRequestRef.current) {
        directoryRequestRef.current += 1;
      }
    };
  }, [pickerAvailable]);

  async function openLibrary() {
    if (pending) {
      return;
    }
    const requestId = directoryRequestRef.current + 1;
    directoryRequestRef.current = requestId;
    try {
      setPending(true);
      setError(null);
      if (directory) {
        await requestLocalLibraryReadPermission(directory);
      }
      const selectedDirectory = directory ?? await pickReadableDirectory();
      if (!directory) {
        onDirectoryChange();
      }
      const nextLibrary = await readLocalLibrary(selectedDirectory);
      if (requestId !== directoryRequestRef.current) return;
      setDirectory(selectedDirectory);
      setLibrary(nextLibrary);
      clearStaleActiveLibraryEntry(activeEntryId, nextLibrary, onActiveEntryChange);
      setNotice({ kind: "ready", name: selectedDirectory.name, count: nextLibrary.cards.length });
      if (!directory) {
        try {
          await saveLibraryDirectoryHandle(selectedDirectory);
        } catch {
          setError("library-remember-failed");
        }
      }
    } catch (openError) {
      if (requestId === directoryRequestRef.current) {
        setError(toErrorMessage(openError));
      }
    } finally {
      if (requestId === directoryRequestRef.current) {
        setPending(false);
      }
    }
  }

  async function chooseLibrary() {
    if (pending) {
      return;
    }
    const requestId = directoryRequestRef.current + 1;
    directoryRequestRef.current = requestId;
    try {
      setPending(true);
      setError(null);
      const selectedDirectory = await pickReadableDirectory();
      const nextLibrary = await readLocalLibrary(selectedDirectory);
      if (requestId !== directoryRequestRef.current) return;
      onDirectoryChange();
      onActiveEntryChange(null);
      setDirectory(selectedDirectory);
      setLibrary(nextLibrary);
      setNotice({ kind: "ready", name: selectedDirectory.name, count: nextLibrary.cards.length });
      try {
        await saveLibraryDirectoryHandle(selectedDirectory);
      } catch {
        setError("library-remember-failed");
      }
    } catch (chooseError) {
      if (requestId === directoryRequestRef.current) {
        setError(toErrorMessage(chooseError));
      }
    } finally {
      if (requestId === directoryRequestRef.current) {
        setPending(false);
      }
    }
  }

  async function createEntry() {
    if (!directory || !writeAvailable) {
      return;
    }
    await runWrite(async () => {
      const nextLibrary = await createCardInLocalLibrary(directory, card);
      const entry = nextLibrary.cards.at(-1) ?? null;
      setLibrary(nextLibrary);
      onActiveEntryChange(entry?.id ?? null);
      setNotice({ kind: "saved", name: directory.name, count: nextLibrary.cards.length });
    });
  }

  async function updateEntry() {
    if (!directory || !writeAvailable || !activeEntryId || !activeEntryExists) {
      return;
    }
    await runWrite(async () => {
      const nextLibrary = await updateCardInLocalLibrary(directory, activeEntryId, card);
      setLibrary(nextLibrary);
      setNotice({ kind: "updated" });
    });
  }

  async function deleteEntry(entry: CardLibraryEntry) {
    if (!directory || !writeAvailable || !window.confirm(text.libraryDeleteConfirm(entry.title))) {
      return;
    }
    await runWrite(async () => {
      const nextLibrary = await deleteCardFromLocalLibrary(directory, entry.id);
      setLibrary(nextLibrary);
      if (activeEntryId === entry.id) {
        onActiveEntryChange(null);
      }
      setNotice({ kind: "deleted" });
    });
  }

  async function runWrite(operation: () => Promise<void>) {
    try {
      setPending(true);
      setError(null);
      if (!directory) {
        return;
      }
      await requestDirectoryWritePermission(directory);
      await operation();
    } catch (writeError) {
      setError(toErrorMessage(writeError));
      if (directory) {
        try {
          const latestLibrary = await readLocalLibrary(directory);
          setLibrary(latestLibrary);
          clearStaleActiveLibraryEntry(activeEntryId, latestLibrary, onActiveEntryChange);
        } catch {
          // Preserve the original write error; a failed refresh must not replace it.
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="local-library-workbench">
      <div className="export-stack two-up">
        <button type="button" disabled={!pickerAvailable || pending} onClick={openLibrary}>
          {text.openLibrary}
        </button>
        <button type="button" disabled={!pickerAvailable || pending} onClick={chooseLibrary}>
          {text.chooseLibraryDirectory}
        </button>
      </div>
      {!writeAvailable ? <p className="status-warning">{text.libraryReadOnly}</p> : null}
      {notice ? <p className="status-line" role="status" aria-live="polite">{renderNotice(notice, text)}</p> : null}
      {error ? <p className="status-warning" role="alert">{renderLibraryError(error, language, text)}</p> : null}

      {library ? (
        <>
          <div className="export-stack two-up">
            <button type="button" disabled={!writeAvailable || pending} onClick={createEntry}>
              {text.saveAsNew}
            </button>
            <button
              type="button"
              disabled={!writeAvailable || pending || !activeEntryExists}
              onClick={updateEntry}
            >
              {text.updateCurrent}
            </button>
          </div>
          {library.cards.length ? (
            <div className="library-entry-list">
              {[...library.cards].reverse().map((entry) => (
                <article className={entry.id === activeEntryId ? "library-entry is-active" : "library-entry"} key={entry.id}>
                  <div>
                    <strong>{entry.title}</strong>
                    <span>{formatLibraryEntryMetadata(entry, language)}</span>
                    {entry.id === activeEntryId ? <em>{text.libraryCurrent}</em> : null}
                  </div>
                  <div className="library-entry-actions">
                    <button type="button" disabled={pending} onClick={() => onEntryLoad(entry)}>{text.loadLibraryEntry}</button>
                    <button type="button" disabled={!writeAvailable || pending} onClick={() => void deleteEntry(entry)}>
                      {text.deleteLibraryEntry}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="empty-state">{text.libraryEmpty}</p>}
        </>
      ) : <p className="empty-state">{text.libraryNotOpened}</p>}
    </div>
  );
}

export function formatLibraryEntryMetadata(entry: CardLibraryEntry, language: Language): string {
  const kind = CARD_KINDS.find((item) => item.id === entry.kind)?.label ?? entry.kind;
  const nation = NATIONS.find((item) => item.id === entry.nation)?.label ?? entry.nation;
  const set = SETS.find((item) => item.id === entry.set)?.label ?? entry.set;
  return [
    translatePresetLabel(language, "kind", entry.kind, kind),
    translatePresetLabel(language, "nation", entry.nation, nation),
    translatePresetLabel(language, "set", entry.set, set),
  ].join(" · ");
}

export function clearStaleActiveLibraryEntry(
  activeEntryId: string | null,
  library: Pick<CardLibraryFile, "cards">,
  onActiveEntryChange: (entryId: string | null) => void,
): void {
  if (reconcileActiveLibraryEntryId(activeEntryId, library) !== activeEntryId) {
    onActiveEntryChange(null);
  }
}

function renderNotice(notice: LibraryNotice, text: UiText["projectPanel"]): string {
  if (notice.kind === "remembered") return text.libraryRemembered(notice.name);
  if (notice.kind === "ready") return text.libraryReady(notice.name, notice.count);
  if (notice.kind === "saved") return text.librarySaved(notice.name, notice.count);
  if (notice.kind === "updated") return text.libraryUpdated;
  return text.libraryDeleted;
}

function renderLibraryError(error: string, language: Language, text: UiText["projectPanel"]): string {
  if (error === "library-remember-failed") return text.libraryRememberFailed;
  return localizeRuntimeMessage(language, error);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not update the local card library.";
}
