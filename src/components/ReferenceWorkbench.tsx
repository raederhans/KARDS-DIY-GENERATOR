import { useMemo, useState } from "react";
import { localizeRuntimeMessage, translatePresetLabel, type Language, type UiText } from "../i18n";
import { CARD_KINDS, NATIONS, RARITIES, SETS } from "../presets";
import type { DevPreviewSample, ReferenceFilters, ReferenceSort } from "../devPreviewCatalog";
import type { CardSpec } from "../types";
import type { ImageDiffMetrics } from "../visualDiff";

type ReferenceWorkbenchProps = {
  card: CardSpec;
  language: Language;
  text: UiText["projectPanel"];
  samples: readonly DevPreviewSample[];
  selectedSampleId: string;
  getVisibleSamples: (filters: ReferenceFilters, sort: ReferenceSort) => DevPreviewSample[];
  onSampleSelect: (sampleId: string) => void;
  onArtworkApply: (sampleId: string) => void;
  onFullCardLoad: (sampleId: string) => void;
  autoArtworkEnabled: boolean;
  onAutoArtworkToggle: (enabled: boolean) => void;
  showReferenceComparison: boolean;
  onReferenceComparisonToggle: (enabled: boolean) => void;
  onReferenceFileSelect: (file: File | null, input: HTMLInputElement) => void;
  isLoading: boolean;
  error: string | null;
  referenceDiff: ImageDiffMetrics | null;
  referenceDiffError: string | null;
};

export function ReferenceWorkbench({
  language,
  text,
  samples,
  selectedSampleId,
  getVisibleSamples,
  onSampleSelect,
  onArtworkApply,
  onFullCardLoad,
  autoArtworkEnabled,
  onAutoArtworkToggle,
  showReferenceComparison,
  onReferenceComparisonToggle,
  onReferenceFileSelect,
  isLoading,
  error,
  referenceDiff,
  referenceDiffError,
}: ReferenceWorkbenchProps) {
  const [filters, setFilters] = useState<ReferenceFilters>({ query: "" });
  const [sort, setSort] = useState<ReferenceSort>("match");
  const visibleSamples = useMemo(
    () => getVisibleSamples(filters, sort),
    [filters, getVisibleSamples, sort],
  );
  const selectedSample = visibleSamples.find((sample) => sample.id === selectedSampleId);

  function setFilter<Key extends keyof ReferenceFilters>(key: Key, value: ReferenceFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="reference-workbench">
      <label className="toggle-row">
        <input
          name="auto-reference-artwork"
          type="checkbox"
          checked={autoArtworkEnabled}
          onChange={(event) => onAutoArtworkToggle(event.target.checked)}
        />
        <span>{text.autoArtwork}</span>
      </label>
      <label className="toggle-row">
        <input
          name="reference-comparison-toggle"
          type="checkbox"
          checked={showReferenceComparison}
          onChange={(event) => onReferenceComparisonToggle(event.target.checked)}
        />
        <span>{text.showReference}</span>
      </label>
      <label className="field-block compact-field-block">
        <span>{text.referenceSearch}</span>
        <input
          name="reference-search"
          type="search"
          value={filters.query}
          onChange={(event) => setFilter("query", event.target.value)}
        />
      </label>
      <div className="reference-filter-grid">
        <ReferenceSelect
          name="reference-kind-filter"
          label={text.referenceKind}
          value={filters.kind ?? ""}
          allLabel={text.referenceAll}
          options={CARD_KINDS.map((item) => ({
            id: item.id,
            label: translatePresetLabel(language, "kind", item.id, item.label),
          }))}
          onChange={(value) => setFilter("kind", value as ReferenceFilters["kind"])}
        />
        <ReferenceSelect
          name="reference-nation-filter"
          label={text.referenceNation}
          value={filters.nation ?? ""}
          allLabel={text.referenceAll}
          options={NATIONS.map((item) => ({
            id: item.id,
            label: translatePresetLabel(language, "nation", item.id, item.label),
          }))}
          onChange={(value) => setFilter("nation", value)}
        />
        <ReferenceSelect
          name="reference-rarity-filter"
          label={text.referenceRarity}
          value={filters.rarity ?? ""}
          allLabel={text.referenceAll}
          options={RARITIES.map((item) => ({
            id: item.id,
            label: translatePresetLabel(language, "rarity", item.id, item.label),
          }))}
          onChange={(value) => setFilter("rarity", value)}
        />
        <ReferenceSelect
          name="reference-set-filter"
          label={text.referenceSet}
          value={filters.set ?? ""}
          allLabel={text.referenceAll}
          options={SETS.map((item) => ({
            id: item.id,
            label: translatePresetLabel(language, "set", item.id, item.label),
          }))}
          onChange={(value) => setFilter("set", value)}
        />
      </div>
      <label className="field-block compact-field-block">
        <span>{text.referenceSort}</span>
        <select name="reference-sort" value={sort} onChange={(event) => setSort(event.target.value as ReferenceSort)}>
          <option value="match">{text.referenceSortMatch}</option>
          <option value="name">{text.referenceSortName}</option>
          <option value="set">{text.referenceSortSet}</option>
        </select>
      </label>

      {visibleSamples.length ? (
        <div className="reference-sample-list">
          {visibleSamples.map((sample) => (
            <button
              type="button"
              className={sample.id === selectedSampleId ? "reference-sample-row is-selected" : "reference-sample-row"}
              aria-pressed={sample.id === selectedSampleId}
              key={sample.id}
              onClick={() => onSampleSelect(sample.id)}
            >
              <strong>{localizedSampleTitle(sample, language)}</strong>
              <span>{translatePresetLabel(language, "nation", sample.nation, sample.nation)} · {translatePresetLabel(language, "set", sample.set, sample.set)}</span>
            </button>
          ))}
        </div>
      ) : <p className="empty-state">{text.referenceNoResults}</p>}

      <div className="export-stack two-up">
        <button type="button" disabled={!selectedSample || isLoading} onClick={() => selectedSample && onArtworkApply(selectedSample.id)}>
          {text.applyArtwork}
        </button>
        <button type="button" disabled={!selectedSample || isLoading} onClick={() => selectedSample && onFullCardLoad(selectedSample.id)}>
          {isLoading ? text.loadingSampleTemplate : text.loadFullCard}
        </button>
      </div>
      {error ? <p className="status-warning" role="alert">{localizeRuntimeMessage(language, error)}</p> : null}

      <label className="file-button">
        {text.comparePng}
        <input
          name="reference-card-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => onReferenceFileSelect(event.target.files?.[0] ?? null, event.target)}
        />
      </label>
      <div className="diff-status" role="status" aria-live="polite">
        {referenceDiff ? (
          <>
            <p><span>{text.averageDiff}</span><strong>{referenceDiff.meanAbsoluteError}</strong></p>
            <p><span>{text.overallDiff}</span><strong>{referenceDiff.rootMeanSquareError}</strong></p>
            <p><span>{text.changed}</span><strong>{formatPercent(referenceDiff.changedPixelRatio)}</strong></p>
          </>
        ) : null}
        {referenceDiffError ? <p className="status-warning" role="alert">{localizeRuntimeMessage(language, referenceDiffError)}</p> : null}
      </div>
    </div>
  );
}

function ReferenceSelect({
  name,
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  allLabel: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function localizedSampleTitle(sample: DevPreviewSample, language: Language): string {
  return language === "zh" ? sample.labelZh ?? sample.label : sample.label;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
