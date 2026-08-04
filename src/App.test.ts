import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD } from "./cardModel";
import { applyUserCardUpdate, createCardEditorState } from "./cardEditorState";
import { commitEditorHistory, createEditorHistory } from "./editorHistory";
import {
  EditorHistoryControls,
  beginLatestRequest,
  invalidateLatestRequest,
  isLatestRequest,
  resolveEditorHistoryNavigation,
} from "./App";
import * as AppModule from "./App";

describe("EditorHistoryControls", () => {
  it("exposes visible, disabled-aware undo and redo buttons with keyboard hints", () => {
    const markup = renderToStaticMarkup(createElement(EditorHistoryControls, {
      canUndo: false,
      canRedo: true,
      undoLabel: "Undo",
      redoLabel: "Redo",
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    }));

    expect(markup).toContain("Undo");
    expect(markup).toContain("Redo");
    expect(markup).toContain('aria-keyshortcuts="Control+Z Meta+Z"');
    expect(markup).toContain('aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Undo<\/button>/);
  });
});

describe("App async and history coordination", () => {
  it("lets only the latest visual diff request commit and invalidates it on an edit", () => {
    const identity = { current: 0 };
    const first = beginLatestRequest(identity);
    const second = beginLatestRequest(identity);

    expect(isLatestRequest(identity, first)).toBe(false);
    expect(isLatestRequest(identity, second)).toBe(true);

    invalidateLatestRequest(identity);
    expect(isLatestRequest(identity, second)).toBe(false);
  });

  it("makes template or reference work supersede an earlier upload generation", () => {
    const explicitWork = { current: 0 };
    const uploadGeneration = beginLatestRequest(explicitWork);
    const templateGeneration = beginLatestRequest(explicitWork);

    expect(isLatestRequest(explicitWork, uploadGeneration)).toBe(false);
    expect(isLatestRequest(explicitWork, templateGeneration)).toBe(true);

    const referenceGeneration = beginLatestRequest(explicitWork);
    expect(isLatestRequest(explicitWork, templateGeneration)).toBe(false);
    expect(isLatestRequest(explicitWork, referenceGeneration)).toBe(true);
  });

  it("makes an upload supersede earlier template or reference work", () => {
    const explicitWork = { current: 0 };
    const templateGeneration = beginLatestRequest(explicitWork);
    const referenceGeneration = beginLatestRequest(explicitWork);
    const uploadGeneration = beginLatestRequest(explicitWork);

    expect(isLatestRequest(explicitWork, templateGeneration)).toBe(false);
    expect(isLatestRequest(explicitWork, referenceGeneration)).toBe(false);
    expect(isLatestRequest(explicitWork, uploadGeneration)).toBe(true);
  });

  it("invalidates a pending upload when a full-card replacement is requested", () => {
    const explicitWork = { current: 0 };
    const cardEditVersion = { current: 0 };
    const autoArtworkRequest = { current: 0 };
    const sampleLoadRequest = { current: 0 };
    const uploadGeneration = beginLatestRequest(explicitWork);
    const invalidateCardReplacementWork = (
      AppModule as unknown as Record<string, unknown>
    ).invalidateCardReplacementWork;

    expect(invalidateCardReplacementWork).toBeTypeOf("function");
    if (typeof invalidateCardReplacementWork !== "function") return;
    invalidateCardReplacementWork(
      explicitWork,
      cardEditVersion,
      autoArtworkRequest,
      sampleLoadRequest,
    );

    expect(isLatestRequest(explicitWork, uploadGeneration)).toBe(false);
    expect([cardEditVersion.current, autoArtworkRequest.current, sampleLoadRequest.current]).toEqual([1, 1, 1]);
  });

  it("detaches a loaded library entry after successful undo and redo", () => {
    const initial = createCardEditorState(DEFAULT_CARD, false);
    const edited = applyUserCardUpdate(initial, (card) => ({ ...card, title: "Edited" }));
    const history = commitEditorHistory(createEditorHistory(initial), edited, { timestamp: 100 });

    const undone = resolveEditorHistoryNavigation(history, "undo", "library-entry-1");
    expect(undone.didNavigate).toBe(true);
    expect(undone.activeLibraryEntryId).toBeNull();

    const redone = resolveEditorHistoryNavigation(undone.history, "redo", "library-entry-1");
    expect(redone.didNavigate).toBe(true);
    expect(redone.activeLibraryEntryId).toBeNull();
  });

  it("preserves a loaded library entry when history navigation is unavailable", () => {
    const history = createEditorHistory(createCardEditorState(DEFAULT_CARD, false));
    const navigation = resolveEditorHistoryNavigation(history, "undo", "library-entry-1");

    expect(navigation.didNavigate).toBe(false);
    expect(navigation.activeLibraryEntryId).toBe("library-entry-1");
  });
});
