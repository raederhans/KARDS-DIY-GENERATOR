import { normalizeCardSpec } from "../cardModel";
import { localizeAssetPackName, localizeRuntimeMessage, type Language, type UiText } from "../i18n";
import type { CardSpec, CardUpdate } from "../types";
import { MAX_PROJECT_FILE_BYTES } from "../limits";
import { LOCAL_ASSET_PACK_MANIFEST } from "../assetPack";
import type { ImageDiffMetrics } from "../visualDiff";

type ProjectPanelProps = {
  card: CardSpec;
  language: Language;
  text: UiText["projectPanel"];
  defaultCard: CardSpec;
  onCardChange: (update: CardUpdate) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  assetPackStatus: {
    name: string;
    imageCount: number;
    fontCount: number;
    warnings: string[];
  } | null;
  assetPackError: string | null;
  referenceDiff: ImageDiffMetrics | null;
  referenceDiffError: string | null;
  onAssetPackLoad: (files: FileList | null) => void;
  onReferenceCompare: (file: File | null) => void;
  onSetSampleLoad?: () => void;
  setSampleLabel?: string;
  onHqSampleLoad?: () => void;
};

export function ProjectPanel({
  card,
  language,
  text,
  defaultCard,
  onCardChange,
  canvasRef,
  assetPackStatus,
  assetPackError,
  referenceDiff,
  referenceDiffError,
  onAssetPackLoad,
  onReferenceCompare,
  onSetSampleLoad,
  setSampleLabel,
  onHqSampleLoad,
}: ProjectPanelProps) {
  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (assetPackStatus && !window.confirm(text.privatePngConfirm)) {
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      downloadBlob(blob, `${safeFileName(card.title)}.png`);
    }, "image/png");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${safeFileName(card.title)}.card.json`);
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_PROJECT_FILE_BYTES) {
      window.alert(text.projectTooLarge);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        onCardChange(normalizeCardSpec(parsed));
      } catch {
        window.alert(text.jsonOpenFailed);
      }
    });
    reader.readAsText(file);
  }

  function importAssetPack(event: React.ChangeEvent<HTMLInputElement>) {
    onAssetPackLoad(event.target.files);
    event.target.value = "";
  }

  function compareReference(event: React.ChangeEvent<HTMLInputElement>) {
    onReferenceCompare(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  return (
    <aside className="panel project-panel" aria-label={text.aria}>
      <div className="panel-heading">
        <p>{text.heading}</p>
        <span>{text.scope}</span>
      </div>

      <div className="export-stack">
        <button type="button" className="primary-action" onClick={exportPng}>
          {assetPackStatus ? text.exportPrivatePng : text.exportPng}
        </button>
        <button type="button" onClick={exportJson}>
          {text.saveJson}
        </button>
        <label className="file-button">
          {text.openJson}
          <input name="project-json-import" type="file" accept="application/json,.json" onChange={importJson} />
        </label>
        <label className="file-button">
          {text.loadAssets}
          <input
            name="local-asset-pack"
            type="file"
            accept="application/json,.json,image/*,.ttf,.otf,.woff,.woff2"
            multiple
            onChange={importAssetPack}
            {...{ webkitdirectory: "", directory: "" }}
          />
        </label>
        <label className="file-button">
          {text.comparePng}
          <input name="reference-card-image" type="file" accept="image/*" onChange={compareReference} />
        </label>
        {onSetSampleLoad && setSampleLabel ? (
          <button type="button" onClick={onSetSampleLoad}>
            {text.loadSetSample(setSampleLabel)}
          </button>
        ) : null}
        {onHqSampleLoad ? (
          <button type="button" onClick={onHqSampleLoad}>
            {text.loadHqSample}
          </button>
        ) : null}
        <button type="button" className="danger-action" onClick={() => onCardChange(defaultCard)}>
          {text.resetCard}
        </button>
      </div>

      <div className="summary-list">
        <p>
          <span>{text.output}</span>
          <strong>500 x 702 PNG</strong>
        </p>
        <p>
          <span>{text.artwork}</span>
          <strong>{card.artwork.source === "upload" ? text.artworkEmbedded : text.artworkNotEmbedded}</strong>
        </p>
        <p>
          <span>{text.cardScope}</span>
          <strong>{text.cardFaceOnly}</strong>
        </p>
        <p>
          <span>{text.assets}</span>
          <strong>{assetPackStatus ? text.assetsLoaded : text.assetsPlaceholder}</strong>
        </p>
      </div>

      <div className="asset-pack-status">
        <p>
          <span>{text.manifest}</span>
          <strong>{LOCAL_ASSET_PACK_MANIFEST}</strong>
        </p>
        {assetPackStatus ? (
          <>
            <p>
              <span>{localizeAssetPackName(language, assetPackStatus.name)}</span>
              <strong>{text.imageFontCounts(assetPackStatus.imageCount, assetPackStatus.fontCount)}</strong>
            </p>
            {assetPackStatus.warnings.slice(0, 2).map((warning) => (
              <p className="status-warning" key={warning}>
                {localizeRuntimeMessage(language, warning)}
              </p>
            ))}
          </>
        ) : null}
        {assetPackError ? <p className="status-warning">{localizeRuntimeMessage(language, assetPackError)}</p> : null}
      </div>

      <div className="diff-status">
        {referenceDiff ? (
          <>
            <p>
              <span>MAE</span>
              <strong>{referenceDiff.meanAbsoluteError}</strong>
            </p>
            <p>
              <span>RMSE</span>
              <strong>{referenceDiff.rootMeanSquareError}</strong>
            </p>
            <p>
              <span>{text.changed}</span>
              <strong>{formatPercent(referenceDiff.changedPixelRatio)}</strong>
            </p>
          </>
        ) : null}
        {referenceDiffError ? (
          <p className="status-warning">{localizeRuntimeMessage(language, referenceDiffError)}</p>
        ) : null}
      </div>

      <p className="disclaimer">
        {text.disclaimer}
      </p>
    </aside>
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "") || "custom-card";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
