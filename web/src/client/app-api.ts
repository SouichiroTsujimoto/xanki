import type { ApiCard } from "@xanki/shared";
import type { AppApi, Card, Deck, DeckExport, ImageMask, ReviewCard, StudyFilter, TextMask } from "@xanki/ui";
import { cloudApi } from "./api";

function parseTextMasks(raw: string): TextMask[] {
  return JSON.parse(raw) as TextMask[];
}

function parseImageMasks(raw: string): ImageMask[] {
  return JSON.parse(raw) as ImageMask[];
}

function mapDeck(deck: {
  id: string;
  name: string;
  cardCount?: number;
  createdAt?: number;
  updatedAt?: number;
}): Deck {
  return {
    id: deck.id,
    name: deck.name,
    cardCount: deck.cardCount ?? 0,
    createdAt: deck.createdAt ?? Date.now(),
    updatedAt: deck.updatedAt ?? Date.now(),
  };
}

function mapCard(raw: ApiCard): Card {
  return {
    id: raw.id,
    deckId: raw.deckId,
    kind: raw.kind,
    content: raw.content ?? undefined,
    answer: raw.answer ?? undefined,
    imageHash: raw.imageHash ?? undefined,
    imagePath: raw.imageHash ?? undefined,
    ocrText: raw.ocrText ?? undefined,
    ocrData: raw.ocrData ?? undefined,
    masks: raw.masks,
    note: raw.note ?? undefined,
    sourceHint: raw.sourceHint ?? undefined,
    starred: Boolean(raw.starred),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    boxNum: raw.boxNum,
    dueAt: raw.dueAt,
  };
}

function filterStudyCards(cards: Card[], filter: StudyFilter, deckId?: string): Card[] {
  const now = Date.now();
  let filtered = cards;
  if (deckId) {
    filtered = filtered.filter((card) => card.deckId === deckId);
  }
  switch (filter) {
    case "due":
      return filtered.filter((card) => (card.dueAt ?? 0) <= now);
    case "starred":
      return filtered.filter((card) => card.starred);
    default:
      return filtered;
  }
}

function toReviewCards(cards: Card[]): ReviewCard[] {
  return cards.map((card) => ({
    card,
    imageUrl: card.imageHash ? cloudApi.blobUrl(card.imageHash) : undefined,
  }));
}

export function createCloudAppApi(onRevision?: () => void): AppApi {
  const notify = () => onRevision?.();

  return {
    listDecks: async () => (await cloudApi.listDecks()).map(mapDeck),
    createDeck: async (name) => {
      const deck = mapDeck(await cloudApi.createDeck(name));
      notify();
      return deck;
    },
    updateDeck: async (deckId, name) => {
      const deck = mapDeck(await cloudApi.updateDeck(deckId, name));
      notify();
      return deck;
    },
    deleteDeck: async (deckId) => {
      await cloudApi.deleteDeck(deckId);
      notify();
    },
    getLastUsedDeckId: async () => null,
    exportDeck: async () => {
      throw new Error("Web ではエクスポート未対応");
    },
    importDeck: async (_data: DeckExport) => {
      throw new Error("Web ではインポート未対応");
    },
    listCards: async (deckId, query) => (await cloudApi.listCards(deckId, query)).map(mapCard),
    getCard: async (cardId) => mapCard(await cloudApi.getCard(cardId)),
    deleteCard: async (cardId) => {
      await cloudApi.deleteCard(cardId);
      notify();
    },
    toggleStar: async (cardId) => mapCard(await cloudApi.toggleStar(cardId)),
    openCardEditor: async () => {
      throw new Error("Web ではエディタ未対応");
    },
    submitReview: async (cardId, result) => {
      await cloudApi.submitReview({ cardId, result });
      notify();
    },
    getDueCount: async () => {
      const cards = await cloudApi.listCards();
      const now = Date.now();
      return cards.filter((card) => Number(card.dueAt ?? 0) <= now).length;
    },
    getDueCards: async (deckId) => {
      const cards = (await cloudApi.listCards(deckId)).map(mapCard);
      return toReviewCards(filterStudyCards(cards, "due", deckId));
    },
    getStudyCards: async (filter, deckId) => {
      const cards = (await cloudApi.listCards(deckId)).map(mapCard);
      return toReviewCards(filterStudyCards(cards, filter, deckId));
    },
    subscribeLibraryChanged: () => () => {},
    resolveImageUrl: (imagePath) => Promise.resolve(cloudApi.blobUrl(imagePath)),
    parseTextMasks,
    parseImageMasks,
    saveTextCard: async (request) => {
      const card = await cloudApi.createCard({
        deckId: request.deckId,
        kind: "text",
        content: request.content,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    saveQaCard: async (request) => {
      const card = await cloudApi.createCard({
        deckId: request.deckId,
        kind: "qa",
        content: request.content,
        answer: request.answer,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    updateTextCard: async (request) => {
      const card = await cloudApi.updateCard(request.cardId, {
        deckId: request.deckId,
        content: request.content,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    updateQaCard: async (request) => {
      const card = await cloudApi.updateCard(request.cardId, {
        deckId: request.deckId,
        content: request.content,
        answer: request.answer,
        masks: JSON.stringify(request.masks),
        note: request.note,
      });
      notify();
      return mapCard(card);
    },
    saveImageCards: async () => {
      throw new Error("Web では画像取込未対応");
    },
    updateImageCard: async () => {
      throw new Error("Web では画像編集未対応");
    },
    runOcr: async () => {
      throw new Error("Web では OCR 未対応");
    },
    getEditorInit: async () => null,
    openAccessibilitySettings: async () => {},
    openScreenRecordingSettings: async () => {},
  };
}
