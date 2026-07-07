import {
  imageMasksSchema,
  textMasksSchema,
  type ImageMask,
  type TextMask,
} from "./masks.js";

export function parseTextMasksJson(raw: string): TextMask[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = textMasksSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function parseImageMasksJson(raw: string): ImageMask[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = imageMasksSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
