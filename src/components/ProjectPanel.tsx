import { useEffect, useState } from "react";
import { CARD_TEXTURE_BOUNDS, normalizeCardSpec } from "../cardModel";
import {
  CARD_EXPORT_SCALES,
  createCardExportBlob,
  getExportDimensions,
  getExportExtension,
  type CardExportFormat,
} from "../exportCard";
import type { RenderCardOptions } from "../canvas/renderAssets";
import { localizeAssetPackName, localizeRuntimeMessage, type Language, type UiText } from "../i18n";
import {
  LOCAL_LIBRARY_FILE_NAME,
  isDirectoryPickerAvailable,
  loadSavedLibraryDirectoryHandle,
  pickWritableDirectory,
  readLocalLibrary,
  saveLibraryDirectoryHandle,
  saveCardToLocalLibrary,
  writeBlobToDirectory,
  type LocalDirectoryHandle,
} from "../localLibrary";
import type { CardSpec, CardUpdate } from "../types";
import { MAX_PROJECT_FILE_BYTES } from "../limits";
import { LOCAL_ASSET_PACK_MANIFEST } from "../assetPack";
import type { ImageDiffMetrics } from "../visualDiff";

export const TEXTURE_CONTROL_LIMITS = CARD_TEXTURE_BOUNDS;

type AssetPackStatus = {
  name: string;
  imageCount: number;
  fontCount: number;
  requiresPrivateExportConfirm: boolean;
  warnings: string[];
};

type ProjectPanelProps = {
  card: CardSpec;
  language: Language;
  text: UiText["projectPanel"];
  defaultCard: CardSpec;
  onCardChange: (update: CardUpdate) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  artworkImage: HTMLImageElement | null;
  renderOptions?: RenderCardOptions;
  assetPackStatus: AssetPackStatus | null;
  assetPackError: string | null;
  referenceDiff: ImageDiffMetrics | null;
  referenceDiffError: string | null;
  onAssetPackLoad: (files: FileList | null) => void;
  onReferenceCompare: (file: File | null) => void;
  showReferenceComparison: boolean;
  onReferenceComparisonToggle: (enabled: boolean) => void;
  templateSamples: { id: string; label: string }[];
  selectedTemplateSampleId: string;
  onTemplateSampleLoad?: (sampleId: string) => void;
  hqSamples: { id: string; label: string }[];
  selectedHqSampleId: string;
  onHqSampleLoad?: (sampleId: string) => void;
  onRandomTexture: () => void;
  textureSettings: {
    intensity: number;
    randomness: number;
    mottle: number;
  };
  textureSourceLabel: string;
  onTextureSettingChange: (key: "intensity" | "randomness" | "mottle", value: number) => void;
};

export function ProjectPanel({
  card,
  language,
  text,
  defaultCard,
  onCardChange,
  canvasRef,
  artworkImage,
  renderOptions,
  assetPackStatus,
  assetPackError,
  referenceDiff,
  referenceDiffError,
  onAssetPackLoad,
  onReferenceCompare,
  showReferenceComparison,
  onReferenceComparisonToggle,
  templateSamples,
  selectedTemplateSampleId,
  onTemplateSampleLoad,
  hqSamples,
  selectedHqSampleId,
  onHqSampleLoad,
  onRandomTexture,
  textureSettings,
  textureSourceLabel,
  onTextureSettingChange,
}: ProjectPanelProps) {
  const [exportFormat, setExportFormat] = useState<CardExportFormat>("png");
  const [exportScale, setExportScale] = useState(1);
  const [exportExposure, setExportExposure] = useState(0);
  const [exportContrast, setExportContrast] = useState(0);
  const [exportDirectory, setExportDirectory] = useState<LocalDirectoryHandle | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [libraryDirectory, setLibraryDirectory] = useState<LocalDirectoryHandle | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const exportDimensions = getExportDimensions(exportScale);
  const directoryPickerAvailable = isDirectoryPickerAvailable();

  useEffect(() => {
    if (!directoryPickerAvailable) {
      return;
    }

    let cancelled = false;
    void loadSavedLibraryDirectoryHandle()
      .then((directory) => {
        if (!cancelled && directory) {
          setLibraryDirectory(directory);
          setLibraryStatus(text.libraryRemembered(directory.name));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [directoryPickerAvailable, text]);

  async function exportCard() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (!canStartCardExport(assetPackStatus, () => window.confirm(text.privateCardConfirm))) {
      return;
    }

    const fileName = `${safeFileName(card.title)}.${getExportExtension(exportFormat)}`;
    try {
      const blob = await createCardExportBlob(canvas, {
        format: exportFormat,
        scale: exportScale,
        exposure: exportExposure,
        contrast: exportContrast,
        jpegQuality: 0.92,
      }, {
        card,
        artworkImage,
        renderOptions,
      });
      if (exportDirectory) {
        await writeBlobToDirectory(exportDirectory, fileName, blob);
        setExportStatus(text.savedToDirectory(exportDirectory.name));
      } else {
        downloadBlob(blob, fileName);
        setExportStatus(text.savedToDownloads);
      }
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : text.exportFailed);
    }
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

  async function chooseExportDirectory() {
    try {
      const directory = await pickWritableDirectory();
      setExportDirectory(directory);
      setExportStatus(text.exportDirectorySelected(directory.name));
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : text.directoryUnavailable);
    }
  }

  async function chooseLibraryDirectory() {
    try {
      setLibraryError(null);
      const directory = await pickWritableDirectory();
      const library = await readLocalLibrary(directory);
      await saveLibraryDirectoryHandle(directory);
      setLibraryDirectory(directory);
      setLibraryStatus(text.libraryReady(directory.name, library.cards.length));
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : text.libraryUnavailable);
    }
  }

  async function saveToLibrary() {
    let savedLibraryCount: number | null = null;
    let savedDirectoryName = "";
    try {
      setLibraryError(null);
      const directory = libraryDirectory ?? await pickWritableDirectory();
      const library = await saveCardToLocalLibrary(directory, card);
      savedLibraryCount = library.cards.length;
      savedDirectoryName = directory.name;
      setLibraryDirectory(directory);
      setLibraryStatus(text.librarySaved(directory.name, library.cards.length));
      await saveLibraryDirectoryHandle(directory);
    } catch (error) {
      if (savedLibraryCount !== null) {
        setLibraryStatus(text.librarySaved(savedDirectoryName, savedLibraryCount));
        setLibraryError(error instanceof Error ? error.message : text.libraryRememberFailed);
        return;
      }
      setLibraryError(error instanceof Error ? error.message : text.libraryUnavailable);
    }
  }

  return (
    <aside className="panel project-panel" aria-label={text.aria}>
      <div className="panel-heading">
        <p>{text.heading}</p>
        <span>{text.scope}</span>
      </div>

      <div className="project-section texture-section">
        <div className="section-heading">
          <p>{text.textureControls}</p>
          <span>{textureSourceLabel}</span>
        </div>
        <TextureRange
          label={text.textureIntensity}
          name="card-texture-intensity"
          value={textureSettings.intensity}
          min={TEXTURE_CONTROL_LIMITS.intensity.min}
          max={TEXTURE_CONTROL_LIMITS.intensity.max}
          onChange={(value) => onTextureSettingChange("intensity", value)}
        />
        <TextureRange
          label={text.textureRandomness}
          name="card-texture-randomness"
          value={textureSettings.randomness}
          min={TEXTURE_CONTROL_LIMITS.randomness.min}
          max={TEXTURE_CONTROL_LIMITS.randomness.max}
          onChange={(value) => onTextureSettingChange("randomness", value)}
        />
        <TextureRange
          label={text.textureMottle}
          name="card-texture-mottle"
          value={textureSettings.mottle}
          min={TEXTURE_CONTROL_LIMITS.mottle.min}
          max={TEXTURE_CONTROL_LIMITS.mottle.max}
          onChange={(value) => onTextureSettingChange("mottle", value)}
        />
        <button type="button" className="primary-action" onClick={onRandomTexture}>
          {text.randomTexture}
        </button>
      </div>

      <div className="project-section export-workbench">
        <div className="section-heading">
          <p>{text.exportWorkbench}</p>
          <span>{exportDimensions.width} x {exportDimensions.height}</span>
        </div>
        <div className="control-grid">
          <label>
            <span>{text.exportFormat}</span>
            <select
              name="card-export-format"
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value as CardExportFormat)}
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <label>
            <span>{text.exportSize}</span>
            <select
              name="card-export-scale"
              value={exportScale}
              onChange={(event) => setExportScale(Number(event.target.value))}
            >
              {CARD_EXPORT_SCALES.map((scale) => {
                const dimensions = getExportDimensions(scale);
                return (
                  <option key={scale} value={scale}>
                    {scale}x · {dimensions.width} x {dimensions.height}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <ExportRange
          label={text.exposure}
          name="card-export-exposure"
          value={exportExposure}
          onChange={setExportExposure}
        />
        <ExportRange
          label={text.contrast}
          name="card-export-contrast"
          value={exportContrast}
          onChange={setExportContrast}
        />
        <div className="export-stack">
          <button type="button" disabled={!directoryPickerAvailable} onClick={chooseExportDirectory}>
            {text.chooseExportDirectory}
          </button>
          <button type="button" className="primary-action" onClick={exportCard}>
            {assetPackStatus?.requiresPrivateExportConfirm ? text.exportPrivateCard : text.exportCard}
          </button>
        </div>
        {exportStatus ? <p className="status-line">{exportStatus}</p> : null}
        {!directoryPickerAvailable ? <p className="status-warning">{text.directoryUnsupported}</p> : null}
      </div>

      <div className="project-section">
        <div className="section-heading">
          <p>{text.projectJson}</p>
          <span>{text.projectJsonScope}</span>
        </div>
        <div className="export-stack two-up">
          <button type="button" onClick={exportJson}>
            {text.saveJson}
          </button>
          <label className="file-button">
            {text.openJson}
            <input name="project-json-import" type="file" accept="application/json,.json" onChange={importJson} />
          </label>
        </div>
      </div>

      <div className="project-section">
        <div className="section-heading">
          <p>{text.localLibrary}</p>
          <span>{LOCAL_LIBRARY_FILE_NAME}</span>
        </div>
        <div className="export-stack two-up">
          <button type="button" disabled={!directoryPickerAvailable} onClick={chooseLibraryDirectory}>
            {text.chooseLibraryDirectory}
          </button>
          <button type="button" disabled={!directoryPickerAvailable} onClick={saveToLibrary}>
            {text.saveToLibrary}
          </button>
        </div>
        {libraryStatus ? <p className="status-line">{libraryStatus}</p> : null}
        {libraryError ? <p className="status-warning">{localizeRuntimeMessage(language, libraryError)}</p> : null}
      </div>

      <div className="project-section">
        <div className="section-heading">
          <p>{text.referenceTools}</p>
          <span>{showReferenceComparison ? text.referenceOn : text.referenceOff}</span>
        </div>
        <label className="toggle-row">
          <input
            name="reference-comparison-toggle"
            type="checkbox"
            checked={showReferenceComparison}
            onChange={(event) => onReferenceComparisonToggle(event.target.checked)}
          />
          <span>{text.showReference}</span>
        </label>
        <label className="file-button">
          {text.comparePng}
          <input name="reference-card-image" type="file" accept="image/*" onChange={compareReference} />
        </label>
        {onTemplateSampleLoad && templateSamples.length ? (
          <label className="field-block compact-field-block">
            <span>{text.cardTemplate}</span>
            <select
              name="card-template-sample"
              value={selectedTemplateSampleId}
              onChange={(event) => onTemplateSampleLoad(event.target.value)}
            >
              {templateSamples.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {onHqSampleLoad && hqSamples.length ? (
          <div className="control-grid">
            <label>
              <span>{text.hqTemplate}</span>
              <select
                name="hq-template"
                value={selectedHqSampleId}
                onChange={(event) => onHqSampleLoad(event.target.value)}
              >
                {hqSamples.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="project-section">
        <div className="section-heading">
          <p>{text.stylePack}</p>
          <span>{assetPackStatus ? text.assetsLoaded : text.assetsPlaceholder}</span>
        </div>
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
      </div>

      <div className="export-stack">
        <button type="button" className="danger-action" onClick={() => onCardChange(defaultCard)}>
          {text.resetCard}
        </button>
      </div>

      <div className="summary-list">
        <p>
          <span>{text.output}</span>
          <strong>{exportDimensions.width} x {exportDimensions.height} {exportFormat.toUpperCase()}</strong>
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
              <span>{text.averageDiff}</span>
              <strong>{referenceDiff.meanAbsoluteError}</strong>
            </p>
            <p>
              <span>{text.overallDiff}</span>
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

    </aside>
  );
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body?.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function canStartCardExport(
  assetPackStatus: Pick<AssetPackStatus, "requiresPrivateExportConfirm"> | null,
  confirmPrivateExport: () => boolean,
): boolean {
  return !assetPackStatus?.requiresPrivateExportConfirm || confirmPrivateExport();
}

export function safeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "") || "custom-card";
}

function ExportRange({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="export-range">
      <span>
        <span>{label}</span>
        <strong>{value > 0 ? `+${value}` : value}</strong>
      </span>
      <input
        name={name}
        type="range"
        min="-30"
        max="30"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TextureRange({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="texture-range">
      <span>
        <span>{label}</span>
        <strong>{Math.round(value * 100)}%</strong>
      </span>
      <input
        name={name}
        type="range"
        min={min}
        max={max}
        step="0.05"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
