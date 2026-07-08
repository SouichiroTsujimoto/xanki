import { describe, expect, it } from "vitest";
import { buildStudyCardContext } from "./card-context.js";
import type { Card } from "../library/app-api-types.js";

function baseCard(overrides: Partial<Card>): Card {
  return {
    id: "card-1",
    deckId: "deck-1",
    kind: "text",
    masks: "[]",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("buildStudyCardContext", () => {
  it("formats qa cards with question and answer", () => {
    const context = buildStudyCardContext(
      baseCard({
        kind: "qa",
        content: "光合成とは？",
        answer: "植物が光で養分を作ること",
      }),
    );

    expect(context).toContain("種別: qa");
    expect(context).toContain("問題: 光合成とは？");
    expect(context).toContain("解答: 植物が光で養分を作ること");
  });

  it("formats text cards with masks as blanks", () => {
    const context = buildStudyCardContext(
      baseCard({
        kind: "text",
        content: "東京は日本の首都である",
        masks: JSON.stringify([{ type: "range", start: 0, end: 2 }]),
      }),
    );

    expect(context).toContain("問題:");
    expect(context).toContain("【  】");
    expect(context).toContain("解答: 東京");
  });

  it("includes note when present", () => {
    const context = buildStudyCardContext(
      baseCard({
        kind: "text",
        content: "sample",
        note: "復習用メモ",
      }),
    );

    expect(context).toContain("メモ: 復習用メモ");
  });
});
