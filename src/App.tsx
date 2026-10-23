import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { normalizeCardSpec } from "./cardModel";
import {
  applyAutomaticArtwork,
  applyUserCardUpdate,
  applyUserArtworkIfRevisionMatches,
  clearAutomaticArtwork,
  clearMismatchedAutomaticArtwork,
  createCardEditorState,
  getCardKindReferenceCard,
  replaceCardEditorContent,
  resetCardEditorState,
  selectCardKind,
  type CardEditorState,
} from "./cardEditorState";
import { CardCanvas } from "./components/CardCanvas";
import type { CardRenderReport } from "./canvas/cardRenderer";
import type { RenderCardOptions } from "./canvas/renderAssets";
import { FieldPanel } from "./components/FieldPanel";
import { HelpPage } from "./components/HelpPage";
import { ProjectPanel } from "./components/ProjectPanel";
import { loadAssetPackFromFiles, loadAssetPackFromUrl, type LoadedAssetPack } from "./assetPack";
import { loadAllowedImageSource } from "./limits";
import {
  resolveDevPreviewReferenceSelection,
  resolveDevPreviewSampleCard,
  resolveDevPreviewTemplateSelection,
  getTemplateSampleIdForLanguageRefresh,
  shouldApplyAutomaticArtworkResult,
  shouldApplyDevPreviewSampleResult,
  type DevPreviewArtworkReferenceCrop,
} from "./devPreviewState";
import {
  UI_TEXT,
  getInitialLanguage,
  getNextLanguage,
  saveLanguage,
  type Language,
} from "./i18n";
import {
  loadAutoArtworkPreference,
  loadDraftCardState,
  saveAutoArtworkPreference,
  saveDraftCard,
} from "./storage";
import type { CardKind, CardSpec, CardUpdate } from "./types";
import type { CardLibraryEntry } from "./localLibrary";
import { compareCanvasToReferenceFile, type ImageDiffMetrics } from "./visualDiff";
import {
  commitEditorHistory,
  createEditorHistory,
  getEditorHistoryShortcut,
  isEditableHistoryTarget,
  redoEditorHistory,
  replaceEditorHistoryPresent,
  undoEditorHistory,
  type EditorHistoryCommitOptions,
} from "./editorHistory";
import { applyAppearancePreset, type AppearancePreset } from "./appearancePresets";
import "./styles.css";

type DevPreviewCatalogModule = typeof import("./devPreviewCatalog");
type DevPreviewSample = import("./devPreviewCatalog").DevPreviewSample;
type ReferenceFilters = import("./devPreviewCatalog").ReferenceFilters;
type ReferenceSort = import("./devPreviewCatalog").ReferenceSort;
type TextureImageStatus = "loading" | "ready" | "error";
type EditorStateUpdate = CardEditorState | ((current: CardEditorState) => CardEditorState);
type LatestRequestIdentity = { current: number };
type EditorHistoryDirection = "undo" | "redo";

const PAPER_TEXTURE_URL = `${import.meta.env.BASE_URL}textures/ambientcg-paper001-960.png`;
const BRAND_MARK_URL = `${import.meta.env.BASE_URL}brand/card-forge-mark.png`;
const GITHUB_URL = "https://github.com/raederhans/KARDS-DIY-GENERATOR";
const GITHUB_MARK_PATH = "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";
const DEFAULT_ARTWORK_URL = `${import.meta.env.BASE_URL}artwork/capybara-placeholder.png`;

export function EditorHistoryControls({
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
}: {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string;
  redoLabel: string;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="history-controls" role="group" aria-label={`${undoLabel} / ${redoLabel}`}>
      <button
        type="button"
        disabled={!canUndo}
        aria-keyshortcuts="Control+Z Meta+Z"
        onClick={onUndo}
      >
        {undoLabel}
      </button>
      <button
        type="button"
        disabled={!canRedo}
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        onClick={onRedo}
      >
        {redoLabel}
      </button>
    </div>
  );
}

export function beginLatestRequest(identity: LatestRequestIdentity): number {
  identity.current += 1;
  return identity.current;
}

export function invalidateLatestRequest(identity: LatestRequestIdentity): void {
  identity.current += 1;
}

export function invalidateCardReplacementWork(...identities: LatestRequestIdentity[]): void {
  identities.forEach(invalidateLatestRequest);
}

export function isLatestRequest(identity: LatestRequestIdentity, requestId: number): boolean {
  return identity.current === requestId;
}

export function resolveEditorHistoryNavigation(
  history: ReturnType<typeof createEditorHistory>,
  direction: EditorHistoryDirection,
  activeLibraryEntryId: string | null,
): {
  history: ReturnType<typeof createEditorHistory>;
  activeLibraryEntryId: string | null;
  didNavigate: boolean;
} {
  const nextHistory = direction === "undo" ? undoEditorHistory(history) : redoEditorHistory(history);
  const didNavigate = nextHistory !== history;
  return {
    history: nextHistory,
    activeLibraryEntryId: didNavigate ? null : activeLibraryEntryId,
    didNavigate,
  };
}

function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage(window.localStorage));
  const text = UI_TEXT[language];
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [editorHistory, setEditorHistory] = useState(() => {
    const draft = loadDraftCardState(window.localStorage, getCardKindReferenceCard("tank", language));
    return createEditorHistory(
      createCardEditorState(draft.card, draft.hasUserEdits, draft.clearedNumericFields),
    );
  });
  const editorState = editorHistory.present;
  const card = editorState.card;
  const [loadedArtwork, setLoadedArtwork] = useState<{
    source: string;
    image: HTMLImageElement;
  } | null>(null);
  const artworkImage = loadedArtwork && loadedArtwork.source === card.artwork.dataUrl
    ? loadedArtwork.image
    : null;
  const [assetPack, setAssetPack] = useState<LoadedAssetPack | null>(null);
  const [devPreviewCatalog, setDevPreviewCatalog] = useState<DevPreviewCatalogModule | null>(null);
  const [assetPackError, setAssetPackError] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [selectedReferenceSampleId, setSelectedReferenceSampleId] = useState("t70");
  const [activeTemplateSampleId, setActiveTemplateSampleId] = useState<string | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isAutoArtworkLoading, setIsAutoArtworkLoading] = useState(false);
  const [autoArtworkEnabled, setAutoArtworkEnabled] = useState(() => loadAutoArtworkPreference(window.localStorage));
  const [activeLibraryEntryId, setActiveLibraryEntryId] = useState<string | null>(null);
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);
  const [autoArtworkError, setAutoArtworkError] = useState<string | null>(null);
  const [showReferenceComparison, setShowReferenceComparison] = useState(true);
  const [textureImage, setTextureImage] = useState<HTMLImageElement | null>(null);
  const [textureImageStatus, setTextureImageStatus] = useState<TextureImageStatus>("loading");
  const [defaultArtworkImage, setDefaultArtworkImage] = useState<HTMLImageElement | null>(null);
  const [referenceDiff, setReferenceDiff] = useState<ImageDiffMetrics | null>(null);
  const [referenceDiffError, setReferenceDiffError] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(() => document.fonts?.status !== "loading");
  const [cardRenderSnapshot, setCardRenderSnapshot] = useState<{
    card: CardSpec;
    renderOptions: RenderCardOptions | undefined;
    fontsReady: boolean;
    report: CardRenderReport | null;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);
  const assetPackRequestRef = useRef(0);
  const sampleLoadRequestRef = useRef(0);
  const autoArtworkRequestRef = useRef(0);
  const artworkApplyRequestRef = useRef(0);
  const explicitArtworkWorkGenerationRef = useRef<LatestRequestIdentity>({ current: 0 });
  const referenceDiffRequestRef = useRef<LatestRequestIdentity>({ current: 0 });
  const cardEditVersionRef = useRef(0);
  const pendingTemplateSampleIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const didLoadDevPreviewRef = useRef(false);
  const handleCardRenderReport = useCallback((
    renderedCard: CardSpec,
    renderedOptions: RenderCardOptions | undefined,
    renderedFontsReady: boolean,
    report: CardRenderReport | null,
  ) => {
    setCardRenderSnapshot({
      card: renderedCard,
      renderOptions: renderedOptions,
      fontsReady: renderedFontsReady,
      report,
    });
  }, []);
  const replaceDerivedEditorState = useCallback((update: EditorStateUpdate) => {
    setEditorHistory((history) => {
      const next = typeof update === "function" ? update(history.present) : update;
      return replaceEditorHistoryPresent(history, next);
    });
  }, []);
  const commitAuthoredEditorState = useCallback((
    update: EditorStateUpdate,
    options?: EditorHistoryCommitOptions,
  ) => {
    setEditorHistory((history) => {
      const next = typeof update === "function" ? update(history.present) : update;
      return commitEditorHistory(history, next, options);
    });
  }, []);
  useEffect(() => {
    saveLanguage(window.localStorage, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = text.documentTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", text.documentDescription);
  }, [language, text.documentDescription, text.documentTitle]);

  useEffect(() => {
    saveDraftCard(
      window.localStorage,
      card,
      editorState.hasUserEdits,
      editorState.clearedNumericFields,
    );
  }, [card, editorState.clearedNumericFields, editorState.hasUserEdits]);

  useEffect(() => {
    saveAutoArtworkPreference(window.localStorage, autoArtworkEnabled);
  }, [autoArtworkEnabled]);

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) {
      setFontsReady(true);
      return;
    }

    let cancelled = false;
    const markLoading = () => setFontsReady(false);
    const markSettled = () => setFontsReady(true);
    fonts.addEventListener("loading", markLoading);
    fonts.addEventListener("loadingdone", markSettled);
    fonts.addEventListener("loadingerror", markSettled);
    setFontsReady(fonts.status !== "loading");
    void fonts.ready.then(() => {
      if (!cancelled) {
        setFontsReady(true);
      }
    });

    return () => {
      cancelled = true;
      fonts.removeEventListener("loading", markLoading);
      fonts.removeEventListener("loadingdone", markSettled);
      fonts.removeEventListener("loadingerror", markSettled);
    };
  }, []);

  useEffect(() => () => assetPack?.dispose(), [assetPack]);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setTextureImage(image);
        setTextureImageStatus("ready");
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setTextureImage(null);
        setTextureImageStatus("error");
      }
    };
    setTextureImageStatus("loading");
    image.src = PAPER_TEXTURE_URL;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    void loadAllowedImageSource(DEFAULT_ARTWORK_URL, controller.signal)
      .then((image) => {
        if (!cancelled) {
          setDefaultArtworkImage(image);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDefaultArtworkImage(null);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(
    () => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    },
    [],
  );

  useEffect(() => {
    if (!card.artwork.dataUrl) {
      setLoadedArtwork(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const source = card.artwork.dataUrl;
    void loadAllowedImageSource(source, controller.signal)
      .then((image) => {
        if (!cancelled) {
          setLoadedArtwork({ source, image });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedArtwork(null);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [card.artwork.dataUrl]);

  useEffect(() => {
    let cancelled = false;
    void import("./devPreviewCatalog")
      .then((catalog) => {
        if (!cancelled && isMountedRef.current) {
          setDevPreviewCatalog(catalog);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssetPackError(UI_TEXT.en.errors.privatePreviewCatalog);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!devPreviewCatalog) {
      return;
    }

    if (didLoadDevPreviewRef.current) {
      return;
    }
    didLoadDevPreviewRef.current = true;

    selectReferenceSample(devPreviewCatalog.getDefaultDevPreviewSample());
    void loadDevPreviewAssetPack();
  }, [devPreviewCatalog]);

  const previewCard = useMemo(() => normalizeCardSpec(card), [card]);
  const textureSettings = previewCard.appearance.texture;
  const renderOptions = useMemo(
    () => ({
      assets: assetPack,
      fonts: assetPack?.fonts,
      fallbackArtworkImage: defaultArtworkImage,
      language,
      textureSeed: textureSettings.seed,
      textureImage,
      textureIntensity: textureSettings.intensity,
      textureRandomness: textureSettings.randomness,
      textureMottle: textureSettings.mottle,
    }),
    [assetPack, defaultArtworkImage, language, textureImage, textureSettings],
  );
  const textFitReady = fontsReady
    && cardRenderSnapshot?.fontsReady === true
    && cardRenderSnapshot.card === previewCard
    && cardRenderSnapshot.renderOptions === renderOptions
    && cardRenderSnapshot.report !== null;
  const textFitReport = textFitReady ? cardRenderSnapshot.report?.text ?? null : null;

  const invalidateReferenceDiff = useCallback(() => {
    invalidateLatestRequest(referenceDiffRequestRef.current);
    setReferenceDiff(null);
    setReferenceDiffError(null);
  }, []);

  useLayoutEffect(() => {
    invalidateReferenceDiff();
  }, [artworkImage, invalidateReferenceDiff, previewCard, renderOptions]);
  const referenceSample = useMemo(
    () =>
      devPreviewCatalog && selectedReferenceSampleId
        ? devPreviewCatalog.getDevPreviewSampleById(selectedReferenceSampleId)
        : undefined,
    [devPreviewCatalog, selectedReferenceSampleId],
  );
  const referenceSamples = useMemo(
    () => devPreviewCatalog
      ? [...devPreviewCatalog.DEV_PREVIEW_REFERENCE_SAMPLES, ...devPreviewCatalog.DEV_PREVIEW_HQ_SAMPLES]
      : [],
    [devPreviewCatalog],
  );
  const getVisibleReferenceSamples = useCallback(
    (filters: ReferenceFilters, sort: ReferenceSort) => devPreviewCatalog
      ? devPreviewCatalog.sortDevPreviewSamples(
          devPreviewCatalog.filterDevPreviewSamples(referenceSamples, filters),
          previewCard,
          sort,
          language,
        )
      : [],
    [devPreviewCatalog, language, previewCard, referenceSamples],
  );
  useEffect(() => {
    const nextReferenceUrl = referenceSample && devPreviewCatalog
      ? devPreviewCatalog.getDevPreviewReferenceUrl(referenceSample, language)
      : null;
    if (nextReferenceUrl === referenceImageUrl) {
      return;
    }

    setReferenceImageUrl(nextReferenceUrl);
    invalidateReferenceDiff();
  }, [devPreviewCatalog, invalidateReferenceDiff, language, referenceImageUrl, referenceSample]);

  useEffect(() => {
    const requestId = autoArtworkRequestRef.current + 1;
    autoArtworkRequestRef.current = requestId;
    if (!devPreviewCatalog || !autoArtworkEnabled || editorState.artworkOrigin.kind === "user") {
      setIsAutoArtworkLoading(false);
      return;
    }

    const sample = devPreviewCatalog.findUniqueAutomaticArtworkSample(referenceSamples, card);
    if (!sample) {
      replaceDerivedEditorState((currentState) => {
        if (currentState.artworkOrigin.kind !== "auto-reference") {
          return currentState;
        }
        return devPreviewCatalog.findUniqueAutomaticArtworkSample(referenceSamples, currentState.card)
          ? currentState
          : clearAutomaticArtwork(currentState);
      });
      setIsAutoArtworkLoading(false);
      return;
    }
    if (
      editorState.artworkOrigin.kind === "auto-reference"
      && editorState.artworkOrigin.sampleId === sample.id
      && Boolean(card.artwork.dataUrl)
    ) {
      setIsAutoArtworkLoading(false);
      return;
    }

    const matchingKeyAtStart = devPreviewCatalog.getAutomaticArtworkMatchingKey(card);
    setIsAutoArtworkLoading(true);
    setAutoArtworkError(null);
    void resolveDevPreviewSampleCard(sample, readDevPreviewCardUrl, cropDevPreviewArtwork, language)
      .then((resolvedCard) => {
        replaceDerivedEditorState((currentState) => {
          if (!shouldApplyAutomaticArtworkResult({
            isMounted: isMountedRef.current,
            requestId,
            activeRequestId: autoArtworkRequestRef.current,
            matchingKeyAtStart,
            currentMatchingKey: devPreviewCatalog.getAutomaticArtworkMatchingKey(currentState.card),
            artworkOriginKind: currentState.artworkOrigin.kind,
          })) {
            return currentState;
          }
          return applyAutomaticArtwork(currentState, sample.id, resolvedCard.artwork);
        });
      })
      .catch((error) => {
        if (requestId === autoArtworkRequestRef.current && isMountedRef.current) {
          replaceDerivedEditorState((currentState) => (
            devPreviewCatalog.getAutomaticArtworkMatchingKey(currentState.card) === matchingKeyAtStart
              ? clearMismatchedAutomaticArtwork(currentState, sample.id)
              : currentState
          ));
          setAutoArtworkError(
            error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
          );
        }
      })
      .finally(() => {
        if (requestId === autoArtworkRequestRef.current && isMountedRef.current) {
          setIsAutoArtworkLoading(false);
        }
      });
  }, [
    autoArtworkEnabled,
    card.artwork.dataUrl,
    card.kind,
    card.nation,
    card.rarity,
    card.set,
    devPreviewCatalog,
    editorState.artworkOrigin.kind,
    editorState.artworkOrigin.kind === "auto-reference" ? editorState.artworkOrigin.sampleId : null,
    language,
    referenceSamples,
  ]);

  function updateCard(update: CardUpdate, mergeKey?: string) {
    cardEditVersionRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setActiveTemplateSampleId(null);
    commitAuthoredEditorState(
      (currentState) => applyUserCardUpdate(currentState, update),
      mergeKey ? { mergeKey } : undefined,
    );
  }

  const beginArtworkUpload = useCallback(() => {
    const generation = beginLatestRequest(explicitArtworkWorkGenerationRef.current);
    sampleLoadRequestRef.current += 1;
    artworkApplyRequestRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    return generation;
  }, []);

  const isExplicitArtworkWorkCurrent = useCallback((generation: number) => (
    isLatestRequest(explicitArtworkWorkGenerationRef.current, generation)
  ), []);

  function updateArtwork(
    artwork: CardSpec["artwork"],
    expectedArtworkRevision: number,
    generation: number,
  ) {
    if (!isExplicitArtworkWorkCurrent(generation)) {
      return;
    }
    cardEditVersionRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setActiveTemplateSampleId(null);
    commitAuthoredEditorState((currentState) => (
      isExplicitArtworkWorkCurrent(generation)
        ? applyUserArtworkIfRevisionMatches(currentState, expectedArtworkRevision, artwork)
        : currentState
    ));
  }

  function handleCardKindChange(kind: CardKind) {
    cardEditVersionRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setActiveTemplateSampleId(null);
    commitAuthoredEditorState((currentState) => selectCardKind(currentState, kind, language));
  }

  function handleCardReset() {
    invalidateCardReplacementWork(
      explicitArtworkWorkGenerationRef.current,
      cardEditVersionRef,
      autoArtworkRequestRef,
      sampleLoadRequestRef,
    );
    artworkApplyRequestRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setActiveLibraryEntryId(null);
    setActiveTemplateSampleId(null);
    commitAuthoredEditorState(resetCardEditorState(language));
  }

  function handleCardImport(importedCard: CardSpec) {
    invalidateCardReplacementWork(
      explicitArtworkWorkGenerationRef.current,
      cardEditVersionRef,
      autoArtworkRequestRef,
      sampleLoadRequestRef,
    );
    artworkApplyRequestRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setActiveLibraryEntryId(null);
    setActiveTemplateSampleId(null);
    commitAuthoredEditorState(replaceCardEditorContent(importedCard));
  }

  async function handleAssetPackLoad(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const requestId = assetPackRequestRef.current + 1;
    assetPackRequestRef.current = requestId;
    setAssetPackError(null);
    try {
      const loadedPack = await loadAssetPackFromFiles(files);
      if (!isMountedRef.current || requestId !== assetPackRequestRef.current) {
        loadedPack.dispose();
        return;
      }
      setAssetPack(loadedPack);
    } catch (error) {
      if (requestId !== assetPackRequestRef.current) {
        return;
      }
      setAssetPackError(
        error instanceof Error ? error.message : UI_TEXT.en.errors.localAssetPack,
      );
    }
  }

  async function loadDevPreviewAssetPack() {
    if (!devPreviewCatalog) {
      return;
    }

    const requestId = assetPackRequestRef.current + 1;
    assetPackRequestRef.current = requestId;
    setAssetPackError(null);
    try {
      const loadedPack = await loadAssetPackFromUrl(devPreviewCatalog.DEV_PREVIEW_ASSET_PACK_URL);
      if (!isMountedRef.current || requestId !== assetPackRequestRef.current) {
        loadedPack.dispose();
        return;
      }
      setAssetPack(loadedPack);
    } catch (error) {
      if (requestId !== assetPackRequestRef.current) {
        return;
      }
      setAssetPackError(
        error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
      );
    }
  }

  function selectReferenceSample(sample: DevPreviewSample) {
    const selection = resolveDevPreviewReferenceSelection(sample, language);
    setSelectedReferenceSampleId(selection.selectedReferenceSampleId);
    setReferenceImageUrl(selection.referenceImageUrl);
    invalidateReferenceDiff();
  }

  async function loadDevPreviewTemplate(sample: DevPreviewSample, sampleLanguage: Language = language) {
    const explicitWorkGeneration = beginLatestRequest(explicitArtworkWorkGenerationRef.current);
    const requestId = sampleLoadRequestRef.current + 1;
    const cardEditVersionAtStart = cardEditVersionRef.current;
    sampleLoadRequestRef.current = requestId;
    pendingTemplateSampleIdRef.current = sample.id;
    artworkApplyRequestRef.current += 1;
    setAutoArtworkError(null);
    setTemplateLoadError(null);
    setIsTemplateLoading(true);

    try {
      const selection = await resolveDevPreviewTemplateSelection(
        sample,
        readDevPreviewCardUrl,
        cropDevPreviewArtwork,
        sampleLanguage,
      );

      if (!isExplicitArtworkWorkCurrent(explicitWorkGeneration) || !shouldApplyDevPreviewSampleResult({
        isMounted: isMountedRef.current,
        requestId,
        activeRequestId: sampleLoadRequestRef.current,
        cardEditVersionAtStart,
        currentCardEditVersion: cardEditVersionRef.current,
      })) {
        return;
      }

      cardEditVersionRef.current += 1;
      autoArtworkRequestRef.current += 1;
      setAutoArtworkError(null);
      setActiveLibraryEntryId(null);
      setActiveTemplateSampleId(sample.id);
      commitAuthoredEditorState(replaceCardEditorContent(selection.card));
      setSelectedReferenceSampleId(sample.id);
      setReferenceImageUrl(selection.referenceImageUrl);
      invalidateReferenceDiff();
    } catch (error) {
      if (!isExplicitArtworkWorkCurrent(explicitWorkGeneration) || requestId !== sampleLoadRequestRef.current) {
        return;
      }
      setTemplateLoadError(
        error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
      );
    } finally {
      if (
        isExplicitArtworkWorkCurrent(explicitWorkGeneration)
        && requestId === sampleLoadRequestRef.current
        && isMountedRef.current
      ) {
        pendingTemplateSampleIdRef.current = null;
        setIsTemplateLoading(false);
      }
    }
  }

  function handleTemplateSampleLoad(sampleId: string) {
    if (!devPreviewCatalog) {
      return;
    }

    const sample = devPreviewCatalog.getDevPreviewSampleById(sampleId);
    if (!sample) {
      return;
    }

    void loadDevPreviewTemplate(sample);
  }

  function handleReferenceSampleSelect(sampleId: string) {
    if (!devPreviewCatalog) {
      return;
    }
    const sample = devPreviewCatalog.getDevPreviewSampleById(sampleId);
    if (sample) {
      selectReferenceSample(sample);
    }
  }

  async function handleReferenceArtworkApply(sampleId: string) {
    if (!devPreviewCatalog) {
      return;
    }
    const sample = devPreviewCatalog.getDevPreviewSampleById(sampleId);
    if (!sample) {
      return;
    }

    const explicitWorkGeneration = beginLatestRequest(explicitArtworkWorkGenerationRef.current);
    const requestId = artworkApplyRequestRef.current + 1;
    const artworkRevisionAtStart = editorState.artworkRevision;
    const cardEditVersionAtStart = cardEditVersionRef.current;
    artworkApplyRequestRef.current = requestId;
    sampleLoadRequestRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setAutoArtworkError(null);
    setTemplateLoadError(null);
    setIsTemplateLoading(true);
    try {
      const resolvedCard = await resolveDevPreviewSampleCard(
        sample,
        readDevPreviewCardUrl,
        cropDevPreviewArtwork,
        language,
      );
      if (!isExplicitArtworkWorkCurrent(explicitWorkGeneration) || !shouldApplyDevPreviewSampleResult({
        isMounted: isMountedRef.current,
        requestId,
        activeRequestId: artworkApplyRequestRef.current,
        cardEditVersionAtStart,
        currentCardEditVersion: cardEditVersionRef.current,
      })) {
        return;
      }
      autoArtworkRequestRef.current += 1;
      setAutoArtworkError(null);
      cardEditVersionRef.current += 1;
      setActiveTemplateSampleId(null);
      commitAuthoredEditorState((currentState) => applyUserArtworkIfRevisionMatches(
        currentState,
        artworkRevisionAtStart,
        resolvedCard.artwork,
      ));
    } catch (error) {
      if (
        isExplicitArtworkWorkCurrent(explicitWorkGeneration)
        && requestId === artworkApplyRequestRef.current
      ) {
        setTemplateLoadError(
          error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
        );
      }
    } finally {
      if (
        isExplicitArtworkWorkCurrent(explicitWorkGeneration)
        && requestId === artworkApplyRequestRef.current
        && isMountedRef.current
      ) {
        setIsTemplateLoading(false);
      }
    }
  }

  function handleLibraryEntryLoad(entry: CardLibraryEntry) {
    invalidateCardReplacementWork(
      explicitArtworkWorkGenerationRef.current,
      cardEditVersionRef,
      autoArtworkRequestRef,
      sampleLoadRequestRef,
    );
    artworkApplyRequestRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setActiveTemplateSampleId(null);
    commitAuthoredEditorState(createCardEditorState(entry.card, true));
    setActiveLibraryEntryId(entry.id);
  }

  function handleAutoArtworkToggle(enabled: boolean) {
    setAutoArtworkError(null);
    setAutoArtworkEnabled(enabled);
  }

  async function handleReferenceCompare(file: File | null) {
    const canvas = canvasRef.current;
    if (!file || !canvas) {
      invalidateReferenceDiff();
      return;
    }

    const requestId = beginLatestRequest(referenceDiffRequestRef.current);
    setReferenceDiff(null);
    setReferenceDiffError(null);
    try {
      const diff = await compareCanvasToReferenceFile(canvas, file);
      if (isLatestRequest(referenceDiffRequestRef.current, requestId)) {
        setReferenceDiff(diff);
      }
    } catch (error) {
      if (isLatestRequest(referenceDiffRequestRef.current, requestId)) {
        setReferenceDiff(null);
        setReferenceDiffError(
          error instanceof Error ? error.message : UI_TEXT.en.errors.referenceCompare,
        );
      }
    }
  }

  function toggleLanguage() {
    const nextLanguage = getNextLanguage(language);
    setLanguage(nextLanguage);
    const templateSampleId = getTemplateSampleIdForLanguageRefresh(
      activeTemplateSampleId,
      pendingTemplateSampleIdRef.current,
    );
    if (!templateSampleId || !devPreviewCatalog) {
      return;
    }

    const sample = devPreviewCatalog.getDevPreviewSampleById(templateSampleId);
    if (sample) {
      void loadDevPreviewTemplate(sample, nextLanguage);
    }
  }

  function randomizeTexture() {
    updateCard((currentCard) => {
      const normalizedCard = normalizeCardSpec(currentCard);
      const currentSeed = normalizedCard.appearance.texture.seed;
      const nextSeed = window.crypto?.getRandomValues
        ? window.crypto.getRandomValues(new Uint32Array(1))[0]
        : Math.floor(Math.random() * 0x100000000);
      return {
        ...normalizedCard,
        appearance: {
          ...normalizedCard.appearance,
          texture: {
            ...normalizedCard.appearance.texture,
            seed: nextSeed === currentSeed ? (nextSeed + 1) >>> 0 : nextSeed >>> 0,
          },
        },
      };
    });
  }

  function updateTextureSetting(key: "intensity" | "randomness" | "mottle", value: number) {
    updateCard((currentCard) => {
      const normalizedCard = normalizeCardSpec(currentCard);
      return {
        ...normalizedCard,
        appearance: {
          ...normalizedCard.appearance,
          texture: {
            ...normalizedCard.appearance.texture,
            [key]: value,
          },
        },
      };
    }, `appearance:texture:${key}`);
  }

  function handleAppearancePresetApply(preset: AppearancePreset) {
    updateCard((currentCard) => applyAppearancePreset(currentCard, preset));
  }

  const invalidatePendingCardWork = useCallback(() => {
    invalidateCardReplacementWork(
      explicitArtworkWorkGenerationRef.current,
      cardEditVersionRef,
      autoArtworkRequestRef,
      sampleLoadRequestRef,
    );
    artworkApplyRequestRef.current += 1;
    pendingTemplateSampleIdRef.current = null;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setActiveTemplateSampleId(null);
  }, []);

  const handleUndo = useCallback(() => {
    const navigation = resolveEditorHistoryNavigation(editorHistory, "undo", activeLibraryEntryId);
    if (!navigation.didNavigate) {
      return;
    }
    invalidatePendingCardWork();
    setEditorHistory(navigation.history);
    setActiveLibraryEntryId(navigation.activeLibraryEntryId);
  }, [activeLibraryEntryId, editorHistory, invalidatePendingCardWork]);

  const handleRedo = useCallback(() => {
    const navigation = resolveEditorHistoryNavigation(editorHistory, "redo", activeLibraryEntryId);
    if (!navigation.didNavigate) {
      return;
    }
    invalidatePendingCardWork();
    setEditorHistory(navigation.history);
    setActiveLibraryEntryId(navigation.activeLibraryEntryId);
  }, [activeLibraryEntryId, editorHistory, invalidatePendingCardWork]);

  useEffect(() => {
    function handleHistoryKeyDown(event: KeyboardEvent) {
      if (isHelpOpen || event.defaultPrevented || isEditableHistoryTarget(event.target)) {
        return;
      }
      const shortcut = getEditorHistoryShortcut(event);
      if (!shortcut) {
        return;
      }
      if (
        (shortcut === "undo" && editorHistory.past.length === 0)
        || (shortcut === "redo" && editorHistory.future.length === 0)
      ) {
        return;
      }
      event.preventDefault();
      if (shortcut === "undo") {
        handleUndo();
      } else {
        handleRedo();
      }
    }

    window.addEventListener("keydown", handleHistoryKeyDown);
    return () => window.removeEventListener("keydown", handleHistoryKeyDown);
  }, [editorHistory.future.length, editorHistory.past.length, handleRedo, handleUndo, isHelpOpen]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
    window.requestAnimationFrame(() => helpButtonRef.current?.focus());
  }, []);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <img className="brand-mark" src={BRAND_MARK_URL} alt="" aria-hidden="true" />
          <div>
            <h1>KARDS Card Forge</h1>
            <p>{text.appSubtitle}</p>
          </div>
        </div>
        <div className="top-actions">
          <EditorHistoryControls
            canUndo={editorHistory.past.length > 0}
            canRedo={editorHistory.future.length > 0}
            undoLabel={text.history.undo}
            redoLabel={text.history.redo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
          <button
            ref={helpButtonRef}
            type="button"
            className="help-toggle"
            aria-label={isHelpOpen ? text.help.closeAria : text.help.openAria}
            aria-controls="help-page"
            aria-expanded={isHelpOpen}
            aria-current={isHelpOpen ? "page" : undefined}
            onClick={() => (isHelpOpen ? closeHelp() : setIsHelpOpen(true))}
          >
            <span className="help-toggle-mark" aria-hidden="true">?</span>
            {text.help.open}
          </button>
          <a className="github-link" href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={text.githubLinkAria}>
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path fill="currentColor" d={GITHUB_MARK_PATH} />
            </svg>
            <span>{text.githubLink}</span>
          </a>
          <button type="button" className="language-toggle" aria-label={text.languageToggleAria} onClick={toggleLanguage}>
            {text.languageToggle}
          </button>
        </div>
      </header>

      <div className="workspace" hidden={isHelpOpen}>
        <FieldPanel
          card={previewCard}
          artworkRevision={editorState.artworkRevision}
          language={language}
          text={text.fieldPanel}
          textFitReport={textFitReport}
          onCardChange={updateCard}
          onArtworkImportStart={beginArtworkUpload}
          isArtworkImportCurrent={isExplicitArtworkWorkCurrent}
          onArtworkChange={updateArtwork}
          onCardKindChange={handleCardKindChange}
        />
        <CardCanvas
          card={previewCard}
          language={language}
          text={text.canvas}
          artworkImage={artworkImage}
          canvasRef={canvasRef}
          renderOptions={renderOptions}
          fontsReady={fontsReady}
          onRenderReport={handleCardRenderReport}
          referenceImageUrl={showReferenceComparison ? referenceImageUrl : null}
          referenceLabel={
            showReferenceComparison && referenceSample ? localizedReferenceSampleTitle(referenceSample, language) : undefined
          }
          onCropChange={(crop) =>
            updateCard((currentCard) => ({
              ...currentCard,
              artwork: {
                ...currentCard.artwork,
                crop,
              },
            }), "artwork:crop:canvas")
          }
        />
        <ProjectPanel
          card={previewCard}
          language={language}
          text={text.projectPanel}
          onCardImport={handleCardImport}
          onCardReset={handleCardReset}
          canvasRef={canvasRef}
          artworkImage={artworkImage}
          artworkImageSource={loadedArtwork?.source ?? null}
          renderOptions={renderOptions}
          textFitReport={textFitReport}
          textFitReady={textFitReady}
          fontsReady={fontsReady}
          assetPackStatus={
            assetPack
              ? {
                  name: assetPack.name,
                  imageCount: assetPack.imageCount,
                  fontCount: assetPack.fontCount,
                  requiresPrivateExportConfirm: assetPack.requiresPrivateExportConfirm,
                  warnings: assetPack.warnings,
                }
              : null
          }
          assetPackError={assetPackError}
          referenceDiff={referenceDiff}
          referenceDiffError={referenceDiffError}
          onAssetPackLoad={handleAssetPackLoad}
          onReferenceCompare={handleReferenceCompare}
          showReferenceComparison={showReferenceComparison}
          onReferenceComparisonToggle={setShowReferenceComparison}
          referenceSamples={referenceSamples}
          selectedReferenceSampleId={selectedReferenceSampleId}
          getVisibleReferenceSamples={getVisibleReferenceSamples}
          onReferenceSampleSelect={handleReferenceSampleSelect}
          onReferenceArtworkApply={(sampleId) => void handleReferenceArtworkApply(sampleId)}
          autoArtworkEnabled={autoArtworkEnabled}
          onAutoArtworkToggle={handleAutoArtworkToggle}
          isArtworkMatching={isAutoArtworkLoading}
          isTemplateLoading={isTemplateLoading}
          templateLoadError={templateLoadError ?? autoArtworkError}
          onTemplateSampleLoad={handleTemplateSampleLoad}
          activeLibraryEntryId={activeLibraryEntryId}
          onLibraryEntryLoad={handleLibraryEntryLoad}
          onActiveLibraryEntryChange={setActiveLibraryEntryId}
          onLibraryDirectoryChange={() => setActiveLibraryEntryId(null)}
          onRandomTexture={randomizeTexture}
          onAppearancePresetApply={handleAppearancePresetApply}
          textureSettings={textureSettings}
          textureSourceLabel={
            textureImageStatus === "ready" ? text.projectPanel.textureCurrent : text.projectPanel.textureFallback
          }
          usesProgramTexture={textureImageStatus !== "ready"}
          onTextureSettingChange={updateTextureSetting}
        />
      </div>
      <HelpPage open={isHelpOpen} text={text.help} onClose={closeHelp} />
    </main>
  );
}

function localizedReferenceSampleTitle(sample: DevPreviewSample, language: Language): string {
  return language === "zh" ? sample.labelZh ?? sample.label : sample.label;
}

async function readDevPreviewCardUrl(cardUrl: string): Promise<unknown> {
  const response = await fetch(cardUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(UI_TEXT.en.errors.loadCardUrl(cardUrl));
  }
  return response.json();
}

function cropDevPreviewArtwork(crop: DevPreviewArtworkReferenceCrop): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.sourceRect.width;
      canvas.height = crop.sourceRect.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create the private preview artwork crop."));
        return;
      }

      ctx.drawImage(
        image,
        crop.sourceRect.x,
        crop.sourceRect.y,
        crop.sourceRect.width,
        crop.sourceRect.height,
        0,
        0,
        crop.sourceRect.width,
        crop.sourceRect.height,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error(`Could not load private preview artwork: ${crop.sourceUrl}`));
    image.src = crop.sourceUrl;
  });
}

export default App;
