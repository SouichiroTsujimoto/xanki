import { describe, expect, it } from "vitest";
import {
  countDueCards,
  filterStudyCards,
  mapApiDeck,
  parseImageMasksJson,
  parseTextMasksJson,
} from "./cloud-mappers.js";

describe("cloud-mappers", () => {
  it("mapApiDeck fills defaults", () => {
    const deck = mapApiDeck({ id: "d1", name: "Test" });
    expect(deck.cardCount).toBe(0);
    expect(deck.createdAt).toBeGreaterThan(0);
  });

  it("filterStudyCards due and starred", () => {
    const now = Date.now();
    const cards = [
      { deckId: "d1", dueAt: now - 1, starred: false },
      { deckId: "d1", dueAt: now + 1, starred: true },
      { deckId: "d2", dueAt: now - 1, starred: false },
    ];
    expect(filterStudyCards(cards, "due", "d1")).toHaveLength(1);
    expect(filterStudyCards(cards, "starred", "d1")).toHaveLength(1);
    expect(filterStudyCards(cards, "all", "d1")).toHaveLength(2);
  });

  it("countDueCards", () => {
    const now = 500;
    const cards = [{ dueAt: 400 }, { dueAt: 600 }];
    expect(countDueCards(cards, now)).toBe(1);
  });

  it("parseTextMasksJson returns empty on invalid json", () => {
    expect(parseTextMasksJson("not json")).toEqual([]);
    expect(parseTextMasksJson('[{"type":"range","start":0,"end":1}]')).toEqual([
      { type: "range", start: 0, end: 1 },
    ]);
  });

  it("parseImageMasksJson returns empty on invalid shape", () => {
    expect(parseImageMasksJson('[{"type":"rect","x":0}]')).toEqual([]);
  });
});
