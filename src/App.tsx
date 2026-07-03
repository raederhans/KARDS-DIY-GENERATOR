import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CARD, normalizeCardSpec } from "./cardModel";
import { CardCanvas } from "./components/CardCanvas";
import { FieldPanel } from "./components/FieldPanel";
import { ProjectPanel } from "./components/ProjectPanel";
import { loadAssetPackFromFiles, type LoadedAssetPack } from "./assetPack";
import { loadDraftCard, saveDraftCard } from "./storage";
import type { CardSpec, CardUpdate } from "./types";
import { compareCanvasToReferenceFile, type ImageDiffMetrics } from "./visualDiff";
import "./styles.css";

function App() {
  const [card, setCard] = useState<CardSpec>(() => loadDraftCard(window.localStorage, DEFAULT_CARD));
  const [artworkImage, setArtworkImage] = useState<HTMLImageElement | null>(null);
  const [assetPack, setAssetPack] = useState<LoadedAssetPack | null>(null);
  const [assetPackError, setAssetPackError] = useState<string | null>(null);
  const [referenceDiff, setReferenceDiff] = useState<ImageDiffMetrics | null>(null);
  const [referenceDiffError, setReferenceDiffError] = useState<string | null>(null);
  const [autosavePaused, setAutosavePaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetPackRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setAutosavePaused(!saveDraftCard(window.localStorage, card));
  }, [card]);

  useEffect(() => () => assetPack?.dispose(), [assetPack]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
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

  const previewCard = useMemo(() => normalizeCardSpec(card), [card]);
  const renderOptions = useMemo(
    () => ({
      assets: assetPack,
      fonts: assetPack?.fonts,
    }),
    [assetPack],
  );

  function updateCard(update: CardUpdate) {
    setCard((currentCard) => {
      const normalizedCurrent = normalizeCardSpec(currentCard);
      return normalizeCardSpec(typeof update === "function" ? update(normalizedCurrent) : update);
    });
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
      setAssetPackError(error instanceof Error ? error.message : "Could not load the local asset pack.");
    }
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
      setReferenceDiffError(error instanceof Error ? error.message : "Could not compare this reference image.");
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="brand-mark">CF</p>
          <div>
            <h1>Card Forge</h1>
            <p>Static custom card-face generator</p>
          </div>
        </div>
        <span className={autosavePaused ? "scope-pill is-warning" : "scope-pill"}>
          {autosavePaused ? "Save JSON to keep changes" : "No gameplay tools"}
        </span>
      </header>

      <div className="workspace">
        <FieldPanel card={previewCard} onCardChange={updateCard} />
        <CardCanvas
          card={previewCard}
          artworkImage={artworkImage}
          canvasRef={canvasRef}
          renderOptions={renderOptions}
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
        />
      </div>
    </main>
  );
}

export default App;
