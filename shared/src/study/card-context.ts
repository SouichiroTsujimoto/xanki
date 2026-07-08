import { parseImageMasksJson, parseTextMasksJson } from "../masks/parse.js";
import type { TextMask } from "../masks/masks.js";
import type { Card } from "../library/app-api-types.js";

function buildQaPrompt(content: string, masks: TextMask[]): string {
  if (masks.length === 0) return content;

  const sorted = [...masks].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let prompt = "";

  for (const mask of sorted) {
    prompt += content.slice(cursor, mask.start);
    prompt += "【  】";
    cursor = mask.end;
  }

  prompt += content.slice(cursor);
  return prompt;
}

export function buildStudyCardContext(card: Card): string {
  const lines: string[] = [`種別: ${card.kind}`];

  if (card.kind === "qa") {
    if (card.content) {
      const masks = parseTextMasksJson(card.masks);
      lines.push(`問題: ${buildQaPrompt(card.content, masks)}`);
    }
    if (card.answer) {
      lines.push(`解答: ${card.answer}`);
    }
  }

  if (card.kind === "text" && card.content) {
    const masks = parseTextMasksJson(card.masks);
    if (masks.length > 0) {
      lines.push(`問題: ${buildQaPrompt(card.content, masks)}`);
      const answers = masks
        .map((mask) => card.content!.slice(mask.start, mask.end))
        .filter((value) => value.trim().length > 0);
      if (answers.length > 0) {
        lines.push(`解答: ${answers.join(" / ")}`);
      }
    } else {
      lines.push(`本文: ${card.content}`);
    }
  }

  if (card.kind === "image") {
    if (card.ocrText) {
      lines.push(`画像テキスト: ${card.ocrText}`);
    }
    const masks = parseImageMasksJson(card.masks);
    if (masks.length > 0) {
      lines.push(`マスク数: ${masks.length}`);
    }
  }

  if (card.note?.trim()) {
    lines.push(`メモ: ${card.note}`);
  }

  return lines.join("\n");
}
