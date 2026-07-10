import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "./cardEditorState";
import { CardCanvas } from "./components/CardCanvas";
import { FieldPanel } from "./components/FieldPanel";
import { ProjectPanel } from "./components/ProjectPanel";
import { loadAssetPackFromFiles, loadAssetPackFromUrl, type LoadedAssetPack } from "./assetPack";
import { loadAllowedImageSource } from "./limits";
import {
  resolveDevPreviewReferenceSelection,
  resolveDevPreviewSampleCard,
  resolveDevPreviewTemplateSelection,
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
import "./styles.css";

type DevPreviewCatalogModule = typeof import("./devPreviewCatalog");
type DevPreviewSample = import("./devPreviewCatalog").DevPreviewSample;
type ReferenceFilters = import("./devPreviewCatalog").ReferenceFilters;
type ReferenceSort = import("./devPreviewCatalog").ReferenceSort;
type TextureImageStatus = "loading" | "ready" | "error";

const PAPER_TEXTURE_URL = `${import.meta.env.BASE_URL}textures/ambientcg-paper001-960.png`;
const BRAND_MARK_URL = `${import.meta.env.BASE_URL}brand/card-forge-mark.png`;

function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage(window.localStorage));
  const text = UI_TEXT[language];
  const [editorState, setEditorState] = useState(() => {
    const draft = loadDraftCardState(window.localStorage, getCardKindReferenceCard("tank", language));
    return createCardEditorState(draft.card, draft.hasUserEdits, draft.clearedNumericFields);
  });
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
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isAutoArtworkLoading, setIsAutoArtworkLoading] = useState(false);
  const [autoArtworkEnabled, setAutoArtworkEnabled] = useState(() => loadAutoArtworkPreference(window.localStorage));
  const [activeLibraryEntryId, setActiveLibraryEntryId] = useState<string | null>(null);
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);
  const [autoArtworkError, setAutoArtworkError] = useState<string | null>(null);
  const [showReferenceComparison, setShowReferenceComparison] = useState(true);
  const [textureImage, setTextureImage] = useState<HTMLImageElement | null>(null);
  const [textureImageStatus, setTextureImageStatus] = useState<TextureImageStatus>("loading");
  const [referenceDiff, setReferenceDiff] = useState<ImageDiffMetrics | null>(null);
  const [referenceDiffError, setReferenceDiffError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetPackRequestRef = useRef(0);
  const sampleLoadRequestRef = useRef(0);
  const autoArtworkRequestRef = useRef(0);
  const artworkApplyRequestRef = useRef(0);
  const cardEditVersionRef = useRef(0);
  const isMountedRef = useRef(true);
  const didLoadDevPreviewRef = useRef(false);
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
      language,
      textureSeed: textureSettings.seed,
      textureImage,
      textureIntensity: textureSettings.intensity,
      textureRandomness: textureSettings.randomness,
      textureMottle: textureSettings.mottle,
    }),
    [assetPack, language, textureImage, textureSettings],
  );
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
    const nextReferenceUrl = referenceSample?.referenceUrl ?? null;
    if (nextReferenceUrl === referenceImageUrl) {
      return;
    }

    setReferenceImageUrl(nextReferenceUrl);
    setReferenceDiff(null);
    setReferenceDiffError(null);
  }, [referenceImageUrl, referenceSample]);

  useEffect(() => {
    const requestId = autoArtworkRequestRef.current + 1;
    autoArtworkRequestRef.current = requestId;
    if (!devPreviewCatalog || !autoArtworkEnabled || editorState.artworkOrigin.kind === "user") {
      setIsAutoArtworkLoading(false);
      return;
    }

    const sample = devPreviewCatalog.findUniqueAutomaticArtworkSample(referenceSamples, card);
    if (!sample) {
      setEditorState((currentState) => {
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
    void resolveDevPreviewSampleCard(sample, readDevPreviewCardUrl, cropDevPreviewArtwork)
      .then((resolvedCard) => {
        setEditorState((currentState) => {
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
          setEditorState((currentState) => (
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
    referenceSamples,
  ]);

  function updateCard(update: CardUpdate) {
    cardEditVersionRef.current += 1;
    setEditorState((currentState) => applyUserCardUpdate(currentState, update));
  }

  function handleCardKindChange(kind: CardKind) {
    cardEditVersionRef.current += 1;
    setEditorState((currentState) => selectCardKind(currentState, kind, language));
  }

  function handleCardReset() {
    cardEditVersionRef.current += 1;
    autoArtworkRequestRef.current += 1;
    sampleLoadRequestRef.current += 1;
    artworkApplyRequestRef.current += 1;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setActiveLibraryEntryId(null);
    setEditorState(resetCardEditorState(language));
  }

  function handleCardImport(importedCard: CardSpec) {
    cardEditVersionRef.current += 1;
    autoArtworkRequestRef.current += 1;
    sampleLoadRequestRef.current += 1;
    artworkApplyRequestRef.current += 1;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setActiveLibraryEntryId(null);
    setEditorState(replaceCardEditorContent(importedCard));
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
    const selection = resolveDevPreviewReferenceSelection(sample);
    setSelectedReferenceSampleId(selection.selectedReferenceSampleId);
    setReferenceImageUrl(selection.referenceImageUrl);
    setReferenceDiff(null);
    setReferenceDiffError(null);
  }

  async function loadDevPreviewTemplate(sample: DevPreviewSample) {
    const requestId = sampleLoadRequestRef.current + 1;
    const cardEditVersionAtStart = cardEditVersionRef.current;
    sampleLoadRequestRef.current = requestId;
    artworkApplyRequestRef.current += 1;
    setAutoArtworkError(null);
    setTemplateLoadError(null);
    setIsTemplateLoading(true);

    try {
      const selection = await resolveDevPreviewTemplateSelection(
        sample,
        readDevPreviewCardUrl,
        cropDevPreviewArtwork,
      );

      if (!shouldApplyDevPreviewSampleResult({
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
      setEditorState(replaceCardEditorContent(selection.card));
      setSelectedReferenceSampleId(sample.id);
      setReferenceImageUrl(selection.referenceImageUrl);
      setReferenceDiff(null);
      setReferenceDiffError(null);
    } catch (error) {
      if (requestId !== sampleLoadRequestRef.current) {
        return;
      }
      setTemplateLoadError(
        error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
      );
    } finally {
      if (requestId === sampleLoadRequestRef.current && isMountedRef.current) {
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

    const requestId = artworkApplyRequestRef.current + 1;
    const artworkRevisionAtStart = editorState.artworkRevision;
    artworkApplyRequestRef.current = requestId;
    sampleLoadRequestRef.current += 1;
    setAutoArtworkError(null);
    setTemplateLoadError(null);
    setIsTemplateLoading(true);
    try {
      const resolvedCard = await resolveDevPreviewSampleCard(
        sample,
        readDevPreviewCardUrl,
        cropDevPreviewArtwork,
      );
      if (!isMountedRef.current || requestId !== artworkApplyRequestRef.current) {
        return;
      }
      autoArtworkRequestRef.current += 1;
      setAutoArtworkError(null);
      cardEditVersionRef.current += 1;
      setEditorState((currentState) => applyUserArtworkIfRevisionMatches(
        currentState,
        artworkRevisionAtStart,
        resolvedCard.artwork,
      ));
    } catch (error) {
      if (requestId === artworkApplyRequestRef.current) {
        setTemplateLoadError(
          error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
        );
      }
    } finally {
      if (requestId === artworkApplyRequestRef.current && isMountedRef.current) {
        setIsTemplateLoading(false);
      }
    }
  }

  function handleLibraryEntryLoad(entry: CardLibraryEntry) {
    cardEditVersionRef.current += 1;
    autoArtworkRequestRef.current += 1;
    sampleLoadRequestRef.current += 1;
    artworkApplyRequestRef.current += 1;
    setIsTemplateLoading(false);
    setTemplateLoadError(null);
    setAutoArtworkError(null);
    setEditorState(createCardEditorState(entry.card, true));
    setActiveLibraryEntryId(entry.id);
  }

  function handleAutoArtworkToggle(enabled: boolean) {
    setAutoArtworkError(null);
    setAutoArtworkEnabled(enabled);
  }

  async function handleReferenceCompare(file: File | null) {
    const canvas = canvasRef.current;
    if (!file || !canvas) {
      return;
    }

    setReferenceDiffError(null);
    try {
      setReferenceDiff(await compareCanvasToReferenceFile(canvas, file));
    } catch (error) {
      setReferenceDiff(null);
      setReferenceDiffError(
        error instanceof Error ? error.message : UI_TEXT.en.errors.referenceCompare,
      );
    }
  }

  function toggleLanguage() {
    setLanguage((currentLanguage) => getNextLanguage(currentLanguage));
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
    });
  }

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
          <button type="button" className="language-toggle" aria-label={text.languageToggleAria} onClick={toggleLanguage}>
            {text.languageToggle}
          </button>
        </div>
      </header>

      <div className="workspace">
        <FieldPanel
          card={previewCard}
          language={language}
          text={text.fieldPanel}
          onCardChange={updateCard}
          onCardKindChange={handleCardKindChange}
        />
        <CardCanvas
          card={previewCard}
          text={text.canvas}
          artworkImage={artworkImage}
          canvasRef={canvasRef}
          renderOptions={renderOptions}
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
            }))
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
          textureSettings={textureSettings}
          textureSourceLabel={
            textureImageStatus === "ready" ? text.projectPanel.textureCurrent : text.projectPanel.textureFallback
          }
          usesProgramTexture={textureImageStatus !== "ready"}
          onTextureSettingChange={updateTextureSetting}
        />
      </div>
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
