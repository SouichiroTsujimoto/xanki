import type { ImageMask, TextMask } from "../types";

export function parseTextMasks(raw: string): TextMask[] {
  return JSON.parse(raw) as TextMask[];
}

export function parseImageMasks(raw: string): ImageMask[] {
  return JSON.parse(raw) as ImageMask[];
}
