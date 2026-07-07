import { parseImageMasksJson, parseTextMasksJson } from "../masks/parse.js";
import { shuffleArray } from "./deck-session.js";
import type { OcrData, TextMask } from "../masks/masks.js";
import type { Card, MaskAnswer } from "../library/app-api-types.js";

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

export function extractMaskAnswers(cards: Card[]): MaskAnswer[] {
  const answers: MaskAnswer[] = [];

  for (const card of cards) {
    if (card.kind === "qa" && card.content && card.answer) {
      const masks = parseTextMasksJson(card.masks);
      answers.push({
        cardId: card.id,
        prompt: buildQaPrompt(card.content, masks),
        answer: card.answer,
        kind: "qa",
      });
      continue;
    }

    if (card.kind === "text" && card.content) {
      const masks = parseTextMasksJson(card.masks);
      for (const mask of masks) {
        const answer = card.content.slice(mask.start, mask.end);
        if (!answer.trim()) continue;
        const prompt =
          card.content.slice(0, mask.start).slice(-40) +
          "【  】" +
          card.content.slice(mask.end).slice(0, 40);
        answers.push({ cardId: card.id, prompt, answer, kind: "text" });
      }
    }

    if (card.kind === "image") {
      const masks = parseImageMasksJson(card.masks);
      const ocr: OcrData | null = card.ocrData
        ? (JSON.parse(card.ocrData) as OcrData)
        : null;

      for (const mask of masks) {
        if (mask.type === "ocr" && ocr) {
          for (const id of mask.wordIds) {
            const word = ocr.words.find((w) => w.id === id);
            if (word?.text.trim()) {
              answers.push({
                cardId: card.id,
                prompt: card.ocrText?.slice(0, 80) || "画像カード",
                answer: word.text,
                kind: "image",
              });
            }
          }
        }
      }

      if (card.ocrText && answers.every((a) => a.cardId !== card.id)) {
        answers.push({
          cardId: card.id,
          prompt: "画像の内容",
          answer: card.ocrText.slice(0, 120),
          kind: "image",
        });
      }
    }
  }

  return answers;
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function answersMatch(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}

export function pickDistractors(
  all: MaskAnswer[],
  correct: MaskAnswer,
  count: number,
): string[] {
  const pool = all
    .filter((a) => a.answer !== correct.answer)
    .map((a) => a.answer);
  const unique = [...new Set(pool)];
  const shuffled = shuffleArray(unique);
  return shuffled.slice(0, count);
}
