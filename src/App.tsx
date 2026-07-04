import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeCardSpec } from "./cardModel";
import { CardCanvas } from "./components/CardCanvas";
import { FieldPanel } from "./components/FieldPanel";
import { ProjectPanel } from "./components/ProjectPanel";
import { loadAssetPackFromFiles, loadAssetPackFromUrl, type LoadedAssetPack } from "./assetPack";
import { applyCardUpdate, shouldApplyDevPreviewSampleResult } from "./devPreviewState";
import {
  UI_TEXT,
  getInitialLanguage,
  getLocalizedDefaultCard,
  getNextLanguage,
  saveLanguage,
  type Language,
} from "./i18n";
import { loadDraftCard, saveDraftCard } from "./storage";
import type { CardSpec, CardUpdate } from "./types";
import { compareCanvasToReferenceFile, type ImageDiffMetrics } from "./visualDiff";
import "./styles.css";

type DevPreviewCatalogModule = typeof import("./devPreviewCatalog");
type DevPreviewSample = import("./devPreviewCatalog").DevPreviewSample;

function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage(window.localStorage));
  const text = UI_TEXT[language];
  const localizedDefaultCard = useMemo(() => getLocalizedDefaultCard(language), [language]);
  const [card, setCard] = useState<CardSpec>(() =>
    loadDraftCard(window.localStorage, getLocalizedDefaultCard(getInitialLanguage(window.localStorage))),
  );
  const [artworkImage, setArtworkImage] = useState<HTMLImageElement | null>(null);
  const [assetPack, setAssetPack] = useState<LoadedAssetPack | null>(null);
  const [devPreviewCatalog, setDevPreviewCatalog] = useState<DevPreviewCatalogModule | null>(null);
  const [assetPackError, setAssetPackError] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceDiff, setReferenceDiff] = useState<ImageDiffMetrics | null>(null);
  const [referenceDiffError, setReferenceDiffError] = useState<string | null>(null);
  const [autosavePaused, setAutosavePaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetPackRequestRef = useRef(0);
  const cardEditVersionRef = useRef(0);
  const isMountedRef = useRef(true);
  const didLoadDevPreviewRef = useRef(false);
  const isDevPrivatePreviewEnabled =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("privatePack") !== "off";

  useEffect(() => {
    saveLanguage(window.localStorage, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = text.documentTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", text.documentDescription);
  }, [language, text.documentDescription, text.documentTitle]);

  useEffect(() => {
    setAutosavePaused(!saveDraftCard(window.localStorage, card));
  }, [card]);

  useEffect(() => () => assetPack?.dispose(), [assetPack]);

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
      setArtworkImage(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setArtworkImage(image);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setArtworkImage(null);
      }
    };
    image.src = card.artwork.dataUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [card.artwork.dataUrl]);

  useEffect(() => {
    if (!isDevPrivatePreviewEnabled) {
      return;
    }

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
  }, [isDevPrivatePreviewEnabled]);

  useEffect(() => {
    if (!isDevPrivatePreviewEnabled || !devPreviewCatalog) {
      return;
    }

    if (didLoadDevPreviewRef.current) {
      return;
    }
    didLoadDevPreviewRef.current = true;

    void loadDevPreviewSample(devPreviewCatalog.getDefaultDevPreviewSample());
  }, [devPreviewCatalog, isDevPrivatePreviewEnabled]);

  const previewCard = useMemo(() => normalizeCardSpec(card), [card]);
  const renderOptions = useMemo(
    () => ({
      assets: assetPack,
      fonts: assetPack?.fonts,
    }),
    [assetPack],
  );
  const referenceSample = useMemo(
    () =>
      isDevPrivatePreviewEnabled && devPreviewCatalog
        ? devPreviewCatalog.getDevPreviewSampleForCard(previewCard)
        : undefined,
    [devPreviewCatalog, isDevPrivatePreviewEnabled, previewCard.kind, previewCard.set],
  );
  const selectedSetSample = useMemo(
    () =>
      isDevPrivatePreviewEnabled && devPreviewCatalog
        ? devPreviewCatalog.getDevPreviewSampleBySet(previewCard.set)
        : undefined,
    [devPreviewCatalog, isDevPrivatePreviewEnabled, previewCard.set],
  );
  const setOptionLabels = useMemo(
    () =>
      isDevPrivatePreviewEnabled && devPreviewCatalog
        ? Object.fromEntries(devPreviewCatalog.DEV_PREVIEW_SET_SAMPLES.map((sample) => [sample.set, sample.label]))
        : undefined,
    [devPreviewCatalog, isDevPrivatePreviewEnabled],
  );

  useEffect(() => {
    if (!isDevPrivatePreviewEnabled) {
      return;
    }

    const nextReferenceUrl = referenceSample?.referenceUrl ?? null;
    if (nextReferenceUrl === referenceImageUrl) {
      return;
    }

    setReferenceImageUrl(nextReferenceUrl);
    setReferenceDiff(null);
    setReferenceDiffError(null);
  }, [isDevPrivatePreviewEnabled, referenceImageUrl, referenceSample]);

  function updateCard(update: CardUpdate) {
    cardEditVersionRef.current += 1;
    setCard((currentCard) => applyCardUpdate(currentCard, update));
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

  async function loadDevPreviewSample(sample: DevPreviewSample) {
    if (!devPreviewCatalog) {
      return;
    }

    const requestId = assetPackRequestRef.current + 1;
    const cardEditVersionAtStart = cardEditVersionRef.current;
    assetPackRequestRef.current = requestId;
    setAssetPackError(null);
    setReferenceDiff(null);
    setReferenceDiffError(null);
    try {
      const [loadedPack, sampleCard] = await Promise.all([
        loadAssetPackFromUrl(devPreviewCatalog.DEV_PREVIEW_ASSET_PACK_URL),
        loadDevPreviewSampleCard(sample),
      ]);
      if (!shouldApplyDevPreviewSampleResult({
        isMounted: isMountedRef.current,
        requestId,
        activeRequestId: assetPackRequestRef.current,
        cardEditVersionAtStart,
        currentCardEditVersion: cardEditVersionRef.current,
      })) {
        loadedPack.dispose();
        return;
      }
      setAssetPack(loadedPack);
      setCard(normalizeCardSpec(sampleCard));
      setReferenceImageUrl(sample.referenceUrl);
    } catch (error) {
      if (requestId !== assetPackRequestRef.current) {
        return;
      }
      setAssetPackError(
        error instanceof Error ? error.message : UI_TEXT.en.errors.privateReferencePreview,
      );
    }
  }

  async function handleSetSampleLoad() {
    if (!selectedSetSample) {
      return;
    }

    await loadDevPreviewSample(selectedSetSample);
  }

  async function handleHqSampleLoad() {
    if (!devPreviewCatalog) {
      return;
    }

    await loadDevPreviewSample(devPreviewCatalog.DEV_PREVIEW_HQ_SAMPLE);
  }

  async function loadDevPreviewSampleCard(sample: DevPreviewSample): Promise<CardSpec> {
    if ("card" in sample) {
      return sample.card;
    }

    const response = await fetch(sample.cardUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(UI_TEXT.en.errors.loadCardUrl(sample.cardUrl));
    }
    return normalizeCardSpec(await response.json());
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

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="brand-mark">CF</p>
          <div>
            <h1>Card Forge</h1>
            <p>{text.appSubtitle}</p>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="language-toggle" aria-label={text.languageToggleAria} onClick={toggleLanguage}>
            {text.languageToggle}
          </button>
          <span className={autosavePaused ? "scope-pill is-warning" : "scope-pill"}>
            {autosavePaused ? text.autosavePaused : text.scopePill}
          </span>
        </div>
      </header>

      <div className="workspace">
        <FieldPanel
          card={previewCard}
          language={language}
          text={text.fieldPanel}
          onCardChange={updateCard}
          setOptionLabels={setOptionLabels}
        />
        <CardCanvas
          card={previewCard}
          text={text.canvas}
          artworkImage={artworkImage}
          canvasRef={canvasRef}
          renderOptions={renderOptions}
          referenceImageUrl={referenceImageUrl}
          referenceLabel={referenceSample?.label}
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
          defaultCard={localizedDefaultCard}
          onCardChange={updateCard}
          canvasRef={canvasRef}
          assetPackStatus={
            assetPack
              ? {
                  name: assetPack.name,
                  imageCount: assetPack.imageCount,
                  fontCount: assetPack.fontCount,
                  warnings: assetPack.warnings,
                }
              : null
          }
          assetPackError={assetPackError}
          referenceDiff={referenceDiff}
          referenceDiffError={referenceDiffError}
          onAssetPackLoad={handleAssetPackLoad}
          onReferenceCompare={handleReferenceCompare}
          onSetSampleLoad={selectedSetSample ? handleSetSampleLoad : undefined}
          setSampleLabel={selectedSetSample?.label}
          onHqSampleLoad={isDevPrivatePreviewEnabled && devPreviewCatalog ? handleHqSampleLoad : undefined}
        />
      </div>
    </main>
  );
}

export default App;
