import { DEFAULT_CARD, normalizeCardSpec } from "../cardModel";
import type { CardSpec, CardUpdate } from "../types";
import { MAX_PROJECT_FILE_BYTES } from "../limits";
import { LOCAL_ASSET_PACK_MANIFEST } from "../assetPack";
import type { ImageDiffMetrics } from "../visualDiff";

type ProjectPanelProps = {
  card: CardSpec;
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
};

export function ProjectPanel({
  card,
  onCardChange,
  canvasRef,
  assetPackStatus,
  assetPackError,
  referenceDiff,
  referenceDiffError,
  onAssetPackLoad,
  onReferenceCompare,
}: ProjectPanelProps) {
  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (
      assetPackStatus &&
      !window.confirm("This PNG includes local asset-pack pixels. Keep the exported image private?")
    ) {
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
      window.alert("This card project is too large to open. Please choose a JSON file under 8 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        onCardChange(normalizeCardSpec(parsed));
      } catch {
        window.alert("This JSON file could not be opened as a card project.");
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
    <aside className="panel project-panel" aria-label="Project and export controls">
      <div className="panel-heading">
        <p>Project</p>
        <span>Local only</span>
      </div>

      <div className="export-stack">
        <button type="button" className="primary-action" onClick={exportPng}>
          {assetPackStatus ? "Export Private PNG" : "Export PNG"}
        </button>
        <button type="button" onClick={exportJson}>
          Save JSON
        </button>
        <label className="file-button">
          Open JSON
          <input name="project-json-import" type="file" accept="application/json,.json" onChange={importJson} />
        </label>
        <label className="file-button">
          Load Assets
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
          Compare PNG
          <input name="reference-card-image" type="file" accept="image/*" onChange={compareReference} />
        </label>
        <button type="button" className="danger-action" onClick={() => onCardChange(DEFAULT_CARD)}>
          Reset Card
        </button>
      </div>

      <div className="summary-list">
        <p>
          <span>Output</span>
          <strong>500 x 702 PNG</strong>
        </p>
        <p>
          <span>Artwork</span>
          <strong>{card.artwork.source === "upload" ? "embedded in JSON" : "not embedded"}</strong>
        </p>
        <p>
          <span>Scope</span>
          <strong>card face only</strong>
        </p>
        <p>
          <span>Assets</span>
          <strong>{assetPackStatus ? "local pack loaded" : "placeholder"}</strong>
        </p>
      </div>

      <div className="asset-pack-status">
        <p>
          <span>Manifest</span>
          <strong>{LOCAL_ASSET_PACK_MANIFEST}</strong>
        </p>
        {assetPackStatus ? (
          <>
            <p>
              <span>{assetPackStatus.name}</span>
              <strong>
                {assetPackStatus.imageCount} images / {assetPackStatus.fontCount} fonts
              </strong>
            </p>
            {assetPackStatus.warnings.slice(0, 2).map((warning) => (
              <p className="status-warning" key={warning}>
                {warning}
              </p>
            ))}
          </>
        ) : null}
        {assetPackError ? <p className="status-warning">{assetPackError}</p> : null}
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
              <span>Changed</span>
              <strong>{formatPercent(referenceDiff.changedPixelRatio)}</strong>
            </p>
          </>
        ) : null}
        {referenceDiffError ? <p className="status-warning">{referenceDiffError}</p> : null}
      </div>

      <p className="disclaimer">
        Unofficial non-commercial fan utility. It ships with original placeholder visuals only. Local asset packs and
        reference images stay in this browser session and are not saved into card JSON.
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

function safeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "custom-card";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
