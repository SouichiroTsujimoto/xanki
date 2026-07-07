import type { TextMask, MaskSuggester } from "../../types";
import { cloud } from "./client";

export class CloudMaskSuggester implements MaskSuggester {
  async suggest(content: string): Promise<TextMask[]> {
    try {
      const { items } = await cloud.qaGenerate(content, "qa");
      if (items.length === 0) return [];
      const first = items[0].question;
      const idx = content.indexOf(first.slice(0, Math.min(first.length, 20)));
      if (idx >= 0) {
        return [{ type: "range", start: idx, end: idx + first.length }];
      }
    } catch {
      return [];
    }
    return [];
  }
}
