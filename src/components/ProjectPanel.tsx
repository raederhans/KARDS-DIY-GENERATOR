import { useEffect, useRef, useState, type ReactNode } from "react";
import { CARD_TEXTURE_BOUNDS, normalizeCardSpec } from "../cardModel";
import {
  CARD_EXPORT_SCALES,
  CardExportError,
  completeCardExportDelivery,
  createCardExportResult,
  getCardExportPreflight,
  getExportDimensions,
  getExportExtension,
  type CardExportPreflight,
  type CardExportResult,
  type CardExportFormat,
  type ExportDiagnosticCode,
} from "../exportCard";
import type { RenderCardOptions } from "../canvas/renderAssets";
import { localizeAssetPackName, localizeRuntimeMessage, type Language, type UiText } from "../i18n";
import {
  LOCAL_LIBRARY_FILE_NAME,
  isDirectoryPickerAvailable,
  pickWritableDirectory,
  writeBlobToDirectory,
  type CardLibraryEntry,
  type LocalDirectoryHandle,
} from "../localLibrary";
import type { CardSpec } from "../types";
import {
  isAllowedEmbeddedImageDataUrl,
  isAllowedImageFile,
  MAX_PROJECT_FILE_BYTES,
} from "../limits";
import { LOCAL_ASSET_PACK_MANIFEST } from "../assetPack";
import type { ImageDiffMetrics } from "../visualDiff";
import { consumeSelectedFile, readBrowserFile } from "../browserFiles";
import { LocalLibraryWorkbench } from "./LocalLibraryWorkbench";
import { ReferenceWorkbench } from "./ReferenceWorkbench";
import type { DevPreviewSample, ReferenceFilters, ReferenceSort } from "../devPreviewCatalog";

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
  onCardImport: (card: CardSpec) => void;
  onCardReset: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  artworkImage: HTMLImageElement | null;
  artworkImageSource: string | null;
  renderOptions?: RenderCardOptions;
  assetPackStatus: AssetPackStatus | null;
  assetPackError: string | null;
  referenceDiff: ImageDiffMetrics | null;
  referenceDiffError: string | null;
  onAssetPackLoad: (files: FileList | null) => void;
  onReferenceCompare: (file: File | null) => void;
  showReferenceComparison: boolean;
  onReferenceComparisonToggle: (enabled: boolean) => void;
  referenceSamples: readonly DevPreviewSample[];
  selectedReferenceSampleId: string;
  getVisibleReferenceSamples: (filters: ReferenceFilters, sort: ReferenceSort) => DevPreviewSample[];
  onReferenceSampleSelect: (sampleId: string) => void;
  onReferenceArtworkApply: (sampleId: string) => void;
  autoArtworkEnabled: boolean;
  onAutoArtworkToggle: (enabled: boolean) => void;
  isArtworkMatching: boolean;
  isTemplateLoading: boolean;
  templateLoadError: string | null;
  onTemplateSampleLoad: (sampleId: string) => void;
  activeLibraryEntryId: string | null;
  onLibraryEntryLoad: (entry: CardLibraryEntry) => void;
  onActiveLibraryEntryChange: (entryId: string | null) => void;
  onLibraryDirectoryChange: () => void;
  onRandomTexture: () => void;
  textureSettings: {
    intensity: number;
    randomness: number;
    mottle: number;
  };
  textureSourceLabel: string;
  usesProgramTexture: boolean;
  onTextureSettingChange: (key: "intensity" | "randomness" | "mottle", value: number) => void;
};

export type WorkbenchTab = "appearance" | "library" | "export" | "reference";

const WORKBENCH_TABS: WorkbenchTab[] = ["appearance", "library", "export", "reference"];

export function WorkbenchTabList({
  activeTab,
  text,
  onTabChange,
}: {
  activeTab: WorkbenchTab;
  text: UiText["projectPanel"];
  onTabChange: (tab: WorkbenchTab) => void;
}) {
  const labels: Record<WorkbenchTab, string> = {
    appearance: text.tabAppearance,
    library: text.tabLibrary,
    export: text.tabExport,
    reference: text.tabReference,
  };
  return (
    <div className="workbench-tabs" role="tablist" aria-label={text.heading}>
      {WORKBENCH_TABS.map((tab, index) => (
        <button
          type="button"
          role="tab"
          id={`workbench-tab-${tab}`}
          aria-controls={`workbench-panel-${tab}`}
          aria-selected={activeTab === tab}
          tabIndex={activeTab === tab ? 0 : -1}
          key={tab}
          onClick={() => onTabChange(tab)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const nextIndex = event.key === "Home"
              ? 0
              : event.key === "End"
                ? WORKBENCH_TABS.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + WORKBENCH_TABS.length) % WORKBENCH_TABS.length;
            const nextTab = WORKBENCH_TABS[nextIndex];
            onTabChange(nextTab);
            document.getElementById(`workbench-tab-${nextTab}`)?.focus();
          }}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}

export function WorkbenchTabPanel({
  activeTab,
  tab,
  children,
}: {
  activeTab: WorkbenchTab;
  tab: WorkbenchTab;
  children: ReactNode;
}) {
  return (
    <section
      role="tabpanel"
      id={`workbench-panel-${tab}`}
      aria-labelledby={`workbench-tab-${tab}`}
      hidden={activeTab !== tab}
    >
      {children}
    </section>
  );
}

export function ProjectPanel({
  card,
  language,
  text,
  onCardImport,
  onCardReset,
  canvasRef,
  artworkImage,
  artworkImageSource,
  renderOptions,
  assetPackStatus,
  assetPackError,
  referenceDiff,
  referenceDiffError,
  onAssetPackLoad,
  onReferenceCompare,
  showReferenceComparison,
  onReferenceComparisonToggle,
  referenceSamples,
  selectedReferenceSampleId,
  getVisibleReferenceSamples,
  onReferenceSampleSelect,
  onReferenceArtworkApply,
  autoArtworkEnabled,
  onAutoArtworkToggle,
  isArtworkMatching,
  isTemplateLoading,
  templateLoadError,
  onTemplateSampleLoad,
  activeLibraryEntryId,
  onLibraryEntryLoad,
  onActiveLibraryEntryChange,
  onLibraryDirectoryChange,
  onRandomTexture,
  textureSettings,
  textureSourceLabel,
  usesProgramTexture,
  onTextureSettingChange,
}: ProjectPanelProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("appearance");
  const [exportFormat, setExportFormat] = useState<CardExportFormat>("png");
  const [exportScale, setExportScale] = useState(1);
  const [exportExposure, setExportExposure] = useState(0);
  const [exportContrast, setExportContrast] = useState(0);
  const [exportDirectory, setExportDirectory] = useState<LocalDirectoryHandle | null>(null);
  const [exportResult, setExportResult] = useState<CardExportResult | null>(null);
  const [exportError, setExportError] = useState<CardExportError | null>(null);
  const [isExportPending, setIsExportPending] = useState(false);
  const [canvasAvailable, setCanvasAvailable] = useState(false);
  const exportPendingRef = useRef(false);
  const exportAttemptRef = useRef(0);
  const exportDimensions = getExportDimensions(exportScale);
  const directoryPickerAvailable = isDirectoryPickerAvailable();
  const artworkReady = !isArtworkMatching
    && isArtworkReadyForExport(card.artwork.dataUrl, artworkImage, artworkImageSource);
  const exportPreflight = getCardExportPreflight({
    canvasAvailable,
    artworkReady,
    assetPackWarnings: assetPackStatus?.warnings ?? [],
    usesProgramTexture,
    requiresPrivateConfirmation: assetPackStatus?.requiresPrivateExportConfirm ?? false,
  });

  useEffect(() => {
    setCanvasAvailable(Boolean(canvasRef.current));
  }, [canvasRef]);

  async function exportCard() {
    if (exportPendingRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setCanvasAvailable(false);
      return;
    }
    if (!canStartCardExport(assetPackStatus, () => window.confirm(text.privateCardConfirm), artworkReady)) {
      return;
    }

    const attemptId = exportAttemptRef.current + 1;
    exportAttemptRef.current = attemptId;
    exportPendingRef.current = true;
    setIsExportPending(true);
    setExportResult(null);
    setExportError(null);
    const fileName = `${safeFileName(card.title)}.${getExportExtension(exportFormat)}`;
    try {
      const result = await createCardExportResult(canvas, {
        format: exportFormat,
        scale: exportScale,
        exposure: exportExposure,
        contrast: exportContrast,
        jpegQuality: 0.92,
      }, {
        card,
        artworkImage,
        renderOptions,
      }, fileName);
      if (attemptId !== exportAttemptRef.current) {
        return;
      }
      setExportResult(result);
      const deliveredResult = await completeCardExportDelivery(result, exportDirectory
        ? {
            kind: "directory",
            directoryName: exportDirectory.name,
            write: () => writeBlobToDirectory(exportDirectory, fileName, result.blob),
          }
        : {
            kind: "download",
            download: () => downloadBlob(result.blob, fileName),
          });
      if (attemptId === exportAttemptRef.current) {
        setExportResult(deliveredResult);
      }
    } catch (error) {
      if (attemptId === exportAttemptRef.current) {
        setExportError(error instanceof CardExportError
          ? error
          : new CardExportError("encode", "encode-failed", error));
      }
    } finally {
      if (attemptId === exportAttemptRef.current) {
        exportPendingRef.current = false;
        setIsExportPending(false);
      }
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${safeFileName(card.title)}.card.json`);
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    void consumeSelectedFile(input, async (file) => {
      if (file.size > MAX_PROJECT_FILE_BYTES) {
        window.alert(text.projectTooLarge);
        return;
      }
      const serialized = await readBrowserFile(file, "text");
      onCardImport(await parseImportedCardProject(serialized));
    }).catch(() => window.alert(text.jsonOpenFailed));
  }

  function importAssetPack(event: React.ChangeEvent<HTMLInputElement>) {
    onAssetPackLoad(event.target.files);
    event.target.value = "";
  }

  async function compareReferenceFile(file: File | null, input: HTMLInputElement) {
    if (file && !(await isImportableReferenceImageFile(file))) {
      window.alert(text.invalidReferenceImage);
      input.value = "";
      return;
    }
    onReferenceCompare(file);
    input.value = "";
  }

  async function chooseExportDirectory() {
    if (exportPendingRef.current) {
      return;
    }
    try {
      const directory = await pickWritableDirectory();
      setExportDirectory(directory);
      setExportError(null);
    } catch (error) {
      setExportError(new CardExportError("write", "write-failed", error));
    }
  }

  return (
    <aside className="panel project-panel" aria-label={text.aria}>
      <div className="panel-heading">
        <p>{text.heading}</p>
        <span>{text.scope}</span>
      </div>

      <WorkbenchTabList activeTab={activeTab} text={text} onTabChange={setActiveTab} />

      <div className="workbench-tab-content">
        <WorkbenchTabPanel activeTab={activeTab} tab="appearance">
            <div className="project-section texture-section">
              <div className="section-heading">
                <p>{text.textureControls}</p>
                <span>{textureSourceLabel}</span>
              </div>
              <TextureRange label={text.textureIntensity} name="card-texture-intensity" value={textureSettings.intensity} min={TEXTURE_CONTROL_LIMITS.intensity.min} max={TEXTURE_CONTROL_LIMITS.intensity.max} onChange={(value) => onTextureSettingChange("intensity", value)} />
              <TextureRange label={text.textureRandomness} name="card-texture-randomness" value={textureSettings.randomness} min={TEXTURE_CONTROL_LIMITS.randomness.min} max={TEXTURE_CONTROL_LIMITS.randomness.max} onChange={(value) => onTextureSettingChange("randomness", value)} />
              <TextureRange label={text.textureMottle} name="card-texture-mottle" value={textureSettings.mottle} min={TEXTURE_CONTROL_LIMITS.mottle.min} max={TEXTURE_CONTROL_LIMITS.mottle.max} onChange={(value) => onTextureSettingChange("mottle", value)} />
              <button type="button" className="primary-action" onClick={onRandomTexture}>{text.randomTexture}</button>
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

            <div className="asset-pack-status">
              <p><span>{text.manifest}</span><strong>{LOCAL_ASSET_PACK_MANIFEST}</strong></p>
              {assetPackStatus ? (
                <>
                  <p>
                    <span>{localizeAssetPackName(language, assetPackStatus.name)}</span>
                    <strong>{text.imageFontCounts(assetPackStatus.imageCount, assetPackStatus.fontCount)}</strong>
                  </p>
                  {assetPackStatus.warnings.map((warning) => (
                    <p className="status-warning" key={warning}>{localizeRuntimeMessage(language, warning)}</p>
                  ))}
                </>
              ) : null}
              {assetPackError ? <p className="status-warning">{localizeRuntimeMessage(language, assetPackError)}</p> : null}
            </div>
        </WorkbenchTabPanel>

        <WorkbenchTabPanel activeTab={activeTab} tab="library">
            <div className="project-section">
              <div className="section-heading">
                <p>{text.projectJson}</p>
                <span>{text.projectJsonScope}</span>
              </div>
              <div className="export-stack two-up">
                <button type="button" onClick={exportJson}>{text.saveJson}</button>
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
              <LocalLibraryWorkbench card={card} language={language} text={text} activeEntryId={activeLibraryEntryId} onEntryLoad={onLibraryEntryLoad} onActiveEntryChange={onActiveLibraryEntryChange} onDirectoryChange={onLibraryDirectoryChange} />
            </div>
        </WorkbenchTabPanel>

        <WorkbenchTabPanel activeTab={activeTab} tab="export">
            <div className="project-section export-workbench">
              <div className="section-heading">
                <p>{text.exportWorkbench}</p>
                <span>{exportDimensions.width} × {exportDimensions.height}</span>
              </div>
              <div className="control-grid">
                <label>
                  <span>{text.exportFormat}</span>
                  <select name="card-export-format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as CardExportFormat)}>
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="pdf">PDF</option>
                  </select>
                </label>
                <label>
                  <span>{text.exportSize}</span>
                  <select name="card-export-scale" value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))}>
                    {CARD_EXPORT_SCALES.map((scale) => {
                      const dimensions = getExportDimensions(scale);
                      return <option key={scale} value={scale}>{scale}× · {dimensions.width} × {dimensions.height}</option>;
                    })}
                  </select>
                </label>
              </div>
              <ExportRange label={text.exposure} name="card-export-exposure" value={exportExposure} onChange={setExportExposure} />
              <ExportRange label={text.contrast} name="card-export-contrast" value={exportContrast} onChange={setExportContrast} />
              <div className="export-stack two-up">
                <button type="button" disabled={!directoryPickerAvailable || isExportPending} onClick={chooseExportDirectory}>{text.chooseExportDirectory}</button>
                <button type="button" className="primary-action" disabled={exportPreflight.status === "blocking" || isExportPending} onClick={exportCard}>
                  {isExportPending ? text.exporting : text.exportCard}
                </button>
              </div>
              {exportDirectory ? <p className="status-line">{text.exportDirectorySelected(exportDirectory.name)}</p> : null}
              {!directoryPickerAvailable ? <p className="status-warning">{text.directoryUnsupported}</p> : null}
            </div>
            <ExportDiagnostics language={language} text={text} preflight={exportPreflight} result={exportResult} error={exportError} />
        </WorkbenchTabPanel>

        <WorkbenchTabPanel activeTab={activeTab} tab="reference">
            <ReferenceWorkbench
              card={card}
              language={language}
              text={text}
              samples={referenceSamples}
              selectedSampleId={selectedReferenceSampleId}
              getVisibleSamples={getVisibleReferenceSamples}
              onSampleSelect={onReferenceSampleSelect}
              onArtworkApply={onReferenceArtworkApply}
              onFullCardLoad={onTemplateSampleLoad}
              autoArtworkEnabled={autoArtworkEnabled}
              onAutoArtworkToggle={onAutoArtworkToggle}
              showReferenceComparison={showReferenceComparison}
              onReferenceComparisonToggle={onReferenceComparisonToggle}
              onReferenceFileSelect={compareReferenceFile}
              isLoading={isTemplateLoading}
              error={templateLoadError}
              referenceDiff={referenceDiff}
              referenceDiffError={referenceDiffError}
            />
        </WorkbenchTabPanel>
      </div>

      <footer className="workbench-footer">
        <div className="export-stack">
          <button type="button" className="danger-action" onClick={onCardReset}>{text.resetCard}</button>
        </div>
        <div className="summary-list">
          <p><span>{text.output}</span><strong>{exportDimensions.width} × {exportDimensions.height} {exportFormat.toUpperCase()}</strong></p>
          <p><span>{text.artwork}</span><strong>{card.artwork.source === "upload" ? text.artworkEmbedded : text.artworkNotEmbedded}</strong></p>
          <p><span>{text.cardScope}</span><strong>{text.cardFaceOnly}</strong></p>
          <p><span>{text.assets}</span><strong>{assetPackStatus ? text.assetsLoaded : text.assetsPlaceholder}</strong></p>
        </div>
      </footer>
    </aside>
  );
}

export function ExportDiagnostics({
  language,
  text,
  preflight,
  result,
  error,
}: {
  language: Language;
  text: UiText["projectPanel"];
  preflight: CardExportPreflight;
  result: CardExportResult | null;
  error: CardExportError | null;
}) {
  const statusLabel = preflight.status === "ready"
    ? text.exportReady
    : preflight.status === "warning" ? text.exportWarning : text.exportBlocking;
  return (
    <div className={`export-diagnostics is-${preflight.status}`} role="status" aria-live="polite">
      <div className="section-heading"><p>{statusLabel}</p><span>{text.diagnosticCount(preflight.items.length)}</span></div>
      {preflight.items.length ? (
        <ul>
          {preflight.items.map((item, index) => (
            <li className={`diagnostic-${item.severity}`} key={`${item.code}-${index}`}>
              {diagnosticText(item.code, text)}{item.detail ? ` ${localizeRuntimeMessage(language, item.detail)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {result ? (
        <div className="export-result">
          <strong>{result.fileName}</strong>
          <span>{result.format.toUpperCase()} · {result.width} × {result.height} · {formatBytes(result.byteLength)} · {Math.round(result.durationMs)} ms</span>
          <span>{exportTargetText(result, text)}</span>
        </div>
      ) : <p className="empty-state">{text.exportNoRun}</p>}
      {error ? <p className="status-warning" role="alert">{diagnosticText(error.code, text)}</p> : null}
    </div>
  );
}

function exportTargetText(result: CardExportResult, text: UiText["projectPanel"]): string {
  if (result.target.kind === "download") return text.exportDownloadTriggered;
  if (result.target.kind === "directory") return text.exportDirectoryWritten(result.target.directoryName);
  return text.exportGenerated;
}

function diagnosticText(code: ExportDiagnosticCode, text: UiText["projectPanel"]): string {
  const messages: Record<ExportDiagnosticCode, string> = {
    "canvas-unavailable": text.diagnosticCanvasUnavailable,
    "artwork-not-ready": text.diagnosticArtworkNotReady,
    "asset-pack-warning": text.diagnosticAssetPackWarning,
    "program-texture": text.diagnosticProgramTexture,
    "private-confirmation-required": text.diagnosticPrivateConfirmation,
    "render-failed": text.diagnosticRenderFailed,
    "encode-failed": text.diagnosticEncodeFailed,
    "write-failed": text.diagnosticWriteFailed,
    "download-failed": text.diagnosticDownloadFailed,
  };
  return messages[code];
}

function formatBytes(byteLength: number): string {
  return byteLength < 1024 ? `${byteLength} B` : `${(byteLength / 1024).toFixed(1)} KB`;
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
  artworkReady = true,
): boolean {
  if (!artworkReady) {
    return false;
  }
  return !assetPackStatus?.requiresPrivateExportConfirm || confirmPrivateExport();
}

export function isArtworkReadyForExport(
  currentSource: string | undefined,
  image: HTMLImageElement | null,
  loadedSource: string | null,
): boolean {
  return !currentSource || (image !== null && loadedSource === currentSource);
}

export async function parseImportedCardProject(
  serialized: string,
  validateEmbeddedArtwork: (dataUrl: string) => Promise<boolean> = isAllowedEmbeddedImageDataUrl,
): Promise<CardSpec> {
  const parsed: unknown = JSON.parse(serialized);
  const rawArtwork = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>).artwork
    : undefined;
  if (rawArtwork && typeof rawArtwork === "object" && !Array.isArray(rawArtwork)) {
    const artwork = rawArtwork as Record<string, unknown>;
    if (
      artwork.source === "upload" &&
      (typeof artwork.dataUrl !== "string" || !(await validateEmbeddedArtwork(artwork.dataUrl)))
    ) {
      throw new Error("Embedded artwork is invalid or too large.");
    }
  }
  const card = normalizeCardSpec(parsed);
  if (card.artwork.source === "upload" && !card.artwork.dataUrl) {
    throw new Error("Embedded artwork is invalid or too large.");
  }
  return card;
}

export function safeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/(^-|-$)/g, "") || "custom-card";
}

export function isImportableReferenceImageFile(file: Pick<File, "name" | "type" | "size" | "slice">): Promise<boolean> {
  return isAllowedImageFile(file);
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
