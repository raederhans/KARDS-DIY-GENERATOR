export type BodyMarkupSegment = {
  text: string;
  bold: boolean;
};

export type BodyEffectPresetId = "deployment" | "destruction" | "pincer";

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
    labels: { en: "Destruction", zh: "亡记" },
    inserts: { en: "**Destruction**: ", zh: "**亡记**：" },
  },
  {
    id: "pincer",
    labels: { en: "Pincer", zh: "钳击" },
    inserts: { en: "**Pincer**: ", zh: "**钳击**：" },
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
  const nextValue = `${value.slice(0, lowerIndex)}${insertion}${value.slice(upperIndex)}`.slice(0, maxLength);
  return {
    value: nextValue,
    cursor: Math.min(lowerIndex + insertion.length, nextValue.length),
  };
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
  const nextValue = `${value.slice(0, lowerIndex)}${insertion}${value.slice(upperIndex)}`.slice(0, maxLength);
  return {
    value: nextValue,
    cursor: Math.min(lowerIndex + (selectedText ? insertion.length : 2), nextValue.length),
  };
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

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value)) {
    return length;
  }
  return Math.max(0, Math.min(Math.round(value), length));
}
