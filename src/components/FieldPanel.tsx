import { useRef, useState } from "react";
import { CARD_TEXT_APPEARANCE_BOUNDS } from "../cardModel";
import { CARD_KINDS, NATIONS, RARITIES, SETS, getKind } from "../presets";
import { translateKeywordLabel, translatePresetLabel, type Language, type UiText } from "../i18n";
import type { CardSpec, CardUpdate } from "../types";
import {
  BODY_EFFECT_PRESETS,
  getBodyEffectPresetInsert,
  getBodyEffectPresetLabel,
  insertBodyTextAtSelection,
  wrapBodySelectionWithBold,
} from "../bodyMarkup";
import {
  BODY_MAX_LENGTH,
  CARD_FACE_VALUE_MAX,
  isAllowedImageDimensions,
  isAllowedImageFile,
  TITLE_MAX_LENGTH,
} from "../limits";
import {
  KEYWORD_PRESETS,
  MAX_CARD_KEYWORDS,
  canAddKeywordId,
  formatKeywordLineFromIds,
  reorderKeywordIds,
  resolveCardKeywordIds,
} from "../keywords";

type FieldPanelProps = {
  card: CardSpec;
  language: Language;
  text: UiText["fieldPanel"];
  onCardChange: (update: CardUpdate) => void;
};

export type FieldPanelSectionId =
  | "artwork"
  | "title"
  | "keywords"
  | "body"
  | "identity"
  | "values";

export type CollapsedFieldPanelSections = Partial<Record<FieldPanelSectionId, boolean>>;

type KeywordDragState = {
  keywordId: string;
  pointerId: number;
  startX: number;
  startIndex: number;
  targetIndex: number;
  startCenterX: number;
  otherChipCenters: number[];
  draggedWidth: number;
  gapX: number;
  minDeltaX: number;
  maxDeltaX: number;
  deltaX: number;
  didMove: boolean;
};

export function FieldPanel({
  card,
  language,
  text,
  onCardChange,
}: FieldPanelProps) {
  const [keywordDrag, setKeywordDrag] = useState<KeywordDragState | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<CollapsedFieldPanelSections>({});
  const [isArtworkDragActive, setIsArtworkDragActive] = useState(false);
  const suppressKeywordClickRef = useRef(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const artworkDragDepthRef = useRef(0);
  const kind = getKind(card.kind);
  const selectedKeywordIds = resolveCardKeywordIds(card);
  const availableKeywords = KEYWORD_PRESETS.filter((keyword) => canAddKeywordId(selectedKeywordIds, keyword.id));

  function update(next: Partial<CardSpec>) {
    onCardChange((currentCard) => ({ ...currentCard, ...next }));
  }

  function updateCost(key: keyof CardSpec["costs"], value: string) {
    const nextValue = key === "operation" && value === "" ? 0 : normalizeNumberFieldValue(value, 0, CARD_FACE_VALUE_MAX);
    onCardChange((currentCard) => ({
      ...currentCard,
      costs: {
        ...currentCard.costs,
        [key]: nextValue,
      },
    }));
  }

  function updateStat(key: keyof CardSpec["stats"], value: string) {
    const max = CARD_FACE_VALUE_MAX;
    const min = key === "hqDefense" ? 1 : 0;
    const nextValue = normalizeNumberFieldValue(value, min, max);
    onCardChange((currentCard) => ({
      ...currentCard,
      stats: {
        ...currentCard.stats,
        [key]: nextValue,
      },
    }));
  }

  function updateKeywords(keywordIds: string[]) {
    onCardChange((currentCard) => ({
      ...currentCard,
      keywords: keywordIds,
      keywordLine: formatKeywordLineFromIds(keywordIds),
    }));
  }

  function updateTextAppearance(
    role: keyof CardSpec["appearance"]["text"],
    next: Partial<CardSpec["appearance"]["text"]["title"]>,
  ) {
    onCardChange((currentCard) => ({
      ...currentCard,
      appearance: {
        ...currentCard.appearance,
        text: {
          ...currentCard.appearance.text,
          [role]: {
            ...currentCard.appearance.text[role],
            ...next,
          },
        },
      },
    }));
  }

  function addKeyword(keywordId: string) {
    if (!canAddKeywordId(selectedKeywordIds, keywordId)) {
      return;
    }

    updateKeywords([...selectedKeywordIds, keywordId]);
  }

  function removeKeyword(keywordId: string) {
    updateKeywords(selectedKeywordIds.filter((selectedKeywordId) => selectedKeywordId !== keywordId));
  }

  function handleKeywordClick(keywordId: string) {
    if (suppressKeywordClickRef.current) {
      suppressKeywordClickRef.current = false;
      return;
    }

    removeKeyword(keywordId);
  }

  function handleKeywordPointerDown(event: React.PointerEvent<HTMLButtonElement>, keywordId: string, startIndex: number) {
    if (event.button !== 0 || selectedKeywordIds.length < 2) {
      return;
    }

    const chip = event.currentTarget;
    const chipList = chip.parentElement;
    if (!chipList) {
      return;
    }

    const chipRect = chip.getBoundingClientRect();
    const chipListRect = chipList.getBoundingClientRect();
    const chipListStyle = window.getComputedStyle(chipList);
    const gapX = Number.parseFloat(chipListStyle.columnGap || chipListStyle.gap) || 0;
    const otherChipCenters = Array.from(chipList.querySelectorAll<HTMLButtonElement>("[data-keyword-chip]"))
      .map((keywordChip) => {
        const rect = keywordChip.getBoundingClientRect();
        return rect.left + rect.width / 2;
      })
      .filter((_, keywordIndex) => keywordIndex !== startIndex);

    chip.setPointerCapture(event.pointerId);
    setKeywordDrag({
      keywordId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex,
      targetIndex: startIndex,
      startCenterX: chipRect.left + chipRect.width / 2,
      otherChipCenters,
      draggedWidth: chipRect.width,
      gapX,
      minDeltaX: chipListRect.left - chipRect.left,
      maxDeltaX: chipListRect.right - chipRect.right,
      deltaX: 0,
      didMove: false,
    });
  }

  function handleKeywordPointerMove(event: React.PointerEvent<HTMLButtonElement>, keywordId: string) {
    setKeywordDrag((currentDrag) => {
      if (!currentDrag || currentDrag.keywordId !== keywordId || currentDrag.pointerId !== event.pointerId) {
        return currentDrag;
      }

      const deltaX = clamp(event.clientX - currentDrag.startX, currentDrag.minDeltaX, currentDrag.maxDeltaX);
      const centerX = currentDrag.startCenterX + deltaX;
      const targetIndex = resolveKeywordDropIndex(centerX, currentDrag.otherChipCenters);
      return {
        ...currentDrag,
        deltaX,
        targetIndex,
        didMove: currentDrag.didMove || Math.abs(deltaX) > 6,
      };
    });
  }

  function handleKeywordPointerUp(event: React.PointerEvent<HTMLButtonElement>, keywordId: string) {
    if (!keywordDrag || keywordDrag.keywordId !== keywordId || keywordDrag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const completedDrag = keywordDrag;
    setKeywordDrag(null);
    if (!completedDrag.didMove) {
      return;
    }

    suppressKeywordClickRef.current = true;
    window.setTimeout(() => {
      suppressKeywordClickRef.current = false;
    }, 0);
    const currentIndex = selectedKeywordIds.indexOf(completedDrag.keywordId);
    if (currentIndex === -1) {
      return;
    }

    updateKeywords(reorderKeywordIds(selectedKeywordIds, currentIndex, completedDrag.targetIndex));
  }

  function handleKeywordPointerCancel(event: React.PointerEvent<HTMLButtonElement>, keywordId: string) {
    if (!keywordDrag || keywordDrag.keywordId !== keywordId || keywordDrag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setKeywordDrag(null);
  }

  function insertBodyEffect(presetId: string) {
    const insertion = getBodyEffectPresetInsert(language, presetId);
    if (!insertion) {
      return;
    }

    const textarea = bodyTextareaRef.current;
    const currentBody = textarea?.value ?? card.body;
    const selectionStart = textarea?.selectionStart ?? currentBody.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const result = insertBodyTextAtSelection(currentBody, insertion, selectionStart, selectionEnd, BODY_MAX_LENGTH);
    update({ body: result.value });
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  function addBodyBoldMarkers() {
    const textarea = bodyTextareaRef.current;
    const currentBody = textarea?.value ?? card.body;
    const selectionStart = textarea?.selectionStart ?? currentBody.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const result = wrapBodySelectionWithBold(currentBody, selectionStart, selectionEnd, BODY_MAX_LENGTH);
    update({ body: result.value });
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  function getKeywordChipTransform(keywordId: string, index: number): string | undefined {
    if (!keywordDrag) {
      return undefined;
    }

    if (keywordDrag.keywordId === keywordId) {
      return `translateX(${keywordDrag.deltaX}px)`;
    }

    const shiftX = keywordDrag.draggedWidth + keywordDrag.gapX;
    if (keywordDrag.targetIndex > keywordDrag.startIndex && index > keywordDrag.startIndex && index <= keywordDrag.targetIndex) {
      return `translateX(${-shiftX}px)`;
    }

    if (keywordDrag.targetIndex < keywordDrag.startIndex && index >= keywordDrag.targetIndex && index < keywordDrag.startIndex) {
      return `translateX(${shiftX}px)`;
    }

    return undefined;
  }

  function updateCrop(key: keyof CardSpec["artwork"]["crop"], value: string) {
    if (value === "") {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const bounds = key === "scale" ? { min: 0.6, max: 3 } : { min: -300, max: 300 };
    const adjustedValue = key !== "scale" && Math.abs(numericValue) <= 4 ? 0 : numericValue;
    onCardChange((currentCard) => ({
      ...currentCard,
      artwork: {
        ...currentCard.artwork,
        crop: {
          ...currentCard.artwork.crop,
          [key]: clamp(adjustedValue, bounds.min, bounds.max),
        },
      },
    }));
  }

  async function importArtworkFile(file: File | null | undefined): Promise<boolean> {
    if (!file) {
      return false;
    }

    if (!(await isImportableArtworkFile(file)) || !(await hasAllowedArtworkDimensions(file))) {
      window.alert(text.invalidArtwork);
      return false;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        return;
      }
      onCardChange((currentCard) => ({
        ...currentCard,
        artwork: {
          source: "upload",
          dataUrl,
          crop: { x: 0, y: 0, scale: 1 },
        },
      }));
    });
    reader.readAsDataURL(file);
    return true;
  }

  function handleArtworkUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    void importArtworkFile(input.files?.[0]).then((imported) => {
      if (!imported) {
        input.value = "";
      }
    });
  }

  function handleArtworkDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    artworkDragDepthRef.current += 1;
    setIsArtworkDragActive(true);
  }

  function handleArtworkDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleArtworkDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    artworkDragDepthRef.current = Math.max(0, artworkDragDepthRef.current - 1);
    if (artworkDragDepthRef.current === 0) {
      setIsArtworkDragActive(false);
    }
  }

  function handleArtworkDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    artworkDragDepthRef.current = 0;
    setIsArtworkDragActive(false);
    void importArtworkFile(event.dataTransfer.files?.[0]);
  }

  function toggleSection(sectionId: FieldPanelSectionId) {
    setCollapsedSections((currentSections) => toggleFieldPanelSection(currentSections, sectionId));
  }

  return (
    <aside className="panel field-panel" aria-label={text.aria}>
      <FieldPanelSection
        id="artwork"
        title={text.artwork}
        collapsed={Boolean(collapsedSections.artwork)}
        toggleLabel={text.toggleSection(text.artwork)}
        onToggle={toggleSection}
      >
        <div
          className={`artwork-drop-zone${isArtworkDragActive ? " is-drag-active" : ""}`}
          onDragEnter={handleArtworkDragEnter}
          onDragOver={handleArtworkDragOver}
          onDragLeave={handleArtworkDragLeave}
          onDrop={handleArtworkDrop}
        >
          <label className="field-block">
            <span>{text.artwork}</span>
            <input name="artwork-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleArtworkUpload} />
          </label>

          <div className="crop-grid">
            <label className="crop-control">
              <span className="crop-control-header">
                <span>{text.artX}</span>
                <input
                  className="crop-value-input"
                  name="artwork-crop-x-value"
                  type="number"
                  min="-300"
                  max="300"
                  step="1"
                  value={card.artwork.crop.x}
                  onChange={(event) => updateCrop("x", event.target.value)}
                />
              </span>
              <input
                name="artwork-crop-x"
                type="range"
                min="-300"
                max="300"
                value={card.artwork.crop.x}
                onChange={(event) => updateCrop("x", event.target.value)}
              />
            </label>
            <label className="crop-control">
              <span className="crop-control-header">
                <span>{text.artY}</span>
                <input
                  className="crop-value-input"
                  name="artwork-crop-y-value"
                  type="number"
                  min="-300"
                  max="300"
                  step="1"
                  value={card.artwork.crop.y}
                  onChange={(event) => updateCrop("y", event.target.value)}
                />
              </span>
              <input
                name="artwork-crop-y"
                type="range"
                min="-300"
                max="300"
                value={card.artwork.crop.y}
                onChange={(event) => updateCrop("y", event.target.value)}
              />
            </label>
            <label className="crop-control">
              <span className="crop-control-header">
                <span>{text.zoom}</span>
                <input
                  className="crop-value-input"
                  name="artwork-crop-scale-value"
                  type="number"
                  min="0.6"
                  max="3"
                  step="0.05"
                  value={card.artwork.crop.scale}
                  onChange={(event) => updateCrop("scale", event.target.value)}
                />
              </span>
              <input
                name="artwork-crop-scale"
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={card.artwork.crop.scale}
                onChange={(event) => updateCrop("scale", event.target.value)}
              />
            </label>
          </div>
        </div>
      </FieldPanelSection>

      <FieldPanelSection
        id="title"
        title={text.title}
        collapsed={Boolean(collapsedSections.title)}
        toggleLabel={text.toggleSection(text.title)}
        onToggle={toggleSection}
      >
        <label className="field-block">
          <span>{text.title}</span>
          <input
            name="card-title"
            value={card.title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
        <div className="text-appearance-grid" aria-label={text.titleAppearance}>
          <TextAppearanceRange
            label={text.fontSize}
            name="card-title-font-scale"
            value={card.appearance.text.title.fontScale}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.fontScale}
            onChange={(value) => updateTextAppearance("title", { fontScale: value })}
          />
          <TextAppearanceRange
            label={text.horizontalScale}
            name="card-title-scale-x"
            value={card.appearance.text.title.scaleX}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.scaleX}
            onChange={(value) => updateTextAppearance("title", { scaleX: value })}
          />
          <TextAppearanceRange
            label={text.verticalScale}
            name="card-title-scale-y"
            value={card.appearance.text.title.scaleY}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.scaleY}
            onChange={(value) => updateTextAppearance("title", { scaleY: value })}
          />
          <TextAppearanceRange
            label={text.offsetX}
            name="card-title-offset-x"
            value={card.appearance.text.title.offsetX}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.offsetX}
            onChange={(value) => updateTextAppearance("title", { offsetX: value })}
          />
          <TextAppearanceRange
            label={text.offsetY}
            name="card-title-offset-y"
            value={card.appearance.text.title.offsetY}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.offsetY}
            onChange={(value) => updateTextAppearance("title", { offsetY: value })}
          />
          <label className="text-toggle">
            <span>{text.titleBold}</span>
            <input
              name="card-title-bold"
              type="checkbox"
              checked={card.appearance.text.title.bold}
              onChange={(event) => updateTextAppearance("title", { bold: event.target.checked })}
            />
          </label>
        </div>
      </FieldPanelSection>

      <FieldPanelSection
        id="keywords"
        title={text.keywords}
        collapsed={Boolean(collapsedSections.keywords)}
        toggleLabel={text.toggleSection(text.keywords)}
        onToggle={toggleSection}
      >
        <div className="field-block keyword-field">
          <span>{text.keywords}</span>
          <div className="keyword-chip-list">
            {selectedKeywordIds.map((keywordId, index) => {
              const keyword = KEYWORD_PRESETS.find((keywordOption) => keywordOption.id === keywordId);
              const label = keyword ? translateKeywordLabel(language, keyword.id, keyword.label) : keywordId;
              const isDragging = keywordDrag?.keywordId === keywordId;
              const chipTransform = getKeywordChipTransform(keywordId, index);
              return (
                <button
                  key={keywordId}
                  type="button"
                  className={`keyword-chip${isDragging ? " is-dragging" : ""}${chipTransform && !isDragging ? " is-shifting" : ""}`}
                  data-keyword-chip="true"
                  data-keyword-id={keywordId}
                  aria-label={text.removeKeyword(label)}
                  style={chipTransform ? { transform: chipTransform } : undefined}
                  onClick={() => handleKeywordClick(keywordId)}
                  onPointerDown={(event) => handleKeywordPointerDown(event, keywordId, index)}
                  onPointerMove={(event) => handleKeywordPointerMove(event, keywordId)}
                  onPointerUp={(event) => handleKeywordPointerUp(event, keywordId)}
                  onPointerCancel={(event) => handleKeywordPointerCancel(event, keywordId)}
                >
                  <span>{label}</span>
                  <strong aria-hidden="true">x</strong>
                </button>
              );
            })}
          </div>
          <select
            name="card-keyword-add"
            value=""
            disabled={selectedKeywordIds.length >= MAX_CARD_KEYWORDS || availableKeywords.length === 0}
            onChange={(event) => addKeyword(event.target.value)}
          >
            <option value="">{text.addKeyword}</option>
            {availableKeywords.map((keyword) => (
              <option key={keyword.id} value={keyword.id}>
                {translateKeywordLabel(language, keyword.id, keyword.label)}
              </option>
            ))}
          </select>
        </div>
        <div className="text-appearance-grid" aria-label={text.keywordAppearance}>
          <TextAppearanceRange
            label={text.fontSize}
            name="card-keyword-font-scale"
            value={card.appearance.text.keywords.fontScale}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.fontScale}
            onChange={(value) => updateTextAppearance("keywords", { fontScale: value })}
          />
          <TextAppearanceRange
            label={text.horizontalScale}
            name="card-keyword-scale-x"
            value={card.appearance.text.keywords.scaleX}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.scaleX}
            onChange={(value) => updateTextAppearance("keywords", { scaleX: value })}
          />
          <TextAppearanceRange
            label={text.verticalScale}
            name="card-keyword-scale-y"
            value={card.appearance.text.keywords.scaleY}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.scaleY}
            onChange={(value) => updateTextAppearance("keywords", { scaleY: value })}
          />
          <TextAppearanceRange
            label={text.offsetX}
            name="card-keyword-offset-x"
            value={card.appearance.text.keywords.offsetX}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.offsetX}
            onChange={(value) => updateTextAppearance("keywords", { offsetX: value })}
          />
          <TextAppearanceRange
            label={text.offsetY}
            name="card-keyword-offset-y"
            value={card.appearance.text.keywords.offsetY}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.offsetY}
            onChange={(value) => updateTextAppearance("keywords", { offsetY: value })}
          />
        </div>
      </FieldPanelSection>

      <FieldPanelSection
        id="body"
        title={text.body}
        collapsed={Boolean(collapsedSections.body)}
        toggleLabel={text.toggleSection(text.body)}
        onToggle={toggleSection}
      >
        <div className="field-block body-field">
          <span>{text.body}</span>
          <div className="body-effect-buttons" aria-label={text.addBodyEmphasis}>
            <button type="button" className="body-effect-button" onClick={addBodyBoldMarkers} aria-label={text.addBodyBold}>
              {text.addBodyBold}
            </button>
            {BODY_EFFECT_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className="body-effect-button" onClick={() => insertBodyEffect(preset.id)}>
                {getBodyEffectPresetLabel(language, preset.id)}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyTextareaRef}
            name="card-body"
            value={card.body}
            rows={5}
            maxLength={BODY_MAX_LENGTH}
            onChange={(event) => update({ body: event.target.value })}
          />
        </div>
        <div className="text-appearance-grid" aria-label={text.bodyAppearance}>
          <TextAppearanceRange
            label={text.fontSize}
            name="card-body-font-scale"
            value={card.appearance.text.body.fontScale}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.fontScale}
            onChange={(value) => updateTextAppearance("body", { fontScale: value })}
          />
          <TextAppearanceRange
            label={text.horizontalScale}
            name="card-body-scale-x"
            value={card.appearance.text.body.scaleX}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.scaleX}
            onChange={(value) => updateTextAppearance("body", { scaleX: value })}
          />
          <TextAppearanceRange
            label={text.verticalScale}
            name="card-body-scale-y"
            value={card.appearance.text.body.scaleY}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.scaleY}
            onChange={(value) => updateTextAppearance("body", { scaleY: value })}
          />
          <TextAppearanceRange
            label={text.offsetX}
            name="card-body-offset-x"
            value={card.appearance.text.body.offsetX}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.offsetX}
            onChange={(value) => updateTextAppearance("body", { offsetX: value })}
          />
          <TextAppearanceRange
            label={text.offsetY}
            name="card-body-offset-y"
            value={card.appearance.text.body.offsetY}
            bounds={CARD_TEXT_APPEARANCE_BOUNDS.offsetY}
            onChange={(value) => updateTextAppearance("body", { offsetY: value })}
          />
        </div>
      </FieldPanelSection>

      <FieldPanelSection
        id="identity"
        title={text.identitySection}
        collapsed={Boolean(collapsedSections.identity)}
        toggleLabel={text.toggleSection(text.identitySection)}
        onToggle={toggleSection}
      >
        <div className="select-grid">
          <label>
            <span>{text.nation}</span>
            <select name="card-nation" value={card.nation} onChange={(event) => update({ nation: event.target.value })}>
              {NATIONS.map((nation) => (
                <option key={nation.id} value={nation.id}>
                  {translatePresetLabel(language, "nation", nation.id, nation.label)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{text.type}</span>
            <select
              name="card-kind"
              value={card.kind}
              onChange={(event) => update({ kind: event.target.value as CardSpec["kind"] })}
            >
              {CARD_KINDS.map((kindOption) => (
                <option key={kindOption.id} value={kindOption.id}>
                  {translatePresetLabel(language, "kind", kindOption.id, kindOption.label)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{text.rarity}</span>
            <select name="card-rarity" value={card.rarity} onChange={(event) => update({ rarity: event.target.value })}>
              {RARITIES.map((rarity) => (
                <option key={rarity.id} value={rarity.id}>
                  {translatePresetLabel(language, "rarity", rarity.id, rarity.label)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{text.set}</span>
            <select name="card-set" value={card.set} onChange={(event) => update({ set: event.target.value })}>
              {SETS.map((set) => (
                <option key={set.id} value={set.id}>
                  {translatePresetLabel(language, "set", set.id, set.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FieldPanelSection>

      <FieldPanelSection
        id="values"
        title={text.valuesSection}
        collapsed={Boolean(collapsedSections.values)}
        toggleLabel={text.toggleSection(text.valuesSection)}
        onToggle={toggleSection}
      >
        <div className="number-grid">
          {card.kind !== "hq" ? (
            <NumberField
              label={text.cost}
              name="card-deployment-cost"
              value={card.costs.deployment}
              max={CARD_FACE_VALUE_MAX}
              onChange={(value) => updateCost("deployment", value)}
            />
          ) : null}
          {kind.hasOperationCost ? (
            <NumberField
              label={text.operation}
              name="card-operation-cost"
              value={card.costs.operation}
              max={CARD_FACE_VALUE_MAX}
              onChange={(value) => updateCost("operation", value)}
            />
          ) : null}
          {kind.hasStats ? (
            <>
              <NumberField
                label={text.attack}
                name="card-attack"
                value={card.stats.attack}
                max={CARD_FACE_VALUE_MAX}
                onChange={(value) => updateStat("attack", value)}
              />
              <NumberField
                label={text.defense}
                name="card-defense"
                value={card.stats.defense}
                max={CARD_FACE_VALUE_MAX}
                onChange={(value) => updateStat("defense", value)}
              />
            </>
          ) : null}
          {card.kind === "hq" ? (
            <NumberField
              label={text.hqDefense}
              name="card-hq-defense"
              value={card.stats.hqDefense}
              min={1}
              max={CARD_FACE_VALUE_MAX}
              onChange={(value) => updateStat("hqDefense", value)}
            />
          ) : null}
        </div>
      </FieldPanelSection>
    </aside>
  );
}

export function toggleFieldPanelSection(
  sections: CollapsedFieldPanelSections,
  sectionId: FieldPanelSectionId,
): CollapsedFieldPanelSections {
  return {
    ...sections,
    [sectionId]: !sections[sectionId],
  };
}

export function isImportableArtworkFile(file: Pick<File, "name" | "type" | "size" | "slice">): Promise<boolean> {
  return isAllowedImageFile(file);
}

export function hasDraggedFiles(dataTransfer: Pick<DataTransfer, "items" | "files">): boolean {
  if (dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some((item) => item.kind === "file");
  }

  return dataTransfer.files.length > 0;
}

function hasAllowedArtworkDimensions(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(isAllowedImageDimensions(image));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    image.src = url;
  });
}

function FieldPanelSection({
  id,
  title,
  collapsed,
  toggleLabel,
  onToggle,
  children,
}: {
  id: FieldPanelSectionId;
  title: string;
  collapsed: boolean;
  toggleLabel: string;
  onToggle: (sectionId: FieldPanelSectionId) => void;
  children: React.ReactNode;
}) {
  const contentId = `field-section-${id}`;

  return (
    <section className={`field-section${collapsed ? " is-collapsed" : ""}`} aria-labelledby={`${contentId}-heading`}>
      <div className="field-section-header">
        <h2 id={`${contentId}-heading`}>{title}</h2>
        <button
          type="button"
          className="section-toggle"
          aria-label={toggleLabel}
          aria-controls={contentId}
          aria-expanded={!collapsed}
          onClick={() => onToggle(id)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      {!collapsed ? (
        <div id={contentId} className="field-section-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function NumberField({
  label,
  name,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  name: string;
  value: number | undefined;
  min?: number;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAppearanceRange({
  label,
  name,
  value,
  bounds,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  bounds: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  const displayValue = bounds.min < 0 ? `${value > 0 ? "+" : ""}${value}` : `${Math.round(value * 100)}%`;

  return (
    <label className="text-appearance-control">
      <span>
        <span>{label}</span>
        <strong>{displayValue}</strong>
      </span>
      <input
        name={name}
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={bounds.min < 0 ? "1" : "0.05"}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function resolveKeywordDropIndex(centerX: number, otherChipCenters: number[]): number {
  return otherChipCenters.filter((chipCenter) => centerX > chipCenter).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumberFieldValue(value: string, min: number, max: number): number | undefined {
  if (value === "") {
    return undefined;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  return clamp(Math.round(numericValue), min, max);
}
