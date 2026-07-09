export type BodyMarkupSegment = {
  text: string;
  bold: boolean;
};

export type BodyEffectPresetId = "deployment" | "destruction" | "bond" | "pincer" | "chooseOne";

type BodyEffectPreset = {
  id: BodyEffectPresetId;
  labels: Record<"en" | "zh", string>;
  inserts: Record<"en" | "zh", string>;
};

export const BODY_EFFECT_PRESETS: BodyEffectPreset[] = [
  {
    id: "deployment",
    labels: { en: "Deployment", zh: "部署" },
    inserts: { en: "**Deployment**: ", zh: "**部署**：" },
  },
  {
    id: "destruction",
    labels: { en: "Destruction", zh: "亡计" },
    inserts: { en: "**Destruction**: ", zh: "**亡计**：" },
  },
  {
    id: "bond",
    labels: { en: "Bond", zh: "协力" },
    inserts: { en: "**Bond**: ", zh: "**协力**：" },
  },
  {
    id: "pincer",
    labels: { en: "Pincer", zh: "钳击" },
    inserts: { en: "**Pincer**: ", zh: "**钳击**：" },
  },
  {
    id: "chooseOne",
    labels: { en: "Choose One", zh: "抉择" },
    inserts: { en: "**Choose One**: ", zh: "**抉择**：" },
  },
];

const BODY_EFFECT_PRESET_BY_ID = new Map(BODY_EFFECT_PRESETS.map((preset) => [preset.id, preset]));

export function getBodyEffectPresetLabel(language: "en" | "zh", presetId: string): string {
  return BODY_EFFECT_PRESET_BY_ID.get(presetId as BodyEffectPresetId)?.labels[language] ?? presetId;
}

export function getBodyEffectPresetInsert(language: "en" | "zh", presetId: string): string {
  return BODY_EFFECT_PRESET_BY_ID.get(presetId as BodyEffectPresetId)?.inserts[language] ?? "";
}

export function insertBodyTextAtSelection(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
  maxLength: number,
): { value: string; cursor: number } {
  const start = clampIndex(selectionStart, value.length);
  const end = clampIndex(selectionEnd, value.length);
  const lowerIndex = Math.min(start, end);
  const upperIndex = Math.max(start, end);
  return replaceSelectionWithCompleteText(value, insertion, lowerIndex, upperIndex, maxLength, lowerIndex + insertion.length);
}

export function wrapBodySelectionWithBold(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  maxLength: number,
): { value: string; cursor: number } {
  const start = clampIndex(selectionStart, value.length);
  const end = clampIndex(selectionEnd, value.length);
  const lowerIndex = Math.min(start, end);
  const upperIndex = Math.max(start, end);
  const selectedText = value.slice(lowerIndex, upperIndex);
  const insertion = selectedText ? `**${selectedText}**` : "****";
  return replaceSelectionWithCompleteText(
    value,
    insertion,
    lowerIndex,
    upperIndex,
    maxLength,
    lowerIndex + (selectedText ? insertion.length : 2),
  );
}

export function parseBodyMarkup(value: string): BodyMarkupSegment[][] {
  return value.split(/\r\n|\r|\n/).map(parseBodyMarkupLine);
}

function parseBodyMarkupLine(line: string): BodyMarkupSegment[] {
  const segments: BodyMarkupSegment[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    const boldStart = line.indexOf("**", cursor);
    if (boldStart === -1) {
      pushSegment(segments, line.slice(cursor), false);
      break;
    }

    const boldEnd = line.indexOf("**", boldStart + 2);
    if (boldEnd === -1) {
      pushSegment(segments, line.slice(cursor), false);
      break;
    }

    pushSegment(segments, line.slice(cursor, boldStart), false);
    pushSegment(segments, line.slice(boldStart + 2, boldEnd), true);
    cursor = boldEnd + 2;
  }

  return segments;
}

function pushSegment(segments: BodyMarkupSegment[], text: string, bold: boolean): void {
  if (!text) {
    return;
  }

  const previous = segments.at(-1);
  if (previous?.bold === bold) {
    previous.text += text;
    return;
  }

  segments.push({ text, bold });
}

function replaceSelectionWithCompleteText(
  value: string,
  insertion: string,
  lowerIndex: number,
  upperIndex: number,
  maxLength: number,
  cursor: number,
): { value: string; cursor: number } {
  const nextValue = `${value.slice(0, lowerIndex)}${insertion}${value.slice(upperIndex)}`;
  if (nextValue.length > maxLength) {
    return {
      value,
      cursor: lowerIndex,
    };
  }

  return {
    value: nextValue,
    cursor,
  };
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value)) {
    return length;
  }
  return Math.max(0, Math.min(Math.round(value), length));
}
