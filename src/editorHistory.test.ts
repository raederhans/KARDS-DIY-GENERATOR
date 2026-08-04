import { describe, expect, it } from "vitest";
import { DEFAULT_CARD, normalizeCardSpec } from "./cardModel";
import {
  applyAutomaticArtwork,
  applyUserArtworkIfRevisionMatches,
  applyUserCardUpdate,
  createCardEditorState,
} from "./cardEditorState";
import {
  EDITOR_HISTORY_LIMIT,
  commitEditorHistory,
  createEditorHistory,
  getEditorHistoryShortcut,
  isEditableHistoryTarget,
  redoEditorHistory,
  replaceEditorHistoryPresent,
  undoEditorHistory,
} from "./editorHistory";
import * as EditorHistoryModule from "./editorHistory";

describe("editor history", () => {
  it("undoes and redoes a complete authored editor state", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const edited = applyUserCardUpdate(initial, (card) => ({
      ...card,
      title: "Edited title",
    }));
    const committed = commitEditorHistory(createEditorHistory(initial), edited, {
      timestamp: 100,
    });

    const undone = undoEditorHistory(committed);
    expect(undone.present.card).toEqual(initial.card);
    expect(undone.present.artworkRevision).toBeGreaterThan(edited.artworkRevision);
    expect(undone.future.map((snapshot) => snapshot.card.title)).toEqual([edited.card.title]);

    const redone = redoEditorHistory(undone);
    expect(redone.present.card).toEqual(edited.card);
    expect(redone.present.artworkRevision).toBeGreaterThan(undone.present.artworkRevision);
    expect(redone.past.map((snapshot) => snapshot.card.title)).toEqual([initial.card.title]);
  });

  it("skips no-ops and clears redo after a new authored edit", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const first = applyUserCardUpdate(initial, (card) => ({ ...card, title: "First" }));
    const second = applyUserCardUpdate(initial, (card) => ({ ...card, title: "Second" }));
    const history = commitEditorHistory(createEditorHistory(initial), first, { timestamp: 100 });
    const undone = undoEditorHistory(history);

    expect(commitEditorHistory(undone, undone.present, { timestamp: 200 })).toBe(undone);

    const branched = commitEditorHistory(undone, second, { timestamp: 300 });
    expect(branched.future).toEqual([]);
    expect(branched.present.card).toEqual(second.card);
    expect(branched.present.artworkRevision).toBeGreaterThan(undone.present.artworkRevision);
  });

  it("coalesces a short burst in one field but keeps later or different edits separate", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const titleA = applyUserCardUpdate(initial, (card) => ({ ...card, title: "A" }));
    const titleAB = applyUserCardUpdate(titleA, (card) => ({ ...card, title: "AB" }));
    const titleABC = applyUserCardUpdate(titleAB, (card) => ({ ...card, title: "ABC" }));
    const body = applyUserCardUpdate(titleABC, (card) => ({ ...card, body: "Body" }));

    let history = createEditorHistory(initial);
    history = commitEditorHistory(history, titleA, { mergeKey: "title", timestamp: 100 });
    history = commitEditorHistory(history, titleAB, { mergeKey: "title", timestamp: 500 });
    expect(history.past.map((snapshot) => snapshot.card.title)).toEqual([initial.card.title]);

    history = commitEditorHistory(history, titleABC, { mergeKey: "title", timestamp: 2_000 });
    history = commitEditorHistory(history, body, { mergeKey: "body", timestamp: 2_100 });
    expect(history.past.map((snapshot) => snapshot.card.title)).toEqual([
      initial.card.title,
      titleAB.card.title,
      titleABC.card.title,
    ]);
  });

  it("removes a coalesced transaction when the field returns to its baseline", () => {
    const initial = createCardEditorState(DEFAULT_CARD, true);
    const changed = applyUserCardUpdate(initial, (card) => ({ ...card, title: "Temporary" }));
    const restored = applyUserCardUpdate(changed, (card) => ({ ...card, title: initial.card.title }));

    let history = createEditorHistory(initial);
    history = commitEditorHistory(history, changed, { mergeKey: "text:title", timestamp: 100 });
    history = commitEditorHistory(history, restored, { mergeKey: "text:title", timestamp: 200 });

    expect(history.present.card.title).toBe(initial.card.title);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
    expect(history.lastMerge).toBeNull();
  });

  it("removes a coalesced checkbox transaction when it returns to its baseline", () => {
    const initial = createCardEditorState(DEFAULT_CARD, true);
    const initialBold = initial.card.appearance.text.title.bold;
    const changed = applyUserCardUpdate(initial, (card) => ({
      ...card,
      appearance: {
        ...card.appearance,
        text: {
          ...card.appearance.text,
          title: {
            ...card.appearance.text.title,
            bold: !initialBold,
          },
        },
      },
    }));
    const restored = applyUserCardUpdate(changed, (card) => ({
      ...card,
      appearance: {
        ...card.appearance,
        text: {
          ...card.appearance.text,
          title: {
            ...card.appearance.text.title,
            bold: initialBold,
          },
        },
      },
    }));

    let history = createEditorHistory(initial);
    history = commitEditorHistory(history, changed, { mergeKey: "appearance:title:bold", timestamp: 100 });
    history = commitEditorHistory(history, restored, { mergeKey: "appearance:title:bold", timestamp: 200 });

    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
    expect(history.lastMerge).toBeNull();
  });

  it("updates derived state without adding or invalidating authored history", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const edited = applyUserCardUpdate(initial, (card) => ({ ...card, nation: "britain" }));
    const committed = commitEditorHistory(createEditorHistory(initial), edited, { timestamp: 100 });
    const derived = {
      ...edited,
      artworkOrigin: { kind: "auto-reference" as const, sampleId: "sample-1" },
      artworkRevision: edited.artworkRevision + 1,
    };

    const replaced = replaceEditorHistoryPresent(committed, derived);
    expect(replaced.past.map((snapshot) => snapshot.card.title)).toEqual([initial.card.title]);
    expect(replaced.future).toEqual([]);
    expect(replaced.present).toEqual(derived);
    expect(undoEditorHistory(replaced).present.card).toEqual(initial.card);
  });

  it("keeps automatic reference artwork when replacing the derived present state", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const history = createEditorHistory(initial);
    const automatic = applyAutomaticArtwork(initial, "sample-1", {
      source: "upload",
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      crop: { x: 12, y: 18, scale: 1.25 },
    });

    const replaced = replaceEditorHistoryPresent(history, automatic);

    expect(replaced.present).toBe(automatic);
    expect(replaced.present.artworkOrigin).toEqual({ kind: "auto-reference", sampleId: "sample-1" });
    expect(replaced.present.card.artwork).toEqual(automatic.card.artwork);
    expect(replaced.past).toBe(history.past);
    expect(replaced.future).toBe(history.future);
    expect(replaceEditorHistoryPresent(replaced, automatic)).toBe(replaced);
  });

  it("never rolls back the artwork revision when navigating history", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const edited = applyUserCardUpdate(initial, (card) => ({ ...card, title: "Async guard" }));
    const history = commitEditorHistory(createEditorHistory(initial), edited, { timestamp: 100 });
    const revisionBeforeUndo = history.present.artworkRevision;

    const undone = undoEditorHistory(history);
    expect(undone.present.artworkRevision).toBe(revisionBeforeUndo + 1);

    const staleResult = applyUserArtworkIfRevisionMatches(
      undone.present,
      revisionBeforeUndo,
      {
        source: "upload",
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        crop: { x: 0, y: 0, scale: 1 },
      },
    );
    expect(staleResult).toBe(undone.present);
  });

  it("keeps the runtime revision strictly increasing across full replacement, undo, and redo", () => {
    const initial = {
      ...createCardEditorState(DEFAULT_CARD, true),
      artworkRevision: 7,
    };
    const replacement = createCardEditorState(normalizeCardSpec({
      ...DEFAULT_CARD,
      title: "Imported replacement",
    }), true);

    const committed = commitEditorHistory(createEditorHistory(initial), replacement, { timestamp: 100 });
    const undone = undoEditorHistory(committed);
    const redone = redoEditorHistory(undone);

    expect(committed.present.artworkRevision).toBeGreaterThan(initial.artworkRevision);
    expect(undone.present.artworkRevision).toBeGreaterThan(committed.present.artworkRevision);
    expect(redone.present.artworkRevision).toBeGreaterThan(undone.present.artworkRevision);
  });

  it("stores automatic reference artwork as derived state rather than authored history", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const automatic = applyAutomaticArtwork(initial, "sample-1", {
      source: "upload",
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      crop: { x: 10, y: 20, scale: 1.2 },
    });
    const edited = applyUserCardUpdate(automatic, (card) => ({ ...card, title: "With auto art" }));
    const history = commitEditorHistory(createEditorHistory(automatic), edited, { timestamp: 100 });

    const undone = undoEditorHistory(history);
    expect(undone.present.card.artwork).toEqual({
      source: "none",
      crop: { x: 0, y: 0, scale: 1 },
    });
    expect(undone.present.artworkOrigin).toEqual({ kind: "none" });
  });

  it("keeps only the configured number of past snapshots", () => {
    let history = createEditorHistory(createCardEditorState(DEFAULT_CARD, false));
    for (let index = 0; index < EDITOR_HISTORY_LIMIT + 3; index += 1) {
      const next = applyUserCardUpdate(history.present, (card) => ({
        ...card,
        title: `Title ${index}`,
      }));
      history = commitEditorHistory(history, next, { timestamp: index * 2_000 });
    }

    expect(history.past).toHaveLength(EDITOR_HISTORY_LIMIT);
    expect(history.past[0].card.title).toBe("Title 2");
  });

  it("keeps the nearest undo states within a cumulative unique-artwork budget", () => {
    const initial = createCardEditorState(DEFAULT_CARD, true);
    const withArtwork = (title: string, dataUrl: string) => applyUserCardUpdate(initial, (card) => ({
      ...card,
      title,
      artwork: { source: "upload", dataUrl, crop: { x: 0, y: 0, scale: 1 } },
    }));
    const history = {
      past: [
        withArtwork("oldest", "data:image/png;base64,AAAA").card,
        withArtwork("nearest", "data:image/png;base64,BBBB").card,
      ].map((card) => ({
        card,
        hasUserEdits: true,
        clearedNumericFields: [],
        artworkOrigin: { kind: "user" as const },
      })),
      present: withArtwork("present", "data:image/png;base64,CCCC"),
      future: [],
      lastMerge: null,
    };
    const trimEditorHistoryArtwork = (
      EditorHistoryModule as unknown as Record<string, unknown>
    ).trimEditorHistoryArtwork;

    expect(trimEditorHistoryArtwork).toBeTypeOf("function");
    if (typeof trimEditorHistoryArtwork !== "function") return;
    const trimmed = trimEditorHistoryArtwork(
      history,
      "data:image/png;base64,BBBB".length + "data:image/png;base64,CCCC".length,
    ) as typeof history;

    expect(trimmed.past.map((snapshot) => snapshot.card.title)).toEqual(["nearest"]);
    expect(trimmed.present.card.title).toBe("present");
  });
});

describe("editor history shortcuts", () => {
  it("recognizes standard undo and redo shortcuts", () => {
    expect(getEditorHistoryShortcut({ key: "z", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("undo");
    expect(getEditorHistoryShortcut({ key: "Z", ctrlKey: false, metaKey: true, shiftKey: true, altKey: false })).toBe("redo");
    expect(getEditorHistoryShortcut({ key: "y", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("redo");
    expect(getEditorHistoryShortcut({ key: "z", ctrlKey: true, metaKey: false, shiftKey: false, altKey: true })).toBeNull();
    expect(getEditorHistoryShortcut({ key: "z", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBeNull();
  });

  it("leaves native text editing targets in control of their own undo stack", () => {
    expect(isEditableHistoryTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableHistoryTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableHistoryTarget({ tagName: "SELECT" })).toBe(true);
    expect(isEditableHistoryTarget({ tagName: "SPAN", isContentEditable: true })).toBe(true);
    expect(isEditableHistoryTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isEditableHistoryTarget(null)).toBe(false);
  });
});
