import type { CardEditorState } from "./cardEditorState";
import { MAX_DATA_URL_LENGTH } from "./limits";
import type { CardAppearance, CardSpec, CardTextAppearance } from "./types";

export const EDITOR_HISTORY_LIMIT = 50;
export const EDITOR_HISTORY_MERGE_WINDOW_MS = 750;
export const EDITOR_HISTORY_ARTWORK_BUDGET_CHARS = MAX_DATA_URL_LENGTH * 3;

export type AuthoredEditorSnapshot = Omit<CardEditorState, "artworkRevision">;

export type EditorHistory = {
  past: AuthoredEditorSnapshot[];
  present: CardEditorState;
  future: AuthoredEditorSnapshot[];
  lastMerge: {
    key: string;
    timestamp: number;
  } | null;
};

export type EditorHistoryCommitOptions = {
  mergeKey?: string;
  timestamp?: number;
};

type HistoryShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export type EditorHistoryShortcut = "undo" | "redo";

export function createEditorHistory(present: CardEditorState): EditorHistory {
  return {
    past: [],
    present,
    future: [],
    lastMerge: null,
  };
}

export function commitEditorHistory(
  history: EditorHistory,
  next: CardEditorState,
  options: EditorHistoryCommitOptions = {},
): EditorHistory {
  const nextSnapshot = createAuthoredEditorSnapshot(next);
  if (areAuthoredEditorSnapshotsEqual(
    createAuthoredEditorSnapshot(history.present),
    nextSnapshot,
  )) {
    return history;
  }

  const timestamp = options.timestamp ?? Date.now();
  const lastMerge = history.lastMerge;
  const canMerge = options.mergeKey !== undefined
    && lastMerge !== null
    && lastMerge.key === options.mergeKey
    && timestamp - lastMerge.timestamp <= EDITOR_HISTORY_MERGE_WINDOW_MS;
  const nextPresent = {
    ...next,
    artworkRevision: Math.max(
      next.artworkRevision,
      history.present.artworkRevision + 1,
    ),
  };

  if (canMerge) {
    const transactionBaseline = history.past.at(-1);
    if (transactionBaseline
      && areAuthoredEditorSnapshotsEqual(transactionBaseline, nextSnapshot)) {
      return trimEditorHistoryArtwork({
        past: history.past.slice(0, -1),
        present: nextPresent,
        future: [],
        lastMerge: null,
      });
    }
  }

  return trimEditorHistoryArtwork({
    past: canMerge
      ? history.past
      : [...history.past, createAuthoredEditorSnapshot(history.present)].slice(-EDITOR_HISTORY_LIMIT),
    present: nextPresent,
    future: [],
    lastMerge: options.mergeKey
      ? { key: options.mergeKey, timestamp }
      : null,
  });
}

export function replaceEditorHistoryPresent(
  history: EditorHistory,
  next: CardEditorState,
): EditorHistory {
  return history.present === next
    ? history
    : trimEditorHistoryArtwork({ ...history, present: next });
}

export function undoEditorHistory(history: EditorHistory): EditorHistory {
  const previous = history.past.at(-1);
  if (!previous) {
    return history;
  }

  return trimEditorHistoryArtwork({
    past: history.past.slice(0, -1),
    present: restoreAuthoredEditorSnapshot(previous, history.present.artworkRevision),
    future: [createAuthoredEditorSnapshot(history.present), ...history.future],
    lastMerge: null,
  });
}

export function redoEditorHistory(history: EditorHistory): EditorHistory {
  const next = history.future[0];
  if (!next) {
    return history;
  }

  return trimEditorHistoryArtwork({
    past: [...history.past, createAuthoredEditorSnapshot(history.present)].slice(-EDITOR_HISTORY_LIMIT),
    present: restoreAuthoredEditorSnapshot(next, history.present.artworkRevision),
    future: history.future.slice(1),
    lastMerge: null,
  });
}

export function trimEditorHistoryArtwork(
  history: EditorHistory,
  budgetChars = EDITOR_HISTORY_ARTWORK_BUDGET_CHARS,
): EditorHistory {
  const budget = Number.isFinite(budgetChars) ? Math.max(0, Math.floor(budgetChars)) : EDITOR_HISTORY_ARTWORK_BUDGET_CHARS;
  const retainedUrls = new Set<string>();
  let retainedChars = 0;

  const retainCard = (card: CardSpec, required = false): boolean => {
    const dataUrl = card.artwork.source === "upload" ? card.artwork.dataUrl : undefined;
    if (!dataUrl || retainedUrls.has(dataUrl)) {
      return true;
    }
    if (!required && retainedChars + dataUrl.length > budget) {
      return false;
    }
    retainedUrls.add(dataUrl);
    retainedChars += dataUrl.length;
    return true;
  };

  retainCard(history.present.card, true);
  const retainedPast = new Set<number>();
  const retainedFuture = new Set<number>();
  const maxDistance = Math.max(history.past.length, history.future.length);
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const pastIndex = history.past.length - distance;
    if (pastIndex >= 0 && retainCard(history.past[pastIndex].card)) {
      retainedPast.add(pastIndex);
    }
    const futureIndex = distance - 1;
    if (futureIndex < history.future.length && retainCard(history.future[futureIndex].card)) {
      retainedFuture.add(futureIndex);
    }
  }

  if (retainedPast.size === history.past.length && retainedFuture.size === history.future.length) {
    return history;
  }
  return {
    ...history,
    past: history.past.filter((_, index) => retainedPast.has(index)),
    future: history.future.filter((_, index) => retainedFuture.has(index)),
  };
}

export function getEditorHistoryShortcut(event: HistoryShortcutEvent): EditorHistoryShortcut | null {
  if (event.altKey || (!event.ctrlKey && !event.metaKey)) {
    return null;
  }

  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (key === "y" && !event.shiftKey) {
    return "redo";
  }
  return null;
}

export function isEditableHistoryTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const candidate = target as { tagName?: unknown; isContentEditable?: unknown };
  if (candidate.isContentEditable === true) {
    return true;
  }
  if (typeof candidate.tagName !== "string") {
    return false;
  }
  return ["INPUT", "TEXTAREA", "SELECT"].includes(candidate.tagName.toUpperCase());
}

function createAuthoredEditorSnapshot(state: CardEditorState): AuthoredEditorSnapshot {
  if (state.artworkOrigin.kind !== "auto-reference") {
    return {
      card: state.card,
      hasUserEdits: state.hasUserEdits,
      clearedNumericFields: state.clearedNumericFields,
      artworkOrigin: state.artworkOrigin,
    };
  }

  return {
    card: {
      ...state.card,
      artwork: {
        source: "none",
        crop: { x: 0, y: 0, scale: 1 },
      },
    },
    hasUserEdits: state.hasUserEdits,
    clearedNumericFields: state.clearedNumericFields,
    artworkOrigin: { kind: "none" },
  };
}

function restoreAuthoredEditorSnapshot(
  snapshot: AuthoredEditorSnapshot,
  currentArtworkRevision: number,
): CardEditorState {
  return {
    ...snapshot,
    artworkRevision: currentArtworkRevision + 1,
  };
}

function areAuthoredEditorSnapshotsEqual(
  left: AuthoredEditorSnapshot,
  right: AuthoredEditorSnapshot,
): boolean {
  return left.hasUserEdits === right.hasUserEdits
    && areStringArraysEqual(left.clearedNumericFields, right.clearedNumericFields)
    && areArtworkOriginsEqual(left.artworkOrigin, right.artworkOrigin)
    && areCardsEqual(left.card, right.card);
}

function areArtworkOriginsEqual(
  left: CardEditorState["artworkOrigin"],
  right: CardEditorState["artworkOrigin"],
): boolean {
  return left.kind === right.kind
    && (left.kind !== "auto-reference"
      || (right.kind === "auto-reference" && left.sampleId === right.sampleId));
}

function areCardsEqual(left: CardSpec, right: CardSpec): boolean {
  return left.version === right.version
    && left.keywordLanguage === right.keywordLanguage
    && left.kind === right.kind
    && left.nation === right.nation
    && left.rarity === right.rarity
    && left.set === right.set
    && left.title === right.title
    && left.body === right.body
    && left.keywordLine === right.keywordLine
    && areStringArraysEqual(left.keywords, right.keywords)
    && left.costs.deployment === right.costs.deployment
    && left.costs.operation === right.costs.operation
    && left.stats.attack === right.stats.attack
    && left.stats.defense === right.stats.defense
    && left.stats.hqDefense === right.stats.hqDefense
    && left.artwork.source === right.artwork.source
    && left.artwork.dataUrl === right.artwork.dataUrl
    && left.artwork.crop.x === right.artwork.crop.x
    && left.artwork.crop.y === right.artwork.crop.y
    && left.artwork.crop.scale === right.artwork.crop.scale
    && areAppearancesEqual(left.appearance, right.appearance);
}

function areAppearancesEqual(left: CardAppearance, right: CardAppearance): boolean {
  return left.texture.seed === right.texture.seed
    && left.texture.intensity === right.texture.intensity
    && left.texture.randomness === right.texture.randomness
    && left.texture.mottle === right.texture.mottle
    && left.text.title.bold === right.text.title.bold
    && areTextAppearancesEqual(left.text.title, right.text.title)
    && areTextAppearancesEqual(left.text.keywords, right.text.keywords)
    && areTextAppearancesEqual(left.text.body, right.text.body);
}

function areTextAppearancesEqual(left: CardTextAppearance, right: CardTextAppearance): boolean {
  return left.fontScale === right.fontScale
    && left.scaleX === right.scaleX
    && left.scaleY === right.scaleY
    && left.offsetX === right.offsetX
    && left.offsetY === right.offsetY;
}

function areStringArraysEqual(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}
