import { CARD_KINDS, NATIONS, RARITIES, SETS, getKind } from "../presets";
import { translatePresetLabel, type Language, type UiText } from "../i18n";
import type { CardSpec, CardUpdate } from "../types";
import {
  BODY_MAX_LENGTH,
  isAllowedImageType,
  KEYWORD_MAX_LENGTH,
  MAX_IMAGE_FILE_BYTES,
  TITLE_MAX_LENGTH,
} from "../limits";

type FieldPanelProps = {
  card: CardSpec;
  language: Language;
  text: UiText["fieldPanel"];
  onCardChange: (update: CardUpdate) => void;
  setOptionLabels?: Partial<Record<string, string>>;
};

export function FieldPanel({ card, language, text, onCardChange, setOptionLabels }: FieldPanelProps) {
  const kind = getKind(card.kind);

  function update(next: Partial<CardSpec>) {
    onCardChange((currentCard) => ({ ...currentCard, ...next }));
  }

  function updateCost(key: keyof CardSpec["costs"], value: string) {
    onCardChange((currentCard) => ({
      ...currentCard,
      costs: {
        ...currentCard.costs,
        [key]: value === "" ? undefined : Number(value),
      },
    }));
  }

  function updateStat(key: keyof CardSpec["stats"], value: string) {
    onCardChange((currentCard) => ({
      ...currentCard,
      stats: {
        ...currentCard.stats,
        [key]: value === "" ? undefined : Number(value),
      },
    }));
  }

  function updateCrop(key: keyof CardSpec["artwork"]["crop"], value: string) {
    onCardChange((currentCard) => ({
      ...currentCard,
      artwork: {
        ...currentCard.artwork,
        crop: {
          ...currentCard.artwork.crop,
          [key]: Number(value),
        },
      },
    }));
  }

  function handleArtworkUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isAllowedImageType(file.type) || file.size > MAX_IMAGE_FILE_BYTES) {
      window.alert(text.invalidArtwork);
      event.target.value = "";
      return;
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
  }

  return (
    <aside className="panel field-panel" aria-label={text.aria}>
      <div className="panel-heading">
        <p>{text.heading}</p>
        <span>{text.scope}</span>
      </div>

      <label className="field-block">
        <span>{text.artwork}</span>
        <input name="artwork-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleArtworkUpload} />
      </label>

      <div className="crop-grid">
        <label>
          <span>{text.artX}</span>
          <input
            name="artwork-crop-x"
            type="range"
            min="-300"
            max="300"
            value={card.artwork.crop.x}
            onChange={(event) => updateCrop("x", event.target.value)}
          />
        </label>
        <label>
          <span>{text.artY}</span>
          <input
            name="artwork-crop-y"
            type="range"
            min="-300"
            max="300"
            value={card.artwork.crop.y}
            onChange={(event) => updateCrop("y", event.target.value)}
          />
        </label>
        <label>
          <span>{text.zoom}</span>
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

      <label className="field-block">
        <span>{text.title}</span>
        <input
          name="card-title"
          value={card.title}
          maxLength={TITLE_MAX_LENGTH}
          onChange={(event) => update({ title: event.target.value })}
        />
      </label>

      <label className="field-block">
        <span>{text.keywordLine}</span>
        <input
          name="card-keyword-line"
          value={card.keywordLine ?? ""}
          maxLength={KEYWORD_MAX_LENGTH}
          onChange={(event) => update({ keywordLine: event.target.value })}
        />
      </label>

      <label className="field-block">
        <span>{text.body}</span>
        <textarea
          name="card-body"
          value={card.body}
          rows={5}
          maxLength={BODY_MAX_LENGTH}
          onChange={(event) => update({ body: event.target.value })}
        />
      </label>

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

        <label className={setOptionLabels ? "set-select-label is-reference-sample" : undefined}>
          <span>{text.set}</span>
          <select name="card-set" value={card.set} onChange={(event) => update({ set: event.target.value })}>
            {SETS.map((set) => (
              <option key={set.id} value={set.id}>
                {formatSetOptionLabel(set, language, setOptionLabels)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="number-grid">
        <NumberField
          label={text.cost}
          name="card-deployment-cost"
          value={card.costs.deployment}
          onChange={(value) => updateCost("deployment", value)}
        />
        {kind.hasOperationCost ? (
          <NumberField
            label={text.operation}
            name="card-operation-cost"
            value={card.costs.operation}
            onChange={(value) => updateCost("operation", value)}
          />
        ) : null}
        {kind.hasStats ? (
          <>
            <NumberField
              label={text.attack}
              name="card-attack"
              value={card.stats.attack}
              onChange={(value) => updateStat("attack", value)}
            />
            <NumberField
              label={text.defense}
              name="card-defense"
              value={card.stats.defense}
              onChange={(value) => updateStat("defense", value)}
            />
          </>
        ) : null}
        {card.kind === "hq" ? (
          <NumberField
            label={text.hqDefense}
            name="card-hq-defense"
            value={card.stats.hqDefense}
            onChange={(value) => updateStat("hqDefense", value)}
          />
        ) : null}
      </div>
    </aside>
  );
}

function formatSetOptionLabel(
  set: { id: string; label: string },
  language: Language,
  setOptionLabels?: Partial<Record<string, string>>,
) {
  const sampleLabel = setOptionLabels?.[set.id];
  const setLabel = translatePresetLabel(language, "set", set.id, set.label);
  return sampleLabel ? `${sampleLabel} (${setLabel})` : setLabel;
}

function NumberField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        max="40"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
